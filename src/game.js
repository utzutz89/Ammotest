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

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('physicallyCorrectLights' in renderer) renderer.physicallyCorrectLights = true;
    if ('outputEncoding' in renderer && THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    if ('toneMapping' in renderer && THREE.ACESFilmicToneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
    }
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x86a4bf);
    scene.fog = new THREE.Fog(0x86a4bf, 48, 220);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
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

    const ARENA_HALF = 80;
    const dynamicObjects = [];
    const enemies = [];
    const bullets = [];
    const effects = [];

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
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    const clock = new THREE.Clock();
    requestAnimationFrame(loop);

    function loop() {
      const dt = Math.min(clock.getDelta(), 0.033);

      if (state.running) {
        updatePlayer(dt);
        updateEnemies(dt);
        physicsWorld.stepSimulation(dt, 10);
        syncDynamicObjects();
        updateBullets(dt);
        updateEffects(dt);
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

      if (key === 'r') {
        reload();
      }
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
      camera.position.set(Math.cos(t) * 26, 34, Math.sin(t) * 26);
      camera.lookAt(0, 2, 0);
    }

    function updateCamera(dt) {
      cameraTarget.copy(player.root.position);
      const desired = new THREE.Vector3(cameraTarget.x, 44, cameraTarget.z + 28);
      cameraAnchor.lerp(desired, 1 - Math.exp(-dt * 7));
      camera.position.copy(cameraAnchor);
      camera.lookAt(cameraTarget.x, 1.2, cameraTarget.z);

      lightRig.sun.target.position.copy(player.root.position);
      lightRig.sun.target.updateMatrixWorld();
    }

    function setupLighting(sceneRef) {
      const hemi = new THREE.HemisphereLight(0xbfdcff, 0x2a1f1a, 0.45);
      sceneRef.add(hemi);

      const sun = new THREE.DirectionalLight(0xfff2da, 2.0);
      sun.position.set(42, 64, 26);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 220;
      sun.shadow.camera.left = -70;
      sun.shadow.camera.right = 70;
      sun.shadow.camera.top = 70;
      sun.shadow.camera.bottom = -70;
      sceneRef.add(sun);
      sceneRef.add(sun.target);

      const fill = new THREE.PointLight(0x88b8ff, 0.9, 160, 2);
      fill.position.set(-38, 26, -32);
      sceneRef.add(fill);

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

      addStaticBox(ARENA_HALF * 2, 2, ARENA_HALF * 2, 0, -1, 0, materials.groundCollider);

      const wallHeight = 8;
      const wallThickness = 2;
      addStaticBox(ARENA_HALF * 2 + wallThickness * 2, wallHeight, wallThickness, 0, wallHeight * 0.5, -ARENA_HALF - wallThickness * 0.5, materials.wall);
      addStaticBox(ARENA_HALF * 2 + wallThickness * 2, wallHeight, wallThickness, 0, wallHeight * 0.5, ARENA_HALF + wallThickness * 0.5, materials.wall);
      addStaticBox(wallThickness, wallHeight, ARENA_HALF * 2, -ARENA_HALF - wallThickness * 0.5, wallHeight * 0.5, 0, materials.wall);
      addStaticBox(wallThickness, wallHeight, ARENA_HALF * 2, ARENA_HALF + wallThickness * 0.5, wallHeight * 0.5, 0, materials.wall);

      const obstacleCount = 36;
      for (let index = 0; index < obstacleCount; index++) {
        const width = 2 + Math.random() * 3.5;
        const height = 1.6 + Math.random() * 3.6;
        const depth = 2 + Math.random() * 3.5;
        const x = THREE.MathUtils.randFloatSpread((ARENA_HALF - 12) * 2);
        const z = THREE.MathUtils.randFloatSpread((ARENA_HALF - 12) * 2);

        if (Math.hypot(x, z) < 18) continue;

        addStaticBox(width, height, depth, x, height * 0.5, z, Math.random() > 0.45 ? materials.crate : materials.rock);
      }
    }

    function addStaticBox(width, height, depth, x, y, z, material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const shape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(width * 0.5, height * 0.5, depth * 0.5));
      shape.setMargin(0.05);
      createRigidBody(mesh, shape, 0);
    }

    function createPlayer() {
      const root = new THREE.Group();
      root.position.set(0, 1.2, 0);
      scene.add(root);

      const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.3, 2.3, 20), materials.playerBody);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      bodyMesh.position.y = 0;
      root.add(bodyMesh);

      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.86, 22, 16), materials.playerHelmet);
      helmet.position.y = 1.22;
      helmet.castShadow = true;
      root.add(helmet);

      const gunPivot = new THREE.Group();
      gunPivot.position.set(0, 0.8, 0);
      root.add(gunPivot);

      const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 2.2), materials.weapon);
      gunBody.position.set(0, 0, 1.35);
      gunBody.castShadow = true;
      gunPivot.add(gunBody);

      const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.0, 12), materials.weaponDark);
      gunBarrel.rotation.x = Math.PI * 0.5;
      gunBarrel.position.set(0, 0, 2.5);
      gunBarrel.castShadow = true;
      gunPivot.add(gunBarrel);

      const shape = new AmmoLib.btSphereShape(1.08);
      shape.setMargin(0.06);
      const body = createRigidBody(root, shape, 6.0);
      body.setAngularFactor(new AmmoLib.btVector3(0, 0, 0));
      body.setDamping(0.2, 0.99);
      body.setFriction(0.9);
      body.setActivationState(4);

      return {
        root,
        visual: bodyMesh,
        gunPivot,
        body,
        moveSpeed: 13.5,
        sprintSpeed: 20.5
      };
    }

    function createEnemy(positionX, positionZ, waveLevel) {
      const root = new THREE.Group();
      root.position.set(positionX, 1.08, positionZ);
      scene.add(root);

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 2.1, 16), materials.enemyBody);
      torso.castShadow = true;
      torso.receiveShadow = true;
      root.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 14), materials.enemyHead);
      head.position.y = 1.18;
      head.castShadow = true;
      root.add(head);

      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 1.4), materials.enemyGun);
      gun.position.set(0, 0.48, 1.1);
      gun.castShadow = true;
      root.add(gun);

      const shape = new AmmoLib.btSphereShape(1.0);
      shape.setMargin(0.05);
      const body = createRigidBody(root, shape, 3.2 + waveLevel * 0.05);
      body.setAngularFactor(new AmmoLib.btVector3(0, 0, 0));
      body.setDamping(0.25, 0.99);
      body.setFriction(0.85);
      body.setActivationState(4);

      const enemy = {
        root,
        body,
        hp: 56 + waveLevel * 10,
        speed: 7.2 + waveLevel * 0.24,
        contactDamage: 14 + waveLevel * 0.55
      };

      body.entityRef = enemy;
      body.entityType = 'enemy';
      enemies.push(enemy);
    }

    function spawnWave(waveLevel) {
      const amount = Math.min(9 + waveLevel * 3, 48);
      const ringRadius = Math.min(58, 34 + waveLevel * 2.3);

      for (let index = 0; index < amount; index++) {
        const angle = (index / amount) * Math.PI * 2 + Math.random() * 0.35;
        const radius = ringRadius + Math.random() * 14;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        createEnemy(x, z, waveLevel);
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

      if (state.mouseDown) {
        shoot();
      }
    }

    function updateEnemies(dt) {
      for (let index = enemies.length - 1; index >= 0; index--) {
        const enemy = enemies[index];
        if (enemy.hp <= 0) {
          removeEnemy(index);
          continue;
        }

        const toPlayer = new THREE.Vector3().subVectors(player.root.position, enemy.root.position);
        const distance = toPlayer.length();
        if (distance > 0.001) toPlayer.multiplyScalar(1 / distance);

        const currentVelocity = enemy.body.getLinearVelocity();
        const drive = distance > 2.0 ? enemy.speed : 0;
        setBodyVelocity(enemy.body, toPlayer.x * drive, currentVelocity.y(), toPlayer.z * drive);

        const yaw = Math.atan2(toPlayer.x, toPlayer.z);
        enemy.root.rotation.y = yaw;

        if (distance < 2.35) {
          state.health -= enemy.contactDamage * dt;
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
      if (now - state.lastShotMs < 95) return;
      state.lastShotMs = now;
      state.ammo -= 1;

      const origin = player.root.position.clone().addScaledVector(state.aimDirection, 2.2);
      origin.y = 1.3;

      const bulletMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 8),
        materials.bullet
      );
      bulletMesh.position.copy(origin);
      bulletMesh.castShadow = true;
      scene.add(bulletMesh);

      const shape = new AmmoLib.btSphereShape(0.22);
      shape.setMargin(0.02);
      const body = createRigidBody(bulletMesh, shape, 0.22);
      body.setFriction(0.02);
      body.setRestitution(0.05);
      body.setCcdMotionThreshold(0.03);
      body.setCcdSweptSphereRadius(0.18);

      const bulletSpeed = 78;
      setBodyVelocity(body, state.aimDirection.x * bulletSpeed, 0, state.aimDirection.z * bulletSpeed);

      const bullet = {
        mesh: bulletMesh,
        body,
        life: 1.35,
        damage: 34
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

        let hitEnemyIndex = -1;
        for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
          const enemy = enemies[enemyIndex];
          const maxDist = 1.25;
          if (bullet.mesh.position.distanceToSquared(enemy.root.position) <= maxDist * maxDist) {
            hitEnemyIndex = enemyIndex;
            break;
          }
        }

        if (hitEnemyIndex >= 0) {
          const enemy = enemies[hitEnemyIndex];
          enemy.hp -= bullet.damage;
          spawnSparkBurst(enemy.root.position, 0xff5f5f, 12, 0.36, 30);
          removeBullet(bulletIndex);

          if (enemy.hp <= 0) {
            state.score += 110;
            removeEnemy(hitEnemyIndex);
          }
        }
      }
    }

    function checkProgress() {
      if (enemies.length === 0) {
        state.wave += 1;
        state.reserve += 26;
        spawnWave(state.wave);
      }
    }

    function updateEffects(dt) {
      for (let index = effects.length - 1; index >= 0; index--) {
        const effect = effects[index];
        effect.life -= dt;

        effect.velocity.y -= 18 * dt;
        effect.mesh.position.addScaledVector(effect.velocity, dt);
        effect.mesh.material.opacity = Math.max(0, effect.life * 2.8);

        if (effect.life <= 0) {
          scene.remove(effect.mesh);
          effects.splice(index, 1);
        }
      }
    }

    function spawnSparkBurst(origin, color, count, life, speed) {
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }));
        mesh.position.copy(origin);
        scene.add(mesh);

        const velocity = new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1),
          Math.random() * 0.8 + 0.25,
          THREE.MathUtils.randFloatSpread(1)
        ).normalize().multiplyScalar(speed * (0.55 + Math.random() * 0.65));

        effects.push({ mesh, velocity, life: life * (0.7 + Math.random() * 0.8) });
      }
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

    function removeEnemy(index) {
      const enemy = enemies[index];
      if (!enemy) return;

      spawnSparkBurst(enemy.root.position, 0xff3f3f, 18, 0.45, 36);
      removePhysicsObject(enemy.root, enemy.body);
      enemies.splice(index, 1);
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
        ctx.fillStyle = '#3f474e';
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 32000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const shade = 45 + Math.floor(Math.random() * 28);
          ctx.fillStyle = 'rgba(' + shade + ',' + (shade + 5) + ',' + (shade + 9) + ',0.24)';
          ctx.fillRect(x, y, 2, 2);
        }

        ctx.strokeStyle = 'rgba(180,190,198,0.08)';
        ctx.lineWidth = 1.25;
        for (let l = 0; l < 120; l++) {
          ctx.beginPath();
          const startX = Math.random() * size;
          const startY = Math.random() * size;
          ctx.moveTo(startX, startY);
          ctx.lineTo(startX + THREE.MathUtils.randFloatSpread(130), startY + THREE.MathUtils.randFloatSpread(130));
          ctx.stroke();
        }
      }, 18, 18);

      const groundRoughness = createCanvasTexture(1024, (ctx, size) => {
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 26000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const value = 128 + Math.floor(Math.random() * 80);
          ctx.fillStyle = 'rgb(' + value + ',' + value + ',' + value + ')';
          ctx.fillRect(x, y, 2, 2);
        }
      }, 18, 18);

      const metal = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#60646d';
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 9000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const b = 110 + Math.floor(Math.random() * 80);
          ctx.fillStyle = 'rgba(' + b + ',' + b + ',' + (b + 5) + ',0.35)';
          ctx.fillRect(x, y, 1, 1);
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        for (let y = 0; y < size; y += 14) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(size, y + THREE.MathUtils.randFloatSpread(2));
          ctx.stroke();
        }
      }, 4, 4);

      const crate = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#5b4632';
        ctx.fillRect(0, 0, size, size);

        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 7;
        for (let y = 0; y <= size; y += 52) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(size, y + THREE.MathUtils.randFloatSpread(8));
          ctx.stroke();
        }

        for (let i = 0; i < 5200; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const value = 78 + Math.floor(Math.random() * 38);
          ctx.fillStyle = 'rgba(' + value + ',' + (value - 8) + ',' + (value - 16) + ',0.45)';
          ctx.fillRect(x, y, 2, 1);
        }
      }, 2, 2);

      const rock = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#3d3e43';
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 12000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const value = 50 + Math.floor(Math.random() * 55);
          ctx.fillStyle = 'rgba(' + value + ',' + value + ',' + (value + 4) + ',0.35)';
          ctx.fillRect(x, y, 2, 2);
        }
      }, 2, 2);

      const enemy = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#7d2f2f';
        ctx.fillRect(0, 0, size, size);

        ctx.strokeStyle = 'rgba(20,0,0,0.26)';
        ctx.lineWidth = 5;
        for (let i = 0; i < 14; i++) {
          const y = (i / 14) * size;
          ctx.beginPath();
          ctx.moveTo(0, y + THREE.MathUtils.randFloatSpread(10));
          ctx.lineTo(size, y + THREE.MathUtils.randFloatSpread(10));
          ctx.stroke();
        }

        for (let i = 0; i < 5600; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const value = 120 + Math.floor(Math.random() * 80);
          ctx.fillStyle = 'rgba(' + value + ',40,40,0.28)';
          ctx.fillRect(x, y, 2, 2);
        }
      }, 2, 2);

      const player = createCanvasTexture(512, (ctx, size) => {
        ctx.fillStyle = '#2b5e74';
        ctx.fillRect(0, 0, size, size);

        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 4;
        for (let i = 0; i < 12; i++) {
          const x = (i / 12) * size;
          ctx.beginPath();
          ctx.moveTo(x + THREE.MathUtils.randFloatSpread(6), 0);
          ctx.lineTo(x + THREE.MathUtils.randFloatSpread(6), size);
          ctx.stroke();
        }

        for (let i = 0; i < 5000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const value = 110 + Math.floor(Math.random() * 90);
          ctx.fillStyle = 'rgba(' + (value - 25) + ',' + value + ',' + (value + 18) + ',0.2)';
          ctx.fillRect(x, y, 2, 1);
        }
      }, 2, 2);

      return { ground, groundRoughness, metal, crate, rock, enemy, player };
    }

    function createMaterials(textures) {
      return {
        ground: new THREE.MeshStandardMaterial({ map: textures.ground, roughnessMap: textures.groundRoughness, roughness: 0.96, metalness: 0.04 }),
        groundCollider: new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 1, metalness: 0 }),
        wall: new THREE.MeshStandardMaterial({ map: textures.rock, roughness: 0.9, metalness: 0.1 }),
        crate: new THREE.MeshStandardMaterial({ map: textures.crate, roughness: 0.82, metalness: 0.04 }),
        rock: new THREE.MeshStandardMaterial({ map: textures.rock, roughness: 0.95, metalness: 0.05 }),
        playerBody: new THREE.MeshStandardMaterial({ map: textures.player, roughness: 0.55, metalness: 0.34 }),
        playerHelmet: new THREE.MeshStandardMaterial({ color: 0x8dcdf3, roughness: 0.35, metalness: 0.62 }),
        weapon: new THREE.MeshStandardMaterial({ map: textures.metal, roughness: 0.32, metalness: 0.76 }),
        weaponDark: new THREE.MeshStandardMaterial({ color: 0x25282f, roughness: 0.4, metalness: 0.68 }),
        enemyBody: new THREE.MeshStandardMaterial({ map: textures.enemy, roughness: 0.62, metalness: 0.2 }),
        enemyHead: new THREE.MeshStandardMaterial({ color: 0xd6a08a, roughness: 0.8, metalness: 0.02 }),
        enemyGun: new THREE.MeshStandardMaterial({ color: 0x2c2f35, roughness: 0.48, metalness: 0.5 }),
        bullet: new THREE.MeshStandardMaterial({ color: 0xffdf8a, emissive: 0xffa023, emissiveIntensity: 1.3, roughness: 0.2, metalness: 0.7 })
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
