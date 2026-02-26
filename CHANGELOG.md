# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]
### Added
- Rebuilt the game loop to use official Three.js + Ammo.js runtime APIs for real 3D rendering and rigid-body simulation.
- Added procedural in-game texture generation for ground, metal, crate, rock, player, and enemy materials.
- Added improved lighting/shadows, camera follow, particle hit effects, and upgraded HUD/crosshair presentation.

### Changed
- Filled AGENTS project placeholders (name, goal, and main features).
- Fixed `.codex/config.toml.example` by renaming `agents.max_concurrent` to `agents.max_threads` for Codex CLI compatibility.
- Removed macOS quarantine attribute from `.codex/config.toml.example` to avoid Gatekeeper blocking when opening/copied.
- Ran auto-setup initialization and activated project config at `.codex/config.toml`.
- Synced root `AGENTS.md` with `.codex/AGENTS.md` according to `WORKFLOW.md` setup guidance.
- Replaced runtime bootstrapping logic to require official compatible runtimes and display explicit startup diagnostics.

## [0.1.0] - 2026-02-26
### Added
- Initial changelog file.
- Initial AGENTS template for project metadata and role setup.
- Activated `.codex/config.toml` from `.codex/config.toml.example`.
