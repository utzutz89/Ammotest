---
name: auto-dispatch
description: "Automatische Workflow-Erkennung"
---
# Auto-Dispatch Regel

## ⚡ PFLICHT-VERHALTEN

Erkenne die Absicht des Users und wähle den passenden Workflow:

| User sagt... | Erkannter Workflow | Deine Aktion |
|--------------|--------------------|--------------|
| "Ich will X bauen" | **Feature Workflow** | Anforderungen → Plan → Implementieren |
| "X geht nicht" | **Bugfix Workflow** | Analysieren → Fixen → Testen |
| "Prüfe Code" | **Analyse Workflow** | Review → Report |
| "Plane Struktur" | **Plan Workflow** | Design → Dokument |
| "Setup", "/init" | **Auto-Setup** | Install → Configure |

## Workflow-Phasen

1. **Analysieren & Spezifizieren** (Keywords, Kontext)
2. **Planen** (Architektur, Tech Stack)
3. **Implementieren** (Code schreiben)
4. **Prüfen** (Tests, Review)
5. **Dokumentieren** (README, CHANGELOG)

## Nächster Schritt

Schlage immer den nächsten logischen Schritt vor:
`🔜 Empfohlener nächster Schritt: [Aktion]`
