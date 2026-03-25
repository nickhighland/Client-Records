#[cfg(target_os = "macos")]
fn embed_ffmpeg_binary() {
    use std::fs;
    use std::path::PathBuf;

    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let resources_dir = manifest_dir.join("resources");
    let bundled_ffmpeg = resources_dir.join("ffmpeg");

    if !bundled_ffmpeg.exists() {
        panic!(
            "Bundled ffmpeg missing at {}. Add a macOS arm64 ffmpeg binary there before building.",
            bundled_ffmpeg.display()
        );
    }

    fs::create_dir_all(&resources_dir).expect("Failed to create src-tauri/resources directory");

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&bundled_ffmpeg)
            .expect("Failed to read bundled ffmpeg metadata")
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&bundled_ffmpeg, perms)
            .expect("Failed to set executable permissions on bundled ffmpeg");
    }

    println!("cargo:rerun-if-changed={}", bundled_ffmpeg.display());
    println!(
        "cargo:warning=Using vendored bundled ffmpeg at {}",
        bundled_ffmpeg.display()
    );
}

fn main() {
    #[cfg(target_os = "macos")]
    embed_ffmpeg_binary();

    tauri_build::build()
}
