# SmartEMR Listener Local Build

Date: 2026-07-14

Branch: `Listener`

This branch contains a complete local Listener implementation for the target M1 Pro Mac. It has not been pushed or released.

## What Is Built

- Passive Core Audio capture for all system playback by default, with optional per-app capture. The tap is explicitly unmuted, so the client remains audible. No BlackHole, virtual driver, helper app, or Audio MIDI Setup configuration is required.
- Independent counselor microphone capture that does not take over or reroute system playback.
- Adaptive system-audio speech detection learns the background noise floor before gating the counselor recognizer; conservative transcript reconciliation catches delayed or slightly misrecognized echoes that remain.
- Separate, real-time, on-device `SpeechAnalyzer` transcription pipelines for Counselor and Client.
- App-sleep protection, bounded in-memory speech queues, overload warnings, source meters, pause/resume, wall-clock elapsed time, and deterministic cleanup.
- Immutable Listener session, client, and appointment identifiers on every transcript and generated-note event.
- Encrypted transcript persistence only after the authenticated SmartEMR database is active. Audio is never written to disk.
- Local Apple Foundation Models summarization and complete note generation for Session Information, audit-proofing fields, SOAP, interventions, goal progress, and Next Session notes.
- Transcript-first workflow: stopping retains an editable transcript, and `Generate Note` fills the bound appointment directly while preserving clinician-entered content when a generated field is empty.
- Capture is cancelled and the unsaved transcript is discarded if SmartEMR locks. Auto-lock is deferred while an active Listener capture is running.

## Local Requirements

- Apple silicon Mac running macOS 26 or newer.
- Apple Intelligence enabled and available.
- The Apple-managed English speech asset. SmartEMR requests it in-app if it is not already present.
- One-time macOS approval for Microphone, Speech Recognition, and Screen & System Audio Recording.
- Headphones are strongly recommended. They reduce client-audio leakage into the counselor microphone and improve speaker attribution.
- When counselor and client speech overlap, Listener prioritizes the direct client channel to prevent system playback from being mislabeled as Counselor.

## Use

1. Open an individual appointment under the correct client.
2. In Session Information, leave `All System Audio (Automatic)` selected to hear every app except SmartEMR, or choose one app for a cleaner client channel. Automatic mode does not capture the microphone, but it does include unrelated playback and notifications.
3. Confirm that everyone in the session consented to live transcription.
4. Press `Start Listening` and approve the macOS privacy prompts if this is the first session.
5. Confirm that both source meters move and that Counselor and Client transcript lanes are assigned correctly.
6. Use `Pause` when content should not be transcribed.
7. Press `Stop Listening`, then review or edit the retained transcript.
8. Press `Generate Note` to fill and save the SOAP note and audit-proofing fields. Review and edit the normal chart fields as needed.

If macOS previously denied a permission, enable SmartEMR under System Settings > Privacy & Security in Microphone, Speech Recognition, and Screen & System Audio Recording, then reopen SmartEMR.

## Build And Verification

```bash
cd "/Users/nickhighland/GitHub Repositories/Client Records/tauri-app"
npm run build
cd src-tauri
cargo test
cd ..
npm run tauri build
```

Local artifacts:

- `tauri-app/src-tauri/target/release/bundle/macos/SmartEMR.app`
- `tauri-app/src-tauri/target/release/bundle/dmg/SmartEMR_2.0.3_aarch64.dmg`

The local bundle is ad-hoc signed for this Mac. It is not notarized and is not configured for public distribution or automatic updates from this branch.

## Validation Still Required

This implementation is functional, but it must not be treated as clinically validated yet. Before production release, test it with de-identified scripted sessions covering clinical terminology, overlapping speech, silence, browser restarts, route changes, speakers versus headphones, sleep/wake, and one-hour sessions. Review word accuracy, speaker attribution, unsupported note claims, CPU, memory, and battery use. Complete organizational privacy, consent-law, HIPAA/security, and documentation-policy review before using it with real clients.
