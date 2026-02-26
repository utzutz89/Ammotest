---
name: ios-debugging-workflow
description: "iOS/macOS Debugging mit Build-Log Analyse, Crash Reports und XCTest Integration"
---
# iOS/Mac Debugging Workflow

Dieser Skill definiert den Debugging-Workflow für iOS/macOS Projekte mit XcodeBuildMCP Integration.

---

## ⚡ Debugging-Workflow (iOS/Mac)

Claude MUSS bei Debugging-Tasks automatisch:

1. **Build-Log analysieren** → Fehler extrahieren
2. **Crash Reports dekodieren** → Stack Trace rekonstruieren
3. **XCTest Ergebnisse auswerten** → Fehlgeschlagene Tests analysieren
4. **Fix implementieren** → Swift Code korrigieren
5. **Verify** → Build + Test erneut ausführen

---

## Werkzeuge (XcodeBuildMCP)

| Tool | Funktion | Wann nutzen |
|------|----------|-------------|
| `xcodebuild build` | Kompilieren | Build-Fehler finden |
| `xcodebuild test` | Tests ausführen | Test-Fehler finden |
| `xcodebuild clean` | Cache leeren | Bei merkwürdigen Fehlern |
| `xcodebuild scheme` | Schemes auflisten | Konfiguration prüfen |
| `xcodebuild simulator` | Simulator steuern | Device-spezifische Fehler |

---

## 1. Build-Log Analyse

### Typische Build-Fehler

| Fehler-Typ | Log-Muster | Lösung |
|------------|------------|--------|
| **Compile Error** | `error:` in Zeile | Syntax/Type-Fehler |
| **Link Error** | `undefined symbol` | Fehlende Imports/Dependencies |
| **Warning** | `warning:` | Potential Fixes |
| **Code Sign** | `Code signing` | Provisioning Profile |

### Auto-Analyse

```
User: "Der Build ist fehlgeschlagen"

Claude analysiert Build-Log:
├── Suche nach `error:` Pattern
├── Kategorisiere Fehler (Compile/Link/Sign)
├── Extrahiere betroffene Dateien
├── Schlage Fixes vor
└── Implementiere Korrekturen
```

---

## 2. Crash Report Analyse

### Crash-Files

| Typ | Ort | Format |
|-----|-----|--------|
| **Simulator Crash** | `~/Library/Logs/DiagnosticReports/` | `.crash` |
| **Device Crash** | Xcode Organizer → Device Logs | `.crash` |
| **Symbolicated** | Nach `symbolicatecrash` | Menschlich lesbar |

### Analyse-Workflow

```
.crash File laden
    ↓
Stack Trace extrahieren
    ↓
Symbolicieren (falls nötig)
    ↓
Ursache lokalisieren
    ↓
Fix implementieren
```

---

## 3. XCTest Debugging

### Test-Fehler Kategorien

| Typ | Symptom | Analyse |
|-----|----------|---------|
| **Unit Test** | `XCTAssertEqual failed` | Erwartung vs. Istwert |
| **UI Test** | `Failed to find button` | UI-Element nicht gefunden |
| **Performance** | `XCTMeasure` | Zeitüberschreitung |
| **Async** | `XCTWaiter` | Timeout |

### Test-Report Parsen

```
Test Suite 'MyAppTests' started
Test Case '-[MyAppTests testLogin]' started
<unknown>:0: error: -[MyAppTests testLogin] : failed
Test Case '-[MyAppTests testLogin]' failed (0.003 seconds)
```

**Claude analysiert:**
- Welche Tests fehlgeschlagen
- Was die Assertion erwartet hat
- Was der tatsächliche Wert war
- Wo der Fehler im Code liegt

---

## 4. Simulator/Device Logging

### Console Logs abrufen

```bash
# Simulator Logs
xcrun simctl spawn booted log stream --level debug

# Device Logs (über XcodeBuildMCP)
xcodebuild test -destination 'id=DEVICE_UDID'
```

### Log-Analyse

```
User: "Die App crasht im Simulator"

Claude:
1. Console Logs abrufen
2. nach `fatal error`, `assertion failure` suchen
3. Thread-Stack analysieren
4. Ursache identifizieren
5. Fix implementieren
```

---

## 5. Debugging-Phasen

```
┌─────────────────────────────────────────────────────────────┐
│ iOS/Mac Debugging Lifecycle                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Phase 1: Build                                             │
│   → xcodebuild build                                        │
│   → Compile Errors analysieren                              │
│   → Link Errors beheben                                    │
│                                                             │
│ Phase 2: Test                                              │
│   → xcodebuild test                                        │
│   → Failed Tests identifizieren                            │
│   → Asserts auswerten                                      │
│                                                             │
│ Phase 3: Runtime                                           │
│   → Crash Reports laden                                     │
│   → Console Logs analysieren                                │
│   → Memory Leaks finden (Instruments)                      │
│                                                             │
│ Phase 4: Verify                                            │
│   → Fix erneut testen                                      │
│   → Regression Check                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Keywords → Auto-Debugging

| User sagt | Phase | Action |
|-----------|-------|--------|
| "Build failed" | Build | Compile Errors analysieren |
| "Tests failed" | Test | XCTest Report parsen |
| "App crashed" | Runtime | Crash Report laden |
| "Button doesn't work" | UI | UI-Test ausführen |
| "Slow performance" | Performance | Instruments analysieren |

---

## XcodeBuildMCP Integration

### Beispiel-Session

```
User: "Die iOS App crasht beim Starten"

🔧 AUSFÜHRUNGS-REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Schwierigkeit: 4/10 (Mittel)
🎯 Aktion: iOS Crash analysieren
🤖 Aktivierte Agents:
   → swift-expert - Swift Code analysieren
   → debugger - Crash Report dekodieren
🔗 Verwendete MCP-Server:
   → xcodebuild: simulator (Logs abrufen)
   → filesystem: crash (.crash Datei lesen)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Analysiere Crash Report...]

Crash gefunden: Thread 0: EXC_BAD_INSTRUCTION
   → viewDidLoad() force unwrapped nil
   → Fix: Optional safely unwrappen

Fix implementiert...

✅ Repaired!
```

---

## Best Practices

1. **Build Logs immer sparen** – Für spätere Analyse
2. **Crash Reports automatisch sichern** – `symbolicatecrash` nutzen
3. **UI-Tests schreiben** – Regression vermeiden
4. **Console Logs überwachen** – Early Warning System
5. **Instrument für Performance** – Memory Leaks finden

---

## Quick-Reference

| Problem | Tool | Command |
|---------|------|---------|
| Compile Error | Build Log | `xcodebuild build` |
| Test Failure | XCTest Report | `xcodebuild test` |
| Crash | Crash Report | `.crash` File analysieren |
| Slow App | Instruments | `xcrun xctrace` |
| Device Issue | Device Logs | `xcrun simctl spawn booted log` |
