(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-screen-mag-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .smag-tool { display:flex; flex-direction:column; gap:8px; height:100%; box-sizing:border-box; padding:8px; font:12px "Segoe UI", Tahoma, sans-serif; }
      .smag-top { display:flex; gap:8px; align-items:center; }
      .smag-top select { min-width:220px; }
      .smag-view { position:relative; border:1px solid #9db0c8; background:#fff; overflow:auto; flex:1; min-height:220px; }
      .smag-content { position:relative; transform-origin:top left; }
      .smag-overlay { position:absolute; inset:0; pointer-events:auto; }
      .smag-settings { border:1px solid #9db0c8; background:#f7fbff; padding:6px; display:flex; gap:14px; align-items:center; }
      .smag-footer { margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .smag-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#24354b; }
      .smag-footer .tool-btn { min-width:120px; }
    `;
    document.head.appendChild(style);
  }

  function clearIds(node) {
    if (!(node instanceof HTMLElement)) return;
    node.removeAttribute("id");
    node.querySelectorAll("[id]").forEach((entry) => entry.removeAttribute("id"));
  }

  function buildTargetOptions() {
    return [
      { value: "#mars-desktop", label: "Desktop (all windows)" },
      { value: "#window-main", label: "Main window" },
      { value: "#window-registers", label: "Registers window" },
      { value: "#window-messages", label: "Messages / Run I/O" }
    ];
  }

  host.register({
    id: "screen-magnifier",
    label: "Screen Magnifier",
    create(ctx) {
      const options = buildTargetOptions();
      const shell = ctx.createToolWindowShell("screen-magnifier", "Screen Magnifier 1.0", 980, 760, `
        <div class="smag-tool">
          <div class="smag-top">
            <button class="tool-btn" data-sm="capture" type="button">Capture</button>
            <button class="tool-btn" data-sm="settings" type="button">Settings...</button>
            <label>Target
              <select data-sm="target">${options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("")}</select>
            </label>
            <label>Scale
              <input type="number" min="1" max="4" step="0.5" value="2" data-sm="scale" style="width:72px;">
            </label>
          </div>
          <div class="smag-settings" data-sm="settings-panel" style="display:none;">
            <label><input type="checkbox" data-sm="auto-resize"> Auto capture on resize</label>
            <label><input type="checkbox" data-sm="auto-scale" checked> Auto capture on scale</label>
            <label><input type="checkbox" data-sm="center" checked> Center capture in view</label>
            <label>Scribble width <input type="number" data-sm="scribble-width" min="1" max="12" step="1" value="2" style="width:56px;"></label>
          </div>
          <div class="smag-view" data-sm="view">
            <div class="smag-content" data-sm="content"></div>
            <canvas class="smag-overlay" data-sm="overlay"></canvas>
          </div>
          <div class="smag-footer">
            <button class="tool-btn" data-sm="clear" type="button">Clear Markup</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-sm="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const captureButton = root.querySelector("[data-sm='capture']");
      const settingsButton = root.querySelector("[data-sm='settings']");
      const settingsPanel = root.querySelector("[data-sm='settings-panel']");
      const targetSelect = root.querySelector("[data-sm='target']");
      const scaleInput = root.querySelector("[data-sm='scale']");
      const view = root.querySelector("[data-sm='view']");
      const content = root.querySelector("[data-sm='content']");
      const overlay = root.querySelector("[data-sm='overlay']");
      const autoResizeCheck = root.querySelector("[data-sm='auto-resize']");
      const autoScaleCheck = root.querySelector("[data-sm='auto-scale']");
      const centerCheck = root.querySelector("[data-sm='center']");
      const scribbleWidthInput = root.querySelector("[data-sm='scribble-width']");
      const clearButton = root.querySelector("[data-sm='clear']");
      const closeButton = root.querySelector("[data-sm='close']");

      const drawCtx = overlay.getContext("2d");
      let drawing = false;
      let scale = 2;
      let resizeObserver = null;
      let lastTargetSelector = targetSelect.value;

      function updateOverlaySize() {
        const rect = view.getBoundingClientRect();
        overlay.width = Math.max(1, Math.floor(rect.width));
        overlay.height = Math.max(1, Math.floor(rect.height));
        overlay.style.width = `${overlay.width}px`;
        overlay.style.height = `${overlay.height}px`;
      }

      function clearMarkup() {
        drawCtx.clearRect(0, 0, overlay.width, overlay.height);
      }

      function drawAt(event) {
        const rect = overlay.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        drawCtx.fillStyle = "rgba(230,0,0,0.85)";
        const r = Math.max(1, Number.parseInt(scribbleWidthInput.value, 10) || 2);
        drawCtx.beginPath();
        drawCtx.arc(x, y, r, 0, Math.PI * 2);
        drawCtx.fill();
      }

      function detachResizeObserver() {
        if (resizeObserver) {
          try { resizeObserver.disconnect(); } catch {}
          resizeObserver = null;
        }
      }

      function attachResizeObserver(target) {
        detachResizeObserver();
        if (!target || !autoResizeCheck.checked || typeof ResizeObserver !== "function") return;
        resizeObserver = new ResizeObserver(() => {
          capture();
        });
        resizeObserver.observe(target);
      }

      function capture() {
        const selector = targetSelect.value;
        const target = document.querySelector(selector);
        if (!(target instanceof HTMLElement)) {
          ctx.messagesPane.postMars(`[tool] Screen Magnifier: target '${selector}' not found.`);
          return;
        }

        const clone = target.cloneNode(true);
        clearIds(clone);

        content.innerHTML = "";
        content.appendChild(clone);
        content.style.transform = `scale(${scale})`;

        const sourceRect = target.getBoundingClientRect();
        content.style.width = `${Math.ceil(sourceRect.width * scale)}px`;
        content.style.height = `${Math.ceil(sourceRect.height * scale)}px`;

        if (centerCheck.checked) {
          view.scrollLeft = Math.max(0, Math.floor((content.offsetWidth - view.clientWidth) / 2));
          view.scrollTop = Math.max(0, Math.floor((content.offsetHeight - view.clientHeight) / 2));
        } else {
          view.scrollLeft = 0;
          view.scrollTop = 0;
        }

        updateOverlaySize();
        clearMarkup();
        attachResizeObserver(target);
        lastTargetSelector = selector;
      }

      captureButton.addEventListener("click", capture);

      settingsButton.addEventListener("click", () => {
        settingsPanel.style.display = settingsPanel.style.display === "none" ? "flex" : "none";
      });

      targetSelect.addEventListener("change", () => {
        if (targetSelect.value !== lastTargetSelector) capture();
      });

      scaleInput.addEventListener("change", () => {
        const parsed = Number.parseFloat(scaleInput.value);
        scale = Number.isFinite(parsed) ? Math.max(1, Math.min(4, parsed)) : 2;
        scaleInput.value = scale.toFixed(1).replace(/\.0$/, "");
        if (autoScaleCheck.checked) capture();
      });

      autoResizeCheck.addEventListener("change", () => {
        if (!autoResizeCheck.checked) detachResizeObserver();
        else capture();
      });

      clearButton.addEventListener("click", clearMarkup);
      closeButton.addEventListener("click", () => {
        detachResizeObserver();
        shell.close();
      });

      overlay.addEventListener("pointerdown", (event) => {
        drawing = true;
        drawAt(event);
        overlay.setPointerCapture(event.pointerId);
      });
      overlay.addEventListener("pointermove", (event) => {
        if (!drawing) return;
        drawAt(event);
      });
      overlay.addEventListener("pointerup", (event) => {
        drawing = false;
        try { overlay.releasePointerCapture(event.pointerId); } catch {}
      });

      shell.onResize(() => {
        updateOverlaySize();
      });

      updateOverlaySize();
      capture();

      return {
        open() {
          shell.open();
          updateOverlaySize();
          capture();
        },
        close() {
          detachResizeObserver();
          shell.close();
        },
        onSnapshot() {}
      };
    }
  });
})();
