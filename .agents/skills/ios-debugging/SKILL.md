---
name: ios-debugging
description: "iOS/macOS Debugging mit XcodeBuildMCP. Analysiert Build-Fehler, Test-Failures und Crash Reports. Aktivieren bei: Build failed, Tests failed, App crashed, Xcode error, iOS bug. Nicht verwenden für: Android, Web, Backend debugging."
---
# iOS Debugging Skill

Spezialisierter Debugging-Workflow für iOS/macOS Projekte mit XcodeBuildMCP.

## Voraussetzungen

XcodeBuildMCP muss in `.codex/config.toml` konfiguriert sein:

```toml
[mcp_servers.xcodebuild]
command = "npx"
args = ["-y", "@cameroncooke/xcodebuild-mcp"]
enabled = true
```

## Debugging Workflow

### 1. Build Error Analyse

```bash
xcodebuild -scheme [Scheme] build 2>&1 | head -100
```

| Error-Typ | Pattern | Lösung |
|-----------|---------|--------|
| Compile Error | `error:` at line | Syntax/Type Fix |
| Link Error | `undefined symbol` | Fehlenden Import hinzufügen |
| Code Sign | `Code signing` | Provisioning fixen |
| Swift Concurrency | `Sendable` | @Sendable oder @MainActor |

### 2. Test Failure Analyse

```bash
xcodebuild -scheme [Scheme] test -destination 'platform=iOS Simulator,name=iPhone 16'
```

Parse Test-Output für:
- `Test Case '-[...]' failed`
- `XCTAssertEqual failed`
- UI Test Element nicht gefunden

### 3. Crash Report Analyse

1. Crash-Datei finden: `~/Library/Logs/DiagnosticReports/`
2. Symbolicate falls nötig
3. Stack Trace analysieren
4. Thread State identifizieren

### 4. Häufige iOS Probleme

| Problem | Keywords | Lösung |
|---------|----------|--------|
| Build failed | `build`, `compile` | Error-Zeile prüfen |
| Tests failed | `test`, `xctest` | Assertion analysieren |
| App crashed | `crash`, `exception` | Stack Trace Analyse |
| Memory Leak | `leak`, `memory` | Instruments Profiling |
| Langsam | `performance`, `lag` | Time Profiler |

## Ausgabe Format

```
🔍 iOS DEBUGGING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Issue-Typ: [Build Error / Test Failure / Crash]

🎯 Root Cause:
   Datei: [pfad/zur/datei.swift]
   Zeile: [Zeilennummer]
   Fehler: [Fehlermeldung]

💡 Lösung:
   [Spezifische Fix-Anweisungen]

🔧 Fix angewendet:
   [Beschreibung der Code-Änderung]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
