# Repository Guidelines

## Project Structure & Module Organization

The extension itself ships no dependencies. `manifest.json` defines permissions and entry points. `content.js` injects subtitle playback into YouTube; `popup.html` and `popup.js` implement the extension UI. There is no background service worker — MV3 does not require one, and `action.onClicked` never fires while `default_popup` is set. `ass-loader.js` is a vendored, generated ASS.js asset that `build.py` downloads and patches, while `build.sh` assembles an unpacked build. `package.json` and `node_modules` exist only for ESLint and are never shipped. The ignored `yt-sub/` and `yt-sub-build/` directories are local build or backup output, not source.

## Build, Test, and Development Commands

- Load the repository root through `chrome://extensions` using **Developer mode > Load unpacked** for local development.
- Run `npm run check` for JavaScript syntax checks (`node --check` on `content.js` and `popup.js`).
- Run `npm run lint` for ESLint. Requires `npm install` once; the dev dependencies are never shipped.
- Run `python -m py_compile build.py` to validate the Python utility.
- Run `python build.py` to refresh `ass-loader.js`. It requires network access and overwrites the vendored file; inspect the diff.
- Run `bash build.sh` on a Unix-like shell to create `yt-sub-build/`.

## Coding Style & Naming Conventions

Follow existing plain JavaScript, HTML, CSS, and Python conventions; do not introduce a bundler or dependency for a small change. Use four-space indentation, semicolons in JavaScript, `camelCase` for functions and variables, `PascalCase` for classes, and `UPPER_SNAKE_CASE` for Python constants. Keep Chrome message action names descriptive, such as `loadSubtitle` or `updateSettings`. No formatter or linter is configured, so preserve nearby style.

## Testing Guidelines

There is no automated test suite or coverage target. Run the syntax checks above, reload the unpacked extension, and test on a YouTube watch page. Verify ASS and SRT loading, clearing, settings persistence, fullscreen behavior, and browser-console errors. Include a focused regression check for every behavior change.

## Commit & Pull Request Guidelines

History favors short, release-oriented subjects such as `Update to v1.3.1`; use concise imperative subjects and mention versions when applicable. Pull requests should summarize behavior changes, list manual checks, link related issues, and include popup or subtitle screenshots for visible changes. Call out `manifest.json` permission changes and generated-library updates explicitly. Never commit keys, `*.pem`, packaged archives, or ignored build directories.
