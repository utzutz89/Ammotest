(async function () {
  try {
    const AmmoLib = window.__AMMO_RUNTIME__
      || (window.__AMMO_RUNTIME_PROMISE__ ? await window.__AMMO_RUNTIME_PROMISE__ : null)
      || (typeof Ammo === 'function' ? await Ammo() : null);
    if (!AmmoLib) throw new Error('Ammo runtime is not available.');
    if (!window.THREE || typeof THREE.WebGLRenderer !== 'function' || typeof THREE.MeshStandardMaterial !== 'function') {
      throw new Error('Official Three.js runtime is required.');
    }
    if (typeof AmmoLib.btDefaultCollisionConfiguration !== 'function') {
      throw new Error('Official Ammo.js runtime is required.');
    }

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', precision: 'highp' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('physicallyCorrectLights' in renderer) renderer.physicallyCorrectLights = true;
    if ('outputEncoding' in renderer && THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    if ('toneMapping' in renderer && THREE.ACESFilmicToneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.38;
    }
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9cb7d1);
    scene.fog = new THREE.Fog(0x9cb7d1, 48, 230);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.35, 360);
    const cameraAnchor = new THREE.Vector3(0, 0, 0);
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    const cameraDesired = new THREE.Vector3(0, 0, 0);
    const projectedScoreVector = new THREE.Vector3(0, 0, 0);

    const physics = initPhysics(AmmoLib);
    const physicsWorld = physics.world;
    const tmpTransform = new AmmoLib.btTransform();
    const tmpVelocity = new AmmoLib.btVector3(0, 0, 0);
    const tmpZombieToPlayer = new THREE.Vector3();
    const tmpZombieDesiredDir = new THREE.Vector3();
    const tmpRadialDelta = new THREE.Vector3();
    const tmpRadialProcessedBodies = new Set();
    const DECAL_FORWARD = new THREE.Vector3(0, 0, 1);
    const DECAL_RAY_DOWN = new THREE.Vector3(0, -1, 0);
    const tmpDecalRayOrigin = new THREE.Vector3();
    const tmpDecalNormal = new THREE.Vector3();

    const raycaster = new THREE.Raycaster();
    const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.15);
    const aimPoint = new THREE.Vector3();
    const runtimeConfig = (window.AmmoGameConfig && window.AmmoGameConfig.CONFIG) || {};
    const gameLogic = window.AmmoGameLogic || {};
    const goreConfig = runtimeConfig.gore || {};
    const progression = window.AmmoProgression
      ? window.AmmoProgression.createManager(runtimeConfig.progression || {})
      : null;
    const debugOverlay = window.AmmoDebugOverlay ? window.AmmoDebugOverlay.createOverlay() : null;
    const effectMeshPool = gameLogic.createMeshPool ? gameLogic.createMeshPool() : null;

    const state = {
      running: false,
      paused: false,
      upgradeMode: false,
      keys: {},
      mouseNdc: new THREE.Vector2(0, 0),
      rawMouseNdc: new THREE.Vector2(0, 0),
      mouseDown: false,
      aimDirection: new THREE.Vector3(0, 0, 1),
      maxHealth: 100,
      health: 100,
      armor: 0,
      maxArmor: 100,
      score: 0,
      highScore: Math.max(0, Number(window.localStorage.getItem('ammotest_highscore') || 0)),
      wave: 1,
      level: 1,
      xp: 0,
      nextLevelXp: 100,
      perkPoints: 0,
      totalKills: 0,
      runTimeSec: 0,
      runStartedAtMs: 0,
      weaponKey: 'pistol',
      reloadDelayMs: 1050,
      damageMul: 1,
      moveSpeedMul: 1,
      fireRateMul: 1,
      reloading: false,
      lastShotMs: 0,
      comboMultiplier: 1,
      comboTimer: 0,
      comboPulse: 0,
      lastKillMs: 0,
      killStreak: 0,
      spreeText: '',
      spreeTimer: 0,
      shakePower: 0,
      hitFlash: 0,
      canStartNextWave: false,
      waveInProgress: true,
      waveSpawnRemaining: 0,
      waveSpawnCursor: 0,
      waveSpawnAmount: 0,
      dropChanceMul: 1,
      ammoGainMul: 1,
      critChance: 0,
      critMul: 1.7,
      bruteDamageMul: 1,
      destructibleDamageMul: 1,
      ammoRefundChance: 0,
      director: {
        intensity: 0.34,
        spawnTimer: 0,
        status: 'Stabil'
      },
      objective: {
        active: null,
        completed: false,
        progress: 0,
        rewardGiven: false
      },
      perks: {
        executioner: false,
        juggernaut: false,
        scavenger: false,
        gunslinger: false,
        skill_adrenaline: false,
        skill_shockwave: false
      },
      skills: {
        adrenaline: { unlocked: false, cooldown: 0, cooldownMax: 20, active: 0, duration: 6 },
        shockwave: { unlocked: false, cooldown: 0, cooldownMax: 14, active: 0, duration: 0 }
      },
      settings: {
        sensitivity: 1.0,
        quality: 'medium'
      },
      weapons: {
        pistol: { unlocked: true, ammo: 12, reserve: 48 },
        shotgun: { unlocked: false, ammo: 0, reserve: 0 },
        smg: { unlocked: false, ammo: 0, reserve: 0 },
        rifle: { unlocked: false, ammo: 0, reserve: 0 },
        revolver: { unlocked: false, ammo: 0, reserve: 0 }
      }
    };

    const weaponDefs = createWeaponDefs(runtimeConfig.weapons);
    const zombieTypeDefs = (runtimeConfig.zombies && runtimeConfig.zombies.types) || {
      normal: { hpMul: 1.0, speedMul: 1.0, damageMul: 1.0, scale: 1.0, score: 130 },
      brute: { hpMul: 2.8, speedMul: 0.6, damageMul: 2.2, scale: 1.5, score: 350 },
      runner: { hpMul: 0.5, speedMul: 2.2, damageMul: 0.7, scale: 0.75, score: 80 }
    };
    syncWeaponStateWithDefs();

    const hud = {
      health: document.getElementById('health'),
      armor: document.getElementById('armor'),
      score: document.getElementById('score'),
      highscore: document.getElementById('highscore'),
      wave: document.getElementById('wave'),
      level: document.getElementById('level'),
      xp: document.getElementById('xp'),
      weapon: document.getElementById('weapon'),
      ammo: document.getElementById('ammo'),
      reserve: document.getElementById('reserve'),
      skills: document.getElementById('skills'),
      modsStatus: document.getElementById('mods-status'),
      directorStatus: document.getElementById('director-status'),
      objectiveStatus: document.getElementById('objective-status'),
      combo: document.getElementById('combo'),
      hitFlash: document.getElementById('hit-flash'),
      floatingLayer: document.getElementById('floating-score-layer'),
      overlay: document.getElementById('overlay'),
      hudRoot: document.getElementById('hud'),
      screens: {
        main: document.getElementById('screen-main'),
        settings: document.getElementById('screen-settings'),
        highscores: document.getElementById('screen-highscores'),
        pause: document.getElementById('screen-pause'),
        gameover: document.getElementById('screen-gameover'),
        upgrade: document.getElementById('screen-upgrade'),
        error: document.getElementById('screen-error')
      },
      screenNodes: Array.from(document.querySelectorAll('.menu-screen')),
      mainLastRun: document.getElementById('main-last-run'),
      settingSensitivity: document.getElementById('setting-sensitivity'),
      settingSensitivityValue: document.getElementById('setting-sensitivity-value'),
      qualityButtons: Array.from(document.querySelectorAll('.quality-btn')),
      highscoresList: document.getElementById('highscores-list'),
      pauseScore: document.getElementById('pause-score'),
      pauseWave: document.getElementById('pause-wave'),
      goScore: document.getElementById('go-score'),
      goWave: document.getElementById('go-wave'),
      goKills: document.getElementById('go-kills'),
      goTime: document.getElementById('go-time'),
      goNewHighscore: document.getElementById('go-new-highscore'),
      upgradeTitle: document.getElementById('upgrade-title'),
      upgradeOptions: document.getElementById('upgrade-options'),
      errorMessage: document.getElementById('error-message')
    };
    const menuState = { current: 'main' };
    const storageKeys = {
      highscore: 'ammotest_highscore',
      highscores: 'ammotest_highscores',
      settings: 'ammotest_settings',
      lastRun: 'ammotest_last_run'
    };

    const ARENA_HALF = 86;
    const dynamicObjects = [];
    const zombies = [];
    const deadZombies = [];
    const effects = [];
    const decals = [];
    const crates = [];
    const destructibles = [];
    const debris = [];
    const zombieDeathEvents = [];
    const splatterSurfaces = [];
    const WORLD_UP = new THREE.Vector3(0, 1, 0);
    const transientLights = [];
    const streetLampLights = [];
    const LAMP_SHADOW_LIMIT = 4;
    let streetLampShadowCount = 0;
    const weaponPickups = [];
    const itemDrops = [];
    const floatingScores = [];
    const crateSpawnPoints = [];
    const buildingFootprints = [];
    const laneSpawnPoints = [
      new THREE.Vector3(-52, 1.1, -6),
      new THREE.Vector3(-52, 1.1, 18),
      new THREE.Vector3(52, 1.1, -18),
      new THREE.Vector3(52, 1.1, 7),
      new THREE.Vector3(-8, 1.1, 52),
      new THREE.Vector3(18, 1.1, 52),
      new THREE.Vector3(-20, 1.1, -52),
      new THREE.Vector3(10, 1.1, -52)
    ];
    const limits = {
      effects: Number(runtimeConfig.limits && runtimeConfig.limits.effects) || 360,
      debris: Number(runtimeConfig.limits && runtimeConfig.limits.debris) || 120,
      transientLights: 16
    };
    const perfState = {
      lowPerf: false,
      avgDt: 1 / 60,
      pressureTime: 0,
      effectScale: 1
    };
    let clock = null;

    const textures = createProceduralTextures(renderer, THREE);
    const materials = createMaterials(textures);
    const postfx = initPostProcessing();
    const muzzleFlashMaterial = createMuzzleFlashMaterial();

    const lightRig = setupLighting(scene);
    buildArena();
    const player = createPlayer();
    if (progression) {
      progression.load();
      progression.applyToState(state);
      syncWeaponStateWithDefs();
    }
    spawnWave(state.wave);
    loadSettings();
    initMenu();
    updateHud();

    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', (event) => {
      if (event.button === 0 && state.running) state.mouseDown = true;
    });
    window.addEventListener('mouseup', () => { state.mouseDown = false; });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('contextmenu', (event) => event.preventDefault());

    clock = new THREE.Clock();
    requestAnimationFrame(loop);

    function loop() {
      const dt = Math.min(clock.getDelta(), 0.033);

      if (state.running) {
        state.runTimeSec += dt;
        updatePerformanceMode(dt);
        updateSkills(dt);
        updatePlayer(dt);
        updateZombies(dt);
        updateObjective(dt);
        updateDirector(dt);
        physicsWorld.stepSimulation(dt, perfState.lowPerf ? 5 : 8);
        syncDynamicObjects();
        updateEffects(dt);
        updateDecals(dt);
        updateDebris(dt);
        updateCorpseBodies(dt);
        updateZombieDeathEvents(dt);
        updateHeavyImpactBursts(dt);
        updateWeaponPickups(dt);
        updateItemDrops(dt);
        updateFloatingScores(dt);
        updateComboAndStreak(dt);
        updatePlayerFeedback(dt);
        updateTransientLights(dt);
        checkProgress();
        updateCamera(dt);
        updateHud();
      } else {
        if (menuState.current === 'main' || menuState.current === 'settings' || menuState.current === 'highscores') {
          updateIdleCamera();
        }
        updateFloatingScores(dt);
        updatePerformanceMode(dt);
      }

      if (postfx && postfx.composer) {
        postfx.composer.render();
      } else {
        renderer.render(scene, camera);
      }
      if (debugOverlay) {
        const poolStats = effectMeshPool && effectMeshPool.stats ? effectMeshPool.stats() : null;
        debugOverlay.update({
          fps: dt > 0 ? 1 / dt : 0,
          zombies: zombies.length,
          effects: effects.length,
          effectLimit: limits.effects,
          decals: decals.length,
          debris: debris.length,
          debrisLimit: limits.debris,
          drawCalls: renderer.info && renderer.info.render ? renderer.info.render.calls : 0,
          physicsBodies: dynamicObjects.length,
          lowPerf: perfState.lowPerf,
          cachedMeshes: poolStats ? poolStats.cachedMeshes : undefined
        }, dt);
      }
      requestAnimationFrame(loop);
    }

    function createWeaponDefs(configWeapons) {
      const fallback = {
        pistol: { label: 'Pistole', damage: 34, cooldown: 92, magazine: 12, spreadDeg: 0, pellets: 1, maxDistance: 60, tracerLife: 0.035, muzzleOffset: [0, 0.08, 0.9] },
        shotgun: { label: 'Shotgun', damage: 18, cooldown: 680, magazine: 6, spreadDeg: 18, pellets: 6, maxDistance: 18, tracerLife: 0.03, muzzleOffset: [0, 0.12, 1.32] },
        smg: { label: 'SMG', damage: 18, cooldown: 55, magazine: 32, spreadDeg: 4, pellets: 1, maxDistance: 60, tracerLife: 0.035, muzzleOffset: [0, 0.07, 0.95] },
        rifle: { label: 'Sturmgewehr', damage: 27, cooldown: 98, magazine: 28, spreadDeg: 2.2, pellets: 1, maxDistance: 68, tracerLife: 0.04, muzzleOffset: [0, 0.08, 1.05] },
        revolver: { label: 'Revolver', damage: 64, cooldown: 320, magazine: 6, spreadDeg: 1.5, pellets: 1, maxDistance: 70, tracerLife: 0.045, muzzleOffset: [0, 0.08, 0.86] }
      };
      const source = (configWeapons && typeof configWeapons === 'object') ? configWeapons : fallback;
      const keys = ['pistol', 'shotgun', 'smg', 'rifle', 'revolver'];
      const defs = {};
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const row = source[key] || fallback[key];
        const muzzle = Array.isArray(row.muzzleOffset) ? row.muzzleOffset : fallback[key].muzzleOffset;
        defs[key] = {
          label: row.label || fallback[key].label,
          damage: Number(row.damage) || fallback[key].damage,
          cooldown: Number(row.cooldown) || fallback[key].cooldown,
          magazine: Number(row.magazine) || fallback[key].magazine,
          spreadDeg: Number(row.spreadDeg) || fallback[key].spreadDeg,
          pellets: Number(row.pellets) || fallback[key].pellets,
          maxDistance: Number(row.maxDistance) || fallback[key].maxDistance,
          tracerLife: Number(row.tracerLife) || fallback[key].tracerLife,
          muzzleOffset: new THREE.Vector3(Number(muzzle[0]) || 0, Number(muzzle[1]) || 0, Number(muzzle[2]) || 0)
        };
      }
      return defs;
    }

    function syncWeaponStateWithDefs() {
      const keys = Object.keys(weaponDefs);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!state.weapons[key]) state.weapons[key] = { unlocked: false, ammo: 0, reserve: 0 };
        const weaponState = state.weapons[key];
        const def = weaponDefs[key];
        const defaultUnlocked = !!(runtimeConfig.weapons && runtimeConfig.weapons[key] && runtimeConfig.weapons[key].defaultUnlocked);
        weaponState.unlocked = !!weaponState.unlocked || defaultUnlocked || key === 'pistol';
        if (weaponState.ammo <= 0 && (weaponState.unlocked || key === 'pistol')) {
          weaponState.ammo = def.magazine;
        }
        if (weaponState.reserve <= 0 && (weaponState.unlocked || key === 'pistol')) {
          const reserveMags = Number(runtimeConfig.weapons && runtimeConfig.weapons[key] && runtimeConfig.weapons[key].defaultReserveMagazines) || (key === 'pistol' ? 4 : 3);
          weaponState.reserve = def.magazine * reserveMags;
        }
      }
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (postfx && postfx.composer) {
        postfx.composer.setSize(window.innerWidth, window.innerHeight);
        if (postfx.ssaoPass && typeof postfx.ssaoPass.setSize === 'function') {
          const ssaoScale = postfx.ssaoScale || 0.8;
          postfx.ssaoPass.setSize(Math.floor(window.innerWidth * ssaoScale), Math.floor(window.innerHeight * ssaoScale));
        }
        if (postfx.fxaaPass && postfx.fxaaPass.material && postfx.fxaaPass.material.uniforms && postfx.fxaaPass.material.uniforms.resolution) {
          postfx.fxaaPass.material.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight);
        }
      }
    }

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (key === 'f3') {
        if (debugOverlay) debugOverlay.toggle();
        return;
      }
      state.keys[key] = true;
      if (key === 'escape') {
        if (state.running) {
          pauseGame();
        } else if (menuState.current === 'pause') {
          resumeGame();
        }
        return;
      }

      if (!state.running && !state.upgradeMode && key === 'enter' && menuState.current === 'main') {
        startNewRun();
        return;
      }

      if (!state.running) return;
      if (key === 'r') reload();
      if (key === '1') switchWeapon('pistol');
      if (key === '2') switchWeapon('shotgun');
      if (key === '3') switchWeapon('smg');
      if (key === '4') switchWeapon('rifle');
      if (key === '5') switchWeapon('revolver');
      if (key === 'q') tryUseSkill('adrenaline');
      if (key === 'e') tryUseSkill('shockwave');
    }

    function onKeyUp(event) {
      state.keys[event.key.toLowerCase()] = false;
    }

    function onMouseMove(event) {
      state.rawMouseNdc.x = (event.clientX / window.innerWidth) * 2 - 1;
      state.rawMouseNdc.y = -(event.clientY / window.innerHeight) * 2 + 1;
      const sensitivity = state.settings.sensitivity || 1;
      state.mouseNdc.x = THREE.MathUtils.clamp(state.rawMouseNdc.x * sensitivity, -1, 1);
      state.mouseNdc.y = THREE.MathUtils.clamp(state.rawMouseNdc.y * sensitivity, -1, 1);
    }

    function onWheel(event) {
      if (!state.running) return;
      const order = ['pistol', 'shotgun', 'smg', 'rifle', 'revolver'];
      const currentIndex = order.indexOf(state.weaponKey);
      const direction = event.deltaY > 0 ? 1 : -1;
      for (let i = 1; i <= order.length; i++) {
        const idx = (currentIndex + direction * i + order.length) % order.length;
        const key = order[idx];
        if (state.weapons[key].unlocked) {
          switchWeapon(key);
          break;
        }
      }
    }

    function updateIdleCamera() {
      const t = performance.now() * 0.0002;
      camera.position.set(Math.cos(t) * 28, 36, Math.sin(t) * 28);
      camera.lookAt(0, 1.2, 0);
    }

    function updateCamera(dt) {
      cameraTarget.copy(player.root.position);
      const desired = cameraDesired.set(cameraTarget.x, 45, cameraTarget.z + 28);
      if (state.shakePower > 0.001) {
        desired.x += THREE.MathUtils.randFloatSpread(state.shakePower);
        desired.y += THREE.MathUtils.randFloatSpread(state.shakePower * 0.6);
        desired.z += THREE.MathUtils.randFloatSpread(state.shakePower);
      }
      cameraAnchor.lerp(desired, 1 - Math.exp(-dt * 7));
      camera.position.copy(cameraAnchor);
      camera.lookAt(cameraTarget.x, 1.2, cameraTarget.z);

      lightRig.sun.target.updateMatrixWorld();
    }

    function setupLighting(sceneRef) {
      const hemi = new THREE.HemisphereLight(0xcfe2f7, 0x2f2a22, 0.9);
      sceneRef.add(hemi);

      const sun = new THREE.DirectionalLight(0xfff5e1, 3.1);
      sun.position.set(44, 70, 24);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1536, 1536);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 260;
      sun.shadow.camera.left = -84;
      sun.shadow.camera.right = 84;
      sun.shadow.camera.top = 84;
      sun.shadow.camera.bottom = -84;
      sun.shadow.bias = -0.0001;
      sun.shadow.normalBias = 0.04;
      sun.shadow.radius = 1.6;
      sceneRef.add(sun);
      sceneRef.add(sun.target);

      const fill = new THREE.PointLight(0x9ec2ff, 1.45, 240, 2);
      fill.position.set(-36, 34, -26);
      sceneRef.add(fill);

      const warmBack = new THREE.PointLight(0xffc995, 0.7, 170, 2);
      warmBack.position.set(34, 20, 44);
      sceneRef.add(warmBack);

      const ambientBoost = new THREE.AmbientLight(0xf7fbff, 0.26);
      sceneRef.add(ambientBoost);

      return { sun, ambientBoost };
    }

    function initPostProcessing() {
      if (
        !THREE.Pass ||
        !THREE.EffectComposer ||
        !THREE.RenderPass ||
        !THREE.SSAOPass ||
        !THREE.ShaderPass ||
        !THREE.SSAOShader ||
        !THREE.SimplexNoise ||
        !THREE.FXAAShader ||
        !THREE.VignetteShader
      ) {
        console.warn('[postfx] EffectComposer-Pipeline nicht vollständig verfügbar, fallback auf renderer.render');
        return null;
      }

      const composer = new THREE.EffectComposer(renderer);
      const renderPass = new THREE.RenderPass(scene, camera);
      composer.addPass(renderPass);

      const ssaoScale = 0.7;
      const ssaoPass = new THREE.SSAOPass(
        scene,
        camera,
        Math.floor(window.innerWidth * ssaoScale),
        Math.floor(window.innerHeight * ssaoScale)
      );
      ssaoPass.kernelRadius = 0.18;
      ssaoPass.minDistance = 0.002;
      ssaoPass.maxDistance = 0.06;
      composer.addPass(ssaoPass);

      const vignettePass = new THREE.ShaderPass(THREE.VignetteShader);
      if (vignettePass.uniforms.offset) vignettePass.uniforms.offset.value = 0.9;
      if (vignettePass.uniforms.darkness) vignettePass.uniforms.darkness.value = 0.22;
      composer.addPass(vignettePass);

      const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
      if (fxaaPass.material && fxaaPass.material.uniforms && fxaaPass.material.uniforms.resolution) {
        fxaaPass.material.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight);
      }
      composer.addPass(fxaaPass);

      return { composer, ssaoPass, fxaaPass, ssaoScale };
    }

    function spawnTransientPointLight(color, intensity, distance, position, duration) {
      if (transientLights.length >= limits.transientLights) {
        const oldest = transientLights.shift();
        if (oldest && oldest.light) scene.remove(oldest.light);
      }
      const light = new THREE.PointLight(color, intensity, distance, 2);
      light.position.copy(position);
      scene.add(light);
      transientLights.push({
        light,
        life: duration,
        totalLife: duration,
        baseIntensity: intensity
      });
    }

    function updateTransientLights(dt) {
      for (let i = transientLights.length - 1; i >= 0; i--) {
        const item = transientLights[i];
        item.life -= dt;
        const t = Math.max(0, item.life / item.totalLife);
        item.light.intensity = item.baseIntensity * t;
        if (item.life <= 0) {
          scene.remove(item.light);
          transientLights.splice(i, 1);
        }
      }
    }

    function updatePerformanceMode(dt) {
      perfState.avgDt = perfState.avgDt * 0.92 + dt * 0.08;
      if (!perfState.lowPerf) {
        if (perfState.avgDt > 1 / 42) {
          perfState.pressureTime += dt;
          if (perfState.pressureTime > 1.5) {
            perfState.lowPerf = true;
            applyLowPerformanceProfile();
          }
        } else {
          perfState.pressureTime = Math.max(0, perfState.pressureTime - dt * 0.5);
        }
      }

      if (gameLogic.computeAdaptiveLimits) {
        const adaptive = gameLogic.computeAdaptiveLimits({
          avgDt: perfState.avgDt,
          lowPerf: perfState.lowPerf,
          baseEffects: Number(runtimeConfig.limits && runtimeConfig.limits.effects) || 360,
          baseDebris: Number(runtimeConfig.limits && runtimeConfig.limits.debris) || 120,
          minEffects: Number(runtimeConfig.limits && runtimeConfig.limits.adaptive && runtimeConfig.limits.adaptive.minEffects) || 180,
          minDebris: Number(runtimeConfig.limits && runtimeConfig.limits.adaptive && runtimeConfig.limits.adaptive.minDebris) || 70,
          activeEffects: effects.length
        });
        limits.effects = adaptive.effects;
        limits.debris = adaptive.debris;
        perfState.effectScale = adaptive.effectScale;
      }
    }

    function applyLowPerformanceProfile() {
      renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), 1));
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (postfx && postfx.ssaoPass) {
        postfx.ssaoPass.enabled = false;
      }
      lightRig.sun.castShadow = false;
      for (let i = 0; i < streetLampLights.length; i++) {
        const lamp = streetLampLights[i];
        lamp.castShadow = false;
      }
      console.warn('[perf] Low-Performance-Profil aktiviert (SSAO/Lampen-Schatten reduziert).');
    }

    function scaleEffectCount(count, minCount) {
      const floor = minCount || 1;
      const pressure = effects.length / Math.max(1, limits.effects);
      let scale = perfState.effectScale || 1;
      if (perfState.lowPerf) {
        scale = Math.min(scale, 0.55);
      } else if (pressure > 0.85) {
        scale = Math.min(scale, 0.68);
      } else if (pressure > 0.65) {
        scale = Math.min(scale, 0.82);
      }
      return Math.max(floor, Math.round(count * scale));
    }

    function createLampHaloSprite() {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
      gradient.addColorStop(0, 'rgba(255, 216, 160, 0.95)');
      gradient.addColorStop(0.4, 'rgba(255, 198, 120, 0.32)');
      gradient.addColorStop(1, 'rgba(255, 170, 80, 0.0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      return new THREE.Sprite(material);
    }

    function buildArena() {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2, 1, 1),
        materials.ground
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      registerSplatterSurface(ground);

      addStaticBox(ARENA_HALF * 2, 2, ARENA_HALF * 2, 0, -1, 0, materials.groundCollider, false);

      buildRoadNetwork();

      const wallHeight = 8;
      const wallThickness = 2;
      addStaticBox(ARENA_HALF * 2 + wallThickness * 2, wallHeight, wallThickness, 0, wallHeight * 0.5, -ARENA_HALF - wallThickness * 0.5, materials.wall);
      addStaticBox(ARENA_HALF * 2 + wallThickness * 2, wallHeight, wallThickness, 0, wallHeight * 0.5, ARENA_HALF + wallThickness * 0.5, materials.wall);
      addStaticBox(wallThickness, wallHeight, ARENA_HALF * 2, -ARENA_HALF - wallThickness * 0.5, wallHeight * 0.5, 0, materials.wall);
      addStaticBox(wallThickness, wallHeight, ARENA_HALF * 2, ARENA_HALF + wallThickness * 0.5, wallHeight * 0.5, 0, materials.wall);

      buildCityBlocks();
      buildIndustrialSector();
      buildMapLandmarks();

      const obstacleCount = 42;
      for (let index = 0; index < obstacleCount; index++) {
        const width = 2 + Math.random() * 2.8;
        const height = 1.4 + Math.random() * 2.6;
        const depth = 2 + Math.random() * 2.8;
        const x = THREE.MathUtils.randFloatSpread((ARENA_HALF - 12) * 2);
        const z = THREE.MathUtils.randFloatSpread((ARENA_HALF - 12) * 2);

        if (Math.hypot(x, z) < 20) continue;
        if (Math.abs(x) < 8 || Math.abs(z) < 8) continue;
        if (isInReservedLot(x, z, 2.4)) continue;

        const roll = Math.random();
        if (roll < 0.45) {
          createBreakableCrate(width, height, depth, x, z);
        } else if (roll < 0.8) {
          createDestructibleBlock({
            type: 'rock',
            width,
            height,
            depth,
            x,
            z,
            hp: 70 + Math.random() * 25,
            mass: 0,
            material: materials.rock,
            fragmentMin: 4,
            fragmentMax: 7
          });
        } else {
          const blockHeight = Math.max(1.6, height * 0.9);
          createDestructibleBlock({
            type: 'concrete',
            width: width * 1.2,
            height: blockHeight,
            depth: depth * 0.9,
            x,
            z,
            hp: 82 + Math.random() * 30,
            mass: 0,
            material: materials.concreteBlock,
            fragmentMin: 5,
            fragmentMax: 8
          });
        }
      }

      addWreckedCar(-26, -16, 0.28);
      addWreckedCar(22, 24, -0.44);
      addWreckedCar(34, -28, 0.9);

      addStreetLamp(-46, -8);
      addStreetLamp(-46, 26);
      addStreetLamp(48, -22);
      addStreetLamp(48, 14);

      spawnWeaponPickups();
    }

    function buildCityBlocks() {
      const lots = [
        { x: -66, z: -58, width: 14, depth: 16, height: 22, rotationY: 0.08 },
        { x: -42, z: -62, width: 12, depth: 14, height: 18, rotationY: -0.06 },
        { x: 52, z: -61, width: 16, depth: 15, height: 24, rotationY: 0.05 },
        { x: 67, z: -42, width: 13, depth: 12, height: 17, rotationY: -0.12 },
        { x: 64, z: 56, width: 15, depth: 17, height: 23, rotationY: -0.05 },
        { x: 38, z: 62, width: 12, depth: 13, height: 16, rotationY: 0.09 },
        { x: -54, z: 63, width: 17, depth: 15, height: 21, rotationY: 0.04 },
        { x: -68, z: 36, width: 12, depth: 12, height: 15, rotationY: -0.1 }
      ];

      for (let i = 0; i < lots.length; i++) {
        createBuildingBlock(lots[i]);
      }
    }

    function buildIndustrialSector() {
      reserveBuildingLot(-60, -8, 26, 22);

      const yard = new THREE.Mesh(new THREE.PlaneGeometry(22, 18), materials.concreteBlock);
      yard.rotation.x = -Math.PI / 2;
      yard.position.set(-60, 0.06, -8);
      yard.receiveShadow = true;
      scene.add(yard);
      registerSplatterSurface(yard);

      addStaticBox(22.5, 1.2, 0.6, -60, 0.6, -17.4, materials.wall);
      addStaticBox(22.5, 1.2, 0.6, -60, 0.6, 1.4, materials.wall);
      addStaticBox(0.6, 1.2, 18.4, -71.2, 0.6, -8, materials.wall);

      createDestructibleBlock({
        type: 'concrete',
        width: 3.8,
        height: 2.0,
        depth: 2.2,
        x: -64,
        z: -4,
        hp: 108,
        mass: 0,
        material: materials.concreteBlock,
        fragmentMin: 6,
        fragmentMax: 10
      });

      createDestructibleBlock({
        type: 'rock',
        width: 3.2,
        height: 2.4,
        depth: 2.6,
        x: -54,
        z: -12,
        hp: 94,
        mass: 0,
        material: materials.rock,
        fragmentMin: 5,
        fragmentMax: 9
      });

      createExplosiveBarrel(-58, -8);
      createExplosiveBarrel(-62, -11);
      createExplosiveBarrel(-56, -13);
      createBreakableCrate(2.1, 1.7, 2.3, -63, -14);
      createBreakableCrate(2.4, 1.9, 2.1, -55, -5);
    }

    function buildMapLandmarks() {
      buildFuelStationPOI();
      buildDepotPOI();
      buildParkPOI();
    }

    function buildFuelStationPOI() {
      reserveBuildingLot(58, 8, 20, 18);

      const forecourt = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), materials.concreteBlock);
      forecourt.rotation.x = -Math.PI / 2;
      forecourt.position.set(58, 0.06, 8);
      forecourt.receiveShadow = true;
      scene.add(forecourt);
      registerSplatterSurface(forecourt);

      addStaticBox(14, 0.55, 0.7, 58, 0.28, 14.2, materials.wall);
      addStaticBox(0.7, 0.55, 10.5, 50.8, 0.28, 9, materials.wall);
      addStaticBox(0.7, 0.55, 10.5, 65.2, 0.28, 9, materials.wall);
      addStaticBox(7.6, 0.5, 7.4, 58, 3.1, 8, materials.buildingRoof);

      addStaticBox(4.4, 2.9, 3.8, 52.8, 1.45, 8.2, materials.buildingFacade);
      addStaticBox(4.2, 2.9, 3.5, 63.2, 1.45, 8.4, materials.buildingFacade);

      createExplosiveBarrel(58, 5.7);
      createExplosiveBarrel(56.2, 9.9);
      createExplosiveBarrel(60.1, 10.4);
      createBreakableCrate(1.9, 1.6, 1.9, 54.8, 5.2);
      createBreakableCrate(2.0, 1.7, 2.0, 61.8, 5.3);
    }

    function buildDepotPOI() {
      reserveBuildingLot(10, -60, 24, 20);

      addStaticBox(16.4, 2.8, 4.8, 10, 1.4, -66, materials.buildingFacade);
      addStaticBox(16.4, 0.6, 4.8, 10, 3.3, -66, materials.buildingRoof);

      addStaticBox(0.7, 1.1, 16, 1.4, 0.55, -60, materials.wall);
      addStaticBox(0.7, 1.1, 16, 18.6, 0.55, -60, materials.wall);
      addStaticBox(17.8, 1.1, 0.7, 10, 0.55, -51.7, materials.wall);

      createDestructibleBlock({
        type: 'concrete',
        width: 3.6,
        height: 1.8,
        depth: 2.4,
        x: 6.4,
        z: -58,
        hp: 112,
        mass: 0,
        material: materials.concreteBlock,
        fragmentMin: 6,
        fragmentMax: 10
      });

      createDestructibleBlock({
        type: 'rock',
        width: 2.8,
        height: 2.2,
        depth: 2.6,
        x: 13.8,
        z: -57.5,
        hp: 98,
        mass: 0,
        material: materials.rock,
        fragmentMin: 5,
        fragmentMax: 9
      });

      createBreakableCrate(2.2, 1.8, 2.1, 9.8, -55.6);
      createBreakableCrate(2.1, 1.7, 2.0, 14.6, -62.2);
    }

    function buildParkPOI() {
      reserveBuildingLot(-10, 58, 24, 22);

      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), materials.grime);
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(-10, 0.07, 58);
      lawn.receiveShadow = true;
      scene.add(lawn);

      addStaticBox(0.7, 0.85, 14.8, -18.7, 0.43, 58, materials.wall);
      addStaticBox(0.7, 0.85, 14.8, -1.3, 0.43, 58, materials.wall);
      addStaticBox(17.8, 0.85, 0.7, -10, 0.43, 50.2, materials.wall);
      addStaticBox(17.8, 0.85, 0.7, -10, 0.43, 65.8, materials.wall);

      addStaticBox(5.8, 1.2, 1.8, -10, 0.6, 58, materials.sidewalk);
      addStaticBox(1.8, 1.2, 5.8, -10, 0.6, 58, materials.sidewalk);

      createDestructibleBlock({
        type: 'rock',
        width: 2.6,
        height: 2.0,
        depth: 2.6,
        x: -14.2,
        z: 54.2,
        hp: 88,
        mass: 0,
        material: materials.rock,
        fragmentMin: 4,
        fragmentMax: 8
      });

      createBreakableCrate(2.0, 1.6, 2.1, -5.8, 61.4);
      addStreetLamp(-15.4, 50.8);
      addStreetLamp(-4.8, 65.2);
    }

    function createExplosiveBarrel(x, z) {
      createDestructibleBlock({
        type: 'barrel',
        width: 1.0,
        height: 1.5,
        depth: 1.0,
        x,
        z,
        hp: 38,
        mass: 3.6,
        material: new THREE.MeshStandardMaterial({
          color: 0xa83232,
          roughness: 0.45,
          metalness: 0.62,
          emissive: 0x2f0909,
          emissiveIntensity: 0.45
        }),
        fragmentMin: 5,
        fragmentMax: 8
      });
    }

    function createBuildingBlock(config) {
      const width = config.width;
      const depth = config.depth;
      const height = config.height;
      const x = config.x;
      const z = config.z;

      reserveBuildingLot(x, z, width + 3.5, depth + 3.5);

      const root = new THREE.Group();
      root.position.set(x, height * 0.5, z);
      root.rotation.y = config.rotationY || 0;
      scene.add(root);

      const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.buildingFacade);
      body.castShadow = true;
      body.receiveShadow = true;
      root.add(body);
      registerSplatterSurface(body);

      const roofLip = new THREE.Mesh(new THREE.BoxGeometry(width + 0.8, 0.5, depth + 0.8), materials.buildingRoof);
      roofLip.position.y = height * 0.5 - 0.08;
      roofLip.castShadow = true;
      roofLip.receiveShadow = true;
      root.add(roofLip);
      registerSplatterSurface(roofLip);

      const cornerOffsets = [
        [-width * 0.5 + 0.25, 0, -depth * 0.5 + 0.25],
        [width * 0.5 - 0.25, 0, -depth * 0.5 + 0.25],
        [-width * 0.5 + 0.25, 0, depth * 0.5 - 0.25],
        [width * 0.5 - 0.25, 0, depth * 0.5 - 0.25]
      ];
      for (let i = 0; i < cornerOffsets.length; i++) {
        const [cx, cy, cz] = cornerOffsets[i];
        const column = new THREE.Mesh(new THREE.BoxGeometry(0.38, height, 0.38), materials.buildingTrim);
        column.position.set(cx, cy, cz);
        column.castShadow = true;
        column.receiveShadow = true;
        root.add(column);
      }

      addBuildingWindows(root, width, depth, height);

      const roofUnit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.6), materials.buildingTrim);
      roofUnit.position.set(0, height * 0.5 + 0.85, 0);
      roofUnit.castShadow = true;
      roofUnit.receiveShadow = true;
      root.add(roofUnit);
      registerSplatterSurface(roofUnit);

      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 10), materials.buildingRoof);
      tank.position.set(1.2, height * 0.5 + 1.25, -0.6);
      tank.castShadow = true;
      tank.receiveShadow = true;
      root.add(tank);
      registerSplatterSurface(tank);

      addStaticBox(width * 0.98, height, depth * 0.98, x, height * 0.5, z, materials.invisibleCollider, false);
    }

    function addBuildingWindows(root, width, depth, height) {
      const floorCount = Math.max(3, Math.floor((height - 4) / 3));
      const windowHeight = 1.18;
      const windowWidth = 0.95;
      const frontCols = Math.max(3, Math.floor((width - 2) / 2.05));
      const sideCols = Math.max(2, Math.floor((depth - 2) / 2.05));

      for (let row = 0; row < floorCount; row++) {
        const y = -height * 0.5 + 2.2 + row * 2.6;
        for (let col = 0; col < frontCols; col++) {
          const x = -width * 0.5 + 1.2 + col * ((width - 2.4) / Math.max(1, frontCols - 1));
          addWindowPanel(root, x, y, depth * 0.5 + 0.06, 0, windowWidth, windowHeight);
          addWindowPanel(root, x, y, -depth * 0.5 - 0.06, Math.PI, windowWidth, windowHeight);
        }
        for (let col = 0; col < sideCols; col++) {
          const z = -depth * 0.5 + 1.2 + col * ((depth - 2.4) / Math.max(1, sideCols - 1));
          addWindowPanel(root, width * 0.5 + 0.06, y, z, Math.PI * 0.5, windowWidth, windowHeight);
          addWindowPanel(root, -width * 0.5 - 0.06, y, z, -Math.PI * 0.5, windowWidth, windowHeight);
        }
      }
    }

    function addWindowPanel(parent, x, y, z, rotationY, width, height) {
      const lit = Math.random() < 0.38;
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 0.08),
        lit ? materials.buildingWindowLit : materials.buildingWindowDark
      );
      panel.position.set(x, y, z);
      panel.rotation.y = rotationY;
      panel.castShadow = false;
      panel.receiveShadow = true;
      parent.add(panel);
    }

    function reserveBuildingLot(x, z, width, depth) {
      buildingFootprints.push({
        minX: x - width * 0.5,
        maxX: x + width * 0.5,
        minZ: z - depth * 0.5,
        maxZ: z + depth * 0.5
      });
    }

    function isInReservedLot(x, z, margin) {
      const pad = margin || 0;
      for (let i = 0; i < buildingFootprints.length; i++) {
        const lot = buildingFootprints[i];
        if (
          x >= lot.minX - pad &&
          x <= lot.maxX + pad &&
          z >= lot.minZ - pad &&
          z <= lot.maxZ + pad
        ) {
          return true;
        }
      }
      return false;
    }

    function buildRoadNetwork() {
      const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(26, ARENA_HALF * 2), materials.road);
      mainRoad.rotation.x = -Math.PI / 2;
      mainRoad.position.y = 0.03;
      mainRoad.receiveShadow = true;
      scene.add(mainRoad);
      registerSplatterSurface(mainRoad);

      const sideRoad = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_HALF * 2, 22), materials.road);
      sideRoad.rotation.x = -Math.PI / 2;
      sideRoad.position.y = 0.032;
      sideRoad.receiveShadow = true;
      scene.add(sideRoad);
      registerSplatterSurface(sideRoad);

      for (let z = -72; z <= 72; z += 10) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 4.2), materials.lanePaint);
        stripe.position.set(0, 0.12, z);
        stripe.receiveShadow = true;
        scene.add(stripe);
      }

      for (let x = -72; x <= 72; x += 10) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 0.34), materials.lanePaint);
        stripe.position.set(x, 0.12, 0);
        stripe.receiveShadow = true;
        scene.add(stripe);
      }

      addStaticBox(5.2, 0.35, ARENA_HALF * 2, -15.5, 0.18, 0, materials.sidewalk);
      addStaticBox(5.2, 0.35, ARENA_HALF * 2, 15.5, 0.18, 0, materials.sidewalk);
      addStaticBox(ARENA_HALF * 2, 0.35, 5.2, 0, 0.18, -13.5, materials.sidewalk);
      addStaticBox(ARENA_HALF * 2, 0.35, 5.2, 0, 0.18, 13.5, materials.sidewalk);

      const grimeCount = 18;
      for (let i = 0; i < grimeCount; i++) {
        const stain = new THREE.Mesh(new THREE.PlaneGeometry(2.8 + Math.random() * 4.2, 2.8 + Math.random() * 4.2), materials.grime);
        stain.rotation.x = -Math.PI / 2;
        stain.rotation.z = Math.random() * Math.PI;
        stain.position.set(
          THREE.MathUtils.randFloatSpread(ARENA_HALF * 1.6),
          0.05,
          THREE.MathUtils.randFloatSpread(ARENA_HALF * 1.6)
        );
        scene.add(stain);
      }
    }

    function addWreckedCar(x, z, rotationY) {
      const car = new THREE.Group();
      car.position.set(x, 0.9, z);
      car.rotation.y = rotationY;
      scene.add(car);

      const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.2, 2.2), materials.carBody);
      body.castShadow = true;
      body.receiveShadow = true;
      car.add(body);
      registerSplatterSurface(body);

      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), materials.carRust);
      hood.position.set(2.8, 0.05, 0);
      hood.rotation.z = -0.16;
      hood.castShadow = true;
      hood.receiveShadow = true;
      car.add(hood);
      registerSplatterSurface(hood);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.9), materials.carWindow);
      cabin.position.set(-0.6, 0.75, 0);
      cabin.castShadow = true;
      car.add(cabin);
      registerSplatterSurface(cabin);

      const tireOffsets = [
        [1.5, -0.58, 1.06],
        [1.5, -0.58, -1.06],
        [-1.45, -0.58, 1.06],
        [-1.45, -0.58, -1.06]
      ];
      for (let i = 0; i < tireOffsets.length; i++) {
        const [tx, ty, tz] = tireOffsets[i];
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.34, 14), materials.tire);
        tire.rotation.z = Math.PI * 0.5;
        tire.position.set(tx, ty, tz);
        tire.castShadow = true;
        tire.receiveShadow = true;
        car.add(tire);
        registerSplatterSurface(tire);
      }

      addStaticBox(5.0, 1.3, 2.4, x, 0.95, z, materials.invisibleCollider, false);
    }

    function addStreetLamp(x, z) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 7.8, 12), materials.lampPole);
      pole.position.set(x, 3.9, z);
      pole.castShadow = true;
      pole.receiveShadow = true;
      scene.add(pole);
      registerSplatterSurface(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 0.16), materials.lampPole);
      arm.position.set(x + (x < 0 ? 0.8 : -0.8), 7.4, z);
      arm.castShadow = true;
      scene.add(arm);
      registerSplatterSurface(arm);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), materials.lampBulb);
      bulb.position.set(x + (x < 0 ? 1.55 : -1.55), 7.3, z);
      scene.add(bulb);

      const glow = new THREE.PointLight(0xffd59b, 0.58, 22, 2);
      glow.position.copy(bulb.position);
      const enableShadow = streetLampShadowCount < LAMP_SHADOW_LIMIT;
      glow.castShadow = enableShadow;
      if (enableShadow) {
        streetLampShadowCount += 1;
        glow.shadow.mapSize.set(256, 256);
        glow.shadow.camera.near = 0.4;
        glow.shadow.camera.far = 26;
      }
      scene.add(glow);
      streetLampLights.push(glow);

      const halo = createLampHaloSprite();
      halo.position.copy(bulb.position);
      halo.position.y += 0.02;
      halo.scale.set(4.4, 4.4, 1);
      scene.add(halo);

      addStaticBox(0.8, 8.0, 0.8, x, 4.0, z, materials.invisibleCollider, false);
    }

    function spawnWeaponPickups() {
      createWeaponPickup('shotgun', -34, 28, 0x7cc7ff);
      createWeaponPickup('smg', 30, -34, 0xffcc68);
      createWeaponPickup('rifle', 54, 24, 0x78ffa8);
      createWeaponPickup('revolver', -58, -20, 0xff8a8a);
    }

    function createWeaponPickup(weaponKey, x, z, color) {
      const group = new THREE.Group();
      group.position.set(x, 0.95, z);

      const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.22, 1.4),
        new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.9,
          roughness: 0.2,
          metalness: 0.8
        })
      );
      core.castShadow = true;
      core.receiveShadow = true;
      group.add(core);

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 10, 8),
        new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.25 })
      );
      group.add(halo);

      scene.add(group);
      weaponPickups.push({
        weaponKey,
        group,
        core,
        halo,
        life: Infinity
      });
    }

    function addStaticBox(width, height, depth, x, y, z, material, visible) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(x, y, z);
      const showMesh = visible !== false;
      mesh.visible = showMesh;
      mesh.castShadow = showMesh;
      mesh.receiveShadow = showMesh;
      scene.add(mesh);
      if (showMesh) registerSplatterSurface(mesh);

      const shape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(width * 0.5, height * 0.5, depth * 0.5));
      shape.setMargin(0.05);
      createRigidBody(mesh, shape, 0);
    }

    function createBreakableCrate(width, height, depth, x, z, recordSpawn) {
      if (recordSpawn !== false) {
        crateSpawnPoints.push({ width, height, depth, x, z });
      }
      return createDestructibleBlock({
        type: 'crate',
        width,
        height,
        depth,
        x,
        z,
        hp: 68 + Math.random() * 22,
        mass: 5.8 + Math.random() * 2.2,
        material: materials.breakableCrate.clone(),
        fragmentMin: 6,
        fragmentMax: 8
      });
    }

    function createDestructibleBlock(config) {
      const materialInstance = config.material && typeof config.material.clone === 'function'
        ? config.material.clone()
        : config.material;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(config.width, config.height, config.depth), materialInstance);
      mesh.position.set(config.x, config.height * 0.5, config.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      registerSplatterSurface(mesh);

      const shape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(config.width * 0.5, config.height * 0.5, config.depth * 0.5));
      shape.setMargin(0.04);
      const body = createRigidBody(mesh, shape, config.mass || 0);
      body.setFriction(0.88);
      body.setActivationState(4);
      if ((config.mass || 0) > 0) {
        body.setDamping(0.2, 0.82);
      }

      const destructible = {
        type: config.type,
        mesh,
        body,
        width: config.width,
        height: config.height,
        depth: config.depth,
        hp: config.hp,
        maxHp: config.hp,
        damaged: false,
        isDynamic: (config.mass || 0) > 0,
        fragmentMin: config.fragmentMin || 4,
        fragmentMax: config.fragmentMax || 8,
        lastVerticalVelocity: 0,
        impactCooldown: 0,
        clusterCooldown: 0
      };

      body.entityRef = destructible;
      body.entityType = config.type;
      destructibles.push(destructible);
      if (config.type === 'crate') {
        crates.push(destructible);
      }
      return destructible;
    }

    function createPlayer() {
      const root = new THREE.Group();
      root.position.set(0, 1.2, 0);
      scene.add(root);

      const visual = new THREE.Group();
      visual.position.y = -1.2;
      root.add(visual);

      const thighs = {
        left: addCharacterPart(visual, new THREE.BoxGeometry(0.28, 0.52, 0.26), materials.playerLimb, -0.22, 0.52, 0),
        right: addCharacterPart(visual, new THREE.BoxGeometry(0.28, 0.52, 0.26), materials.playerLimb, 0.22, 0.52, 0)
      };

      const shins = {
        left: addCharacterPart(visual, new THREE.BoxGeometry(0.22, 0.48, 0.22), materials.playerLimb, -0.22, 0.06, 0),
        right: addCharacterPart(visual, new THREE.BoxGeometry(0.22, 0.48, 0.22), materials.playerLimb, 0.22, 0.06, 0)
      };

      addCharacterPart(visual, new THREE.BoxGeometry(0.24, 0.14, 0.34), materials.playerShoe, -0.22, -0.18, 0.04);
      addCharacterPart(visual, new THREE.BoxGeometry(0.24, 0.14, 0.34), materials.playerShoe, 0.22, -0.18, 0.04);

      addCharacterPart(visual, new THREE.BoxGeometry(0.62, 0.28, 0.44), materials.playerBody, 0, 0.96, 0);
      addCharacterPart(visual, new THREE.BoxGeometry(0.72, 0.68, 0.42), materials.playerBody, 0, 1.42, 0);
      addCharacterPart(visual, new THREE.BoxGeometry(0.78, 0.62, 0.46), materials.playerVest, 0, 1.44, 0);

      const upperArms = {
        left: addCharacterPart(visual, new THREE.BoxGeometry(0.24, 0.46, 0.24), materials.playerLimb, -0.52, 1.52, 0),
        right: addCharacterPart(visual, new THREE.BoxGeometry(0.24, 0.46, 0.24), materials.playerLimb, 0.52, 1.52, 0)
      };
      const lowerArms = {
        left: addCharacterPart(visual, new THREE.BoxGeometry(0.2, 0.42, 0.2), materials.playerLimb, -0.52, 1.1, 0),
        right: addCharacterPart(visual, new THREE.BoxGeometry(0.2, 0.42, 0.2), materials.playerLimb, 0.52, 1.1, 0)
      };
      addCharacterPart(visual, new THREE.BoxGeometry(0.22, 0.18, 0.22), materials.playerGlove, -0.52, 0.88, 0);
      addCharacterPart(visual, new THREE.BoxGeometry(0.22, 0.18, 0.22), materials.playerGlove, 0.52, 0.88, 0);

      addCharacterPart(visual, new THREE.CylinderGeometry(0.16, 0.18, 0.22, 10), materials.playerLimb, 0, 1.92, 0);
      addCharacterPart(visual, new THREE.BoxGeometry(0.48, 0.5, 0.44), materials.playerHead, 0, 2.22, 0);
      const helmet = addCharacterPart(visual, new THREE.BoxGeometry(0.56, 0.32, 0.52), materials.playerHelmet, 0, 2.42, 0);
      helmet.rotation.x = -0.08;
      addCharacterPart(visual, new THREE.BoxGeometry(0.5, 0.14, 0.08), materials.playerVisor, 0, 2.28, 0.24);

      const gunPivot = new THREE.Group();
      gunPivot.position.set(0.38, 1.52, 0);
      gunPivot.rotation.x = -0.08;
      visual.add(gunPivot);
      buildWeaponModel(gunPivot, state.weaponKey);

      const shape = new AmmoLib.btSphereShape(1.08);
      shape.setMargin(0.06);
      const body = createRigidBody(root, shape, 6.1);
      body.setAngularFactor(new AmmoLib.btVector3(0, 0, 0));
      body.setDamping(0.2, 0.99);
      body.setFriction(0.92);
      body.setActivationState(4);

      return {
        root,
        visual,
        gunPivot,
        body,
        moveSpeed: 13.7,
        sprintSpeed: 20.8,
        leftThigh: thighs.left,
        rightThigh: thighs.right,
        leftShin: shins.left,
        rightShin: shins.right,
        leftUpperArm: upperArms.left,
        rightUpperArm: upperArms.right,
        leftLowerArm: lowerArms.left,
        rightLowerArm: lowerArms.right,
        gunRecoil: 0
      };
    }

    function addCharacterPart(parent, geometry, material, x, y, z) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function buildWeaponModel(gunPivot, weaponKey) {
      clearGroupChildren(gunPivot);

      if (weaponKey === 'pistol') {
        const grip = addCharacterPart(gunPivot, new THREE.BoxGeometry(0.14, 0.28, 0.16), materials.weapon, 0, -0.08, 0.12);
        grip.rotation.x = 0.18;
        addCharacterPart(gunPivot, new THREE.BoxGeometry(0.14, 0.18, 0.52), materials.weapon, 0, 0.06, 0.38);
        const barrel = addCharacterPart(gunPivot, new THREE.CylinderGeometry(0.04, 0.04, 0.36, 8), materials.weaponDark, 0, 0.08, 0.72);
        barrel.rotation.x = Math.PI * 0.5;
        addCharacterPart(gunPivot, new THREE.BoxGeometry(0.04, 0.12, 0.16), materials.weaponTrigger, 0, -0.04, 0.26);
        addCharacterPart(gunPivot, new THREE.BoxGeometry(0.1, 0.04, 0.03), materials.weaponDark, 0, 0.16, 0.14);
        addCharacterPart(gunPivot, new THREE.BoxGeometry(0.03, 0.06, 0.03), materials.weaponDark, 0, 0.14, 0.58);
        return;
      }

      if (weaponKey === 'shotgun') {
        addCharacterPart(gunPivot, new THREE.BoxGeometry(0.18, 0.16, 0.68), materials.weaponWood, 0, -0.04, 0.1);
        addCharacterPart(gunPivot, new THREE.BoxGeometry(0.18, 0.2, 0.54), materials.weapon, 0, 0.06, 0.58);
        const barrelTop = addCharacterPart(gunPivot, new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), materials.weaponDark, 0, 0.12, 0.96);
        barrelTop.rotation.x = Math.PI * 0.5;
        const barrelBottom = addCharacterPart(gunPivot, new THREE.CylinderGeometry(0.04, 0.04, 0.58, 8), materials.weaponDark, 0, 0.02, 0.92);
        barrelBottom.rotation.x = Math.PI * 0.5;
        addCharacterPart(gunPivot, new THREE.BoxGeometry(0.2, 0.14, 0.24), materials.weaponPump, 0, 0, 0.76);
        return;
      }

      if (weaponKey === 'rifle') {
        addCharacterPart(gunPivot, new THREE.BoxGeometry(0.16, 0.18, 0.72), materials.weapon, 0, 0.04, 0.52);
        const barrel = addCharacterPart(gunPivot, new THREE.CylinderGeometry(0.03, 0.03, 0.44, 8), materials.weaponDark, 0, 0.06, 0.98);
        barrel.rotation.x = Math.PI * 0.5;
        const stock = addCharacterPart(gunPivot, new THREE.BoxGeometry(0.1, 0.1, 0.44), materials.weaponDark, 0.12, -0.02, 0.08);
        stock.rotation.z = -0.12;
        const mag = addCharacterPart(gunPivot, new THREE.BoxGeometry(0.12, 0.3, 0.12), materials.weaponDark, 0, -0.13, 0.46);
        mag.rotation.x = -0.2;
        addCharacterPart(gunPivot, new THREE.BoxGeometry(0.14, 0.24, 0.16), materials.weapon, 0, -0.06, 0.2);
        return;
      }

      if (weaponKey === 'revolver') {
        addCharacterPart(gunPivot, new THREE.BoxGeometry(0.14, 0.28, 0.16), materials.weaponDark, 0, -0.08, 0.16);
        const drum = addCharacterPart(gunPivot, new THREE.CylinderGeometry(0.085, 0.085, 0.1, 10), materials.weapon, 0, 0.04, 0.34);
        drum.rotation.x = Math.PI * 0.5;
        const barrel = addCharacterPart(gunPivot, new THREE.CylinderGeometry(0.032, 0.032, 0.42, 8), materials.weaponDark, 0, 0.06, 0.68);
        barrel.rotation.x = Math.PI * 0.5;
        addCharacterPart(gunPivot, new THREE.BoxGeometry(0.1, 0.08, 0.3), materials.weapon, 0, 0.1, 0.44);
        return;
      }

      addCharacterPart(gunPivot, new THREE.BoxGeometry(0.13, 0.26, 0.14), materials.weapon, 0, -0.06, 0.18);
      const mag = addCharacterPart(gunPivot, new THREE.BoxGeometry(0.11, 0.34, 0.1), materials.weaponDark, 0, -0.14, 0.34);
      mag.rotation.x = -0.12;
      addCharacterPart(gunPivot, new THREE.BoxGeometry(0.14, 0.16, 0.62), materials.weapon, 0, 0.06, 0.44);
      const barrel = addCharacterPart(gunPivot, new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8), materials.weaponDark, 0, 0.07, 0.78);
      barrel.rotation.x = Math.PI * 0.5;
      const stock = addCharacterPart(gunPivot, new THREE.BoxGeometry(0.08, 0.1, 0.38), materials.weaponDark, 0.1, 0, 0.08);
      stock.rotation.z = -0.15;
      addCharacterPart(gunPivot, new THREE.BoxGeometry(0.12, 0.04, 0.03), materials.weaponDark, 0, 0.15, 0.18);
    }

    function clearGroupChildren(group) {
      while (group.children.length) {
        const child = group.children[0];
        group.remove(child);
        if (child.geometry && typeof child.geometry.dispose === 'function') child.geometry.dispose();
      }
    }

    function createZombie(positionX, positionZ, waveLevel, zombieType) {
      const typeKey = zombieType || 'normal';
      const type = zombieTypeDefs[typeKey] || zombieTypeDefs.normal;
      const root = new THREE.Group();
      root.position.set(positionX, 1.06, positionZ);
      root.scale.setScalar(type.scale);
      scene.add(root);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.65), materials.zombieBody);
      torso.position.y = 0.42;
      torso.castShadow = true;
      torso.receiveShadow = true;
      root.add(torso);

      const hip = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.58), materials.zombieCloth);
      hip.position.y = -0.58;
      hip.castShadow = true;
      hip.receiveShadow = true;
      root.add(hip);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.28, 8), materials.zombieLimb);
      neck.position.y = 1.3;
      neck.castShadow = true;
      root.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.68, 0.62), materials.zombieHead);
      head.position.y = 1.78;
      head.castShadow = true;
      root.add(head);

      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.34), materials.zombieJaw);
      jaw.position.set(0, 1.52, 0.42);
      jaw.castShadow = true;
      root.add(jaw);

      const leftUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.7, 0.28), materials.zombieLimb);
      leftUpperArm.position.set(-0.78, 0.56, 0.18);
      leftUpperArm.rotation.x = 0.6;
      leftUpperArm.castShadow = true;
      root.add(leftUpperArm);

      const rightUpperArm = leftUpperArm.clone();
      rightUpperArm.position.x = 0.78;
      root.add(rightUpperArm);

      const leftLowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), materials.zombieLimb);
      leftLowerArm.position.set(-0.78, 0.02, 0.46);
      leftLowerArm.rotation.x = 0.45;
      leftLowerArm.castShadow = true;
      root.add(leftLowerArm);

      const rightLowerArm = leftLowerArm.clone();
      rightLowerArm.position.x = 0.78;
      root.add(rightLowerArm);

      const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.32), materials.zombieLimb);
      leftThigh.position.set(-0.28, -1.02, 0.04);
      leftThigh.castShadow = true;
      root.add(leftThigh);

      const rightThigh = leftThigh.clone();
      rightThigh.position.x = 0.28;
      root.add(rightThigh);

      const leftShin = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.65, 0.26), materials.zombieLimb);
      leftShin.position.set(-0.28, -1.66, 0.06);
      leftShin.castShadow = true;
      root.add(leftShin);

      const rightShin = leftShin.clone();
      rightShin.position.x = 0.28;
      root.add(rightShin);

      const shape = new AmmoLib.btSphereShape(1.0);
      shape.setMargin(0.05);
      const body = createRigidBody(root, shape, 3.5 + waveLevel * 0.06);
      body.setAngularFactor(new AmmoLib.btVector3(0, 0, 0));
      body.setDamping(0.28, 0.99);
      body.setFriction(0.88);
      body.setActivationState(4);

      const zombie = {
        root,
        body,
        torso,
        head,
        jaw,
        leftUpperArm,
        rightUpperArm,
        leftLowerArm,
        rightLowerArm,
        leftThigh,
        rightThigh,
        leftShin,
        rightShin,
        type: typeKey,
        hp: (78 + waveLevel * 12) * type.hpMul,
        speed: (4.6 + waveLevel * 0.18) * type.speedMul,
        contactDamage: (8 + waveLevel * 0.45) * type.damageMul,
        scoreValue: type.score,
        phase: Math.random() * Math.PI * 2,
        lateral: THREE.MathUtils.randFloat(0.4, 1.0),
        hitStagger: 0
      };

      const eliteChance = waveLevel >= 4 ? Math.min(0.32, Math.max(0, (waveLevel - 3) * 0.035)) : 0;
      zombie.isElite = eliteChance > 0 && Math.random() < eliteChance;
      if (zombie.isElite) {
        zombie.hp *= 1.35;
        zombie.speed *= 1.12;
        zombie.contactDamage *= 1.18;
        zombie.scoreValue = Math.round(zombie.scoreValue * 1.35);
        zombie.root.scale.multiplyScalar(1.08);
      }

      body.entityRef = zombie;
      body.entityType = 'zombie';
      zombies.push(zombie);
      return zombie;
    }

    function getZombieTypeForWave(waveLevel) {
      if (gameLogic.getZombieTypeForWave) {
        return gameLogic.getZombieTypeForWave(waveLevel);
      }
      if (waveLevel <= 2) return 'normal';
      const roll = Math.random();
      if (waveLevel >= 5 && roll < 0.15) return 'brute';
      if (waveLevel >= 3 && roll < (waveLevel >= 5 ? 0.35 : 0.2)) return 'runner';
      return 'normal';
    }

    function spawnWave(waveLevel) {
      const plan = gameLogic.getWaveSpawnPlan
        ? gameLogic.getWaveSpawnPlan(waveLevel, runtimeConfig.zombies && runtimeConfig.zombies.wave)
        : null;
      const amount = plan ? plan.amount : Math.min(8 + waveLevel * 3, 54);
      state.waveSpawnAmount = amount;
      state.waveSpawnCursor = 0;
      state.waveSpawnRemaining = amount;
      state.director.spawnTimer = 0.2;
      state.director.intensity = 0.34;
      state.director.status = 'Stabil';
      const initialRatio = Number(runtimeConfig.director && runtimeConfig.director.initialSpawnRatio) || 0.55;
      const initialSpawn = Math.max(3, Math.min(amount, Math.round(amount * initialRatio)));
      spawnWaveBatch(waveLevel, initialSpawn, plan, amount);
      beginWaveObjective(waveLevel);
      state.waveInProgress = true;
    }

    function spawnWaveBatch(waveLevel, count, plan, totalAmount) {
      const amount = totalAmount || state.waveSpawnAmount || 1;
      const ringRadius = plan ? plan.ringRadius : Math.min(70, 44 + waveLevel * 2.4);
      const laneSpawnCount = plan ? plan.laneSpawnCount : (waveLevel >= 4 ? Math.floor(amount * 0.2) : 0);
      const safeRadius = plan ? plan.safeRadius : 22;
      const safeRadiusSq = safeRadius * safeRadius;
      const startIndex = state.waveSpawnCursor;
      const endIndex = Math.min(amount, startIndex + Math.max(0, count));

      for (let index = startIndex; index < endIndex; index++) {
        let x;
        let z;
        if (index < laneSpawnCount) {
          const lane = laneSpawnPoints[index % laneSpawnPoints.length];
          x = lane.x + THREE.MathUtils.randFloatSpread(4.8);
          z = lane.z + THREE.MathUtils.randFloatSpread(4.8);
        } else {
          const angle = (index / amount) * Math.PI * 2 + Math.random() * 0.45;
          const radius = ringRadius + Math.random() * 20;
          x = Math.cos(angle) * radius;
          z = Math.sin(angle) * radius;
        }

        let guard = 0;
        while ((x * x + z * z) < safeRadiusSq && guard < 8) {
          x += THREE.MathUtils.randFloatSpread(6);
          z += THREE.MathUtils.randFloatSpread(6);
          guard++;
        }
        createZombie(x, z, waveLevel, getZombieTypeForWave(waveLevel));
      }

      const spawned = endIndex - startIndex;
      state.waveSpawnCursor = endIndex;
      state.waveSpawnRemaining = Math.max(0, state.waveSpawnRemaining - spawned);
    }

    function beginWaveObjective(waveLevel) {
      const objectivesEnabled = !(runtimeConfig.objectives && runtimeConfig.objectives.enabled === false);
      if (!objectivesEnabled) {
        state.objective.active = null;
        state.objective.completed = true;
        state.objective.progress = 0;
        state.objective.rewardGiven = true;
        return;
      }

      const objective = gameLogic.getObjectiveForWave
        ? gameLogic.getObjectiveForWave(waveLevel, runtimeConfig.objectives, Math.random())
        : null;
      if (objective && objective.id === 'slayer') {
        const maxTarget = Math.max(3, Math.floor(state.waveSpawnAmount * 0.85));
        objective.targetKills = Math.max(1, Math.min(maxTarget, Math.round(objective.targetKills || maxTarget)));
        objective.label = 'Jagd: ' + objective.targetKills + ' Kills erreichen';
      }
      state.objective.active = objective;
      state.objective.completed = !objective;
      state.objective.progress = 0;
      state.objective.rewardGiven = false;
    }

    function completeObjective() {
      if (!state.objective.active || state.objective.rewardGiven) return;
      state.objective.completed = true;
      state.objective.rewardGiven = true;
      const rewardScore = Math.max(0, Number(state.objective.active.rewardScore || 0));
      const rewardXp = Math.max(0, Number(state.objective.active.rewardXp || 0));
      state.score += rewardScore;
      grantXp(rewardXp, player.root.position.clone());
      addFloatingScore(player.root.position.clone().add(new THREE.Vector3(0, 2.8, 0)), 'ZIEL ERFÜLLT +' + rewardScore, '#9dffb9');
    }

    function updateObjective(dt) {
      const objective = state.objective.active;
      if (!objective || state.objective.completed) return;

      if (objective.id === 'survive') {
        state.objective.progress += dt;
        if (state.objective.progress >= objective.duration) {
          completeObjective();
        }
      }
    }

    function updateDirector(dt) {
      if (!state.running || !state.waveInProgress) return;
      const plan = gameLogic.getWaveSpawnPlan
        ? gameLogic.getWaveSpawnPlan(state.wave, runtimeConfig.zombies && runtimeConfig.zombies.wave)
        : null;
      const waveAmount = plan ? plan.amount : Math.max(1, state.waveSpawnAmount || 1);
      const aliveRatio = Math.min(1, zombies.length / Math.max(1, Math.round(waveAmount * 0.52)));
      const healthRatio = state.maxHealth > 0 ? state.health / state.maxHealth : 0;
      const armorRatio = state.maxArmor > 0 ? state.armor / state.maxArmor : 0;
      const killMomentum = Math.min(1, state.comboMultiplier / 5);
      const targetIntensity = gameLogic.evaluateDirectorIntensity
        ? gameLogic.evaluateDirectorIntensity({ healthRatio, armorRatio, aliveRatio, killMomentum })
        : 0.35;

      state.director.intensity = THREE.MathUtils.lerp(state.director.intensity, targetIntensity, Math.min(1, dt * 2.5));

      if (state.director.intensity < 0.33) state.director.status = 'Entlastung';
      else if (state.director.intensity > 0.67) state.director.status = 'Druck';
      else state.director.status = 'Stabil';

      if (state.waveSpawnRemaining <= 0) return;

      const maxAliveFactor = Number(runtimeConfig.director && runtimeConfig.director.maxAliveFactor) || 0.48;
      const maxAlive = Math.max(4, Math.round(waveAmount * maxAliveFactor));
      if (zombies.length >= maxAlive) return;

      state.director.spawnTimer -= dt;
      if (state.director.spawnTimer > 0) return;

      const minInterval = Number(runtimeConfig.director && runtimeConfig.director.reinforcementIntervalMin) || 1.3;
      const maxInterval = Number(runtimeConfig.director && runtimeConfig.director.reinforcementIntervalMax) || 3.8;
      const minBatch = Number(runtimeConfig.director && runtimeConfig.director.reinforcementBatchMin) || 1;
      const maxBatch = Number(runtimeConfig.director && runtimeConfig.director.reinforcementBatchMax) || 4;

      const pressureBatch = THREE.MathUtils.lerp(minBatch, maxBatch, state.director.intensity);
      const batch = Math.max(minBatch, Math.min(maxBatch, Math.round(pressureBatch)));
      spawnWaveBatch(state.wave, batch, plan, waveAmount);
      state.director.spawnTimer = THREE.MathUtils.lerp(maxInterval, minInterval, state.director.intensity);
    }

    function updatePlayer(dt) {
      const movement = new THREE.Vector3(0, 0, 0);
      if (state.keys.w) movement.z -= 1;
      if (state.keys.s) movement.z += 1;
      if (state.keys.a) movement.x -= 1;
      if (state.keys.d) movement.x += 1;
      const isMoving = movement.lengthSq() > 0;
      if (isMoving) movement.normalize();

      const speedBase = state.keys.shift ? player.sprintSpeed : player.moveSpeed;
      const speed = speedBase * state.moveSpeedMul * getAdrenalineActiveMul();
      const currentVelocity = player.body.getLinearVelocity();
      setBodyVelocity(player.body, movement.x * speed, currentVelocity.y(), movement.z * speed);

      raycaster.setFromCamera(state.mouseNdc, camera);
      if (raycaster.ray.intersectPlane(aimPlane, aimPoint)) {
        state.aimDirection.copy(aimPoint).sub(player.root.position);
        state.aimDirection.y = 0;
        if (state.aimDirection.lengthSq() > 0.0001) {
          state.aimDirection.normalize();
          const yaw = Math.atan2(state.aimDirection.x, state.aimDirection.z);
          player.visual.rotation.y = yaw;
        }
      }

      const now = performance.now() * 0.001;
      const moveFreq = state.keys.shift ? 10.5 : 8.2;
      const gait = isMoving ? Math.sin(now * moveFreq) * 0.55 : 0;
      const bob = isMoving ? Math.sin(now * moveFreq) * 0.04 : 0;

      player.leftThigh.rotation.x = gait;
      player.rightThigh.rotation.x = -gait;
      player.leftShin.rotation.x = -gait * 0.58;
      player.rightShin.rotation.x = gait * 0.58;

      player.leftUpperArm.rotation.x = -0.28;
      player.leftLowerArm.rotation.x = -0.16;
      player.gunRecoil = Math.max(0, player.gunRecoil - dt * 8.5);
      player.gunPivot.rotation.x = -0.08 - player.gunRecoil;
      player.rightUpperArm.rotation.x = -0.14 + player.gunPivot.rotation.x;
      player.rightLowerArm.rotation.x = -0.18 + player.gunPivot.rotation.x * 0.52;
      player.visual.position.y = -1.2 + bob;

      if (state.mouseDown) shoot();
    }

    function updateZombies(dt) {
      const now = performance.now() * 0.001;

      for (let index = zombies.length - 1; index >= 0; index--) {
        const zombie = zombies[index];
        if (zombie.hp <= 0) {
          triggerZombieDeath(index);
          continue;
        }

        tmpZombieToPlayer.subVectors(player.root.position, zombie.root.position);
        const distance = tmpZombieToPlayer.length();
        if (distance > 0.001) tmpZombieToPlayer.multiplyScalar(1 / distance);

        const strafe = Math.sin(now * 1.7 + zombie.phase) * 0.35 * zombie.lateral;
        const desiredX = tmpZombieToPlayer.x + tmpZombieToPlayer.z * strafe;
        const desiredZ = tmpZombieToPlayer.z - tmpZombieToPlayer.x * strafe;
        tmpZombieDesiredDir.set(desiredX, 0, desiredZ);
        if (tmpZombieDesiredDir.lengthSq() > 0.000001) tmpZombieDesiredDir.normalize();
        else tmpZombieDesiredDir.set(0, 0, 0);

        const currentVelocity = zombie.body.getLinearVelocity();
        const drive = zombie.hitStagger > 0 ? 0 : (distance > 1.95 ? zombie.speed : 0);
        if (zombie.hitStagger > 0) zombie.hitStagger = Math.max(0, zombie.hitStagger - dt);
        setBodyVelocity(zombie.body, tmpZombieDesiredDir.x * drive, currentVelocity.y(), tmpZombieDesiredDir.z * drive);

        const yaw = Math.atan2(tmpZombieToPlayer.x, tmpZombieToPlayer.z);
        const sway = Math.sin(now * 5.1 + zombie.phase) * 0.12;
        zombie.root.rotation.y = yaw + sway;
        zombie.root.rotation.z = sway * 0.3;

        const gait = Math.sin(now * 6.6 + zombie.phase) * 0.56;
        zombie.leftUpperArm.rotation.x = 0.6 - gait * 1.12;
        zombie.rightUpperArm.rotation.x = 0.6 + gait * 1.12;
        zombie.leftLowerArm.rotation.x = 0.45 - gait * 0.65;
        zombie.rightLowerArm.rotation.x = 0.45 + gait * 0.65;
        zombie.leftThigh.rotation.x = gait * 0.95;
        zombie.rightThigh.rotation.x = -gait * 0.95;
        zombie.leftShin.rotation.x = -gait * 0.72;
        zombie.rightShin.rotation.x = gait * 0.72;

        if (distance < 1.8) {
          const rawDamage = zombie.contactDamage * dt;
          if (state.armor > 0) {
            const armorAbsorb = Math.min(state.armor, rawDamage * 0.7);
            state.armor -= armorAbsorb;
            state.health -= rawDamage - armorAbsorb;
          } else {
            state.health -= rawDamage;
          }
          state.hitFlash = Math.min(1, state.hitFlash + dt * 3.2);
          addCameraShake(0.12 * dt * 12);
          if (state.health <= 0) {
            state.health = 0;
            endGame();
            return;
          }
        }
      }
    }

    function updateCorpseBodies(dt) {
      for (let index = deadZombies.length - 1; index >= 0; index--) {
        const corpse = deadZombies[index];
        corpse.life -= dt;

        if (corpse.life <= corpse.fadeStart) {
          const fadeT = Math.max(0, corpse.life / corpse.fadeStart);
          corpse.zombie.root.traverse((node) => {
            if (!node.isMesh || !node.material) return;
            node.material.opacity = fadeT;
          });
        }

        if (corpse.life <= 0) {
          removeZombieCorpse(index);
        }
      }
    }

    function removeZombieCorpse(index) {
      const corpse = deadZombies[index];
      if (!corpse) return;

      corpse.zombie.root.traverse((node) => {
        if (!node.isMesh) return;
        if (node.material && typeof node.material.dispose === 'function') node.material.dispose();
      });

      removePhysicsObject(corpse.zombie.root, corpse.zombie.body);
      deadZombies.splice(index, 1);
    }

    function shoot() {
      if (!state.running || state.reloading) return;
      const weapon = weaponDefs[state.weaponKey];
      const weaponState = state.weapons[state.weaponKey];
      if (!weapon || !weaponState || weaponState.ammo <= 0) return;
      const now = performance.now();
      const adrenalineFireRateMul = state.skills.adrenaline.active > 0 ? 1.22 : 1;
      const cooldownMs = weapon.cooldown * (1 / (state.fireRateMul * adrenalineFireRateMul));
      if (now - state.lastShotMs < cooldownMs) return;
      state.lastShotMs = now;
      weaponState.ammo -= 1;
      if (state.ammoRefundChance > 0 && Math.random() < state.ammoRefundChance) {
        weaponState.ammo = Math.min(weapon.magazine, weaponState.ammo + 1);
      }
      player.gunRecoil = Math.min(0.18, player.gunRecoil + (weapon.pellets > 1 ? 0.16 : 0.1));

      const origin = getMuzzleWorldPosition(weapon);
      spawnMuzzleFlash(origin);
      addCameraShake(weapon.pellets > 1 ? 0.18 : 0.1);

      for (let pellet = 0; pellet < weapon.pellets; pellet++) {
        const shotDirection = applySpreadToDirection(state.aimDirection, weapon.spreadDeg);
        shootRaycast({
          origin,
          direction: shotDirection,
          damage: weapon.damage * state.damageMul * (state.skills.adrenaline.active > 0 ? 1.16 : 1),
          maxDistance: weapon.maxDistance,
          tracerLife: weapon.tracerLife
        });
      }
    }

    function reload() {
      const weapon = weaponDefs[state.weaponKey];
      const weaponState = state.weapons[state.weaponKey];
      if (!weapon || !weaponState) return;
      if (state.reloading || weaponState.ammo >= weapon.magazine || weaponState.reserve <= 0) return;

      state.reloading = true;
      updateHud();
      window.setTimeout(() => {
        const needed = weapon.magazine - weaponState.ammo;
        const taken = Math.min(needed, weaponState.reserve);
        weaponState.ammo += taken;
        weaponState.reserve -= taken;
        state.reloading = false;
        updateHud();
      }, Math.max(300, state.reloadDelayMs));
    }

    function applySpreadToDirection(direction, spreadDeg) {
      if (!spreadDeg) return direction.clone();
      const angle = THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(spreadDeg));
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return new THREE.Vector3(
        direction.x * c - direction.z * s,
        0,
        direction.x * s + direction.z * c
      ).normalize();
    }

    function getMuzzleWorldPosition(weapon) {
      const muzzleOffset = weapon && weapon.muzzleOffset ? weapon.muzzleOffset : new THREE.Vector3(0, 0.08, 0.9);
      return player.gunPivot.localToWorld(muzzleOffset.clone());
    }

    function shootRaycast(config) {
      const origin = config.origin.clone();
      const direction = config.direction.clone().normalize();
      const maxDistance = config.maxDistance || 60;
      const damage = config.damage || 1;
      const tracerLife = config.tracerLife || 0.035;

      let hitType = null;
      let hitDistance = maxDistance;
      let hitIndex = -1;
      let hitPoint = origin.clone().addScaledVector(direction, maxDistance);
      let hitNormal = direction.clone().negate();

      for (let zombieIndex = zombies.length - 1; zombieIndex >= 0; zombieIndex--) {
        const zombie = zombies[zombieIndex];
        const distance = intersectRaySphere(origin, direction, zombie.root.position, 1.3, maxDistance);
        if (distance === null || distance >= hitDistance) continue;
        hitType = 'zombie';
        hitDistance = distance;
        hitIndex = zombieIndex;
        hitPoint = origin.clone().addScaledVector(direction, distance);
      }

      for (let destructibleIndex = destructibles.length - 1; destructibleIndex >= 0; destructibleIndex--) {
        const destructible = destructibles[destructibleIndex];
        const radius = Math.max(destructible.width, destructible.depth) * 0.68 + 0.28;
        const distance = intersectRaySphere(origin, direction, destructible.mesh.position, radius, maxDistance);
        if (distance === null || distance >= hitDistance) continue;
        hitType = 'destructible';
        hitDistance = distance;
        hitIndex = destructibleIndex;
        hitPoint = origin.clone().addScaledVector(direction, distance);
      }

      raycaster.set(origin, direction);
      raycaster.far = maxDistance;
      const envHits = raycaster.intersectObjects(splatterSurfaces, false);
      let envHit = null;
      for (let i = 0; i < envHits.length; i++) {
        const candidate = envHits[i];
        let isDestructibleSurface = false;
        for (let j = 0; j < destructibles.length; j++) {
          if (destructibles[j].mesh === candidate.object) {
            isDestructibleSurface = true;
            break;
          }
        }
        if (!isDestructibleSurface) {
          envHit = candidate;
          break;
        }
      }

      if (envHit) {
        if (envHit.distance < hitDistance) {
          hitType = 'surface';
          hitDistance = envHit.distance;
          hitPoint = envHit.point.clone();
          hitNormal = envHit.face
            ? envHit.face.normal.clone().transformDirection(envHit.object.matrixWorld).normalize()
            : direction.clone().negate();
        }
      }

      if (hitType === 'zombie' && hitIndex >= 0) {
        const zombie = zombies[hitIndex];
        let appliedDamage = damage;
        if (zombie.type === 'brute') appliedDamage *= state.bruteDamageMul;
        if (zombie.isElite) appliedDamage *= 1.08;
        let isCrit = false;
        if (state.critChance > 0 && Math.random() < state.critChance) {
          appliedDamage *= state.critMul;
          isCrit = true;
        }
        zombie.hp -= appliedDamage;
        spawnBloodSpray(hitPoint, THREE.MathUtils.randInt(30, 50), 0.72, 48);
        spawnBloodMist(hitPoint, THREE.MathUtils.randInt(8, 12));
        spawnBloodDecal(hitPoint, 0.3 + Math.random() * 0.35);
        spawnNearbySurfaceBlood(hitPoint, direction, 5.6);
        applyZombieHitImpulse(zombie, direction, 6.4);
        if (isCrit) {
          addFloatingScore(hitPoint.clone().add(new THREE.Vector3(0, 0.8, 0)), 'KRIT', '#ff8fb8');
        }
        if (zombie.hp <= 0) {
          onZombieKilled(zombie, hitPoint);
          triggerZombieDeath(hitIndex, direction, hitPoint);
        }
      } else if (hitType === 'destructible' && hitIndex >= 0) {
        damageDestructible(hitIndex, damage * state.destructibleDamageMul, direction);
        spawnImpactEffects(hitPoint, direction.clone().negate());
      } else if (hitType === 'surface') {
        spawnImpactEffects(hitPoint, hitNormal);
      }

      spawnTracer(origin, direction, hitDistance, tracerLife);
    }

    function intersectRaySphere(origin, direction, center, radius, maxDistance) {
      const toCenter = center.clone().sub(origin);
      const proj = toCenter.dot(direction);
      if (proj < 0 || proj > maxDistance) return null;
      const closestDistSq = toCenter.lengthSq() - proj * proj;
      const radiusSq = radius * radius;
      if (closestDistSq > radiusSq) return null;
      const offset = Math.sqrt(Math.max(0, radiusSq - closestDistSq));
      const t0 = proj - offset;
      const t1 = proj + offset;
      if (t0 >= 0 && t0 <= maxDistance) return t0;
      if (t1 >= 0 && t1 <= maxDistance) return t1;
      return null;
    }

    function spawnTracer(origin, direction, length, life) {
      const tracerLength = Math.max(0.05, length || 60);
      const tracerGeo = new THREE.BufferGeometry().setFromPoints([
        origin.clone(),
        origin.clone().addScaledVector(direction, tracerLength)
      ]);
      const tracerMat = new THREE.LineBasicMaterial({
        color: 0xfff4bf,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.96
      });
      const tracer = new THREE.Line(tracerGeo, tracerMat);
      scene.add(tracer);
      pushEffect({
        mesh: tracer,
        velocity: new THREE.Vector3(0, 0, 0),
        life: life || 0.035,
        totalLife: life || 0.035,
        baseOpacity: 0.96,
        gravity: 0
      });
    }

    function createMuzzleFlashMaterial() {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
      gradient.addColorStop(0, 'rgba(255,245,190,1)');
      gradient.addColorStop(0.35, 'rgba(255,196,98,0.95)');
      gradient.addColorStop(1, 'rgba(255,120,45,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
    }

    function spawnMuzzleFlash(origin) {
      const flash = new THREE.Sprite(muzzleFlashMaterial);
      flash.position.copy(origin);
      flash.scale.set(0.95, 0.95, 0.95);
      scene.add(flash);
      pushEffect({
        mesh: flash,
        velocity: new THREE.Vector3(0, 0, 0),
        life: 0.06,
        totalLife: 0.06,
        baseOpacity: 1,
        preserveMaterial: true,
        preserveGeometry: true,
        shrink: true
      });

      spawnTransientPointLight(0xffb24f, 6.8, 14, origin.clone(), 0.075);

      const smokeCount = THREE.MathUtils.randInt(3, 4);
      for (let i = 0; i < smokeCount; i++) {
        const smoke = new THREE.Mesh(
          new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 5, 5),
          new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.4 })
        );
        smoke.position.copy(origin);
        smoke.position.add(new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(0.05),
          THREE.MathUtils.randFloatSpread(0.03),
          THREE.MathUtils.randFloatSpread(0.05)
        ));
        scene.add(smoke);
        pushEffect({
          mesh: smoke,
          velocity: new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(0.28),
            0.6 + Math.random() * 0.35,
            THREE.MathUtils.randFloatSpread(0.28)
          ),
          life: 0.3,
          totalLife: 0.3,
          baseOpacity: 0.4,
          drag: 3.2
        });
      }
    }

    function spawnImpactEffects(point, normal) {
      spawnSparkBurst(point.clone(), 0xffdd9a, 12, 0.18, 24);
      spawnDustPuff(point.clone(), 4);
      spawnImpactDecal(point.clone(), normal || WORLD_UP);
      spawnTransientPointLight(0xffcf88, 2.3, 6, point.clone(), 0.065);
    }

    function applyZombieHitImpulse(zombie, direction, strength) {
      const force = strength || 6;
      const currentVelocity = zombie.body.getLinearVelocity();
      setBodyVelocity(
        zombie.body,
        currentVelocity.x() + direction.x * force,
        Math.max(currentVelocity.y(), 1.8),
        currentVelocity.z() + direction.z * force
      );
      zombie.hitStagger = 0.12 + Math.random() * 0.08;
    }

    function spawnNearbySurfaceBlood(origin, direction, maxDistance) {
      const rayOrigin = origin.clone().addScaledVector(direction, 0.06);
      raycaster.set(rayOrigin, direction.clone().normalize());
      raycaster.far = maxDistance || 5;
      const hits = raycaster.intersectObjects(splatterSurfaces, false);
      if (!hits.length) return;

      const hit = hits[0];
      const faceNormal = hit.face
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
        : direction.clone().negate();
      spawnBloodDecalOnSurface(
        hit.point,
        faceNormal,
        0.2 + Math.random() * 0.32,
        60 + Math.random() * 30
      );
    }

    function spawnZombieDeathGore(zombie, direction, hitPoint) {
      const deathPos = zombie.root.position.clone();
      if (hitPoint) deathPos.lerp(hitPoint, 0.35);
      const bloodIntensity = Math.max(0.5, Number(goreConfig.bloodIntensity) || 1);

      spawnBloodSpray(deathPos, Math.round(THREE.MathUtils.randInt(40, 60) * bloodIntensity), 0.92, 58 + 10 * (bloodIntensity - 1));
      spawnBloodMist(deathPos, Math.round(THREE.MathUtils.randInt(10, 12) * bloodIntensity));
      spawnGoreBurst(deathPos, direction, Math.round(THREE.MathUtils.randInt(40, 60) * bloodIntensity));

      const poolCount = THREE.MathUtils.randInt(2, 4);
      for (let i = 0; i < poolCount; i++) {
        const offset = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1.6),
          0,
          THREE.MathUtils.randFloatSpread(1.6)
        );
        const poolPos = deathPos.clone().add(offset);
        spawnBloodDecal(poolPos, 0.4 + Math.random() * 0.8);
      }

      const ringCount = THREE.MathUtils.randInt(5, 8);
      for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2 + Math.random() * 0.4;
        const radius = THREE.MathUtils.randFloat(1.5, 3.0);
        const ringPos = deathPos.clone().add(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
        spawnBloodDecal(ringPos, 0.18 + Math.random() * 0.24);
      }

      spawnOrganChunks(deathPos, direction, THREE.MathUtils.randInt(3, 5));
      spawnNearbySurfaceBlood(deathPos, direction.clone().normalize(), 6.2);
      spawnNearbySurfaceBlood(deathPos, direction.clone().negate(), 4.2);
      spawnZombieDismemberment(zombie, direction, hitPoint || deathPos);
    }

    function spawnGoreBurst(origin, direction, count) {
      const burstCount = scaleEffectCount(count || 48, 14);
      for (let i = 0; i < burstCount; i++) {
        const useDisc = Math.random() < 0.32;
        const scale = useDisc
          ? THREE.MathUtils.randFloat(0.08, 0.22)
          : THREE.MathUtils.randFloat(0.05, 0.14);
        const geometry = useDisc
          ? new THREE.CircleGeometry(scale, 7)
          : new THREE.SphereGeometry(scale, 6, 6);
        const material = new THREE.MeshBasicMaterial({
          color: useDisc ? 0x7e1010 : 0x8c1212,
          transparent: true,
          opacity: 1,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(origin);
        mesh.position.y += THREE.MathUtils.randFloat(0.15, 1.4);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        scene.add(mesh);

        const spread = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1),
          Math.random() * 1.1 + 0.2,
          THREE.MathUtils.randFloatSpread(1)
        );
        spread.addScaledVector(direction, 0.45 + Math.random() * 0.8);
        const velocity = spread.normalize().multiplyScalar(38 + Math.random() * 36);

        pushEffect({
          mesh,
          velocity,
          life: 0.5 + Math.random() * 0.7,
          fade: 2.2,
          gravity: 24,
          spin: new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(11),
            THREE.MathUtils.randFloatSpread(11),
            THREE.MathUtils.randFloatSpread(11)
          )
        });
      }
    }

    function spawnOrganChunks(origin, direction, count) {
      const chunkCount = scaleEffectCount(count || 3, 2);
      for (let i = 0; i < chunkCount; i++) {
        const isSphere = Math.random() < 0.5;
        const geometry = isSphere
          ? new THREE.SphereGeometry(0.12 + Math.random() * 0.12, 8, 6)
          : new THREE.BoxGeometry(
            0.18 + Math.random() * 0.22,
            0.14 + Math.random() * 0.18,
            0.14 + Math.random() * 0.2
          );
        const mesh = new THREE.Mesh(geometry, materials.organChunk.clone());
        mesh.position.copy(origin);
        mesh.position.y += 0.25 + Math.random() * 0.8;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        const throwDir = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1),
          Math.random() * 0.8 + 0.25,
          THREE.MathUtils.randFloatSpread(1)
        ).addScaledVector(direction, 0.6).normalize();
        const velocity = throwDir.multiplyScalar(18 + Math.random() * 12);

        pushEffect({
          mesh,
          velocity,
          life: 2.2 + Math.random() * 1.4,
          fade: 0.52,
          gravity: 21,
          floorY: 0.12,
          settle: true,
          spin: new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(8),
            THREE.MathUtils.randFloatSpread(8),
            THREE.MathUtils.randFloatSpread(8)
          )
        });
      }
    }

    function spawnZombieDismemberment(zombie, direction, hitPoint) {
      if (!goreConfig.enabled) return;
      if (Math.random() > (Number(goreConfig.dismemberChance) || 0.82)) return;

      const candidates = [
        { key: 'head', mesh: zombie.head, weight: 1.2 },
        { key: 'jaw', mesh: zombie.jaw, weight: 0.7 },
        { key: 'leftUpperArm', mesh: zombie.leftUpperArm, weight: 1 },
        { key: 'rightUpperArm', mesh: zombie.rightUpperArm, weight: 1 },
        { key: 'leftLowerArm', mesh: zombie.leftLowerArm, weight: 1.1 },
        { key: 'rightLowerArm', mesh: zombie.rightLowerArm, weight: 1.1 },
        { key: 'leftThigh', mesh: zombie.leftThigh, weight: 0.9 },
        { key: 'rightThigh', mesh: zombie.rightThigh, weight: 0.9 },
        { key: 'leftShin', mesh: zombie.leftShin, weight: 0.9 },
        { key: 'rightShin', mesh: zombie.rightShin, weight: 0.9 }
      ].filter((entry) => entry.mesh && entry.mesh.visible !== false);

      const minCount = Math.max(1, Math.round(Number(goreConfig.minLimbsPerDeath) || 1));
      const maxCount = Math.max(minCount, Math.round(Number(goreConfig.maxLimbsPerDeath) || 3));
      const limbCount = THREE.MathUtils.randInt(minCount, Math.min(maxCount, candidates.length));

      for (let i = 0; i < limbCount; i++) {
        if (!candidates.length) break;
        let totalWeight = 0;
        for (let w = 0; w < candidates.length; w++) totalWeight += candidates[w].weight;
        let roll = Math.random() * totalWeight;
        let chosenIndex = 0;
        for (let p = 0; p < candidates.length; p++) {
          roll -= candidates[p].weight;
          if (roll <= 0) {
            chosenIndex = p;
            break;
          }
        }

        const entry = candidates[chosenIndex];
        candidates.splice(chosenIndex, 1);
        spawnDetachedLimb(entry.mesh, direction, hitPoint || zombie.root.position);
      }
    }

    function spawnDetachedLimb(sourceMesh, direction, hitPoint) {
      if (!sourceMesh || !sourceMesh.geometry) return;
      const maxActive = Math.max(8, Math.round(Number(goreConfig.limbMaxActive) || 36));
      let activeLimbs = 0;
      for (let i = 0; i < debris.length; i++) {
        if (debris[i] && debris[i].kind === 'limb') activeLimbs++;
      }
      if (activeLimbs >= maxActive) {
        for (let i = 0; i < debris.length; i++) {
          if (debris[i] && debris[i].kind === 'limb') {
            removeDebris(i);
            break;
          }
        }
      }

      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      sourceMesh.getWorldPosition(worldPos);
      sourceMesh.getWorldQuaternion(worldQuat);
      sourceMesh.getWorldScale(worldScale);

      const geometry = sourceMesh.geometry.clone();
      const material = sourceMesh.material && typeof sourceMesh.material.clone === 'function'
        ? sourceMesh.material.clone()
        : new THREE.MeshStandardMaterial({ color: 0x7f5d4e, roughness: 0.85, metalness: 0.05 });
      material.transparent = true;
      material.opacity = 1;

      const limbMesh = new THREE.Mesh(geometry, material);
      limbMesh.position.copy(worldPos);
      limbMesh.quaternion.copy(worldQuat);
      limbMesh.scale.copy(worldScale);
      limbMesh.castShadow = true;
      limbMesh.receiveShadow = true;
      scene.add(limbMesh);

      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;
      const size = bbox
        ? new THREE.Vector3(
          Math.max(0.08, (bbox.max.x - bbox.min.x) * worldScale.x),
          Math.max(0.08, (bbox.max.y - bbox.min.y) * worldScale.y),
          Math.max(0.08, (bbox.max.z - bbox.min.z) * worldScale.z)
        )
        : new THREE.Vector3(0.24, 0.24, 0.24);

      const shape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(size.x * 0.5, size.y * 0.5, size.z * 0.5));
      shape.setMargin(0.015);
      const mass = THREE.MathUtils.randFloat(0.35, 1.2);
      const body = createRigidBody(limbMesh, shape, mass);
      body.setFriction(0.92);
      body.setDamping(0.12, 0.55);
      body.setActivationState(4);

      const throwDir = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(0.9),
        THREE.MathUtils.randFloat(0.2, 0.85),
        THREE.MathUtils.randFloatSpread(0.9)
      ).addScaledVector(direction || new THREE.Vector3(0, 0, 1), 0.95).normalize();
      const impulse = THREE.MathUtils.randFloat(
        Number(goreConfig.limbImpulseMin) || 14,
        Number(goreConfig.limbImpulseMax) || 26
      );
      const velocity = throwDir.multiplyScalar(impulse);
      setBodyVelocity(body, velocity.x, velocity.y, velocity.z);

      const angular = new AmmoLib.btVector3(
        THREE.MathUtils.randFloatSpread(16),
        THREE.MathUtils.randFloatSpread(16),
        THREE.MathUtils.randFloatSpread(16)
      );
      body.setAngularVelocity(angular);
      AmmoLib.destroy(angular);

      sourceMesh.visible = false;
      spawnBloodSpray(worldPos.clone().lerp(hitPoint || worldPos, 0.25), THREE.MathUtils.randInt(8, 14), 0.34, 34);
      spawnBloodDecal(worldPos, 0.14 + Math.random() * 0.28);

      const life = THREE.MathUtils.randFloat(
        Number(goreConfig.limbLifeMin) || 4,
        Number(goreConfig.limbLifeMax) || 6.5
      );
      if (debris.length >= limits.debris) removeDebris(0);
      debris.push({
        mesh: limbMesh,
        body,
        life,
        totalLife: life,
        floorY: 0.1,
        lastVerticalVelocity: velocity.y,
        impactCooldown: 0.05,
        kind: 'limb',
        bloodBouncesLeft: THREE.MathUtils.randInt(2, 4)
      });
    }

    function damageDestructible(destructibleIndex, damage, direction) {
      const destructible = destructibles[destructibleIndex];
      if (!destructible) return;

      const damageMul = destructible.type === 'crate' ? 0.9 : (destructible.type === 'barrel' ? 1.25 : 0.75);
      destructible.hp -= damage * damageMul;
      const hitDir = direction || new THREE.Vector3(0, 0, 1);

      if (destructible.isDynamic) {
        const currentVelocity = destructible.body.getLinearVelocity();
        const push = destructible.type === 'crate' ? 5.5 : 3.8;
        setBodyVelocity(
          destructible.body,
          currentVelocity.x() + hitDir.x * push,
          currentVelocity.y() + 1.2,
          currentVelocity.z() + hitDir.z * push
        );
      }

      if (destructible.type === 'crate') {
        applyCrateDamageVisual(destructible);
        spawnWoodSplinters(destructible.mesh.position, 10, 0.42, 20);
      } else if (destructible.type === 'barrel') {
        spawnSparkBurst(destructible.mesh.position.clone(), 0xff8f65, 10, 0.24, 18);
      } else {
        spawnSparkBurst(destructible.mesh.position.clone(), 0xb7aea1, 7, 0.18, 16);
      }

      if (destructible.hp <= 0) {
        state.score += destructible.type === 'crate' ? 20 : 12;
        destroyDestructible(destructibleIndex, hitDir);
      }
    }

    function applyCrateDamageVisual(crate) {
      if (!crate || !crate.mesh || !crate.mesh.material || !crate.mesh.material.color) return;
      crate.damaged = true;
      const remaining = Math.max(0, crate.hp / crate.maxHp);
      const damageT = 1 - remaining;
      const color = crate.mesh.material.color;
      color.setRGB(
        0.41 - damageT * 0.19,
        0.29 - damageT * 0.16,
        0.18 - damageT * 0.12
      );
      crate.mesh.material.roughness = 0.8 + damageT * 0.16;
    }

    function destroyDestructible(destructibleIndex, direction, options) {
      const destructible = destructibles[destructibleIndex];
      if (!destructible) return;
      const opts = options || {};
      const hitDirection = direction ? direction.clone().normalize() : new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(1),
        0.1,
        THREE.MathUtils.randFloatSpread(1)
      ).normalize();

      const fragmentCount = THREE.MathUtils.randInt(destructible.fragmentMin, destructible.fragmentMax);
      spawnDestructionFragments(destructible, hitDirection, fragmentCount);

      if (destructible.type === 'crate') {
        spawnWoodSplinters(destructible.mesh.position, 24, 0.62, 34);
      } else if (destructible.type === 'barrel') {
        spawnSparkBurst(destructible.mesh.position.clone(), 0xff8b4a, 24, 0.42, 36);
        applyRadialImpulse(destructible.mesh.position.clone(), 6.2, 20, 9);
      } else {
        spawnSparkBurst(destructible.mesh.position.clone(), 0xc7bba4, 10, 0.24, 20);
      }

      if (opts.clusterExplosion) {
        spawnSparkBurst(destructible.mesh.position.clone(), 0xffb65c, 18, 0.35, 30);
        applyRadialImpulse(destructible.mesh.position.clone(), 4.0, 12, 5);
      }

      removeDestructibleByRef(destructible);
    }

    function spawnDestructionFragments(destructible, direction, count) {
      const fragmentCount = scaleEffectCount(count, 3);
      const basePos = destructible.mesh.position.clone();
      for (let i = 0; i < fragmentCount; i++) {
        const scaleX = Math.max(0.14, destructible.width * THREE.MathUtils.randFloat(0.12, 0.25));
        const scaleY = Math.max(0.1, destructible.height * THREE.MathUtils.randFloat(0.08, 0.2));
        const scaleZ = Math.max(0.14, destructible.depth * THREE.MathUtils.randFloat(0.12, 0.26));
        const geometry = new THREE.BoxGeometry(scaleX, scaleY, scaleZ);

        let material;
        if (destructible.type === 'crate') {
          material = new THREE.MeshStandardMaterial({ color: 0x6f4a2d, roughness: 0.88, metalness: 0.03, transparent: true, opacity: 1 });
        } else if (destructible.type === 'barrel') {
          material = new THREE.MeshStandardMaterial({ color: 0x8f3b3b, roughness: 0.58, metalness: 0.52, transparent: true, opacity: 1 });
        } else if (destructible.type === 'rock') {
          material = new THREE.MeshStandardMaterial({ color: 0x4a4d55, roughness: 0.95, metalness: 0.02, transparent: true, opacity: 1 });
        } else {
          material = new THREE.MeshStandardMaterial({ color: 0x747982, roughness: 0.92, metalness: 0.04, transparent: true, opacity: 1 });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(basePos);
        mesh.position.add(new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(destructible.width * 0.45),
          THREE.MathUtils.randFloat(0.1, destructible.height * 0.7),
          THREE.MathUtils.randFloatSpread(destructible.depth * 0.45)
        ));
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        const shape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(scaleX * 0.5, scaleY * 0.5, scaleZ * 0.5));
        shape.setMargin(0.02);
        const fragmentMass = THREE.MathUtils.randFloat(0.3, 1.2);
        const body = createRigidBody(mesh, shape, fragmentMass);
        body.setFriction(0.84);
        body.setDamping(0.16, 0.62);
        body.setActivationState(4);

        const velocity = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1),
          Math.random() * 0.9 + 0.25,
          THREE.MathUtils.randFloatSpread(1)
        );
        velocity.addScaledVector(direction, 1.1 + Math.random() * 1.7).normalize();
        velocity.multiplyScalar(12 + Math.random() * 16);
        setBodyVelocity(body, velocity.x, velocity.y, velocity.z);

        const angular = new AmmoLib.btVector3(
          THREE.MathUtils.randFloatSpread(14),
          THREE.MathUtils.randFloatSpread(14),
          THREE.MathUtils.randFloatSpread(14)
        );
        body.setAngularVelocity(angular);
        AmmoLib.destroy(angular);

        const life = 3 + Math.random() * 2;
        if (debris.length >= limits.debris) removeDebris(0);
        debris.push({
          mesh,
          body,
          life,
          totalLife: life,
          floorY: 0.1,
          lastVerticalVelocity: velocity.y,
          impactCooldown: 0.2
        });
      }
    }

    function applyRadialImpulse(origin, radius, strength, upwardBoost) {
      tmpRadialProcessedBodies.clear();

      for (let i = 0; i < dynamicObjects.length; i++) {
        const object = dynamicObjects[i];
        const body = object.userData.physicsBody;
        if (!body || tmpRadialProcessedBodies.has(body)) continue;
        tmpRadialProcessedBodies.add(body);
        applyRadialImpulseToBody(body, object.position, origin, radius, strength, upwardBoost);
      }

      for (let zombieIndex = 0; zombieIndex < zombies.length; zombieIndex++) {
        const zombie = zombies[zombieIndex];
        if (!zombie || !zombie.body || tmpRadialProcessedBodies.has(zombie.body)) continue;
        tmpRadialProcessedBodies.add(zombie.body);
        applyRadialImpulseToBody(zombie.body, zombie.root.position, origin, radius, strength, upwardBoost);
      }
    }

    function applyRadialImpulseToBody(body, position, origin, radius, strength, upwardBoost) {
      tmpRadialDelta.subVectors(position, origin);
      const dist = tmpRadialDelta.length();
      if (dist < 0.001 || dist > radius) return;

      const falloff = 1 - dist / radius;
      tmpRadialDelta.multiplyScalar(1 / dist);
      const impulse = (strength || 10) * falloff;
      const currentVelocity = body.getLinearVelocity();
      setBodyVelocity(
        body,
        currentVelocity.x() + tmpRadialDelta.x * impulse,
        currentVelocity.y() + (upwardBoost || 3.5) * falloff,
        currentVelocity.z() + tmpRadialDelta.z * impulse
      );
    }

    function removeDestructibleByRef(destructible) {
      if (!destructible) return;

      const destructibleIndex = destructibles.indexOf(destructible);
      if (destructibleIndex >= 0) destructibles.splice(destructibleIndex, 1);

      const crateIndex = crates.indexOf(destructible);
      if (crateIndex >= 0) crates.splice(crateIndex, 1);

      const surfaceIndex = splatterSurfaces.indexOf(destructible.mesh);
      if (surfaceIndex >= 0) splatterSurfaces.splice(surfaceIndex, 1);

      if (destructible.mesh.material && typeof destructible.mesh.material.dispose === 'function') {
        destructible.mesh.material.dispose();
      }
      removePhysicsObject(destructible.mesh, destructible.body);
    }

    function triggerZombieDeath(zombieIndex, direction, hitPoint) {
      const zombie = zombies[zombieIndex];
      if (!zombie || zombie.isDying) return;
      zombie.isDying = true;
      if (!zombie.scored) onZombieKilled(zombie, hitPoint || zombie.root.position.clone());

      const deathDir = direction
        ? direction.clone().normalize()
        : new THREE.Vector3(THREE.MathUtils.randFloatSpread(1), 0, THREE.MathUtils.randFloatSpread(1)).normalize();

      spawnZombieDeathGore(zombie, deathDir, hitPoint || zombie.root.position.clone());
      registerZombieDeath(zombie.root.position.clone());
      spawnTransientPointLight(0xff1010, 2.0, 8, zombie.root.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0.12);

      const angularFactor = new AmmoLib.btVector3(1, 1, 1);
      zombie.body.setAngularFactor(angularFactor);
      AmmoLib.destroy(angularFactor);
      zombie.body.setDamping(0.16, 0.38);
      zombie.body.setActivationState(4);

      const currentVelocity = zombie.body.getLinearVelocity();
      setBodyVelocity(
        zombie.body,
        currentVelocity.x() + deathDir.x * 8.5,
        -6 - Math.random() * 3.5,
        currentVelocity.z() + deathDir.z * 8.5
      );

      const angular = new AmmoLib.btVector3(
        THREE.MathUtils.randFloatSpread(9),
        THREE.MathUtils.randFloatSpread(9),
        THREE.MathUtils.randFloatSpread(9)
      );
      zombie.body.setAngularVelocity(angular);
      AmmoLib.destroy(angular);

      makeZombieMaterialsFadeable(zombie.root);

      const corpseLife = 1.5 + Math.random();
      deadZombies.push({
        zombie,
        life: corpseLife,
        totalLife: corpseLife,
        fadeStart: 0.8
      });
      zombies.splice(zombieIndex, 1);
    }

    function makeZombieMaterialsFadeable(root) {
      root.traverse((node) => {
        if (!node.isMesh || !node.material) return;
        node.material = node.material.clone();
        node.material.transparent = true;
        node.material.opacity = 1;
      });
    }

    function hideAllScreens() {
      for (let i = 0; i < hud.screenNodes.length; i++) {
        hud.screenNodes[i].classList.remove('active');
      }
    }

    function setHudVisible(visible) {
      if (!hud.hudRoot) return;
      hud.hudRoot.classList.toggle('hidden', !visible);
    }

    function showScreen(name) {
      hideAllScreens();
      const screen = hud.screens[name];
      if (!screen) return;
      screen.classList.add('active');
      menuState.current = name;
      hud.overlay.classList.remove('hidden');
      setHudVisible(name === 'pause' || name === 'gameover' || name === 'upgrade');
    }

    function initMenu() {
      const existingScores = loadHighscores();
      if (existingScores.length) {
        state.highScore = Math.max(state.highScore, Number(existingScores[0].score || 0));
      }
      if (hud.goNewHighscore) hud.goNewHighscore.classList.add('hidden');
      updateMainMenuLastRun();
      renderHighscores();
      showScreen('main');
      setHudVisible(false);
      switchWeapon(state.weaponKey);
      updateHud();

      const btnPlay = document.getElementById('btn-play');
      const btnOpenSettings = document.getElementById('btn-open-settings');
      const btnOpenHighscores = document.getElementById('btn-open-highscores');
      const btnSettingsBack = document.getElementById('btn-settings-back');
      const btnHighscoresBack = document.getElementById('btn-highscores-back');
      const btnClearHighscores = document.getElementById('btn-clear-highscores');
      const btnFullscreen = document.getElementById('btn-fullscreen');
      const btnResume = document.getElementById('btn-resume');
      const btnRestart = document.getElementById('btn-restart');
      const btnMainFromPause = document.getElementById('btn-mainmenu-from-pause');
      const btnRetry = document.getElementById('btn-retry');
      const btnMainFromGameOver = document.getElementById('btn-mainmenu-from-gameover');

      if (btnPlay) btnPlay.addEventListener('click', startNewRun);
      if (btnOpenSettings) btnOpenSettings.addEventListener('click', () => showScreen('settings'));
      if (btnOpenHighscores) btnOpenHighscores.addEventListener('click', () => {
        renderHighscores();
        showScreen('highscores');
      });
      if (btnSettingsBack) btnSettingsBack.addEventListener('click', () => showScreen('main'));
      if (btnHighscoresBack) btnHighscoresBack.addEventListener('click', () => showScreen('main'));
      if (btnFullscreen) btnFullscreen.addEventListener('click', () => {
        if (document.fullscreenElement) return;
        document.documentElement.requestFullscreen().catch(() => {});
      });
      if (btnResume) btnResume.addEventListener('click', resumeGame);
      if (btnRestart) btnRestart.addEventListener('click', () => restartSession(true));
      if (btnMainFromPause) btnMainFromPause.addEventListener('click', () => restartSession(false));
      if (btnRetry) btnRetry.addEventListener('click', () => restartSession(true));
      if (btnMainFromGameOver) btnMainFromGameOver.addEventListener('click', () => restartSession(false));

      let clearConfirmArmed = false;
      let clearConfirmTimer = null;
      if (btnClearHighscores) {
        btnClearHighscores.addEventListener('click', () => {
          if (!clearConfirmArmed) {
            clearConfirmArmed = true;
            btnClearHighscores.textContent = 'WIRKLICH LÖSCHEN';
            if (clearConfirmTimer) window.clearTimeout(clearConfirmTimer);
            clearConfirmTimer = window.setTimeout(() => {
              clearConfirmArmed = false;
              btnClearHighscores.textContent = 'ALLE LÖSCHEN';
            }, 3200);
            return;
          }
          clearConfirmArmed = false;
          btnClearHighscores.textContent = 'ALLE LÖSCHEN';
          if (clearConfirmTimer) window.clearTimeout(clearConfirmTimer);
          window.localStorage.removeItem(storageKeys.highscores);
          window.localStorage.removeItem(storageKeys.highscore);
          window.localStorage.removeItem(storageKeys.lastRun);
          state.highScore = 0;
          renderHighscores();
          updateMainMenuLastRun();
          updateHud();
        });
      }

      if (hud.settingSensitivity) {
        hud.settingSensitivity.addEventListener('input', () => {
          const value = Number(hud.settingSensitivity.value || 1);
          state.settings.sensitivity = THREE.MathUtils.clamp(value, 0.5, 3.0);
          if (hud.settingSensitivityValue) hud.settingSensitivityValue.textContent = state.settings.sensitivity.toFixed(2);
          saveSettings();
        });
      }

      for (let i = 0; i < hud.qualityButtons.length; i++) {
        const btn = hud.qualityButtons[i];
        btn.addEventListener('click', () => {
          const level = btn.getAttribute('data-quality') || 'medium';
          applyQualitySettings(level);
          saveSettings();
        });
      }

      const autoStart = window.sessionStorage.getItem('ammotest_autostart');
      if (autoStart) {
        window.sessionStorage.removeItem('ammotest_autostart');
        if (autoStart === '1') startNewRun();
      }
    }

    function loadSettings() {
      let parsed = null;
      try {
        parsed = JSON.parse(window.localStorage.getItem(storageKeys.settings) || '{}');
      } catch (error) {
        parsed = null;
      }
      state.settings.sensitivity = THREE.MathUtils.clamp(Number(parsed && parsed.sensitivity) || 1, 0.5, 3.0);
      state.settings.quality = (parsed && parsed.quality) || 'medium';

      if (hud.settingSensitivity) hud.settingSensitivity.value = state.settings.sensitivity.toFixed(2);
      if (hud.settingSensitivityValue) hud.settingSensitivityValue.textContent = state.settings.sensitivity.toFixed(2);
      applyQualitySettings(state.settings.quality);
    }

    function saveSettings() {
      window.localStorage.setItem(storageKeys.settings, JSON.stringify({
        sensitivity: state.settings.sensitivity,
        quality: state.settings.quality
      }));
    }

    function applyQualitySettings(level) {
      const quality = level === 'low' || level === 'high' ? level : 'medium';
      state.settings.quality = quality;

      const enableShadows = quality !== 'low';
      renderer.shadowMap.enabled = enableShadows;
      lightRig.sun.castShadow = enableShadows;

      const shadowSize = quality === 'high' ? 2048 : (quality === 'medium' ? 1024 : 512);
      lightRig.sun.shadow.mapSize.set(shadowSize, shadowSize);

      for (let i = 0; i < streetLampLights.length; i++) {
        const lamp = streetLampLights[i];
        lamp.castShadow = enableShadows && i < LAMP_SHADOW_LIMIT;
        if (lamp.castShadow) {
          lamp.shadow.mapSize.set(Math.min(shadowSize, 1024), Math.min(shadowSize, 1024));
        }
      }

      if (postfx && postfx.ssaoPass) {
        postfx.ssaoPass.enabled = quality === 'high';
      }

      for (let i = 0; i < hud.qualityButtons.length; i++) {
        const btn = hud.qualityButtons[i];
        const btnLevel = btn.getAttribute('data-quality');
        btn.classList.toggle('active', btnLevel === quality);
      }
    }

    function loadHighscores() {
      let entries = [];
      try {
        entries = JSON.parse(window.localStorage.getItem(storageKeys.highscores) || '[]');
      } catch (error) {
        entries = [];
      }
      if (!Array.isArray(entries)) return [];
      entries.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
      return entries.slice(0, 5);
    }

    function saveHighscore(score, wave) {
      const entry = {
        score: Math.max(0, Math.round(score || 0)),
        wave: Math.max(1, Math.round(wave || 1)),
        kills: Math.max(0, Math.round(state.totalKills || 0)),
        timeSec: Math.max(0, Math.round(state.runTimeSec || 0)),
        date: new Date().toISOString()
      };
      const entries = loadHighscores();
      entries.push(entry);
      entries.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
      const top = entries.slice(0, 5);
      window.localStorage.setItem(storageKeys.highscores, JSON.stringify(top));
      window.localStorage.setItem(storageKeys.lastRun, JSON.stringify(entry));

      const bestScore = top.length ? Number(top[0].score || 0) : 0;
      state.highScore = Math.max(state.highScore, bestScore);
      window.localStorage.setItem(storageKeys.highscore, String(state.highScore));
      return top;
    }

    function updateMainMenuLastRun() {
      if (!hud.mainLastRun) return;
      let lastRun = null;
      try {
        lastRun = JSON.parse(window.localStorage.getItem(storageKeys.lastRun) || 'null');
      } catch (error) {
        lastRun = null;
      }
      if (!lastRun) {
        if (progression) {
          const p = progression.getData();
          hud.mainLastRun.textContent = 'Letzter Lauf: Kein Eintrag · Meta ' + Math.floor(p.metaPoints);
        } else {
          hud.mainLastRun.textContent = 'Letzter Lauf: Kein Eintrag';
        }
        return;
      }
      if (progression) {
        const p = progression.getData();
        hud.mainLastRun.textContent = 'Letzter Lauf: Score ' + (lastRun.score || 0) + ' · Welle ' + (lastRun.wave || 1) + ' · Meta ' + Math.floor(p.metaPoints);
      } else {
        hud.mainLastRun.textContent = 'Letzter Lauf: Score ' + (lastRun.score || 0) + ' · Welle ' + (lastRun.wave || 1);
      }
    }

    function renderHighscores() {
      if (!hud.highscoresList) return;
      const entries = loadHighscores();
      if (!entries.length) {
        hud.highscoresList.innerHTML = '<p>Noch keine Einträge.</p>';
        return;
      }

      hud.highscoresList.innerHTML = entries.map((entry, index) => {
        const date = entry.date ? new Date(entry.date).toLocaleDateString('de-DE') : '-';
        return (
          '<div class="highscore-row">' +
            '<span>#' + (index + 1) + '</span>' +
            '<span>Score ' + (entry.score || 0) + '</span>' +
            '<span>Welle ' + (entry.wave || 1) + '</span>' +
            '<span>' + date + '</span>' +
          '</div>'
        );
      }).join('');
    }

    function startNewRun() {
      state.running = true;
      state.paused = false;
      state.upgradeMode = false;
      state.mouseDown = false;
      if (!state.runStartedAtMs) state.runStartedAtMs = performance.now();
      hud.overlay.classList.add('hidden');
      setHudVisible(true);
      if (clock) clock.getDelta();
    }

    function pauseGame() {
      if (!state.running) return;
      state.running = false;
      state.paused = true;
      state.mouseDown = false;
      if (hud.pauseScore) hud.pauseScore.textContent = String(state.score);
      if (hud.pauseWave) hud.pauseWave.textContent = String(state.wave);
      showScreen('pause');
    }

    function resumeGame() {
      if (menuState.current !== 'pause') return;
      state.paused = false;
      state.running = true;
      state.mouseDown = false;
      hud.overlay.classList.add('hidden');
      setHudVisible(true);
      if (clock) clock.getDelta();
    }

    function restartSession(autoStart) {
      window.sessionStorage.setItem('ammotest_autostart', autoStart ? '1' : '0');
      window.location.reload();
    }

    function formatTime(totalSeconds) {
      const sec = Math.max(0, Math.floor(totalSeconds || 0));
      const min = Math.floor(sec / 60);
      const rest = sec % 60;
      return String(min).padStart(2, '0') + ':' + String(rest).padStart(2, '0');
    }

    function getXpNeededForLevel(level) {
      return Math.max(100, Math.floor(100 * Math.pow(level, 1.35)));
    }

    function grantXp(amount, sourcePosition) {
      const xpGain = Math.max(0, Math.round(amount || 0));
      if (xpGain <= 0) return;
      state.xp += xpGain;

      while (state.xp >= state.nextLevelXp) {
        state.xp -= state.nextLevelXp;
        state.level += 1;
        state.perkPoints += 1;
        state.nextLevelXp = getXpNeededForLevel(state.level);
        state.health = Math.min(state.maxHealth, state.health + 12);
        addFloatingScore((sourcePosition || player.root.position).clone().add(new THREE.Vector3(0, 2.1, 0)), 'LEVEL UP ' + state.level, '#8be7ff');
      }
    }

    function updateSkills(dt) {
      const adrenaline = state.skills.adrenaline;
      const shockwave = state.skills.shockwave;
      if (adrenaline) {
        adrenaline.cooldown = Math.max(0, adrenaline.cooldown - dt);
        adrenaline.active = Math.max(0, adrenaline.active - dt);
      }
      if (shockwave) {
        shockwave.cooldown = Math.max(0, shockwave.cooldown - dt);
      }
    }

    function getAdrenalineActiveMul() {
      const adrenaline = state.skills.adrenaline;
      if (!adrenaline || adrenaline.active <= 0) return 1;
      return 1.34;
    }

    function tryUseSkill(skillKey) {
      const skill = state.skills[skillKey];
      if (!skill || !skill.unlocked || skill.cooldown > 0) return;

      if (skillKey === 'adrenaline') {
        skill.active = skill.duration;
        skill.cooldown = skill.cooldownMax;
        addFloatingScore(player.root.position.clone().add(new THREE.Vector3(0, 2.4, 0)), 'ADRENALIN AKTIV', '#88f0ff');
        return;
      }

      if (skillKey === 'shockwave') {
        skill.cooldown = skill.cooldownMax;
        const origin = player.root.position.clone();
        spawnSparkBurst(origin.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x98dcff, 24, 0.28, 32);
        applyRadialImpulse(origin, 7.2, 22, 8);
        addFloatingScore(origin.clone().add(new THREE.Vector3(0, 2.4, 0)), 'SCHOCKWELLE', '#9fd8ff');
      }
    }

    function getAvailablePerkOptions() {
      const options = [];
      if (!state.perks.executioner) options.push({ id: 'perk:executioner', label: '[Perk] Executioner (+18% Schaden)' });
      if (!state.perks.juggernaut) options.push({ id: 'perk:juggernaut', label: '[Perk] Juggernaut (+35 Max HP)' });
      if (!state.perks.scavenger) options.push({ id: 'perk:scavenger', label: '[Perk] Scavenger (mehr Drops/Ammo)' });
      if (!state.perks.gunslinger) options.push({ id: 'perk:gunslinger', label: '[Perk] Gunslinger (+12% Speed, +8% Feuerrate)' });
      if (!state.perks.skill_adrenaline) options.push({ id: 'perk:skill_adrenaline', label: '[Skill] Adrenalin (Q)' });
      if (!state.perks.skill_shockwave) options.push({ id: 'perk:skill_shockwave', label: '[Skill] Schockwelle (E)' });
      return options;
    }

    function applyPerkById(perkId) {
      if (perkId === 'executioner' && !state.perks.executioner) {
        state.perks.executioner = true;
        state.damageMul *= 1.18;
      }
      if (perkId === 'juggernaut' && !state.perks.juggernaut) {
        state.perks.juggernaut = true;
        state.maxHealth += 35;
        state.health = Math.min(state.maxHealth, state.health + 35);
      }
      if (perkId === 'scavenger' && !state.perks.scavenger) {
        state.perks.scavenger = true;
        state.dropChanceMul *= 1.35;
        state.ammoGainMul *= 1.3;
      }
      if (perkId === 'gunslinger' && !state.perks.gunslinger) {
        state.perks.gunslinger = true;
        state.moveSpeedMul *= 1.12;
        state.fireRateMul *= 1.08;
      }
      if (perkId === 'skill_adrenaline' && !state.perks.skill_adrenaline) {
        state.perks.skill_adrenaline = true;
        state.skills.adrenaline.unlocked = true;
      }
      if (perkId === 'skill_shockwave' && !state.perks.skill_shockwave) {
        state.perks.skill_shockwave = true;
        state.skills.shockwave.unlocked = true;
      }
    }

    function checkProgress() {
      if (!state.running || state.upgradeMode) return;
      const noWaveEntities = zombies.length === 0 && deadZombies.length === 0;
      const noPendingSpawns = state.waveSpawnRemaining <= 0;
      const objectiveDone = state.objective.completed || !state.objective.active;
      if (noWaveEntities && noPendingSpawns && objectiveDone && state.waveInProgress) {
        state.waveInProgress = false;
        openUpgradeOverlay();
      }
    }

    function openUpgradeOverlay() {
      state.running = false;
      state.upgradeMode = true;
      const options = pickUpgradeOptions(3);
      if (hud.upgradeTitle) {
        const perkInfo = state.perkPoints > 0 ? ' · Perk-Punkte: ' + state.perkPoints : '';
        hud.upgradeTitle.textContent = 'WELLE ' + state.wave + ' GESCHAFFT' + perkInfo;
      }
      if (hud.upgradeOptions) {
        hud.upgradeOptions.innerHTML = options.map((opt, index) =>
          '<button class="upgrade-btn" data-upgrade="' + opt.id + '">' + (index + 1) + '. ' + opt.label + '</button>'
        ).join('');
      }

      showScreen('upgrade');
      const buttonNodes = hud.upgradeOptions ? hud.upgradeOptions.querySelectorAll('.upgrade-btn') : [];
      buttonNodes.forEach((node) => {
        node.addEventListener('click', () => {
          const id = node.getAttribute('data-upgrade');
          applyUpgradeById(id);
          startNextWave();
        }, { once: true });
      });
    }

    function pickUpgradeOptions(count) {
      const base = Array.isArray(runtimeConfig.upgrades) && runtimeConfig.upgrades.length
        ? runtimeConfig.upgrades
        : [
        { id: 'damage', label: 'Mehr Schaden (+20%)' },
        { id: 'speed', label: 'Mehr Speed (+15%)' },
        { id: 'max_hp', label: 'Max HP +25' },
        { id: 'reload', label: 'Schnelleres Nachladen (-200ms)' },
        { id: 'reserve', label: 'Mehr Reserve (+50%)' },
        { id: 'firerate', label: 'Feuerrate +15%' },
        { id: 'mod_crit', label: 'Weapon Mod: Krit-Chance +8%' },
        { id: 'mod_brute', label: 'Weapon Mod: +22% gegen Brutes' },
        { id: 'mod_demo', label: 'Weapon Mod: +20% gegen Objekte' },
        { id: 'mod_eff', label: 'Weapon Mod: 10% Ammo-Refund' }
      ];
      const all = base.slice();
      const combatMods = [
        { id: 'mod_crit', label: 'Weapon Mod: Krit-Chance +8%' },
        { id: 'mod_brute', label: 'Weapon Mod: +22% gegen Brutes' },
        { id: 'mod_demo', label: 'Weapon Mod: +20% gegen Objekte' },
        { id: 'mod_eff', label: 'Weapon Mod: 10% Ammo-Refund' }
      ];
      for (let i = 0; i < combatMods.length; i++) {
        if (!all.find((entry) => entry.id === combatMods[i].id)) all.push(combatMods[i]);
      }

      if (state.perkPoints > 0) {
        const perkOptions = getAvailablePerkOptions();
        for (let i = 0; i < perkOptions.length; i++) {
          if (!all.find((entry) => entry.id === perkOptions[i].id)) all.push(perkOptions[i]);
        }
      }

      if (gameLogic.pickUpgradeOptions) {
        return gameLogic.pickUpgradeOptions(count, all);
      }

      const chosen = [];
      const pool = all.slice();

      if (state.perkPoints > 0) {
        const perkOptions = getAvailablePerkOptions();
        if (perkOptions.length) {
          const forcedPerk = perkOptions[Math.floor(Math.random() * perkOptions.length)];
          chosen.push(forcedPerk);
        }
        for (let i = 0; i < perkOptions.length; i++) {
          if (!chosen.find((entry) => entry.id === perkOptions[i].id)) pool.push(perkOptions[i]);
        }
      }

      while (chosen.length < count && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        chosen.push(pool[idx]);
        pool.splice(idx, 1);
      }
      return chosen;
    }

    function applyUpgradeById(id) {
      if (id && id.indexOf('perk:') === 0) {
        const perkId = id.slice(5);
        applyPerkById(perkId);
        state.perkPoints = Math.max(0, state.perkPoints - 1);
        return;
      }
      if (id === 'damage') state.damageMul *= 1.2;
      if (id === 'speed') state.moveSpeedMul *= 1.15;
      if (id === 'max_hp') {
        state.maxHealth += 25;
        state.health = Math.min(state.maxHealth, state.health + 25);
      }
      if (id === 'reload') state.reloadDelayMs = Math.max(300, state.reloadDelayMs - 200);
      if (id === 'reserve') {
        const current = state.weapons[state.weaponKey];
        current.reserve = Math.round(current.reserve * 1.5);
      }
      if (id === 'firerate') state.fireRateMul *= 1.15;
      if (id === 'mod_crit') state.critChance = Math.min(0.35, state.critChance + 0.08);
      if (id === 'mod_brute') state.bruteDamageMul = Math.min(2.1, state.bruteDamageMul * 1.22);
      if (id === 'mod_demo') state.destructibleDamageMul = Math.min(2.0, state.destructibleDamageMul * 1.2);
      if (id === 'mod_eff') state.ammoRefundChance = Math.min(0.35, state.ammoRefundChance + 0.1);
    }

    function startNextWave() {
      state.upgradeMode = false;
      if (progression) progression.onWaveCompleted(state.wave);
      state.wave += 1;
      respawnCratesForWave(state.wave);
      const currentWeapon = state.weapons[state.weaponKey];
      currentWeapon.reserve += 18;
      spawnWave(state.wave);
      startNewRun();
    }

    function respawnCratesForWave(waveLevel) {
      if (waveLevel % 3 !== 0) return;
      for (let i = 0; i < crateSpawnPoints.length; i++) {
        const spawn = crateSpawnPoints[i];
        let occupied = false;
        for (let j = 0; j < crates.length; j++) {
          const existing = crates[j];
          if (existing.mesh.position.distanceToSquared(new THREE.Vector3(spawn.x, existing.mesh.position.y, spawn.z)) < 3.2 * 3.2) {
            occupied = true;
            break;
          }
        }
        if (!occupied) {
          createBreakableCrate(spawn.width, spawn.height, spawn.depth, spawn.x, spawn.z, false);
        }
      }
    }

    function updateEffects(dt) {
      for (let index = effects.length - 1; index >= 0; index--) {
        const effect = effects[index];
        effect.life -= dt;
        const lifeT = effect.totalLife ? Math.max(0, effect.life / effect.totalLife) : 0;

        if (effect.gravity && !effect.settled) {
          effect.velocity.y -= effect.gravity * dt;
        }
        if (effect.drag) {
          const damping = Math.max(0, 1 - effect.drag * dt);
          effect.velocity.multiplyScalar(damping);
        }

        if (!effect.settled) effect.mesh.position.addScaledVector(effect.velocity, dt);
        if (effect.spin) {
          effect.mesh.rotation.x += effect.spin.x * dt;
          effect.mesh.rotation.y += effect.spin.y * dt;
          effect.mesh.rotation.z += effect.spin.z * dt;
        }
        if (effect.shrink) {
          const s = Math.max(0.08, lifeT);
          effect.mesh.scale.setScalar(s * (effect.baseScale || 1));
        }
        if (effect.floorY !== undefined && effect.mesh.position.y <= effect.floorY) {
          effect.mesh.position.y = effect.floorY;
          if (effect.settle) {
            effect.velocity.set(0, 0, 0);
            effect.gravity = 0;
            effect.spin = null;
            effect.settled = true;
          }
        }
        if (effect.mesh.material && 'opacity' in effect.mesh.material) {
          if (effect.totalLife) {
            effect.mesh.material.opacity = Math.max(0, (effect.baseOpacity || 1) * lifeT);
          } else {
            effect.mesh.material.opacity = Math.max(0, effect.life * effect.fade);
          }
        }

        if (effect.life <= 0) {
          removeEffect(index);
        }
      }
    }

    function updateDecals(dt) {
      for (let index = decals.length - 1; index >= 0; index--) {
        const decal = decals[index];
        decal.life -= dt;

        const lifeT = Math.max(0, decal.life / decal.totalLife);
        const fadeStart = Math.max(0.05, Math.min(1, decal.fadeStart || 1));
        const fadeT = fadeStart >= 0.999
          ? lifeT
          : (lifeT >= fadeStart ? 1 : lifeT / fadeStart);
        const baseOpacity = decal.baseOpacity !== undefined ? decal.baseOpacity : 0.72;
        decal.mesh.material.opacity = Math.max(0, baseOpacity * fadeT);

        if (decal.life <= 0) {
          removeDecal(index);
        }
      }
    }

    function updateDebris(dt) {
      for (let index = debris.length - 1; index >= 0; index--) {
        const piece = debris[index];
        piece.life -= dt;
        piece.impactCooldown -= dt;

        const velocity = piece.body.getLinearVelocity();
        const vy = velocity.y();
        if (
          piece.impactCooldown <= 0 &&
          piece.lastVerticalVelocity < -3.5 &&
          vy > -1.1 &&
          piece.mesh.position.y <= 1.05
        ) {
          if (piece.kind === 'limb') {
            const bloodChance = Math.max(0, Math.min(1, Number(goreConfig.impactBloodChance) || 0.55));
            if ((piece.bloodBouncesLeft || 0) > 0 && Math.random() < bloodChance) {
              piece.bloodBouncesLeft -= 1;
              spawnBloodMist(piece.mesh.position.clone(), THREE.MathUtils.randInt(3, 5));
              spawnBloodDecal(piece.mesh.position.clone(), 0.14 + Math.random() * 0.18);
            }
            spawnDustPuff(piece.mesh.position.clone(), THREE.MathUtils.randInt(2, 4));
          } else {
            spawnDustBurst(piece.mesh.position.clone(), THREE.MathUtils.randInt(6, 10));
          }
          piece.impactCooldown = 0.28;
        }
        piece.lastVerticalVelocity = vy;

        if (piece.life <= 1.0) {
          const opacity = Math.max(0, piece.life / 1.0);
          if (piece.mesh.material && 'opacity' in piece.mesh.material) {
            piece.mesh.material.opacity = opacity;
          }
        }

        if (piece.life <= 0) {
          removeDebris(index);
        }
      }
    }

    function updateZombieDeathEvents(dt) {
      for (let index = zombieDeathEvents.length - 1; index >= 0; index--) {
        zombieDeathEvents[index].life -= dt;
        if (zombieDeathEvents[index].life <= 0) zombieDeathEvents.splice(index, 1);
      }

      for (let index = crates.length - 1; index >= 0; index--) {
        const crate = crates[index];
        if (!crate) continue;
        crate.clusterCooldown = Math.max(0, (crate.clusterCooldown || 0) - dt);
        if (crate.clusterCooldown > 0) continue;

        const clusterCount = countZombieDeathsNear(crate.mesh.position, 4.0);
        if (clusterCount >= 3) {
          crate.clusterCooldown = 1.2;
          const destructibleIndex = destructibles.indexOf(crate);
          if (destructibleIndex >= 0) {
            destroyDestructible(
              destructibleIndex,
              new THREE.Vector3(THREE.MathUtils.randFloatSpread(1), 0, THREE.MathUtils.randFloatSpread(1)).normalize(),
              { clusterExplosion: true }
            );
          }
        }
      }
    }

    function getCurrentWeaponDef() {
      return weaponDefs[state.weaponKey];
    }

    function getCurrentWeaponState() {
      return state.weapons[state.weaponKey];
    }

    function switchWeapon(weaponKey) {
      if (!state.weapons[weaponKey] || !state.weapons[weaponKey].unlocked) return;
      const changed = state.weaponKey !== weaponKey;
      state.weaponKey = weaponKey;
      buildWeaponModel(player.gunPivot, state.weaponKey);
      state.reloading = false;
      if (changed) state.lastShotMs = 0;
      updateHud();
    }

    function updateWeaponPickups(dt) {
      for (let i = weaponPickups.length - 1; i >= 0; i--) {
        const pickup = weaponPickups[i];
        if (!pickup.group) continue;
        pickup.group.rotation.y += dt * 1.6;
        pickup.group.position.y = 0.95 + Math.sin(performance.now() * 0.003 + i) * 0.1;

        if (pickup.group.position.distanceTo(player.root.position) < 1.8) {
          unlockWeapon(pickup.weaponKey);
          addFloatingScore(pickup.group.position.clone().add(new THREE.Vector3(0, 1, 0)), pickup.weaponKey.toUpperCase() + ' freigeschaltet', '#9fe3ff');
          scene.remove(pickup.group);
          if (pickup.core.material) pickup.core.material.dispose();
          if (pickup.halo.material) pickup.halo.material.dispose();
          weaponPickups.splice(i, 1);
        }
      }
    }

    function unlockWeapon(weaponKey) {
      const weapon = state.weapons[weaponKey];
      if (!weapon) return;
      weapon.unlocked = true;
      const def = weaponDefs[weaponKey];
      weapon.ammo = Math.max(weapon.ammo, def.magazine);
      weapon.reserve = Math.max(weapon.reserve, def.magazine * 3);
      if (progression) progression.recordWeaponUnlock(weaponKey);
      switchWeapon(weaponKey);
    }

    function onZombieKilled(zombie, hitPoint) {
      if (zombie) zombie.scored = true;
      state.totalKills += 1;
      if (state.objective.active && !state.objective.completed && state.objective.active.id === 'slayer') {
        state.objective.progress += 1;
        if (state.objective.progress >= Number(state.objective.active.targetKills || 0)) {
          completeObjective();
        }
      }
      const now = performance.now();
      if (now - state.lastKillMs < 1800) {
        state.comboMultiplier = Math.min(5, state.comboMultiplier + 1);
        state.killStreak += 1;
        state.comboPulse = 0.35;
      } else {
        state.comboMultiplier = 1;
        state.killStreak = 1;
      }
      state.lastKillMs = now;
      state.comboTimer = 1.8;

      const baseScore = zombie && zombie.scoreValue ? zombie.scoreValue : 130;
      const gained = Math.round(baseScore * state.comboMultiplier);
      state.score += gained;
      const xpGain = Math.round(baseScore * (0.16 + (state.comboMultiplier - 1) * 0.04));
      grantXp(xpGain, hitPoint || (zombie ? zombie.root.position : player.root.position));
      if (state.score > state.highScore) {
        state.highScore = state.score;
        window.localStorage.setItem(storageKeys.highscore, String(state.highScore));
      }

      if (state.perks.scavenger) {
        state.health = Math.min(state.maxHealth, state.health + 2);
      }

      addFloatingScore((hitPoint || zombie.root.position).clone().add(new THREE.Vector3(0, 1.25, 0)), '+' + gained, '#ffd58b');
      trySpawnDrop((hitPoint || zombie.root.position).clone());

      if (state.killStreak === 5) announceSpree('KILLING SPREE');
      if (state.killStreak === 10) announceSpree('UNSTOPPABLE');
      if (state.killStreak === 20) announceSpree('GODLIKE');
    }

    function addFloatingScore(worldPos, text, color) {
      const node = document.createElement('div');
      node.className = 'floating-score';
      node.textContent = text;
      node.style.color = color || '#ffd58b';
      hud.floatingLayer.appendChild(node);
      floatingScores.push({
        worldPos: worldPos.clone(),
        life: 1.1,
        totalLife: 1.1,
        node
      });
    }

    function updateFloatingScores(dt) {
      for (let i = floatingScores.length - 1; i >= 0; i--) {
        const item = floatingScores[i];
        item.life -= dt;
        item.worldPos.y += dt * 0.9;
        const projected = projectedScoreVector.copy(item.worldPos).project(camera);
        const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
        item.node.style.left = x + 'px';
        item.node.style.top = y + 'px';
        item.node.style.opacity = String(Math.max(0, item.life / item.totalLife));
        item.node.style.transform = 'translate(-50%, -50%) scale(' + (0.92 + 0.12 * (item.life / item.totalLife)) + ')';
        if (item.life <= 0) {
          if (item.node.parentNode) item.node.parentNode.removeChild(item.node);
          floatingScores.splice(i, 1);
        }
      }
    }

    function updateComboAndStreak(dt) {
      state.comboPulse = Math.max(0, state.comboPulse - dt);
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) {
          state.comboMultiplier = 1;
          state.killStreak = 0;
        }
      }
      if (state.spreeTimer > 0) {
        state.spreeTimer -= dt;
        if (state.spreeTimer <= 0) state.spreeText = '';
      }
    }

    function announceSpree(text) {
      state.spreeText = text;
      state.spreeTimer = 1.5;
      addFloatingScore(player.root.position.clone().add(new THREE.Vector3(0, 2.6, 0)), text, '#ffb25f');
    }

    function addCameraShake(amount) {
      state.shakePower = Math.min(0.3, state.shakePower + amount);
    }

    function updatePlayerFeedback(dt) {
      state.shakePower = Math.max(0, state.shakePower - dt * 0.9);
      state.hitFlash = Math.max(0, state.hitFlash - dt * 1.8);
      if (hud.hitFlash) {
        hud.hitFlash.style.opacity = String(Math.min(0.35, state.hitFlash));
      }
    }

    function trySpawnDrop(position) {
      const maxDrops = Number(runtimeConfig.drops && runtimeConfig.drops.maxItems) || 10;
      if (itemDrops.length >= maxDrops) return;
      let table = runtimeConfig.drops && Array.isArray(runtimeConfig.drops.table)
        ? runtimeConfig.drops.table
        : [{ type: 'heal', chance: 0.18 }, { type: 'ammo', chance: 0.08 }, { type: 'armor', chance: 0.06 }];

      if (state.dropChanceMul !== 1) {
        table = table.map((entry) => ({
          type: entry.type,
          chance: Math.min(0.8, Math.max(0, Number(entry.chance || 0) * state.dropChanceMul))
        }));
      }

      let type = gameLogic.rollDropType ? gameLogic.rollDropType(table) : null;
      if (!type && !gameLogic.rollDropType) {
        const roll = Math.random();
        let accum = 0;
        for (let i = 0; i < table.length; i++) {
          accum += Math.max(0, Number(table[i].chance || 0));
          if (roll < accum) {
            type = table[i].type;
            break;
          }
        }
      }
      if (type) {
        spawnItemDrop(type, position.clone());
      }
    }

    function spawnItemDrop(type, position) {
      const color = type === 'heal' ? 0x5aff7f : (type === 'armor' ? 0x5ac8ff : 0xffd95a);
      let geometry;
      if (type === 'heal') {
        geometry = new THREE.BoxGeometry(0.65, 0.65, 0.65);
      } else if (type === 'armor') {
        geometry = new THREE.BoxGeometry(0.7, 0.5, 0.35);
      } else {
        geometry = new THREE.CylinderGeometry(0.28, 0.28, 0.72, 12);
      }
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.72,
          roughness: 0.25,
          metalness: 0.45,
          transparent: true,
          opacity: 1
        })
      );
      mesh.position.copy(position);
      mesh.position.y = 0.9;
      mesh.castShadow = true;
      scene.add(mesh);
      itemDrops.push({ type, mesh, life: 14, totalLife: 14, spin: THREE.MathUtils.randFloat(1.2, 2.4) });
    }

    function updateItemDrops(dt) {
      for (let i = itemDrops.length - 1; i >= 0; i--) {
        const drop = itemDrops[i];
        drop.life -= dt;
        drop.mesh.rotation.y += dt * drop.spin;
        drop.mesh.position.y = 0.9 + Math.sin(performance.now() * 0.005 + i) * 0.08;

        if (drop.life < 2 && drop.mesh.material) {
          drop.mesh.material.opacity = Math.max(0, drop.life / 2);
        }

        if (drop.mesh.position.distanceTo(player.root.position) < 1.6) {
          if (drop.type === 'heal') {
            state.health = Math.min(state.maxHealth, state.health + 25);
            addFloatingScore(player.root.position.clone().add(new THREE.Vector3(0, 2.1, 0)), '+25 HP', '#8bffab');
          } else if (drop.type === 'armor') {
            state.armor = Math.min(state.maxArmor, state.armor + 35);
            addFloatingScore(player.root.position.clone().add(new THREE.Vector3(0, 2.1, 0)), '+35 Rüstung', '#5ac8ff');
          } else {
            const weapon = getCurrentWeaponState();
            const ammoGain = Math.max(8, Math.round(12 * state.ammoGainMul));
            weapon.reserve += ammoGain;
            addFloatingScore(player.root.position.clone().add(new THREE.Vector3(0, 2.1, 0)), '+' + ammoGain + ' Ammo', '#ffe18f');
          }
          scene.remove(drop.mesh);
          if (drop.mesh.material) drop.mesh.material.dispose();
          if (drop.mesh.geometry) drop.mesh.geometry.dispose();
          itemDrops.splice(i, 1);
          continue;
        }

        if (drop.life <= 0) {
          scene.remove(drop.mesh);
          if (drop.mesh.material) drop.mesh.material.dispose();
          if (drop.mesh.geometry) drop.mesh.geometry.dispose();
          itemDrops.splice(i, 1);
        }
      }
    }

    function countZombieDeathsNear(position, radius) {
      const radiusSq = radius * radius;
      let count = 0;
      for (let index = 0; index < zombieDeathEvents.length; index++) {
        if (zombieDeathEvents[index].position.distanceToSquared(position) <= radiusSq) count++;
      }
      return count;
    }

    function updateHeavyImpactBursts(dt) {
      for (let index = 0; index < destructibles.length; index++) {
        const destructible = destructibles[index];
        if (!destructible.isDynamic) continue;
        destructible.impactCooldown = Math.max(0, destructible.impactCooldown - dt);

        const velocity = destructible.body.getLinearVelocity();
        const vy = velocity.y();
        if (
          destructible.impactCooldown <= 0 &&
          destructible.lastVerticalVelocity < -3.5 &&
          vy > -1.1 &&
          destructible.mesh.position.y <= (destructible.height * 0.5 + 0.4)
        ) {
          spawnDustBurst(destructible.mesh.position.clone(), THREE.MathUtils.randInt(6, 10));
          destructible.impactCooldown = 0.32;
        }
        destructible.lastVerticalVelocity = vy;
      }
    }

    function registerZombieDeath(position) {
      zombieDeathEvents.push({ position: position.clone(), life: 1.1 });
      if (zombieDeathEvents.length > 40) zombieDeathEvents.splice(0, zombieDeathEvents.length - 40);
    }

    function acquirePooledEffectMesh(poolKey, createFn) {
      const mesh = effectMeshPool ? effectMeshPool.acquire(poolKey, createFn) : createFn();
      mesh.visible = true;
      scene.add(mesh);
      return mesh;
    }

    function removeDebris(index) {
      const piece = debris[index];
      if (!piece) return;
      removePhysicsObject(piece.mesh, piece.body);
      if (piece.mesh.material && typeof piece.mesh.material.dispose === 'function') {
        piece.mesh.material.dispose();
      }
      if (piece.mesh.geometry && typeof piece.mesh.geometry.dispose === 'function') {
        piece.mesh.geometry.dispose();
      }
      debris.splice(index, 1);
    }

    function spawnSparkBurst(origin, color, count, life, speed) {
      const particleCount = scaleEffectCount(count, 4);
      for (let i = 0; i < particleCount; i++) {
        const poolKey = 'spark_' + color;
        const mesh = acquirePooledEffectMesh(poolKey, () => new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 6, 6),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
        ));
        mesh.material.color.setHex(color);
        mesh.material.opacity = 1;
        mesh.position.copy(origin);

        const velocity = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1),
          Math.random() * 0.8 + 0.25,
          THREE.MathUtils.randFloatSpread(1)
        ).normalize().multiplyScalar(speed * (0.55 + Math.random() * 0.65));

        pushEffect({ mesh, velocity, life: life * (0.7 + Math.random() * 0.8), fade: 2.8, gravity: 18, poolKey });
      }
    }

    function spawnDustBurst(origin, count) {
      const particleCount = scaleEffectCount(count, 4);
      for (let i = 0; i < particleCount; i++) {
        const size = 0.06 + Math.random() * 0.1;
        const poolKey = 'dust';
        const mesh = acquirePooledEffectMesh(poolKey, () => new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xc8b89a, transparent: true, opacity: 0.84 })
        ));
        mesh.material.opacity = 0.84;
        mesh.scale.setScalar(size / 0.12);
        mesh.position.copy(origin);
        mesh.position.y = Math.max(0.12, origin.y * 0.4);

        const velocity = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1),
          Math.random() * 0.8 + 0.18,
          THREE.MathUtils.randFloatSpread(1)
        ).normalize().multiplyScalar(6 + Math.random() * 8);

        const totalLife = 0.24 + Math.random() * 0.3;
        pushEffect({
          mesh,
          velocity,
          life: totalLife,
          totalLife,
          baseOpacity: 0.8,
          gravity: 12,
          drag: 3.1,
          shrink: true,
          poolKey
        });
      }
    }

    function spawnDustPuff(origin, count) {
      const particleCount = scaleEffectCount(count || 4, 2);
      for (let i = 0; i < particleCount; i++) {
        const size = 0.05 + Math.random() * 0.06;
        const poolKey = 'dust_puff';
        const dust = acquirePooledEffectMesh(poolKey, () => new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 5, 5),
          new THREE.MeshBasicMaterial({ color: 0xc8b89a, transparent: true, opacity: 0.6 })
        ));
        dust.material.opacity = 0.6;
        dust.scale.setScalar(size / 0.1);
        dust.position.copy(origin);
        dust.position.y += 0.05 + Math.random() * 0.06;
        const totalLife = 0.24 + Math.random() * 0.2;
        pushEffect({
          mesh: dust,
          velocity: new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(0.9),
            0.25 + Math.random() * 0.2,
            THREE.MathUtils.randFloatSpread(0.9)
          ),
          life: totalLife,
          totalLife,
          baseOpacity: 0.6,
          drag: 3.4,
          poolKey
        });
      }
    }

    function spawnImpactDecal(position, normal) {
      enforceDecalLimit(140, 'impact');
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 0.15),
        materials.impactDecal.clone()
      );
      const safeNormal = getSafeDecalNormal(normal);
      mesh.quaternion.setFromUnitVectors(DECAL_FORWARD, safeNormal);
      mesh.rotateZ(Math.random() * Math.PI * 2);
      mesh.position.copy(position);
      mesh.position.addScaledVector(safeNormal, 0.03);
      if (Math.abs(safeNormal.y) > 0.7) mesh.position.y = Math.max(mesh.position.y, 0.08);
      mesh.renderOrder = 14;
      scene.add(mesh);
      const totalLife = 14 + Math.random() * 8;
      decals.push({
        type: 'impact',
        mesh,
        life: totalLife,
        totalLife,
        baseOpacity: mesh.material.opacity,
        fadeStart: 1
      });
    }

    function spawnBloodSpray(origin, count, life, speed) {
      const particleCount = scaleEffectCount(count, 8);
      for (let i = 0; i < particleCount; i++) {
        const size = 0.07 + Math.random() * 0.14;
        const poolKey = 'blood_spray';
        const mesh = acquirePooledEffectMesh(poolKey, () => new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 6, 6),
          new THREE.MeshBasicMaterial({
            color: 0xb31616,
            transparent: true,
            opacity: 0.98,
            depthWrite: false
          })
        ));
        mesh.material.opacity = 0.98;
        mesh.scale.setScalar(size / 0.14);
        mesh.position.copy(origin);
        mesh.position.y += Math.random() * 1.2;
        mesh.renderOrder = 18;

        const velocity = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1.2),
          Math.random() * 1.3 + 0.24,
          THREE.MathUtils.randFloatSpread(1.2)
        ).normalize().multiplyScalar(speed * (0.26 + Math.random() * 0.86));

        const totalLife = life * (1 + Math.random() * 1.05);
        pushEffect({
          mesh,
          velocity,
          life: totalLife,
          totalLife,
          baseOpacity: 0.98,
          fade: 2.4,
          gravity: 14,
          drag: 0.22,
          floorY: 0.09,
          settle: true,
          poolKey
        });
      }
    }

    function spawnBloodMist(origin, count) {
      const particleCount = scaleEffectCount(count, 3);
      for (let i = 0; i < particleCount; i++) {
        const size = 0.02 + Math.random() * 0.04;
        const poolKey = 'blood_mist';
        const mesh = acquirePooledEffectMesh(poolKey, () => new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 5, 5),
          new THREE.MeshBasicMaterial({ color: 0xaa1a1a, transparent: true, opacity: 0.92 })
        ));
        mesh.material.opacity = 0.92;
        mesh.scale.setScalar(size / 0.06);
        mesh.position.copy(origin);
        mesh.position.y += Math.random() * 0.7;

        const velocity = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1),
          Math.random() * 0.8,
          THREE.MathUtils.randFloatSpread(1)
        ).multiplyScalar(6 + Math.random() * 10);

        const totalLife = 0.08 + Math.random() * 0.12;
        pushEffect({
          mesh,
          velocity,
          life: totalLife,
          totalLife,
          baseOpacity: 0.9,
          gravity: 12,
          drag: 3.6,
          shrink: true,
          poolKey
        });
      }
    }

    function spawnWoodSplinters(origin, count, life, speed) {
      const particleCount = scaleEffectCount(count, 6);
      for (let i = 0; i < particleCount; i++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.08 + Math.random() * 0.12, 0.04 + Math.random() * 0.08, 0.14 + Math.random() * 0.18),
          new THREE.MeshBasicMaterial({ color: 0x7a4f2c, transparent: true, opacity: 1 })
        );
        mesh.position.copy(origin);
        mesh.position.y += Math.random() * 0.7;
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        scene.add(mesh);

        const velocity = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1),
          Math.random() * 0.9 + 0.2,
          THREE.MathUtils.randFloatSpread(1)
        ).normalize().multiplyScalar(speed * (0.55 + Math.random() * 0.8));

        const totalLife = life * (0.75 + Math.random() * 0.9);
        pushEffect({
          mesh,
          velocity,
          life: totalLife,
          totalLife,
          baseOpacity: 1,
          fade: 1.8,
          gravity: 22,
          drag: 0.18
        });
      }
    }

    function spawnBloodDecal(origin, scaleMul) {
      const life = 60 + Math.random() * 30;

      tmpDecalRayOrigin.set(origin.x, Math.max(0.18, origin.y || 0) + 2.2, origin.z);
      raycaster.set(tmpDecalRayOrigin, DECAL_RAY_DOWN);
      raycaster.far = 8;
      const hits = raycaster.intersectObjects(splatterSurfaces, false);
      if (hits.length) {
        const hit = hits[0];
        const hitNormal = hit.face
          ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
          : WORLD_UP.clone();
        spawnBloodDecalOnSurface(hit.point, hitNormal, scaleMul, life);
        return;
      }

      spawnBloodDecalOnSurface(origin, WORLD_UP, scaleMul, life);
    }

    function spawnBloodDecalOnSurface(position, normal, scaleMul, lifeSeconds) {
      enforceDecalLimit(220, 'blood');
      const normalizedScale = Math.max(0.12, scaleMul || 0.3);
      const useGlossyPool = normalizedScale > 0.8;
      const decalBaseMaterial = useGlossyPool && materials.bloodDecalGloss
        ? materials.bloodDecalGloss
        : materials.bloodDecal;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2 * normalizedScale, 1.2 * normalizedScale),
        decalBaseMaterial.clone()
      );
      const n = getSafeDecalNormal(normal);
      mesh.quaternion.setFromUnitVectors(DECAL_FORWARD, n);
      mesh.rotateZ(Math.random() * Math.PI * 2);

      const surfaceY = Number.isFinite(position.y) ? position.y : 0.08;
      const targetY = Math.abs(n.y) > 0.72 ? Math.max(0.09, surfaceY) : surfaceY;
      mesh.position.set(position.x, targetY, position.z);
      mesh.position.addScaledVector(n, 0.045);
      mesh.renderOrder = 16;
      scene.add(mesh);
      const totalLife = lifeSeconds || (60 + Math.random() * 30);
      decals.push({
        type: 'blood',
        mesh,
        life: totalLife,
        totalLife,
        baseOpacity: mesh.material.opacity,
        fadeStart: 0.35
      });
    }

    function getSafeDecalNormal(normal) {
      if (
        normal &&
        Number.isFinite(normal.x) &&
        Number.isFinite(normal.y) &&
        Number.isFinite(normal.z)
      ) {
        tmpDecalNormal.copy(normal);
      } else {
        tmpDecalNormal.copy(WORLD_UP);
      }
      if (tmpDecalNormal.lengthSq() < 0.000001) {
        tmpDecalNormal.copy(WORLD_UP);
      } else {
        tmpDecalNormal.normalize();
      }
      return tmpDecalNormal;
    }

    function enforceDecalLimit(maxCount, decalType) {
      const maxDecals = maxCount || 80;
      if (decalType) {
        let typeCount = 0;
        for (let i = 0; i < decals.length; i++) {
          if (decals[i] && decals[i].type === decalType) typeCount += 1;
        }
        while (typeCount >= maxDecals) {
          let removeIndex = -1;
          for (let i = 0; i < decals.length; i++) {
            if (decals[i] && decals[i].type === decalType) {
              removeIndex = i;
              break;
            }
          }
          if (removeIndex < 0) break;
          removeDecal(removeIndex);
          typeCount -= 1;
        }
        return;
      }
      while (decals.length >= maxDecals) {
        removeDecal(0);
      }
    }

    function removeDecal(index) {
      const decal = decals[index];
      if (!decal) return;
      scene.remove(decal.mesh);
      if (decal.mesh.material && typeof decal.mesh.material.dispose === 'function') {
        decal.mesh.material.dispose();
      }
      if (decal.mesh.geometry && typeof decal.mesh.geometry.dispose === 'function') {
        decal.mesh.geometry.dispose();
      }
      decals.splice(index, 1);
    }

    function removeEffect(index) {
      const effect = effects[index];
      if (!effect) return;
      scene.remove(effect.mesh);
      if (effect.poolKey && effectMeshPool) {
        effectMeshPool.release(effect.poolKey, effect.mesh);
        effects.splice(index, 1);
        return;
      }
      if (!effect.preserveMaterial && effect.mesh.material && typeof effect.mesh.material.dispose === 'function') {
        effect.mesh.material.dispose();
      }
      if (!effect.preserveGeometry && effect.mesh.geometry && typeof effect.mesh.geometry.dispose === 'function') {
        effect.mesh.geometry.dispose();
      }
      effects.splice(index, 1);
    }

    function pushEffect(effect) {
      if (effects.length >= limits.effects) removeEffect(0);
      if (effect && effect.baseScale === undefined && effect.mesh && effect.mesh.scale) {
        effect.baseScale = effect.mesh.scale.x || 1;
      }
      effects.push(effect);
    }

    function registerSplatterSurface(mesh) {
      if (!mesh || !mesh.isMesh) return;
      if (splatterSurfaces.indexOf(mesh) >= 0) return;
      splatterSurfaces.push(mesh);
    }

    function syncDynamicObjects() {
      for (let i = 0; i < dynamicObjects.length; i++) {
        const object = dynamicObjects[i];
        const body = object.userData.physicsBody;
        if (!body) continue;

        const motionState = body.getMotionState();
        if (!motionState) continue;

        motionState.getWorldTransform(tmpTransform);
        const origin = tmpTransform.getOrigin();
        const rotation = tmpTransform.getRotation();

        object.position.set(origin.x(), origin.y(), origin.z());
        object.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
      }
    }

    function setBodyVelocity(body, x, y, z) {
      tmpVelocity.setValue(x, y, z);
      body.setLinearVelocity(tmpVelocity);
    }

    function createRigidBody(object, shape, mass) {
      const transform = new AmmoLib.btTransform();
      transform.setIdentity();
      transform.setOrigin(new AmmoLib.btVector3(object.position.x, object.position.y, object.position.z));
      transform.setRotation(new AmmoLib.btQuaternion(object.quaternion.x, object.quaternion.y, object.quaternion.z, object.quaternion.w));

      const motionState = new AmmoLib.btDefaultMotionState(transform);
      const localInertia = new AmmoLib.btVector3(0, 0, 0);
      if (mass > 0) shape.calculateLocalInertia(mass, localInertia);

      const bodyInfo = new AmmoLib.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
      const body = new AmmoLib.btRigidBody(bodyInfo);
      physicsWorld.addRigidBody(body);

      object.userData.physicsBody = body;
      object.userData.physicsShape = shape;
      body.threeObject = object;

      if (mass > 0) dynamicObjects.push(object);

      AmmoLib.destroy(transform);
      AmmoLib.destroy(localInertia);
      AmmoLib.destroy(bodyInfo);

      return body;
    }

    function removeZombie(index, options) {
      const zombie = zombies[index];
      if (!zombie) return;

      const opts = options || {};
      if (!opts.skipGore) {
        const randomDir = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1),
          0,
          THREE.MathUtils.randFloatSpread(1)
        ).normalize();
        spawnZombieDeathGore(zombie, randomDir, zombie.root.position.clone());
      }

      removePhysicsObject(zombie.root, zombie.body);
      zombies.splice(index, 1);
    }

    function removeCrate(index) {
      const crate = crates[index];
      if (!crate) return;
      removeDestructibleByRef(crate);
    }

    function removePhysicsObject(object, body) {
      physicsWorld.removeRigidBody(body);
      scene.remove(object);

      const dynamicIndex = dynamicObjects.indexOf(object);
      if (dynamicIndex >= 0) dynamicObjects.splice(dynamicIndex, 1);

      const shape = object.userData.physicsShape;
      const motionState = body.getMotionState();

      if (motionState) AmmoLib.destroy(motionState);
      if (shape) AmmoLib.destroy(shape);
      AmmoLib.destroy(body);

      object.userData.physicsBody = null;
      object.userData.physicsShape = null;
    }

    function updateHud() {
      const clampedHealth = Math.max(0, Math.round(state.health));
      const clampedArmor = Math.max(0, Math.round(state.armor));
      const weaponDef = getCurrentWeaponDef();
      const weaponState = getCurrentWeaponState();
      hud.health.textContent = clampedHealth;
      if (hud.armor) hud.armor.textContent = clampedArmor;
      hud.score.textContent = state.score;
      hud.highscore.textContent = state.highScore;
      hud.wave.textContent = state.wave;
      if (hud.level) hud.level.textContent = String(state.level);
      if (hud.xp) hud.xp.textContent = state.xp + ' / ' + state.nextLevelXp;
      hud.weapon.textContent = weaponDef ? weaponDef.label : '-';
      hud.ammo.textContent = state.reloading ? '...' : (weaponState ? weaponState.ammo : 0);
      hud.reserve.textContent = weaponState ? weaponState.reserve : 0;
      if (hud.skills) {
        const adrenaline = state.skills.adrenaline;
        const shockwave = state.skills.shockwave;
        const adrenalineText = adrenaline.unlocked
          ? ('Q:' + (adrenaline.active > 0 ? 'AKTIV ' + adrenaline.active.toFixed(1) + 's' : (adrenaline.cooldown > 0 ? adrenaline.cooldown.toFixed(1) + 's' : 'bereit')))
          : 'Q:-';
        const shockwaveText = shockwave.unlocked
          ? ('E:' + (shockwave.cooldown > 0 ? shockwave.cooldown.toFixed(1) + 's' : 'bereit'))
          : 'E:-';
        hud.skills.textContent = adrenalineText + ' · ' + shockwaveText;
      }
      if (hud.modsStatus) {
        const crit = Math.round(state.critChance * 100);
        const brute = Math.round((state.bruteDamageMul - 1) * 100);
        const demo = Math.round((state.destructibleDamageMul - 1) * 100);
        const refund = Math.round(state.ammoRefundChance * 100);
        hud.modsStatus.textContent = 'KRIT ' + crit + '% · Brute +' + brute + '% · Demo +' + demo + '% · Ammo ' + refund + '%';
      }
      if (hud.directorStatus) {
        const intensityPct = Math.round(state.director.intensity * 100);
        hud.directorStatus.textContent = state.director.status + ' (' + intensityPct + '%)';
      }
      if (hud.objectiveStatus) {
        const objective = state.objective.active;
        if (!objective) {
          hud.objectiveStatus.textContent = '-';
        } else if (state.objective.completed) {
          hud.objectiveStatus.textContent = 'Erfüllt: ' + objective.label;
        } else if (objective.id === 'survive') {
          const left = Math.max(0, Math.ceil((objective.duration || 0) - state.objective.progress));
          hud.objectiveStatus.textContent = objective.label + ' · ' + left + 's';
        } else if (objective.id === 'slayer') {
          const target = Math.max(1, Number(objective.targetKills || 1));
          const progress = Math.min(target, Math.round(state.objective.progress));
          hud.objectiveStatus.textContent = objective.label + ' · ' + progress + '/' + target;
        } else {
          hud.objectiveStatus.textContent = objective.label;
        }
      }
      const comboText = 'x' + state.comboMultiplier + (state.spreeText ? ' · ' + state.spreeText : '');
      hud.combo.textContent = comboText;
      if (state.comboMultiplier > 1) {
        hud.combo.style.color = '#ffb15a';
        hud.combo.style.opacity = String(0.85 + Math.sin(performance.now() * 0.018) * 0.15 + state.comboPulse * 0.12);
      } else {
        hud.combo.style.color = '';
        hud.combo.style.opacity = '';
      }
      if (clampedHealth < 30) {
        const pulse = 0.55 + Math.sin(performance.now() * 0.01) * 0.45;
        hud.health.style.color = '#ff6666';
        hud.health.style.opacity = String(Math.max(0.2, pulse));
      } else {
        hud.health.style.color = '';
        hud.health.style.opacity = '';
      }
    }

    function endGame() {
      state.running = false;
      state.paused = false;
      state.upgradeMode = false;
      state.mouseDown = false;
      if (progression) {
        progression.onRunEnded({
          score: state.score,
          wave: state.wave,
          kills: state.totalKills
        });
      }
      const entriesBefore = loadHighscores();
      const bestBefore = entriesBefore.length ? Number(entriesBefore[0].score || 0) : 0;
      saveHighscore(state.score, state.wave);
      renderHighscores();
      updateMainMenuLastRun();

      if (hud.goScore) hud.goScore.textContent = String(state.score);
      if (hud.goWave) hud.goWave.textContent = String(state.wave);
      if (hud.goKills) hud.goKills.textContent = String(state.totalKills);
      if (hud.goTime) hud.goTime.textContent = formatTime(state.runTimeSec);
      const isNewTop = state.score > bestBefore;
      if (hud.goNewHighscore) hud.goNewHighscore.classList.toggle('hidden', !isNewTop);

      showScreen('gameover');
    }

    function initPhysics(ammo) {
      const collisionConfig = new ammo.btDefaultCollisionConfiguration();
      const dispatcher = new ammo.btCollisionDispatcher(collisionConfig);
      const broadphase = new ammo.btDbvtBroadphase();
      const solver = new ammo.btSequentialImpulseConstraintSolver();
      const world = new ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfig);
      world.setGravity(new ammo.btVector3(0, -21, 0));
      return { world, collisionConfig, dispatcher, broadphase, solver };
    }

    function loadBase64Texture(three, windowKey, repeatX, repeatY, maxAnisotropy, encoding) {
      const b64 = window[windowKey];
      if (!b64) return null;

      const image = new Image();
      image.src = 'data:image/jpeg;base64,' + b64;
      const texture = new three.Texture(image);
      texture.wrapS = three.RepeatWrapping;
      texture.wrapT = three.RepeatWrapping;
      texture.repeat.set(repeatX || 1, repeatY || 1);
      texture.anisotropy = maxAnisotropy || 1;
      if (encoding !== undefined) texture.encoding = encoding;
      image.onload = () => { texture.needsUpdate = true; };
      image.onerror = () => { console.warn('[textures] Fehler beim Laden von', windowKey); };
      texture.needsUpdate = true;
      return texture;
    }

    function createProceduralTextures(rendererRef, three) {
      const maxAnisotropy = rendererRef.capabilities.getMaxAnisotropy ? rendererRef.capabilities.getMaxAnisotropy() : 1;

      const createCanvasTexture = (size, paint, repeatX, repeatY, useSrgb) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        paint(ctx, size);

        const texture = new three.CanvasTexture(canvas);
        texture.wrapS = three.RepeatWrapping;
        texture.wrapT = three.RepeatWrapping;
        texture.repeat.set(repeatX || 1, repeatY || 1);
        texture.anisotropy = maxAnisotropy;
        if (useSrgb && 'encoding' in texture && three.sRGBEncoding !== undefined) texture.encoding = three.sRGBEncoding;
        texture.needsUpdate = true;
        return texture;
      };

      const createNoiseTexture = (size, repeatX, repeatY, min, max) => createCanvasTexture(size, (ctx, canvasSize) => {
        ctx.fillStyle = 'rgb(' + min + ',' + min + ',' + min + ')';
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        for (let i = 0; i < canvasSize * canvasSize * 0.045; i++) {
          const x = Math.random() * canvasSize;
          const y = Math.random() * canvasSize;
          const value = min + Math.floor(Math.random() * Math.max(1, max - min));
          ctx.fillStyle = 'rgb(' + value + ',' + value + ',' + value + ')';
          ctx.fillRect(x, y, 2, 2);
        }
      }, repeatX, repeatY, false);

      const createNormalNoiseTexture = (size, repeatX, repeatY, intensity) => createCanvasTexture(size, (ctx, canvasSize) => {
        const img = ctx.createImageData(canvasSize, canvasSize);
        const data = img.data;
        const amount = intensity || 20;
        for (let i = 0; i < data.length; i += 4) {
          const nx = 128 + Math.floor(THREE.MathUtils.randFloatSpread(amount));
          const ny = 128 + Math.floor(THREE.MathUtils.randFloatSpread(amount));
          data[i] = nx;
          data[i + 1] = ny;
          data[i + 2] = 255;
          data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      }, repeatX, repeatY, false);

      const createColorTexture = (size, repeatX, repeatY, baseColor, detailStrength) => createCanvasTexture(size, (ctx, canvasSize) => {
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        for (let i = 0; i < canvasSize * canvasSize * 0.05; i++) {
          const x = Math.random() * canvasSize;
          const y = Math.random() * canvasSize;
          const delta = Math.floor(THREE.MathUtils.randFloatSpread(detailStrength || 28));
          const value = Math.max(20, Math.min(230, 110 + delta));
          ctx.fillStyle = 'rgba(' + value + ',' + value + ',' + value + ',0.15)';
          ctx.fillRect(x, y, 2, 2);
        }
      }, repeatX, repeatY, true);

      const loadTextureSet = (setName, repeatX, repeatY, fallbackColor) => {
        const setKey = setName.toUpperCase();
        const encoding = three.sRGBEncoding !== undefined ? three.sRGBEncoding : undefined;
        const color = loadBase64Texture(three, '__TEX_' + setKey + '_COLOR__', repeatX, repeatY, maxAnisotropy, encoding) || fallbackColor;
        const normal = loadBase64Texture(three, '__TEX_' + setKey + '_NORMAL__', repeatX, repeatY, maxAnisotropy, undefined) ||
          createNormalNoiseTexture(512, repeatX, repeatY, 18);
        const roughness = loadBase64Texture(three, '__TEX_' + setKey + '_ROUGHNESS__', repeatX, repeatY, maxAnisotropy, undefined) ||
          createNoiseTexture(512, repeatX, repeatY, 145, 235);
        const ao = loadBase64Texture(three, '__TEX_' + setKey + '_AO__', repeatX, repeatY, maxAnisotropy, undefined) ||
          createNoiseTexture(512, repeatX, repeatY, 158, 238);
        return { color, normal, roughness, ao };
      };

      const groundFallback = createColorTexture(1024, 16, 16, '#4e5458', 24);
      const asphaltFallback = createColorTexture(1024, 10, 10, '#2f3236', 18);
      const concreteFallback = createColorTexture(512, 4, 4, '#777c81', 22);
      const crateFallback = createColorTexture(512, 2, 2, '#684a2e', 36);
      const metalFallback = createColorTexture(512, 4, 4, '#636770', 16);
      const rockFallback = createColorTexture(512, 2, 2, '#3d3f45', 28);

      const groundSet = loadTextureSet('ground_dirt', 16, 16, groundFallback);
      const asphaltSet = loadTextureSet('asphalt', 10, 10, asphaltFallback);
      const concreteSet = loadTextureSet('concrete', 4, 4, concreteFallback);
      const crateSet = loadTextureSet('wood_crate', 2, 2, crateFallback);
      const metalSet = loadTextureSet('metal_plate', 4, 4, metalFallback);
      const rockSet = loadTextureSet('rock_wall', 2, 2, rockFallback);

      const lane = createCanvasTexture(256, (ctx, size) => {
        ctx.fillStyle = '#e7d8a3';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = 'rgba(0,0,0,0.14)';
        for (let i = 0; i < 26; i++) {
          ctx.beginPath();
          const y = (i / 26) * size;
          ctx.moveTo(0, y);
          ctx.lineTo(size, y + THREE.MathUtils.randFloatSpread(4));
          ctx.stroke();
        }
      }, 1, 1, true);

      const zombieCloth = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#4c6156';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 7200; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const value = 68 + Math.floor(Math.random() * 64);
          ctx.fillStyle = 'rgba(' + (value - 20) + ',' + value + ',' + (value - 10) + ',0.3)';
          ctx.fillRect(x, y, 2, 2);
        }
      }, 2, 2, true);

      const zombieSkin = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#7c8f5a';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 9000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const value = 90 + Math.floor(Math.random() * 68);
          ctx.fillStyle = 'rgba(' + (value - 18) + ',' + value + ',' + (value - 34) + ',0.28)';
          ctx.fillRect(x, y, 2, 2);
        }
      }, 2, 2, true);

      const rust = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#6d4e3d';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 8600; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const r = 116 + Math.floor(Math.random() * 60);
          ctx.fillStyle = 'rgba(' + r + ',' + (60 + Math.floor(Math.random() * 34)) + ',' + (36 + Math.floor(Math.random() * 20)) + ',0.35)';
          ctx.fillRect(x, y, 2, 2);
        }
      }, 2, 2, true);

      const blood = createCanvasTexture(512, (ctx, size) => {
        ctx.clearRect(0, 0, size, size);
        const centerX = size * 0.5;
        const centerY = size * 0.5;
        for (let i = 0; i < 42; i++) {
          const radius = 18 + Math.random() * 120;
          const angle = Math.random() * Math.PI * 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          const blob = 14 + Math.random() * 38;
          const grad = ctx.createRadialGradient(x, y, 2, x, y, blob);
          grad.addColorStop(0, 'rgba(136,12,12,0.82)');
          grad.addColorStop(1, 'rgba(90,8,8,0.02)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, blob, 0, Math.PI * 2);
          ctx.fill();
        }
      }, 1, 1, true);

      return {
        ground: groundSet.color,
        groundNormal: groundSet.normal,
        groundRoughness: groundSet.roughness,
        groundAo: groundSet.ao,

        asphalt: asphaltSet.color,
        asphaltNormal: asphaltSet.normal,
        asphaltRoughness: asphaltSet.roughness,
        asphaltAo: asphaltSet.ao,

        concrete: concreteSet.color,
        concreteNormal: concreteSet.normal,
        concreteRoughness: concreteSet.roughness,
        concreteAo: concreteSet.ao,

        crate: crateSet.color,
        crateNormal: crateSet.normal,
        crateRoughness: crateSet.roughness,
        crateAo: crateSet.ao,

        metal: metalSet.color,
        metalNormal: metalSet.normal,
        metalRoughness: metalSet.roughness,
        metalAo: metalSet.ao,

        rock: rockSet.color,
        rockNormal: rockSet.normal,
        rockRoughness: rockSet.roughness,
        rockAo: rockSet.ao,

        lane,
        zombieCloth,
        zombieSkin,
        rust,
        blood,
        fallbackNormalCharacter: createNormalNoiseTexture(256, 1, 1, 24),
        fallbackNormalDecal: createNormalNoiseTexture(256, 1, 1, 14)
      };
    }

    function createMaterials(textures) {
      const grimeMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1d21,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });

      const makeTexturedMaterial = (options, set, normalStrength) => {
        return new THREE.MeshStandardMaterial(Object.assign({}, options, {
          map: set.color,
          normalMap: set.normal,
          normalScale: new THREE.Vector2(normalStrength, normalStrength),
          roughnessMap: set.roughness,
          aoMap: set.ao,
          aoMapIntensity: 0.85
        }));
      };

      const texGround = { color: textures.ground, normal: textures.groundNormal, roughness: textures.groundRoughness, ao: textures.groundAo };
      const texAsphalt = { color: textures.asphalt, normal: textures.asphaltNormal, roughness: textures.asphaltRoughness, ao: textures.asphaltAo };
      const texConcrete = { color: textures.concrete, normal: textures.concreteNormal, roughness: textures.concreteRoughness, ao: textures.concreteAo };
      const texWood = { color: textures.crate, normal: textures.crateNormal, roughness: textures.crateRoughness, ao: textures.crateAo };
      const texMetal = { color: textures.metal, normal: textures.metalNormal, roughness: textures.metalRoughness, ao: textures.metalAo };
      const texRock = { color: textures.rock, normal: textures.rockNormal, roughness: textures.rockRoughness, ao: textures.rockAo };

      return {
        ground: makeTexturedMaterial({ color: 0xd5dce3, roughness: 0.9, metalness: 0.02 }, texGround, 0.8),
        groundCollider: new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 1, metalness: 0 }),
        invisibleCollider: new THREE.MeshBasicMaterial({ color: 0x000000, visible: false }),
        wall: makeTexturedMaterial({ color: 0xc4cad2, roughness: 0.86, metalness: 0.1 }, texRock, 1.2),
        road: makeTexturedMaterial({
          color: 0xc6cdd6,
          roughness: 0.78,
          metalness: 0.06,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        }, texAsphalt, 0.8),
        lanePaint: new THREE.MeshStandardMaterial({ map: textures.lane, color: 0xfff4ca, roughness: 0.55, metalness: 0.05 }),
        sidewalk: makeTexturedMaterial({ color: 0xd2d7dd, roughness: 0.8, metalness: 0.04 }, texConcrete, 0.8),
        grime: grimeMaterial,
        concreteBlock: makeTexturedMaterial({ roughness: 0.92, metalness: 0.04 }, texConcrete, 0.8),
        breakableCrate: makeTexturedMaterial({ roughness: 0.8, metalness: 0.03 }, texWood, 1.2),
        rock: makeTexturedMaterial({ roughness: 0.95, metalness: 0.05 }, texRock, 1.2),
        carBody: makeTexturedMaterial({ roughness: 0.45, metalness: 0.55 }, texMetal, 0.9),
        carRust: makeTexturedMaterial({ roughness: 0.82, metalness: 0.22, color: 0x9a7f62 }, texMetal, 0.9),
        carWindow: new THREE.MeshStandardMaterial({ color: 0x4d606d, roughness: 0.2, metalness: 0.6, transparent: true, opacity: 0.72 }),
        tire: new THREE.MeshStandardMaterial({ color: 0x1f2023, roughness: 0.9, metalness: 0.08 }),
        lampPole: makeTexturedMaterial({ roughness: 0.56, metalness: 0.5 }, texMetal, 0.9),
        lampBulb: new THREE.MeshStandardMaterial({ color: 0xffd39d, emissive: 0xffb46b, emissiveIntensity: 1.2, roughness: 0.15, metalness: 0.2 }),

        playerBody: new THREE.MeshStandardMaterial({ color: 0x5b6873, normalMap: textures.fallbackNormalCharacter, roughness: 0.52, metalness: 0.34 }),
        playerLimb: new THREE.MeshStandardMaterial({ color: 0x4a5560, normalMap: textures.fallbackNormalCharacter, roughness: 0.58, metalness: 0.2 }),
        playerShoe: new THREE.MeshStandardMaterial({ color: 0x1f242c, normalMap: textures.fallbackNormalCharacter, roughness: 0.78, metalness: 0.16 }),
        playerGlove: new THREE.MeshStandardMaterial({ color: 0x252b33, normalMap: textures.fallbackNormalCharacter, roughness: 0.76, metalness: 0.12 }),
        playerHead: new THREE.MeshStandardMaterial({ color: 0xbd9c82, normalMap: textures.fallbackNormalCharacter, roughness: 0.88, metalness: 0.04 }),
        playerHelmet: new THREE.MeshStandardMaterial({ color: 0x6e8799, normalMap: textures.fallbackNormalCharacter, roughness: 0.34, metalness: 0.68 }),
        playerVisor: new THREE.MeshStandardMaterial({ color: 0x1a2a38, roughness: 0.1, metalness: 0.8 }),
        playerVest: new THREE.MeshStandardMaterial({ color: 0x385264, normalMap: textures.fallbackNormalCharacter, roughness: 0.72, metalness: 0.18 }),
        weapon: makeTexturedMaterial({ roughness: 0.32, metalness: 0.78 }, texMetal, 0.9),
        weaponDark: new THREE.MeshStandardMaterial({ color: 0x25282f, normalMap: textures.fallbackNormalCharacter, roughness: 0.42, metalness: 0.65 }),
        weaponWood: new THREE.MeshStandardMaterial({
          map: textures.crate,
          normalMap: textures.crateNormal,
          roughnessMap: textures.crateRoughness,
          aoMap: textures.crateAo,
          roughness: 0.68,
          metalness: 0.06
        }),
        weaponTrigger: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.36, metalness: 0.55 }),
        weaponPump: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.62, metalness: 0.32 }),
        buildingFacade: makeTexturedMaterial({ color: 0xc5ccd6, roughness: 0.78, metalness: 0.1 }, texConcrete, 0.8),
        buildingTrim: makeTexturedMaterial({ color: 0x9ea8b3, roughness: 0.72, metalness: 0.16 }, texConcrete, 0.7),
        buildingRoof: makeTexturedMaterial({ color: 0x8f99a4, roughness: 0.66, metalness: 0.2 }, texMetal, 0.7),
        buildingWindowLit: new THREE.MeshStandardMaterial({
          color: 0xb9ddff,
          emissive: 0x96cfff,
          emissiveIntensity: 0.95,
          roughness: 0.16,
          metalness: 0.78
        }),
        buildingWindowDark: new THREE.MeshStandardMaterial({
          color: 0x2a3441,
          emissive: 0x0f141c,
          emissiveIntensity: 0.2,
          roughness: 0.22,
          metalness: 0.72
        }),

        zombieBody: new THREE.MeshStandardMaterial({ map: textures.zombieCloth, normalMap: textures.fallbackNormalCharacter, roughness: 0.7, metalness: 0.14 }),
        zombieCloth: new THREE.MeshStandardMaterial({ map: textures.zombieCloth, normalMap: textures.fallbackNormalCharacter, roughness: 0.78, metalness: 0.08 }),
        zombieHead: new THREE.MeshStandardMaterial({ map: textures.zombieSkin, normalMap: textures.fallbackNormalCharacter, roughness: 0.82, metalness: 0.02 }),
        zombieJaw: new THREE.MeshStandardMaterial({ color: 0x5a6d42, normalMap: textures.fallbackNormalCharacter, roughness: 0.86, metalness: 0.02 }),
        zombieLimb: new THREE.MeshStandardMaterial({ map: textures.zombieSkin, normalMap: textures.fallbackNormalCharacter, roughness: 0.8, metalness: 0.03 }),

        bullet: new THREE.MeshStandardMaterial({ color: 0xffdf8a, emissive: 0xffa023, emissiveIntensity: 1.3, roughness: 0.2, metalness: 0.7 }),
        organChunk: new THREE.MeshStandardMaterial({ color: 0x4f1a1a, roughness: 0.9, metalness: 0.02 }),
        bloodDecal: new THREE.MeshStandardMaterial({
          map: textures.blood,
          normalMap: textures.fallbackNormalDecal,
          color: 0x8d1111,
          transparent: true,
          opacity: 0.84,
          roughness: 1,
          metalness: 0,
          alphaTest: 0.02,
          side: THREE.DoubleSide,
          depthTest: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2.5,
          polygonOffsetUnits: -4
        }),
        bloodDecalGloss: new THREE.MeshStandardMaterial({
          map: textures.blood,
          normalMap: textures.fallbackNormalDecal,
          color: 0x6b0000,
          transparent: true,
          opacity: 0.9,
          roughness: 0.08,
          metalness: 0.72,
          alphaTest: 0.02,
          side: THREE.DoubleSide,
          depthTest: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2.5,
          polygonOffsetUnits: -4
        }),
        impactDecal: new THREE.MeshStandardMaterial({
          color: 0x1c1f24,
          transparent: true,
          opacity: 0.55,
          roughness: 1,
          metalness: 0,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        })
      };
    }
  } catch (error) {
    console.error('Game initialization failed:', error);
    const overlay = document.getElementById('overlay');
    const errorScreen = document.getElementById('screen-error');
    const errorMessage = document.getElementById('error-message');
    if (overlay && errorScreen) {
      overlay.classList.remove('hidden');
      const screens = overlay.querySelectorAll('.menu-screen');
      for (let i = 0; i < screens.length; i++) screens[i].classList.remove('active');
      errorScreen.classList.add('active');
      if (errorMessage) {
        errorMessage.textContent = 'Spiel konnte nicht geladen werden: ' + String(error && error.message ? error.message : error);
      }
    }
  }
})();
