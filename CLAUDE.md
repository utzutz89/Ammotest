# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This is a **universal starter template** for AI coding assistants. It provides pre-configured agents, rules, and MCP server configurations for **Claude Code**, **OpenCode**, **Gemini CLI**, and **Codex CLI**.

## Repository Structure

```
Project-Start-Workflow/
├── CLAUDE.md                    # This file
├── AGENTS.md                    # OpenCode instructions
├── GEMINI.md                    # Gemini CLI instructions
├── README.md                    # Project documentation
├── WORKFLOW.md                  # Complete workflow overview
├── .claude/                     # Claude Code starter template (COPY THIS!)
│   ├── CLAUDE.md               # Agent profile template
│   ├── agents/                 # 10 specialized subagents
│   ├── rules/                  # 7 behavioral rules
│   ├── skills/                 # 4 specialized skills
│   └── mcp.json.example        # MCP configuration template
├── .opencode/                   # OpenCode starter template
│   ├── agent/                  # 11 specialized agents (incl. orchestrator)
│   ├── command/                # 4 custom commands
│   └── rules/                  # 7 behavioral rules
├── .gemini/                     # Gemini CLI starter template
│   ├── GEMINI.md               # Agent profile with @import syntax
│   ├── agents/                 # 10 specialized agents
│   ├── rules/                  # 7 behavioral rules
│   ├── commands/               # 4 specialized commands
│   └── settings.json.example   # MCP configuration template
├── .codex/                      # Codex CLI starter template
│   ├── AGENTS.md               # Codex instruction template (copy to project root)
│   ├── agents/                 # 11 agent role configs (TOML, inkl. Orchestrator)
│   └── config.toml.example     # Codex CLI configuration template
├── .agents/                     # Codex CLI skills (repo-level)
│   └── skills/                 # 4 specialized skills (SKILL.md)
├── examples/                    # Example projects
│   └── leitstand-schichtplaner/
│       ├── CLAUDE.md           # Concrete project example
│       ├── agents/             # Python-specific agents
│       ├── rules/              # Extended rules
│       └── skills/             # Project-specific skills
├── docs/                        # Documentation
│   └── spec-kit/               # Spec-Kit reference
│       ├── README.md           # Spec-Kit CLI reference
│       └── spec-driven.md      # Spec-Driven Development guide
└── scripts/
    └── claude-zai-setup.sh     # Z.AI/GLM configuration
```

## Using This Template

### Quick Start

```bash
# Copy .claude/ folder to your project
cp -r .claude/ /path/to/your/project/

# Customize .claude/CLAUDE.md with your project details
# Start Claude Code and begin working
```

### Available Spec-Kit Commands

| Command | Purpose |
|---------|---------|
| `/speckit.constitution` | Define project principles |
| `/speckit.specify` | Create feature specifications |
| `/speckit.clarify` | Clarify requirements |
| `/speckit.plan` | Generate implementation plans |
| `/speckit.tasks` | Break plans into tasks |
| `/speckit.implement` | Execute implementation |
| `/speckit.analyze` | Quality analysis |

### Auto-Setup (Neu!)

```bash
# After copying .claude/ to your project:
cd /path/to/your/project
claude
/auto  # Automatic setup

# Or simply say: "Setup", "Initialisiere", "Konfiguriere Projekt"
```

## Key Files

| File | Purpose |
|------|---------|
| `WORKFLOW.md` | Complete workflow visualization |
| `.claude/CLAUDE.md` | Template agent profile |
| `.claude/agents/` | 10 subagent definitions |
| `.claude/rules/` | 7 behavioral rules |
| `.claude/skills/` | 4 specialized skills |

## Subagents

| Agent | Expertise |
|-------|-----------|
| `dev-expert` | Development, architecture |
| `code-reviewer` | Code quality, reviews |
| `test-automator` | Test strategies |
| `ui-ux-designer` | UI/UX design |
| `debugger` | Bug analysis, iOS/macOS debugging |
| `context-manager` | Documentation, memory |
| `agent-expert` | MCP integration |
| `prompt-engineer` | Prompt optimization |
| `swift-expert` | Swift, iOS, macOS, SwiftUI, UIKit |
| `doc-maintainer` | README, CHANGELOG maintenance |

## Skills

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `auto-setup` | Automatic project setup | "Setup", "/auto" |
| `SKILL.md` | Universal workflow (MIT/OHNE Spec-Kit) | Automatic |
| `ios-debugging` | iOS/macOS debugging with XcodeBuildMCP | "Build failed", "Tests failed" |
| `xcode-testing` | XCTest automation for iOS/Mac | "Teste", "XCTest" |

## MCP Servers

| Server | Function |
|--------|----------|
| `memory` | Persistent decisions, constitution |
| `filesystem` | Code access, file operations |
| `context7` | Documentation retrieval |
| `github` | Repository management |
| `xcodebuild` | iOS/macOS builds, tests, simulator *(project-specific)* |
