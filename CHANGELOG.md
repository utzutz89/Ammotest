# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]
### Added
- Rebuilt the game loop to use official Three.js + Ammo.js runtime APIs for real 3D rendering and rigid-body simulation.
- Added procedural in-game texture generation for ground, metal, crate, rock, player, and enemy materials.
- Added improved lighting/shadows, camera follow, particle hit effects, and upgraded HUD/crosshair presentation.
- Added zombie enemy archetype with shamble motion, melee pressure, and gore/splatter feedback.
- Added destructible wooden crates with physics reaction and splinter debris.
- Added realistic map pass (asphalt roads, sidewalks, street lamps, wrecked cars, grime overlays).

### Changed
- Filled AGENTS project placeholders (name, goal, and main features).
- Fixed `.codex/config.toml.example` by renaming `agents.max_concurrent` to `agents.max_threads` for Codex CLI compatibility.
- Removed macOS quarantine attribute from `.codex/config.toml.example` to avoid Gatekeeper blocking when opening/copied.
- Ran auto-setup initialization and activated project config at `.codex/config.toml`.
- Synced root `AGENTS.md` with `.codex/AGENTS.md` according to `WORKFLOW.md` setup guidance.
- Replaced runtime bootstrapping logic to require official compatible runtimes and display explicit startup diagnostics.
- Fixed `file://` startup path by embedding Ammo wasm bytes into `vendor/ammo.wasm.binary.js` and loading them before Ammo initialization.
- Fixed black flicker by hiding the ground physics collider mesh (z-fighting removal) and tuning directional shadow bias settings.
- Prioritized `vendor/ammo.js` on `file://` to avoid noisy wasm/XHR CORS startup errors while keeping official runtime fallback.
- Improved depth/shadow stability (camera clipping range + shadow bias/normal-bias tuning) to reduce visible flicker artifacts.
- Rebalanced early zombie pressure (spawn distance, move speed, melee range/damage) so the start phase remains playable during smoke tests.
- Added project QA standard: after graphics/gameplay changes always run start-check and short graphics-error check.

## [0.1.0] - 2026-02-26
### Added
- Initial changelog file.
- Initial AGENTS template for project metadata and role setup.
- Activated `.codex/config.toml` from `.codex/config.toml.example`.
