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
        border: 1px solid var(--line-strong);
        height: 20px;
        position: relative;
        background: var(--surface);
      }

      .cache-progress .fill {
        position: absolute;
        inset: 0 auto 0 0;
        width: 0%;
        background: var(--accent);
      }

      .cache-progress span {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: var(--accent-2);
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
        border: 1px solid var(--flat-line);
        background: var(--surface);
        overflow: auto;
        min-height: 180px;
      }

      .cache-block-row {
        display: grid;
        grid-template-columns: 16px minmax(0, 1fr);
        gap: 6px;
        align-items: center;
        border-bottom: 1px solid var(--line-subtle);
        padding: 2px 6px;
        font-family: "Courier New", "Lucida Console", monospace;
        font-size: 11px;
      }

      .cache-dot {
        width: 10px;
        height: 10px;
        border: 1px solid var(--flat-line-strong);
        background: var(--flat-face);
      }

      .cache-dot.empty { background: var(--flat-face); }
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
        border: 1px solid var(--line-strong);
        background: var(--surface);
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

    access(address, capturePrevious = true) {
      const previousAccessTick = this.accessTick;
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
        const previousBlock = capturePrevious ? { ...this.blocks[hitIndex] } : null;
        this.blocks[hitIndex].lastUsed = this.accessTick;
        return { hit: true, blockIndex: hitIndex, setIndex, tag, previousAccessTick, previousBlock };
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

      const previousBlock = capturePrevious ? { ...this.blocks[replaceIndex] } : null;
      this.blocks[replaceIndex] = { valid: true, tag, lastUsed: this.accessTick };
      return { hit: false, blockIndex: replaceIndex, setIndex, tag, previousAccessTick, previousBlock };
    }
  }

  host.register({
    id: "cache-simulator",
    label: "Data Cache Simulator",
    create(ctx) {
      const shell = ctx.createToolWindowShell("cache-simulator", "Data Cache Simulation Tool, Version 1.2", 780, 620, `
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
      let logLines = [];
      let activeHistoryDelta = null;
      const MAX_LOG_LINES = 5000;
      const history = ctx.createToolDeltaHistory({
        applyInverse(delta) {
          if (!delta || !cache) return;
          if (Array.isArray(delta.removedLog) && delta.removedLog.length) {
            logLines = [...delta.removedLog, ...logLines];
          }
          logLines.length = Math.min(logLines.length, Math.max(0, delta.logLength | 0));
          const operations = Array.isArray(delta.operations) ? delta.operations : [];
          for (let index = operations.length - 1; index >= 0; index -= 1) {
            const operation = operations[index];
            accesses = operation.accesses | 0;
            hits = operation.hits | 0;
            misses = operation.misses | 0;
            highlightBlock = operation.highlightBlock | 0;
            highlightKind = String(operation.highlightKind || "empty");
            cache.accessTick = Number(operation.accessTick) || 0;
            if (
              Number.isFinite(operation.blockIndex)
              && operation.blockIndex >= 0
              && operation.blockIndex < cache.blocks.length
              && operation.previousBlock
            ) {
              cache.blocks[operation.blockIndex] = { ...operation.previousBlock };
            }
          }
          flushLog();
          render();
        }
      });

      function flushLog() {
        controls.log.value = logLines.length ? `${logLines.join("\n")}\n` : "";
        controls.log.scrollTop = controls.log.scrollHeight;
      }

      function appendLog(line) {
        if (!line) return;
        logLines.push(line);
        if (logLines.length > MAX_LOG_LINES) {
          const removed = logLines.splice(0, logLines.length - MAX_LOG_LINES);
          if (activeHistoryDelta) activeHistoryDelta.removedLog.push(...removed);
        }
      }

      function getSnapshotStep(snapshot = null) {
        if (snapshot && Number.isFinite(snapshot.steps)) return snapshot.steps | 0;
        return Number.isFinite(ctx.engine?.steps) ? (ctx.engine.steps | 0) : 0;
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
        logLines = [];
        flushLog();
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
        history.clear(getSnapshotStep());
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

      function processResolvedAccess(access, targetStep, shouldRender = true, retainHistory = true) {
        if (!cache || !controls.enabled.checked) return;
        if (!access) return;

        const delta = retainHistory
          ? history.ensure(targetStep, () => ({
              operations: [],
              logLength: logLines.length,
              removedLog: []
            }))
          : null;
        const inverse = delta
          ? {
              accesses,
              hits,
              misses,
              highlightBlock,
              highlightKind,
              accessTick: cache.accessTick,
              blockIndex: -1,
              previousBlock: null
            }
          : null;
        const result = cache.access(access.address >>> 0, Boolean(delta));
        if (inverse) {
          inverse.blockIndex = result.blockIndex | 0;
          inverse.previousBlock = result.previousBlock;
          delta.operations.push(inverse);
        }
        accesses += 1;
        if (result.hit) hits += 1;
        else misses += 1;

        highlightBlock = result.blockIndex;
        highlightKind = result.hit ? "hit" : "miss";

        activeHistoryDelta = delta;
        try {
          appendLog(t("({count}) {kind} {address} -> {result} (set {setIndex}, block {blockIndex})", {
            count: accesses,
            kind: access.write ? t("write") : t("read"),
            address: toHex32(access.address),
            result: result.hit ? t("HIT") : t("MISS"),
            setIndex: result.setIndex,
            blockIndex: result.blockIndex
          }));
        } finally {
          activeHistoryDelta = null;
        }
        if (shouldRender) {
          flushLog();
          render();
        }
      }

      function processRuntimeEvent(event, shouldRender = true, retainHistory = true) {
        if (!event || event.type !== "instruction") return;
        const memoryAccesses = Array.isArray(event.memoryAccesses) ? event.memoryAccesses : [];
        if (!memoryAccesses.length) return;
        const opcode = String(
          event.opcode
          || event.instructionTokens?.[0]
          || parseTokens(event.executedInstruction)[0]
          || ""
        ).toLowerCase();
        if (!MEMORY_OPS.has(opcode)) return;
        const desiredKind = WRITE_OPS.has(opcode) ? "write" : "read";
        let remainingAccesses = 0;
        memoryAccesses.forEach((access) => {
          if (access?.kind === desiredKind) {
            remainingAccesses += Math.max(1, Number(access?.accessCount) | 0);
          }
        });
        memoryAccesses.forEach((access) => {
          if (access?.kind !== desiredKind) return;
          const count = Math.max(1, Number(access?.accessCount) | 0);
          const unitSize = Math.max(1, Number(access?.unitSize) | 0);
          for (let index = 0; index < count; index += 1) {
            remainingAccesses -= 1;
            processResolvedAccess({
              opcode,
              address: ((access.address >>> 0) + (index * unitSize)) >>> 0,
              write: access.kind === "write"
            }, event.stepAfter | 0, shouldRender && remainingAccesses === 0, retainHistory);
          }
        });
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
        isConnected: () => connected,
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
            history.sync(snapshot);
            return;
          }

          if (nextStep < previousStep) {
            history.rewind(nextStep);
            history.sync(snapshot);
            return;
          }
          if (nextStep === previousStep) return;

          history.sync(snapshot);
        },
        onRuntimeEvent(event, delivery = {}) {
          if (!connected || !event) return;
          if (event.type === "backstep") {
            history.rewind(event.stepAfter | 0);
            return;
          }
          processRuntimeEvent(event, false, delivery.retainHistory !== false);
          history.pruneBefore(event.historyStartStep | 0);
        },
        onRuntimeEventBatch(events, batch = {}) {
          if (!connected || !Array.isArray(events)) return;
          const historyStart = Number.isFinite(batch.finalHistoryStartStep)
            ? Math.max(0, batch.finalHistoryStartStep | 0)
            : null;
          events.forEach((event) => {
            if (!event) return;
            if (event.type === "backstep") {
              history.rewind(event.stepAfter | 0);
              return;
            }
            const step = event.stepAfter | 0;
            processRuntimeEvent(event, false, historyStart == null || step > historyStart);
          });
          if (historyStart != null) history.pruneBefore(historyStart);
        },
        onRuntimeBatchEnd() {
          if (!connected) return;
          flushLog();
          render();
        },
        onBackstep(event) {
          if (!connected || !event) return;
          history.rewind(event.stepAfter | 0);
          flushLog();
          render();
        }
      };
    }
  });
})();
