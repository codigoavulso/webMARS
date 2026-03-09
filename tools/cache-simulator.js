(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-cache-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .cache-tool { display:flex; flex-direction:column; gap:8px; height:100%; padding:8px; box-sizing:border-box; font:12px "Segoe UI", Tahoma, sans-serif; }
      .cache-tool h2 { margin:0; text-align:center; font-size:42px; color:#1e2f47; line-height:1; }
      .cache-panel { border:1px solid #9db0c8; padding:8px; background:#f7fbff; }
      .cache-grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:8px 12px; }
      .cache-grid2 label { display:flex; align-items:center; justify-content:space-between; gap:6px; font-weight:600; }
      .cache-grid2 input[readonly] { width:80px; text-align:right; }
      .cache-performance { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
      .cache-counts { display:grid; grid-template-columns:auto 1fr; gap:8px; align-items:center; }
      .cache-counts label { font-weight:700; }
      .cache-counts input { width:100%; box-sizing:border-box; border:1px solid #9db0c8; background:#fff; padding:4px 6px; font-family:Consolas, monospace; text-align:right; }
      .cache-hitrate { grid-column: 1 / span 2; display:grid; grid-template-columns:auto 1fr; gap:8px; align-items:center; }
      .cache-progress { border:1px solid #9db0c8; height:28px; position:relative; background:linear-gradient(#f6f8fc, #e3eaf4); }
      .cache-progress .fill { position:absolute; inset:0 auto 0 0; width:0%; background:linear-gradient(90deg, #7ea9f3, #4f81d6); }
      .cache-progress span { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:700; color:#4069ad; }
      .cache-blocks { border:1px solid #9db0c8; background:#fff; overflow:auto; max-height:220px; }
      .cache-block-row { display:grid; grid-template-columns:18px 1fr; gap:6px; align-items:center; border-bottom:1px solid #e1e8f3; padding:2px 6px; font-family:Consolas, monospace; }
      .cache-dot { width:12px; height:12px; border:1px solid #8ea1bd; }
      .cache-dot.empty { background:#f1f1f1; }
      .cache-dot.hit { background:#12da12; }
      .cache-dot.miss { background:#ff2b2b; }
      .cache-log-wrap { border:1px solid #9db0c8; display:flex; flex-direction:column; min-height:90px; }
      .cache-log-wrap .title { background:#eef3f8; border-bottom:1px solid #9db0c8; padding:3px 6px; font-weight:700; }
      .cache-log { flex:1; width:100%; resize:none; border:0; padding:6px; box-sizing:border-box; font-family:Consolas, monospace; font-size:11px; }
      .cache-enable { display:flex; align-items:center; gap:6px; font-weight:700; }
      .cache-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:auto; }
      .cache-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#24354b; }
      .cache-footer .tool-btn { min-width:130px; }
    `;
    document.head.appendChild(style);
  }

  const MEMORY_OPS = new Set([
    "lb", "lbu", "lh", "lhu", "lw", "lwl", "lwr", "sb", "sh", "sw", "swl", "swr", "ll", "sc",
    "lwc1", "swc1", "ldc1", "sdc1"
  ]);
  const WRITE_OPS = new Set(["sb", "sh", "sw", "swl", "swr", "sc", "swc1", "sdc1"]);

  function toHex32(v) {
    return `0x${(v >>> 0).toString(16).padStart(8, "0")}`;
  }

  function parseTokens(statement) {
    if (!statement) return [];
    const cleaned = String(statement).split("#")[0].trim();
    if (!cleaned) return [];
    return cleaned.split(/[\s,]+/).filter(Boolean);
  }

  function parseImmediate(token) {
    if (typeof token !== "string") return null;
    const text = token.trim();
    if (!text) return 0;
    if (/^[+-]?\d+$/.test(text)) return Number.parseInt(text, 10) | 0;
    if (/^[+-]?0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text, 16) | 0;
    return null;
  }

  function buildRegisterMap(snapshot) {
    const map = new Map();
    (snapshot?.registers || []).forEach((reg) => {
      const value = reg.value | 0;
      const name = String(reg.name || "").toLowerCase();
      map.set(name, value);
      if (name.startsWith("$")) map.set(name.slice(1), value);
      map.set(String(reg.index), value);
      map.set(`$${reg.index}`, value);
    });
    return map;
  }

  function buildLabelMap(snapshot) {
    const map = new Map();
    (snapshot?.labels || []).forEach((label) => {
      map.set(String(label.label || "").toLowerCase(), label.address >>> 0);
    });
    return map;
  }

  function resolveMemoryAddress(memArg, registers, labels, rowAddress) {
    const token = String(memArg || "").trim();
    const match = token.match(/^(.+?)\(([^)]+)\)$/);
    if (match) {
      const offsetRaw = match[1].trim();
      const baseRaw = match[2].trim().toLowerCase();
      const offsetImmediate = parseImmediate(offsetRaw);
      const offsetValue = Number.isFinite(offsetImmediate)
        ? offsetImmediate
        : (labels.get(offsetRaw.toLowerCase()) ?? 0);
      const baseValue = registers.get(baseRaw) ?? registers.get(baseRaw.replace(/^\$/, "")) ?? 0;
      return (((baseValue | 0) + (offsetValue | 0)) >>> 0);
    }

    const labelAddress = labels.get(token.toLowerCase());
    if (Number.isFinite(labelAddress)) return labelAddress >>> 0;

    const imm = parseImmediate(token);
    if (Number.isFinite(imm)) {
      if (Math.abs(imm) < 0x10000) return (((rowAddress + 4) | 0) + ((imm | 0) << 2)) >>> 0;
      return imm >>> 0;
    }

    return null;
  }

  class CacheModel {
    constructor(numberOfBlocks, blockSizeWords, setSize, replacement) {
      this.numberOfBlocks = numberOfBlocks;
      this.blockSizeWords = blockSizeWords;
      this.setSize = setSize;
      this.setCount = Math.max(1, Math.floor(numberOfBlocks / setSize));
      this.replacement = replacement;
      this.accessTick = 0;
      this.blocks = Array.from({ length: numberOfBlocks }, () => ({ valid: false, tag: 0, lastUsed: 0 }));
    }

    access(address) {
      this.accessTick += 1;
      const wordAddress = Math.floor((address >>> 0) / 4);
      const blockNumber = Math.floor(wordAddress / this.blockSizeWords);
      const setIndex = blockNumber % this.setCount;
      const tag = Math.floor(blockNumber / this.setCount);

      const first = setIndex * this.setSize;
      const last = first + this.setSize - 1;
      let hitIndex = -1;
      let emptyIndex = -1;

      for (let i = first; i <= last; i += 1) {
        const block = this.blocks[i];
        if (block.valid && block.tag === tag) {
          hitIndex = i;
          break;
        }
        if (!block.valid && emptyIndex < 0) emptyIndex = i;
      }

      if (hitIndex >= 0) {
        this.blocks[hitIndex].lastUsed = this.accessTick;
        return { hit: true, blockIndex: hitIndex, setIndex, tag };
      }

      let replaceIndex = emptyIndex;
      if (replaceIndex < 0) {
        if (this.replacement === "RANDOM") {
          replaceIndex = first + Math.floor(Math.random() * this.setSize);
        } else {
          let minTick = Number.POSITIVE_INFINITY;
          replaceIndex = first;
          for (let i = first; i <= last; i += 1) {
            if (this.blocks[i].lastUsed < minTick) {
              minTick = this.blocks[i].lastUsed;
              replaceIndex = i;
            }
          }
        }
      }

      this.blocks[replaceIndex] = { valid: true, tag, lastUsed: this.accessTick };
      return { hit: false, blockIndex: replaceIndex, setIndex, tag };
    }
  }

  host.register({
    id: "cache-simulator",
    label: "Data Cache Simulator",
    create(ctx) {
      const shell = ctx.createToolWindowShell("cache-simulator", "Data Cache Simulation Tool, Version 1.2", 940, 900, `
        <div class="cache-tool">
          <h2>Simulate and illustrate data cache performance</h2>
          <div class="cache-panel">
            <div class="cache-grid2">
              <label>Placement Policy
                <select data-cache="placement">
                  <option value="direct" selected>Direct Mapping</option>
                  <option value="full">Fully Associative</option>
                  <option value="set">N-way Set Associative</option>
                </select>
              </label>
              <label>Number of blocks
                <select data-cache="blocks">
                  <option>1</option><option>2</option><option>4</option><option selected>8</option><option>16</option><option>32</option><option>64</option>
                </select>
              </label>
              <label>Block Replacement Policy
                <select data-cache="replacement">
                  <option value="LRU" selected>LRU</option>
                  <option value="RANDOM">Random</option>
                </select>
              </label>
              <label>Cache block size (words)
                <select data-cache="blocksize">
                  <option>1</option><option>2</option><option selected>4</option><option>8</option><option>16</option>
                </select>
              </label>
              <label>Set size (blocks)
                <select data-cache="setsize"></select>
              </label>
              <label>Cache size (bytes)
                <input data-cache="bytes" readonly>
              </label>
            </div>
          </div>
          <div class="cache-panel cache-performance">
            <div class="cache-counts">
              <label>Memory Access Count</label><input data-cache="access" readonly>
              <label>Cache Hit Count</label><input data-cache="hit" readonly>
              <label>Cache Miss Count</label><input data-cache="miss" readonly>
              <div class="cache-hitrate">
                <label>Cache Hit Rate</label>
                <div class="cache-progress"><div class="fill" data-cache="ratefill"></div><span data-cache="rate">0%</span></div>
              </div>
            </div>
            <div class="cache-blocks" data-cache="blocksview"></div>
          </div>
          <div class="cache-log-wrap">
            <div class="title">Runtime Log</div>
            <textarea class="cache-log" data-cache="log" readonly></textarea>
          </div>
          <label class="cache-enable"><input type="checkbox" data-cache="enabled"> Enabled</label>
          <div class="cache-footer">
            <button class="tool-btn" data-cache="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-cache="reset" type="button">Reset</button>
            <button class="tool-btn" data-cache="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const controls = {
        placement: root.querySelector("[data-cache='placement']"),
        blocks: root.querySelector("[data-cache='blocks']"),
        replacement: root.querySelector("[data-cache='replacement']"),
        blockSize: root.querySelector("[data-cache='blocksize']"),
        setSize: root.querySelector("[data-cache='setsize']"),
        bytes: root.querySelector("[data-cache='bytes']"),
        access: root.querySelector("[data-cache='access']"),
        hit: root.querySelector("[data-cache='hit']"),
        miss: root.querySelector("[data-cache='miss']"),
        rate: root.querySelector("[data-cache='rate']"),
        rateFill: root.querySelector("[data-cache='ratefill']"),
        blocksView: root.querySelector("[data-cache='blocksview']"),
        log: root.querySelector("[data-cache='log']"),
        enabled: root.querySelector("[data-cache='enabled']"),
        connect: root.querySelector("[data-cache='connect']"),
        reset: root.querySelector("[data-cache='reset']"),
        close: root.querySelector("[data-cache='close']")
      };

      let connected = false;
      let cache = null;
      let accesses = 0;
      let hits = 0;
      let misses = 0;
      let lastSnapshot = null;
      let highlightBlock = -1;
      let highlightKind = "empty";

      function appendLog(line) {
        if (!line) return;
        controls.log.value += `${line}\n`;
        controls.log.scrollTop = controls.log.scrollHeight;
      }

      function parseIntControl(control, fallback) {
        const parsed = Number.parseInt(control.value, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
      }

      function getDivisors(number) {
        const values = [];
        for (let i = 1; i <= number; i += 1) {
          if (number % i === 0) values.push(i);
        }
        return values;
      }

      function updateSetSizeOptions() {
        const blockCount = parseIntControl(controls.blocks, 8);
        const placement = controls.placement.value;

        let options = [];
        if (placement === "direct") options = [1];
        else if (placement === "full") options = [blockCount];
        else options = getDivisors(blockCount).filter((value) => value > 1 && value < blockCount);

        if (!options.length) options = [1];
        const current = Number.parseInt(controls.setSize.value, 10);
        controls.setSize.innerHTML = options.map((option) => `<option value="${option}">${option}</option>`).join("");
        if (options.includes(current)) controls.setSize.value = String(current);
        controls.setSize.disabled = options.length === 1;
      }

      function resetCounters() {
        accesses = 0;
        hits = 0;
        misses = 0;
        highlightBlock = -1;
        highlightKind = "empty";
        controls.log.value = "";
      }

      function rebuildCache() {
        updateSetSizeOptions();
        const blockCount = parseIntControl(controls.blocks, 8);
        const blockSizeWords = parseIntControl(controls.blockSize, 4);
        const setSize = parseIntControl(controls.setSize, 1);
        const replacement = controls.replacement.value === "RANDOM" ? "RANDOM" : "LRU";

        cache = new CacheModel(blockCount, blockSizeWords, Math.max(1, setSize), replacement);
        controls.bytes.value = String(blockCount * blockSizeWords * 4);
        resetCounters();
        render();
      }

      function renderBlocks() {
        if (!cache) {
          controls.blocksView.innerHTML = "";
          return;
        }

        controls.blocksView.innerHTML = cache.blocks.map((block, index) => {
          let dotClass = "empty";
          if (index === highlightBlock) dotClass = highlightKind;
          else if (block.valid) dotClass = "empty";
          const text = block.valid ? `#${index}  tag=${toHex32(block.tag)}  last=${block.lastUsed}` : `#${index}  <empty>`;
          return `<div class="cache-block-row"><span class="cache-dot ${dotClass}"></span><span>${text}</span></div>`;
        }).join("");
      }

      function render() {
        controls.access.value = String(accesses);
        controls.hit.value = String(hits);
        controls.miss.value = String(misses);
        const rate = accesses === 0 ? 0 : Math.round((hits * 100) / accesses);
        controls.rate.textContent = `${rate}%`;
        controls.rateFill.style.width = `${rate}%`;
        renderBlocks();
      }

      function extractMemoryAccess(previousSnapshot) {
        const row = (previousSnapshot?.textRows || []).find((entry) => entry.isCurrent);
        if (!row) return null;
        const tokens = parseTokens(row.basic || row.source);
        if (!tokens.length) return null;
        const opcode = tokens[0].toLowerCase();
        if (!MEMORY_OPS.has(opcode)) return null;

        const args = tokens.slice(1);
        const memArg = args[1] ?? args[0];
        if (!memArg) return null;

        const registers = buildRegisterMap(previousSnapshot);
        const labels = buildLabelMap(previousSnapshot);
        const address = resolveMemoryAddress(memArg, registers, labels, row.address >>> 0);
        if (!Number.isFinite(address)) return null;

        return {
          opcode,
          address: address >>> 0,
          write: WRITE_OPS.has(opcode)
        };
      }

      function processAccess(previousSnapshot) {
        if (!cache || !controls.enabled.checked) return;
        const access = extractMemoryAccess(previousSnapshot);
        if (!access) return;

        const result = cache.access(access.address >>> 0);
        accesses += 1;
        if (result.hit) hits += 1;
        else misses += 1;

        highlightBlock = result.blockIndex;
        highlightKind = result.hit ? "hit" : "miss";

        appendLog(`(${accesses}) ${access.write ? "write" : "read "} ${toHex32(access.address)} -> ${result.hit ? "HIT" : "MISS"} (set ${result.setIndex}, block ${result.blockIndex})`);
        render();
      }

      [controls.placement, controls.blocks, controls.replacement, controls.blockSize, controls.setSize]
        .forEach((control) => control.addEventListener("change", rebuildCache));

      controls.connect.addEventListener("click", () => {
        connected = !connected;
        controls.connect.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
        ctx.messagesPane.postMars(`[tool] Data Cache Simulator ${connected ? "connected" : "disconnected"}.`);
      });

      controls.reset.addEventListener("click", rebuildCache);
      controls.close.addEventListener("click", shell.close);

      rebuildCache();

      return {
        open: shell.open,
        close: shell.close,
        onSnapshot(snapshot) {
          const previous = lastSnapshot;
          lastSnapshot = snapshot;
          if (!connected || !snapshot || !previous) return;
          if ((snapshot.steps | 0) <= (previous.steps | 0)) return;
          processAccess(previous);
        }
      };
    }
  });
})();
