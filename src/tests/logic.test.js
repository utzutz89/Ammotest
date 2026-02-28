const assert = require('assert');
const { CONFIG } = require('../game-config.js');
const logic = require('../game-logic.js');

function testWavePlan() {
  const plan = logic.getWaveSpawnPlan(5, CONFIG.zombies.wave);
  assert.ok(plan.amount > 0);
  assert.ok(plan.ringRadius >= CONFIG.zombies.wave.baseRadius);
  assert.ok(plan.safeRadius === CONFIG.zombies.wave.safeRadius);
}

function testDropTable() {
  const type1 = logic.rollDropType(CONFIG.drops.table, 0.1);
  const type2 = logic.rollDropType(CONFIG.drops.table, 0.22);
  const type3 = logic.rollDropType(CONFIG.drops.table, 0.28);
  const type4 = logic.rollDropType(CONFIG.drops.table, 0.9);
  assert.strictEqual(type1, 'heal');
  assert.strictEqual(type2, 'ammo');
  assert.strictEqual(type3, 'armor');
  assert.strictEqual(type4, null);
}

function testUpgradePickUnique() {
  const picks = logic.pickUpgradeOptions(3, CONFIG.upgrades, () => 0.2);
  const ids = picks.map((x) => x.id);
  assert.strictEqual(new Set(ids).size, ids.length);
}

function testAdaptiveLimits() {
  const limits = logic.computeAdaptiveLimits({
    avgDt: 1 / 32,
    lowPerf: true,
    baseEffects: 360,
    baseDebris: 120,
    minEffects: 180,
    minDebris: 70,
    activeEffects: 320
  });
  assert.ok(limits.effects <= 360);
  assert.ok(limits.debris <= 120);
  assert.ok(limits.effectScale <= 1);
}

testWavePlan();
testDropTable();
testUpgradePickUnique();
testAdaptiveLimits();

console.log('[ok] logic tests passed');
