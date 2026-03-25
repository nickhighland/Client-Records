# Client Records Repo Instructions

## Critical File Targeting Rules

- For shipped UI behavior and updater-visible fixes, treat `tauri-app/index.html` as the runtime source of truth.
- `tauri-app/src/index.html` is deprecated and should not be used for new UI edits.

## Required Edit Workflow For UI Changes

1. Locate and patch `tauri-app/index.html` first.
2. Verify the intended change exists in `tauri-app/index.html`.
3. Run diagnostics on `tauri-app/index.html` after edits.

## Pre-Release Checklist (Updater)

Before saying a fix is available via updater, ensure all of the following are true:

1. The runtime file (`tauri-app/index.html`) contains the fix.
2. A release build was created and published (not just git push).
3. `latest.json` was uploaded to the release.
4. Version was bumped from previous release.

## Commit Hygiene

- If nested repo changes (for example `ClientRecords/`) are present but unrelated, do not revert them.
- Stage only intended files for the change being made.

## Quick Sanity Command Pattern

Use this pattern after UI edits:

- `git status --short`
- Search for the changed marker in `tauri-app/index.html`.
- Validate edited files for errors.
