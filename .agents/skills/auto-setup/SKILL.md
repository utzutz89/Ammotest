---
name: auto-setup
description: "Automatische Projekt-Einrichtung nach dem Kopieren des .codex/ Ordners. Erkennt Projekttyp, prüft Konfiguration, installiert fehlende Komponenten und erstellt Basis-Dokumentation. Aktivieren bei: Setup, Initialisiere, Projekt konfigurieren, Mach es bereit, /auto-setup."
---
# Auto-Setup Skill

Automatische Initialisierung und Konfiguration eines neuen Projekts.

## Workflow

### Schritt 1: Projekt-Erkennung

Analysiere Projektstruktur für Typ-Bestimmung:

| Datei/Ordner | Typ | Aktion |
|-------------|------|--------|
| `*.xcodeproj`, `*.xcworkspace` | iOS/Mac | XcodeBuildMCP installieren |
| `package.json` | Node.js/TS | npm Check |
| `requirements.txt`, `*.py` | Python | pip Check |
| `go.mod` | Go | go mod Check |
| `pom.xml`, `build.gradle` | Java | Maven/Gradle Check |
| `*.csproj`, `*.sln` | C#/.NET | NuGet Check |
| (nichts) | Universal | Basis Setup |

### Schritt 2: Prüfen was fehlt

```bash
[ -d ".codex" ] && echo "✓ .codex/" || echo "✗ .codex/ fehlt"
[ -f ".codex/config.toml" ] && echo "✓ config.toml" || echo "✗ config.toml fehlt"
[ -f "AGENTS.md" ] && echo "✓ AGENTS.md" || echo "✗ AGENTS.md fehlt"
[ -f "README.md" ] && echo "✓ README.md" || echo "✗ README.md fehlt"
[ -f "CHANGELOG.md" ] && echo "✓ CHANGELOG.md" || echo "✗ CHANGELOG.md fehlt"
[ -d ".git" ] && echo "✓ Git" || echo "✗ Git nicht initialisiert"
```

### Schritt 3: Auto-Installation

**config.toml aktivieren:**
```bash
cp .codex/config.toml.example .codex/config.toml
```

**iOS/Mac Projekte (MCP hinzufügen):**
```bash
codex mcp add xcodebuild -- npx -y @cameroncooke/xcodebuild-mcp
```

**Alle Projekte:**
```bash
git init  # Falls nötig
```

### Schritt 4: Fehlende Doku erstellen

- `README.md` mit Template
- `CHANGELOG.md` mit Keep a Changelog Format
- `AGENTS.md` mit Platzhaltern (falls nicht vorhanden)

### Schritt 5: User Eingaben

Falls Platzhalter in AGENTS.md gefunden werden:

```
Bitte angeben:
1. Projekt Name: ___________
2. Projekt Ziel: ___________
3. Haupt Features (komma-getrennt): ___________
```

## Ausgabe Format

```
🔧 AUTO-SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Projekt-Erkennung:
   Typ: [iOS/Mac/Node.js/Python/etc.]
   Sprache: [Swift/TS/Python/etc.]
   Framework: [SwiftUI/Express/etc.]

✅ Prüfung abgeschlossen:

   [✓] .codex/ Ordner
   [✓/✗] AGENTS.md (Platzhalter?)
   [✓/✗] config.toml
   [✓/✗] README.md
   [✓/✗] CHANGELOG.md
   [✓/✗] Git

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Starte Auto-Setup:

[Schritte werden hier angezeigt]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Setup komplett!

📍 Projekt bereit:
   → 11 Agent-Rollen konfiguriert (inkl. Orchestrator)
   → 4 Skills geladen
   → MCPs verbunden

🔜 Nächste Schritte:
   → Starten mit: "Ich will X bauen"
   → Oder einfach loslegen!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
