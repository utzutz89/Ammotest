# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]
### Added
- Added `scripts/build-single-file.sh` to generate a self-contained `dist/index.html` bundle for file-sharing.
- Added `scripts/package.sh` to create `dist/shooter-release-YYYYMMDD.zip` from the single-file build.
- Added urban building blocks with collision, facade window grids, rooftop details, and reserved spawn footprints.
- Added humanoid player model built from articulated Box/Cylinder parts (legs, torso, armor, arms, head, helmet, visor).
- Added per-weapon detailed gun models rebuilt on weapon switch (Pistole, Shotgun, SMG) at the right-hand gun pivot.
- Added hitscan shooting system with raycast damage, short tracer lines, muzzle flash sprite/light/smoke, and surface impact effects.
- Added multi-screen menu flow on the existing overlay: Main Menu, Settings, Highscores, Pause, Upgrade, and extended Game Over screen.
- Added persistent settings in localStorage (mouse sensitivity, quality presets, fullscreen toggle wiring) and persistent top-5 highscores.
- Rebuilt the game loop to use official Three.js + Ammo.js runtime APIs for real 3D rendering and rigid-body simulation.
- Added procedural in-game texture generation for ground, metal, crate, rock, player, and enemy materials.
- Added improved lighting/shadows, camera follow, particle hit effects, and upgraded HUD/crosshair presentation.
- Added zombie enemy archetype with shamble motion, melee pressure, and gore/splatter feedback.
- Added destructible wooden crates with physics reaction and splinter debris.
- Added realistic map pass (asphalt roads, sidewalks, street lamps, wrecked cars, grime overlays).
- Expanded hit gore: denser blood spray, blood mist, near-surface blood splats, and zombie hit impulse stagger.
- Expanded death gore: heavy burst mix (droplets + discs), blood pools, radial splatter ring, and optional organ chunks.
- Extended blood decal persistence to 60-90s and capped active decals at 80 (oldest-first cleanup).
- Added ragdoll-like zombie death handling: death impulse, short corpse persistence (1.5-2.5s), fade-out, then cleanup.
- Added destructible rock/concrete props with HP and physical fragment breakup on destruction.
- Upgraded crate destruction: first-hit visual damage state and 6-8 physical wood fragments on break.
- Added heavy-impact dust bursts for dynamic heavy objects and debris when slamming into the ground.
- Added crate cluster-explosion mechanic when 3+ zombie deaths happen within radius 4.0 (radial impulse + sparks).
- Standardized short browser QA run to ~5 seconds for start/gfx smoke checks.
- Added ambientcg texture pipeline in `fetch-official-runtimes.sh` (download, channel mapping, Base64 `tex_*.js` emit, cleanup).
- Added Three.js r128 postprocessing vendor fetch (Pass, EffectComposer, RenderPass, ShaderPass, SSAOPass, required shaders).
- Added optional Base64 texture boot path in `index.html` + `src/game.js` with graceful Canvas fallback.
- Added EffectComposer render chain (RenderPass -> SSAO -> Vignette -> FXAA) with runtime fallback.
- Added dynamic muzzle flash and zombie death lights plus lamp halo sprites and lamp shadow casting.
- Added multi-weapon gameplay loop (pistol/shotgun/smg), pickups, scroll/1-2-3 switching and per-weapon ammo pools.
- Added wave upgrades, combo multiplier, floating score UI, streak calls, localStorage highscore, and heal/ammo drops.
- Added advanced wave spawning (runner/brute mix by wave, lane spawns, enforced spawn-safe radius).
- Added periodic crate respawn system (every 3 waves) using remembered spawn points.

### Changed
- Added bundled-mode guard to `src/runtime-loader.js` via `window.__BUNDLED__` to skip external runtime loading in single-file builds.
- Added `dist/` to `.gitignore` (build artifacts excluded from repository tracking).
- Brightened the visual baseline significantly (tone mapping exposure, fog/background, light rig, vignette, and brighter road/ground materials).
- Improved weapon readability by strengthening tracers, muzzle flash/light, and impact spark lighting.
- Replaced old physical bullet-mesh flight path with instant-hit raycasting for pistol/smg and pellet spread raycasts for shotgun.
- Reworked game-over handling to include score/wave/kills/time, highscore detection against stored ranking, and menu button actions.
- Updated overlay/CSS styling to unified panel/button transitions, quality button states, and mobile-compatible menu layout.
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
- Switched world atmosphere profile (fog/light tuning) and updated zombie visuals to humanoid-part composition with animated gait.

## [0.1.0] - 2026-02-26
### Added
- Initial changelog file.
- Initial AGENTS template for project metadata and role setup.
- Activated `.codex/config.toml` from `.codex/config.toml.example`.
