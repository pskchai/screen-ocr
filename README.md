# Screen OCR — hotkey region capture to clipboard (macOS)

Press a global hotkey, drag-select a screen region, and the text is OCR'd by a
local MLX vision model (`mlx-community/GLM-OCR-bf16`) and placed on your
clipboard. Inference runs on-device via `mlx_vlm.generate`; Tinycast starts
the script from its launcher or a global hotkey.

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

4. Install and launch [Tinycast](https://tinycast.dev/).

Quick check (no hotkey yet), against an existing image:

```sh
./ocr.sh /path/to/some-screenshot.png   # text lands on the clipboard
```

## Tinycast Script Command

The Raycast-compatible command is `raycast/screen-ocr.sh`. It starts the same
local OCR script.

1. In Tinycast, open **Settings → Commands** and enable **Custom Commands**.
2. Select **Import Raycast Scripts** and choose the `raycast/` folder in this
   project. Confirm the import.
3. Search for **Screen OCR** in the launcher and run it. Confirm the command
   if Tinycast asks, then select a screen region.

Tinycast must have Screen Recording permission for screen capture. You can
assign a hotkey, such as **⌘⇧2**, in **Settings → Commands**.

Tinycast imports the command once. Keep this project at the same path, because
the imported command calls the script at that path.

## Fallbacks

- **skhd** — add `cmd + shift - 2 : /path/to/ocr.sh` to
  `~/.skhdrc` and grant skhd Screen Recording.
- **Shortcuts.app / Automator Quick Action** — a "Run Shell Script" exposed as a
  Quick Action with a keyboard shortcut works, but Quick Actions run in the
  **frontmost app's** Services context, so macOS attributes Screen Recording to
  whatever app you capture and re-prompts for each one. Use only if you can't run
  a hotkey daemon.

## Troubleshooting

- **Blank/wallpaper capture** → check Tinycast's Screen Recording permission
  in **System Settings → Privacy & Security**.
- **Hotkey does nothing** → check that Tinycast is running and that **Screen
  OCR** is enabled and has a hotkey in **Settings → Commands**.
- **Clipboard shows `Failed: mlx_vlm.generate not found …`** → run `uv sync` in
  this directory.
- **Clipboard shows `Failed: …RepositoryNotFoundError…`** → bad `MODEL=` /
  `OCR_MODEL` repo id, or the model is gated (`hf auth login`).
- **First press feels stuck** → the model is downloading (~2.2 GB); run
  `./ocr.sh some.png` once from a terminal to watch progress. Warm runs take ~3 s.
- **"No text found" notification** → the selected region had no recognizable text;
  the clipboard is left untouched on purpose.
