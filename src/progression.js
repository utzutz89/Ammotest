(function (root) {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createManager(config) {
    const cfg = config || {};
    const storageKey = cfg.storageId || cfg.storageKey || 'ammotest_progression_v1';
    const data = {
      metaPoints: 0,
      unlockedWeapons: {}
    };

    function load() {
      try {
        const parsed = JSON.parse(root.localStorage.getItem(storageKey) || '{}');
        data.metaPoints = Math.max(0, Number(parsed.metaPoints || 0));
        data.unlockedWeapons = parsed.unlockedWeapons && typeof parsed.unlockedWeapons === 'object'
          ? parsed.unlockedWeapons
          : {};
      } catch (error) {
        data.metaPoints = 0;
        data.unlockedWeapons = {};
      }
      return data;
    }

    function save() {
      root.localStorage.setItem(storageKey, JSON.stringify(data));
    }

    function computeBonuses() {
      const points = Math.max(0, Number(data.metaPoints || 0));
      const damageBonus = clamp(Math.floor(points / (cfg.pointsForDamageStep || 6)) * 0.03, 0, cfg.maxDamageBonus || 0.3);
      const speedBonus = clamp(Math.floor(points / (cfg.pointsForSpeedStep || 8)) * 0.02, 0, cfg.maxSpeedBonus || 0.2);
      const healthBonus = clamp(Math.floor(points / (cfg.pointsForHealthStep || 5)) * 5, 0, cfg.maxHealthBonus || 50);
      const reloadReductionMs = clamp(Math.floor(points / (cfg.pointsForReloadStep || 7)) * 20, 0, cfg.maxReloadReductionMs || 220);
      return { damageBonus, speedBonus, healthBonus, reloadReductionMs };
    }

    function applyToState(state) {
      if (!state || !state.weapons) return computeBonuses();
      const bonuses = computeBonuses();
      state.damageMul *= (1 + bonuses.damageBonus);
      state.moveSpeedMul *= (1 + bonuses.speedBonus);
      state.maxHealth += bonuses.healthBonus;
      state.health = Math.min(state.maxHealth, state.health + bonuses.healthBonus);
      state.reloadDelayMs = Math.max(300, state.reloadDelayMs - bonuses.reloadReductionMs);
      Object.keys(state.weapons).forEach((key) => {
        if (data.unlockedWeapons[key]) {
          state.weapons[key].unlocked = true;
        }
      });
      return bonuses;
    }

    function onWaveCompleted(wave) {
      data.metaPoints += Math.max(1, Number(cfg.pointsPerWave || 1)) * Math.max(1, Math.floor(wave || 1) >= 3 ? 2 : 1);
      save();
    }

    function onRunEnded(stats) {
      const kills = Number(stats && stats.kills || 0);
      const score = Number(stats && stats.score || 0);
      const wave = Number(stats && stats.wave || 1);
      data.metaPoints += Math.max(0, kills * Number(cfg.pointsPerKill || 0.05));
      data.metaPoints += Math.max(0, Math.floor(score / 1200));
      data.metaPoints += Math.max(0, wave - 1) * 0.25;
      save();
    }

    function recordWeaponUnlock(weaponKey) {
      if (!weaponKey) return;
      data.unlockedWeapons[weaponKey] = true;
      save();
    }

    function getData() {
      return {
        metaPoints: data.metaPoints,
        unlockedWeapons: Object.assign({}, data.unlockedWeapons),
        bonuses: computeBonuses()
      };
    }

    return {
      load,
      save,
      applyToState,
      onWaveCompleted,
      onRunEnded,
      recordWeaponUnlock,
      getData
    };
  }

  const api = { createManager };
  root.AmmoProgression = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
