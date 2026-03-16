# Client Records Repo Instructions

## Critical File Targeting Rules

- For shipped UI behavior and updater-visible fixes, treat `tauri-app/index.html` as the runtime source of truth.
- `tauri-app/src/index.html` is a development mirror and must stay in sync, but edits only there are not sufficient for release behavior.
- When a request affects end-user behavior, update both files in the same change unless the user explicitly asks otherwise:
  - `tauri-app/index.html`
  - `tauri-app/src/index.html`

## Required Edit Workflow For UI Changes

1. Locate and patch `tauri-app/index.html` first.
2. Apply equivalent patch to `tauri-app/src/index.html`.
3. Verify both files contain the intended change (search for unique changed strings in both files).
4. Run diagnostics on both files after edits.

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
- Search for the same changed marker in both HTML files.
- Validate both edited files for errors.
