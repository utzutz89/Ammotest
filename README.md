# Top-Down Shooter (Three.js + Ammo.js, lokal)

Dieses Projekt ist ein lokaler Top-Down-Shooter mit echter 3D-Pipeline:

- Physically based Rendering (PBR) mit Schatten und Fog
- Ammo.js Physik-Welt fuer Spieler, Zombies, Kollisionen und dynamische Objekte
- prozedural erzeugte Texturen (Asphalt, Beton, Holz, Rost, Zombie-Skin, Blut-Decals)
- zerstoerbare Holzkisten mit Physikreaktion und Splinter-Effekt
- Zombie-Wellen mit Treffer-Splatter, Blutpartikeln und Boden-Splats
- realistischere Urban-Map (Strassenkreuzung, Gehwege, Lampen, Wracks, Schmutzlayer)
- zusaetzliche Stadtkulisse mit Gebaeudebloecken, Fassaden-Fenstern und Rooftop-Details
- erweitertes Gore-System (Hit-Mist, Surface-Splatter, starke Death-Bursts, Organ-Chunks)
- physikbasiertes Dismember-System (abtrennbare Zombie-Limbs mit Ammo-RigidBodies, Impuls und Blutspur)
- ragdoll-aehnliches Zombie-Sterben (kurz liegen bleiben, ausfaden, dann cleanup)
- Objekt-Destruktion fuer Kisten/Stein/Beton mit physikalischen Fragmenten
- Impact-Staubbursts bei schweren Bodenaufprallen (Kisten + Truemmer)
- Cluster-Mechanik: Kisten explodieren bei 3+ Zombie-Toden im Radius
- mehrere Waffen (Pistole/Shotgun/SMG), Weapon-Pickups und eigener Ammo-Pool pro Waffe
- detaillierte Waffenmodelle je Waffentyp (Pistole, Shotgun, SMG) am rechten Arm-Pivot
- Raycast-Hitscan fuer Schuesse mit kurzen Tracer-Linien statt langsamer Kugel-Meshes
- Muzzle Flash (Sprite + Licht + Rauch) und Einschlag-Effekte (Funken, Staub, Impact-Decals)
- deutlich sichtbarer Schuss-Output (hellere Tracer, staerkeres Muzzle-Flash-Licht, klarere Impact-Funken)
- Zombie-Typen (Normal/Runner/Brute) mit Wave-abhängiger Verteilung
- Upgrade-Auswahl zwischen Wellen, Combo-/Streak-Score, Heal-/Ammo-Drops
- komplettes Screen-Menuesystem (Hauptmenue, Einstellungen, Highscores, Pause, Game Over)
- Post-Processing Pipeline (SSAO, Vignette, FXAA) mit Fallback auf direkten Renderer
- helleres Tageslicht-Tuning (Exposure/Fog/Light-Rig/Material-Balance) fuer bessere Lesbarkeit von Strassen und Umgebung
- modulares Gameplay-Setup (`src/game-config.js`, `src/game-logic.js`, `src/progression.js`, `src/debug-overlay.js`)
- persistente Meta-Progression (Meta-Punkte + dauerhafte Weapon-Unlocks ueber localStorage)
- Debug-Telemetrie-Overlay (F3: FPS, Drawcalls, Effekte, Physik-Objekte, Pool-Stats)

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
- `vendor/postprocessing/*.js` (EffectComposer + Shader/Pässe)
- `vendor/textures/tex_*.js` (ambientcg 1K Base64-Textursets)

## Loader-Verhalten

`src/runtime-loader.js` erwartet offizielle Three.js/Ammo.js Runtimes und startet erst dann `src/game.js`.
Wenn etwas fehlt oder inkompatibel ist, erscheint eine klare Fehlermeldung im Overlay.
Bei `file://` wird `vendor/ammo.wasm.binary.js` geladen, damit Ammo ohne blockierte XHR-WASM-Requests starten kann.

## Start

1. `index.html` im Browser oeffnen
2. im Hauptmenue `SPIELEN` klicken oder `Enter` druecken

## Steuerung

- `WASD`: bewegen
- `Shift`: sprinten
- `Maus`: zielen
- `Linksklick halten`: feuern
- `R`: nachladen
- `1/2/3` oder Mausrad: Waffen wechseln
- `ESC`: Pausemenue oeffnen/schliessen
- `F3`: Debug-Overlay ein/aus

## Hinweis

Das Spiel laeuft ohne Build-Prozess und ohne lokalen Webserver.

## Single-File Build (Weitergabe)

```bash
./scripts/build-single-file.sh
```

Ergebnis:

- `dist/index.html` (self-contained, per Doppelklick startbar)

Optional als ZIP:

```bash
./scripts/package.sh
```

## QA-Standard im Projekt

Nach groesseren Gameplay-/Grafikaenderungen wird standardmaessig geprueft:

1. Starttest (`index.html` oeffnen, `Enter` pruefen)
2. kurzer Laufzeittest (ca. 5s) auf Grafikfehler (Flackern/Startfehler) mit Browser-Automation
3. Logiktests: `./scripts/run-logic-tests.sh`
4. Single-File-Check: `./scripts/build-single-file.sh`
