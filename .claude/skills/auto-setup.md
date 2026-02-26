---
name: auto-setup
description: "Automatisches Projekt-Setup nach .claude/ Kopie – Prüft, installiert, konfiguriert"
---
# Auto-Setup Skill

Automatische Projekt-Initialisierung nach dem Kopieren des `.claude/` Ordners.

---

## ⚡ Auto-Setup Workflow

Beim ersten Start in einem neuen Projekt führt Claude automatisch:

1. **Projekt-Analyse** → Welche Art Projekt? (iOS, Web, Backend, etc.)
2. **Prüfung** → Was fehlt? (MCPs, Doku, Struktur)
3. **Installation** → MCPs installieren
4. **Konfiguration** → Configs erstellen
5. **Verifikation** → Alles bereit?

---

## Trigger (Automatisch!)

Auto-Setup startet automatisch wenn:

- ✅ Neues `.claude/` Ordner erkannt
- ✅ `CLAUDE.md` noch unvollständig (Platzhalter vorhanden)
- ✅ User sagt: "Setup", "Initialisiere", "Konfiguriere Projekt"
- ✅ User gibt Befehl: `/auto`

---

## 1. Projekt-Erkennung

```bash
# Claude analysiert Projekt-Struktur:
├── *.xcodeproj / *.xcworkspace      → iOS/Mac
├── package.json / node_modules/     → Node.js/TypeScript
├── requirements.txt / *.py          → Python
├── go.mod                           → Go
├── pom.xml / build.gradle           → Java
├── *.csproj / *.sln                 → C#/.NET
└── (nichts davon)                   → Universal/Neu
```

---

## 2. Automatische Prüfung

| Check | Was | Auto-Fix |
|-------|-----|----------|
| **MCP-Server** | `mcp.json` vorhanden? | ✅ Erstellen wenn nötig |
| **XcodeBuildMCP** | iOS/Mac Projekt? | ✅ `npx` installieren |
| **README.md** | Existiert? | ✅ Template erstellen |
| **CHANGELOG.md** | Existiert? | ✅ Mit Keep a Changelog |
| **CLAUDE.md** | Platzhalter? | ✅ User fragen |
| **Git** | `.git/` vorhanden? | ✅ `git init` |

---

## 3. Auto-Installation

### iOS/Mac Projekte

```bash
# Automatisch:
npx -y @cameroncooke/xcodebuild-mcp

# mcp.json erstellen:
{
  "mcpServers": {
    "xcodebuild": {
      "command": "npx",
      "args": ["-y", "@cameroncooke/xcodebuild-mcp"]
    }
  }
}
```

### Andere Projekte

```bash
# Je nach Projekt-Typ:
- Node.js → package.json prüfen
- Python → requirements.txt prüfen
- Go → go.mod prüfen
# etc.
```

---

## 4. Doku-Templates

### README.md Auto-Erstellung

```markdown
# [PROJEKT-NAME]

## Beschreibung
[KURZE_BESCHREIBUNG]

## Quick Start
```bash
# Installation/Start
...
```

## Dokumentation
- [WORKFLOW.md](./WORKFLOW.md) – Workflow-Übersicht
- [CLAUDE.md](./.claude/CLAUDE.md) – Agenten-Konfiguration

## Changelog
Siehe [CHANGELOG.md](./CHANGELOG.md)

## License
[LICENSE]
```

### CHANGELOG.md Auto-Erstellung

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup

### Changed
- -

### Deprecated
- -

### Removed
- -

### Fixed
- -

### Security
- -
```

---

## 5. Interaktive Setup-Session

```
User: Startet Claude Code in neuem Projekt

🔧 AUTO-SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Projekt-Erkennung:
   Typ: iOS/Mac (Xcode Projekt gefunden)
   Sprache: Swift
   Framework: SwiftUI

✅ Prüfung abgeschlossen:

   [✓] .claude/ Ordner
   [✓] CLAUDE.md (Platzhalter gefunden)
   [✓] Xcode Projekt
   [!] mcp.json (fehlt)
   [!] README.md (fehlt)
   [!] CHANGELOG.md (fehlt)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Auto-Setup wird ausgeführt:

1. XcodeBuildMCP installieren...
   → npx -y @cameroncooke/xcodebuild-mcp
   ✓ Fertig

2. mcp.json erstellen...
   ✓ Fertig

3. README.md erstellen...
   ✓ Fertig

4. CHANGELOG.md erstellen...
   ✓ Fertig

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❓ CLAUDE.md anpassen:

Bitte gib folgende Informationen ein:

1. Projektname: [User eingabe]
2. Ziel der App: [User eingabe]
3. Haupt-Features (getrennt mit Komma): [User eingabe]

[Speichert in CLAUDE.md]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Setup abgeschlossen!

📍 Projekt ist bereit:
   → 10 Agents aktiv
   → 7 Rules geladen
   → 4 Skills bereit
   → XcodeBuildMCP verbunden

🔜 Nächster Schritt:
   → "/speckit.constitution" für Projekt-Prinzipien
   → Oder einfach: "Ich will X bauen"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 6. Quick-Setup (Nicht-interaktiv)

Für Power-User – alles mit Defaults:

```bash
# User sagt:
"Setup mit defaults"

# Claude führt aus:
- README.md mit Platzhalter
- CHANGELOG.md leer
- CLAUDE.md mit "[PROJEKT-NAME]"
- MCPs wenn nötig

# Danach manuell anpassen
```

---

## 7. Setup-Status Check

Beliebiger Zeitpunkt – Status prüfen:

```
User: "Setup Status"

📊 SETUP-STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Bereit:
   [✓] .claude/ Template
   [✓] CLAUDE.md angepasst
   [✓] MCP-Server aktiv

⚠️ Optional:
   [!] README.md könnte aktualisiert werden
   [ ] CHANGELOG.md hat noch keine Einträge

💡 Empfehlung:
   → "/speckit.constitution" für Projekt-Prinzipien

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 8. Fehlerbehandlung

| Problem | Auto-Lösung |
|---------|-------------|
| `npx` nicht gefunden | ❌ Fehler + Install-Link zeigen |
| Kein Schreibrecht | ❌ Fehler + Rechte-Check |
| Xcode nicht gefunden | ⚠️ Warnung + XcodeBuild optional |
| Git nicht initialisiert | ✅ `git init` automatisch |

---

## Best Practices

1. **Immer fragen bei CLAUDE.md** – Projekt-spezifisch
2. **Doku auto-create** – Besser als nichts
3. **MCPs optional** – Nichtevery Projekt braucht alle
4. **Git auto-init** – Wenn noch nicht da

---

## Trigger-Keywords

Auto-Setup startet bei:

| Befehl/Keyword | Alternative |
|----------------|-------------|
| `/auto` | Der schnellste Weg |
| "Setup" | "Initialize", "Initialisiere" |
| "Konfiguriere Projekt" | "Project setup", "Configure" |
| "Mach es ready" | "Alles fertig machen", "Make it ready" |
| Automatisch | Beim erstmaligen Start in neuem Projekt |

---

## Follow-Up

Nach Auto-Setup automatisch vorschlagen:

```
✅ Projekt bereit!

🔜 Nächste Schritte:

1. "/speckit.constitution" – Projekt-Prinzipien definieren
2. "Ich will [feature]" – Erstes Feature starten
3. Überspringen – Direkt loslegen

Was möchtest du tun?
```
