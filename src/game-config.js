(function (root) {
  const CONFIG = {
    weapons: {
      pistol: {
        label: 'Pistole',
        damage: 34,
        cooldown: 92,
        magazine: 12,
        spreadDeg: 0,
        pellets: 1,
        maxDistance: 60,
        tracerLife: 0.035,
        muzzleOffset: [0, 0.08, 0.9],
        defaultUnlocked: true,
        defaultReserveMagazines: 4
      },
      shotgun: {
        label: 'Shotgun',
        damage: 18,
        cooldown: 680,
        magazine: 6,
        spreadDeg: 18,
        pellets: 6,
        maxDistance: 18,
        tracerLife: 0.03,
        muzzleOffset: [0, 0.12, 1.32],
        defaultUnlocked: false,
        defaultReserveMagazines: 3
      },
      smg: {
        label: 'SMG',
        damage: 18,
        cooldown: 55,
        magazine: 32,
        spreadDeg: 4,
        pellets: 1,
        maxDistance: 60,
        tracerLife: 0.035,
        muzzleOffset: [0, 0.07, 0.95],
        defaultUnlocked: false,
        defaultReserveMagazines: 3
      }
    },
    zombies: {
      types: {
        normal: { hpMul: 1.0, speedMul: 1.0, damageMul: 1.0, scale: 1.0, score: 130 },
        brute: { hpMul: 2.8, speedMul: 0.6, damageMul: 2.2, scale: 1.5, score: 350 },
        runner: { hpMul: 0.5, speedMul: 2.2, damageMul: 0.7, scale: 0.75, score: 80 }
      },
      wave: {
        baseCount: 8,
        countPerWave: 3,
        maxCount: 54,
        baseRadius: 44,
        radiusPerWave: 2.4,
        maxRadius: 70,
        safeRadius: 22,
        laneSpawnWave: 4,
        laneSpawnRatio: 0.2
      }
    },
    upgrades: [
      { id: 'damage', label: 'Mehr Schaden (+20%)' },
      { id: 'speed', label: 'Mehr Speed (+15%)' },
      { id: 'max_hp', label: 'Max HP +25' },
      { id: 'reload', label: 'Schnelleres Nachladen (-200ms)' },
      { id: 'reserve', label: 'Mehr Reserve (+50%)' },
      { id: 'firerate', label: 'Feuerrate +15%' }
    ],
    drops: {
      maxItems: 10,
      table: [
        { type: 'heal', chance: 0.18 },
        { type: 'ammo', chance: 0.08 }
      ]
    },
    limits: {
      effects: 360,
      debris: 120,
      adaptive: {
        minEffects: 180,
        minDebris: 70
      }
    },
    progression: {
      storageId: 'ammotest_progression_v1',
      pointsPerWave: 1,
      pointsPerKill: 0.05,
      maxDamageBonus: 0.3,
      maxSpeedBonus: 0.2,
      maxHealthBonus: 50,
      maxReloadReductionMs: 220,
      pointsForDamageStep: 6,
      pointsForSpeedStep: 8,
      pointsForHealthStep: 5,
      pointsForReloadStep: 7
    },
    gore: {
      enabled: true,
      bloodIntensity: 1.25,
      dismemberChance: 0.82,
      minLimbsPerDeath: 1,
      maxLimbsPerDeath: 3,
      limbLifeMin: 4.0,
      limbLifeMax: 6.5,
      limbImpulseMin: 14,
      limbImpulseMax: 26,
      limbMaxActive: 36,
      impactBloodChance: 0.55
    }
  };

  const api = { CONFIG };
  root.AmmoGameConfig = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
