# Top-Down Shooter (Three.js + Ammo.js, lokal)

Dieses Projekt ist ein lokaler Top-Down-Shooter mit echter 3D-Pipeline:

- Physically based Rendering (PBR) mit Schatten und Fog
- Ammo.js Physik-Welt fuer Spieler, Zombies, Projektile, Kollisionen und dynamische Objekte
- prozedural erzeugte Texturen (Asphalt, Beton, Holz, Rost, Zombie-Skin, Blut-Decals)
- zerstoerbare Holzkisten mit Physikreaktion und Splinter-Effekt
- Zombie-Wellen mit Treffer-Splatter, Blutpartikeln und Boden-Splats
- realistischere Urban-Map (Strassenkreuzung, Gehwege, Lampen, Wracks, Schmutzlayer)
- erweitertes Gore-System (Hit-Mist, Surface-Splatter, starke Death-Bursts, Organ-Chunks)
- ragdoll-aehnliches Zombie-Sterben (kurz liegen bleiben, ausfaden, dann cleanup)
- Objekt-Destruktion fuer Kisten/Stein/Beton mit physikalischen Fragmenten
- Impact-Staubbursts bei schweren Bodenaufprallen (Kisten + Truemmer)
- Cluster-Mechanik: Kisten explodieren bei 3+ Zombie-Toden im Radius

## Runtimes herunterladen

```bash
./scripts/fetch-official-runtimes.sh
```

Das Script legt offizielle Bundles in `vendor/` ab:

- `vendor/three.min.js`
- `vendor/ammo.wasm.js`
- `vendor/ammo.wasm.wasm`
- `vendor/ammo.js` (Fallback)
- `vendor/ammo.wasm.binary.js` (eingebettete WASM-Binary fuer `file://`)

## Loader-Verhalten

`src/runtime-loader.js` erwartet offizielle Three.js/Ammo.js Runtimes und startet erst dann `src/game.js`.
Wenn etwas fehlt oder inkompatibel ist, erscheint eine klare Fehlermeldung im Overlay.
Bei `file://` wird `vendor/ammo.wasm.binary.js` geladen, damit Ammo ohne blockierte XHR-WASM-Requests starten kann.

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

## QA-Standard im Projekt

Nach groesseren Gameplay-/Grafikaenderungen wird standardmaessig geprueft:

1. Starttest (`index.html` oeffnen, `Enter` pruefen)
2. kurzer Laufzeittest (ca. 5s) auf Grafikfehler (Flackern/Startfehler) mit Browser-Automation
