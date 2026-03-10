(() => {
  const MODULE_SCRIPTS = [
    "./assets/js/app-modules/00-core.js",
    "./assets/js/app-modules/00-core-wasm-bridge.js",
    "./assets/js/app-modules/10-ui.js",
    "./assets/js/app-modules/20-app-runtime.js"
  ];

  if (window.__marsWebAppBootstrapped) return;

  function loadSequential(index) {
    if (index >= MODULE_SCRIPTS.length) {
      window.__marsWebAppBootstrapped = true;
      return;
    }

    const src = MODULE_SCRIPTS[index];
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => loadSequential(index + 1);
    script.onerror = () => {
      console.error(`[mars-web] Failed to load module: ${src}`);
      const root = document.querySelector("#app") || document.body;
      const msg = document.createElement("pre");
      msg.textContent = `MARS web loader error: failed to load ${src}`;
      msg.style.color = "#8b0000";
      msg.style.padding = "8px";
      root.appendChild(msg);
    };
    document.head.appendChild(script);
  }

  loadSequential(0);
})();
