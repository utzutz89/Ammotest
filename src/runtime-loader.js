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
    var isFileProtocol = !!(window.location && window.location.protocol === 'file:');
    var embeddedWasmBinary = null;
    var lastError = null;
    var candidates = isFileProtocol
      ? ['vendor/ammo.js', 'vendor/ammo.wasm.js']
      : ['vendor/ammo.wasm.js', 'vendor/ammo.js'];

    // Try to preload embedded wasm bytes for file:// startup.
    if (isFileProtocol) {
      try {
        window.Module = window.Module || {};
        await loadScript('vendor/ammo.wasm.binary.js');
        if (window.Module && window.Module.wasmBinary) {
          embeddedWasmBinary = window.Module.wasmBinary;
          console.info('[runtime] Loaded embedded ammo wasm binary for file:// runtime.');
        }
      } catch (inlineError) {
        console.warn('[runtime] Could not load embedded wasm binary:', inlineError);
      }
    }

    for (var i = 0; i < candidates.length; i++) {
      var src = candidates[i];
      try {
        // Reset state between candidates.
        window.Ammo = undefined;
        window.Module = {};
        if (embeddedWasmBinary) {
          window.Module.wasmBinary = embeddedWasmBinary;
        }
        window.Module.locateFile = function (path) {
          if (path.endsWith('.wasm')) return 'vendor/' + path;
          return path;
        };

        await loadScript(src);
        var api = null;
        if (typeof window.Ammo === 'function') {
          api = await Promise.race([
            window.Ammo(),
            new Promise(function (_, reject) {
              window.setTimeout(function () {
                reject(new Error('Ammo initialization timeout for ' + src));
              }, 12000);
            })
          ]);
        } else if (ensureOfficialAmmo(window.Ammo)) {
          api = window.Ammo;
        } else if (ensureOfficialAmmo(window.Module)) {
          api = window.Module;
        }

        if (!api) {
          throw new Error('Ammo API not available after loading ' + src);
        }
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

    var detail = error && error.message ? error.message : String(error);
    var fileHint = window.location && window.location.protocol === 'file:'
      ? '<p><strong>Tipp:</strong> Fuer lokale Datei-Starts nutzt der Loader nun eine eingebettete WASM-Binary. Falls sie fehlt, fuehre das Runtime-Script erneut aus.</p>'
      : '';

    overlay.classList.remove('hidden');
    overlay.innerHTML = [
      '<div>',
      '<h1>Startfehler</h1>',
      '<p>Offizielle Three.js/Ammo.js Runtimes konnten nicht geladen werden.</p>',
      '<p><code>' + detail + '</code></p>',
      fileHint,
      '<p>Fuehre <code>./scripts/fetch-official-runtimes.sh</code> aus und lade die Seite neu.</p>',
      '</div>'
    ].join('');
  }

  boot().catch(showFatalError);
})();
