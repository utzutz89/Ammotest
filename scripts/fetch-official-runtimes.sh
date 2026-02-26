#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR_DIR="$ROOT_DIR/vendor"
mkdir -p "$VENDOR_DIR"
POSTPROCESS_DIR="$VENDOR_DIR/postprocessing"
TEXTURE_DIR="$VENDOR_DIR/textures"
TEXTURE_ZIP_DIR="$TEXTURE_DIR/zips"
TEXTURE_RAW_DIR="$TEXTURE_DIR/raw"
TEXTURE_OUT_DIR="$TEXTURE_DIR"
mkdir -p "$POSTPROCESS_DIR" "$TEXTURE_ZIP_DIR" "$TEXTURE_RAW_DIR" "$TEXTURE_OUT_DIR"

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

require_cmd() {
  local command="$1"
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "[error] required command not found: $command" >&2
    exit 1
  fi
}

find_first_match() {
  local directory="$1"
  local pattern="$2"
  find "$directory" -type f | grep -Ei "$pattern" | head -n 1 || true
}

to_b64_single_line() {
  local file="$1"
  base64 < "$file" | tr -d '\n'
}

process_texture_set() {
  local set_name="$1"
  local ambientcg_id="$2"
  local zip_file="$TEXTURE_ZIP_DIR/${set_name}.zip"
  local raw_dir="$TEXTURE_RAW_DIR/${set_name}"
  local out_js="$TEXTURE_OUT_DIR/tex_${set_name}.js"
  local set_upper
  set_upper="$(echo "$set_name" | tr '[:lower:]' '[:upper:]')"

  echo "[textures] set=$set_name id=$ambientcg_id"
  fetch_file "$zip_file" \
    "https://ambientcg.com/get?file=${ambientcg_id}_1K-JPG.zip"

  rm -rf "$raw_dir"
  mkdir -p "$raw_dir"
  unzip -oq "$zip_file" -d "$raw_dir"

  local color_src normal_src roughness_src ao_src
  color_src="$(find_first_match "$raw_dir" '_Color\.jpe?g$')"
  normal_src="$(find_first_match "$raw_dir" '_NormalGL\.jpe?g$|_Normal\.jpe?g$')"
  roughness_src="$(find_first_match "$raw_dir" '_Roughness\.jpe?g$')"
  ao_src="$(find_first_match "$raw_dir" '_AmbientOcclusion\.jpe?g$|_AO\.jpe?g$|_Opacity\.jpe?g$')"

  if [[ -z "$color_src" || -z "$normal_src" || -z "$roughness_src" ]]; then
    echo "[error] texture channels missing for $set_name (color/normal/roughness)" >&2
    exit 1
  fi
  if [[ -z "$ao_src" ]]; then
    echo "[warn] AO/Opacity map missing for $set_name, fallback = roughness map"
    ao_src="$roughness_src"
  fi

  local color_dst normal_dst roughness_dst ao_dst
  color_dst="$TEXTURE_OUT_DIR/${set_name}_color.jpg"
  normal_dst="$TEXTURE_OUT_DIR/${set_name}_normal.jpg"
  roughness_dst="$TEXTURE_OUT_DIR/${set_name}_roughness.jpg"
  ao_dst="$TEXTURE_OUT_DIR/${set_name}_ao.jpg"
  cp "$color_src" "$color_dst"
  cp "$normal_src" "$normal_dst"
  cp "$roughness_src" "$roughness_dst"
  cp "$ao_src" "$ao_dst"

  local color_b64 normal_b64 roughness_b64 ao_b64
  color_b64="$(to_b64_single_line "$color_dst")"
  normal_b64="$(to_b64_single_line "$normal_dst")"
  roughness_b64="$(to_b64_single_line "$roughness_dst")"
  ao_b64="$(to_b64_single_line "$ao_dst")"

  cat > "$out_js" <<EOF
(function(){
  window.__TEX_${set_upper}_COLOR__ = '$color_b64';
  window.__TEX_${set_upper}_NORMAL__ = '$normal_b64';
  window.__TEX_${set_upper}_ROUGHNESS__ = '$roughness_b64';
  window.__TEX_${set_upper}_AO__ = '$ao_b64';
})();
EOF

  rm -f "$zip_file" "$color_dst" "$normal_dst" "$roughness_dst" "$ao_dst"
  rm -rf "$raw_dir"

  local js_bytes
  js_bytes=$(wc -c < "$out_js")
  echo "[ok] $(basename "$out_js") size: $js_bytes bytes"
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

echo "[post] downloading Three.js r128 postprocessing/shader helpers..."
for file in Pass.js EffectComposer.js RenderPass.js SSAOPass.js ShaderPass.js; do
  fetch_file "$POSTPROCESS_DIR/$file" \
    "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/js/postprocessing/$file"
done
for file in FXAAShader.js VignetteShader.js CopyShader.js SSAOShader.js; do
  fetch_file "$POSTPROCESS_DIR/$file" \
    "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/js/shaders/$file"
done
fetch_file "$POSTPROCESS_DIR/SimplexNoise.js" \
  "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/js/math/SimplexNoise.js"

for file in Pass.js EffectComposer.js RenderPass.js SSAOPass.js ShaderPass.js FXAAShader.js VignetteShader.js CopyShader.js SSAOShader.js SimplexNoise.js; do
  bytes=$(wc -c < "$POSTPROCESS_DIR/$file")
  echo "[ok] postprocessing/$file size: $bytes bytes"
done

echo "[textures] downloading ambientcg texture sets (1K JPG)..."
require_cmd unzip
require_cmd base64
process_texture_set "asphalt" "Asphalt012"
process_texture_set "concrete" "Concrete034"
process_texture_set "wood_crate" "Wood062"
process_texture_set "metal_plate" "Metal032"
process_texture_set "rock_wall" "Rock030"
process_texture_set "ground_dirt" "Ground054"

# file:// environments often block XHR for wasm loading.
# Embed wasm bytes into a small JS helper so ammo can boot without network/file XHR.
if command -v base64 >/dev/null 2>&1; then
  b64=$(base64 < "$VENDOR_DIR/ammo.wasm.wasm" | tr -d '\n')
  cat > "$VENDOR_DIR/ammo.wasm.binary.js" <<EOF
(function(){
  var b64 = '$b64';
  function base64ToU8(base64) {
    var binary = atob(base64);
    var length = binary.length;
    var bytes = new Uint8Array(length);
    for (var i = 0; i < length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  window.Module = window.Module || {};
  if (!window.Module.wasmBinary) {
    window.Module.wasmBinary = base64ToU8(b64);
  }
})();
EOF
  js_bytes=$(wc -c < "$VENDOR_DIR/ammo.wasm.binary.js")
  echo "[ok] ammo.wasm.binary.js size: $js_bytes bytes"
else
  echo "[warn] base64 command not found; ammo.wasm.binary.js was not generated."
fi

rm -rf "$TEXTURE_RAW_DIR" "$TEXTURE_ZIP_DIR"
echo "[done] official runtimes/assets are in $VENDOR_DIR"
