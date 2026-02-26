(async function(){
  const AmmoLib = await Ammo();
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 55, 0);

  const world = new AmmoLib.btDiscreteDynamicsWorld();
  world.setGravity(new AmmoLib.btVector3(0, 0, 0));

  const state = {
    running: false,
    keys: {},
    mouseX: innerWidth / 2,
    mouseY: innerHeight / 2,
    lastShot: 0,
    health: 100,
    score: 0,
    wave: 1,
    ammo: 30,
    reserve: 120,
    reloading: false
  };

  const hud = {
    health: document.getElementById('health'),
    score: document.getElementById('score'),
    wave: document.getElementById('wave'),
    ammo: document.getElementById('ammo'),
    reserve: document.getElementById('reserve'),
    overlay: document.getElementById('overlay')
  };

  const arenaSize = 90;
  const bullets = [];
  const enemies = [];
  const particles = [];

  const player = makeBody(0, 0, 2.2, '#4fe5ff', 'player', 1.5);
  player.speed = 22;
  player.sprint = 34;
  player.health = 100;

  for (let i = 0; i < 45; i++) {
    const x = (Math.random() - 0.5) * arenaSize * 1.8;
    const z = (Math.random() - 0.5) * arenaSize * 1.8;
    const r = 1 + Math.random() * 3;
    const rock = makeBody(x, z, r, '#21384d', 'rock', 0);
    rock.noise = Math.random() * 999;
  }

  spawnWave(state.wave);
  updateHud();

  window.addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
  });

  addEventListener('keydown', (e) => {
    state.keys[e.key.toLowerCase()] = true;
    if (!state.running && e.key === 'Enter') {
      state.running = true;
      hud.overlay.classList.add('hidden');
    }
    if (e.key.toLowerCase() === 'r') reload();
  });

  addEventListener('keyup', (e) => state.keys[e.key.toLowerCase()] = false);
  addEventListener('mousemove', (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
  });
  addEventListener('mousedown', () => shoot());

  const clock = new THREE.Clock();
  requestAnimationFrame(loop);

  function loop(t){
    const dt = clock.getDelta();
    if (state.running) {
      updatePlayer(dt);
      updateAI(dt);
      world.stepSimulation(dt);
      updateBullets(dt);
      updateParticles(dt);
      handleCollisions();
      checkProgress();
      updateHud();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function makeBody(x, z, radius, color, kind, mass){
    const body = new AmmoLib.btRigidBody({
      mass,
      radius,
      position: new AmmoLib.btVector3(x,0,z),
      velocity: new AmmoLib.btVector3(0,0,0),
      friction: kind === 'bullet' ? 0 : 0.25,
      restitution: 0.1,
      userData: { kind }
    });
    body.color = color;
    body.kind = kind;
    body.radius = radius;
    body.hp = kind === 'enemy' ? 40 : 0;
    body.facing = new THREE.Vector3(1,0,0);
    body.draw = drawBody;
    scene.add(body);
    world.addRigidBody(body);
    return body;
  }

  function drawBody(ctx, _, canvas){
    const sx = canvas.width * 0.5 + this.position.x * 8;
    const sy = canvas.height * 0.5 + this.position.z * 8;
    const r = this.radius * 8;

    const grd = ctx.createRadialGradient(sx-r*0.2,sy-r*0.2,2,sx,sy,r);
    grd.addColorStop(0, this.color);
    grd.addColorStop(1, '#000000');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI*2);
    ctx.fill();

    if (this.kind === 'player' || this.kind === 'enemy') {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(2, r * 0.15);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + this.facing.x * r * 1.4, sy + this.facing.z * r * 1.4);
      ctx.stroke();
    }
  }

  function updatePlayer(dt){
    const dir = new THREE.Vector3();
    if (state.keys['w']) dir.z -= 1;
    if (state.keys['s']) dir.z += 1;
    if (state.keys['a']) dir.x -= 1;
    if (state.keys['d']) dir.x += 1;
    if (dir.length() > 0) dir.normalize();

    const speed = state.keys['shift'] ? player.sprint : player.speed;
    player.velocity.x = dir.x * speed;
    player.velocity.z = dir.z * speed;

    const worldMouseX = (state.mouseX - innerWidth * 0.5) / 8;
    const worldMouseZ = (state.mouseY - innerHeight * 0.5) / 8;
    player.facing.set(worldMouseX - player.position.x, 0, worldMouseZ - player.position.z).normalize();

    player.position.x = clamp(player.position.x, -arenaSize, arenaSize);
    player.position.z = clamp(player.position.z, -arenaSize, arenaSize);
  }

  function shoot(){
    if (!state.running || state.reloading || state.ammo <= 0) return;
    const now = performance.now();
    if (now - state.lastShot < 110) return;
    state.lastShot = now;
    state.ammo -= 1;

    const b = makeBody(player.position.x + player.facing.x * 3, player.position.z + player.facing.z * 3, 0.58, '#ffe176', 'bullet', 0.2);
    b.life = 1.5;
    b.velocity.x = player.facing.x * 75;
    b.velocity.z = player.facing.z * 75;
    bullets.push(b);

    for (let i = 0; i < 6; i++) {
      spawnParticle(player.position.x, player.position.z, '#ffc56d', 0.25 + Math.random() * 0.2);
    }
  }

  function reload(){
    if (state.reloading || state.ammo === 30 || state.reserve <= 0) return;
    state.reloading = true;
    setTimeout(() => {
      const need = 30 - state.ammo;
      const taken = Math.min(need, state.reserve);
      state.ammo += taken;
      state.reserve -= taken;
      state.reloading = false;
      updateHud();
    }, 1100);
  }

  function updateAI(dt){
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const toPlayer = new THREE.Vector3(player.position.x - e.position.x, 0, player.position.z - e.position.z);
      const d = Math.max(toPlayer.length(), 0.001);
      toPlayer.normalize();
      e.facing.copy(toPlayer);
      e.velocity.x = toPlayer.x * (8 + state.wave * 0.7);
      e.velocity.z = toPlayer.z * (8 + state.wave * 0.7);

      if (d < 2.8) {
        state.health -= 16 * dt;
        if (state.health <= 0) endGame();
      }
    }
  }

  function updateBullets(dt){
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      if (b.life <= 0 || Math.abs(b.position.x) > arenaSize + 10 || Math.abs(b.position.z) > arenaSize + 10) {
        removeBody(b);
        bullets.splice(i, 1);
      }
    }
  }

  function handleCollisions(){
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (e.hp <= 0) continue;
        const dx = b.position.x - e.position.x;
        const dz = b.position.z - e.position.z;
        const minDist = b.radius + e.radius;
        if (dx*dx + dz*dz <= minDist*minDist) {
          e.hp -= 22;
          removeBody(b);
          bullets.splice(bi, 1);
          for (let p = 0; p < 10; p++) spawnParticle(e.position.x, e.position.z, '#ff5d7a', 0.45);
          if (e.hp <= 0) {
            state.score += 100;
            removeBody(e);
            enemies.splice(ei, 1);
          }
          break;
        }
      }
    }
  }

  function updateParticles(dt){
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.position.x += p.velocity.x * dt;
      p.position.z += p.velocity.z * dt;
      if (p.life <= 0) {
        scene.remove(p);
        particles.splice(i, 1);
      }
    }
  }

  function spawnParticle(x,z,color,life){
    const p = {
      position: new AmmoLib.btVector3(x,0,z),
      velocity: new AmmoLib.btVector3((Math.random()-0.5)*25,0,(Math.random()-0.5)*25),
      radius: 0.18 + Math.random()*0.26,
      life,
      draw(ctx, _, canvas){
        const sx = canvas.width * 0.5 + this.position.x * 8;
        const sy = canvas.height * 0.5 + this.position.z * 8;
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.max(this.life * 2, 0);
        ctx.beginPath();
        ctx.arc(sx, sy, this.radius * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };
    particles.push(p);
    scene.add(p);
  }

  function spawnWave(wave){
    const amount = 6 + wave * 3;
    for (let i = 0; i < amount; i++) {
      const angle = (i / amount) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 50 + Math.random() * 35;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const e = makeBody(x, z, 1.7 + Math.random() * 0.35, '#ff375f', 'enemy', 0.9);
      e.hp = 35 + wave * 8;
      enemies.push(e);
    }
  }

  function checkProgress(){
    if (enemies.length === 0) {
      state.wave += 1;
      state.reserve += 30;
      spawnWave(state.wave);
    }
  }

  function removeBody(body){
    world.removeRigidBody(body);
    scene.remove(body);
  }

  function updateHud(){
    hud.health.textContent = Math.max(0, Math.round(state.health));
    hud.score.textContent = state.score;
    hud.wave.textContent = state.wave;
    hud.ammo.textContent = state.reloading ? '...' : state.ammo;
    hud.reserve.textContent = state.reserve;
  }

  function endGame(){
    state.running = false;
    hud.overlay.classList.remove('hidden');
    hud.overlay.innerHTML = `<div><h1>Game Over</h1><p>Punkte: <strong>${state.score}</strong></p><p>Drücke F5 für Neustart.</p></div>`;
  }

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
})();
