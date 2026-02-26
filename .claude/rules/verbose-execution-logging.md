---
name: verbose-execution-logging
description: "PFLICHT: Ausführungs-Report bei jeder Code-Änderung"
---
# Verbose Execution Logging Regel

## ⚡ PFLICHT-VERHALTEN

Bei JEDER Code-Änderung MUSS Claude diesen Report zeigen:

```
🔧 AUSFÜHRUNGS-REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Komplexität: [Score]/10 ([Einfach/Mittel/Komplex])
   Keywords: [keywords]

🎯 Aktion: [Was wird getan]
   Dateien: [Betroffene Dateien]

🤖 Aktiver Agent:
   → [agent-name] - [aufgabe]

🔗 MCP Server:
   → [server] - [funktion]

⏱️ Geschätzte Token: ~[Anzahl]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Wann zeigen?

- [x] Code erstellen/bearbeiten
- [x] Bugfix implementieren
- [x] Tests schreiben
- [x] Dokumentation aktualisieren
- [ ] Nur Lesen (optional)
- [ ] Fragen beantworten (nein)
