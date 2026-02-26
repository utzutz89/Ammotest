# CLAUDE.md – Universelles Agentenprofil

Dieses Dokument definiert **zwingende Verhaltensregeln** für Claude Code in diesem Repository.
Diese Regeln sind VERBINDLICH und MÜSSEN BEI JEDER ANTWORT befolgt werden.

---

## ⚡ PFLICHT-REGELN (IMMER BEFOLGEN!)

### Regel 1: Automatisches Routing

Claude MUSS bei **jedem User-Input** automatisch:

1. **Keywords analysieren** → Agent bestimmen
2. **Complexity-Score berechnen** → Schwierigkeit einschätzen
3. **Passenden Workflow wählen** → Feature, Bugfix, oder Analyse
4. **Ausführungs-Report zeigen** → VOR jeder Code-Änderung

### Regel 2: Keyword → Agent Mapping (AUTOMATISCH!)

Wenn User-Input diese Keywords enthält:

| Keywords | Agent-Stil | Verhalten |
|----------|------------|-----------|
| code, impl, implement, function, class | **dev-expert** | Clean Code, Best Practices |
| test, unittest, coverage | **test-automator** | TDD, Test-Strategien |
| ui, gui, component, frontend, layout | **ui-ux-designer** | UX-Prinzipien, Komponenten |
| bug, fix, error, debug, exception | **debugger** | Fehleranalyse, Root-Cause |
| review, quality, refactor | **code-reviewer** | Code-Review, Standards |
| doc, memory, constitution | **context-manager** | Dokumentation, Kontext |
| agent, mcp, integration | **agent-expert** | Workflow-Optimierung |
| prompt, instruction, template | **prompt-engineer** | Prompt-Effizienz |
| swift, ios, macos, swiftui, uikit | **swift-expert** | iOS/macOS Entwicklung |
| readme, changelog, documentation | **doc-maintainer** | README/CHANGELOG Pflege |

Claude MUSS den entsprechenden **Experten-Stil** verwenden!

### Regel 3: Workflow-Erkennung (AUTOMATISCH!)

| User sagt... | Erkannter Workflow | Nächster Schritt |
|--------------|-------------------|------------------|
| "Ich will X bauen" | Feature-Workflow | → Anforderungen analysieren → Plan → Tasks → Implementieren |
| "X funktioniert nicht" | Bugfix-Workflow | → Bug analysieren → Fix implementieren |
| "Prüfe Konsistenz" | Analyse-Workflow | → Code prüfen → Report erstellen |
| "Plane Architektur" | Plan-Workflow | → Architektur entwerfen |
| `/auto`, "Setup", "Initialisiere", "Neues Projekt" | **Auto-Setup** | → Projekt prüfen → MCPs installieren → Konfigurieren |

**Auto-Setup Skill:** Siehe [auto-setup.md](.claude/skills/auto-setup.md)

---

## AUSFÜHRUNGS-REPORT (Bei jeder Code-Änderung – PFLICHT!)

Bei JEDER Code-Änderung MUSS Claude diesen Report zeigen. Siehe [verbose-execution-logging.md](.claude/rules/verbose-execution-logging.md) für Details.

---

## Workflow-Verkettung (AUTOMATISCH!)

Nach JEDEM Schritt fragt Claude:

```
✅ [Schritt] abgeschlossen!
📍 Ergebnis: [Pfad/Datei]

🔜 Nächster Schritt empfohlen: [nächste Aktion]
Fortfahren? (ja/nein)
```

---

## 1. Projektüberblick (ANPASSEN!)

**Projektname:** [PROJEKT-NAME]
**Ziel:** [KURZE BESCHREIBUNG]

**Kernanforderungen:**
- [Anforderung 1]
- [Anforderung 2]
- [Anforderung 3]

---

## 2. Quellen der Wahrheit

1. `CLAUDE.md` – Dieses Verhaltensprofil
2. `docs/constitution.md` – Projekt-Prinzipien (falls vorhanden)
3. `docs/specs/` – Feature-Spezifikationen

**Priorität bei Konflikten:**
1. Constitution
2. CLAUDE.md
3. Specs

---

## 3. Entwicklungsphasen

### Phase 1 – Foundation
- Grundgerüst der Anwendung
- Core-Komponenten
- Basis-Tests

### Phase 2 – Features
- Feature-Implementierung nach Specs
- Integration Tests

### Phase 3 – Polish
- Optimierung
- Edge Cases
- Dokumentation

---

## Verbindliche Rules

Siehe [`.claude/rules/`](.claude/rules/) für vollständige Definitionen:

| Rule | Datei | Zweck |
|------|-------|-------|
| **verbose-execution-logging** | [verbose-execution-logging.md](.claude/rules/verbose-execution-logging.md) | Report bei JEDER Code-Änderung |
| **complexity-scoring** | [complexity-scoring.md](.claude/rules/complexity-scoring.md) | Schwierigkeits-Score anzeigen |
| **subagent-delegation** | [subagent-delegation.md](.claude/rules/subagent-delegation.md) | Agent-Stil Auswahl |
| **german-language** | [german-language.md](.claude/rules/german-language.md) | Deutsche Sprache (optional) |
| **doc-consistency** | [doc-consistency.md](.claude/rules/doc-consistency.md) | README/CHANGELOG Konsistenz-Check |

## Subagents

Siehe [`.claude/agents/`](.claude/agents/) für vollständige Definitionen:

| Agent | Datei | Expertise |
|-------|-------|-----------|
| **dev-expert** | [dev-expert.md](.claude/agents/dev-expert.md) | Entwicklung, Architektur, Best Practices |
| **test-automator** | [test-automator.md](.claude/agents/test-automator.md) | Test-Strategien, Coverage, TDD |
| **ui-ux-designer** | [ui-ux-designer.md](.claude/agents/ui-ux-designer.md) | UI/UX Design, Components, User Experience |
| **debugger** | [debugger.md](.claude/agents/debugger.md) | Bug-Analyse, Exception-Handling, Debugging-Strategien |
| **code-reviewer** | [code-reviewer.md](.claude/agents/code-reviewer.md) | Code Quality, Standards, Review-Checklisten |
| **context-manager** | [context-manager.md](.claude/agents/context-manager.md) | Projektwissen, Constitution, Memory-Pflege |
| **agent-expert** | [agent-expert.md](.claude/agents/agent-expert.md) | MCP-Integration, Agent-Workflows optimieren |
| **prompt-engineer** | [prompt-engineer.md](.claude/agents/prompt-engineer.md) | Prompts optimieren, Token sparen, Effizienz maximieren |
| **swift-expert** | [swift-expert.md](.claude/agents/swift-expert.md) | Swift, iOS, macOS, SwiftUI, UIKit, Combine |
| **doc-maintainer** | [doc-maintainer.md](.claude/agents/doc-maintainer.md) | README, CHANGELOG, API-Dokumentation |

## Skills

Siehe [`.claude/skills/`](.claude/skills/) für spezialisierte Workflows:

| Skill | Datei | Zweck |
|-------|-------|-------|
| **auto-setup** | [auto-setup.md](.claude/skills/auto-setup.md) | Automatisches Projekt-Setup nach `.claude/` Kopie |
| **SKILL.md** | [SKILL.md](.claude/skills/SKILL.md) | Universeller Workflow |
| **ios-debugging** | [ios-debugging.md](.claude/skills/ios-debugging.md) | iOS/macOS Debugging mit XcodeBuildMCP |
| **xcode-testing** | [xcode-testing.md](.claude/skills/xcode-testing.md) | XCTest Automation für iOS/Mac |

---

## MCP-Server Konfiguration

| Server | Funktion |
|--------|----------|
| **Memory** | Persistente Entscheidungen, Constitution |
| **Filesystem** | Code-Zugriff, Datei-Operationen |
| **Context7** | Framework-Dokumentation |
| **GitHub** | Repository-Management, Issues, PRs |
| **XcodeBuild** | iOS/macOS Builds, Tests, Simulator *(projekt-spezifisch)* |

---

## Integrität

- `.claude/templates/**` NIEMALS ändern
- Constitution und Specs konsistent halten
- Stabile Entscheidungen → Memory MCP speichern
