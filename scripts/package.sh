#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"

bash "$SCRIPT_DIR/build-single-file.sh"

if ! command -v zip >/dev/null 2>&1; then
  echo "[error] zip ist nicht installiert"
  exit 1
fi

cd "$DIST_DIR"
ZIP_NAME="shooter-release-$(date +%Y%m%d).zip"
rm -f "$ZIP_NAME"
zip -q "$ZIP_NAME" index.html

echo "[done] Release ZIP erstellt: dist/$ZIP_NAME"
