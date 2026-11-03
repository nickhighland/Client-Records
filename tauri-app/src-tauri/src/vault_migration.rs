use serde::Deserialize;
use sqlx::{Row, SqlitePool};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationArgs {
    username: String,
    old_verifier: String,
    old_state: Option<String>,
    new_verifier: String,
    new_state: Option<String>,
}

// Keep all changes on ONE connection. Separate plugin execute calls use a pool
// and cannot safely implement a multi-statement transaction.
async fn migrate(pool: &SqlitePool, args: MigrationArgs) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    let user = sqlx::query("SELECT password_hash FROM users WHERE username = ?")
        .bind(&args.username).fetch_one(&mut *tx).await?;
    let state: Option<String> = sqlx::query_scalar("SELECT value FROM app_state WHERE key = 'main_state'")
        .fetch_optional(&mut *tx).await?;
    if user.get::<String, _>(0) != args.old_verifier || state != args.old_state
        || args.old_state.is_some() != args.new_state.is_some() {
        return Err(sqlx::Error::Protocol("Workspace changed before migration. Original data retained.".into()));
    }
    sqlx::query("CREATE TABLE IF NOT EXISTS vault_migration_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, old_verifier TEXT NOT NULL, encrypted_state TEXT, created_at INTEGER NOT NULL)")
        .execute(&mut *tx).await?;
    sqlx::query("INSERT INTO vault_migration_snapshots (username, old_verifier, encrypted_state, created_at) VALUES (?,?,?,?)")
        .bind(&args.username).bind(&args.old_verifier).bind(&args.old_state).bind(chrono::Utc::now().timestamp_millis())
        .execute(&mut *tx).await?;
    if let Some(state) = args.new_state {
        sqlx::query("UPDATE app_state SET value = ? WHERE key = 'main_state'").bind(state).execute(&mut *tx).await?;
    }
    sqlx::query("UPDATE users SET password_hash = ?, email_verified = 1 WHERE username = ?")
        .bind(args.new_verifier).bind(args.username).execute(&mut *tx).await?;
    tx.commit().await
}

#[tauri::command]
pub async fn migrate_legacy_vault(instances: tauri::State<'_, tauri_plugin_sql::DbInstances>, args: MigrationArgs) -> Result<(), String> {
    let pools = instances.0.read().await;
    let pool = match pools.get("sqlite:client_records.db") {
        Some(tauri_plugin_sql::DbPool::Sqlite(pool)) => pool.clone(),
        _ => return Err("Unlock the Lab database before migrating.".into()),
    };
    drop(pools);
    migrate(&pool, args).await.map_err(|_| "Vault migration did not complete. Original credentials and notes were retained.".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn args() -> MigrationArgs {
        MigrationArgs { username: "demo".into(), old_verifier: "old".into(), old_state: Some("old encrypted notes".into()),
            new_verifier: "new".into(), new_state: Some("new encrypted notes".into()) }
    }
    async fn database() -> SqlitePool {
        let pool = sqlx::sqlite::SqlitePoolOptions::new().max_connections(1).connect("sqlite::memory:").await.unwrap();
        sqlx::query("CREATE TABLE users (username TEXT, password_hash TEXT, email_verified INTEGER)").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT)").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO users VALUES ('demo','old',1)").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO app_state VALUES ('main_state','old encrypted notes')").execute(&pool).await.unwrap();
        pool
    }
    #[test]
    fn successful_migration_retains_original_encrypted_notes_and_verifier() {
        tauri::async_runtime::block_on(async {
            let pool = database().await;
            migrate(&pool, args()).await.unwrap();
            let row = sqlx::query("SELECT old_verifier, encrypted_state FROM vault_migration_snapshots").fetch_one(&pool).await.unwrap();
            assert_eq!(row.get::<String, _>(0), "old");
            assert_eq!(row.get::<String, _>(1), "old encrypted notes");
            let value: String = sqlx::query_scalar("SELECT value FROM app_state").fetch_one(&pool).await.unwrap();
            assert_eq!(value, "new encrypted notes");
        });
    }
    #[test]
    fn failure_after_state_update_rolls_back_notes_and_credentials() {
        tauri::async_runtime::block_on(async {
            let pool = database().await;
            sqlx::query("CREATE TRIGGER fail_credentials BEFORE UPDATE ON users BEGIN SELECT RAISE(ABORT,'simulated disk failure'); END")
                .execute(&pool).await.unwrap();
            assert!(migrate(&pool, args()).await.is_err());
            let value: String = sqlx::query_scalar("SELECT value FROM app_state").fetch_one(&pool).await.unwrap();
            let verifier: String = sqlx::query_scalar("SELECT password_hash FROM users").fetch_one(&pool).await.unwrap();
            assert_eq!(value, "old encrypted notes"); assert_eq!(verifier, "old");
        });
    }
    #[test]
    fn concurrent_changes_are_never_overwritten() {
        tauri::async_runtime::block_on(async {
            let pool = database().await;
            sqlx::query("UPDATE app_state SET value = 'newer notes'").execute(&pool).await.unwrap();
            assert!(migrate(&pool, args()).await.is_err());
            let value: String = sqlx::query_scalar("SELECT value FROM app_state").fetch_one(&pool).await.unwrap();
            assert_eq!(value, "newer notes");
        });
    }
}
