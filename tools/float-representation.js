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


  const STYLE_ID = "mars-web-tool-float-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .float-tool { display:flex; flex-direction:column; gap:10px; height:100%; box-sizing:border-box; padding:10px; font:12px "Segoe UI", Tahoma, sans-serif; }
      .float-tool h2 { margin:0; text-align:center; font-size:40px; color:var(--text-heading); }
      .float-hex-row { display:grid; grid-template-columns: 1fr auto; gap:12px; align-items:center; }
      .float-hex { width:100%; box-sizing:border-box; border:1px solid var(--line); padding:6px 8px; font: 42px Consolas, monospace; color:var(--readout-red); text-align:center; letter-spacing:1px; }
      .float-note { font-size:30px; color:var(--text-heading); }
      .float-bin-row { display:grid; grid-template-columns: 80px 170px 1fr auto; gap:8px; align-items:center; }
      .float-input { width:100%; box-sizing:border-box; border:1px solid var(--line); padding:4px 6px; font: 38px Consolas, monospace; text-align:center; }
      .float-input.sign { font-size:30px; }
      .float-label-row { display:grid; grid-template-columns: 80px 170px 1fr auto; gap:8px; color:var(--text-heading); font-weight:700; text-align:center; }
      .float-expansion { font: 37px Consolas, monospace; color:var(--flat-text); padding:4px 0; }
      .float-dec-row { display:grid; grid-template-columns: 1fr 1fr; gap:10px; align-items:center; }
      .float-dec { width:100%; box-sizing:border-box; border:1px solid var(--line); padding:8px 10px; font: 38px Consolas, monospace; color:var(--readout-blue); text-align:right; }
      .float-instructions { border:1px solid var(--line); padding:8px; background:var(--surface-raised); color:var(--text-heading); }
      .float-attach { display:flex; align-items:center; gap:8px; }
      .float-attach select { min-width:150px; }
      .float-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:auto; }
      .float-footer .ctrl { flex:1; text-align:center; font-weight:700; color:var(--text); }
      .float-footer .tool-btn { min-width:130px; }

      /* The desktop presentation deliberately uses display-sized type. On a
         phone, preserve the IEEE-754 hierarchy without forcing horizontal
         overflow or allowing annotations to compete with the values. */
      .desktop-stacked .float-tool { gap:7px; padding:7px; font-size:12px; }
      .desktop-stacked .float-tool h2 { font-size:21px; line-height:1.15; }
      .desktop-stacked .float-hex-row {
        grid-template-columns:minmax(0, 1fr);
        gap:2px;
      }
      .desktop-stacked .float-hex { padding:5px 7px; font-size:24px; }
      .desktop-stacked .float-note {
        font-size:11px;
        line-height:1.2;
        text-align:center;
        color:var(--text-muted);
      }
      .desktop-stacked .float-bin-row {
        grid-template-columns:36px 82px minmax(0, 1fr);
        gap:5px;
      }
      .desktop-stacked .float-bin-row .float-note {
        grid-column:1 / -1;
      }
      .desktop-stacked .float-input {
        min-width:0;
        padding:5px 3px;
        font-size:clamp(11px, 3.4vw, 16px);
        letter-spacing:0;
      }
      .desktop-stacked .float-input.sign { font-size:16px; }
      .desktop-stacked .float-label-row {
        grid-template-columns:36px 82px minmax(0, 1fr);
        gap:5px;
        font-size:11px;
      }
      .desktop-stacked .float-label-row > :last-child { display:none; }
      .desktop-stacked .float-dec-row {
        grid-template-columns:minmax(0, 1fr);
        gap:5px;
      }
      .desktop-stacked .float-expansion {
        padding:2px 0;
        font-size:13px;
        line-height:1.35;
        overflow-wrap:anywhere;
      }
      .desktop-stacked .float-dec { padding:6px 8px; font-size:20px; text-align:center; }
      .desktop-stacked .float-instructions { padding:6px; line-height:1.3; }
      .desktop-stacked .float-attach {
        display:grid;
        grid-template-columns:minmax(0, 1fr) auto;
        gap:6px;
      }
      .desktop-stacked .float-attach select { min-width:86px; width:100%; }
      .desktop-stacked .float-footer { gap:5px; overflow-x:auto; }
      .desktop-stacked .float-footer .ctrl { display:none; }
      .desktop-stacked .float-footer .tool-btn { min-width:max-content; flex:1 0 auto; }
    `;
    document.head.appendChild(style);
  }

  function bitsToHex(bits) {
    return (bits >>> 0).toString(16).padStart(8, "0");
  }

  function bitsToFloat(bits) {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint32(0, bits >>> 0, false);
    return view.getFloat32(0, false);
  }

  function floatToBits(value) {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setFloat32(0, Number(value), false);
    return view.getUint32(0, false) >>> 0;
  }

  function toBinary(bits) {
    const all = (bits >>> 0).toString(2).padStart(32, "0");
    return {
      sign: all.slice(0, 1),
      exponent: all.slice(1, 9),
      fraction: all.slice(9)
    };
  }

  function toSignedExp(exponentBits) {
    const value = Number.parseInt(exponentBits, 2) | 0;
    return value - 127;
  }

  function formatDecimal(value) {
    if (!Number.isFinite(value)) return String(value);
    if (Object.is(value, -0)) return "-0.0";
    const abs = Math.abs(value);
    if (abs !== 0 && (abs < 1e-6 || abs >= 1e7)) return value.toExponential(8);
    return value.toString();
  }

  function buildRegisterOptions() {
    const rows = ["<option value=\"-1\">None</option>"];
    for (let i = 0; i < 32; i += 1) {
      rows.push(`<option value="${i}">$f${i}</option>`);
    }
    return rows.join("");
  }

  host.register({
    id: "float-representation",
    label: "Floating Point Representation",
    create(ctx) {
      const shell = ctx.createToolWindowShell("float-representation", "Floating Point Representation, Version 1.1", 1150, 920, `
        <div class="float-tool">
          <h2>32-bit IEEE 754 Floating Point Representation</h2>
          <div class="float-hex-row">
              <input class="float-hex" maxlength="8" data-fr="hex" inputmode="text" enterkeyhint="next" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" value="00000000">
            <div class="float-note">&lt; Hexadecimal representation</div>
          </div>
          <div class="float-bin-row">
                  <input class="float-input sign" maxlength="1" data-fr="sign" inputmode="numeric" enterkeyhint="next" autocomplete="off" value="0">
                  <input class="float-input" maxlength="8" data-fr="exp" inputmode="numeric" enterkeyhint="next" autocomplete="off" value="00000000">
                  <input class="float-input" maxlength="23" data-fr="frac" inputmode="numeric" enterkeyhint="next" autocomplete="off" value="00000000000000000000000">
            <div class="float-note">&lt; Binary representation</div>
          </div>
          <div class="float-label-row">
            <div>sign</div><div>exponent</div><div>fraction</div><div>&nbsp;</div>
          </div>
          <div class="float-dec-row">
            <div class="float-expansion" data-fr="expansion">-1<sup>0</sup> * 2<sup>-127</sup> * .00000000000000000000000 =</div>
              <input class="float-dec" data-fr="dec" inputmode="decimal" enterkeyhint="done" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="0.0">
          </div>
          <div class="float-instructions" data-fr="instructions">Modify any value then press Enter to update all values.</div>
          <div class="float-attach">
            <strong>MIPS floating point Register of interest:</strong>
            <select data-fr="register">${buildRegisterOptions()}</select>
          </div>
          <div class="float-footer">
            <button class="tool-btn" data-fr="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-fr="reset" type="button">Reset</button>
            <button class="tool-btn" data-fr="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const hexInput = root.querySelector("[data-fr='hex']");
      const signInput = root.querySelector("[data-fr='sign']");
      const expInput = root.querySelector("[data-fr='exp']");
      const fracInput = root.querySelector("[data-fr='frac']");
      const decInput = root.querySelector("[data-fr='dec']");
      const expansion = root.querySelector("[data-fr='expansion']");
      const instructions = root.querySelector("[data-fr='instructions']");
      const registerSelect = root.querySelector("[data-fr='register']");
      const connectButton = root.querySelector("[data-fr='connect']");
      const resetButton = root.querySelector("[data-fr='reset']");
      const closeButton = root.querySelector("[data-fr='close']");

      let connected = false;
      let attachedRegister = -1;
      let bits = 0 >>> 0;
      let lastSnapshot = null;
      let runtimeRefreshPending = false;

      function syncExpansion() {
        const { sign, exponent, fraction } = toBinary(bits);
        const signValue = sign === "1" ? "-" : "";
        const exponentValue = Number.parseInt(exponent, 2) | 0;
        const exponentPow = toSignedExp(exponent);
        expansion.innerHTML = `${signValue}1<sup>${sign}</sup> * 2<sup>${exponentPow}</sup> * .${fraction} =`;

        if (exponentValue === 0) {
          instructions.textContent = t("Denormalized representation (no hidden bit).");
        } else {
          instructions.textContent = t("Normalized representation (hidden leading 1).");
        }
      }

      function refreshInputs() {
        const binary = toBinary(bits);
        hexInput.value = bitsToHex(bits);
        signInput.value = binary.sign;
        expInput.value = binary.exponent;
        fracInput.value = binary.fraction;
        decInput.value = formatDecimal(bitsToFloat(bits));
        syncExpansion();
      }

      function writeAttachedRegister() {
        if (!connected || attachedRegister < 0) return;
        if (!Array.isArray(lastSnapshot?.cop1) && !(ctx.engine?.cop1Registers instanceof Int32Array)) return;
        if (ctx.engine && ctx.engine.cop1Registers && attachedRegister >= 0 && attachedRegister < 32) {
          ctx.engine.cop1Registers[attachedRegister] = bits | 0;
        }
      }

      function applyHex() {
        const normalized = hexInput.value.trim().replace(/^0x/i, "");
        if (!/^[0-9a-fA-F]{1,8}$/.test(normalized)) {
          instructions.textContent = t("Invalid hex input. Please provide up to 8 hex digits.");
          return;
        }
        bits = Number.parseInt(normalized, 16) >>> 0;
        refreshInputs();
        writeAttachedRegister();
      }

      function applyBinary() {
        const s = signInput.value.trim();
        const e = expInput.value.trim();
        const f = fracInput.value.trim();
        if (!/^[01]$/.test(s) || !/^[01]{8}$/.test(e) || !/^[01]{23}$/.test(f)) {
          instructions.textContent = t("Invalid binary input. Expected 1/8/23 bits.");
          return;
        }
        bits = Number.parseInt(`${s}${e}${f}`, 2) >>> 0;
        refreshInputs();
        writeAttachedRegister();
      }

      function applyDecimal() {
        const value = Number.parseFloat(decInput.value.trim());
        if (!Number.isFinite(value)) {
          instructions.textContent = t("Invalid decimal input.");
          return;
        }
        bits = floatToBits(value);
        refreshInputs();
        writeAttachedRegister();
      }

      function readAttachedRegister(snapshot) {
        if (!connected || attachedRegister < 0 || !snapshot || !Array.isArray(snapshot.cop1)) return;
        const raw = snapshot.cop1[attachedRegister] | 0;
        bits = raw >>> 0;
        refreshInputs();
      }

      function handleEnter(input, applyFn) {
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            applyFn();
          }
        });
        input.addEventListener("blur", applyFn);
      }

      handleEnter(hexInput, applyHex);
      handleEnter(signInput, applyBinary);
      handleEnter(expInput, applyBinary);
      handleEnter(fracInput, applyBinary);
      handleEnter(decInput, applyDecimal);

      registerSelect.addEventListener("change", () => {
        const parsedRegister = Number.parseInt(registerSelect.value, 10);
        attachedRegister = Number.isInteger(parsedRegister) && parsedRegister >= 0 && parsedRegister < 32
          ? parsedRegister
          : -1;
        if (attachedRegister >= 0) {
          instructions.textContent = t("Attached to $f{register}.", { register: attachedRegister });
          readAttachedRegister(lastSnapshot);
        } else {
          instructions.textContent = t("Detached from floating-point registers.");
        }
      });

      // The connect label is rewritten at runtime, so the shell's static-tree
      // pass cannot keep it in the current language on its own.
      function refreshToolText() {
        connectButton.textContent = connected ? t("Disconnect from MIPS") : t("Connect to MIPS");
      }

      connectButton.addEventListener("click", () => {
        connected = !connected;
        refreshToolText();
        if (connected) readAttachedRegister(lastSnapshot);
      });

      resetButton.addEventListener("click", () => {
        bits = 0 >>> 0;
        refreshInputs();
        writeAttachedRegister();
        instructions.textContent = t("Modify any value then press Enter to update all values.");
      });

      closeButton.addEventListener("click", shell.close);

      refreshInputs();

      subscribeLanguageChange(refreshToolText);
      refreshToolText();

      return {
        isConnected: () => connected,
        open: shell.open,
        close: shell.close,
        onSnapshot(snapshot) {
          lastSnapshot = snapshot;
          if (!connected) return;
          if (attachedRegister >= 0) readAttachedRegister(snapshot);
        },
        onRuntimeEvent(event, delivery = {}) {
          if (!connected || attachedRegister < 0 || event?.type !== "instruction") return;
          const changes = Array.isArray(event.cop1Changes) ? event.cop1Changes : [];
          for (let offset = 0; offset + 2 < changes.length; offset += 3) {
            if ((changes[offset] | 0) !== attachedRegister) continue;
            bits = changes[offset + 2] >>> 0;
            runtimeRefreshPending = true;
            break;
          }
          if (delivery.isLast !== false && runtimeRefreshPending) {
            runtimeRefreshPending = false;
            refreshInputs();
          }
        },
        onRuntimeBatchEnd() {
          if (!connected || !runtimeRefreshPending) return;
          runtimeRefreshPending = false;
          refreshInputs();
        }
      };
    }
  });
})();
