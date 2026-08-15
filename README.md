# YT Sub

A Chrome extension that overlays ASS/SRT subtitle files on YouTube videos.

Pick a local subtitle file from the extension popup and it renders on top of the
player, synced to playback. ASS files keep their own styling; SRT files are
styled through the popup controls.

## Installation

The extension ships no runtime dependencies, so there is no build step required.

### Method 1: Load the repository directly

1. Clone or download this repository.
2. Open `chrome://extensions` and enable **Developer mode** (top right).
3. Click **Load unpacked** and select the repository root.

### Method 2: Build a clean directory

Useful if you want a folder containing only the files the extension actually
ships:

```bash
chmod +x build.sh
./build.sh
```

This copies `manifest.json`, `popup.html`, `popup.js`, `content.js`, and
`ass-loader.js` into `yt-sub-build/`. Load that directory via **Load unpacked**
as described above.

## Usage

1. Open a YouTube watch page.
2. Click the yt-sub toolbar icon.
3. Choose a `.ass` or `.srt` file and click the load button.
4. Adjust font size, opacity, and vertical offset from the popup. SRT files
   expose additional styling controls (font, colors, outline, background,
   line height, padding).

Use the clear button to remove the current subtitle.

After reloading the extension in `chrome://extensions`, refresh any open
YouTube tab — content scripts are only injected on page load.

## Format support

| Format | Rendering | Styling |
| ------ | --------- | ------- |
| ASS    | [ASS.js](https://github.com/weizhenye/ASS) — honours the script's own styles, positioning, and effects | Opacity and vertical offset from the popup |
| SRT    | Built-in renderer | Full styling from the popup |

Font size set in the popup applies to SRT only, since ASS scripts define their
own font sizes.

## Development

`ass-loader.js` is a vendored copy of ASS.js, patched to attach the library to
`window` instead of using ES module exports. It is generated — do not edit it by
hand. To refresh it against the current upstream release:

```bash
python build.py
```

This requires network access and overwrites the file, so review the diff.

Development tooling (ESLint) lives in `package.json` and is never shipped with
the extension:

```bash
npm install
npm run check   # node --check on the hand-written JS
npm run lint    # ESLint
```

There is no automated test suite. Browser behaviour has to be verified by hand:
reload the extension, then check ASS loading, SRT loading, clearing, switching
between several videos without a page reload, fullscreen, settings persistence,
and the browser console.
