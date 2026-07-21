use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    #[cfg(target_os = "macos")]
    build_listener_native();
    tauri_build::build()
}

#[cfg(target_os = "macos")]
fn build_listener_native() {
    let manifest_dir =
        PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is set"));
    let source = manifest_dir.join("native/ListenerNative.swift");
    let output_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR is set"));
    let library = output_dir.join("libsmartemr_listener.a");
    let sdk = command_output("xcrun", &["--sdk", "macosx", "--show-sdk-path"]);

    println!("cargo:rerun-if-changed={}", source.display());
    let status = Command::new("xcrun")
        .args([
            "swiftc",
            "-parse-as-library",
            "-swift-version",
            "5",
            "-O",
            "-whole-module-optimization",
            "-target",
            "arm64-apple-macosx26.0",
            "-sdk",
            sdk.trim(),
            "-emit-library",
            "-static",
            "-module-name",
            "SmartEMRListener",
            "-o",
        ])
        .arg(&library)
        .arg(&source)
        .status()
        .expect("failed to launch Swift compiler for Listener");
    assert!(
        status.success(),
        "Swift Listener native library failed to compile"
    );

    println!("cargo:rustc-link-search=native={}", output_dir.display());
    println!("cargo:rustc-link-lib=static=smartemr_listener");
    for framework in [
        "AppKit",
        "AudioToolbox",
        "AVFoundation",
        "CoreAudio",
        "CoreMedia",
        "Foundation",
        "FoundationModels",
        "Speech",
    ] {
        println!("cargo:rustc-link-lib=framework={framework}");
    }
    let sdk_path = sdk.trim();
    println!("cargo:rustc-link-search=native={sdk_path}/usr/lib/swift");
    println!("cargo:rustc-link-search=framework={sdk_path}/System/Library/Frameworks");
    println!("cargo:rustc-link-arg=-mmacosx-version-min=26.0");
}

#[cfg(target_os = "macos")]
fn command_output(program: &str, arguments: &[&str]) -> String {
    let output = Command::new(program)
        .args(arguments)
        .output()
        .unwrap_or_else(|error| panic!("failed to run {program}: {error}"));
    assert!(output.status.success(), "{program} returned an error");
    String::from_utf8(output.stdout).expect("command output should be UTF-8")
}
