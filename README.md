# Top-Down Shooter (Three.js + Ammo.js, lokal)

Dieses Projekt ist ein lokaler Top-Down-Shooter mit echter 3D-Pipeline:

- Physically based Rendering (PBR) mit Schatten und Fog
- Ammo.js Physik-Welt fuer Spieler, Gegner, Projektile und Kollisionen
- prozedural erzeugte Texturen (Boden, Metall, Kisten, Felsen, Gegner, Spieler)

## Runtimes herunterladen

```bash
./scripts/fetch-official-runtimes.sh
```

Das Script legt offizielle Bundles in `vendor/` ab:

- `vendor/three.min.js`
- `vendor/ammo.wasm.js`
- `vendor/ammo.wasm.wasm`
- `vendor/ammo.js` (Fallback)

## Loader-Verhalten

`src/runtime-loader.js` erwartet offizielle Three.js/Ammo.js Runtimes und startet erst dann `src/game.js`.
Wenn etwas fehlt oder inkompatibel ist, erscheint eine klare Fehlermeldung im Overlay.

## Start

1. `index.html` im Browser oeffnen
2. `Enter` druecken

## Steuerung

- `WASD`: bewegen
- `Shift`: sprinten
- `Maus`: zielen
- `Linksklick halten`: feuern
- `R`: nachladen

## Hinweis

Das Spiel laeuft ohne Build-Prozess und ohne lokalen Webserver.
