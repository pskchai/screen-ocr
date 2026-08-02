#!/bin/bash
# ocr.sh — region screenshot -> local MLX VLM OCR -> clipboard (macOS)
# Usage: ocr.sh [image.png]   (no arg = interactive region selection)

set -uo pipefail
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$PATH"   # Hammerspoon hs.task uses a sparse PATH
TMPDIR="${TMPDIR:-/tmp}"

# ---- config ----------------------------------------------------------------
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
VLM="$HERE/.venv/bin/mlx_vlm.generate"              # uv-managed venv: `uv sync` in $HERE
MODEL="${OCR_MODEL:-mlx-community/GLM-OCR-bf16}"    # local dir or Hugging Face repo
MAX_TOKENS="${OCR_MAX_TOKENS:-2048}"
PROMPT="Use simple, accurate LaTeX. Prefer math blocks (`$$…$$`) for standalone lines. Text Recognition:"
export HF_HUB_DISABLE_PROGRESS_BARS=1               # keep stderr to real errors
# ----------------------------------------------------------------------------

notify() { local m=${1//\\/ }; m=${m//\"/\'}; osascript -e "display notification \"$m\" with title \"OCR\"" >/dev/null 2>&1; }
fail()   { printf '%s' "$1"; notify "Failed: $1"; exit 1; }

[ -x "$VLM" ] || fail "mlx_vlm.generate not found at $VLM — run 'uv sync' in $HERE"

# 1. get image: explicit path, else interactive region capture
shot=""
if [ $# -ge 1 ]; then
  img="$1"; [ -s "$img" ] || { echo "no such image: $img" >&2; exit 1; }
else
  img="$TMPDIR/ocr_$$.png"; shot="$img"
fi
errlog="$TMPDIR/ocr_$$.err"
trap 'rm -f "$errlog" ${shot:+"$shot"}' EXIT

if [ -n "$shot" ]; then
  screencapture -i "$img"
  [ -s "$img" ] || exit 0          # Esc/cancel -> clipboard untouched
fi

# 2. run the model locally; --no-verbose makes stdout exactly the generated text,
#    so diagnostics (model download, tracebacks) stay on stderr
text=$("$VLM" --model "$MODEL" --image "$img" --prompt "$PROMPT" \
       --max-tokens "$MAX_TOKENS" --no-verbose 2>"$errlog") || {
  err=$(grep -m1 -E '^[A-Za-z_.]*(Error|Exception)[A-Za-z]*:' "$errlog") \
    || err=$(grep -v '^[[:space:]]*$' "$errlog" | tail -n 1)
  fail "$(printf '%.200s' "${err:-mlx_vlm.generate exited non-zero}")"
}

# 3. postprocess: trim, and tighten math delimiters ($ x $ -> $x$, $$ x $$ -> $$x$$).
text=$(printf '%s' "$text" | perl -0pe '
  s/\A\s+//; s/\s+\z//;
  s/\$\$[ \t]*([^\$\n]+?)[ \t]*\$\$/\$\$$1\$\$/g;
  s/(?<!\$)\$[ \t]*([^\$\n]+?)[ \t]*\$(?!\$)/\$$1\$/g;')

# 4. empty guard -> don't clobber clipboard
[ -n "$text" ] || { notify "No text found"; exit 0; }

printf '%s' "$text" | pbcopy
notify "Recognized ${#text} characters"
