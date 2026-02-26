# WORKFLOW.md – Komplette Workflow-Übersicht

Diese Datei beschreibt den vollständigen, universellen Workflow des Starter-Templates.
Alles ist auf **Deutsch** und funktioniert einheitlich über alle Tools.

**Unterstützt:**
- **Claude Code** (`.claude/` + `CLAUDE.md`)
- **OpenCode** (`.opencode/` + `AGENTS.md`)
- **Gemini CLI** (`.gemini/` + `GEMINI.md`)
- **Codex CLI** (`.codex/` + `AGENTS.md`)

---

## Schnellstart

### 1. In neues Projekt kopieren

```bash
# Claude Code:
cp -r .claude/ /pfad/zu/neuem/projekt/

# OpenCode:
cp -r .opencode/ /pfad/zu/neuem/projekt/
cp opencode.json.example /pfad/zu/neuem/projekt/opencode.json
cp AGENTS.md /pfad/zu/neuem/projekt/AGENTS.md

# Gemini CLI:
cp -r .gemini/ /pfad/zu/neuem/projekt/
cp .gemini/settings.json.example /pfad/zu/neuem/projekt/.gemini/settings.json

# Codex CLI:
cp -r .codex/ /pfad/zu/neuem/projekt/
cp -r .agents/ /pfad/zu/neuem/projekt/
cp .codex/AGENTS.md /pfad/zu/neuem/projekt/AGENTS.md
cp .codex/config.toml.example /pfad/zu/neuem/projekt/.codex/config.toml
```

### 2. Auto-Setup starten

Egal welches Tool, sag einfach:

> "Setup" oder "Initialisiere Projekt"

**Was passiert:**
1. Projekt-Typ wird erkannt (iOS, Web, Python, etc.)
2. Fehlende Konfigurationen werden geprüft
3. MCP-Server werden vorgeschlagen/installiert
4. README/CHANGELOG werden erstellt

---

## Der Universelle Workflow

Wir nutzen **Spec-Driven Development** basierend auf natürlicher Sprache (keine komplexen CLI-Befehle mehr).

### Die 5 Phasen

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER EINGABE                                   │
│            "Ich will einen Login-Button bauen"                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: ANALYSIEREN & SPEZIFIZIEREN                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Agent: dev-expert / context-manager                                  │
│  • Ziel: Anforderungen klären, User Stories schreiben                   │
│  • Output: Specs in docs/specs/                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: PLANEN                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Agent: dev-expert / architect                                        │
│  • Ziel: Technischen Ansatz wählen, Architektur entwerfen               │
│  • Output: Plan in docs/plans/                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: IMPLEMENTIEREN (Orchestrierung)                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Agent: dev-expert / ui-ux-designer / swift-expert                    │
│  • Ziel: Code schreiben                                                 │
│  • Verhalten: Orchestrator zerlegt Task in Schritte                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: PRÜFEN                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Agent: test-automator / code-reviewer                                │
│  • Ziel: Tests schreiben, Code Review, Qualität sichern                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: DOKUMENTIEREN                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Agent: doc-maintainer                                                │
│  • Ziel: README, CHANGELOG aktualisieren                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Orchestrierung (OpenCode & Codex CLI)

In OpenCode fungiert die `AGENTS.md` als **Orchestrator**. In Codex CLI werden Agent-Rollen über `[agents]` in `config.toml` definiert und via Multi-Agent Feature orchestriert.

**Beispiel:**
User: "Bau eine Login-Seite mit SwiftUI"

1. **Orchestrator** erkennt: "Feature Workflow" + "SwiftUI"
2. **Orchestrator** plant:
   - Schritt 1: Design entwerfen → Delegiert an `ui-ux-designer`
   - Schritt 2: View implementieren → Delegiert an `swift-expert`
   - Schritt 3: Tests schreiben → Delegiert an `test-automator`

Du musst dich um nichts kümmern – der Orchestrator verteilt die Aufgaben.

---

## Verfügbare Experten (Agents)

| Agent | Expertise | Trigger-Keywords |
|-------|-----------|------------------|
| **dev-expert** | Entwicklung | code, impl, funktion, klasse |
| **code-reviewer** | Code-Qualität | review, qualität, refactoring |
| **test-automator** | Tests | test, coverage, unittest |
| **ui-ux-designer** | UI/UX | ui, gui, komponente, frontend |
| **debugger** | Debugging | bug, fix, fehler, debug |
| **context-manager** | Dokumentation | doku, memory, constitution |
| **agent-expert** | MCP-Integration | agent, mcp, integration |
| **prompt-engineer** | Prompts | prompt, instruktion |
| **swift-expert** | Swift/iOS/macOS | swift, ios, macos, swiftui |
| **doc-maintainer** | Dokumentation | readme, changelog |

---

## MCP-Server (Werkzeuge)

| Server | Funktion |
|--------|----------|
| **Memory** | Speichert Projekt-Regeln und Entscheidungen |
| **Filesystem** | Liest und schreibt Dateien |
| **GitHub** | Verwaltet Issues und Pull Requests |
| **XcodeBuild** | Baut und testet iOS Apps (nur Mac) |
| **Context7** | Liefert Framework-Dokumentation (optional) |

---

## Ordner-Struktur

```
.claude/                     .opencode/                  .gemini/                    .codex/
├── CLAUDE.md                (AGENTS.md im Root)         ├── GEMINI.md               ├── AGENTS.md
├── agents/  (10 Subagenten) ├── agent/  (11 Agenten)    ├── agents/  (10 Agenten)   ├── agents/  (11 TOML)
├── rules/   (7 Regeln)      ├── rules/  (7 Regeln)      ├── rules/   (7 Regeln)     ├── (.agents/skills/ 4 Skills)
├── skills/  (4 Skills)      ├── command/(4 Commands)     ├── commands/(4 Commands)   └── config.toml.example
└── mcp.json.example         └── (opencode.json Root)    └── settings.json.example
```

Die Struktur ist in allen Tools konsistent (Agents, Skills/Commands), nur die Benennung der Ordner und Formate variieren je nach Tool-Konvention (JSON, JSONC, TOML, Markdown).
