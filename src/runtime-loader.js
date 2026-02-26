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

  async function boot() {
    // Prefer full local bundles if user copied them into vendor/.
    try {
      await loadScript('vendor/three.min.js');
      console.info('[runtime] Loaded vendor/three.min.js');
    } catch (err) {
      await loadScript('vendor/three-lite.min.js');
      console.warn('[runtime] Fallback: vendor/three-lite.min.js (placeholder runtime).');
    }

    try {
      await loadScript('vendor/ammo.js');
      console.info('[runtime] Loaded vendor/ammo.js');
    } catch (err) {
      await loadScript('vendor/ammo-lite.js');
      console.warn('[runtime] Fallback: vendor/ammo-lite.js (placeholder runtime).');
    }

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
