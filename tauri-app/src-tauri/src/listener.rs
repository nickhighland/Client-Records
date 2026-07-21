use serde_json::Value;
use std::ffi::{c_char, CStr, CString};
use std::sync::OnceLock;
use tauri::{AppHandle, Emitter};

static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

#[cfg(target_os = "macos")]
mod native {
    use super::c_char;

    extern "C" {
        pub fn smartemr_listener_set_event_callback(callback: Option<extern "C" fn(*const c_char)>);
        pub fn smartemr_listener_capabilities_json() -> *mut c_char;
        pub fn smartemr_listener_sources_json() -> *mut c_char;
        pub fn smartemr_listener_start(json: *const c_char);
        pub fn smartemr_listener_pause();
        pub fn smartemr_listener_resume();
        pub fn smartemr_listener_stop();
        pub fn smartemr_listener_cancel();
        pub fn smartemr_listener_generate_draft(json: *const c_char);
        #[cfg(test)]
        pub fn smartemr_listener_vad_self_test() -> i32;
        pub fn smartemr_listener_shutdown();
        pub fn smartemr_listener_free_string(pointer: *mut c_char);
    }
}

extern "C" fn receive_listener_event(pointer: *const c_char) {
    if pointer.is_null() {
        return;
    }
    let json = unsafe { CStr::from_ptr(pointer) }.to_string_lossy();
    let Ok(payload) = serde_json::from_str::<Value>(&json) else {
        eprintln!("Listener emitted invalid JSON: {json}");
        return;
    };
    if let Some(app) = APP_HANDLE.get() {
        if let Err(error) = app.emit("listener://event", payload) {
            eprintln!("Failed to emit Listener event: {error}");
        }
    }
}

pub fn initialize(app: &AppHandle) {
    let _ = APP_HANDLE.set(app.clone());
    #[cfg(target_os = "macos")]
    unsafe {
        native::smartemr_listener_set_event_callback(Some(receive_listener_event));
    }
}

fn read_native_json(function: unsafe extern "C" fn() -> *mut c_char) -> Result<Value, String> {
    let pointer = unsafe { function() };
    if pointer.is_null() {
        return Err("The native Listener returned no response.".to_string());
    }
    let json = unsafe { CStr::from_ptr(pointer) }
        .to_string_lossy()
        .into_owned();
    #[cfg(target_os = "macos")]
    unsafe {
        native::smartemr_listener_free_string(pointer);
    }
    serde_json::from_str(&json)
        .map_err(|error| format!("Invalid native Listener response: {error}"))
}

fn request_json(value: Value) -> Result<CString, String> {
    CString::new(value.to_string())
        .map_err(|_| "Listener request contains an invalid null byte.".to_string())
}

#[tauri::command]
pub fn listener_capabilities() -> Result<Value, String> {
    #[cfg(target_os = "macos")]
    {
        read_native_json(native::smartemr_listener_capabilities_json)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(serde_json::json!({
            "supported": false,
            "message": "Listener is currently available only on macOS."
        }))
    }
}

#[tauri::command]
pub fn listener_sources() -> Result<Value, String> {
    #[cfg(target_os = "macos")]
    {
        read_native_json(native::smartemr_listener_sources_json)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(serde_json::json!({"applications": [], "microphones": []}))
    }
}

#[tauri::command]
pub fn listener_start(request: Value) -> Result<(), String> {
    let json = request_json(request)?;
    #[cfg(target_os = "macos")]
    unsafe {
        native::smartemr_listener_start(json.as_ptr());
    }
    Ok(())
}

#[tauri::command]
pub fn listener_pause() {
    #[cfg(target_os = "macos")]
    unsafe {
        native::smartemr_listener_pause();
    }
}

#[tauri::command]
pub fn listener_resume() {
    #[cfg(target_os = "macos")]
    unsafe {
        native::smartemr_listener_resume();
    }
}

#[tauri::command]
pub fn listener_stop() {
    #[cfg(target_os = "macos")]
    unsafe {
        native::smartemr_listener_stop();
    }
}

#[tauri::command]
pub fn listener_cancel() {
    #[cfg(target_os = "macos")]
    unsafe {
        native::smartemr_listener_cancel();
    }
}

#[tauri::command]
pub fn listener_generate_draft(request: Value) -> Result<(), String> {
    let json = request_json(request)?;
    #[cfg(target_os = "macos")]
    unsafe {
        native::smartemr_listener_generate_draft(json.as_ptr());
    }
    Ok(())
}

pub fn shutdown() {
    #[cfg(target_os = "macos")]
    unsafe {
        native::smartemr_listener_shutdown();
    }
}

#[cfg(test)]
mod tests {
    use super::{request_json, Value};

    #[test]
    fn serializes_chart_identity_without_changes() {
        let request = serde_json::json!({
            "listenerSessionId": "listener-1",
            "clientId": "client-1",
            "appointmentId": "appointment-1"
        });
        let serialized = request_json(request).expect("request should serialize");
        let parsed: serde_json::Value =
            serde_json::from_str(serialized.to_str().expect("request should be UTF-8"))
                .expect("request should be JSON");
        assert_eq!(parsed["clientId"], "client-1");
        assert_eq!(parsed["appointmentId"], "appointment-1");
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn native_capabilities_report_local_privacy_guarantees() {
        let capabilities = super::listener_capabilities().expect("native capabilities should load");
        assert_eq!(capabilities["supported"], Value::Bool(true));
        assert_eq!(capabilities["audioStoredToDisk"], Value::Bool(false));
        assert_eq!(capabilities["speakerSeparated"], Value::Bool(true));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn native_audio_sources_have_expected_shape() {
        let sources = super::listener_sources().expect("native audio sources should load");
        assert!(sources["applications"].is_array());
        assert!(sources["microphones"].is_array());
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn native_vad_ignores_stationary_noise_and_detects_speech() {
        assert_eq!(unsafe { super::native::smartemr_listener_vad_self_test() }, 1);
    }
}
