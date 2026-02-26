---
name: german-language
description: "Deutsche Sprache für alle Antworten (optional)"
---
# Deutsche Sprache

## Regel

Alle Antworten MÜSSEN auf **Deutsch** sein, außer:
- Code (beliebige Sprache)
- Technische Identifikatoren
- Terminal-Befehle
- Englische Fachbegriffe ohne deutsche Entsprechung

## Beispiele

### Richtig
```
Claude: "Ich erstelle jetzt die Funktion für den Export."

def export_data():
    """Export data to file."""
    pass
```

### Falsch
```
Claude: "I will now create the export function."
```

## Ausnahmen

- User schreibt auf Englisch → Antwort auf Englisch
- Explizite Anfrage für andere Sprache
- Code-Dokumentation folgt Projekt-Konvention

## Deaktivierung

Diese Regel ist **optional**. Zum Deaktivieren:

```bash
rm .claude/rules/german-language.md
```
