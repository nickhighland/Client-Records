#[cfg(target_os = "macos")]
fn compile_audio_setup_helper() {
    use std::path::PathBuf;

    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let swift_source = manifest_dir.join("swift-helpers").join("audio_setup.swift");
    let resources_dir = manifest_dir.join("resources");
    let output_binary = resources_dir.join("audio_setup");

    if !swift_source.exists() {
        println!(
            "cargo:warning=Swift helper not found at {}, skipping",
            swift_source.display()
        );
        return;
    }

    let status = std::process::Command::new("swiftc")
        .arg(&swift_source)
        .arg("-framework").arg("CoreAudio")
        .arg("-framework").arg("Foundation")
        .arg("-O")
        .arg("-o").arg(&output_binary)
        .status()
        .expect("swiftc not found — install Xcode Command Line Tools");

    if !status.success() {
        panic!("Failed to compile audio_setup.swift");
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&output_binary)
            .expect("Failed to read audio_setup metadata")
            .permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&output_binary, perms)
            .expect("Failed to chmod audio_setup");
    }

    println!("cargo:rerun-if-changed={}", swift_source.display());
    println!("cargo:warning=Compiled audio_setup helper to {}", output_binary.display());
}

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
    {
        embed_ffmpeg_binary();
        compile_audio_setup_helper();
    }

    tauri_build::build()
}
