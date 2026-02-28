(function (root) {
  function createOverlay() {
    const node = document.createElement('div');
    node.style.position = 'fixed';
    node.style.top = '10px';
    node.style.right = '10px';
    node.style.zIndex = '10000';
    node.style.background = 'rgba(0,0,0,0.62)';
    node.style.border = '1px solid rgba(255,255,255,0.18)';
    node.style.borderRadius = '6px';
    node.style.padding = '8px 10px';
    node.style.font = '12px/1.35 monospace';
    node.style.color = '#d9f3ff';
    node.style.pointerEvents = 'none';
    node.style.whiteSpace = 'pre';
    node.style.display = 'none';
    document.body.appendChild(node);

    let enabled = false;
    let elapsed = 0;

    function toggle(force) {
      enabled = typeof force === 'boolean' ? force : !enabled;
      node.style.display = enabled ? 'block' : 'none';
      return enabled;
    }

    function update(data, dt) {
      if (!enabled) return;
      elapsed += dt || 0;
      if (elapsed < 0.12) return;
      elapsed = 0;

      const lines = [
        'DEBUG (F3)',
        'fps: ' + (data.fps || 0).toFixed(1),
        'zombies: ' + (data.zombies || 0),
        'effects: ' + (data.effects || 0) + '/' + (data.effectLimit || 0),
        'decals: ' + (data.decals || 0),
        'debris: ' + (data.debris || 0) + '/' + (data.debrisLimit || 0),
        'drawcalls: ' + (data.drawCalls || 0),
        'bodies: ' + (data.physicsBodies || 0),
        'perf: ' + (data.lowPerf ? 'low' : 'normal')
      ];
      if (data.cachedMeshes !== undefined) {
        lines.push('pool: ' + data.cachedMeshes);
      }
      node.textContent = lines.join('\n');
    }

    return { toggle, update };
  }

  const api = { createOverlay };
  root.AmmoDebugOverlay = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
