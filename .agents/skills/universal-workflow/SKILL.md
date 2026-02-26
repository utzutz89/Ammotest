---
name: universal-workflow
description: "Universeller Entwicklungs-Workflow mit automatischem Routing und 5-Phasen-Modell. Wird automatisch durch Workflow-Erkennung aktiviert. Unterstützt Feature-, Bugfix-, Refactoring- und Analyse-Workflows. Aktivieren bei: /universal-workflow oder automatisch durch Keyword-Erkennung."
---
# Universal Workflow

Dieser Skill definiert den universellen Entwicklungs-Workflow.

## Core Workflow

```
User Anfrage
     │
     ▼
┌─────────────────┐
│ 1. ANALYSIEREN   │ ← Keywords, Komplexität, Kontext
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ 2. PLANEN        │ ← Architektur, Ansatz
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ 3. IMPLEMENTIEREN│ ← Code mit Agent-Rolle
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ 4. PRÜFEN        │ ← Tests, Review
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ 5. DOKUMENTIEREN │ ← README, CHANGELOG
└─────────────────┘
```

## Workflow-Typen

### Feature Workflow

Ausgelöst durch: "Ich will X bauen", "Feature hinzufügen", "Implementieren..."

```
1. Anforderungen analysieren
2. Architektur entwerfen
3. Implementierungsplan erstellen
4. Feature implementieren
5. Tests schreiben
6. Dokumentation aktualisieren
```

### Bugfix Workflow

Ausgelöst durch: "Bug...", "Fix...", "Geht nicht...", "Fehler..."

```
1. Problem reproduzieren
2. Ursache identifizieren
3. Fix planen
4. Fix implementieren
5. Fix verifizieren
6. Regressionstest hinzufügen
```

### Refactoring Workflow

Ausgelöst durch: "Refactoring...", "Aufräumen...", "Verbessern..."

```
1. Code Smells identifizieren
2. Refactoring planen
3. Test-Coverage sicherstellen
4. Inkrementell refactoren
5. Verhalten unverändert verifizieren
```

### Analyse Workflow

Ausgelöst durch: "Review...", "Prüfen...", "Analysieren..."

```
1. Codebase scannen
2. Probleme identifizieren
3. Report erstellen
4. Verbesserungen vorschlagen
```

## Agent-Rollen Auswahl

| Keywords | Agent-Rolle |
|----------|-------------|
| code, implementieren | dev-expert |
| test, coverage | test-automator |
| ui, komponente | ui-ux-designer |
| bug, fehler | debugger |
| review, qualität | code-reviewer |
| swift, ios | swift-expert |

## Ausführungs-Report

Vor jeder Code-Änderung zeigen:

```
🔧 AUSFÜHRUNGS-REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Komplexität: X/10 ([Einfach/Mittel/Komplex])
   Keywords: [erkannte Keywords]
🎯 Aktion: [Beschreibung]
🤖 Agent-Rolle: [Rolle]
🔗 MCP Server: [Genutzte Server]
⏱️ Geschätzte Token: ~[Anzahl]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Follow-Up

Nach jedem Schritt:

```
✅ [Schritt] abgeschlossen!
📍 Ergebnis: [Pfad/Datei]
🔜 Nächster Schritt: [Vorschlag]
Fortfahren? (ja/nein)
```
