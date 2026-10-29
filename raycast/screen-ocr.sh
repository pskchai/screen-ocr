#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Screen OCR
# @raycast.mode silent
# @raycast.packageName Local OCR
# @raycast.description Capture a screen region and copy text from local OCR.

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd) || exit 1
exec "$SCRIPT_DIR/../ocr.sh" "$@"
