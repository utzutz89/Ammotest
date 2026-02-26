# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]
### Changed
- Filled AGENTS project placeholders (name, goal, and main features).
- Fixed `.codex/config.toml.example` by renaming `agents.max_concurrent` to `agents.max_threads` for Codex CLI compatibility.
- Removed macOS quarantine attribute from `.codex/config.toml.example` to avoid Gatekeeper blocking when opening/copied.
- Ran auto-setup initialization and activated project config at `.codex/config.toml`.
- Synced root `AGENTS.md` with `.codex/AGENTS.md` according to `WORKFLOW.md` setup guidance.

## [0.1.0] - 2026-02-26
### Added
- Initial changelog file.
- Initial AGENTS template for project metadata and role setup.
- Activated `.codex/config.toml` from `.codex/config.toml.example`.
