(function () {
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      var script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('Failed to load: ' + src));
      };
      document.head.appendChild(script);
    });
  }

  function ensureOfficialThree() {
    return !!(
      window.THREE &&
      typeof window.THREE.WebGLRenderer === 'function' &&
      typeof window.THREE.MeshStandardMaterial === 'function' &&
      typeof window.THREE.Scene === 'function'
    );
  }

  function ensureOfficialAmmo(api) {
    return !!(
      api &&
      typeof api.btDefaultCollisionConfiguration === 'function' &&
      typeof api.btCollisionDispatcher === 'function' &&
      typeof api.btDbvtBroadphase === 'function' &&
      typeof api.btSequentialImpulseConstraintSolver === 'function' &&
      typeof api.btDiscreteDynamicsWorld === 'function' &&
      typeof api.btRigidBody === 'function'
    );
  }

  async function loadThree() {
    await loadScript('vendor/three.min.js');
    if (!ensureOfficialThree()) {
      throw new Error('vendor/three.min.js is not an official compatible Three.js runtime.');
    }
    console.info('[runtime] Loaded official Three.js runtime.');
  }

  async function loadAmmo() {
    window.Module = window.Module || {};
    window.Module.locateFile = function (path) {
      if (path.endsWith('.wasm')) return 'vendor/' + path;
      return path;
    };

    var lastError = null;
    var candidates = ['vendor/ammo.wasm.js', 'vendor/ammo.js'];

    for (var i = 0; i < candidates.length; i++) {
      var src = candidates[i];
      try {
        await loadScript(src);
        if (typeof window.Ammo !== 'function') {
          throw new Error('Ammo factory not exposed by ' + src);
        }

        var api = await window.Ammo();
        if (!ensureOfficialAmmo(api)) {
          throw new Error(src + ' loaded but API is not compatible with this game.');
        }

        window.__AMMO_RUNTIME__ = api;
        console.info('[runtime] Loaded official Ammo runtime from ' + src);
        return;
      } catch (error) {
        lastError = error;
        console.warn('[runtime] Failed candidate:', src, error);
      }
    }

    throw lastError || new Error('No compatible Ammo runtime found.');
  }

  async function boot() {
    await loadThree();
    await loadAmmo();
    await loadScript('src/game.js');
  }

  function showFatalError(error) {
    console.error('Runtime bootstrap failed:', error);
    var overlay = document.getElementById('overlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');
    overlay.innerHTML = [
      '<div>',
      '<h1>Startfehler</h1>',
      '<p>Offizielle Three.js/Ammo.js Runtimes konnten nicht geladen werden.</p>',
      '<p>Fuehre <code>./scripts/fetch-official-runtimes.sh</code> aus und lade die Seite neu.</p>',
      '</div>'
    ].join('');
  }

  boot().catch(showFatalError);
})();
