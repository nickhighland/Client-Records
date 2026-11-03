const SERVICE: &str = "com.clientrecords.tauriapp.lab.credentials.v1";

fn validate_key(key: &str) -> Result<(), String> {
    if key.is_empty() || key.len() > 256 { return Err("Invalid credential identifier.".into()); }
    Ok(())
}

#[tauri::command]
pub fn store_app_secret(key: String, secret: String) -> Result<(), String> {
    validate_key(&key)?;
    #[cfg(target_os = "macos")]
    { security_framework::passwords::set_generic_password(SERVICE, &key, secret.as_bytes()).map_err(|_| "Could not store credential in macOS Keychain.".to_string()) }
    #[cfg(not(target_os = "macos"))]
    { let _ = secret; Err("Persistent credentials are supported by the macOS Lab build. Credentials on this platform remain session-only.".into()) }
}

#[tauri::command]
pub fn read_app_secret(key: String) -> Result<Option<String>, String> {
    validate_key(&key)?;
    #[cfg(target_os = "macos")]
    { match security_framework::passwords::get_generic_password(SERVICE, &key) {
        Ok(bytes) => String::from_utf8(bytes).map(Some).map_err(|_| "Invalid saved credential.".into()),
        Err(error) if error.code() == -25300 => Ok(None),
        Err(_) => Err("Could not read macOS Keychain credential.".into())
    } }
    #[cfg(not(target_os = "macos"))]
    { Ok(None) }
}

#[tauri::command]
pub fn remove_app_secret(key: String) -> Result<(), String> {
    validate_key(&key)?;
    #[cfg(target_os = "macos")]
    { match security_framework::passwords::delete_generic_password(SERVICE, &key) {
        Ok(()) => Ok(()), Err(error) if error.code() == -25300 => Ok(()),
        Err(_) => Err("Could not remove macOS Keychain credential.".into())
    } }
    #[cfg(not(target_os = "macos"))]
    { Ok(()) }
}
