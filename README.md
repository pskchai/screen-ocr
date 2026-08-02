# Screen OCR — hotkey region capture to clipboard (macOS)

Press a global hotkey, drag-select a screen region, and the text is OCR'd by a
local MLX vision model (`mlx-community/GLM-OCR-bf16`) and placed on your
clipboard. Inference runs on-device via `mlx_vlm.generate`; Hammerspoon drives
the hotkey.

## How it works

```
hotkey -> screencapture -i (region) -> mlx_vlm.generate --image --no-verbose
       -> pbcopy -> silent notification
```

Errors (e.g. model not found, download failure) are copied to the clipboard and
shown in a notification. An empty result never overwrites your clipboard.

## Prerequisites

1. Install [uv](https://docs.astral.sh/uv/) and sync the venv in this directory:

   ```sh
   uv sync                    # creates .venv with mlx-vlm
   ```

   The script invokes `.venv/bin/mlx_vlm.generate` relative to its own location,
   so no shell activation is needed.
2. First run downloads the model (~2.2 GB) into the Hugging Face cache; later
   runs load from disk in ~3 s. Model and token budget are overridable:

   ```sh
   OCR_MODEL=mlx-community/GLM-OCR-8bit ./ocr.sh shot.png
   OCR_MAX_TOKENS=4096 ./ocr.sh shot.png
   ```

   To change the default permanently, edit the `MODEL=` line in `ocr.sh`.
3. Make the script executable:

   ```sh
   chmod +x ocr.sh
   ```

4. Install [Hammerspoon](https://www.hammerspoon.org) (`brew install --cask hammerspoon`) and launch it.

Quick check (no hotkey yet), against an existing image:

```sh
./ocr.sh /path/to/some-screenshot.png   # text lands on the clipboard
```

## Step 0 — Grant Hammerspoon permissions (do this first)

Hammerspoon runs the script as its own child process, so it is the stable owner
of the capture and you grant permission **once** — unlike Shortcuts/Quick
Actions, which run in the frontmost app's context and re-prompt per app.

In **System Settings → Privacy & Security**, enable **Hammerspoon** under:
- **Accessibility** — required for the global hotkey.
- **Screen Recording** — required, or `screencapture` returns a blank/wallpaper
  image. You may need to trigger one capture so Hammerspoon appears in the list,
  then toggle it on and relaunch Hammerspoon.

## Step 1 — Global hotkey (Hammerspoon)

Add this to `~/.hammerspoon/init.lua`:

```lua
hs.hotkey.bind({"cmd", "shift"}, "2", function()
  hs.task.new("/Users/megacodexz/Utilities/ocr/ocr.sh", nil):start()
end)
```

Use the absolute path (`hs.task` does not inherit a shell), then reload the
config from the Hammerspoon menu-bar icon → **Reload Config**.

Press **⌘⇧2** from any app → drag a region → paste the OCR'd text.

## Fallbacks

- **skhd** — add `cmd + shift - 2 : /Users/megacodexz/Utilities/ocr/ocr.sh` to
  `~/.skhdrc` and grant skhd Screen Recording.
- **Shortcuts.app / Automator Quick Action** — a "Run Shell Script" exposed as a
  Quick Action with a keyboard shortcut works, but Quick Actions run in the
  **frontmost app's** Services context, so macOS attributes Screen Recording to
  whatever app you capture and re-prompts for each one. Use only if you can't run
  a hotkey daemon.

## Troubleshooting

- **Blank/wallpaper capture** → Hammerspoon lacks Screen Recording permission
  (Step 0); relaunch Hammerspoon after toggling it on.
- **Hotkey does nothing** → Hammerspoon lacks Accessibility permission, or the
  config wasn't reloaded.
- **Clipboard shows `Failed: mlx_vlm.generate not found …`** → run `uv sync` in
  this directory.
- **Clipboard shows `Failed: …RepositoryNotFoundError…`** → bad `MODEL=` /
  `OCR_MODEL` repo id, or the model is gated (`hf auth login`).
- **First press feels stuck** → the model is downloading (~2.2 GB); run
  `./ocr.sh some.png` once from a terminal to watch progress. Warm runs take ~3 s.
- **"No text found" notification** → the selected region had no recognizable text;
  the clipboard is left untouched on purpose.
