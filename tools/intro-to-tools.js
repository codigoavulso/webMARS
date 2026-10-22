(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  function t(message, variables = {}) {
    if (typeof translateText === "function") return translateText(message, variables);
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (i18n && typeof i18n.t === "function") return i18n.t(message, variables);
    return String(message ?? "");
  }

  function subscribeLanguageChange(listener) {
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (!i18n || typeof i18n.subscribe !== "function" || typeof listener !== "function") return () => {};
    return i18n.subscribe(listener);
  }


  const STYLE_ID = "mars-web-tool-intro-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .intro-tool { display:flex; flex-direction:column; height:100%; padding:8px; box-sizing:border-box; gap:8px; font:12px "Segoe UI", Tahoma, sans-serif; }
      .intro-body { border:1px solid var(--line); background:var(--surface); padding:12px; overflow:auto; line-height:1.6; white-space:pre-wrap; flex:1; }
      .intro-footer { display:flex; align-items:center; justify-content:flex-end; gap:8px; }
      .intro-footer .tool-btn { min-width:90px; }
    `;
    document.head.appendChild(style);
  }

  host.register({
    id: "intro-to-tools",
    label: "Introduction to Tools",
    create(ctx) {
      const shell = ctx.createToolWindowShell("intro-to-tools", "Introduction to Tools", 520, 260, `
        <div class="intro-tool">
          <div class="intro-body" data-intro="body"></div>
          <div class="intro-footer">
            <button class="tool-btn" data-intro="manual" type="button">Open the Manual</button>
            <button class="tool-btn" data-intro="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const body = root.querySelector("[data-intro='body']");
      const manualButton = root.querySelector("[data-intro='manual']");
      const closeButton = root.querySelector("[data-intro='close']");

      const renderBody = () => {
        body.textContent = [
          t("Open a tool from the Tools menu."),
          t("Connect to MIPS if the tool offers that option."),
          t("Run or step your program to see the results."),
          t("Use Reset to clear the tool's measurements.")
        ].join("\n");
      };
      manualButton.addEventListener("click", () => ctx.openManual("ferramentas"));
      closeButton.addEventListener("click", shell.close);

      renderBody();

      subscribeLanguageChange(renderBody);

      return {
        isConnected: () => false,
        open: shell.open,
        close: shell.close,
        onSnapshot() {}
      };
    }
  });
})();
