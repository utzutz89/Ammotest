#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
OUT="$DIST_DIR/index.html"

mkdir -p "$DIST_DIR"

echo "[build] Starte Single-File Build -> $OUT"

inject_script() {
  local file="$1"
  if [[ -f "$file" ]]; then
    {
      echo "<script>"
      cat "$file"
      echo "</script>"
    } >> "$OUT"
    echo "[ok] injected: ${file#$ROOT_DIR/}"
  else
    echo "[warn] nicht gefunden, uebersprungen: ${file#$ROOT_DIR/}"
  fi
}

inject_inline() {
  local content="$1"
  {
    echo "<script>"
    echo "$content"
    echo "</script>"
  } >> "$OUT"
}

if [[ ! -f "$ROOT_DIR/index.html" ]]; then
  echo "[error] index.html fehlt"
  exit 1
fi
if [[ ! -f "$ROOT_DIR/styles.css" ]]; then
  echo "[error] styles.css fehlt"
  exit 1
fi

cat > "$OUT" <<'HTML_HEAD'
<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Top-Down Shooter</title>
HTML_HEAD

{
  echo "<style>"
  cat "$ROOT_DIR/styles.css"
  echo "</style>"
  echo "</head><body>"
} >> "$OUT"

echo "[ok] injected: styles.css"

awk '
  /<body>/ { inbody=1; next }
  inbody && /<script/ { exit }
  inbody { print }
' "$ROOT_DIR/index.html" >> "$OUT"

echo "[ok] HTML Body-Inhalt extrahiert"

inject_script "$ROOT_DIR/vendor/three.min.js"
inject_script "$ROOT_DIR/vendor/ammo.wasm.binary.js"
inject_script "$ROOT_DIR/vendor/ammo.wasm.js"

for pp in Pass EffectComposer RenderPass ShaderPass SimplexNoise SSAOShader SSAOPass CopyShader VignetteShader FXAAShader; do
  inject_script "$ROOT_DIR/vendor/postprocessing/${pp}.js"
done

for tex in asphalt concrete wood_crate metal_plate rock_wall ground_dirt; do
  inject_script "$ROOT_DIR/vendor/textures/tex_${tex}.js"
done

inject_inline "window.__BUNDLED__ = true;"
echo "[ok] injected: window.__BUNDLED__ flag"

inject_script "$ROOT_DIR/src/game-config.js"
inject_script "$ROOT_DIR/src/game-logic.js"
inject_script "$ROOT_DIR/src/progression.js"
inject_script "$ROOT_DIR/src/debug-overlay.js"
inject_script "$ROOT_DIR/src/runtime-loader.js"
inject_script "$ROOT_DIR/src/game.js"

echo "</body></html>" >> "$OUT"

SIZE_BYTES=$(wc -c < "$OUT" | tr -d ' ')
SIZE_MB=$(awk -v b="$SIZE_BYTES" 'BEGIN { printf "%.2f", b / 1048576 }')

echo ""
echo "[done] dist/index.html fertig"
echo "[size] ${SIZE_MB} MB (${SIZE_BYTES} bytes)"
echo "[info] Oeffne dist/index.html per Doppelklick"
