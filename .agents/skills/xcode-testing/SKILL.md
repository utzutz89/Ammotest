---
name: xcode-testing
description: "XCTest Automation für iOS/Mac Projekte. Führt Unit Tests, UI Tests und Coverage-Analysen mit XcodeBuildMCP durch. Aktivieren bei: Run tests, Test the app, XCTest, Unit tests, UI tests, Coverage. Nicht verwenden für: Non-Apple Plattformen."
---
# Xcode Testing Skill

Automatisierter Test-Workflow für iOS/macOS Projekte mit XCTest.

## Voraussetzungen

XcodeBuildMCP konfiguriert in `.codex/config.toml`.

## Test Workflow

### 1. Tests entdecken

```bash
xcodebuild -scheme [Scheme] -list
```

### 2. Alle Tests ausführen

```bash
xcodebuild test \
  -scheme [Scheme] \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -resultBundlePath TestResults.xcresult
```

### 3. Spezifische Tests ausführen

```bash
# Einzelne Test-Klasse
xcodebuild test -scheme [Scheme] -only-testing:[Target]/[TestClass]

# Einzelne Test-Methode
xcodebuild test -scheme [Scheme] -only-testing:[Target]/[TestClass]/[testMethod]
```

### 4. Ergebnisse analysieren

Parse Output für:
- `Test Suite 'All tests' passed`
- `Test Suite 'All tests' failed`
- Individuelle Testergebnisse
- Code Coverage

## Test-Typen

| Typ | Zweck | Ort |
|-----|-------|-----|
| Unit Tests | Logik testen | `*Tests/` |
| UI Tests | User Flows testen | `*UITests/` |
| Performance | Geschwindigkeits-Benchmarks | `measure { }` |
| Snapshot | Visuelle Regression | Third-party |

## XCTest Best Practices

```swift
class MyTests: XCTestCase {

    override func setUpWithError() throws {
        // Setup vor jedem Test
    }

    override func tearDownWithError() throws {
        // Cleanup nach jedem Test
    }

    func test_givenCondition_whenAction_thenExpectedResult() throws {
        // Arrange
        let sut = MyClass()

        // Act
        let result = sut.doSomething()

        // Assert
        XCTAssertEqual(result, expected)
    }
}
```

## Coverage Report

```bash
xcodebuild test \
  -scheme [Scheme] \
  -enableCodeCoverage YES \
  -resultBundlePath TestResults.xcresult

# Coverage anzeigen
xcrun xccov view --report TestResults.xcresult
```

## Ausgabe Format

```
🧪 XCODE TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Test-Ergebnisse:
   Gesamt: [X] Tests
   Bestanden: [Y] ✓
   Fehlgeschlagen: [Z] ✗
   Übersprungen: [N] ⊘

📈 Coverage: [XX]%

❌ Fehlgeschlagene Tests:
   - [TestClass/testMethod]: [Fehlermeldung]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
