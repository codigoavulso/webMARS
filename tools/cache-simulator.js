(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-cache-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .cache-tool {
        font: 11px Tahoma, "Segoe UI", sans-serif;
      }

      .cache-section-body {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .cache-grid2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 12px;
      }

      .cache-grid2 .mars-tool-row select,
      .cache-grid2 .mars-tool-row input {
        width: 110px;
      }

      .cache-performance {
        display: grid;
        grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
        gap: 10px;
        min-height: 0;
      }

      .cache-counts {
        display: grid;
        gap: 6px;
      }

      .cache-counts .mars-tool-row input {
        width: 100px;
        text-align: right;
        font-family: "Courier New", "Lucida Console", monospace;
      }

      .cache-progress-row {
        display: grid;
        grid-template-columns: auto minmax(120px, 1fr);
        gap: 8px;
        align-items: center;
      }

      .cache-progress {
        border: 1px solid #7f9db9;
        height: 20px;
        position: relative;
        background: #fff;
      }

      .cache-progress .fill {
        position: absolute;
        inset: 0 auto 0 0;
        width: 0%;
        background: #3b6fd8;
      }

      .cache-progress span {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #1f3f84;
      }

      .cache-block-table {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        min-height: 0;
      }

      .cache-legend {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: flex-start;
        min-width: 110px;
      }

      .cache-legend-line {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      }

      .cache-blocks {
        border: 1px solid #a7a7a7;
        background: #fff;
        overflow: auto;
        min-height: 180px;
      }

      .cache-block-row {
        display: grid;
        grid-template-columns: 16px minmax(0, 1fr);
        gap: 6px;
        align-items: center;
        border-bottom: 1px solid #ececec;
        padding: 2px 6px;
        font-family: "Courier New", "Lucida Console", monospace;
        font-size: 11px;
      }

      .cache-dot {
        width: 10px;
        height: 10px;
        border: 1px solid #6b6b6b;
        background: #f0f0f0;
      }

      .cache-dot.empty { background: #f0f0f0; }
      .cache-dot.hit { background: #12da12; }
      .cache-dot.miss { background: #ff2b2b; }

      .cache-log-panel .mars-tool-panel-body {
        gap: 6px;
      }

      .cache-enable {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .cache-log {
        width: 100%;
        min-height: 110px;
        resize: none;
        border: 1px solid #7f9db9;
        background: #fff;
        padding: 4px;
        box-sizing: border-box;
        font-family: "Courier New", "Lucida Console", monospace;
        font-size: 11px;
      }

      @media (max-width: 880px) {
        .cache-grid2,
        .cache-performance,
        .cache-block-table {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const MEMORY_OPS = new Set([
    "lb", "lbu", "lh", "lhu", "lw", "lwl", "lwr", "sb", "sh", "sw", "swl", "swr", "ll", "sc",
    "lwc1", "swc1", "ldc1", "sdc1"
  ]);
  const WRITE_OPS = new Set(["sb", "sh", "sw", "swl", "swr", "sc", "swc1", "sdc1"]);

  function formatFallback(message, variables = {}) {
    return String(message ?? "").replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match
    ));
  }

  function t(message, variables = {}) {
    if (typeof translateText === "function") return translateText(message, variables);
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (i18n && typeof i18n.t === "function") return i18n.t(message, variables);
    return formatFallback(message, variables);
  }

  function subscribeLanguageChange(listener) {
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (!i18n || typeof i18n.subscribe !== "function" || typeof listener !== "function") return () => {};
    return i18n.subscribe(listener);
  }

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
      const shell = ctx.createToolWindowShell("cache-simulator", "Data Cache Simulation Tool, Version 1.2", 940, 760, `
        <div class="mars-tool-shell cache-tool">
          <h2 class="mars-tool-heading">Simulate and illustrate data cache performance</h2>
          <section class="mars-tool-panel">
            <div class="mars-tool-panel-title">Cache Organization</div>
            <div class="mars-tool-panel-body cache-section-body">
              <div class="cache-grid2">
                <div class="mars-tool-row">
                  <span>Placement Policy</span>
                  <select data-cache="placement">
                    <option value="direct" selected>Direct Mapping</option>
                    <option value="full">Fully Associative</option>
                    <option value="set">N-way Set Associative</option>
                  </select>
                </div>
                <div class="mars-tool-row">
                  <span>Number of blocks</span>
                  <select data-cache="blocks">
                    <option>1</option><option>2</option><option>4</option><option selected>8</option><option>16</option><option>32</option><option>64</option>
                  </select>
                </div>
                <div class="mars-tool-row">
                  <span>Block Replacement Policy</span>
                  <select data-cache="replacement">
                    <option value="LRU" selected>LRU</option>
                    <option value="RANDOM">Random</option>
                  </select>
                </div>
                <div class="mars-tool-row">
                  <span>Cache block size (words)</span>
                  <select data-cache="blocksize">
                    <option>1</option><option>2</option><option selected>4</option><option>8</option><option>16</option>
                  </select>
                </div>
                <div class="mars-tool-row">
                  <span>Set size (blocks)</span>
                  <select data-cache="setsize"></select>
                </div>
                <div class="mars-tool-row">
                  <span>Cache size (bytes)</span>
                  <input data-cache="bytes" readonly>
                </div>
              </div>
            </div>
          </section>
          <section class="mars-tool-panel">
            <div class="mars-tool-panel-title">Cache Performance</div>
            <div class="mars-tool-panel-body cache-performance">
              <div class="cache-counts">
                <div class="mars-tool-row"><span>Memory Access Count</span><input data-cache="access" readonly></div>
                <div class="mars-tool-row"><span>Cache Hit Count</span><input data-cache="hit" readonly></div>
                <div class="mars-tool-row"><span>Cache Miss Count</span><input data-cache="miss" readonly></div>
                <div class="cache-progress-row">
                  <span>Cache Hit Rate</span>
                  <div class="cache-progress"><div class="fill" data-cache="ratefill"></div><span data-cache="rate">0%</span></div>
                </div>
              </div>
              <div class="cache-block-table">
                <div class="cache-legend">
                  <div>Cache Block Table</div>
                  <div>(block 0 at top)</div>
                  <div class="cache-legend-line"><span class="cache-dot empty"></span><span>= empty</span></div>
                  <div class="cache-legend-line"><span class="cache-dot hit"></span><span>= hit</span></div>
                  <div class="cache-legend-line"><span class="cache-dot miss"></span><span>= miss</span></div>
                </div>
                <div class="cache-blocks" data-cache="blocksview"></div>
              </div>
            </div>
          </section>
          <section class="mars-tool-panel cache-log-panel">
            <div class="mars-tool-panel-title">Runtime Log</div>
            <div class="mars-tool-panel-body cache-section-body">
              <label class="cache-enable"><input type="checkbox" data-cache="enabled"> Enabled</label>
              <textarea class="cache-log" data-cache="log" readonly wrap="off"></textarea>
            </div>
          </section>
          <div class="mars-tool-footer cache-footer">
            <button class="tool-btn" data-cache="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <div class="mars-tool-footer-actions">
              <button class="tool-btn" data-cache="reset" type="button">Reset</button>
              <button class="tool-btn" data-cache="close" type="button">Close</button>
            </div>
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
      let stepHistory = new Map();

      function appendLog(line) {
        if (!line) return;
        controls.log.value += `${line}\n`;
        controls.log.scrollTop = controls.log.scrollHeight;
      }

      function getSnapshotStep(snapshot = lastSnapshot) {
        return Number.isFinite(snapshot?.steps) ? (snapshot.steps | 0) : 0;
      }

      function pruneFutureHistory(step) {
        for (const historyStep of stepHistory.keys()) {
          if ((historyStep | 0) > (step | 0)) {
            stepHistory.delete(historyStep);
          }
        }
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

      function refreshUiText() {
        shell.refreshTranslations?.();
        controls.connect.textContent = connected ? t("Disconnect from MIPS") : t("Connect to MIPS");
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

      function captureToolState() {
        return {
          accesses,
          hits,
          misses,
          highlightBlock,
          highlightKind,
          log: String(controls.log.value || ""),
          accessTick: Number(cache?.accessTick) || 0,
          blocks: Array.isArray(cache?.blocks)
            ? cache.blocks.map((block) => ({
                valid: block.valid === true,
                tag: block.tag >>> 0,
                lastUsed: Number(block.lastUsed) || 0
              }))
            : []
        };
      }

      function restoreToolState(state) {
        if (!state || typeof state !== "object" || !cache) return false;
        accesses = Number(state.accesses) || 0;
        hits = Number(state.hits) || 0;
        misses = Number(state.misses) || 0;
        highlightBlock = Number.isFinite(state.highlightBlock) ? (state.highlightBlock | 0) : -1;
        highlightKind = String(state.highlightKind || "empty");
        controls.log.value = String(state.log || "");
        cache.accessTick = Number(state.accessTick) || 0;
        if (Array.isArray(state.blocks) && state.blocks.length === cache.blocks.length) {
          cache.blocks = state.blocks.map((block) => ({
            valid: block.valid === true,
            tag: block.tag >>> 0,
            lastUsed: Number(block.lastUsed) || 0
          }));
        }
        render();
        return true;
      }

      function captureHistoryForStep(step) {
        const normalizedStep = step | 0;
        pruneFutureHistory(normalizedStep);
        stepHistory.set(normalizedStep, captureToolState());
      }

      function restoreHistoryForStep(step) {
        const normalizedStep = step | 0;
        if (stepHistory.has(normalizedStep)) {
          return restoreToolState(stepHistory.get(normalizedStep));
        }
        let bestStep = null;
        for (const candidate of stepHistory.keys()) {
          if ((candidate | 0) <= normalizedStep && (bestStep == null || (candidate | 0) > (bestStep | 0))) {
            bestStep = candidate | 0;
          }
        }
        if (bestStep == null) return false;
        return restoreToolState(stepHistory.get(bestStep));
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
        stepHistory = new Map();
        captureHistoryForStep(getSnapshotStep());
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

        appendLog(t("({count}) {kind} {address} -> {result} (set {setIndex}, block {blockIndex})", {
          count: accesses,
          kind: access.write ? t("write") : t("read"),
          address: toHex32(access.address),
          result: result.hit ? t("HIT") : t("MISS"),
          setIndex: result.setIndex,
          blockIndex: result.blockIndex
        }));
        render();
      }

      [controls.placement, controls.blocks, controls.replacement, controls.blockSize, controls.setSize]
        .forEach((control) => control.addEventListener("change", rebuildCache));

      controls.connect.addEventListener("click", () => {
        connected = !connected;
        refreshUiText();
        ctx.messagesPane.postMars(`${t("[tool] Data Cache Simulator {state}.", {
          state: connected ? t("connected") : t("disconnected")
        })}\n`);
      });

      controls.reset.addEventListener("click", rebuildCache);
      controls.close.addEventListener("click", shell.close);

      subscribeLanguageChange(refreshUiText);
      rebuildCache();
      refreshUiText();

      return {
        open() {
          shell.open();
          refreshUiText();
        },
        close: shell.close,
        onSnapshot(snapshot) {
          const previous = lastSnapshot;
          lastSnapshot = snapshot;
          if (!connected || !snapshot) return;

          const nextStep = getSnapshotStep(snapshot);
          const previousStep = getSnapshotStep(previous);
          if (!previous) {
            captureHistoryForStep(nextStep);
            return;
          }

          if (nextStep < previousStep) {
            restoreHistoryForStep(nextStep);
            pruneFutureHistory(nextStep);
            return;
          }
          if (nextStep === previousStep) return;

          processAccess(previous);
          captureHistoryForStep(nextStep);
        }
      };
    }
  });
})();
