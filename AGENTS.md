# Repository Guidelines

## Project Structure & Module Organization

This repository is a dependency-free Chrome Manifest V3 extension. `manifest.json` defines permissions and entry points. `background.js` is the service worker; `content.js` injects subtitle playback into YouTube; and `popup.html`, `popup.js`, and `content.css` implement the extension UI. `ass-loader.js` and `assjs.min.js` are vendored, generated ASS.js assets. `build.py` and `fix_ass.py` download and patch those assets, while `build.sh` assembles an unpacked build. The ignored `yt-sub/` and `yt-sub-build/` directories are local build or backup output, not source.

## Build, Test, and Development Commands

- Load the repository root through `chrome://extensions` using **Developer mode > Load unpacked** for local development.
- Run `node --check background.js`, `node --check content.js`, and `node --check popup.js` for JavaScript syntax checks.
- Run `python -m py_compile build.py fix_ass.py` to validate the Python utilities.
- Run `python build.py` to refresh `ass-loader.js`, or `python fix_ass.py` to refresh `assjs.min.js`. Both require network access and overwrite vendored files; inspect their diffs.
- Run `bash build.sh` on a Unix-like shell to create `yt-sub-build/`.

## Coding Style & Naming Conventions

Follow existing plain JavaScript, HTML, CSS, and Python conventions; do not introduce a bundler or dependency for a small change. Use four-space indentation, semicolons in JavaScript, `camelCase` for functions and variables, `PascalCase` for classes, and `UPPER_SNAKE_CASE` for Python constants. Keep Chrome message action names descriptive, such as `loadSubtitle` or `updateSettings`. No formatter or linter is configured, so preserve nearby style.

## Testing Guidelines

There is no automated test suite or coverage target. Run the syntax checks above, reload the unpacked extension, and test on a YouTube watch page. Verify ASS and SRT loading, clearing, settings persistence, fullscreen behavior, and browser-console errors. Include a focused regression check for every behavior change.

## Commit & Pull Request Guidelines

History favors short, release-oriented subjects such as `Update to v1.3.1`; use concise imperative subjects and mention versions when applicable. Pull requests should summarize behavior changes, list manual checks, link related issues, and include popup or subtitle screenshots for visible changes. Call out `manifest.json` permission changes and generated-library updates explicitly. Never commit keys, `*.pem`, packaged archives, or ignored build directories.
