# SmartEMR Repository Instructions

## Application Source

- `tauri-app/index.html` is the sole HTML entry point used by Vite and Tauri.
- Runtime styles live in `tauri-app/src/styles.css`.
- Application bootstrap and feature modules live in `tauri-app/src/`. Keep presentation, domain rules, and service access in separate modules when changing features.
- Do not recreate a second HTML mirror. Update the entry point and modules it imports.

## Release Requirements

Before saying a fix is available through the updater, verify that a release build was created and published, `latest.json` was uploaded, and the app version was bumped.

## Commit Hygiene

- Stage only files intended for the current change.
- Preserve unrelated work and user data.
