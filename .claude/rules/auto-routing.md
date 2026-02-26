---
name: auto-routing
description: "Automatische Agenten-Zuweisung basierend auf Keywords"
---
# Auto-Routing Regel

## ⚡ PFLICHT-VERHALTEN

Claude MUSS bei JEDEM User-Input automatisch:

1. **Keywords analysieren**
2. **Passenden Subagenten wählen**
3. **Task an Subagenten delegieren**

## Keyword → Agent Mapping

| Keywords | Agent |
|----------|-------|
| code, impl, implementieren, funktion | `dev-expert` |
| test, unittest, coverage | `test-automator` |
| ui, gui, frontend, komponente | `ui-ux-designer` |
| bug, fix, fehler, debug | `debugger` |
| review, qualität, refactoring | `code-reviewer` |
| doku, memory, constitution | `context-manager` |
| agent, mcp, integration | `agent-expert` |
| prompt, instruktion | `prompt-engineer` |
| swift, ios, macos | `swift-expert` |
| readme, changelog | `doc-maintainer` |

## Delegation

Delegiere die Aufgabe vollständig an den gewählten Agenten.
Format: `🤖 Aktiver Agent: [Name]`
