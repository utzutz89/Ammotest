(async function () {
  try {
    const AmmoLib = window.__AMMO_RUNTIME__ || (typeof Ammo === 'function' ? await Ammo() : null);
    if (!AmmoLib) throw new Error('Ammo runtime is not available.');
    if (!window.THREE || typeof THREE.WebGLRenderer !== 'function' || typeof THREE.MeshStandardMaterial !== 'function') {
      throw new Error('Official Three.js runtime is required.');
    }
    if (typeof AmmoLib.btDefaultCollisionConfiguration !== 'function') {
      throw new Error('Official Ammo.js runtime is required.');
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', precision: 'highp' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('physicallyCorrectLights' in renderer) renderer.physicallyCorrectLights = true;
    if ('outputEncoding' in renderer && THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    if ('toneMapping' in renderer && THREE.ACESFilmicToneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.07;
    }
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8ca0b5);
    scene.fog = new THREE.Fog(0x8ca0b5, 45, 240);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.35, 360);
    const cameraAnchor = new THREE.Vector3(0, 0, 0);
    const cameraTarget = new THREE.Vector3(0, 0, 0);

    const physics = initPhysics(AmmoLib);
    const physicsWorld = physics.world;
    const tmpTransform = new AmmoLib.btTransform();
    const tmpVelocity = new AmmoLib.btVector3(0, 0, 0);

    const raycaster = new THREE.Raycaster();
    const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.15);
    const aimPoint = new THREE.Vector3();

    const state = {
      running: false,
      keys: {},
      mouseNdc: new THREE.Vector2(0, 0),
      mouseDown: false,
      aimDirection: new THREE.Vector3(0, 0, 1),
      health: 100,
      score: 0,
      wave: 1,
      ammo: 32,
      reserve: 128,
      reloading: false,
      lastShotMs: 0
    };

    const hud = {
      health: document.getElementById('health'),
      score: document.getElementById('score'),
      wave: document.getElementById('wave'),
      ammo: document.getElementById('ammo'),
      reserve: document.getElementById('reserve'),
      overlay: document.getElementById('overlay')
    };

    const ARENA_HALF = 86;
    const dynamicObjects = [];
    const zombies = [];
    const bullets = [];
    const effects = [];
    const decals = [];
    const crates = [];

    const textures = createProceduralTextures(renderer, THREE);
    const materials = createMaterials(textures);

    const lightRig = setupLighting(scene);
    buildArena();
    const player = createPlayer();
    spawnWave(state.wave);
    updateHud();

    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', () => { state.mouseDown = true; });
    window.addEventListener('mouseup', () => { state.mouseDown = false; });
    window.addEventListener('contextmenu', (event) => event.preventDefault());

    const clock = new THREE.Clock();
    requestAnimationFrame(loop);

    function loop() {
      const dt = Math.min(clock.getDelta(), 0.033);

      if (state.running) {
        updatePlayer(dt);
        updateZombies(dt);
        physicsWorld.stepSimulation(dt, 10);
        syncDynamicObjects();
        updateBullets(dt);
        updateEffects(dt);
        updateDecals(dt);
        checkProgress();
        updateCamera(dt);
        updateHud();
      } else {
        updateIdleCamera();
      }

      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      state.keys[key] = true;

      if (!state.running && event.key === 'Enter') {
        state.running = true;
        hud.overlay.classList.add('hidden');
      }

      if (key === 'r') reload();
    }

    function onKeyUp(event) {
      state.keys[event.key.toLowerCase()] = false;
    }

    function onMouseMove(event) {
      state.mouseNdc.x = (event.clientX / window.innerWidth) * 2 - 1;
      state.mouseNdc.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    function updateIdleCamera() {
      const t = performance.now() * 0.0002;
      camera.position.set(Math.cos(t) * 28, 36, Math.sin(t) * 28);
      camera.lookAt(0, 1.2, 0);
    }

    function updateCamera(dt) {
      cameraTarget.copy(player.root.position);
      const desired = new THREE.Vector3(cameraTarget.x, 45, cameraTarget.z + 28);
      cameraAnchor.lerp(desired, 1 - Math.exp(-dt * 7));
      camera.position.copy(cameraAnchor);
      camera.lookAt(cameraTarget.x, 1.2, cameraTarget.z);

      lightRig.sun.target.updateMatrixWorld();
    }

    function setupLighting(sceneRef) {
      const hemi = new THREE.HemisphereLight(0xb9d5f2, 0x2f221c, 0.46);
      sceneRef.add(hemi);

      const sun = new THREE.DirectionalLight(0xfff3de, 2.1);
      sun.position.set(44, 70, 24);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
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

      const fill = new THREE.PointLight(0x89b5ff, 0.75, 180, 2);
      fill.position.set(-42, 28, -34);
      sceneRef.add(fill);

      const warmBack = new THREE.PointLight(0xffbf86, 0.35, 120, 2);
      warmBack.position.set(32, 16, 38);
      sceneRef.add(warmBack);

      return { sun };
    }

    function buildArena() {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2, 1, 1),
        materials.ground
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      addStaticBox(ARENA_HALF * 2, 2, ARENA_HALF * 2, 0, -1, 0, materials.groundCollider, false);

      buildRoadNetwork();

      const wallHeight = 8;
      const wallThickness = 2;
      addStaticBox(ARENA_HALF * 2 + wallThickness * 2, wallHeight, wallThickness, 0, wallHeight * 0.5, -ARENA_HALF - wallThickness * 0.5, materials.wall);
      addStaticBox(ARENA_HALF * 2 + wallThickness * 2, wallHeight, wallThickness, 0, wallHeight * 0.5, ARENA_HALF + wallThickness * 0.5, materials.wall);
      addStaticBox(wallThickness, wallHeight, ARENA_HALF * 2, -ARENA_HALF - wallThickness * 0.5, wallHeight * 0.5, 0, materials.wall);
      addStaticBox(wallThickness, wallHeight, ARENA_HALF * 2, ARENA_HALF + wallThickness * 0.5, wallHeight * 0.5, 0, materials.wall);

      const obstacleCount = 42;
      for (let index = 0; index < obstacleCount; index++) {
        const width = 2 + Math.random() * 2.8;
        const height = 1.4 + Math.random() * 2.6;
        const depth = 2 + Math.random() * 2.8;
        const x = THREE.MathUtils.randFloatSpread((ARENA_HALF - 12) * 2);
        const z = THREE.MathUtils.randFloatSpread((ARENA_HALF - 12) * 2);

        if (Math.hypot(x, z) < 20) continue;
        if (Math.abs(x) < 8 || Math.abs(z) < 8) continue;

        const roll = Math.random();
        if (roll < 0.45) {
          createBreakableCrate(width, height, depth, x, z);
        } else if (roll < 0.8) {
          addStaticBox(width, height, depth, x, height * 0.5, z, materials.rock);
        } else {
          addStaticBox(width * 1.2, Math.max(1.6, height * 0.9), depth * 0.9, x, Math.max(1.6, height * 0.9) * 0.5, z, materials.concreteBlock);
        }
      }

      addWreckedCar(-26, -16, 0.28);
      addWreckedCar(22, 24, -0.44);
      addWreckedCar(34, -28, 0.9);

      addStreetLamp(-46, -8);
      addStreetLamp(-46, 26);
      addStreetLamp(48, -22);
      addStreetLamp(48, 14);
    }

    function buildRoadNetwork() {
      const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(26, ARENA_HALF * 2), materials.road);
      mainRoad.rotation.x = -Math.PI / 2;
      mainRoad.position.y = 0.03;
      mainRoad.receiveShadow = true;
      scene.add(mainRoad);

      const sideRoad = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_HALF * 2, 22), materials.road);
      sideRoad.rotation.x = -Math.PI / 2;
      sideRoad.position.y = 0.032;
      sideRoad.receiveShadow = true;
      scene.add(sideRoad);

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

      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), materials.carRust);
      hood.position.set(2.8, 0.05, 0);
      hood.rotation.z = -0.16;
      hood.castShadow = true;
      hood.receiveShadow = true;
      car.add(hood);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.9), materials.carWindow);
      cabin.position.set(-0.6, 0.75, 0);
      cabin.castShadow = true;
      car.add(cabin);

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
      }

      addStaticBox(5.0, 1.3, 2.4, x, 0.95, z, materials.invisibleCollider, false);
    }

    function addStreetLamp(x, z) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 7.8, 12), materials.lampPole);
      pole.position.set(x, 3.9, z);
      pole.castShadow = true;
      pole.receiveShadow = true;
      scene.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 0.16), materials.lampPole);
      arm.position.set(x + (x < 0 ? 0.8 : -0.8), 7.4, z);
      arm.castShadow = true;
      scene.add(arm);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), materials.lampBulb);
      bulb.position.set(x + (x < 0 ? 1.55 : -1.55), 7.3, z);
      scene.add(bulb);

      const glow = new THREE.PointLight(0xffd59b, 0.58, 22, 2);
      glow.position.copy(bulb.position);
      scene.add(glow);

      addStaticBox(0.8, 8.0, 0.8, x, 4.0, z, materials.invisibleCollider, false);
    }

    function addStaticBox(width, height, depth, x, y, z, material, visible) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(x, y, z);
      const showMesh = visible !== false;
      mesh.visible = showMesh;
      mesh.castShadow = showMesh;
      mesh.receiveShadow = showMesh;
      scene.add(mesh);

      const shape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(width * 0.5, height * 0.5, depth * 0.5));
      shape.setMargin(0.05);
      createRigidBody(mesh, shape, 0);
    }

    function createBreakableCrate(width, height, depth, x, z) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.breakableCrate);
      mesh.position.set(x, height * 0.5, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const shape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(width * 0.5, height * 0.5, depth * 0.5));
      shape.setMargin(0.04);
      const body = createRigidBody(mesh, shape, 5.8 + Math.random() * 2.2);
      body.setDamping(0.2, 0.82);
      body.setFriction(0.88);
      body.setActivationState(4);

      const crate = {
        mesh,
        body,
        width,
        height,
        depth,
        hp: 68 + Math.random() * 22
      };

      body.entityRef = crate;
      body.entityType = 'crate';
      crates.push(crate);
      return crate;
    }

    function createPlayer() {
      const root = new THREE.Group();
      root.position.set(0, 1.2, 0);
      scene.add(root);

      const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.32, 2.34, 20), materials.playerBody);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      root.add(bodyMesh);

      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.86, 22, 16), materials.playerHelmet);
      helmet.position.y = 1.22;
      helmet.castShadow = true;
      root.add(helmet);

      const vest = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.3), materials.playerVest);
      vest.position.y = 0.36;
      vest.castShadow = true;
      root.add(vest);

      const gunPivot = new THREE.Group();
      gunPivot.position.set(0, 0.82, 0);
      root.add(gunPivot);

      const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 2.28), materials.weapon);
      gunBody.position.set(0, 0, 1.35);
      gunBody.castShadow = true;
      gunPivot.add(gunBody);

      const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.0, 12), materials.weaponDark);
      gunBarrel.rotation.x = Math.PI * 0.5;
      gunBarrel.position.set(0, 0, 2.52);
      gunBarrel.castShadow = true;
      gunPivot.add(gunBarrel);

      const shape = new AmmoLib.btSphereShape(1.08);
      shape.setMargin(0.06);
      const body = createRigidBody(root, shape, 6.1);
      body.setAngularFactor(new AmmoLib.btVector3(0, 0, 0));
      body.setDamping(0.2, 0.99);
      body.setFriction(0.92);
      body.setActivationState(4);

      return {
        root,
        visual: bodyMesh,
        gunPivot,
        body,
        moveSpeed: 13.7,
        sprintSpeed: 20.8
      };
    }

    function createZombie(positionX, positionZ, waveLevel) {
      const root = new THREE.Group();
      root.position.set(positionX, 1.06, positionZ);
      scene.add(root);

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.08, 2.2, 14), materials.zombieBody);
      torso.castShadow = true;
      torso.receiveShadow = true;
      root.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.68, 16, 14), materials.zombieHead);
      head.position.y = 1.2;
      head.castShadow = true;
      root.add(head);

      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.34), materials.zombieJaw);
      jaw.position.set(0, 0.84, 0.56);
      jaw.castShadow = true;
      root.add(jaw);

      const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.1, 0.28), materials.zombieLimb);
      leftArm.position.set(-0.9, 0.36, 0.15);
      leftArm.castShadow = true;
      root.add(leftArm);

      const rightArm = leftArm.clone();
      rightArm.position.x = 0.9;
      root.add(rightArm);

      const tornCloth = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.66, 1.1), materials.zombieCloth);
      tornCloth.position.set(0, -0.35, 0.05);
      tornCloth.castShadow = true;
      root.add(tornCloth);

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
        leftArm,
        rightArm,
        hp: 78 + waveLevel * 12,
        speed: 4.6 + waveLevel * 0.18,
        contactDamage: 8 + waveLevel * 0.45,
        phase: Math.random() * Math.PI * 2,
        lateral: THREE.MathUtils.randFloat(0.4, 1.0)
      };

      body.entityRef = zombie;
      body.entityType = 'zombie';
      zombies.push(zombie);
      return zombie;
    }

    function spawnWave(waveLevel) {
      const amount = Math.min(8 + waveLevel * 3, 54);
      const ringRadius = Math.min(70, 44 + waveLevel * 2.4);

      for (let index = 0; index < amount; index++) {
        const angle = (index / amount) * Math.PI * 2 + Math.random() * 0.45;
        const radius = ringRadius + Math.random() * 20;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        createZombie(x, z, waveLevel);
      }
    }

    function updatePlayer(dt) {
      const movement = new THREE.Vector3(0, 0, 0);
      if (state.keys.w) movement.z -= 1;
      if (state.keys.s) movement.z += 1;
      if (state.keys.a) movement.x -= 1;
      if (state.keys.d) movement.x += 1;
      if (movement.lengthSq() > 0) movement.normalize();

      const speed = state.keys.shift ? player.sprintSpeed : player.moveSpeed;
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
          player.gunPivot.rotation.y = yaw;
        }
      }

      if (state.mouseDown) shoot();
    }

    function updateZombies(dt) {
      const now = performance.now() * 0.001;

      for (let index = zombies.length - 1; index >= 0; index--) {
        const zombie = zombies[index];
        if (zombie.hp <= 0) {
          removeZombie(index);
          continue;
        }

        const toPlayer = new THREE.Vector3().subVectors(player.root.position, zombie.root.position);
        const distance = toPlayer.length();
        if (distance > 0.001) toPlayer.multiplyScalar(1 / distance);

        const strafe = Math.sin(now * 1.7 + zombie.phase) * 0.35 * zombie.lateral;
        const desiredX = toPlayer.x + toPlayer.z * strafe;
        const desiredZ = toPlayer.z - toPlayer.x * strafe;
        const desiredDir = new THREE.Vector3(desiredX, 0, desiredZ).normalize();

        const currentVelocity = zombie.body.getLinearVelocity();
        const drive = distance > 1.95 ? zombie.speed : 0;
        setBodyVelocity(zombie.body, desiredDir.x * drive, currentVelocity.y(), desiredDir.z * drive);

        const yaw = Math.atan2(toPlayer.x, toPlayer.z);
        const sway = Math.sin(now * 5.1 + zombie.phase) * 0.12;
        zombie.root.rotation.y = yaw + sway;
        zombie.root.rotation.z = sway * 0.3;

        const armSwing = Math.sin(now * 8 + zombie.phase) * 0.8;
        zombie.leftArm.rotation.x = armSwing;
        zombie.rightArm.rotation.x = -armSwing * 0.85;

        if (distance < 1.8) {
          state.health -= zombie.contactDamage * dt;
          if (state.health <= 0) {
            state.health = 0;
            endGame();
            return;
          }
        }
      }
    }

    function shoot() {
      if (!state.running || state.reloading || state.ammo <= 0) return;

      const now = performance.now();
      if (now - state.lastShotMs < 92) return;
      state.lastShotMs = now;
      state.ammo -= 1;

      const origin = player.root.position.clone().addScaledVector(state.aimDirection, 2.2);
      origin.y = 1.34;

      const bulletMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), materials.bullet);
      bulletMesh.position.copy(origin);
      bulletMesh.castShadow = true;
      scene.add(bulletMesh);

      const shape = new AmmoLib.btSphereShape(0.22);
      shape.setMargin(0.02);
      const body = createRigidBody(bulletMesh, shape, 0.24);
      body.setFriction(0.02);
      body.setRestitution(0.05);
      body.setCcdMotionThreshold(0.03);
      body.setCcdSweptSphereRadius(0.18);

      const bulletSpeed = 80;
      setBodyVelocity(body, state.aimDirection.x * bulletSpeed, 0, state.aimDirection.z * bulletSpeed);

      const bullet = {
        mesh: bulletMesh,
        body,
        life: 1.35,
        damage: 34,
        direction: state.aimDirection.clone()
      };
      body.entityRef = bullet;
      body.entityType = 'bullet';
      bullets.push(bullet);

      spawnSparkBurst(origin, 0xffc670, 8, 0.22, 26);
    }

    function reload() {
      if (state.reloading || state.ammo >= 32 || state.reserve <= 0) return;

      state.reloading = true;
      updateHud();
      window.setTimeout(() => {
        const needed = 32 - state.ammo;
        const taken = Math.min(needed, state.reserve);
        state.ammo += taken;
        state.reserve -= taken;
        state.reloading = false;
        updateHud();
      }, 1050);
    }

    function updateBullets(dt) {
      for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = bullets[bulletIndex];
        bullet.life -= dt;

        if (
          bullet.life <= 0 ||
          Math.abs(bullet.mesh.position.x) > ARENA_HALF + 10 ||
          Math.abs(bullet.mesh.position.z) > ARENA_HALF + 10
        ) {
          removeBullet(bulletIndex);
          continue;
        }

        let hitZombieIndex = -1;
        for (let zombieIndex = zombies.length - 1; zombieIndex >= 0; zombieIndex--) {
          const zombie = zombies[zombieIndex];
          const maxDist = 1.3;
          if (bullet.mesh.position.distanceToSquared(zombie.root.position) <= maxDist * maxDist) {
            hitZombieIndex = zombieIndex;
            break;
          }
        }

        if (hitZombieIndex >= 0) {
          const zombie = zombies[hitZombieIndex];
          zombie.hp -= bullet.damage;
          spawnBloodSpray(zombie.root.position, 18, 0.46, 34);
          spawnBloodDecal(zombie.root.position, 0.28 + Math.random() * 0.28);
          removeBullet(bulletIndex);

          if (zombie.hp <= 0) {
            state.score += 130;
            removeZombie(hitZombieIndex);
          }
          continue;
        }

        let hitCrateIndex = -1;
        for (let crateIndex = crates.length - 1; crateIndex >= 0; crateIndex--) {
          const crate = crates[crateIndex];
          const maxDist = Math.max(crate.width, crate.depth) * 0.68 + 0.25;
          if (bullet.mesh.position.distanceToSquared(crate.mesh.position) <= maxDist * maxDist) {
            hitCrateIndex = crateIndex;
            break;
          }
        }

        if (hitCrateIndex >= 0) {
          damageCrate(hitCrateIndex, bullet);
          removeBullet(bulletIndex);
        }
      }
    }

    function damageCrate(crateIndex, bullet) {
      const crate = crates[crateIndex];
      if (!crate) return;

      crate.hp -= bullet.damage * 0.9;

      const currentVelocity = crate.body.getLinearVelocity();
      const push = 5.5;
      setBodyVelocity(
        crate.body,
        currentVelocity.x() + bullet.direction.x * push,
        currentVelocity.y() + 1.2,
        currentVelocity.z() + bullet.direction.z * push
      );

      spawnWoodSplinters(crate.mesh.position, 10, 0.42, 20);

      if (crate.hp <= 0) {
        state.score += 20;
        spawnWoodSplinters(crate.mesh.position, 24, 0.62, 34);
        removeCrate(crateIndex);
      }
    }

    function checkProgress() {
      if (zombies.length === 0) {
        state.wave += 1;
        state.reserve += 28;
        spawnWave(state.wave);
      }
    }

    function updateEffects(dt) {
      for (let index = effects.length - 1; index >= 0; index--) {
        const effect = effects[index];
        effect.life -= dt;

        if (effect.gravity) {
          effect.velocity.y -= effect.gravity * dt;
        }

        effect.mesh.position.addScaledVector(effect.velocity, dt);
        if (effect.mesh.material && 'opacity' in effect.mesh.material) {
          effect.mesh.material.opacity = Math.max(0, effect.life * effect.fade);
        }

        if (effect.life <= 0) {
          scene.remove(effect.mesh);
          effects.splice(index, 1);
        }
      }
    }

    function updateDecals(dt) {
      for (let index = decals.length - 1; index >= 0; index--) {
        const decal = decals[index];
        decal.life -= dt;

        const t = Math.max(0, decal.life / decal.totalLife);
        decal.mesh.material.opacity = Math.max(0, t * 0.72);

        if (decal.life <= 0) {
          scene.remove(decal.mesh);
          decals.splice(index, 1);
        }
      }
    }

    function spawnSparkBurst(origin, color, count, life, speed) {
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 6, 6),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
        );
        mesh.position.copy(origin);
        scene.add(mesh);

        const velocity = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1),
          Math.random() * 0.8 + 0.25,
          THREE.MathUtils.randFloatSpread(1)
        ).normalize().multiplyScalar(speed * (0.55 + Math.random() * 0.65));

        effects.push({ mesh, velocity, life: life * (0.7 + Math.random() * 0.8), fade: 2.8, gravity: 18 });
      }
    }

    function spawnBloodSpray(origin, count, life, speed) {
      for (let i = 0; i < count; i++) {
        const size = 0.06 + Math.random() * 0.09;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(size, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x8c1212, transparent: true, opacity: 1 })
        );
        mesh.position.copy(origin);
        mesh.position.y += Math.random() * 1.2;
        scene.add(mesh);

        const velocity = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1),
          Math.random() * 0.9 + 0.2,
          THREE.MathUtils.randFloatSpread(1)
        ).normalize().multiplyScalar(speed * (0.45 + Math.random() * 0.85));

        effects.push({ mesh, velocity, life: life * (0.7 + Math.random() * 1.1), fade: 2.4, gravity: 21 });
      }
    }

    function spawnWoodSplinters(origin, count, life, speed) {
      for (let i = 0; i < count; i++) {
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

        effects.push({ mesh, velocity, life: life * (0.75 + Math.random() * 0.9), fade: 1.8, gravity: 22 });
      }
    }

    function spawnBloodDecal(origin, scaleMul) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2 * scaleMul, 1.2 * scaleMul),
        materials.bloodDecal.clone()
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = Math.random() * Math.PI * 2;
      mesh.position.set(origin.x, 0.08, origin.z);
      scene.add(mesh);
      decals.push({ mesh, life: 24 + Math.random() * 18, totalLife: 24 + Math.random() * 18 });
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

    function removeBullet(index) {
      const bullet = bullets[index];
      if (!bullet) return;
      removePhysicsObject(bullet.mesh, bullet.body);
      bullets.splice(index, 1);
    }

    function removeZombie(index) {
      const zombie = zombies[index];
      if (!zombie) return;

      spawnBloodSpray(zombie.root.position, 26, 0.75, 42);
      for (let i = 0; i < 3; i++) {
        spawnBloodDecal(zombie.root.position, 0.35 + Math.random() * 0.45);
      }

      removePhysicsObject(zombie.root, zombie.body);
      zombies.splice(index, 1);
    }

    function removeCrate(index) {
      const crate = crates[index];
      if (!crate) return;
      removePhysicsObject(crate.mesh, crate.body);
      crates.splice(index, 1);
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
      hud.health.textContent = Math.max(0, Math.round(state.health));
      hud.score.textContent = state.score;
      hud.wave.textContent = state.wave;
      hud.ammo.textContent = state.reloading ? '...' : state.ammo;
      hud.reserve.textContent = state.reserve;
    }

    function endGame() {
      state.running = false;
      state.mouseDown = false;
      hud.overlay.classList.remove('hidden');
      hud.overlay.innerHTML = '<div><h1>Game Over</h1><p>Punkte: <strong>' + state.score + '</strong></p><p>Welle: <strong>' + state.wave + '</strong></p><p>Druecke F5 fuer Neustart.</p></div>';
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

    function createProceduralTextures(rendererRef, three) {
      const maxAnisotropy = rendererRef.capabilities.getMaxAnisotropy ? rendererRef.capabilities.getMaxAnisotropy() : 1;

      const createCanvasTexture = (size, paint, repeatX, repeatY) => {
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
        if ('encoding' in texture && three.sRGBEncoding !== undefined) texture.encoding = three.sRGBEncoding;
        texture.needsUpdate = true;
        return texture;
      };

      const ground = createCanvasTexture(1024, (ctx, size) => {
        ctx.fillStyle = '#4e5458';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 36000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const shade = 52 + Math.floor(Math.random() * 30);
          ctx.fillStyle = 'rgba(' + shade + ',' + (shade + 5) + ',' + (shade + 8) + ',0.26)';
          ctx.fillRect(x, y, 2, 2);
        }
      }, 16, 16);

      const groundRoughness = createCanvasTexture(1024, (ctx, size) => {
        ctx.fillStyle = '#c9c9c9';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 26000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const value = 120 + Math.floor(Math.random() * 94);
          ctx.fillStyle = 'rgb(' + value + ',' + value + ',' + value + ')';
          ctx.fillRect(x, y, 2, 2);
        }
      }, 16, 16);

      const asphalt = createCanvasTexture(1024, (ctx, size) => {
        ctx.fillStyle = '#2f3236';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 36000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const shade = 38 + Math.floor(Math.random() * 24);
          ctx.fillStyle = 'rgba(' + shade + ',' + shade + ',' + (shade + 4) + ',0.4)';
          ctx.fillRect(x, y, 2, 2);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.045)';
        for (let i = 0; i < 80; i++) {
          ctx.beginPath();
          const sx = Math.random() * size;
          const sy = Math.random() * size;
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + THREE.MathUtils.randFloatSpread(120), sy + THREE.MathUtils.randFloatSpread(120));
          ctx.stroke();
        }
      }, 10, 10);

      const concrete = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#777c81';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 12000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const value = 100 + Math.floor(Math.random() * 70);
          ctx.fillStyle = 'rgba(' + value + ',' + (value + 2) + ',' + (value + 4) + ',0.24)';
          ctx.fillRect(x, y, 2, 2);
        }
      }, 4, 4);

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
      }, 1, 1);

      const metal = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#636770';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 10000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const b = 104 + Math.floor(Math.random() * 90);
          ctx.fillStyle = 'rgba(' + b + ',' + b + ',' + (b + 5) + ',0.33)';
          ctx.fillRect(x, y, 1, 1);
        }
      }, 4, 4);

      const crate = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#684a2e';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 6;
        for (let y = 0; y <= size; y += 48) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(size, y + THREE.MathUtils.randFloatSpread(8));
          ctx.stroke();
        }
        for (let i = 0; i < 5200; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const value = 88 + Math.floor(Math.random() * 40);
          ctx.fillStyle = 'rgba(' + value + ',' + (value - 8) + ',' + (value - 16) + ',0.45)';
          ctx.fillRect(x, y, 2, 1);
        }
      }, 2, 2);

      const rock = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#3d3f45';
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 14000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const value = 52 + Math.floor(Math.random() * 60);
          ctx.fillStyle = 'rgba(' + value + ',' + value + ',' + (value + 4) + ',0.32)';
          ctx.fillRect(x, y, 2, 2);
        }
      }, 2, 2);

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
      }, 2, 2);

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
      }, 2, 2);

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
      }, 2, 2);

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
      }, 1, 1);

      return {
        ground,
        groundRoughness,
        asphalt,
        concrete,
        lane,
        metal,
        crate,
        rock,
        zombieCloth,
        zombieSkin,
        rust,
        blood
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

      return {
        ground: new THREE.MeshStandardMaterial({ map: textures.ground, roughnessMap: textures.groundRoughness, roughness: 0.95, metalness: 0.04 }),
        groundCollider: new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 1, metalness: 0 }),
        invisibleCollider: new THREE.MeshBasicMaterial({ color: 0x000000, visible: false }),
        wall: new THREE.MeshStandardMaterial({ map: textures.rock, roughness: 0.9, metalness: 0.12 }),
        road: new THREE.MeshStandardMaterial({ map: textures.asphalt, roughness: 0.9, metalness: 0.08, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
        lanePaint: new THREE.MeshStandardMaterial({ map: textures.lane, roughness: 0.65, metalness: 0.05 }),
        sidewalk: new THREE.MeshStandardMaterial({ map: textures.concrete, roughness: 0.88, metalness: 0.06 }),
        grime: grimeMaterial,
        concreteBlock: new THREE.MeshStandardMaterial({ map: textures.concrete, roughness: 0.92, metalness: 0.04 }),
        breakableCrate: new THREE.MeshStandardMaterial({ map: textures.crate, roughness: 0.8, metalness: 0.03 }),
        rock: new THREE.MeshStandardMaterial({ map: textures.rock, roughness: 0.95, metalness: 0.05 }),
        carBody: new THREE.MeshStandardMaterial({ map: textures.metal, roughness: 0.45, metalness: 0.55 }),
        carRust: new THREE.MeshStandardMaterial({ map: textures.rust, roughness: 0.82, metalness: 0.22 }),
        carWindow: new THREE.MeshStandardMaterial({ color: 0x4d606d, roughness: 0.2, metalness: 0.6, transparent: true, opacity: 0.72 }),
        tire: new THREE.MeshStandardMaterial({ color: 0x1f2023, roughness: 0.9, metalness: 0.08 }),
        lampPole: new THREE.MeshStandardMaterial({ color: 0x5e646c, roughness: 0.56, metalness: 0.5 }),
        lampBulb: new THREE.MeshStandardMaterial({ color: 0xffd39d, emissive: 0xffb46b, emissiveIntensity: 1.2, roughness: 0.15, metalness: 0.2 }),

        playerBody: new THREE.MeshStandardMaterial({ map: textures.metal, roughness: 0.5, metalness: 0.4 }),
        playerHelmet: new THREE.MeshStandardMaterial({ color: 0x8ec7f1, roughness: 0.34, metalness: 0.64 }),
        playerVest: new THREE.MeshStandardMaterial({ color: 0x385264, roughness: 0.72, metalness: 0.18 }),
        weapon: new THREE.MeshStandardMaterial({ map: textures.metal, roughness: 0.32, metalness: 0.78 }),
        weaponDark: new THREE.MeshStandardMaterial({ color: 0x25282f, roughness: 0.42, metalness: 0.65 }),

        zombieBody: new THREE.MeshStandardMaterial({ map: textures.zombieCloth, roughness: 0.7, metalness: 0.14 }),
        zombieCloth: new THREE.MeshStandardMaterial({ map: textures.zombieCloth, roughness: 0.78, metalness: 0.08 }),
        zombieHead: new THREE.MeshStandardMaterial({ map: textures.zombieSkin, roughness: 0.82, metalness: 0.02 }),
        zombieJaw: new THREE.MeshStandardMaterial({ color: 0x5a6d42, roughness: 0.86, metalness: 0.02 }),
        zombieLimb: new THREE.MeshStandardMaterial({ map: textures.zombieSkin, roughness: 0.8, metalness: 0.03 }),

        bullet: new THREE.MeshStandardMaterial({ color: 0xffdf8a, emissive: 0xffa023, emissiveIntensity: 1.3, roughness: 0.2, metalness: 0.7 }),
        bloodDecal: new THREE.MeshStandardMaterial({
          map: textures.blood,
          color: 0x8d1111,
          transparent: true,
          opacity: 0.75,
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
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.innerHTML = '<div><h1>Startfehler</h1><p>Spiel konnte nicht geladen werden.</p><p>' + String(error && error.message ? error.message : error) + '</p></div>';
    }
  }
})();
