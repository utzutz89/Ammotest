# Top-Down Shooter (lokal, ohne Server)

Dieses Repository enthält einen spielbaren Top-Down-Shooter, der lokal im Browser läuft.

## Wichtiger Hinweis zu Three.js / Ammo.js

Du hattest recht: Eine echte `three.min.js` ist normalerweise deutlich größer (oft mehrere hundert KB).

Aktuell enthält das Repo **Fallback-Dateien**:

- `vendor/three-lite.min.js`
- `vendor/ammo-lite.js`

Diese sind nur Platzhalter-Runtimes, damit das Spiel in dieser eingeschränkten Umgebung startbar bleibt.

## Echte lokale Bundles verwenden (empfohlen)

Lege die offiziellen Dateien zusätzlich in `vendor/` ab:

- `vendor/three.min.js` (offizielle, große Build-Datei)
- `vendor/ammo.js` (offizielle Ammo.js-Build)

Der Loader (`src/runtime-loader.js`) lädt automatisch zuerst die offiziellen Dateien und nutzt nur bei Fehlschlag die `*-lite`-Fallbacks.

## Start

1. `index.html` im Browser öffnen.
2. `Enter` drücken, dann spielen.

## Steuerung

- `WASD`: bewegen
- `Maus`: zielen
- `Linksklick`: schießen
- `R`: nachladen
- `Shift`: sprinten
