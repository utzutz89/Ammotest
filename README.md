# Top-Down Shooter (lokal, ohne Server)

Dieses Repository enthält einen spielbaren Top-Down-Shooter, der komplett lokal im Browser läuft (auch via `file://`).

## Enthalten

- `vendor/three.min.js` – lokale, minimierte Three-kompatible Runtime für Rendering.
- `vendor/ammo.js` – lokale Ammo-kompatible Runtime für Physik/Bewegung.
- `src/game.js` – Spiellogik mit Wellen, Gegner-KI, Projektilen, Partikeln, HUD und Reload-System.

## Start

1. `index.html` direkt im Browser öffnen.
2. `Enter` drücken, dann spielen.

## Steuerung

- `WASD`: bewegen
- `Maus`: zielen
- `Linksklick`: schießen
- `R`: nachladen
- `Shift`: sprinten

## Hinweise

Die App benötigt keinen Build-Prozess und keinen Webserver.
