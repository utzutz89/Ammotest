---
name: universal-workflow-template
description: "Universeller Workflow mit automatischem Routing"
---

# Universeller Workflow Skill

Dieser Skill definiert den Spec-Driven Development Workflow – **rein basierend auf natürlicher Sprache.**

---

## ⚡ PFLICHT-VERHALTEN (IMMER AUTOMATISCH!)

Claude MUSS bei JEDEM User-Input:

1. **Keywords analysieren** → Workflow erkennen
2. **Complexity-Score berechnen** → Schwierigkeit einschätzen
3. **Agent-Stil wählen** → Entsprechend Keywords
4. **Ausführungs-Report zeigen** → VOR Code-Änderungen
5. **Follow-Up vorschlagen** → Nach jedem Schritt

---

## Workflow-Erkennung (AUTOMATISCH!)

| User sagt... | Erkannter Workflow | Agent-Stil |
|--------------|-------------------|------------|
| "Ich will X bauen" | Feature-Workflow | dev-expert |
| "X funktioniert nicht" | Bugfix-Workflow | debugger |
| "Prüfe die Konsistenz" | Analyse-Workflow | code-reviewer |
| "Plane die Architektur" | Plan-Workflow | dev-expert |

---

## Workflow-Phasen

Statt strikter Befehle folgen wir diesem Prozess:

```
1. Analysieren  → Anforderungen verstehen (Keywords, Kontext)
2. Planen       → Architektur & Ansatz (Tech Stack)
3. Implementieren → Code schreiben (dev-expert)
4. Prüfen       → Tests & Review (test-automator, code-reviewer)
5. Dokumentieren → README & CHANGELOG (doc-maintainer)
```

### Keyword → Phase Mapping

| User sagt... | → Phase | Aktion |
|--------------|---------|--------|
| "Ich will X bauen" | Specify | Anforderungen klären |
| "X ist kaputt" | Specify (Bugfix) | Bug analysieren + fixen |
| "Wie implementieren?" | Plan | Architektur entwerfen |
| "Code schreiben" | Implement | Feature bauen |
| "Prüfe Konsistenz" | Analyze | Code Review |

---

## Gemeinsame Prinzipen

### Complexity Scoring

Bei JEDER Code-Änderung. Siehe [../rules/complexity-scoring.md](../rules/complexity-scoring.md) für Details.

### Subagent Delegation

Siehe [../rules/subagent-delegation.md](../rules/subagent-delegation.md) für Details.

### Execution Report (bei Code-Änderungen)

Siehe [../rules/verbose-execution-logging.md](../rules/verbose-execution-logging.md) für Details.

---

## Projekt-Kontext (anpassen!)

### Stack
```yaml
# Beispiel:
backend: Python 3.11+
frontend: PySide6 / React / Vue
database: SQLite / PostgreSQL
testing: pytest / jest
```

### Architektur
```yaml
# Beispiel:
pattern: Model-View-Controller
events: Signals & Slots
di: Dependency Injection
```

### Kritische Komponenten
```yaml
1: Daten-Layer
2: Business-Logik
3: UI/UX
4: Testing
```

---

## Integrität

| Regel | gilt für |
|-------|----------|
| Templates nicht ändern | Immer |
| Constitution ist Wahrheit | Immer |
| Specs konsistent halten | Immer |
| Stabile Entscheidungen → Memory | Immer |

---

## Quick-Decision Tree

```
Start Task
    │
    ├─ Was will User?
    │   ├─ "Bauen" → Specify Phase
    │   ├─ "Kaputt" → Bugfix Workflow
    │   ├─ "Wie?" → Plan Phase
    │   └─ "Prüfen" → Analyze Phase
    │
    └─ Complexity Score berechnen
        ├─ 0-3 → Einfach, direktes Implement
        ├─ 4-6 → Mittel, Workflow folgen
        └─ 7-10 → Komplex, detaillierter Plan
```

---

## Checklist: Projekt-Setup

Kopiere diese Skill-Datei und passe an:

- [ ] **Name:** `name: projekt-name`
- [ ] **Stack:** Backend, Frontend, DB, Testing
- [ ] **Architektur:** Pattern, Events, DI
- [ ] **Komponenten:** Kritische Teile auflisten
- [ ] **Subagents:** Entsprechend Stack wählen
- [ ] **MCPs:** Memory, Filesystem, Context7 aktiv?
