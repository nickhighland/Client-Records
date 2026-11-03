# SmartEMR Lab

Experimental branch: `codex/documentation-lab`. Stable release: v3.0.49.

## Install and try

Download the `SmartEMR-Lab-Apple-Silicon` artifact from the **SmartEMR Lab build** GitHub Actions workflow, unzip it, and open the DMG. Install **SmartEMR Lab.app** alongside **SmartEMR.app**. This build uses its own application identifier, database directory, browser storage, and macOS Keychain services. It does not update regular SmartEMR. Lab updates are disabled.

Create a new Lab account and save its recovery key separately from backups. Start with **Load demo**; all demo content is synthetic. Configure the AI provider in Settings if you want to test generation. The toolbar identifies the provider that receives AI requests; using a local server does not imply its configured model runs locally.

To test a copy of existing notes, export an encrypted backup from regular SmartEMR, keep that original file, and import it into Lab. Enter the **original account name and password** when prompted. Lab reads the backup and encrypts its state under the Lab account; it does not import/replace login tables or execute SQL from the backup. The original app and backup are unchanged. Select a new destination for Lab backups; Lab refuses to overwrite a regular SmartEMR backup.

## Workflow to evaluate

- Focus layout, sticky client/session/platform identity, and provider/status display.
- Generate a draft; review direct evidence, possible interpretations, and possible interventions separately. Confirm interventions only when actually delivered. Organize checked content, then review derived support sections.
- Preview the exact text and platform order before EHR transfer. Copy the whole note or individual sections. Manual review and copying remain available when AI is unavailable. Pending/rejected candidates are excluded.
- Copying records **Copied**. **Mark transferred** records your separate confirmation that the EHR received the note. Editing the note invalidates that status. SmartEMR does not verify the destination EHR.
- **Draft history** compares and restores earlier working drafts, keeping the displaced draft. New generations snapshot the encounter's diagnoses and treatment plan so later chart edits do not silently change that draft's transfer content. Existing notes are not retroactively rewritten.
- Cancel long-running AI operations. A changed session source, client selection, model, or platform prevents stale results from replacing the draft.
- Shortcuts: Alt+G Generate, Alt+O Organize, Alt+C Preview, Alt+Z Draft history.
- Optional **Temporary draft** removes current source/draft/history only after explicit transfer and a deletion confirmation. Earlier encrypted backups may still contain those drafts; this is not secure erasure.

## Encryption and preservation

The v2 vault uses a random data key, AES-256-GCM authenticated encryption, and PBKDF2-SHA256 with 600,000 iterations to wrap that key. Changing or recovering the password rewraps the **same data key**, so existing notes need no re-encryption. A recovery key can reset the Lab password; an email code alone cannot recover encrypted notes. Losing both the password and recovery key can make the Lab vault inaccessible. Biometric login is optional and remains scoped to Lab.

Legacy migration verifies decryption and a complete encrypted round trip before writing. A single native SQLite transaction retains the original verifier and encrypted state in `vault_migration_snapshots` and commits the replacement credentials/state together. Any failure rolls the transaction back. A concurrent state change aborts migration. These retained snapshots are encrypted legacy recovery copies, not exposed note text.

Autosaves serialize writes and include edits made during an earlier save. Failed writes retain the prior database content and dirty draft. Closing waits for saving. If disk saving fails during locking, Lab retains an authenticated encrypted copy in memory, restores it on unlock, and blocks normal closing until it can save. Keep the app running if this warning occurs; force quit, power loss, or process termination can still lose unsaved memory-only edits.

Secondary backups use a synced temporary file and atomic replacement, retaining three prior encrypted copies. Use a separate Lab backup path. Provider credentials and SMTP passwords use macOS Keychain. If OS storage is unavailable, new provider credentials remain session-only; legacy values are removed only after successful secure migration. Non-macOS persistent credential storage is not implemented in this experiment.

## Development checks

From `tauri-app`: `npm ci`, `npm test`, `npm run build`. For the browser smoke check, install Chromium with `npx playwright install chromium`, run `npm run preview -- --port 4173` in another terminal, then `npm run test:browser` (or set `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome). This check uses synthetic content and in-memory SQLite only; it applies the production CSP.
From `tauri-app/src-tauri`: `cargo test --lib --locked`.
Native build from `tauri-app`: `npm run tauri build -- --bundles dmg`.

Tests cover exact note preservation across password change/recovery, corrupted ciphertext, large workspaces, legacy exports, write concurrency, cancelled/stale AI jobs, native transaction rollback/concurrent changes, protected stable backups, and backup rotation. These checks do not constitute an independent security audit or a compliance certification.

Portable Lab backups can also be restored into a new Lab account using the password **or recovery key valid at the time of that backup**. Password/recovery-key changes do not rewrite old backup files. Importing a replacement workspace also retains its displaced encrypted state in `vault_restore_snapshots`.
