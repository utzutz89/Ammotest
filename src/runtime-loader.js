(function () {
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function loadThree() {
    try {
      await loadScript('vendor/three.min.js');
      console.info('[runtime] Loaded vendor/three.min.js');
    } catch (err) {
      await loadScript('vendor/three-lite.min.js');
      console.warn('[runtime] Fallback: vendor/three-lite.min.js (placeholder runtime).');
    }
  }

  async function loadAmmo() {
    // Prefer wasm build for better performance/physics.
    window.Module = window.Module || {};
    window.Module.locateFile = function (path) {
      if (path.endsWith('.wasm')) return 'vendor/' + path;
      return path;
    };

    try {
      await loadScript('vendor/ammo.wasm.js');
      console.info('[runtime] Loaded vendor/ammo.wasm.js');
      return;
    } catch (err) {
      console.warn('[runtime] ammo.wasm.js not found, trying ammo.js');
    }

    try {
      await loadScript('vendor/ammo.js');
      console.info('[runtime] Loaded vendor/ammo.js');
    } catch (err) {
      await loadScript('vendor/ammo-lite.js');
      console.warn('[runtime] Fallback: vendor/ammo-lite.js (placeholder runtime).');
    }
  }

  async function boot() {
    await loadThree();
    await loadAmmo();
    await loadScript('src/game.js');
  }

  boot().catch((error) => {
    console.error('Runtime bootstrap failed:', error);
    var el = document.getElementById('overlay');
    if (el) {
      el.classList.remove('hidden');
      el.innerHTML = '<div><h1>Startfehler</h1><p>Runtimes konnten nicht geladen werden.</p></div>';
    }
  });
})();
