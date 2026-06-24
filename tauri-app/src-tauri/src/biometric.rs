const BIOMETRIC_SERVICE_NAME: &str = "com.clientrecords.tauriapp.biometric-unlock.v1";

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BiometricAvailability {
    supported: bool,
    available: bool,
    enrolled: bool,
    message: Option<String>,
}

fn normalize_username(username: &str) -> Result<String, String> {
    let normalized = username.trim();
    if normalized.is_empty() {
        return Err("Username is required for biometric login.".to_string());
    }
    Ok(normalized.to_string())
}

#[cfg(target_os = "macos")]
mod macos {
    use super::{normalize_username, BiometricAvailability, BIOMETRIC_SERVICE_NAME};
    use block2::RcBlock;
    use objc2::runtime::Bool;
    use objc2_foundation::{ns_string, NSError};
    use objc2_local_authentication::{LAContext, LAError, LAPolicy};
    use security_framework::passwords::{
        delete_generic_password_options, generic_password, set_generic_password_options,
        PasswordOptions,
    };
    use std::sync::mpsc;

    const ERR_SEC_ITEM_NOT_FOUND: i32 = -25300;

    fn format_keychain_error(action: &str, error: security_framework::base::Error) -> String {
        match error.code() {
            ERR_SEC_ITEM_NOT_FOUND => "No Touch ID login is saved for this username on this Mac.".to_string(),
            _ => match error.message() {
                Some(message) if !message.trim().is_empty() => {
                    format!("Failed to {action}: {message}")
                }
                _ => format!("Failed to {action}. Security status code: {}", error.code()),
            },
        }
    }

    fn touch_id_status_from_error(error: &NSError) -> BiometricAvailability {
        let code = error.code();
        let message = match code {
            x if x == LAError::BiometryNotEnrolled.0 => {
                "Touch ID is not set up on this Mac yet. Add a fingerprint in System Settings > Touch ID & Password, then return here.".to_string()
            }
            x if x == LAError::BiometryNotAvailable.0 => {
                "Touch ID is not available on this Mac.".to_string()
            }
            x if x == LAError::BiometryLockout.0 => {
                "Touch ID is temporarily locked after too many failed attempts. Use your app password, then unlock Touch ID in macOS.".to_string()
            }
            x if x == LAError::PasscodeNotSet.0 => {
                "Set a Mac password before using Touch ID launch login.".to_string()
            }
            _ => error.localizedDescription().to_string(),
        };

        BiometricAvailability {
            supported: true,
            available: false,
            enrolled: code != LAError::BiometryNotEnrolled.0,
            message: Some(message),
        }
    }

    fn format_local_auth_error(action: &str, error: &NSError) -> String {
        match error.code() {
            x if x == LAError::AuthenticationFailed.0 => {
                "Touch ID did not recognize your fingerprint. Try again or use your app password.".to_string()
            }
            x if x == LAError::UserCancel.0
                || x == LAError::SystemCancel.0
                || x == LAError::AppCancel.0 =>
            {
                "Touch ID was canceled.".to_string()
            }
            x if x == LAError::UserFallback.0 => {
                "Touch ID was canceled. Use your app password instead.".to_string()
            }
            x if x == LAError::BiometryNotEnrolled.0 => {
                "Touch ID is not set up on this Mac yet. Add a fingerprint in System Settings > Touch ID & Password, then return here.".to_string()
            }
            x if x == LAError::BiometryNotAvailable.0 => {
                "Touch ID is not available on this Mac.".to_string()
            }
            x if x == LAError::BiometryLockout.0 => {
                "Touch ID is temporarily locked after too many failed attempts. Use your app password, then unlock Touch ID in macOS.".to_string()
            }
            x if x == LAError::PasscodeNotSet.0 => {
                "Set a Mac password before using Touch ID launch login.".to_string()
            }
            _ => {
                let message = error.localizedDescription().to_string();
                if message.trim().is_empty() {
                    format!("Failed to {action}.")
                } else {
                    format!("Failed to {action}: {message}")
                }
            }
        }
    }

    fn authenticate_with_touch_id() -> Result<(), String> {
        let context = unsafe { LAContext::new() };
        unsafe {
            context.setLocalizedFallbackTitle(Some(ns_string!("")));
        }

        if let Err(error) =
            unsafe { context.canEvaluatePolicy_error(LAPolicy::DeviceOwnerAuthenticationWithBiometrics) }
        {
            return Err(format_local_auth_error("check Touch ID availability", &error));
        }

        let (sender, receiver) = mpsc::channel();
        let reply = RcBlock::new(move |success: Bool, error: *mut NSError| {
            let result = if success.as_bool() {
                Ok(())
            } else if error.is_null() {
                Err("Touch ID authentication failed.".to_string())
            } else {
                Err(format_local_auth_error(
                    "authenticate with Touch ID",
                    unsafe { &*error },
                ))
            };

            let _ = sender.send(result);
        });

        unsafe {
            context.evaluatePolicy_localizedReason_reply(
                LAPolicy::DeviceOwnerAuthenticationWithBiometrics,
                ns_string!("unlock Client Records"),
                &reply,
            );
        }

        receiver
            .recv()
            .map_err(|_| "Touch ID authentication did not return a result.".to_string())?
    }

    pub fn get_biometric_availability() -> BiometricAvailability {
        let context = unsafe { LAContext::new() };
        match unsafe {
            context.canEvaluatePolicy_error(LAPolicy::DeviceOwnerAuthenticationWithBiometrics)
        } {
            Ok(()) => BiometricAvailability {
                supported: true,
                available: true,
                enrolled: true,
                message: None,
            },
            Err(error) => touch_id_status_from_error(&error),
        }
    }

    pub fn store_biometric_secret(username: &str, secret: &str) -> Result<(), String> {
        let normalized_username = normalize_username(username)?;
        if secret.is_empty() {
            return Err("Biometric login data is empty.".to_string());
        }

        let mut delete_options =
            PasswordOptions::new_generic_password(BIOMETRIC_SERVICE_NAME, &normalized_username);
        delete_options.set_access_synchronized(Some(false));
        match delete_generic_password_options(delete_options) {
            Ok(()) => {}
            Err(error) if error.code() == ERR_SEC_ITEM_NOT_FOUND => {}
            Err(error) => return Err(format_keychain_error("replace the saved Touch ID login", error)),
        }

        let mut options =
            PasswordOptions::new_generic_password(BIOMETRIC_SERVICE_NAME, &normalized_username);
        options.set_access_synchronized(Some(false));
        options.set_label("Client Records Touch ID Login");
        options.set_comment("Launch login secret unlocked after a Touch ID prompt.");

        set_generic_password_options(secret.as_bytes(), options)
            .map_err(|error| format_keychain_error("save the Touch ID login", error))
    }

    pub fn read_biometric_secret(username: &str) -> Result<String, String> {
        let normalized_username = normalize_username(username)?;
        authenticate_with_touch_id()?;
        let mut options =
            PasswordOptions::new_generic_password(BIOMETRIC_SERVICE_NAME, &normalized_username);
        options.set_access_synchronized(Some(false));

        let bytes = generic_password(options)
            .map_err(|error| format_keychain_error("read the Touch ID login", error))?;

        String::from_utf8(bytes)
            .map_err(|_| "Saved Touch ID login data is invalid. Please disable and re-enable Touch ID login.".to_string())
    }

    pub fn remove_biometric_secret(username: &str) -> Result<(), String> {
        let normalized_username = normalize_username(username)?;
        let mut options =
            PasswordOptions::new_generic_password(BIOMETRIC_SERVICE_NAME, &normalized_username);
        options.set_access_synchronized(Some(false));

        match delete_generic_password_options(options) {
            Ok(()) => Ok(()),
            Err(error) if error.code() == ERR_SEC_ITEM_NOT_FOUND => Ok(()),
            Err(error) => Err(format_keychain_error("remove the saved Touch ID login", error)),
        }
    }
}

#[cfg(not(target_os = "macos"))]
mod macos {
    use super::BiometricAvailability;

    pub fn get_biometric_availability() -> BiometricAvailability {
        BiometricAvailability {
            supported: false,
            available: false,
            enrolled: false,
            message: Some(
                "Biometric launch login is currently supported only on macOS builds.".to_string(),
            ),
        }
    }

    pub fn store_biometric_secret(_username: &str, _secret: &str) -> Result<(), String> {
        Err("Biometric launch login is currently supported only on macOS builds.".to_string())
    }

    pub fn read_biometric_secret(_username: &str) -> Result<String, String> {
        Err("Biometric launch login is currently supported only on macOS builds.".to_string())
    }

    pub fn remove_biometric_secret(_username: &str) -> Result<(), String> {
        Err("Biometric launch login is currently supported only on macOS builds.".to_string())
    }
}

#[tauri::command]
pub fn get_biometric_availability() -> BiometricAvailability {
    macos::get_biometric_availability()
}

#[tauri::command]
pub fn store_biometric_secret(username: String, secret: String) -> Result<(), String> {
    macos::store_biometric_secret(&username, &secret)
}

#[tauri::command]
pub fn read_biometric_secret(username: String) -> Result<String, String> {
    macos::read_biometric_secret(&username)
}

#[tauri::command]
pub fn remove_biometric_secret(username: String) -> Result<(), String> {
    macos::remove_biometric_secret(&username)
}
