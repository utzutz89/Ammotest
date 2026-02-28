(function (root) {
  function getZombieTypeForWave(waveLevel, randomValue) {
    if (waveLevel <= 2) return 'normal';
    const roll = randomValue !== undefined ? randomValue : Math.random();
    if (waveLevel >= 5 && roll < 0.15) return 'brute';
    if (waveLevel >= 3 && roll < (waveLevel >= 5 ? 0.35 : 0.2)) return 'runner';
    return 'normal';
  }

  function getWaveSpawnPlan(waveLevel, waveConfig) {
    const cfg = waveConfig || {};
    const amount = Math.min((cfg.baseCount || 8) + waveLevel * (cfg.countPerWave || 3), cfg.maxCount || 54);
    return {
      amount,
      ringRadius: Math.min(cfg.maxRadius || 70, (cfg.baseRadius || 44) + waveLevel * (cfg.radiusPerWave || 2.4)),
      laneSpawnCount: waveLevel >= (cfg.laneSpawnWave || 4) ? Math.floor(amount * (cfg.laneSpawnRatio || 0.2)) : 0,
      safeRadius: cfg.safeRadius || 22
    };
  }

  function pickUpgradeOptions(count, all, randomFn) {
    const pool = Array.isArray(all) ? all.slice() : [];
    const chosen = [];
    const rnd = typeof randomFn === 'function' ? randomFn : Math.random;
    while (chosen.length < count && pool.length) {
      const idx = Math.floor(rnd() * pool.length);
      chosen.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return chosen;
  }

  function rollDropType(table, randomValue) {
    if (!Array.isArray(table) || !table.length) return null;
    let cursor = 0;
    const roll = randomValue !== undefined ? randomValue : Math.random();
    for (let i = 0; i < table.length; i++) {
      const row = table[i];
      cursor += Number(row.chance || 0);
      if (roll < cursor) return row.type;
    }
    return null;
  }

  function computeAdaptiveLimits(input) {
    const avgDt = Number(input.avgDt || 1 / 60);
    const lowPerf = !!input.lowPerf;
    const baseEffects = Math.max(1, Number(input.baseEffects || 360));
    const baseDebris = Math.max(1, Number(input.baseDebris || 120));
    const minEffects = Math.max(1, Number(input.minEffects || Math.floor(baseEffects * 0.5)));
    const minDebris = Math.max(1, Number(input.minDebris || Math.floor(baseDebris * 0.55)));
    const activeEffects = Math.max(0, Number(input.activeEffects || 0));
    const load = activeEffects / Math.max(1, baseEffects);

    let quality = 1;
    if (lowPerf) quality *= 0.65;
    if (avgDt > 1 / 42) quality *= 0.82;
    if (avgDt > 1 / 35) quality *= 0.72;
    if (load > 0.85) quality *= 0.85;

    const effects = Math.max(minEffects, Math.round(baseEffects * quality));
    const debris = Math.max(minDebris, Math.round(baseDebris * quality));
    const effectScale = Math.max(0.45, Math.min(1, quality));
    return { effects, debris, effectScale };
  }

  function createMeshPool() {
    const buckets = new Map();
    function getBucket(key) {
      if (!buckets.has(key)) buckets.set(key, []);
      return buckets.get(key);
    }
    return {
      acquire(key, createFn) {
        const bucket = getBucket(key);
        return bucket.length ? bucket.pop() : createFn();
      },
      release(key, mesh) {
        if (!mesh) return;
        mesh.visible = false;
        mesh.position.set(0, -9999, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        const bucket = getBucket(key);
        bucket.push(mesh);
      },
      stats() {
        let total = 0;
        buckets.forEach((items) => { total += items.length; });
        return { cachedMeshes: total };
      }
    };
  }

  const api = {
    getZombieTypeForWave,
    getWaveSpawnPlan,
    pickUpgradeOptions,
    rollDropType,
    computeAdaptiveLimits,
    createMeshPool
  };
  root.AmmoGameLogic = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
