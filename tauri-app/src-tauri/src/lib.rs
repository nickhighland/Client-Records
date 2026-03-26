// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use std::fs;
use std::collections::HashSet;
use std::ffi::OsString;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(MlxWhisperState::default())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            generate_google_token,
            send_password_reset_email,
            send_email_verification_email,
            send_smtp_test_email,
            start_mlx_whisper,
            stop_mlx_whisper,
            get_mlx_whisper_status,
            transcribe_with_mlx_whisper,
            download_mlx_whisper_model,
            verify_mlx_whisper_model_download,
            delete_mlx_whisper_model,
            get_audio_setup_status,
            setup_audio_devices,
            teardown_audio_devices,
            install_blackhole
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ---------------------------------------------------------------------------
// Audio loopback setup — CoreAudio aggregate device management via Swift helper
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AudioSetupStatus {
    helper_available: bool,
    blackhole_installed: bool,
    blackhole_name: String,
    aggregate_input_exists: bool,
    aggregate_output_exists: bool,
    aggregate_input_uid: String,
    aggregate_output_uid: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AudioSetupResult {
    success: bool,
    aggregate_input_uid: String,
    aggregate_output_uid: String,
    output_switched: bool,
    mic_name: String,
    blackhole_name: String,
    error: Option<String>,
    warning: Option<String>,
}

fn resolve_audio_helper(app: &tauri::AppHandle) -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("audio_setup"));
        candidates.push(resource_dir.join("resources").join("audio_setup"));
    }

    candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("audio_setup"),
    );

    candidates.into_iter().find(|p| p.exists())
}

fn ensure_executable(path: &std::path::Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(path)
            .map_err(|e| format!("Cannot read helper metadata: {e}"))?
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(path, perms)
            .map_err(|e| format!("Cannot chmod helper: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
async fn get_audio_setup_status(app: tauri::AppHandle) -> Result<AudioSetupStatus, String> {
    let Some(helper) = resolve_audio_helper(&app) else {
        return Ok(AudioSetupStatus {
            helper_available: false,
            blackhole_installed: false,
            blackhole_name: String::new(),
            aggregate_input_exists: false,
            aggregate_output_exists: false,
            aggregate_input_uid: String::new(),
            aggregate_output_uid: String::new(),
        });
    };

    ensure_executable(&helper)?;

    let output = Command::new(&helper)
        .arg("status")
        .output()
        .map_err(|e| format!("Failed to run audio helper: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let v: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Bad helper output: {e}\n{stdout}"))?;

    Ok(AudioSetupStatus {
        helper_available: true,
        blackhole_installed:    v["blackholeInstalled"].as_bool().unwrap_or(false),
        blackhole_name:         v["blackholeName"].as_str().unwrap_or("").to_string(),
        aggregate_input_exists:  v["aggregateInputExists"].as_bool().unwrap_or(false),
        aggregate_output_exists: v["aggregateOutputExists"].as_bool().unwrap_or(false),
        aggregate_input_uid:     v["aggregateInputUID"].as_str().unwrap_or("").to_string(),
        aggregate_output_uid:    v["aggregateOutputUID"].as_str().unwrap_or("").to_string(),
    })
}

#[tauri::command]
async fn setup_audio_devices(
    app: tauri::AppHandle,
    preferred_mic_uid: Option<String>,
) -> Result<AudioSetupResult, String> {
    let helper = resolve_audio_helper(&app)
        .ok_or("Audio setup helper not found in app resources")?;
    ensure_executable(&helper)?;

    let mut cmd = Command::new(&helper);
    cmd.arg("setup");
    if let Some(uid) = preferred_mic_uid {
        cmd.arg("--preferred-mic-uid").arg(uid);
    }

    let output = cmd.output()
        .map_err(|e| format!("Failed to run audio setup: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let v: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Bad setup output: {e}\n{stdout}"))?;

    Ok(AudioSetupResult {
        success:              v["success"].as_bool().unwrap_or(false),
        aggregate_input_uid:  v["aggregateInputUID"].as_str().unwrap_or("").to_string(),
        aggregate_output_uid: v["aggregateOutputUID"].as_str().unwrap_or("").to_string(),
        output_switched:      v["outputSwitched"].as_bool().unwrap_or(false),
        mic_name:             v["micName"].as_str().unwrap_or("").to_string(),
        blackhole_name:       v["blackholeName"].as_str().unwrap_or("").to_string(),
        error:                v["error"].as_str().map(String::from),
        warning:              v["warning"].as_str().map(String::from),
    })
}

#[tauri::command]
async fn teardown_audio_devices(app: tauri::AppHandle) -> Result<(), String> {
    let helper = resolve_audio_helper(&app)
        .ok_or("Audio setup helper not found")?;
    ensure_executable(&helper)?;

    let output = Command::new(&helper)
        .arg("teardown")
        .output()
        .map_err(|e| format!("Failed to run audio teardown: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Teardown failed: {stderr}"));
    }
    Ok(())
}

#[tauri::command]
async fn install_blackhole() -> Result<String, String> {
    let brew_candidates = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];
    let brew = brew_candidates
        .iter()
        .find(|&&p| std::path::Path::new(p).exists())
        .ok_or_else(|| {
            "Homebrew not found. Install Homebrew from https://brew.sh, \
             then run: brew install blackhole-2ch".to_string()
        })?;

    let output = Command::new(brew)
        .arg("install")
        .arg("blackhole-2ch")
        .output()
        .map_err(|e| format!("Failed to run brew: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{stdout}{stderr}");

    if output.status.success() || combined.contains("already installed") {
        Ok("BlackHole 2ch installed successfully.".to_string())
    } else {
        Err(format!("Homebrew install failed: {stderr}"))
    }
}

use serde::{Deserialize, Serialize};
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use chrono::{Utc, Duration};
use lettre::{Message, SmtpTransport, Transport};
use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use std::time::Duration as StdDuration;
use base64::{engine::general_purpose, Engine as _};

const SMTP_SEND_TIMEOUT_SECS: u64 = 20;

#[derive(Default)]
struct MlxWhisperState {
    running: Mutex<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MlxWhisperStatus {
    running: bool,
    message: String,
}

fn candidate_python_commands() -> Vec<&'static str> {
    if cfg!(target_os = "windows") {
        vec!["python", "py"]
    } else {
        vec![
            "/opt/homebrew/bin/python3",
            "/usr/local/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.11/bin/python3",
            "python3",
            "python",
            "/usr/bin/python3",
        ]
    }
}

fn resolve_python_command_for_mlx() -> Result<String, String> {
    let mut attempted = Vec::new();
    let mut seen = HashSet::new();

    for candidate in candidate_python_commands() {
        if !seen.insert(candidate) {
            continue;
        }

        if candidate.starts_with('/') && !std::path::Path::new(candidate).exists() {
            continue;
        }

        let output = match Command::new(candidate)
            .arg("-c")
            .arg("import mlx_whisper")
            .output()
        {
            Ok(output) => output,
            Err(error) => {
                attempted.push(format!("{candidate} (not runnable: {error})"));
                continue;
            }
        };

        if output.status.success() {
            return Ok(candidate.to_string());
        }

        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        attempted.push(if stderr.is_empty() {
            format!("{candidate} (mlx_whisper import failed)")
        } else {
            format!("{candidate} ({stderr})")
        });
    }

    let attempts = if attempted.is_empty() {
        "no Python executables were found".to_string()
    } else {
        attempted.join("; ")
    };

    Err(format!(
        "MLX Whisper is not available in app-reachable Python interpreters. Tried: {attempts}. Install with: /Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -m pip install --user mlx-whisper"
    ))
}

fn verify_mlx_whisper_available() -> Result<String, String> {
    resolve_python_command_for_mlx()
}

fn write_audio_temp_file(audio_base64: &str, extension: Option<String>) -> Result<PathBuf, String> {
    let audio_bytes = general_purpose::STANDARD
        .decode(audio_base64)
        .map_err(|error| format!("Invalid audio payload: {error}"))?;

    if audio_bytes.is_empty() {
        return Err("Audio payload is empty".to_string());
    }

    let mut file_extension = extension
        .unwrap_or_else(|| "webm".to_string())
        .trim()
        .trim_start_matches('.')
        .to_lowercase();
    if file_extension.is_empty() {
        file_extension = "webm".to_string();
    }
    if file_extension.len() > 8 || !file_extension.chars().all(|c| c.is_ascii_alphanumeric()) {
        return Err("Unsupported audio extension".to_string());
    }

    // WebM files should start with the EBML header bytes 1A 45 DF A3.
    // If this signature is missing, the recorder likely emitted a partial/invalid chunk.
    if file_extension == "webm"
        && (audio_bytes.len() < 4 || audio_bytes[0..4] != [0x1A, 0x45, 0xDF, 0xA3])
    {
        return Err(
            "Malformed WebM audio payload (missing EBML header). Re-record and prefer MP4 recorder output in this runtime."
                .to_string(),
        );
    }

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Clock error: {error}"))?
        .as_millis();
    let file_name = format!("client-records-audio-{now_ms}.{file_extension}");
    let path = std::env::temp_dir().join(file_name);

    fs::write(&path, audio_bytes)
        .map_err(|error| format!("Failed to write temporary audio file: {error}"))?;
    Ok(path)
}

fn resolve_bundled_ffmpeg_path(app_handle: &tauri::AppHandle) -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        candidates.push(resource_dir.join("ffmpeg"));
        candidates.push(resource_dir.join("resources").join("ffmpeg"));
    }

    // Support `tauri dev` where resources may not be copied into the runtime dir yet.
    let manifest_resources = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("ffmpeg");
    candidates.push(manifest_resources);

    candidates.into_iter().find(|path| path.exists())
}

fn prepend_directory_to_path(dir: &std::path::Path) -> OsString {
    let existing = std::env::var_os("PATH").unwrap_or_default();
    let mut combined = OsString::new();
    combined.push(dir.as_os_str());
    combined.push(OsString::from(if cfg!(target_os = "windows") { ";" } else { ":" }));
    combined.push(existing);
    combined
}

fn transcode_audio_for_whisper(input_path: &std::path::Path, ffmpeg_path: &std::path::Path) -> Result<PathBuf, String> {
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Clock error: {error}"))?
        .as_millis();
    let output_path = std::env::temp_dir().join(format!("client-records-whisper-input-{now_ms}.wav"));

    let mut command = Command::new(ffmpeg_path);
    command
        .arg("-hide_banner")
        .arg("-loglevel")
        .arg("error")
        .arg("-y")
        .arg("-i")
        .arg(input_path)
        .arg("-vn")
        .arg("-ac")
        .arg("1")
        .arg("-ar")
        .arg("16000")
        .arg("-sample_fmt")
        .arg("s16")
        // Normalize speech band and lift quiet input prior to inference.
        .arg("-af")
        .arg("highpass=f=70,lowpass=f=7600,volume=12dB")
        .arg(&output_path);

    if let Some(ffmpeg_dir) = ffmpeg_path.parent() {
        command.env("PATH", prepend_directory_to_path(ffmpeg_dir));
    }

    let output = command
        .output()
        .map_err(|error| format!("Failed to run ffmpeg preprocess: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "ffmpeg preprocess failed with unknown error".to_string()
        } else {
            format!("ffmpeg preprocess failed: {stderr}")
        });
    }

    Ok(output_path)
}

#[tauri::command]
async fn start_mlx_whisper(state: tauri::State<'_, MlxWhisperState>) -> Result<MlxWhisperStatus, String> {
    let python_cmd = verify_mlx_whisper_available()?;
    let mut running = state
        .running
        .lock()
        .map_err(|_| "Failed to acquire MLX Whisper state lock".to_string())?;
    *running = true;
    Ok(MlxWhisperStatus {
        running: true,
        message: format!("MLX Whisper is ready ({python_cmd})"),
    })
}

#[tauri::command]
async fn stop_mlx_whisper(state: tauri::State<'_, MlxWhisperState>) -> Result<MlxWhisperStatus, String> {
    let mut running = state
        .running
        .lock()
        .map_err(|_| "Failed to acquire MLX Whisper state lock".to_string())?;
    *running = false;
    Ok(MlxWhisperStatus {
        running: false,
        message: "MLX Whisper stopped".to_string(),
    })
}

#[tauri::command]
async fn get_mlx_whisper_status(state: tauri::State<'_, MlxWhisperState>) -> Result<MlxWhisperStatus, String> {
    let running = *state
        .running
        .lock()
        .map_err(|_| "Failed to acquire MLX Whisper state lock".to_string())?;
    Ok(MlxWhisperStatus {
        running,
        message: if running {
            "MLX Whisper is running".to_string()
        } else {
            "MLX Whisper is stopped".to_string()
        },
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MlxTranscriptionArgs {
    audio_base64: String,
    extension: Option<String>,
    model: Option<String>,
    language: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MlxTranscriptionResult {
    text: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MlxModelDownloadStatus {
    downloaded: bool,
    model: String,
    cache_path: Option<String>,
    message: String,
}

#[tauri::command]
async fn transcribe_with_mlx_whisper(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, MlxWhisperState>,
    args: MlxTranscriptionArgs,
) -> Result<String, String> {
    let running = *state
        .running
        .lock()
        .map_err(|_| "Failed to acquire MLX Whisper state lock".to_string())?;
    if !running {
        return Err("MLX Whisper is not running. Start it in the app first.".to_string());
    }

    let python_cmd = verify_mlx_whisper_available()?;
    let ffmpeg_path = resolve_bundled_ffmpeg_path(&app_handle)
        .ok_or_else(|| "Bundled ffmpeg was not found. Expected at app resources (src-tauri/resources/ffmpeg).".to_string())?;

    let audio_path = write_audio_temp_file(&args.audio_base64, args.extension)?;
    let transcode_result = transcode_audio_for_whisper(&audio_path, &ffmpeg_path);
    let (transcription_audio_path, transcoded_audio_path, transcode_error_message) = match transcode_result {
        Ok(path) => (path.clone(), Some(path), None),
        Err(error) => (audio_path.clone(), None, Some(error)),
    };
    let model = args
        .model
        .unwrap_or_else(|| "mlx-community/whisper-small".to_string());
    let language = args.language.unwrap_or_default();

    let script = r#"
import json
import os
import sys
import mlx_whisper

audio_path = sys.argv[1]
model_name = sys.argv[2]
language = sys.argv[3] if len(sys.argv) > 3 else ""
ffmpeg_path = sys.argv[4] if len(sys.argv) > 4 else ""
language = language if language else None

if ffmpeg_path:
    ffmpeg_dir = os.path.dirname(ffmpeg_path)
    os.environ["PATH"] = f"{ffmpeg_dir}:{os.environ.get('PATH', '')}" if ffmpeg_dir else os.environ.get("PATH", "")
    os.environ["FFMPEG_BINARY"] = ffmpeg_path
    os.environ["IMAGEIO_FFMPEG_EXE"] = ffmpeg_path

result = None
errors = []

for kwargs in (
    {"path_or_hf_repo": model_name, "language": language},
    {"model": model_name, "language": language},
    {"path_or_hf_repo": model_name},
    {"model": model_name},
):
    try:
        result = mlx_whisper.transcribe(audio_path, **kwargs)
        break
    except Exception as exc:
        errors.append(str(exc))

if result is None:
    raise RuntimeError(" | ".join(errors) if errors else "MLX Whisper transcription failed")

text = ""
if isinstance(result, dict):
    text = result.get("text") or ""
    if not text:
        segments = result.get("segments")
        if isinstance(segments, list):
            part_text = []
            for segment in segments:
                if isinstance(segment, dict):
                    value = segment.get("text")
                    if isinstance(value, str) and value.strip():
                        part_text.append(value.strip())
            if part_text:
                text = " ".join(part_text)
    if not text:
        chunks = result.get("chunks")
        if isinstance(chunks, list):
            part_text = []
            for chunk in chunks:
                if isinstance(chunk, dict):
                    value = chunk.get("text")
                    if isinstance(value, str) and value.strip():
                        part_text.append(value.strip())
            if part_text:
                text = " ".join(part_text)
elif isinstance(result, str):
    text = result
else:
    text = str(result)

print(json.dumps({"text": text.strip()}))
"#;

    let mut command = Command::new(python_cmd);
    command
        .arg("-c")
        .arg(script)
        .arg(&transcription_audio_path)
        .arg(&model)
        .arg(&language)
        .arg(ffmpeg_path.as_os_str());

    if let Some(ffmpeg_dir) = ffmpeg_path.parent() {
        command.env("PATH", prepend_directory_to_path(ffmpeg_dir));
    }
    command.env("FFMPEG_BINARY", &ffmpeg_path);
    command.env("IMAGEIO_FFMPEG_EXE", &ffmpeg_path);

    let output = command
        .output()
        .map_err(|error| format!("Failed to run MLX Whisper transcription: {error}"));

    let _ = fs::remove_file(&audio_path);
    if let Some(path) = transcoded_audio_path.as_ref() {
        let _ = fs::remove_file(path);
    }

    let output = output?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let mut message = format!(
            "MLX Whisper transcription failed: {}",
            if stderr.is_empty() {
                "Unknown error".to_string()
            } else {
                stderr
            }
        );
        if let Some(transcode_error) = transcode_error_message.as_ref() {
            message.push_str(&format!(" | preprocess note: {transcode_error}"));
        }
        return Err(message);
    }

    let stdout = String::from_utf8(output.stdout)
        .map_err(|error| format!("Invalid MLX Whisper output encoding: {error}"))?;
    let parsed: MlxTranscriptionResult = serde_json::from_str(stdout.trim())
        .map_err(|error| format!("Failed to parse MLX Whisper output: {error}"))?;

    let transcript = parsed.text.trim().to_string();
    if transcript.is_empty() {
        let mut message = "MLX Whisper returned an empty transcript".to_string();
        if let Some(transcode_error) = transcode_error_message.as_ref() {
            message.push_str(&format!(" | preprocess note: {transcode_error}"));
        }
        return Err(message);
    }

    Ok(transcript)
}

#[tauri::command]
async fn download_mlx_whisper_model(model: String) -> Result<MlxModelDownloadStatus, String> {
    let python_cmd = verify_mlx_whisper_available()?;

    let normalized_model = model.trim().to_string();
    if normalized_model.is_empty() {
        return Err("Model name is required".to_string());
    }

    let script = r#"
import json
import sys

model = sys.argv[1].strip()
if not model:
    raise RuntimeError("Model name is required")

from huggingface_hub import snapshot_download

cache_path = snapshot_download(repo_id=model)
print(json.dumps({
    "downloaded": True,
    "model": model,
    "cachePath": cache_path,
    "message": f"Model {model} downloaded"
}))
"#;

    let output = Command::new(python_cmd)
        .arg("-c")
        .arg(script)
        .arg(&normalized_model)
        .output()
        .map_err(|error| format!("Failed to run model download: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let hint = if stderr.contains("401") || stderr.contains("Repository Not Found") {
            " Hint: choose a valid public MLX repo (for example mlx-community/whisper-small-mlx)."
        } else {
            ""
        };
        return Err(format!(
            "Failed to download model {normalized_model}: {}{}",
            if stderr.is_empty() {
                "Unknown error".to_string()
            } else {
                stderr
            },
            hint
        ));
    }

    let stdout = String::from_utf8(output.stdout)
        .map_err(|error| format!("Invalid download output encoding: {error}"))?;
    let parsed: MlxModelDownloadStatus = serde_json::from_str(stdout.trim())
        .map_err(|error| format!("Failed to parse download output: {error}"))?;

    Ok(parsed)
}

#[tauri::command]
async fn verify_mlx_whisper_model_download(model: String) -> Result<MlxModelDownloadStatus, String> {
    let python_cmd = verify_mlx_whisper_available()?;

    let normalized_model = model.trim().to_string();
    if normalized_model.is_empty() {
        return Err("Model name is required".to_string());
    }

    let script = r#"
import json
import sys

model = sys.argv[1].strip()
if not model:
    raise RuntimeError("Model name is required")

from huggingface_hub import snapshot_download

try:
    cache_path = snapshot_download(repo_id=model, local_files_only=True)
    print(json.dumps({
        "downloaded": True,
        "model": model,
        "cachePath": cache_path,
        "message": f"Model {model} is already downloaded"
    }))
except Exception:
    print(json.dumps({
        "downloaded": False,
        "model": model,
        "cachePath": None,
        "message": f"Model {model} is not downloaded"
    }))
"#;

    let output = Command::new(python_cmd)
        .arg("-c")
        .arg(script)
        .arg(&normalized_model)
        .output()
        .map_err(|error| format!("Failed to verify model download: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!(
            "Failed to verify model {normalized_model}: {}",
            if stderr.is_empty() {
                "Unknown error".to_string()
            } else {
                stderr
            }
        ));
    }

    let stdout = String::from_utf8(output.stdout)
        .map_err(|error| format!("Invalid verification output encoding: {error}"))?;
    let parsed: MlxModelDownloadStatus = serde_json::from_str(stdout.trim())
        .map_err(|error| format!("Failed to parse verification output: {error}"))?;

    Ok(parsed)
}

#[tauri::command]
async fn delete_mlx_whisper_model(model: String) -> Result<MlxModelDownloadStatus, String> {
    let python_cmd = verify_mlx_whisper_available()?;

    let normalized_model = model.trim().to_string();
    if normalized_model.is_empty() {
        return Err("Model name is required".to_string());
    }

    let script = r#"
import json
import shutil
import sys

model = sys.argv[1].strip()
if not model:
    raise RuntimeError("Model name is required")

from huggingface_hub import snapshot_download

try:
    cache_path = snapshot_download(repo_id=model, local_files_only=True)
except Exception:
    print(json.dumps({
        "downloaded": False,
        "model": model,
        "cachePath": None,
        "message": f"Model {model} is not downloaded"
    }))
    raise SystemExit(0)

shutil.rmtree(cache_path, ignore_errors=True)

print(json.dumps({
    "downloaded": False,
    "model": model,
    "cachePath": cache_path,
    "message": f"Model {model} removed from local cache"
}))
"#;

    let output = Command::new(python_cmd)
        .arg("-c")
        .arg(script)
        .arg(&normalized_model)
        .output()
        .map_err(|error| format!("Failed to delete model cache: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!(
            "Failed to delete model {normalized_model}: {}",
            if stderr.is_empty() {
                "Unknown error".to_string()
            } else {
                stderr
            }
        ));
    }

    let stdout = String::from_utf8(output.stdout)
        .map_err(|error| format!("Invalid delete output encoding: {error}"))?;
    let parsed: MlxModelDownloadStatus = serde_json::from_str(stdout.trim())
        .map_err(|error| format!("Failed to parse delete output: {error}"))?;

    Ok(parsed)
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    iss: String,
    scope: String,
    aud: String,
    exp: i64,
    iat: i64,
    // Optional but recommended: identify the subject of the token.
    // For simple service-account auth, this can match `iss`.
    sub: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ServiceAccount {
    private_key: String,
    client_email: String,
    // Used as JWT header `kid` so Google can pick the right key.
    private_key_id: Option<String>,
}

#[tauri::command]
async fn generate_google_token(service_account_json: String) -> Result<String, String> {
    let service_account: ServiceAccount = match serde_json::from_str(&service_account_json) {
        Ok(sa) => sa,
        Err(e) => {
            eprintln!("Failed to parse service account JSON: {}", e);
            return Err(format!("Failed to parse service account JSON: {}", e));
        }
    };

    let now = Utc::now();
    let claims = Claims {
        iss: service_account.client_email.clone(),
        scope: "https://www.googleapis.com/auth/cloud-platform".to_string(),
        aud: "https://oauth2.googleapis.com/token".to_string(),
        iat: now.timestamp(),
        exp: (now + Duration::hours(1)).timestamp(),
        sub: service_account.client_email.clone(),
    };

    let private_key_pem = service_account.private_key.as_bytes();
    let encoding_key = match EncodingKey::from_rsa_pem(private_key_pem) {
        Ok(key) => key,
        Err(e) => {
            eprintln!("Failed to create encoding key from PEM: {}", e);
            return Err(format!("Failed to create encoding key from PEM: {}", e));
        }
    };

    let mut header = Header::new(Algorithm::RS256);
    header.typ = Some("JWT".to_string());
    if let Some(kid) = service_account.private_key_id.clone() {
        header.kid = Some(kid);
    }

    let jwt = match encode(&header, &claims, &encoding_key) {
        Ok(token) => token,
        Err(e) => {
            eprintln!("Failed to encode JWT: {}", e);
            return Err(format!("Failed to encode JWT: {}", e));
        }
    };

    let client = reqwest::Client::new();
    let params = [
        ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
        ("assertion", &jwt),
    ];

    let res = match client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            eprintln!("Failed to send token request: {}", e);
            return Err(format!("Failed to send token request: {}", e));
        }
    };

    if !res.status().is_success() {
        let status = res.status();
        let error_text = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        eprintln!("Failed to get access token: {} - {}", status, error_text);
        return Err(format!("Failed to get access token: {} - {}", status, error_text));
    }

    let token_response: serde_json::Value = match res
        .json()
        .await
    {
        Ok(json) => json,
        Err(e) => {
            eprintln!("Failed to parse token response: {}", e);
            return Err(format!("Failed to parse token response: {}", e));
        }
    };

    token_response["access_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| {
            eprintln!("Access token not found in response");
            "Access token not found in response".to_string()
        })
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResetEmailArgs {
    username: String,
    to_email: String,
    smtp_host: String,
    smtp_port: u16,
    smtp_security: String,
    smtp_username: String,
    smtp_password: String,
    from_email: String,
    code: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SmtpTestArgs {
    to_email: String,
    smtp_host: String,
    smtp_port: u16,
    smtp_security: String,
    smtp_username: String,
    smtp_password: String,
    from_email: String,
}

#[tauri::command]
async fn send_password_reset_email(args: ResetEmailArgs) -> Result<(), String> {
    let smtp_password = args.smtp_password;

    let to_email = args.to_email;
    let from_email = args.from_email;
    let code = args.code;
    let smtp_username = args.smtp_username;
    let smtp_security = args.smtp_security;
    let smtp_host = args.smtp_host;
    let smtp_port = args.smtp_port;

    let send_result = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let message = Message::builder()
            .from(from_email.parse().map_err(|err| format!("Invalid from email: {err}"))?)
            .to(to_email.parse().map_err(|err| format!("Invalid recipient email: {err}"))?)
            .subject("Client Records Password Reset Code")
            .body(format!(
                "Your Client Records password reset code is: {}\n\nThis code expires in 10 minutes.\nIf you did not request this, you can ignore this email.",
                code
            ))
            .map_err(|err| format!("Failed to compose email: {err}"))?;

        let creds = Credentials::new(smtp_username, smtp_password);
        let security = smtp_security.to_lowercase();

        let mailer = if security == "ssl" {
            let tls_params = TlsParameters::new(smtp_host.clone()).map_err(|err| format!("TLS error: {err}"))?;
            SmtpTransport::builder_dangerous(&smtp_host)
                .port(smtp_port)
                .credentials(creds)
                .tls(Tls::Wrapper(tls_params))
                .timeout(Some(StdDuration::from_secs(SMTP_SEND_TIMEOUT_SECS)))
                .build()
        } else if security == "tls" || security == "starttls" {
            SmtpTransport::starttls_relay(&smtp_host)
                .map_err(|err| format!("SMTP relay error: {err}"))?
                .port(smtp_port)
                .credentials(creds)
                .timeout(Some(StdDuration::from_secs(SMTP_SEND_TIMEOUT_SECS)))
                .build()
        } else {
            SmtpTransport::builder_dangerous(&smtp_host)
                .port(smtp_port)
                .credentials(creds)
                .tls(Tls::None)
                .timeout(Some(StdDuration::from_secs(SMTP_SEND_TIMEOUT_SECS)))
                .build()
        };

        mailer
            .send(&message)
            .map_err(|err| format!("Failed to send password reset email: {err}"))?;

        Ok(())
    })
    .await
    .map_err(|err| format!("Email task failed: {err}"))?;

    send_result?;

    Ok(())
}

#[tauri::command]
async fn send_email_verification_email(args: ResetEmailArgs) -> Result<(), String> {
    let smtp_password = args.smtp_password;

    let to_email = args.to_email;
    let from_email = args.from_email;
    let code = args.code;
    let smtp_username = args.smtp_username;
    let smtp_security = args.smtp_security;
    let smtp_host = args.smtp_host;
    let smtp_port = args.smtp_port;

    let send_result = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let message = Message::builder()
            .from(from_email.parse().map_err(|err| format!("Invalid from email: {err}"))?)
            .to(to_email.parse().map_err(|err| format!("Invalid recipient email: {err}"))?)
            .subject("Client Records Email Verification Code")
            .body(format!(
                "Your Client Records email verification code is: {}\n\nThis code expires in 10 minutes.",
                code
            ))
            .map_err(|err| format!("Failed to compose email: {err}"))?;

        let creds = Credentials::new(smtp_username, smtp_password);
        let security = smtp_security.to_lowercase();

        let mailer = if security == "ssl" {
            let tls_params = TlsParameters::new(smtp_host.clone()).map_err(|err| format!("TLS error: {err}"))?;
            SmtpTransport::builder_dangerous(&smtp_host)
                .port(smtp_port)
                .credentials(creds)
                .tls(Tls::Wrapper(tls_params))
                .timeout(Some(StdDuration::from_secs(SMTP_SEND_TIMEOUT_SECS)))
                .build()
        } else if security == "tls" || security == "starttls" {
            SmtpTransport::starttls_relay(&smtp_host)
                .map_err(|err| format!("SMTP relay error: {err}"))?
                .port(smtp_port)
                .credentials(creds)
                .timeout(Some(StdDuration::from_secs(SMTP_SEND_TIMEOUT_SECS)))
                .build()
        } else {
            SmtpTransport::builder_dangerous(&smtp_host)
                .port(smtp_port)
                .credentials(creds)
                .tls(Tls::None)
                .timeout(Some(StdDuration::from_secs(SMTP_SEND_TIMEOUT_SECS)))
                .build()
        };

        mailer
            .send(&message)
            .map_err(|err| format!("Failed to send verification email: {err}"))?;

        Ok(())
    })
    .await
    .map_err(|err| format!("Email task failed: {err}"))?;

    send_result?;

    Ok(())
}

#[tauri::command]
async fn send_smtp_test_email(args: SmtpTestArgs) -> Result<(), String> {
    let to_email = args.to_email;
    let from_email = args.from_email;
    let smtp_username = args.smtp_username;
    let smtp_password = args.smtp_password;
    let smtp_security = args.smtp_security;
    let smtp_host = args.smtp_host;
    let smtp_port = args.smtp_port;

    let send_result = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let message = Message::builder()
            .from(from_email.parse().map_err(|err| format!("Invalid from email: {err}"))?)
            .to(to_email.parse().map_err(|err| format!("Invalid recipient email: {err}"))?)
            .subject("Client Records SMTP Test")
            .body("SMTP test successful. Your recovery email configuration is working.".to_string())
            .map_err(|err| format!("Failed to compose test email: {err}"))?;

        let creds = Credentials::new(smtp_username, smtp_password);
        let security = smtp_security.to_lowercase();

        let mailer = if security == "ssl" {
            let tls_params = TlsParameters::new(smtp_host.clone()).map_err(|err| format!("TLS error: {err}"))?;
            SmtpTransport::builder_dangerous(&smtp_host)
                .port(smtp_port)
                .credentials(creds)
                .tls(Tls::Wrapper(tls_params))
                .timeout(Some(StdDuration::from_secs(SMTP_SEND_TIMEOUT_SECS)))
                .build()
        } else if security == "tls" || security == "starttls" {
            SmtpTransport::starttls_relay(&smtp_host)
                .map_err(|err| format!("SMTP relay error: {err}"))?
                .port(smtp_port)
                .credentials(creds)
                .timeout(Some(StdDuration::from_secs(SMTP_SEND_TIMEOUT_SECS)))
                .build()
        } else {
            SmtpTransport::builder_dangerous(&smtp_host)
                .port(smtp_port)
                .credentials(creds)
                .tls(Tls::None)
                .timeout(Some(StdDuration::from_secs(SMTP_SEND_TIMEOUT_SECS)))
                .build()
        };

        mailer
            .send(&message)
            .map_err(|err| format!("Failed to send SMTP test email: {err}"))?;

        Ok(())
    })
    .await
    .map_err(|err| format!("Email task failed: {err}"))?;

    send_result?;

    Ok(())
}
