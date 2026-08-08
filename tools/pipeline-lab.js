((rootScope) => {
  const root = rootScope || (typeof window !== "undefined" ? window : globalThis);

  const STAGES = Object.freeze(["IF", "ID", "EX", "MEM", "WB"]);
  const LOAD_OPS = new Set(["lb", "lbu", "lh", "lhu", "lw", "lwl", "lwr", "ll", "lwc1", "ldc1"]);
  const STORE_OPS = new Set(["sb", "sh", "sw", "swl", "swr", "sc", "swc1", "sdc1"]);
  const BRANCH_TWO_REG_OPS = new Set([
    "beq", "bne", "beql", "bnel", "bge", "bgeu", "bgt", "bgtu",
    "ble", "bleu", "blt", "bltu"
  ]);
  const BRANCH_ONE_REG_OPS = new Set([
    "bgez", "bgezal", "bgtz", "blez", "bltz", "bltzal", "bgezl",
    "bgtzl", "blezl", "bltzl", "beqz", "bnez"
  ]);
  const IMMEDIATE_ALU_OPS = new Set([
    "addi", "addiu", "andi", "ori", "xori", "slti", "sltiu",
    "daddi", "daddiu"
  ]);
  const REGISTER_ALU_OPS = new Set([
    "add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt",
    "sltu", "movn", "movz"
  ]);
  const SHIFT_IMMEDIATE_OPS = new Set(["sll", "srl", "sra", "rotr"]);
  const SHIFT_VARIABLE_OPS = new Set(["sllv", "srlv", "srav", "rotrv"]);
  const MULTIPLY_DIVIDE_OPS = new Set([
    "mult", "multu", "div", "divu", "madd", "maddu", "msub", "msubu"
  ]);
  const PSEUDO_WRITE_ONLY_OPS = new Set(["li", "la"]);
  const PSEUDO_MOVE_OPS = new Set(["move", "neg", "negu", "not", "abs"]);

  function normalizeRegister(value) {
    const token = String(value || "").trim().toLowerCase();
    if (!token.startsWith("$")) return "";
    if (token === "$0" || token === "$zero") return "$zero";
    return token;
  }

  function uniqueRegisters(values) {
    return [...new Set(values.map(normalizeRegister).filter(Boolean))];
  }

  function tokenizeInstruction(statement) {
    const source = String(statement || "").replace(/#.*$/, "").trim();
    if (!source) return [];
    return source
      .replace(/[(),]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  function decodeInstruction(row = {}, index = 0) {
    const text = String(row.basic || row.source || row.statement || "").trim();
    const tokens = tokenizeInstruction(text);
    const opcode = String(tokens[0] || "nop").toLowerCase();
    const operands = tokens.slice(1);
    const registers = operands.filter((operand) => String(operand).trim().startsWith("$"));
    let reads = [];
    let writes = [];
    let kind = "other";
    let supported = true;

    if (opcode === "nop" || opcode === "break") {
      kind = "control";
    } else if (LOAD_OPS.has(opcode)) {
      kind = "load";
      writes = [operands[0]];
      reads = [operands[operands.length - 1]];
    } else if (STORE_OPS.has(opcode)) {
      kind = "store";
      reads = [operands[0], operands[operands.length - 1]];
      if (opcode === "sc") writes = [operands[0]];
    } else if (BRANCH_TWO_REG_OPS.has(opcode)) {
      kind = "branch";
      reads = [operands[0], operands[1]];
    } else if (BRANCH_ONE_REG_OPS.has(opcode)) {
      kind = "branch";
      reads = [operands[0]];
      if (opcode === "bgezal" || opcode === "bltzal") writes = ["$ra"];
    } else if (opcode === "j") {
      kind = "jump";
    } else if (opcode === "jal" || opcode === "bal") {
      kind = "jump";
      writes = ["$ra"];
    } else if (opcode === "jr") {
      kind = "jump";
      reads = [operands[0]];
    } else if (opcode === "jalr") {
      kind = "jump";
      if (registers.length > 1) {
        writes = [registers[0]];
        reads = [registers[1]];
      } else {
        writes = ["$ra"];
        reads = [registers[0]];
      }
    } else if (opcode === "lui") {
      kind = "alu";
      writes = [operands[0]];
    } else if (IMMEDIATE_ALU_OPS.has(opcode)) {
      kind = "alu";
      writes = [operands[0]];
      reads = [operands[1]];
    } else if (REGISTER_ALU_OPS.has(opcode)) {
      kind = "alu";
      writes = [operands[0]];
      reads = [operands[1], operands[2]];
    } else if (SHIFT_IMMEDIATE_OPS.has(opcode)) {
      kind = "alu";
      writes = [operands[0]];
      reads = [operands[1]];
    } else if (SHIFT_VARIABLE_OPS.has(opcode)) {
      kind = "alu";
      writes = [operands[0]];
      reads = [operands[1], operands[2]];
    } else if (PSEUDO_WRITE_ONLY_OPS.has(opcode)) {
      kind = "alu";
      writes = [operands[0]];
    } else if (PSEUDO_MOVE_OPS.has(opcode)) {
      kind = "alu";
      writes = [operands[0]];
      reads = [operands[1]];
    } else if (MULTIPLY_DIVIDE_OPS.has(opcode)) {
      kind = "alu";
      reads = [operands[0], operands[1]];
      writes = ["$hi", "$lo"];
    } else if (opcode === "mfhi" || opcode === "mflo") {
      kind = "alu";
      reads = [opcode === "mfhi" ? "$hi" : "$lo"];
      writes = [operands[0]];
    } else if (opcode === "mthi" || opcode === "mtlo") {
      kind = "alu";
      reads = [operands[0]];
      writes = [opcode === "mthi" ? "$hi" : "$lo"];
    } else if (opcode === "syscall") {
      kind = "system";
      reads = ["$v0", "$a0", "$a1", "$a2", "$a3"];
      writes = ["$v0"];
    } else {
      supported = false;
      reads = registers;
    }

    return Object.freeze({
      id: Number.isFinite(Number(row.index)) ? Number(row.index) : index,
      index,
      address: Number.isFinite(Number(row.address)) ? (Number(row.address) >>> 0) : ((index * 4) >>> 0),
      addressHex: String(row.addressHex || `0x${((index * 4) >>> 0).toString(16).padStart(8, "0")}`),
      text: text || "nop",
      opcode,
      kind,
      reads: Object.freeze(uniqueRegisters(reads)),
      writes: Object.freeze(uniqueRegisters(writes).filter((register) => register !== "$zero")),
      isLoad: LOAD_OPS.has(opcode),
      isControl: kind === "branch" || kind === "jump",
      supported
    });
  }

  function cloneSlot(slot) {
    if (!slot) return null;
    if (slot.bubble) return { bubble: true, reason: String(slot.reason || "stall") };
    return slot;
  }

  function cloneStages(stages) {
    return Object.fromEntries(STAGES.map((stage) => [stage, cloneSlot(stages[stage])]));
  }

  function registersOverlap(reads, writes) {
    if (!reads.length || !writes.length) return [];
    const pending = new Set(writes);
    return reads.filter((register) => pending.has(register));
  }

  function detectHazard(stages, forwarding) {
    const consumer = stages.ID;
    if (!consumer || consumer.bubble || !consumer.reads.length) return null;
    if (forwarding) {
      const producer = stages.EX;
      if (!producer || producer.bubble || !producer.isLoad) return null;
      const registers = registersOverlap(consumer.reads, producer.writes);
      return registers.length
        ? { type: "load-use", registers, producer, consumer }
        : null;
    }

    for (const stage of ["EX", "MEM"]) {
      const producer = stages[stage];
      if (!producer || producer.bubble) continue;
      const registers = registersOverlap(consumer.reads, producer.writes);
      if (registers.length) {
        return { type: "raw", stage, registers, producer, consumer };
      }
    }
    return null;
  }

  function createEmptyStages() {
    return { IF: null, ID: null, EX: null, MEM: null, WB: null };
  }

  function createEmptyTimeline(length) {
    return Array.from({ length }, () => Object.freeze({}));
  }

  class PipelineSimulator {
    constructor(rows = [], options = {}) {
      this.forwarding = options.forwarding === true;
      this.loadProgram(rows);
    }

    loadProgram(rows = []) {
      this.program = (Array.isArray(rows) ? rows : [])
        .map((row, index) => decodeInstruction(row, index));
      this.reset();
      return this.snapshot();
    }

    reset() {
      this.history = [];
      this.state = {
        cycle: 0,
        nextIndex: 0,
        stages: createEmptyStages(),
        completed: 0,
        stalls: 0,
        lastHazard: null,
        timeline: createEmptyTimeline(this.program.length)
      };
      return this.snapshot();
    }

    setForwarding(enabled) {
      const next = enabled === true;
      if (next === this.forwarding) return this.snapshot();
      this.forwarding = next;
      return this.reset();
    }

    captureState() {
      return {
        cycle: this.state.cycle,
        nextIndex: this.state.nextIndex,
        stages: cloneStages(this.state.stages),
        completed: this.state.completed,
        stalls: this.state.stalls,
        lastHazard: this.state.lastHazard ? { ...this.state.lastHazard } : null,
        timelineChanges: []
      };
    }

    isDone() {
      if (!this.program.length) return true;
      if (this.state.nextIndex < this.program.length) return false;
      return ["IF", "ID", "EX", "MEM"].every((stage) => !this.state.stages[stage]);
    }

    step() {
      return this.advance(true);
    }

    advance(returnSnapshot) {
      if (this.isDone()) return returnSnapshot ? this.snapshot() : null;
      const historyEntry = this.captureState();
      this.history.push(historyEntry);

      const previous = this.state.stages;
      const hazard = detectHazard(previous, this.forwarding);
      let nextIndex = this.state.nextIndex;
      let fetched = null;
      if (!hazard && nextIndex < this.program.length) {
        fetched = this.program[nextIndex];
        nextIndex += 1;
      }

      const nextStages = {
        WB: cloneSlot(previous.MEM),
        MEM: cloneSlot(previous.EX),
        EX: hazard ? { bubble: true, reason: hazard.type } : cloneSlot(previous.ID),
        ID: hazard ? cloneSlot(previous.ID) : cloneSlot(previous.IF),
        IF: hazard ? cloneSlot(previous.IF) : fetched
      };
      const timeline = this.state.timeline;
      const nextCycle = this.state.cycle + 1;
      STAGES.forEach((stage) => {
        const slot = nextStages[stage];
        if (!slot || slot.bubble || !timeline[slot.index]) return;
        historyEntry.timelineChanges.push({ index: slot.index, row: timeline[slot.index] });
        timeline[slot.index] = Object.freeze({
          ...timeline[slot.index],
          [nextCycle - 1]: stage === "ID" && hazard ? "ID*" : stage
        });
      });

      this.state = {
        cycle: nextCycle,
        nextIndex,
        stages: nextStages,
        completed: this.state.completed + (nextStages.WB && !nextStages.WB.bubble ? 1 : 0),
        stalls: this.state.stalls + (hazard ? 1 : 0),
        lastHazard: hazard
          ? {
              type: hazard.type,
              registers: hazard.registers.slice(),
              producerId: hazard.producer.id,
              consumerId: hazard.consumer.id
            }
          : null,
        timeline
      };
      return returnSnapshot ? this.snapshot() : null;
    }

    back() {
      if (!this.history.length) return this.snapshot();
      const previous = this.history.pop();
      const timeline = this.state.timeline;
      for (let index = previous.timelineChanges.length - 1; index >= 0; index -= 1) {
        const change = previous.timelineChanges[index];
        timeline[change.index] = change.row;
      }
      this.state = {
        cycle: previous.cycle,
        nextIndex: previous.nextIndex,
        stages: previous.stages,
        completed: previous.completed,
        stalls: previous.stalls,
        lastHazard: previous.lastHazard,
        timeline
      };
      return this.snapshot();
    }

    run(maxCycles = 1000) {
      const limit = Math.max(1, Math.min(100000, Number(maxCycles) | 0));
      let count = 0;
      while (!this.isDone() && count < limit) {
        this.advance(false);
        count += 1;
      }
      return this.snapshot();
    }

    snapshot() {
      const stages = cloneStages(this.state.stages);
      const completed = this.state.completed;
      return {
        cycle: this.state.cycle,
        forwarding: this.forwarding,
        stages,
        completed,
        stalls: this.state.stalls,
        cpi: completed > 0 ? this.state.cycle / completed : 0,
        lastHazard: this.state.lastHazard ? { ...this.state.lastHazard } : null,
        timeline: Object.freeze(this.state.timeline.slice()),
        program: this.program.slice(),
        nextIndex: this.state.nextIndex,
        canBack: this.history.length > 0,
        done: this.isDone()
      };
    }
  }

  const coreApi = Object.freeze({
    STAGES,
    tokenizeInstruction,
    decodeInstruction,
    detectHazard,
    createSimulator: (rows, options) => new PipelineSimulator(rows, options)
  });
  root.MarsPipelineLabCore = coreApi;

  const host = root.MarsWebTools;
  if (!host || typeof host.register !== "function" || typeof document === "undefined") return;

  const STYLE_ID = "mars-web-tool-pipeline-lab-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .pipeline-lab-tool { height:100%; min-height:0; box-sizing:border-box; padding:8px; display:flex; flex-direction:column; gap:8px; color:var(--text); font:12px "Segoe UI",Tahoma,sans-serif; }
      .pipeline-lab-toolbar { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .pipeline-lab-toolbar label { display:flex; align-items:center; gap:5px; font-weight:600; }
      .pipeline-lab-toolbar select { min-height:28px; border:1px solid var(--line); background:var(--field); color:var(--text); }
      .pipeline-lab-status { margin:0; min-height:18px; color:var(--muted); }
      .pipeline-lab-metrics { display:grid; grid-template-columns:repeat(4,minmax(90px,1fr)); gap:6px; }
      .pipeline-lab-metric { border:1px solid var(--line); background:var(--surface-raised); padding:6px 8px; }
      .pipeline-lab-metric strong { display:block; font-size:16px; color:var(--accent-strong); }
      .pipeline-lab-stages { display:grid; grid-template-columns:repeat(5,minmax(100px,1fr)); gap:6px; }
      .pipeline-lab-stage { min-width:0; border:1px solid var(--line); background:var(--surface-raised); }
      .pipeline-lab-stage h3 { margin:0; padding:5px 7px; border-bottom:1px solid var(--line); background:var(--table-head); font-size:12px; text-align:center; }
      .pipeline-lab-stage pre { min-height:48px; margin:0; padding:7px; white-space:pre-wrap; overflow-wrap:anywhere; font:11px/1.35 Consolas,monospace; }
      .pipeline-lab-stage[data-stage="IF"] h3 { border-top:3px solid #8bc34a; }
      .pipeline-lab-stage[data-stage="ID"] h3 { border-top:3px solid #29b6f6; }
      .pipeline-lab-stage[data-stage="EX"] h3 { border-top:3px solid #ff9800; }
      .pipeline-lab-stage[data-stage="MEM"] h3 { border-top:3px solid #ef5350; }
      .pipeline-lab-stage[data-stage="WB"] h3 { border-top:3px solid #ab47bc; }
      .pipeline-lab-timeline-wrap { min-height:160px; flex:1; overflow:auto; border:1px solid var(--line); background:var(--surface); }
      .pipeline-lab-timeline { border-collapse:collapse; min-width:100%; width:max-content; font:11px Consolas,monospace; }
      .pipeline-lab-timeline caption { position:sticky; left:0; padding:5px 7px; border-bottom:1px solid var(--line); background:var(--surface-raised); color:var(--muted); text-align:left; font-family:"Segoe UI",Tahoma,sans-serif; }
      .pipeline-lab-timeline th,.pipeline-lab-timeline td { border:1px solid var(--line); padding:4px 6px; text-align:center; min-width:38px; }
      .pipeline-lab-timeline th:first-child,.pipeline-lab-timeline td:first-child { position:sticky; left:0; z-index:2; min-width:260px; max-width:360px; text-align:left; background:var(--surface-raised); }
      .pipeline-lab-timeline thead th { position:sticky; top:0; z-index:3; background:var(--table-head); }
      .pipeline-lab-timeline td[data-value="IF"] { background:color-mix(in srgb,#8bc34a 28%,var(--surface)); }
      .pipeline-lab-timeline td[data-value="ID"],.pipeline-lab-timeline td[data-value="ID*"] { background:color-mix(in srgb,#29b6f6 28%,var(--surface)); }
      .pipeline-lab-timeline td[data-value="ID*"] { color:var(--danger); font-weight:700; }
      .pipeline-lab-timeline td[data-value="EX"] { background:color-mix(in srgb,#ff9800 30%,var(--surface)); }
      .pipeline-lab-timeline td[data-value="MEM"] { background:color-mix(in srgb,#ef5350 25%,var(--surface)); }
      .pipeline-lab-timeline td[data-value="WB"] { background:color-mix(in srgb,#ab47bc 25%,var(--surface)); }
      .pipeline-lab-note { margin:0; padding:6px 8px; border:1px solid var(--line); background:var(--surface-raised); color:var(--muted); }
      .desktop-stacked .pipeline-lab-tool { padding:6px; gap:6px; }
      .desktop-stacked .pipeline-lab-toolbar { flex-wrap:nowrap; overflow-x:auto; }
      .desktop-stacked .pipeline-lab-toolbar > * { flex:0 0 auto; }
      .desktop-stacked .pipeline-lab-metrics { grid-template-columns:repeat(4,minmax(82px,1fr)); overflow-x:auto; }
      .desktop-stacked .pipeline-lab-stages { grid-template-columns:repeat(5,minmax(118px,1fr)); overflow-x:auto; }
      .desktop-stacked .pipeline-lab-stage pre { min-height:58px; }
      .desktop-stacked .pipeline-lab-timeline th:first-child,.desktop-stacked .pipeline-lab-timeline td:first-child { min-width:210px; }
    `;
    document.head.appendChild(style);
  }

  function t(message, params = {}) {
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (i18n && typeof i18n.t === "function") return i18n.t(message, params);
    return String(message).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(params[key] ?? ""));
  }

  function subscribeLanguageChange(listener) {
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (!i18n || typeof i18n.subscribe !== "function" || typeof listener !== "function") return () => {};
    return i18n.subscribe(listener);
  }

  function programSignature(rows) {
    return rows.map((row) => `${row.address >>> 0}:${row.code || row.machineCodeHex || ""}:${row.basic || row.source || ""}`).join("|");
  }

  host.register({
    id: "pipeline-lab",
    label: "Pipeline Lab",
    create(ctx) {
      const shell = ctx.createToolWindowShell("pipeline-lab", "Pipeline Lab", 980, 620, `
        <div class="pipeline-lab-tool">
          <div class="pipeline-lab-toolbar">
            <label>Data hazards
              <select data-plab="forwarding">
                <option value="off">Stall until WB</option>
                <option value="on">Forwarding</option>
              </select>
            </label>
            <button class="tool-btn" data-plab="reset" type="button">Reset</button>
            <button class="tool-btn" data-plab="previous" type="button">Previous cycle</button>
            <button class="tool-btn" data-plab="next" type="button">Next cycle</button>
            <button class="tool-btn" data-plab="run" type="button">Run pipeline</button>
            <button class="tool-btn" data-plab="close" type="button">Close</button>
          </div>
          <p class="pipeline-lab-status" data-plab="status"></p>
          <div class="pipeline-lab-metrics">
            <div class="pipeline-lab-metric">Cycles<strong data-plab-metric="cycles">0</strong></div>
            <div class="pipeline-lab-metric">Completed<strong data-plab-metric="completed">0</strong></div>
            <div class="pipeline-lab-metric">Stalls<strong data-plab-metric="stalls">0</strong></div>
            <div class="pipeline-lab-metric">CPI<strong data-plab-metric="cpi">0.00</strong></div>
          </div>
          <div class="pipeline-lab-stages">
            ${STAGES.map((stage) => `<section class="pipeline-lab-stage" data-stage="${stage}"><h3>${stage}</h3><pre data-plab-stage="${stage}">-</pre></section>`).join("")}
          </div>
          <div class="pipeline-lab-timeline-wrap">
            <table class="pipeline-lab-timeline" data-plab="timeline"></table>
          </div>
          <p class="pipeline-lab-note">Initial model: static instruction stream and RAW data hazards. Control-flow resolution, exceptions and memory latency are planned next.</p>
        </div>
      `);

      const rootElement = shell.root;
      const forwardingSelect = rootElement.querySelector("[data-plab='forwarding']");
      const statusNode = rootElement.querySelector("[data-plab='status']");
      const timelineNode = rootElement.querySelector("[data-plab='timeline']");
      const previousButton = rootElement.querySelector("[data-plab='previous']");
      const nextButton = rootElement.querySelector("[data-plab='next']");
      const runButton = rootElement.querySelector("[data-plab='run']");
      const resetButton = rootElement.querySelector("[data-plab='reset']");
      const stageNodes = Object.fromEntries(STAGES.map((stage) => [stage, rootElement.querySelector(`[data-plab-stage='${stage}']`)]));
      const metricNodes = Object.fromEntries(["cycles", "completed", "stalls", "cpi"].map((name) => [name, rootElement.querySelector(`[data-plab-metric='${name}']`)]));

      let simulator = coreApi.createSimulator([]);
      let latestSnapshot = null;
      let loadedSignature = "";

      function stageText(slot) {
        if (!slot) return "-";
        if (slot.bubble) return `${t("Bubble")}\n${slot.reason}`;
        return `${slot.addressHex}\n${slot.text}`;
      }

      function renderTimeline(snapshot) {
        timelineNode.replaceChildren();
        const maxVisibleInstructions = 160;
        const maxVisibleCycles = 80;
        const anchor = Math.max(0, Math.min(snapshot.program.length - 1, snapshot.nextIndex - 1));
        let firstInstruction = Math.max(0, anchor - 50);
        let lastInstruction = Math.min(snapshot.program.length, firstInstruction + maxVisibleInstructions);
        firstInstruction = Math.max(0, lastInstruction - maxVisibleInstructions);
        const firstCycle = Math.max(1, snapshot.cycle - maxVisibleCycles + 1);

        const caption = document.createElement("caption");
        caption.textContent = snapshot.cycle > 0
          ? t("Showing instructions {first}-{last} of {total}; cycles {cycleFirst}-{cycleLast}.", {
              first: snapshot.program.length ? firstInstruction + 1 : 0,
              last: lastInstruction,
              total: snapshot.program.length,
              cycleFirst: firstCycle,
              cycleLast: snapshot.cycle
            })
          : t("Showing instructions {first}-{last} of {total}; cycle 0.", {
              first: snapshot.program.length ? firstInstruction + 1 : 0,
              last: lastInstruction,
              total: snapshot.program.length
            });
        timelineNode.appendChild(caption);

        const thead = document.createElement("thead");
        const header = document.createElement("tr");
        const instructionHeader = document.createElement("th");
        instructionHeader.textContent = t("Instruction");
        header.appendChild(instructionHeader);
        for (let cycle = firstCycle; cycle <= snapshot.cycle; cycle += 1) {
          const cell = document.createElement("th");
          cell.textContent = `C${cycle}`;
          header.appendChild(cell);
        }
        thead.appendChild(header);
        timelineNode.appendChild(thead);

        const tbody = document.createElement("tbody");
        snapshot.program.slice(firstInstruction, lastInstruction).forEach((instruction, visibleIndex) => {
          const index = firstInstruction + visibleIndex;
          const row = document.createElement("tr");
          const label = document.createElement("td");
          label.textContent = `${instruction.addressHex}  ${instruction.text}`;
          row.appendChild(label);
          for (let cycle = firstCycle - 1; cycle < snapshot.cycle; cycle += 1) {
            const cell = document.createElement("td");
            const value = snapshot.timeline[index]?.[cycle] || "";
            cell.textContent = value;
            if (value) cell.dataset.value = value;
            row.appendChild(cell);
          }
          tbody.appendChild(row);
        });
        timelineNode.appendChild(tbody);
      }

      function render() {
        const snapshot = simulator.snapshot();
        metricNodes.cycles.textContent = String(snapshot.cycle);
        metricNodes.completed.textContent = String(snapshot.completed);
        metricNodes.stalls.textContent = String(snapshot.stalls);
        metricNodes.cpi.textContent = snapshot.cpi.toFixed(2);
        STAGES.forEach((stage) => { stageNodes[stage].textContent = stageText(snapshot.stages[stage]); });
        forwardingSelect.value = snapshot.forwarding ? "on" : "off";
        previousButton.disabled = !snapshot.canBack;
        nextButton.disabled = snapshot.done;
        runButton.disabled = snapshot.done;
        resetButton.disabled = snapshot.program.length === 0;

        if (!snapshot.program.length) {
          statusNode.textContent = latestSnapshot?.assembled
            ? t("The assembled program has no text instructions.")
            : t("Assemble a program to begin the pipeline simulation.");
        } else if (snapshot.lastHazard) {
          statusNode.textContent = t("Cycle {cycle}: {type} hazard on {registers}.", {
            cycle: snapshot.cycle,
            type: snapshot.lastHazard.type,
            registers: snapshot.lastHazard.registers.join(", ")
          });
        } else if (snapshot.done) {
          statusNode.textContent = t("Pipeline complete in {cycles} cycles.", { cycles: snapshot.cycle });
        } else {
          statusNode.textContent = t("Cycle {cycle} of the independent Pipeline Lab simulation.", { cycle: snapshot.cycle });
        }
        renderTimeline(snapshot);
      }

      function loadSnapshot(snapshot, force = false) {
        if (!snapshot || typeof snapshot !== "object") return;
        latestSnapshot = snapshot;
        if (snapshot.assembled !== true) {
          if (force || loadedSignature) {
            loadedSignature = "";
            simulator.loadProgram([]);
          }
          render();
          return;
        }
        if (!Array.isArray(snapshot.textRows) || snapshot.textRows.length === 0) {
          render();
          return;
        }
        const signature = programSignature(snapshot.textRows);
        if (force || signature !== loadedSignature) {
          loadedSignature = signature;
          simulator = coreApi.createSimulator(snapshot.textRows, { forwarding: forwardingSelect.value === "on" });
        }
        render();
      }

      forwardingSelect.addEventListener("change", () => {
        simulator.setForwarding(forwardingSelect.value === "on");
        render();
      });
      resetButton.addEventListener("click", () => { simulator.reset(); render(); });
      previousButton.addEventListener("click", () => { simulator.back(); render(); });
      nextButton.addEventListener("click", () => { simulator.step(); render(); });
      runButton.addEventListener("click", () => {
        simulator.run(Math.min(100000, Math.max(100, simulator.program.length * 4 + 16)));
        render();
      });
      rootElement.querySelector("[data-plab='close']").addEventListener("click", shell.close);

      subscribeLanguageChange(() => {
        shell.refreshTranslations?.();
        render();
      });
      render();

      return {
        root: rootElement,
        isConnected: () => false,
        open() {
          shell.open();
          if (latestSnapshot) loadSnapshot(latestSnapshot);
        },
        close: shell.close,
        onSnapshot(snapshot) {
          loadSnapshot(snapshot);
        }
      };
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
