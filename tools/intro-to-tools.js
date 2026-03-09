(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-intro-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .intro-tool { display:flex; flex-direction:column; height:100%; padding:8px; box-sizing:border-box; gap:8px; font:12px "Segoe UI", Tahoma, sans-serif; }
      .intro-body { border:1px solid #9db0c8; background:#fff; padding:8px; overflow:auto; font: 30px "Segoe UI", Tahoma, sans-serif; line-height:1.4; white-space:pre-wrap; flex:1; }
      .intro-footer { display:flex; align-items:center; gap:8px; }
      .intro-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#23334a; }
      .intro-footer .tool-btn { min-width:130px; }
    `;
    document.head.appendChild(style);
  }

  const INTRO_TEXT = `Hello! This Tool does not do anything but you may use its source code as a starting point to build your own MARS Tool or Application.

A MARS Tool is a program listed in the MARS Tools menu. It is launched when you select its menu item and typically interacts with executing MIPS programs to do something exciting and informative or at least interesting.

A MARS Application is a stand-alone program for similarly interacting with executing MIPS programs. It uses MARS' MIPS assembler and runtime simulator in the background to control MIPS execution.

The basic requirements for building a MARS Tool are:
1. It must be a class that implements the MarsTool interface (getName + action).
2. It must be stored in the mars.tools package.
3. It must be successfully compiled in that package.

If these requirements are met, MARS will recognize and load your Tool into its Tools menu the next time it runs.

There are no fixed requirements for building a MARS Application, a stand-alone program that utilizes the MARS API.

The easiest way is to extend AbstractMarsToolAndApplication and implement getName() plus buildMainDisplayArea().

See the source code of existing tool/apps for further information.`;

  host.register({
    id: "intro-to-tools",
    label: "Introduction to Tools",
    create(ctx) {
      const shell = ctx.createToolWindowShell("intro-to-tools", "Introduction to MARS Tools and Applications, Version 1.0", 760, 660, `
        <div class="intro-tool">
          <div class="intro-body" data-intro="body"></div>
          <div class="intro-footer">
            <button class="tool-btn" data-intro="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-intro="reset" type="button">Reset</button>
            <button class="tool-btn" data-intro="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const body = root.querySelector("[data-intro='body']");
      const connectButton = root.querySelector("[data-intro='connect']");
      const resetButton = root.querySelector("[data-intro='reset']");
      const closeButton = root.querySelector("[data-intro='close']");

      let connected = false;
      const renderBody = () => {
        body.textContent = INTRO_TEXT;
        body.scrollTop = 0;
      };

      connectButton.addEventListener("click", () => {
        connected = !connected;
        connectButton.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
      });
      resetButton.addEventListener("click", renderBody);
      closeButton.addEventListener("click", shell.close);

      renderBody();

      return {
        open: shell.open,
        close: shell.close,
        onSnapshot() {}
      };
    }
  });
})();
