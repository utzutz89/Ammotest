---
name: xcode-testing-automation
description: "Automatisiertes XCTest UI-Testing mit XcodeBuildMCP Integration"
---
# XCTest Automation Skill

Automatisiertes GUI-Testing für iOS/Mac Apps mit XcodeBuildMCP und XCTest.

---

## ⚡ Test-Workflow (Automatisch)

Claude MUSS bei Test-Tasks automatisch:

1. **Test-Suites erkennen** → Welche Tests verfügbar?
2. **Tests ausführen** → XcodeBuildMCP orchestrieren
3. **Results parsen** → Failed Tests analysieren
4. **Fix implementieren** → Fehler beheben
5. **Verify** → Re-Test bis grün

---

## XcodeBuildMCP Test-Tools

| Tool | Funktion | Beispiel |
|------|----------|----------|
| `xcodebuild test` | Alle Tests ausführen | Alle Suites |
| `xcodebuild test-without-building` | Nur Tests (schneller) | Nach Build |
| `xcodebuild -only-testing` | Spezifische Tests | Einzelne Suite |
| `xcodebuild -skip-testing` | Tests überspringen | Bestimmte Suites |

---

## XCTest Test-Typen

### Unit Tests (Logic)

```swift
import XCTest

class MathTests: XCTestCase {
    func testAddition() {
        let result = 2 + 2
        XCTAssertEqual(result, 4, "Addition should work")
    }

    func testArraySorting() {
        let array = [3, 1, 2]
        let sorted = array.sorted()
        XCTAssertEqual(sorted, [1, 2, 3])
    }
}
```

### UI Tests (GUI)

```swift
import XCTest

class LoginUITests: XCTestCase {
    func testLoginFlow() {
        let app = XCUIApplication()
        app.launch()

        // GUI-Test: Button klicken
        app.buttons["Login"].tap()

        // GUI-Test: Text prüfen
        XCTAssertTrue(app.staticTexts["Welcome"].exists)
    }

    func testTextFieldInput() {
        let app = XCUIApplication()
        app.launch()

        // GUI-Test: Text eingeben
        let textField = app.textFields["Username"]
        textField.tap()
        textField.typeText("test@example.com")

        XCTAssertEqual(textField.value as? String, "test@example.com")
    }
}
```

### Performance Tests

```swift
class PerformanceTests: XCTestCase {
    func testParsingPerformance() {
        let jsonString = loadTestData()

        measure {
            _ = try? JSONDecoder().decode(TestData.self, from: jsonString)
        }
    }
}
```

---

## Test-Ausführung (Automatisch)

### Alle Tests

```
User: "Führe alle Tests aus"

Claude:
→ xcodebuild test -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15'

Testing started:
✅ MathTests (5 tests)
✅ LoginUITests (8 tests)
✅ PerformanceTests (2 tests)

Total: 15 passed, 0 failed
```

### Spezifische Tests

```
User: "Teste nur Login-Flow"

Claude:
→ xcodebuild test -only-testing:MyAppUITests/testLoginFlow

Test started:
✅ testLoginFlow passed
```

### GUI-Test mit Screenshot

```
User: "Teste Login und speichere Screenshot"

Claude:
→ Führe UI-Test aus
→ Bei Failure: Screenshot speichern
→ Pfad: ~/Library/Logs/DiagnosticReports/
```

---

## Test-Ergebnis Analyse

### Failed Test Parsing

```
Test Suite 'MyAppUITests' started
Test Case '-[MyAppUITests testLogin]' started
/Users/dev/MyAppUITests.swift:42: error: -[MyAppUITests testLogin] : failed: failed
Test Case '-[MyAppUITests testLogin]' failed (0.123 seconds)
```

**Claude analysiert:**
1. Welche Test-Methode fehlgeschlagen
2. Welche Assertion failed
3. In welcher Zeile der Fehler auftrat
4. Was der erwartete vs. tatsächliche Wert war

---

## Auto-Debugging nach Test-Failure

```
Test failed → Analyse Fix Loop

┌─────────────────────────────────────────┐
│ 1. Test Failure analysiert             │
│    → Stack Trace der Assertion         │
│    → Erwarteter vs. Istwert            │
│    → Betroffener Code lokalisieren      │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 2. Fix implementieren                   │
│    → Swift Code korrigieren            │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 3. Re-Test                             │
│    → xcodebuild test ...               │
│    → Verify: Fix funktioniert          │
└─────────────────────────────────────────┘
```

---

## Simulator vs. Device

| Typ | Destination | GUI? | Speed |
|-----|-------------|------|-------|
| **Simulator** | `-destination 'platform=iOS Simulator,name=iPhone 15'` | ✅ Ja | Schnell |
| **Device** | `-destination 'id=DEVICE_UDID'` | ✅ Ja | Langsamer |

### Simulator-Konfiguration

```
# iPhone 15
destination 'platform=iOS Simulator,name=iPhone 15,OS=latest'

# iPad Pro
destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch)'

# macOS
destination 'platform=macOS'
```

---

## Continuous Testing (Auto-Run)

### Pre-Commit Tests

```
User: "Baue die App und teste alles"

Claude:
→ xcodebuild build (kompilieren)
→ xcodebuild test (alle Tests)
→ Wenn erfolgreich → Deploy
→ Wenn failed → Fix und wiederholen
```

### Test-Driven Development (TDD)

```
User: "Implementiere User-Login mit TDD"

Claude:
1. Test zuerst schreiben (XCTest)
2. Test ausführen → fails (expected)
3. Implementierung schreiben
4. Test ausführen → passes
5. Refactor
```

---

## Test-Coverage

### Coverage-Report

```bash
xcodebuild test -scheme MyApp \
  -enableCodeCoverage YES \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

**Coverage analysieren:**
- Welche Zeilen nicht getestet
- Welche Branches fehlen
- Vorschläge für zusätzliche Tests

---

## Best Practices

1. **UI-Tests isolieren** → Keine Abhängigkeiten zwischen Tests
2. **Wartezeiten** → `XCTWaiter` für async UI-Elemente
3. **Teardown** → `override func tearDown()` aufräumen
4. **Screenshots** → Bei Failure für Debugging
5. **Performance** → `measure` für kritische Pfade

---

## XCTest Asset Catalogs

### Test Data

```
MyAppTests/
├── MyAppTests.swift
├── TestData/
│   ├── users.json
│   └── fixtures.json
└── Resources/
    └── test_image.png
```

---

## Quick-Reference

| Aufgabe | Command |
|---------|---------|
| Alle Tests | `xcodebuild test` |
| Nur UI-Tests | `xcodebuild test -only-testing:MyAppUITests` |
| Ein Test | `xcodebuild test -only-testing:MyAppUITests/testLogin` |
| Simulator starten | `xcrun simctl boot "iPhone 15"` |
| Simulator stoppen | `xcrun simctl shutdown all` |
| Test-Report | `.build/Logs/Test/*.xcresult` |
