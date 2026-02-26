#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR_DIR="$ROOT_DIR/vendor"
mkdir -p "$VENDOR_DIR"

fetch_file() {
  local out="$1"
  shift
  local ok=0
  for url in "$@"; do
    echo "[download] trying: $url"
    if curl -fL --retry 2 --connect-timeout 10 "$url" -o "$out"; then
      ok=1
      break
    fi
  done
  if [[ $ok -ne 1 ]]; then
    echo "[error] failed to download into $out" >&2
    return 1
  fi
}

fetch_file "$VENDOR_DIR/three.min.js" \
  "https://unpkg.com/three@0.128.0/build/three.min.js" \
  "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js" \
  "https://raw.githubusercontent.com/mrdoob/three.js/r128/build/three.min.js"

fetch_file "$VENDOR_DIR/ammo.wasm.js" \
  "https://cdn.jsdelivr.net/npm/ammo.js@0.0.10/ammo.wasm.js" \
  "https://unpkg.com/ammo.js@0.0.10/ammo.wasm.js" \
  "https://raw.githubusercontent.com/kripken/ammo.js/master/builds/ammo.wasm.js"

fetch_file "$VENDOR_DIR/ammo.wasm.wasm" \
  "https://cdn.jsdelivr.net/npm/ammo.js@0.0.10/ammo.wasm.wasm" \
  "https://unpkg.com/ammo.js@0.0.10/ammo.wasm.wasm" \
  "https://raw.githubusercontent.com/kripken/ammo.js/master/builds/ammo.wasm.wasm"

# Optional asm.js fallback
if ! fetch_file "$VENDOR_DIR/ammo.js" \
  "https://cdn.jsdelivr.net/npm/ammo.js@0.0.10/ammo.js" \
  "https://unpkg.com/ammo.js@0.0.10/ammo.js" \
  "https://raw.githubusercontent.com/kripken/ammo.js/master/builds/ammo.js"; then
  echo "[warn] ammo.js fallback was not downloaded; wasm version is preferred anyway."
fi

for file in three.min.js ammo.wasm.js ammo.wasm.wasm; do
  bytes=$(wc -c < "$VENDOR_DIR/$file")
  echo "[ok] $file size: $bytes bytes"
done

echo "[done] official runtimes are in $VENDOR_DIR"
