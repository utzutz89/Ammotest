# Top-Down Shooter (lokal, ohne Server)

Dieses Repository enthält einen spielbaren Top-Down-Shooter, der komplett lokal im Browser läuft (auch via `file://`).

## Enthalten

- `vendor/three.min.js` und `vendor/ammo.js` als lokale Standard-Runtimes.
- `vendor/three-lite.min.js` und `vendor/ammo-lite.js` als Fallbacks.
- `src/runtime-loader.js` für automatische Auswahl der verfügbaren Runtime.
- `src/game.js` mit Spiellogik (Wellen, Gegner, Projektile, HUD, Reload-System).

## Offizielle lokale Bundles herunterladen (empfohlen)

Ich habe ein Script ergänzt, das offizielle Builds in `vendor/` ablegt:

```bash
./scripts/fetch-official-runtimes.sh
```

Es lädt (in dieser Reihenfolge mit Mirror-Fallbacks):

- `vendor/three.min.js`
- `vendor/ammo.wasm.js`
- `vendor/ammo.wasm.wasm`
- optional `vendor/ammo.js`

> Hinweis: In dieser Container-Umgebung können externe Downloads per Proxy mit `403 Forbidden` blockiert werden.

## Loader-Reihenfolge

`src/runtime-loader.js` lädt automatisch:

1. `vendor/three.min.js`, sonst `vendor/three-lite.min.js`
2. `vendor/ammo.wasm.js`, sonst `vendor/ammo.js`, sonst `vendor/ammo-lite.js`
3. danach `src/game.js`

Damit nutzt das Projekt automatisch echte lokale Runtimes, sobald sie vorhanden sind.

## Start

1. `index.html` im Browser öffnen.
2. `Enter` drücken, dann spielen.

## Steuerung

- `WASD`: bewegen
- `Maus`: zielen
- `Linksklick`: schießen
- `R`: nachladen
- `Shift`: sprinten

## Hinweise

Die App benötigt keinen Build-Prozess und keinen Webserver.
