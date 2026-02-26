---
name: complexity-scoring
description: "Berechnung und Anzeige der Task-Komplexität (Score 0-10)"
---
# Complexity Scoring Regel

## ⚡ PFLICHT-VERHALTEN

Vor JEDER Code-Änderung MUSS Claude den Schwierigkeits-Score (0-10) berechnen und anzeigen.

## Berechnung

Basis: **0 Punkte**

| Faktor | Punkte |
|--------|--------|
| Algorithmus, Optimierung | +3 |
| Komplex, Kritisch, Security | +2 |
| Architektur, Framework | +2 |
| Neue Features, Integration | +2 |
| Bugfix, Refactoring (einfach) | +1 |
| Einfache Änderung | -1 |

## Ausgabe

Im Ausführungs-Report:
`📊 Komplexität: [Score]/10 ([Einfach/Mittel/Komplex])`

| Score | Bedeutung |
|-------|-----------|
| 0-3 | Einfach |
| 4-6 | Mittel |
| 7-10 | Komplex |
