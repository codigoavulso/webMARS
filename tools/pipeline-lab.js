((rootScope) => {
  const root = rootScope || (typeof window !== "undefined" ? window : globalThis);

  const MODEL_ID = "webmars.pipeline-lab";
  const MODEL_VERSION = 2;
  const REPORT_SCHEMA = "webmars.pipeline-report/1";
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
  // Instructions that can transfer control to the exception handler. The
  // cycle-accurate model does not simulate the handler itself; it only models
  // the fetch behaviour they imply (see `serializeTraps`).
  const TRAP_OPS = new Set([
    "syscall", "break", "teq", "tne", "tge", "tgeu", "tlt", "tltu",
    "teqi", "tnei", "tgei", "tgeiu", "tlti", "tltiu", "eret"
  ]);
  // Opcode families the timing model deliberately does not claim to reproduce.
  // They still flow through the five stages, but their latency is not modelled.
  const UNMODELLED_PREFIXES = ["add.", "sub.", "mul.", "div.", "c.", "cvt.", "mov.", "neg.", "abs.", "sqrt."];
  const UNMODELLED_OPS = new Set(["mfc1", "mtc1", "mfc0", "mtc0", "bc1t", "bc1f", "cfc1", "ctc1"]);

  const BRANCH_PREDICTIONS = Object.freeze(["not-taken", "taken", "bht"]);
  const OUTCOME_MODELS = Object.freeze(["sequential", "backward-taken"]);
  const MAX_TRACE_ROWS = 20000;

  // Where the fetch unit gets its instruction stream from.
  //
  //   static    - the assembled program in address order, with branch outcomes
  //               taken from the declared assumption. Nothing is executed, so
  //               no register ever holds a value.
  //   execution - the sequence webMARS actually executed, recorded instruction
  //               by instruction. Branch outcomes are facts rather than
  //               assumptions, and every instruction carries the register
  //               values it really read and wrote.
  const TRACE_SOURCES = Object.freeze(["static", "execution"]);
  // Canonical MIPS order, so the register view reads like the Registers window
  // rather than like a hash map.
  const REGISTER_ORDER = Object.freeze([
    "$zero", "$at", "$v0", "$v1", "$a0", "$a1", "$a2", "$a3",
    "$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6", "$t7",
    "$s0", "$s1", "$s2", "$s3", "$s4", "$s5", "$s6", "$s7",
    "$t8", "$t9", "$k0", "$k1", "$gp", "$sp", "$fp", "$ra",
    "$hi", "$lo"
  ]);
  const REGISTER_RANK = new Map(REGISTER_ORDER.map((name, index) => [name, index]));
  // A recorded run can be far longer than any timeline a person reads, so the
  // per-cycle register log keeps a bounded tail rather than the whole history.
  const MAX_REGISTER_LOG = 4000;

  const DEFAULT_CONFIG = Object.freeze({
    forwarding: false,
    delaySlot: false,
    branchPrediction: "not-taken",
    branchResolution: "EX",
    memoryLatency: 1,
    outcomeModel: "sequential",
    loopIterations: 4,
    serializeTraps: false,
    bhtEntries: 16,
    bhtHistorySize: 1,
    bhtInitialTaken: false
  });

  // Named, versioned architectural profiles. `version` changes whenever the
  // timing produced by a profile changes, so reports stay comparable.
  const PROFILES = Object.freeze([
    { id: "stall-only", label: "Stall until WB (no forwarding)", version: 1, config: { forwarding: false } },
    { id: "forwarding", label: "Forwarding", version: 1, config: { forwarding: true } },
    { id: "delay-slot", label: "Forwarding + delay slot", version: 1, config: { forwarding: true, delaySlot: true } },
    { id: "predict-taken", label: "Forwarding + predict taken", version: 1, config: { forwarding: true, branchPrediction: "taken" } },
    { id: "early-resolution", label: "Forwarding + resolve in ID", version: 1, config: { forwarding: true, branchResolution: "ID" } },
    { id: "slow-memory", label: "Forwarding + 2-cycle memory", version: 1, config: { forwarding: true, memoryLatency: 2 } },
    { id: "strict-traps", label: "Forwarding + serialized traps", version: 1, config: { forwarding: true, serializeTraps: true } },
    { id: "bht-dynamic", label: "Forwarding + branch history table", version: 1, config: { forwarding: true, branchPrediction: "bht" } }
  ].map((profile) => Object.freeze({ ...profile, config: Object.freeze({ ...DEFAULT_CONFIG, ...profile.config }) })));

  function findProfile(id) {
    return PROFILES.find((profile) => profile.id === String(id)) || null;
  }

  function normalizeConfig(options = {}) {
    const source = options && typeof options === "object" ? options : {};
    const base = source.profile ? (findProfile(source.profile)?.config || DEFAULT_CONFIG) : DEFAULT_CONFIG;
    const merged = { ...base, ...source };
    const latency = Number(merged.memoryLatency);
    const iterations = Number(merged.loopIterations);
    return Object.freeze({
      forwarding: merged.forwarding === true,
      delaySlot: merged.delaySlot === true,
      branchPrediction: BRANCH_PREDICTIONS.includes(merged.branchPrediction) ? merged.branchPrediction : "not-taken",
      branchResolution: merged.branchResolution === "ID" ? "ID" : "EX",
      memoryLatency: Number.isFinite(latency) ? Math.max(1, Math.min(8, Math.trunc(latency))) : 1,
      outcomeModel: OUTCOME_MODELS.includes(merged.outcomeModel) ? merged.outcomeModel : "sequential",
      loopIterations: Number.isFinite(iterations) ? Math.max(1, Math.min(64, Math.trunc(iterations))) : 4,
      serializeTraps: merged.serializeTraps === true,
      bhtEntries: BHT_ENTRY_CHOICES.includes(Number(merged.bhtEntries)) ? Number(merged.bhtEntries) : 16,
      bhtHistorySize: BHT_HISTORY_CHOICES.includes(Number(merged.bhtHistorySize)) ? Number(merged.bhtHistorySize) : 1,
      bhtInitialTaken: merged.bhtInitialTaken === true
    });
  }

  // Accepts the runtime's label list ([{label, address}]) or a plain map.
  function normalizeLabels(labels) {
    const table = new Map();
    if (!labels) return table;
    // Duck-typed rather than `instanceof Map`: a Map from another realm - a vm
    // context in the tests, a frame in the browser - is not an instance of this
    // realm's Map and would silently fall through to Object.entries, which
    // yields nothing for a Map and leaves every branch target unresolved. The
    // entries are copied either way, so the caller cannot mutate the label
    // table out from under a running simulation.
    const entries = typeof labels.forEach === "function" && typeof labels.get === "function"
      ? [...labels].map(([name, address]) => [name, address])
      : (Array.isArray(labels)
        ? labels.map((entry) => [entry?.label, entry?.address])
        : Object.entries(labels));
    entries.forEach(([name, address]) => {
      const key = String(name || "").trim();
      const value = Number(address);
      if (key && Number.isFinite(value)) table.set(key, value >>> 0);
    });
    return table;
  }

  function sameConfig(left, right) {
    return Object.keys(DEFAULT_CONFIG).every((key) => left[key] === right[key]);
  }

  function configProfileId(config) {
    const match = PROFILES.find((profile) => sameConfig(profile.config, config));
    return match ? match.id : "custom";
  }

  // The same table sizes the BHT Simulator tool offers, so a configuration can
  // be carried from one tool to the other without translation.
  const BHT_ENTRY_CHOICES = Object.freeze([8, 16, 32]);
  const BHT_HISTORY_CHOICES = Object.freeze([1, 2]);

  // A branch history table with the update rule the BHT Simulator implements:
  // a wrong prediction flips the entry only when the whole history agrees with
  // the new outcome, so a single surprise does not overturn a settled pattern.
  // Keeping the rule identical is what makes the two tools comparable; a
  // divergence here would be a defect, not a variant.
  function createBranchTable(config) {
    return {
      entries: config.bhtEntries,
      historySize: config.bhtHistorySize,
      initialTaken: config.bhtInitialTaken,
      // Sparse on purpose: only branches the program actually reaches occupy an
      // entry, which keeps the per-cycle clone for backstep cheap.
      rows: new Map()
    };
  }

  function cloneBranchTable(table) {
    return {
      ...table,
      rows: new Map([...table.rows].map(([index, row]) => [index, {
        prediction: row.prediction,
        history: [...row.history]
      }]))
    };
  }

  function branchTableIndex(table, address) {
    return ((address >>> 2) % table.entries) >>> 0;
  }

  function branchTableRow(table, address) {
    const index = branchTableIndex(table, address);
    if (!table.rows.has(index)) {
      table.rows.set(index, {
        prediction: table.initialTaken,
        history: Array.from({ length: table.historySize }, () => table.initialTaken)
      });
    }
    return table.rows.get(index);
  }

  function branchTablePredicts(table, address) {
    return branchTableRow(table, address).prediction === true;
  }

  function updateBranchTable(table, address, taken) {
    const row = branchTableRow(table, address);
    const outcome = taken === true;
    for (let index = 0; index < row.history.length - 1; index += 1) {
      row.history[index] = row.history[index + 1];
    }
    row.history[row.history.length - 1] = outcome;
    if (outcome === row.prediction) return;
    if (row.history.every((entry) => entry === outcome)) row.prediction = !row.prediction;
  }

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

  function parseAddressToken(token) {
    const text = String(token || "").trim();
    if (/^0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text, 16) >>> 0;
    if (/^\d+$/.test(text)) return Number.parseInt(text, 10) >>> 0;
    return null;
  }

  function isUnmodelledOpcode(opcode) {
    if (UNMODELLED_OPS.has(opcode)) return true;
    return UNMODELLED_PREFIXES.some((prefix) => opcode.startsWith(prefix));
  }

  function hashProgram(instructions) {
    let hash = 0x811c9dc5;
    const text = instructions.map((instruction) => `${instruction.addressHex}:${instruction.text}`).join("\n");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `fnv1a:${hash.toString(16).padStart(8, "0")}`;
  }

  function decodeInstruction(row = {}, index = 0) {
    const text = String(row.basic || row.source || row.statement || "").trim();
    const sourceText = String(row.source || row.statement || "").trim();
    const sourceLine = Number.isFinite(Number(row.line)) ? Number(row.line) : null;
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

    // The assembler keeps symbolic labels in the basic form, so the target is
    // captured as a token here and resolved against the label table later.
    let targetToken = "";
    if (kind === "branch") targetToken = String(operands[operands.length - 1] || "");
    else if (opcode === "j" || opcode === "jal" || opcode === "bal") targetToken = String(operands[0] || "");
    const targetAddress = targetToken ? parseAddressToken(targetToken) : null;

    const writeSet = uniqueRegisters(writes).filter((register) => register !== "$zero");
    // Control lines of the textbook single-issue datapath, derived from the
    // decoded form. They drive the architecture view; the model itself needs
    // only `kind`, so a wrong line here cannot change any timing result.
    const control = Object.freeze({
      RegWrite: writeSet.length > 0,
      MemRead: LOAD_OPS.has(opcode),
      MemWrite: STORE_OPS.has(opcode),
      MemToReg: LOAD_OPS.has(opcode),
      ALUSrc: LOAD_OPS.has(opcode) || STORE_OPS.has(opcode)
        || IMMEDIATE_ALU_OPS.has(opcode) || SHIFT_IMMEDIATE_OPS.has(opcode) || opcode === "lui",
      RegDst: REGISTER_ALU_OPS.has(opcode) || SHIFT_IMMEDIATE_OPS.has(opcode) || SHIFT_VARIABLE_OPS.has(opcode),
      Branch: kind === "branch",
      Jump: kind === "jump"
    });

    return Object.freeze({
      id: Number.isFinite(Number(row.index)) ? Number(row.index) : index,
      index,
      address: Number.isFinite(Number(row.address)) ? (Number(row.address) >>> 0) : ((index * 4) >>> 0),
      addressHex: String(row.addressHex || `0x${((index * 4) >>> 0).toString(16).padStart(8, "0")}`),
      text: text || "nop",
      // The assembled form drives the model; the source line is carried so the
      // Learn view can show what the student actually wrote next to it.
      source: sourceText,
      line: sourceLine,
      opcode,
      kind,
      reads: Object.freeze(uniqueRegisters(reads)),
      writes: Object.freeze(writeSet),
      operands: Object.freeze(operands.slice()),
      control,
      isLoad: LOAD_OPS.has(opcode),
      isControl: kind === "branch" || kind === "jump",
      usesMemory: LOAD_OPS.has(opcode) || STORE_OPS.has(opcode),
      mayTrap: TRAP_OPS.has(opcode),
      timingModelled: supported && !isUnmodelledOpcode(opcode),
      targetToken,
      targetAddress,
      targetIndex: null,
      supported
    });
  }

  // Producer of each register read, resolved against the closest preceding
  // writer. Feeds the "highlight dependencies" view without re-scanning.
  function annotateDependencies(instructions) {
    const lastWriter = new Map();
    return instructions.map((instruction) => {
      const dependencies = instruction.reads
        .map((register) => (lastWriter.has(register) ? { register, producerIndex: lastWriter.get(register) } : null))
        .filter(Boolean);
      instruction.writes.forEach((register) => lastWriter.set(register, instruction.index));
      return Object.freeze({ ...instruction, dependencies: Object.freeze(dependencies) });
    });
  }

  function cloneSlot(slot) {
    if (!slot) return null;
    if (slot.bubble) return { bubble: true, reason: String(slot.reason || "stall") };
    return slot;
  }

  function bubble(reason) {
    return { bubble: true, reason: String(reason) };
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
    const config = forwarding && typeof forwarding === "object" ? forwarding : { forwarding: forwarding === true };
    const consumer = stages.ID;
    if (!consumer || consumer.bubble || !consumer.reads.length) return null;
    if (config.forwarding) {
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

  // Forwarding paths that are live in the current cycle. The consumer is the
  // instruction in EX; producers sit in the EX/MEM and MEM/WB pipeline
  // registers, which the model represents as the MEM and WB stage occupants.
  function activeForwardingPaths(stages, forwarding) {
    const config = forwarding && typeof forwarding === "object" ? forwarding : { forwarding: forwarding === true };
    if (!config.forwarding) return [];
    const consumer = stages.EX;
    if (!consumer || consumer.bubble || !consumer.reads.length) return [];
    const paths = [];
    const claimed = new Set();
    // EX/MEM wins over MEM/WB for the same register: it holds the newer value.
    [["MEM", "EX/MEM"], ["WB", "MEM/WB"]].forEach(([stage, register]) => {
      const producer = stages[stage];
      if (!producer || producer.bubble) return;
      registersOverlap(consumer.reads, producer.writes).forEach((name) => {
        if (claimed.has(name)) return;
        claimed.add(name);
        paths.push({ from: stage, pipelineRegister: register, to: "EX", register: name, producerText: producer.text, consumerText: consumer.text });
      });
    });
    return paths;
  }

  function registerSortKey(name) {
    const rank = REGISTER_RANK.get(name);
    return rank === undefined ? REGISTER_ORDER.length : rank;
  }

  function sortRegisterNames(names) {
    return [...names].sort((left, right) => {
      const delta = registerSortKey(left) - registerSortKey(right);
      return delta !== 0 ? delta : left.localeCompare(right);
    });
  }

  // One recorded webMARS step, rewritten in the model's own terms.
  //
  // The runtime reports which registers an instruction changed; it does not
  // report what the instruction read. Walking the recording in order rebuilds
  // the architectural register file, so each entry can also carry the values
  // its source operands held at the moment it executed. A register whose value
  // was never established - because the recording started after it was last
  // written - stays `null` rather than being guessed at as zero.
  function bindExecutionTrace(records, program, addressToIndex, initialRegisters) {
    const values = new Map();
    if (initialRegisters instanceof Map) initialRegisters.forEach((value, name) => values.set(name, value | 0));
    else if (initialRegisters && typeof initialRegisters === "object") {
      Object.entries(initialRegisters).forEach(([name, value]) => {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) values.set(String(name), numeric | 0);
      });
    }

    const entries = [];
    let unmatched = 0;
    (Array.isArray(records) ? records : []).forEach((record) => {
      if (!record) return;
      const address = Number(record.address) >>> 0;
      const index = addressToIndex.has(address) ? addressToIndex.get(address) : null;
      if (index === null) {
        // Exception handlers and self-modified code execute outside the text
        // rows the model knows about. Counting them keeps the interface honest
        // about a recording it cannot fully replay.
        unmatched += 1;
        return;
      }
      const instruction = program[index];
      const writes = (Array.isArray(record.writes) ? record.writes : [])
        .map((write) => ({
          name: normalizeRegister(write?.name),
          before: Number(write?.before) | 0,
          after: Number(write?.after) | 0
        }))
        .filter((write) => write.name && write.name !== "$zero");
      const reads = {};
      instruction.reads.forEach((name) => {
        reads[name] = values.has(name) ? values.get(name) : null;
      });
      writes.forEach((write) => values.set(write.name, write.after));
      entries.push(Object.freeze({
        index,
        address,
        step: Number.isFinite(Number(record.step)) ? Number(record.step) : null,
        writes: Object.freeze(writes.map((write) => Object.freeze(write))),
        reads: Object.freeze(reads)
      }));
    });

    return Object.freeze({
      entries: Object.freeze(entries),
      unmatched,
      // The register file as it stood before the first recorded instruction, so
      // a reset can restore it exactly.
      initial: Object.freeze(Object.fromEntries(
        initialRegisters instanceof Map
          ? [...initialRegisters].map(([name, value]) => [name, value | 0])
          : Object.entries(initialRegisters || {}).map(([name, value]) => [name, Number(value) | 0])
      ))
    });
  }

  const EMPTY_EXECUTION = Object.freeze({ entries: Object.freeze([]), unmatched: 0, initial: Object.freeze({}) });

  function createEmptyStages() {
    return { IF: null, ID: null, EX: null, MEM: null, WB: null };
  }

  function createEmptyTimeline(length) {
    return Array.from({ length }, () => Object.freeze({}));
  }

  function createMetrics() {
    return {
      stalls: 0,
      dataStalls: 0,
      structuralStalls: 0,
      exceptionStalls: 0,
      bubbles: 0,
      flushes: 0,
      hazards: { raw: 0, "load-use": 0, structural: 0, control: 0 },
      branches: { total: 0, taken: 0, notTaken: 0, predicted: 0, mispredicted: 0, indirect: 0 }
    };
  }

  function cloneMetrics(metrics) {
    return {
      ...metrics,
      hazards: { ...metrics.hazards },
      branches: { ...metrics.branches }
    };
  }

  class PipelineSimulator {
    constructor(rows = [], options = {}) {
      this.config = normalizeConfig(options);
      // Retained for the pre-0.6 API surface; `config.forwarding` is the source of truth.
      this.forwarding = this.config.forwarding;
      // The instruction stream the fetch unit follows. Deliberately outside
      // `config`: it changes what is simulated, not which microarchitecture is
      // being simulated, so it must not turn a named profile into "custom".
      this.source = TRACE_SOURCES.includes(options.source) ? options.source : "static";
      this.executionRecords = [];
      this.initialRegisters = options.initialRegisters || null;
      this.execution = EMPTY_EXECUTION;
      this.loadProgram(rows, options.labels);
    }

    loadProgram(rows = [], labels = this.labels) {
      this.labels = normalizeLabels(labels);
      const decoded = (Array.isArray(rows) ? rows : []).map((row, index) => decodeInstruction(row, index));
      const addressToIndex = new Map();
      decoded.forEach((instruction, index) => {
        if (!addressToIndex.has(instruction.address)) addressToIndex.set(instruction.address, index);
      });
      const resolveTarget = (instruction) => {
        if (instruction.targetAddress !== null) return instruction.targetAddress;
        const token = instruction.targetToken;
        return token && this.labels.has(token) ? this.labels.get(token) : null;
      };
      const resolved = decoded.map((instruction) => {
        const address = resolveTarget(instruction);
        return Object.freeze({
          ...instruction,
          targetAddress: address,
          targetIndex: address !== null && addressToIndex.has(address) ? addressToIndex.get(address) : null
        });
      });
      this.program = annotateDependencies(resolved);
      this.programHash = hashProgram(this.program);
      this.unmodelled = this.program.filter((instruction) => !instruction.timingModelled);
      this.addressToIndex = addressToIndex;
      // Registers the program mentions at all. Showing only these keeps the
      // register view to the handful a lesson is about instead of 34 rows of
      // which 30 never move.
      const touched = new Set();
      this.program.forEach((instruction) => {
        instruction.reads.forEach((name) => touched.add(name));
        instruction.writes.forEach((name) => touched.add(name));
      });
      this.trackedRegisters = Object.freeze(sortRegisterNames(touched));
      this.bindExecution();
      this.reset();
      return this.snapshot();
    }

    // Re-binds the recorded run to the current program. Called whenever either
    // side changes, so an address that has moved never keeps a stale index.
    bindExecution() {
      this.execution = this.executionRecords.length
        ? bindExecutionTrace(this.executionRecords, this.program, this.addressToIndex || new Map(), this.initialRegisters)
        : EMPTY_EXECUTION;
    }

    // The recorded webMARS run. `records` are raw: address, step and the
    // register changes the runtime reported, in execution order.
    setExecutionTrace(records = [], options = {}) {
      this.executionRecords = Array.isArray(records) ? records : [];
      if (options.initialRegisters !== undefined) this.initialRegisters = options.initialRegisters;
      this.bindExecution();
      return this.reset();
    }

    clearExecutionTrace() {
      return this.setExecutionTrace([], { initialRegisters: null });
    }

    setSource(source) {
      const next = TRACE_SOURCES.includes(source) ? source : "static";
      if (next === this.source) return this.snapshot();
      this.source = next;
      return this.reset();
    }

    // Whether the fetch unit is reading the recording. An empty recording still
    // counts: the answer is "there is nothing to replay yet", not "fall back to
    // the assembled program". Silently replaying a different instruction stream
    // than the one selected would make every number on screen unattributable.
    followsExecution() {
      return this.source === "execution";
    }

    reset() {
      this.history = [];
      this.trace = [];
      this.nextUid = 0;
      // Only a replay has values. The static stream executes nothing, so
      // seeding it with the state the recording started from would put numbers
      // on screen that this stream makes no claim about.
      const registerValues = new Map();
      if (this.followsExecution()) {
        Object.entries(this.execution.initial).forEach(([name, value]) => registerValues.set(name, value | 0));
      }
      this.state = {
        cycle: 0,
        nextIndex: 0,
        stages: createEmptyStages(),
        memCyclesLeft: 0,
        completed: 0,
        stalls: 0,
        loopCounts: {},
        delayedRedirect: null,
        lastHazard: null,
        lastEvent: null,
        metrics: createMetrics(),
        branchTable: createBranchTable(this.config),
        events: [],
        timeline: createEmptyTimeline(this.program.length),
        traceCursor: 0,
        // Recorded instructions that have reached WB. The pipeline is in-order,
        // so this only ever grows, which makes it a usable seek coordinate for
        // "show me the cycle where webMARS step N finished".
        retired: 0,
        registerValues,
        registerMeta: new Map(),
        registerLog: []
      };
      return this.snapshot();
    }

    setConfig(options = {}) {
      const next = normalizeConfig({ ...this.config, ...options });
      if (sameConfig(next, this.config)) return this.snapshot();
      this.config = next;
      this.forwarding = next.forwarding;
      return this.reset();
    }

    setProfile(id) {
      const profile = findProfile(id);
      if (!profile) return this.snapshot();
      return this.setConfig(profile.config);
    }

    setForwarding(enabled) {
      return this.setConfig({ forwarding: enabled === true });
    }

    captureState() {
      return {
        cycle: this.state.cycle,
        nextIndex: this.state.nextIndex,
        stages: cloneStages(this.state.stages),
        memCyclesLeft: this.state.memCyclesLeft,
        completed: this.state.completed,
        stalls: this.state.stalls,
        loopCounts: { ...this.state.loopCounts },
        delayedRedirect: this.state.delayedRedirect,
        lastHazard: this.state.lastHazard ? { ...this.state.lastHazard } : null,
        lastEvent: this.state.lastEvent ? { ...this.state.lastEvent } : null,
        metrics: cloneMetrics(this.state.metrics),
        // Only the dynamic predictor reads or writes the table, so cloning it
        // under the static ones allocated a Map per cycle that nothing could
        // ever have changed. The reference is still carried so restoring is
        // uniform either way.
        branchTable: this.config.branchPrediction === "bht"
          ? cloneBranchTable(this.state.branchTable)
          : this.state.branchTable,
        eventCount: this.state.events.length,
        traceLength: this.trace.length,
        timelineChanges: [],
        traceCursor: this.state.traceCursor,
        retired: this.state.retired,
        // The register file is mutated in place and rewound from this list, the
        // same way the timeline is, so a long run does not pay for a full copy
        // of the file on every cycle.
        registerUndo: [],
        registerLogLength: this.state.registerLog.length
      };
    }

    isDone() {
      if (!this.program.length) return true;
      const drained = ["IF", "ID", "EX", "MEM"].every((stage) => !this.state.stages[stage]);
      // Following a recording, the run ends where the recording ends, even
      // though instructions further down the program were never reached.
      if (this.followsExecution()) return this.state.traceCursor >= this.execution.entries.length && drained;
      if (this.state.nextIndex < this.program.length) return false;
      return drained;
    }

    step() {
      return this.advance(true);
    }

    // Branch outcome assumed by the model. The functional runtime is not
    // consulted, so the assumption is declared in every exported report.
    // Fall-through index. With delay slots the instruction after a control
    // transfer always executes, so the sequential successor is two ahead.
    fallThrough(instruction) {
      return instruction.index + (this.config.delaySlot && instruction.isControl ? 2 : 1);
    }

    resolveOutcome(instruction, loopCounts) {
      const sequential = this.fallThrough(instruction);
      if (this.followsExecution()) {
        // A wrong-path instruction has no recorded outcome because it never
        // executed; it will be discarded by the branch ahead of it either way.
        if (typeof instruction.tracePos !== "number") {
          return { next: sequential, taken: false, indirect: false, unresolved: true };
        }
        const offset = this.config.delaySlot && instruction.isControl ? 2 : 1;
        const actual = this.execution.entries[instruction.tracePos + offset];
        // The recording stops where the runtime stopped. Nothing was executed
        // after this branch, so its direction is unknown rather than untaken.
        if (!actual) return { next: sequential, taken: false, indirect: false, unresolved: true };
        return {
          next: actual.index,
          taken: actual.index !== sequential,
          indirect: instruction.targetIndex === null,
          recorded: true
        };
      }
      if (instruction.kind === "jump") {
        if (instruction.targetIndex === null) return { next: sequential, taken: false, indirect: true };
        return { next: instruction.targetIndex, taken: true, indirect: false };
      }
      if (instruction.kind !== "branch") return { next: sequential, taken: false, indirect: false };
      if (instruction.targetIndex === null) return { next: sequential, taken: false, indirect: true };
      if (this.config.outcomeModel === "backward-taken" && instruction.targetIndex <= instruction.index) {
        const taken = (loopCounts[instruction.index] || 0) < this.config.loopIterations;
        return { next: taken ? instruction.targetIndex : sequential, taken, indirect: false, counted: true };
      }
      return { next: sequential, taken: false, indirect: false };
    }

    predictNext(instruction) {
      const sequential = this.fallThrough(instruction);
      if (instruction.kind === "jump") {
        return instruction.targetIndex === null ? sequential : instruction.targetIndex;
      }
      if (instruction.kind === "branch" && instruction.targetIndex !== null) {
        if (this.config.branchPrediction === "taken") return instruction.targetIndex;
        if (this.config.branchPrediction === "bht"
          && branchTablePredicts(this.state.branchTable, instruction.address)) {
          return instruction.targetIndex;
        }
      }
      return sequential;
    }

    advance(returnSnapshot) {
      if (this.isDone()) return returnSnapshot ? this.snapshot() : null;
      const historyEntry = this.captureState();
      this.history.push(historyEntry);

      const previous = this.state.stages;
      const config = this.config;
      const metrics = cloneMetrics(this.state.metrics);
      const loopCounts = { ...this.state.loopCounts };
      const branchTable = this.state.branchTable;
      const cycleKey = this.state.cycle;
      const nextCycle = this.state.cycle + 1;
      let nextIndex = this.state.nextIndex;
      let delayedRedirect = this.state.delayedRedirect;
      let memCyclesLeft = this.state.memCyclesLeft;
      let traceCursor = this.state.traceCursor;
      let event = null;
      let hazard = null;
      let nextStages;

      const memBusy = previous.MEM && !previous.MEM.bubble && memCyclesLeft > 1;
      if (memBusy) {
        // Structural hazard: the memory port is still occupied, so nothing
        // downstream of MEM can advance either.
        memCyclesLeft -= 1;
        metrics.stalls += 1;
        metrics.structuralStalls += 1;
        metrics.bubbles += 1;
        metrics.hazards.structural += 1;
        nextStages = {
          WB: bubble("structural"),
          MEM: cloneSlot(previous.MEM),
          EX: cloneSlot(previous.EX),
          ID: cloneSlot(previous.ID),
          IF: cloneSlot(previous.IF)
        };
        event = {
          cycle: nextCycle,
          type: "structural",
          reason: "memory-latency",
          instructionText: previous.MEM.text,
          registers: [],
          cycles: config.memoryLatency
        };
      } else {
        hazard = detectHazard(previous, config);

        // A control instruction resolves as it leaves the configured stage.
        const resolutionStage = config.branchResolution;
        const successorStage = resolutionStage === "ID" ? "EX" : "MEM";
        const resolver = previous[resolutionStage];
        const resolverAdvances = resolutionStage === "EX" ? true : !hazard;
        let flushStages = [];
        const resolverOutcome = resolver && !resolver.bubble && resolver.isControl && resolverAdvances
          ? this.resolveOutcome(resolver, loopCounts)
          : null;
        // An outcome the recording never witnessed is not a prediction result:
        // counting it either way would invent a statistic.
        if (resolverOutcome && !resolverOutcome.unresolved) {
          const outcome = resolverOutcome;
          if (outcome.counted && outcome.taken) {
            loopCounts[resolver.index] = (loopCounts[resolver.index] || 0) + 1;
          }
          metrics.branches.total += 1;
          if (outcome.taken) metrics.branches.taken += 1;
          else metrics.branches.notTaken += 1;
          if (outcome.indirect) metrics.branches.indirect += 1;
          // The table learns from the resolved outcome, exactly as the BHT
          // Simulator learns from an executed branch.
          if (config.branchPrediction === "bht" && resolver.kind === "branch" && resolver.targetIndex !== null) {
            updateBranchTable(branchTable, resolver.address, outcome.taken);
          }
          const predicted = typeof resolver.predictedNext === "number" ? resolver.predictedNext : this.predictNext(resolver);
          if (predicted === outcome.next) {
            metrics.branches.predicted += 1;
          } else {
            metrics.branches.mispredicted += 1;
            // Wrong-path instructions are those younger than the branch. A
            // delay slot is architecturally committed, so it survives.
            flushStages = (resolutionStage === "EX" ? ["ID", "IF"] : ["IF"]).slice(config.delaySlot ? 1 : 0);
            metrics.flushes += flushStages.length;
            metrics.bubbles += flushStages.length;
            metrics.hazards.control += 1;
            nextIndex = outcome.next;
            delayedRedirect = null;
            event = {
              cycle: nextCycle,
              type: "control",
              reason: "misprediction",
              instructionText: resolver.text,
              registers: [],
              cycles: flushStages.length
            };
          }
        }

        const serializing = config.serializeTraps
          && ["IF", "ID", "EX", "MEM"].some((stage) => previous[stage] && !previous[stage].bubble && previous[stage].mayTrap);

        let fetched = null;
        const following = this.followsExecution();
        // Following a recording, the stream ends where the recording ends. The
        // wrong-path instructions a misprediction fetches are still read from
        // the program itself: the hardware fetches them, then discards them.
        const streamHasMore = following
          ? traceCursor < this.execution.entries.length
          : nextIndex < this.program.length;
        if (!hazard && !serializing && streamHasMore
          && nextIndex < this.program.length && this.trace.length < MAX_TRACE_ROWS) {
          const instruction = this.program[nextIndex];
          let followUp = nextIndex + 1;
          if (delayedRedirect !== null) {
            followUp = delayedRedirect;
            delayedRedirect = null;
          } else if (instruction.isControl) {
            const predicted = this.predictNext(instruction);
            if (config.delaySlot) delayedRedirect = predicted;
            else followUp = predicted;
          }
          // The fetched instruction is the recorded one only when it sits where
          // the recording says the next executed instruction is. Anything else
          // is speculation, and carries no values because it never ran.
          const recorded = following ? this.execution.entries[traceCursor] : null;
          const onRecordedPath = Boolean(recorded && recorded.index === nextIndex);
          const tracePos = onRecordedPath ? traceCursor : null;
          if (onRecordedPath) traceCursor += 1;
          fetched = {
            ...instruction,
            uid: this.nextUid,
            predictedNext: this.predictNext(instruction),
            tracePos,
            traceStep: onRecordedPath ? recorded.step : null,
            traceWrites: onRecordedPath ? recorded.writes : null,
            traceReads: onRecordedPath ? recorded.reads : null,
            speculative: following && !onRecordedPath
          };
          this.nextUid += 1;
          this.trace.push({
            uid: fetched.uid,
            index: instruction.index,
            addressHex: instruction.addressHex,
            text: instruction.text,
            source: instruction.source,
            line: instruction.line,
            step: fetched.traceStep,
            stages: {}
          });
          nextIndex = followUp;
        }
        if (serializing && !hazard) {
          metrics.exceptionStalls += 1;
          metrics.bubbles += 1;
          if (!event) {
            const trapping = ["IF", "ID", "EX", "MEM"]
              .map((stage) => previous[stage])
              .find((slot) => slot && !slot.bubble && slot.mayTrap);
            event = {
              cycle: nextCycle,
              type: "exception",
              reason: "serialized-trap",
              instructionText: trapping ? trapping.text : "",
              registers: [],
              cycles: 1
            };
          }
        }

        if (hazard) {
          metrics.stalls += 1;
          metrics.dataStalls += 1;
          metrics.bubbles += 1;
          metrics.hazards[hazard.type] = (metrics.hazards[hazard.type] || 0) + 1;
          event = {
            cycle: nextCycle,
            type: "data",
            reason: hazard.type,
            instructionText: hazard.consumer.text,
            producerText: hazard.producer.text,
            registers: hazard.registers.slice(),
            cycles: 1
          };
        }

        nextStages = {
          WB: cloneSlot(previous.MEM),
          MEM: cloneSlot(previous.EX),
          EX: hazard ? bubble(hazard.type) : cloneSlot(previous.ID),
          ID: hazard ? cloneSlot(previous.ID) : cloneSlot(previous.IF),
          IF: hazard ? cloneSlot(previous.IF) : fetched
        };
        flushStages.forEach((stage) => {
          const target = stage === "ID" ? "EX" : "ID";
          if (nextStages[target] && !nextStages[target].bubble) {
            const flushed = this.traceRowFor(nextStages[target].uid);
            if (flushed) flushed.flushed = true;
          }
          nextStages[target] = bubble("control");
        });
        if (nextStages.MEM && !nextStages.MEM.bubble) {
          memCyclesLeft = nextStages.MEM.usesMemory ? config.memoryLatency : 1;
        } else {
          memCyclesLeft = 0;
        }

        // A recording can jump somewhere no branch in it predicts: a reset and
        // re-run, an exception handler outside the text rows, a jump into code
        // the model never saw. Once the pipeline has drained with instructions
        // still to replay, no in-flight branch is left to correct the fetch
        // address, so the fetch unit is snapped onto the recorded instruction.
        // Without this the replay stalls until the cycle budget runs out.
        if (following && traceCursor < this.execution.entries.length) {
          const empty = STAGES.every((stage) => !nextStages[stage] || nextStages[stage].bubble);
          const target = this.execution.entries[traceCursor].index;
          if (empty && nextIndex !== target) {
            nextIndex = target;
            delayedRedirect = null;
            if (!event) {
              event = {
                cycle: nextCycle,
                type: "control",
                reason: "resynchronised",
                instructionText: this.program[target].text,
                registers: [],
                cycles: 0
              };
            }
          }
        }
      }

      const timeline = this.state.timeline;
      const touched = [];
      STAGES.forEach((stage) => {
        const slot = nextStages[stage];
        if (!slot || slot.bubble) return;
        const label = stage === "ID" && hazard ? "ID*" : stage;
        const traceRow = this.traceRowFor(slot.uid);
        if (traceRow) {
          traceRow.stages[cycleKey] = label;
          touched.push(traceRow.uid);
        }
        if (!timeline[slot.index]) return;
        // Record which key to remove, not the whole row that preceded it.
        // Keeping the previous row made the history cost the size of the row on
        // every cycle, and a row grows by one key per cycle its instruction
        // occupies a stage -- quadratic in cycles. A replayed loop reaches that
        // easily: 2400 cycles of a four-instruction loop cost 62 MB before this,
        // and a few thousand more exhausted the heap outright.
        historyEntry.timelineChanges.push({ index: slot.index, cycle: cycleKey });
        timeline[slot.index] = Object.freeze({ ...timeline[slot.index], [cycleKey]: label });
      });
      historyEntry.touched = touched;

      // Writes reach the register file in WB, which is exactly why a consumer
      // in ID needs either a stall or a forwarding path to see them earlier.
      this.commitRegisters(nextStages.WB, nextCycle, historyEntry);

      const events = this.state.events;
      if (event) events.push(Object.freeze(event));

      this.state = {
        cycle: nextCycle,
        nextIndex,
        stages: nextStages,
        memCyclesLeft,
        traceCursor,
        retired: nextStages.WB && !nextStages.WB.bubble && typeof nextStages.WB.tracePos === "number"
          ? nextStages.WB.tracePos + 1
          : this.state.retired,
        completed: this.state.completed + (nextStages.WB && !nextStages.WB.bubble ? 1 : 0),
        stalls: metrics.stalls,
        loopCounts,
        delayedRedirect,
        lastHazard: hazard
          ? {
              type: hazard.type,
              registers: hazard.registers.slice(),
              producerId: hazard.producer.id,
              consumerId: hazard.consumer.id
            }
          : null,
        lastEvent: event,
        metrics,
        branchTable,
        events,
        timeline,
        registerValues: this.state.registerValues,
        registerMeta: this.state.registerMeta,
        registerLog: this.state.registerLog
      };
      return returnSnapshot ? this.snapshot() : null;
    }

    // Applies the register writes of the instruction entering WB. Only a
    // recorded run carries values, so in static mode this is a no-op and the
    // register view stays empty rather than showing invented numbers.
    commitRegisters(slot, cycle, historyEntry) {
      if (!slot || slot.bubble || !Array.isArray(slot.traceWrites) || !slot.traceWrites.length) return;
      const values = this.state.registerValues;
      const meta = this.state.registerMeta;
      const writes = [];
      slot.traceWrites.forEach((write) => {
        historyEntry.registerUndo.push({
          name: write.name,
          had: values.has(write.name),
          value: values.get(write.name) ?? 0,
          meta: meta.get(write.name) || null
        });
        values.set(write.name, write.after | 0);
        meta.set(write.name, { cycle, step: slot.traceStep, uid: slot.uid });
        writes.push({ name: write.name, before: write.before | 0, after: write.after | 0 });
      });
      this.state.registerLog.push(Object.freeze({
        cycle,
        step: slot.traceStep,
        uid: slot.uid,
        text: slot.text,
        writes: Object.freeze(writes)
      }));
      // Only the tail is kept, but trimming during a run would make backstep
      // unable to restore what it dropped, so the cap is applied on read.
      if (this.state.registerLog.length > MAX_REGISTER_LOG * 2) {
        const removed = this.state.registerLog.length - MAX_REGISTER_LOG;
        this.state.registerLog.splice(0, removed);
        // historyEntry is already in this.history -- advance() pushed it before
        // calling here -- so adjusting it separately would subtract twice and
        // make a later backstep truncate the log past what it should keep.
        this.history.forEach((entry) => { entry.registerLogLength = Math.max(0, entry.registerLogLength - removed); });
      }
    }

    back() {
      if (!this.history.length) return this.snapshot();
      const previous = this.history.pop();
      const timeline = this.state.timeline;
      for (let index = previous.timelineChanges.length - 1; index >= 0; index -= 1) {
        const change = previous.timelineChanges[index];
        // Rebuild the row without the key this cycle added. Rows stay frozen so
        // an untouched one is still shared between consecutive snapshots.
        const row = { ...timeline[change.index] };
        delete row[change.cycle];
        timeline[change.index] = Object.freeze(row);
      }
      this.trace.length = previous.traceLength;
      (previous.touched || []).forEach((uid) => {
        const row = this.traceRowFor(uid);
        if (row) {
          delete row.stages[previous.cycle];
          delete row.flushed;
        }
      });
      this.nextUid = this.trace.length ? this.trace[this.trace.length - 1].uid + 1 : 0;
      this.state.events.length = previous.eventCount;
      // Undo in reverse so two writes to the same register in one cycle restore
      // the value that preceded the first of them.
      const values = this.state.registerValues;
      const meta = this.state.registerMeta;
      for (let index = previous.registerUndo.length - 1; index >= 0; index -= 1) {
        const undo = previous.registerUndo[index];
        if (undo.had) values.set(undo.name, undo.value);
        else values.delete(undo.name);
        if (undo.meta) meta.set(undo.name, undo.meta);
        else meta.delete(undo.name);
      }
      this.state.registerLog.length = previous.registerLogLength;
      this.state = {
        cycle: previous.cycle,
        nextIndex: previous.nextIndex,
        stages: previous.stages,
        memCyclesLeft: previous.memCyclesLeft,
        completed: previous.completed,
        stalls: previous.stalls,
        loopCounts: previous.loopCounts,
        delayedRedirect: previous.delayedRedirect,
        lastHazard: previous.lastHazard,
        lastEvent: previous.lastEvent,
        metrics: previous.metrics,
        branchTable: previous.branchTable,
        events: this.state.events,
        timeline,
        traceCursor: previous.traceCursor,
        retired: previous.retired,
        registerValues: values,
        registerMeta: meta,
        registerLog: this.state.registerLog
      };
      return this.snapshot();
    }

    run(maxCycles = 1000) {
      const limit = Math.max(1, Math.min(1000000, Number(maxCycles) | 0));
      let count = 0;
      while (!this.isDone() && count < limit) {
        this.advance(false);
        count += 1;
      }
      return this.snapshot();
    }

    // Seeks to the cycle at which a monotone counter reaches `target`.
    //
    // A counter holds the same value for several cycles in a row -- nothing is
    // fetched during a stall, nothing retires during a bubble -- so "the cycle
    // where N instructions have been fetched" names a range, not a cycle.
    // Arriving from the left would stop at the first of that range and from the
    // right at the last, and pressing next-then-previous would settle one cycle
    // away from where it started. The first cycle of the range is chosen as
    // canonical: it is the one where the instruction visibly enters.
    seekCounter(read, target, maxCycles) {
      const limit = Math.max(1, Math.min(1000000, Number(maxCycles) | 0));
      let guard = 0;
      while (read.current() < target && !this.isDone() && guard < limit) {
        this.advance(false);
        guard += 1;
      }
      while (read.current() > target && this.history.length && guard < limit) {
        this.back();
        guard += 1;
      }
      // Rewind through the cycles that share the target value, so both
      // directions land on the same one.
      while (this.history.length && guard < limit
        && read.before(this.history[this.history.length - 1]) === target) {
        this.back();
        guard += 1;
      }
      return this.snapshot();
    }

    // Moves to the cycle in which exactly `count` recorded instructions have
    // been *fetched*.
    //
    // This is what following a stepping program has to use. Seeking to where
    // the newest instruction retires would empty every younger stage, because
    // a recording contains nothing after it to fetch -- the pipeline would
    // drain and refill on every step instead of flowing, and only WB would ever
    // hold anything. Seeking to where it is fetched puts it in IF with its
    // predecessors spread down the stages behind it, which is what a pipeline
    // looks like.
    seekFetched(count, maxCycles = 200000) {
      return this.seekCounter(
        { current: () => this.state.traceCursor, before: (entry) => entry.traceCursor },
        Math.max(0, Math.min(Number(count) | 0, this.execution.entries.length)),
        maxCycles
      );
    }

    // The same seek keyed on every instruction the fetch stage has taken in,
    // wrong-path ones included. A speculatively fetched instruction really was
    // fetched and really did cost a cycle, so it counts here. This is the
    // coordinate the static stream uses, where there is no recording to key on.
    seekFetchedInstructions(count, maxCycles = 200000) {
      return this.seekCounter(
        { current: () => this.trace.length, before: (entry) => entry.traceLength },
        Math.max(0, Number(count) | 0),
        maxCycles
      );
    }

    // Moves to the cycle in which exactly `count` recorded instructions have
    // written back. This is the coordinate at which the two register files
    // agree: every instruction webMARS executed up to step `count` has
    // committed here too, no more and no fewer.
    seekRetired(count, maxCycles = 200000) {
      return this.seekCounter(
        { current: () => this.state.retired, before: (entry) => entry.retired },
        Math.max(0, Math.min(Number(count) | 0, this.execution.entries.length)),
        maxCycles
      );
    }

    // uid is the position the row was pushed at, and backstep truncates the
    // array rather than removing from the middle, so the two never diverge. The
    // scan is kept only as a guard: replaying a recorded run fetches thousands
    // of instructions, and a linear lookup per stage per cycle is quadratic.
    traceRowFor(uid) {
      if (typeof uid !== "number") return null;
      const direct = this.trace[uid];
      if (direct && direct.uid === uid) return direct;
      return this.trace.find((entry) => entry.uid === uid) || null;
    }

    // Full instruction path (cycle -> stage) for the "follow one instruction" view.
    instructionTrace(uid) {
      const row = this.traceRowFor(uid);
      if (!row) return null;
      return {
        uid: row.uid,
        index: row.index,
        addressHex: row.addressHex,
        text: row.text,
        flushed: row.flushed === true,
        stages: Object.entries(row.stages)
          .map(([cycle, stage]) => ({ cycle: Number(cycle) + 1, stage }))
          .sort((left, right) => left.cycle - right.cycle)
      };
    }

    // The architectural register file as of the current cycle, plus the writes
    // that are computed but not yet committed. The gap between the two is the
    // whole reason forwarding exists, so both are reported side by side.
    registerView() {
      const values = this.state.registerValues;
      const meta = this.state.registerMeta;
      const stages = this.state.stages;
      const inFlight = new Map();
      // MEM is older than EX in an in-order pipeline. Apply the older pending
      // write first so a younger instruction in EX wins when both target the
      // same register.
      ["MEM", "EX"].forEach((stage) => {
        const slot = stages[stage];
        if (!slot || slot.bubble || !Array.isArray(slot.traceWrites)) return;
        slot.traceWrites.forEach((write) => inFlight.set(write.name, { stage, value: write.after | 0, text: slot.text }));
      });
      // Every architectural register is reported, each marked with whether this
      // program mentions it. Returning only the mentioned ones left the
      // interface unable to offer "all registers" at all: its widest filter
      // could never show more than its narrowest.
      const tracked = new Set(this.trackedRegisters);
      const names = new Set(REGISTER_ORDER);
      values.forEach((_value, name) => names.add(name));
      inFlight.forEach((_entry, name) => names.add(name));
      const cycle = this.state.cycle;
      return sortRegisterNames(names).map((name) => {
        const known = values.has(name);
        const record = meta.get(name) || null;
        const pending = inFlight.get(name) || null;
        return {
          name,
          used: tracked.has(name),
          known,
          value: known ? (values.get(name) | 0) : null,
          lastCycle: record ? record.cycle : null,
          lastStep: record ? record.step : null,
          changedThisCycle: Boolean(record && record.cycle === cycle),
          inFlight: pending ? { stage: pending.stage, value: pending.value, text: pending.text } : null
        };
      });
    }

    report() {
      const snapshot = this.snapshot();
      const profileId = configProfileId(this.config);
      const profile = findProfile(profileId);
      return {
        schema: REPORT_SCHEMA,
        model: { id: MODEL_ID, version: MODEL_VERSION },
        webMarsVersion: String(root.WebMarsAppVersion?.version || "unknown"),
        profile: { id: profileId, label: profile ? profile.label : "Custom configuration", version: profile ? profile.version : 0 },
        config: { ...this.config },
        // Which instruction stream produced this timeline. A report from a
        // recorded run is not comparable with one from the static assumption,
        // so the two are never distinguished by their numbers alone.
        source: this.followsExecution() ? "execution" : "static",
        execution: {
          recorded: this.execution.entries.length,
          replayed: this.state.traceCursor,
          outsideProgram: this.execution.unmatched
        },
        registers: {
          tracked: [...this.trackedRegisters],
          commits: this.state.registerLog.map((entry) => ({
            cycle: entry.cycle,
            step: entry.step,
            instruction: entry.text,
            writes: entry.writes.map((write) => ({ ...write }))
          }))
        },
        program: {
          hash: this.programHash,
          instructions: this.program.length,
          unmodelled: this.unmodelled.map((instruction) => instruction.text)
        },
        metrics: {
          cycles: snapshot.cycle,
          completed: snapshot.completed,
          cpi: snapshot.cpi,
          ...cloneMetrics(this.state.metrics)
        },
        timeline: this.trace.map((row) => ({
          uid: row.uid,
          index: row.index,
          address: row.addressHex,
          text: row.text,
          step: row.step ?? null,
          flushed: row.flushed === true,
          stages: Object.fromEntries(Object.entries(row.stages).map(([cycle, stage]) => [Number(cycle) + 1, stage]))
        })),
        events: this.state.events.map((entry) => ({ ...entry }))
      };
    }

    toJSON() {
      return this.report();
    }

    toCSV(section = "timeline") {
      const escape = (value) => {
        const text = String(value ?? "");
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      };
      const report = this.report();
      if (section === "registers") {
        // One row per committed write, so a spreadsheet can plot a register
        // against the cycle it changed in.
        const rows = [["cycle", "step", "instruction", "register", "before", "after", "after_hex"]];
        report.registers.commits.forEach((entry) => {
          entry.writes.forEach((write) => rows.push([
            entry.cycle,
            entry.step ?? "",
            entry.instruction,
            write.name,
            write.before,
            write.after,
            `0x${(write.after >>> 0).toString(16).padStart(8, "0")}`
          ]));
        });
        return rows.map((row) => row.map(escape).join(",")).join("\n");
      }
      if (section === "metrics") {
        const rows = [["metric", "value"]];
        rows.push(["webmars_version", report.webMarsVersion]);
        rows.push(["profile", report.profile.id]);
        rows.push(["profile_version", report.profile.version]);
        rows.push(["program_hash", report.program.hash]);
        rows.push(["source", report.source]);
        rows.push(["execution_recorded", report.execution.recorded]);
        rows.push(["execution_replayed", report.execution.replayed]);
        Object.entries(report.config).forEach(([key, value]) => rows.push([`config_${key}`, value]));
        Object.entries(report.metrics).forEach(([key, value]) => {
          if (value && typeof value === "object") {
            Object.entries(value).forEach(([inner, count]) => rows.push([`${key}_${inner}`, count]));
            return;
          }
          rows.push([key, value]);
        });
        return rows.map((row) => row.map(escape).join(",")).join("\n");
      }
      const cycles = report.metrics.cycles;
      const header = ["uid", "index", "address", "instruction", "flushed"];
      for (let cycle = 1; cycle <= cycles; cycle += 1) header.push(`C${cycle}`);
      const rows = [header];
      report.timeline.forEach((row) => {
        const line = [row.uid, row.index, row.address, row.text, row.flushed ? "yes" : "no"];
        for (let cycle = 1; cycle <= cycles; cycle += 1) line.push(row.stages[cycle] || "");
        rows.push(line);
      });
      return rows.map((row) => row.map(escape).join(",")).join("\n");
    }

    snapshot() {
      const stages = cloneStages(this.state.stages);
      const completed = this.state.completed;
      return {
        cycle: this.state.cycle,
        forwarding: this.config.forwarding,
        config: { ...this.config },
        stages,
        completed,
        stalls: this.state.stalls,
        cpi: completed > 0 ? this.state.cycle / completed : 0,
        metrics: cloneMetrics(this.state.metrics),
        lastHazard: this.state.lastHazard ? { ...this.state.lastHazard } : null,
        lastEvent: this.state.lastEvent ? { ...this.state.lastEvent } : null,
        activeForwarding: activeForwardingPaths(stages, this.config),
        branchTable: this.config.branchPrediction === "bht"
          ? {
              entries: this.state.branchTable.entries,
              historySize: this.state.branchTable.historySize,
              rows: [...this.state.branchTable.rows]
                .map(([index, row]) => ({ index, prediction: row.prediction, history: [...row.history] }))
                .sort((left, right) => left.index - right.index)
            }
          : null,
        events: this.state.events.slice(),
        timeline: Object.freeze(this.state.timeline.slice()),
        trace: this.trace,
        program: this.program.slice(),
        programHash: this.programHash,
        unmodelled: this.unmodelled.slice(),
        nextIndex: this.state.nextIndex,
        source: this.source,
        followingExecution: this.followsExecution(),
        execution: {
          recorded: this.execution.entries.length,
          replayed: this.state.traceCursor,
          retired: this.state.retired,
          outsideProgram: this.execution.unmatched,
          firstStep: this.execution.entries.length ? this.execution.entries[0].step : null,
          lastStep: this.execution.entries.length ? this.execution.entries[this.execution.entries.length - 1].step : null,
          // The webMARS step whose result has just landed in the register file.
          retiredStep: this.state.retired > 0 && this.execution.entries[this.state.retired - 1]
            ? this.execution.entries[this.state.retired - 1].step
            : null
        },
        registers: this.registerView(),
        registerLog: this.state.registerLog.slice(-MAX_REGISTER_LOG),
        canBack: this.history.length > 0,
        done: this.isDone()
      };
    }
  }

  // Side-by-side evaluation of the same program under several profiles.
  function compareConfigurations(rows, configs = PROFILES.map((profile) => profile.config), maxCycles, labels = null) {
    return configs.map((entry) => {
      const config = normalizeConfig(entry);
      const simulator = new PipelineSimulator(rows, { ...config, labels });
      const limit = Number.isFinite(Number(maxCycles))
        ? Number(maxCycles)
        : Math.max(100, simulator.program.length * 8 + 32);
      const snapshot = simulator.run(limit);
      const profileId = configProfileId(config);
      const profile = findProfile(profileId);
      return {
        profile: profileId,
        label: profile ? profile.label : "Custom configuration",
        version: profile ? profile.version : 0,
        config,
        cycles: snapshot.cycle,
        completed: snapshot.completed,
        cpi: snapshot.cpi,
        stalls: snapshot.metrics.stalls,
        flushes: snapshot.metrics.flushes,
        mispredicted: snapshot.metrics.branches.mispredicted
      };
    });
  }

  const coreApi = Object.freeze({
    MODEL_ID,
    MODEL_VERSION,
    REPORT_SCHEMA,
    STAGES,
    PROFILES,
    DEFAULT_CONFIG,
    TRACE_SOURCES,
    REGISTER_ORDER,
    bindExecutionTrace,
    normalizeConfig,
    tokenizeInstruction,
    decodeInstruction,
    detectHazard,
    activeForwardingPaths,
    hashProgram,
    BHT_ENTRY_CHOICES,
    BHT_HISTORY_CHOICES,
    createBranchTable,
    branchTableIndex,
    branchTablePredicts,
    updateBranchTable,
    compareConfigurations,
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
      /* Sizing is driven by the tool's own window, not the viewport: a narrow
         floating window on a wide desktop needs the same layout as a phone.
         data-plab-width is set from the shell's resize callback. */
      .pipeline-lab-tool { height:100%; min-height:0; box-sizing:border-box; padding:8px; display:flex; flex-direction:column; gap:8px; color:var(--text); font:12px "Segoe UI",Tahoma,sans-serif; }
      .pipeline-lab-bar { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .pipeline-lab-bar label { display:flex; align-items:center; gap:5px; font-weight:600; }
      .pipeline-lab-bar select,.pipeline-lab-bar input[type="number"] { min-height:28px; max-width:100%; border:1px solid var(--line); background:var(--surface); color:var(--text); }
      .pipeline-lab-bar input[type="number"] { width:6em; padding:2px 4px; }
      .pipeline-lab-spacer { flex:1 1 auto; min-width:0; }
      /* The two clocks side by side. Naming both is the point: a pipeline cycle
         is not a webMARS step, and the tool never lets them be confused. */
      .pipeline-lab-clock { display:flex; align-items:center; gap:8px; padding:2px 8px; border:1px solid var(--line); background:var(--surface-raised); font:11px Consolas,monospace; white-space:nowrap; }
      .pipeline-lab-clock b { color:var(--accent-strong); font-size:13px; }
      .pipeline-lab-toggle[aria-expanded="true"] { border-color:var(--accent-strong); font-weight:700; }
      /* Collapsible groups. Hiding them is what lets the tool fit a phone
         without pushing the timeline off the screen. */
      .pipeline-lab-panel { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:6px 8px; border:1px solid var(--line); background:var(--surface-raised); }
      .pipeline-lab-panel[hidden] { display:none; }
      .pipeline-lab-panel label { display:flex; align-items:center; gap:5px; font-weight:600; }
      .pipeline-lab-panel select,.pipeline-lab-panel input[type="number"] { min-height:28px; max-width:100%; border:1px solid var(--line); background:var(--surface); color:var(--text); }
      .pipeline-lab-panel input[type="number"] { width:6em; padding:2px 4px; }
      .pipeline-lab-status { margin:0; min-height:18px; color:var(--text-muted); }
      /* In the rail the metrics are a compact ledger rather than a row of
         tiles: vertical space there belongs to the pipeline. */
      .pipeline-lab-metrics { display:grid; grid-template-columns:minmax(0,1fr); flex:0 0 auto; border:1px solid var(--line); background:var(--surface-raised); }
      .pipeline-lab-metric { display:flex; align-items:baseline; justify-content:space-between; gap:8px; min-width:0; padding:3px 7px; }
      .pipeline-lab-metric + .pipeline-lab-metric { border-top:1px solid var(--line); }
      .pipeline-lab-metric span { min-width:0; overflow-wrap:anywhere; }
      .pipeline-lab-metric strong { font-size:14px; color:var(--accent-strong); white-space:nowrap; }
      .pipeline-lab-metric[data-plab-scope="runtime"] strong { color:var(--text); }
      /* Two columns: the pipeline itself stays put on the left while the right
         column switches between the timeline, the registers and the datapath.
         The state of the machine is the one thing that should never disappear
         because the reader changed what they are looking at. */
      .pipeline-lab-body { display:grid; grid-template-columns:minmax(240px,300px) minmax(0,1fr); gap:8px; flex:1 1 auto; min-height:0; }
      /* When the rail runs out of room the pipeline scrolls inside itself and
         the metric ledger stays put. Clipping the ledger instead would hide
         the cycle count, which is the number every other reading depends on. */
      .pipeline-lab-rail { display:flex; flex-direction:column; gap:6px; min-width:0; min-height:0; overflow:hidden; }
      .pipeline-lab-rail-title { margin:0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); }
      .pipeline-lab-main { display:flex; flex-direction:column; gap:8px; min-width:0; min-height:0; }
      /* The pipeline runs downwards: IF at the top, WB at the bottom, with the
         register that separates each pair of stages drawn between them. A row
         is as wide as the panel, so a stage can show the instruction, its
         source line and the values it used instead of a truncated opcode. */
      .pipeline-lab-flow { display:flex; flex-direction:column; flex:1 1 auto; min-height:0; overflow:auto; border:1px solid var(--line); background:var(--surface-raised); }
      .pipeline-lab-stage { display:grid; grid-template-columns:44px minmax(0,1fr); min-width:0; }
      .pipeline-lab-stage h3 { display:flex; align-items:center; justify-content:center; margin:0; padding:4px; background:var(--table-head); font-size:12px; }
      .pipeline-lab-stage pre { min-height:28px; margin:0; padding:4px 7px; white-space:pre-wrap; overflow-wrap:anywhere; font:11px/1.3 Consolas,monospace; }
      .pipeline-lab-stage[data-occupied="false"] pre { color:var(--text-faint); }
      .pipeline-lab-stage[data-occupied="bubble"] pre { color:var(--text-muted); font-style:italic; }
      /* The pipeline register between two stages. Dashed when it is carrying a
         bubble, which is the same convention the datapath drawing uses. */
      .pipeline-lab-preg { display:flex; align-items:center; gap:6px; padding:1px 7px; border-block:1px solid var(--line); background:var(--surface); color:var(--text-muted); font:10px/1.4 Consolas,monospace; }
      .pipeline-lab-preg b { color:var(--text); font-weight:700; }
      .pipeline-lab-preg em { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-style:normal; }
      .pipeline-lab-preg[data-active="true"] { color:var(--text); }
      .pipeline-lab-preg[data-active="true"] span { color:var(--accent-strong); }
      .pipeline-lab-preg[data-bubble="true"] { border-block-style:dashed; }
      /* Stage colours are tokens so the palette can be swapped wholesale. The
         default is the familiar MARS-like sequence; "colour-vision safe" is the
         Okabe-Ito qualitative palette, which stays distinguishable under
         protanopia, deuteranopia and tritanopia. Colour is never the only
         channel either way: every cell also carries the stage name as text. */
      .pipeline-lab-tool {
        --plab-if:#8bc34a; --plab-id:#29b6f6; --plab-ex:#ff9800;
        --plab-mem:#ef5350; --plab-wb:#ab47bc;
        /* A tint over white washes out at the same ratio that reads as garish
           over near-black, so each theme mixes its own amount. */
        --plab-tint:26%;
      }
      :root[data-theme="dark"] .pipeline-lab-tool { --plab-tint:38%; }
      .pipeline-lab-tool[data-palette="safe"] {
        --plab-if:#009e73; --plab-id:#56b4e9; --plab-ex:#e69f00;
        --plab-mem:#d55e00; --plab-wb:#cc79a7;
      }
      .pipeline-lab-stage[data-stage="IF"] h3 { border-inline-start:4px solid var(--plab-if); }
      .pipeline-lab-stage[data-stage="ID"] h3 { border-inline-start:4px solid var(--plab-id); }
      .pipeline-lab-stage[data-stage="EX"] h3 { border-inline-start:4px solid var(--plab-ex); }
      .pipeline-lab-stage[data-stage="MEM"] h3 { border-inline-start:4px solid var(--plab-mem); }
      .pipeline-lab-stage[data-stage="WB"] h3 { border-inline-start:4px solid var(--plab-wb); }
      /* The occupied stage is tinted with its own colour, so the instruction
         travelling down the pipeline is followable at a glance. The stage name
         is always present as text, so colour never carries it alone. */
      .pipeline-lab-stage[data-occupied="true"][data-stage="IF"] pre { background:color-mix(in srgb,var(--plab-if) var(--plab-tint),var(--surface-raised)); }
      .pipeline-lab-stage[data-occupied="true"][data-stage="ID"] pre { background:color-mix(in srgb,var(--plab-id) var(--plab-tint),var(--surface-raised)); }
      .pipeline-lab-stage[data-occupied="true"][data-stage="EX"] pre { background:color-mix(in srgb,var(--plab-ex) var(--plab-tint),var(--surface-raised)); }
      .pipeline-lab-stage[data-occupied="true"][data-stage="MEM"] pre { background:color-mix(in srgb,var(--plab-mem) var(--plab-tint),var(--surface-raised)); }
      .pipeline-lab-stage[data-occupied="true"][data-stage="WB"] pre { background:color-mix(in srgb,var(--plab-wb) var(--plab-tint),var(--surface-raised)); }
      .pipeline-lab-stage[data-selected="true"] pre { outline:2px solid var(--accent-strong); outline-offset:-2px; }
      .pipeline-lab-timeline-wrap { min-height:120px; flex:1 1 auto; overflow:auto; border:1px solid var(--line); background:var(--surface); }
      .pipeline-lab-timeline { border-collapse:collapse; min-width:100%; width:max-content; font:11px Consolas,monospace; }
      .pipeline-lab-timeline caption { position:sticky; inset-inline-start:0; padding:5px 7px; border-bottom:1px solid var(--line); background:var(--surface-raised); color:var(--text-muted); text-align:start; font-family:"Segoe UI",Tahoma,sans-serif; }
      .pipeline-lab-timeline th,.pipeline-lab-timeline td { border:1px solid var(--line); padding:4px 6px; text-align:center; min-width:38px; }
      /* The instruction column is sticky, so it must clip rather than spill:
         overflowing text would be painted across the cycle grid it is pinned
         in front of. The full text stays available as the row's tooltip. */
      .pipeline-lab-timeline th:first-child,.pipeline-lab-timeline td:first-child { position:sticky; inset-inline-start:0; z-index:2; min-width:260px; max-width:360px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:start; background:var(--surface-raised); }
      .pipeline-lab-timeline thead th { position:sticky; top:0; z-index:3; background:var(--table-head); }
      .pipeline-lab-timeline tbody tr { cursor:pointer; }
      .pipeline-lab-timeline tr[data-selected="true"] td:first-child { outline:2px solid var(--accent-strong); outline-offset:-2px; font-weight:700; }
      .pipeline-lab-timeline tr[data-dependency="true"] td:first-child { border-left:4px solid var(--accent-strong); }
      .pipeline-lab-timeline tr[data-flushed="true"] td:first-child { text-decoration:line-through; color:var(--text-muted); }
      .pipeline-lab-timeline td[data-value="IF"] { background:color-mix(in srgb,var(--plab-if) var(--plab-tint),var(--surface)); }
      .pipeline-lab-timeline td[data-value="ID"],.pipeline-lab-timeline td[data-value="ID*"] { background:color-mix(in srgb,var(--plab-id) var(--plab-tint),var(--surface)); }
      .pipeline-lab-timeline td[data-value="ID*"] { color:var(--error); font-weight:700; }
      .pipeline-lab-timeline td[data-value="EX"] { background:color-mix(in srgb,var(--plab-ex) var(--plab-tint),var(--surface)); }
      .pipeline-lab-timeline td[data-value="MEM"] { background:color-mix(in srgb,var(--plab-mem) var(--plab-tint),var(--surface)); }
      .pipeline-lab-timeline td[data-value="WB"] { background:color-mix(in srgb,var(--plab-wb) var(--plab-tint),var(--surface)); }
      .pipeline-lab-note { margin:0; padding:6px 8px; border:1px solid var(--line); background:var(--surface-raised); color:var(--text-muted); }
      .pipeline-lab-model { border:1px solid var(--line); background:var(--surface-raised); color:var(--text-muted); }
      .pipeline-lab-model summary { padding:5px 8px; cursor:pointer; font-weight:600; color:var(--text); }
      .pipeline-lab-model p { margin:0; padding:0 8px 8px; }
      .pipeline-lab-views { display:flex; gap:4px; flex-wrap:wrap; }
      .pipeline-lab-views button[aria-selected="true"] { border-bottom:3px solid var(--accent-strong); font-weight:700; }
      .pipeline-lab-view[hidden] { display:none; }
      .pipeline-lab-view { display:flex; flex-direction:column; gap:8px; flex:1 1 auto; min-height:0; }
      .pipeline-lab-signal-groups { display:flex; flex-wrap:wrap; gap:10px; }
      .pipeline-lab-signal-groups label { display:flex; align-items:center; gap:4px; font-weight:600; }
      .pipeline-lab-datapath-wrap { flex:1 1 auto; min-height:200px; overflow:auto; border:1px solid var(--line); background:var(--surface); }
      .pipeline-lab-datapath { display:block; min-width:1040px; width:100%; height:auto; direction:ltr; font-family:"Segoe UI",Tahoma,sans-serif; }
      .pipeline-lab-datapath .plab-arch-block rect { fill:var(--surface-raised); stroke:var(--line); stroke-width:1.5; }
      .pipeline-lab-datapath .plab-arch-block[data-active="true"] rect { stroke:var(--accent-strong); stroke-width:3; }
      .pipeline-lab-datapath .plab-arch-title { fill:var(--text); font-size:10px; text-anchor:middle; }
      .pipeline-lab-datapath .plab-arch-stage-name { fill:var(--accent-strong); font-size:13px; font-weight:700; }
      .pipeline-lab-datapath .plab-arch-occupant { fill:var(--text-muted); font-size:10px; }
      .pipeline-lab-datapath .plab-arch-preg rect { fill:var(--table-head); stroke:var(--line); stroke-width:1.5; }
      .pipeline-lab-datapath .plab-arch-preg[data-active="true"] rect { stroke:var(--accent-strong); stroke-width:3; }
      .pipeline-lab-datapath .plab-arch-preg[data-bubble="true"] rect { stroke-dasharray:4 3; }
      .pipeline-lab-datapath .plab-arch-preg-name { fill:var(--text); font-size:10px; font-weight:700; text-anchor:middle; }
      .pipeline-lab-datapath .plab-arch-preg-value { fill:var(--text); font-size:9px; text-anchor:middle; writing-mode:vertical-rl; }
      .pipeline-lab-datapath .plab-arch-wires polyline,.pipeline-lab-datapath .plab-arch-group polyline { fill:none; stroke:var(--line); stroke-width:1.5; }
      .pipeline-lab-datapath polyline[data-active="true"] { stroke:var(--accent-strong); stroke-width:3.5; stroke-dasharray:none; }
      .pipeline-lab-datapath [data-arch="fwd-path"] { stroke-dasharray:5 4; }
      .pipeline-lab-datapath .plab-arch-signal { fill:var(--text-muted); font-size:10px; font-family:Consolas,monospace; }
      .pipeline-lab-datapath .plab-arch-signal[data-active="true"] { fill:var(--accent-strong); font-weight:700; }
      .pipeline-lab-datapath .plab-arch-note { fill:var(--text-muted); font-size:9px; text-anchor:middle; }
      .pipeline-lab-datapath .plab-arch-group[hidden] { display:none; }
      @media (prefers-reduced-motion: no-preference) {
        .pipeline-lab-datapath polyline,.pipeline-lab-datapath rect { transition:stroke 120ms linear,stroke-width 120ms linear; }
      }
      /* Register views. The value table answers "what is in the file now"; the
         history table answers "what did it look like three cycles ago", which
         is the question a stall makes a student ask. */
      .pipeline-lab-registers { display:flex; flex-direction:column; gap:8px; flex:1 1 auto; min-height:0; }
      .pipeline-lab-register-wrap { min-height:80px; flex:1 1 auto; overflow:auto; border:1px solid var(--line); background:var(--surface); }
      .pipeline-lab-register-wrap table { border-collapse:collapse; min-width:100%; width:max-content; font:11px Consolas,monospace; }
      .pipeline-lab-register-wrap caption { position:sticky; inset-inline-start:0; padding:5px 7px; border-bottom:1px solid var(--line); background:var(--surface-raised); color:var(--text-muted); text-align:start; font-family:"Segoe UI",Tahoma,sans-serif; }
      .pipeline-lab-register-wrap th,.pipeline-lab-register-wrap td { border:1px solid var(--line); padding:3px 6px; text-align:end; white-space:nowrap; }
      .pipeline-lab-register-wrap th:first-child,.pipeline-lab-register-wrap td:first-child { position:sticky; inset-inline-start:0; z-index:2; min-width:64px; text-align:start; background:var(--surface-raised); }
      .pipeline-lab-register-wrap thead th { position:sticky; top:0; z-index:3; background:var(--table-head); }
      .pipeline-lab-register-wrap tr[data-changed="true"] td { background:color-mix(in srgb,var(--plab-wb) var(--plab-tint),var(--surface)); font-weight:700; }
      .pipeline-lab-register-wrap tr[data-inflight="true"] td:first-child { border-left:4px solid var(--plab-ex); }
      .pipeline-lab-register-wrap td[data-state="pending"] { color:var(--text-muted); font-style:italic; }
      .pipeline-lab-register-wrap td[data-state="unknown"] { color:var(--text-faint); }
      .pipeline-lab-register-wrap td[data-write="true"] { background:color-mix(in srgb,var(--plab-wb) var(--plab-tint),var(--surface)); font-weight:700; }
      .pipeline-lab-compare { max-height:150px; overflow:auto; border:1px solid var(--line); background:var(--surface); }
      .pipeline-lab-compare[hidden] { display:none; }
      .pipeline-lab-compare table { border-collapse:collapse; width:100%; font:11px Consolas,monospace; }
      .pipeline-lab-compare th,.pipeline-lab-compare td { border:1px solid var(--line); padding:3px 6px; text-align:end; }
      .pipeline-lab-compare th:first-child,.pipeline-lab-compare td:first-child { text-align:start; }
      .pipeline-lab-compare thead th { position:sticky; top:0; background:var(--table-head); }
      .pipeline-lab-compare tr[data-active="true"] { font-weight:700; color:var(--accent-strong); }
      /* Medium: the two columns still fit, but the rail gives up the width it
         was lending to the instruction column of the timeline. */
      .pipeline-lab-tool[data-plab-width="medium"] { padding:6px; gap:6px; }
      .pipeline-lab-tool[data-plab-width="medium"] .pipeline-lab-body { grid-template-columns:minmax(200px,232px) minmax(0,1fr); }
      .pipeline-lab-tool[data-plab-width="medium"] .pipeline-lab-timeline th:first-child,
      .pipeline-lab-tool[data-plab-width="medium"] .pipeline-lab-timeline td:first-child { min-width:200px; max-width:240px; }
      /* Narrow: one column. The pipeline keeps its place above the views, and
         every control group folds away behind its own button. */
      .pipeline-lab-tool[data-plab-width="narrow"] { padding:6px; gap:6px; }
      /* One column that scrolls as a whole, the way a phone panel is read.
         Every child sizes to its content and keeps its own scroll box, so
         nothing is squeezed into overflowing over what follows it. */
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-body { grid-template-columns:minmax(0,1fr); grid-template-rows:auto auto; overflow:auto; }
      /* min-height:auto matters here: with the 0 the wide layout needs, the
         grid is free to shrink this row below its content and the pipeline
         spills over the view below it instead of scrolling the panel. */
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-rail { overflow:visible; flex:0 0 auto; min-height:auto; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-flow { overflow:visible; flex:0 0 auto; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-main { min-height:auto; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-view { flex:0 0 auto; min-height:auto; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-timeline-wrap,
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-register-wrap,
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-datapath-wrap { flex:0 0 auto; max-height:60vh; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-metric { padding:3px 6px; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-panel { flex-direction:column; align-items:stretch; gap:6px; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-panel label { justify-content:space-between; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-panel select { flex:1 1 auto; min-width:0; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-timeline th:first-child,
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-timeline td:first-child { min-width:148px; max-width:180px; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-datapath-wrap { min-height:180px; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-timeline-wrap { min-height:200px; }
      .pipeline-lab-tool[data-plab-width="narrow"] .pipeline-lab-registers { flex:0 0 auto; }
      /* Mobile panels scroll the whole tool, so an inner flex child that grows
         forever would leave the timeline with no room at all. */
      .desktop-stacked .pipeline-lab-timeline-wrap { max-height:52vh; }
      .desktop-stacked .pipeline-lab-register-wrap { max-height:40vh; }
      .desktop-stacked .pipeline-lab-datapath-wrap { max-height:56vh; }
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

  function downloadText(filename, text, mimeType) {
    try {
      const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Schematic five-stage datapath. Geometry is static; every element that
  // changes per cycle carries a `data-arch` hook so rendering only rewrites
  // text and `data-active`, never the structure.
  const PIPELINE_REGISTERS = Object.freeze([
    { id: "IF/ID", x: 168, stage: "ID" },
    { id: "ID/EX", x: 372, stage: "EX" },
    { id: "EX/MEM", x: 622, stage: "MEM" },
    { id: "MEM/WB", x: 822, stage: "WB" }
  ]);
  const CONTROL_LINES = Object.freeze(["RegWrite", "MemRead", "MemWrite", "MemToReg", "ALUSrc", "RegDst", "Branch"]);

  function buildDatapathMarkup() {
    const box = (x, y, w, h, label, hook, extra = "") =>
      `<g class="plab-arch-block"${hook ? ` data-arch="${hook}"` : ""}${extra}>
         <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"></rect>
         <text x="${x + w / 2}" y="${y + 15}" class="plab-arch-title">${label}</text>
       </g>`;
    const registers = PIPELINE_REGISTERS.map((entry) => `
      <g class="plab-arch-preg" data-arch="preg" data-preg="${entry.id}">
        <rect x="${entry.x}" y="36" width="22" height="300" rx="2"></rect>
        <text x="${entry.x + 11}" y="30" class="plab-arch-preg-name">${entry.id}</text>
        <text x="${entry.x + 11}" y="186" class="plab-arch-preg-value" data-arch="preg-value" data-preg="${entry.id}"></text>
      </g>`).join("");

    return `
      <svg class="pipeline-lab-datapath" viewBox="0 0 1040 400" role="img" data-plab="datapath"
           aria-label="Five-stage MIPS datapath">
        <g class="plab-arch-lane">
          ${[["IF", 10], ["ID", 200], ["EX", 400], ["MEM", 650], ["WB", 850]].map(([stage, x]) => `
            <text x="${x}" y="18" class="plab-arch-stage-name" data-arch="lane" data-stage="${stage}">${stage}</text>
            <text x="${x}" y="356" class="plab-arch-occupant" data-arch="occupant" data-stage="${stage}"></text>`).join("")}
        </g>
        ${registers}
        <g class="plab-arch-wires" data-arch="wires">
          <polyline points="60,170 74,170"></polyline>
          <polyline points="144,170 168,170"></polyline>
          <polyline points="190,170 210,150"></polyline>
          <polyline points="190,170 210,255"></polyline>
          <polyline points="190,170 210,72"></polyline>
          <polyline points="300,150 372,150"></polyline>
          <polyline points="300,255 372,235"></polyline>
          <polyline points="300,72 372,60"></polyline>
          <polyline points="394,150 424,140"></polyline>
          <polyline points="394,235 424,210"></polyline>
          <polyline points="446,140 470,150"></polyline>
          <polyline points="446,210 470,190"></polyline>
          <polyline points="550,170 622,170"></polyline>
          <polyline points="644,170 664,170"></polyline>
          <polyline points="764,170 822,170"></polyline>
          <polyline points="844,170 866,170"></polyline>
          <polyline points="888,170 906,170"></polyline>
          <polyline points="950,196 950,300 255,300 255,240" data-arch="writeback"></polyline>
        </g>
        <g class="plab-arch-group" data-group="forwarding" data-arch="forwarding-group">
          <polyline data-arch="fwd-path" data-from="MEM" points="644,196 600,290 452,290 452,224"></polyline>
          <polyline data-arch="fwd-path" data-from="WB" points="844,206 830,320 440,320 440,154"></polyline>
          ${box(400, 336, 150, 40, "Forwarding unit", "forwarding-unit")}
          <text x="475" y="368" class="plab-arch-note" data-arch="forwarding-text"></text>
        </g>
        <g class="plab-arch-group" data-group="hazard">
          ${box(200, 300, 150, 40, "Hazard detection unit", "hazard-unit")}
          <text x="275" y="332" class="plab-arch-note" data-arch="hazard-text"></text>
        </g>
        ${box(14, 150, 46, 40, "PC", "pc")}
        ${box(74, 130, 70, 80, "Instruction memory", "imem")}
        ${box(210, 120, 90, 60, "Register file", "regfile")}
        ${box(210, 235, 90, 40, "Sign extend", "sign-extend")}
        ${box(210, 50, 90, 44, "Control unit", "control-unit")}
        ${box(470, 120, 80, 100, "ALU", "alu")}
        ${box(424, 130, 22, 40, "", "mux-a", ' data-mux="A"')}
        ${box(424, 190, 22, 40, "", "mux-b", ' data-mux="B"')}
        ${box(664, 130, 100, 80, "Data memory", "dmem")}
        ${box(866, 150, 22, 46, "", "mux-wb", ' data-mux="WB"')}
        ${box(906, 150, 90, 46, "Write back", "writeback-block")}
        <g class="plab-arch-group" data-group="control" data-arch="control-group">
          ${CONTROL_LINES.map((line, index) => `
            <text x="${404 + (index % 4) * 100}" y="${44 + Math.floor(index / 4) * 16}"
                  class="plab-arch-signal" data-arch="signal" data-signal="${line}">${line}=0</text>`).join("")}
        </g>
        <g class="plab-arch-group" data-group="values">
          <text x="475" y="243" class="plab-arch-note" data-arch="alu-operands"></text>
          <text x="714" y="228" class="plab-arch-note" data-arch="mem-operands"></text>
          <text x="951" y="212" class="plab-arch-note" data-arch="wb-operands"></text>
        </g>
      </svg>`;
  }

  // The pipeline read top to bottom, with the register that separates each pair
  // of stages drawn between them. Vertical is what lets a stage box be as wide
  // as the instruction it holds: five columns across a window can only ever
  // show a truncated opcode, while five rows down can show the operands, the
  // source line and the values the instruction actually used.
  //
  // Unlike the datapath drawing, this layout carries no left-to-right meaning,
  // so it uses logical properties and mirrors correctly under RTL.
  function buildFlowMarkup() {
    const between = new Map(PIPELINE_REGISTERS.map((entry) => {
      const target = STAGES.indexOf(entry.stage);
      return [STAGES[target - 1], entry.id];
    }));
    return `<div class="pipeline-lab-flow" data-plab="flow">
      ${STAGES.map((stage) => {
        const register = between.get(stage);
        return `<section class="pipeline-lab-stage" data-stage="${stage}">
            <h3>${stage}</h3>
            <pre data-plab-stage="${stage}">-</pre>
          </section>${register
            ? `<div class="pipeline-lab-preg" data-plab-preg="${register}">
                 <span aria-hidden="true">&#9660;</span><b>${register}</b><em data-plab-preg-value="${register}"></em>
               </div>`
            : ""}`;
      }).join("")}
    </div>`;
  }

  function describeEvent(event) {
    if (!event) return "";
    const registers = (event.registers || []).join(", ");
    if (event.type === "data" && event.reason === "load-use") {
      return t("Cycle {cycle}: load-use hazard on {registers}. {consumer} needs a value that {producer} is still loading from memory.", {
        cycle: event.cycle, registers, consumer: event.instructionText, producer: event.producerText
      });
    }
    if (event.type === "data") {
      return t("Cycle {cycle}: data hazard on {registers}. {consumer} waits because {producer} has not written back yet.", {
        cycle: event.cycle, registers, consumer: event.instructionText, producer: event.producerText
      });
    }
    if (event.type === "structural") {
      return t("Cycle {cycle}: structural hazard. Memory is busy for {cycles} cycles serving {instruction}.", {
        cycle: event.cycle, cycles: event.cycles, instruction: event.instructionText
      });
    }
    if (event.type === "control" && event.reason === "resynchronised") {
      return t("Cycle {cycle}: the recorded run continues at {instruction}, which no branch in the pipeline predicted. Fetching resumes there.", {
        cycle: event.cycle, instruction: event.instructionText
      });
    }
    if (event.type === "control") {
      return t("Cycle {cycle}: branch misprediction on {instruction}. {cycles} instructions were flushed.", {
        cycle: event.cycle, instruction: event.instructionText, cycles: event.cycles
      });
    }
    if (event.type === "exception") {
      return t("Cycle {cycle}: {instruction} may raise an exception, so fetching is held until it retires.", {
        cycle: event.cycle, instruction: event.instructionText
      });
    }
    return "";
  }

  host.register({
    id: "pipeline-lab",
    label: "Pipeline Lab",
    create(ctx) {
      const shell = ctx.createToolWindowShell("pipeline-lab", "Pipeline Lab", 1040, 660, `
        <div class="pipeline-lab-tool">
          <div class="pipeline-lab-bar">
            <button class="tool-btn" data-plab="reset" type="button">Reset</button>
            <button class="tool-btn" data-plab="previous-step" type="button">Previous step</button>
            <button class="tool-btn" data-plab="previous" type="button">Previous cycle</button>
            <button class="tool-btn" data-plab="next" type="button">Next cycle</button>
            <button class="tool-btn" data-plab="next-step" type="button">Next step</button>
            <button class="tool-btn" data-plab="run" type="button">Run pipeline</button>
            <span class="pipeline-lab-clock" data-plab="clock"></span>
            <span class="pipeline-lab-spacer"></span>
            <button class="tool-btn pipeline-lab-toggle" data-plab-toggle="stream" aria-expanded="true" type="button">Instruction stream</button>
            <button class="tool-btn pipeline-lab-toggle" data-plab-toggle="config" aria-expanded="true" type="button">Pipeline settings</button>
            <button class="tool-btn pipeline-lab-toggle" data-plab-toggle="actions" aria-expanded="false" type="button">Predict and export</button>
            <button class="tool-btn" data-plab="close" type="button">Close</button>
          </div>
          <div class="pipeline-lab-panel" data-plab-panel="stream">
            <label>Instruction stream
              <select data-plab="source">
                <option value="static">Assembled program (assumed branches)</option>
                <option value="execution">Recorded execution (real branches and values)</option>
              </select>
            </label>
            <label><input type="checkbox" data-plab="follow" checked>Follow the running program</label>
          </div>
          <div class="pipeline-lab-panel" data-plab-panel="config">
            <label>Pipeline profile
              <select data-plab="profile">
                ${PROFILES.map((profile) => `<option value="${profile.id}">${profile.label}</option>`).join("")}
                <option value="custom">Custom configuration</option>
              </select>
            </label>
            <label>Data hazards
              <select data-plab="forwarding">
                <option value="off">Stall until WB</option>
                <option value="on">Forwarding</option>
              </select>
            </label>
            <label>Delay slot
              <select data-plab="delaySlot">
                <option value="off">No delay slot</option>
                <option value="on">With delay slot</option>
              </select>
            </label>
            <label>Branch prediction
              <select data-plab="prediction">
                <option value="not-taken">Assume branch is not taken</option>
                <option value="taken">Assume branch is taken</option>
                <option value="bht">Branch history table</option>
              </select>
            </label>
            <label>Branch resolution
              <select data-plab="resolution">
                <option value="EX">EX</option>
                <option value="ID">ID</option>
              </select>
            </label>
            <label>Stage colours
              <select data-plab="palette">
                <option value="default">Default</option>
                <option value="safe">Colour-vision safe</option>
              </select>
            </label>
            <label>Memory latency
              <select data-plab="latency">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </label>
          </div>
          <div class="pipeline-lab-panel" data-plab-panel="actions">
            <label>Predicted cycles
              <input type="number" min="1" step="1" data-plab="prediction-input" size="5">
            </label>
            <button class="tool-btn" data-plab="check-prediction" type="button">Check prediction</button>
            <button class="tool-btn" data-plab="compare" type="button">Compare profiles</button>
            <button class="tool-btn" data-plab="export-json" type="button">Export JSON</button>
            <button class="tool-btn" data-plab="export-csv" type="button">Export CSV</button>
          </div>
          <p class="pipeline-lab-status" data-plab="status"></p>
          <div class="pipeline-lab-body">
            <aside class="pipeline-lab-rail">
              <h2 class="pipeline-lab-rail-title">Pipeline right now</h2>
              ${buildFlowMarkup()}
              <div class="pipeline-lab-metrics">
                <div class="pipeline-lab-metric"><span>Pipeline cycles</span><strong data-plab-metric="cycles">0</strong></div>
                <div class="pipeline-lab-metric" data-plab-scope="runtime"><span>webMARS steps replayed</span><strong data-plab-metric="steps">0</strong></div>
                <div class="pipeline-lab-metric"><span>Completed</span><strong data-plab-metric="completed">0</strong></div>
                <div class="pipeline-lab-metric"><span>Stalls</span><strong data-plab-metric="stalls">0</strong></div>
                <div class="pipeline-lab-metric"><span>Discarded instructions</span><strong data-plab-metric="flushes">0</strong></div>
                <div class="pipeline-lab-metric"><span>Mispredicted branches</span><strong data-plab-metric="mispredicted">0</strong></div>
                <div class="pipeline-lab-metric"><span>CPI</span><strong data-plab-metric="cpi">0.00</strong></div>
              </div>
            </aside>
            <div class="pipeline-lab-main">
              <div class="pipeline-lab-compare" data-plab="compare-panel" hidden></div>
              <div class="pipeline-lab-views" role="tablist">
                <button class="tool-btn" data-plab-view-tab="learn" role="tab" aria-selected="true" type="button">Learn view</button>
                <button class="tool-btn" data-plab-view-tab="registers" role="tab" aria-selected="false" type="button">Registers view</button>
                <button class="tool-btn" data-plab-view-tab="architecture" role="tab" aria-selected="false" type="button">Architecture view</button>
              </div>
          <section class="pipeline-lab-view" data-plab-view="learn" role="tabpanel">
            <p class="pipeline-lab-note" data-plab="explanation"></p>
            <div class="pipeline-lab-timeline-wrap">
              <table class="pipeline-lab-timeline" data-plab="timeline"></table>
            </div>
          </section>
          <section class="pipeline-lab-view" data-plab-view="architecture" role="tabpanel" hidden>
            <div class="pipeline-lab-signal-groups">
              <label><input type="checkbox" data-plab-group="control" checked>Control signals</label>
              <label><input type="checkbox" data-plab-group="forwarding" checked>Forwarding paths</label>
              <label><input type="checkbox" data-plab-group="hazard" checked>Hazard detection</label>
              <label><input type="checkbox" data-plab-group="values" checked>Operand names</label>
            </div>
            <div class="pipeline-lab-datapath-wrap">${buildDatapathMarkup()}</div>
            <p class="pipeline-lab-note" data-plab="architecture-note"></p>
          </section>
          <section class="pipeline-lab-view" data-plab-view="registers" role="tabpanel" hidden>
            <div class="pipeline-lab-bar">
              <label>Show
                <select data-plab="register-filter">
                  <option value="used">Registers this program uses</option>
                  <option value="changed">Registers that changed</option>
                  <option value="all">All registers</option>
                </select>
              </label>
              <label>Number base
                <select data-plab="register-base">
                  <option value="hex">Hexadecimal</option>
                  <option value="dec">Decimal</option>
                </select>
              </label>
            </div>
            <p class="pipeline-lab-note" data-plab="register-note"></p>
            <div class="pipeline-lab-registers">
              <div class="pipeline-lab-register-wrap">
                <table data-plab="register-table"></table>
              </div>
              <div class="pipeline-lab-register-wrap">
                <table data-plab="register-history"></table>
              </div>
            </div>
          </section>
              <details class="pipeline-lab-model">
                <summary>Model and assumptions</summary>
                <p data-plab="model-note"></p>
              </details>
            </div>
          </div>
        </div>
      `);

      const rootElement = shell.root;
      const controls = Object.fromEntries(
        ["profile", "forwarding", "delaySlot", "prediction", "resolution", "latency"]
          .map((name) => [name, rootElement.querySelector(`[data-plab='${name}']`)])
      );
      const paletteSelect = rootElement.querySelector("[data-plab='palette']");
      const paletteRoot = rootElement.querySelector(".pipeline-lab-tool");
      const statusNode = rootElement.querySelector("[data-plab='status']");
      const explanationNode = rootElement.querySelector("[data-plab='explanation']");
      const modelNoteNode = rootElement.querySelector("[data-plab='model-note']");
      const timelineNode = rootElement.querySelector("[data-plab='timeline']");
      const comparePanel = rootElement.querySelector("[data-plab='compare-panel']");
      const previousButton = rootElement.querySelector("[data-plab='previous']");
      const nextButton = rootElement.querySelector("[data-plab='next']");
      const previousStepButton = rootElement.querySelector("[data-plab='previous-step']");
      const nextStepButton = rootElement.querySelector("[data-plab='next-step']");
      const runButton = rootElement.querySelector("[data-plab='run']");
      const resetButton = rootElement.querySelector("[data-plab='reset']");
      const runtimeControls = ctx.runtimeControls || null;
      const stageNodes = Object.fromEntries(STAGES.map((stage) => [stage, rootElement.querySelector(`[data-plab-stage='${stage}']`)]));
      const stageSections = Object.fromEntries(STAGES.map((stage) => [stage, rootElement.querySelector(`.pipeline-lab-stage[data-stage='${stage}']`)]));
      const pregNodes = Object.fromEntries(PIPELINE_REGISTERS.map((entry) => [entry.id, {
        row: rootElement.querySelector(`[data-plab-preg='${entry.id}']`),
        value: rootElement.querySelector(`[data-plab-preg-value='${entry.id}']`)
      }]));
      const metricNodes = Object.fromEntries(
        ["cycles", "steps", "completed", "stalls", "flushes", "mispredicted", "cpi"]
          .map((name) => [name, rootElement.querySelector(`[data-plab-metric='${name}']`)])
      );

      const predictionInput = rootElement.querySelector("[data-plab='prediction-input']");
      const datapathNode = rootElement.querySelector("[data-plab='datapath']");
      const architectureNote = rootElement.querySelector("[data-plab='architecture-note']");
      const clockNode = rootElement.querySelector("[data-plab='clock']");
      const sourceSelect = rootElement.querySelector("[data-plab='source']");
      const followInput = rootElement.querySelector("[data-plab='follow']");
      const registerFilter = rootElement.querySelector("[data-plab='register-filter']");
      const registerBase = rootElement.querySelector("[data-plab='register-base']");
      const registerNote = rootElement.querySelector("[data-plab='register-note']");
      const registerTable = rootElement.querySelector("[data-plab='register-table']");
      const registerHistory = rootElement.querySelector("[data-plab='register-history']");
      const viewTabs = [...rootElement.querySelectorAll("[data-plab-view-tab]")];
      const viewPanels = Object.fromEntries(
        [...rootElement.querySelectorAll("[data-plab-view]")].map((node) => [node.dataset.plabView, node])
      );
      const panels = Object.fromEntries(
        [...rootElement.querySelectorAll("[data-plab-panel]")].map((node) => [node.dataset.plabPanel, node])
      );
      const panelToggles = [...rootElement.querySelectorAll("[data-plab-toggle]")];

      let simulator = coreApi.createSimulator([]);
      let latestSnapshot = null;
      let loadedSignature = "";
      let selectedUid = null;
      let activeView = "learn";
      // Recorded webMARS steps, in execution order. Kept raw so the model can
      // be rebound after a re-assembly without asking the runtime to replay.
      let executionRecords = [];
      let executionBaseline = null;
      let registerNames = null;
      let executionTruncated = false;
      let pendingExecutionSync = false;
      // Which control groups the user opened by hand. A window that later
      // becomes narrow folds them away, but reopening one is never undone by a
      // resize the user did not ask for.
      const panelPreference = { stream: null, config: null, actions: null };
      let widthClass = "wide";

      // The recording is bounded so a long run cannot grow without limit; the
      // model refuses more than MAX_TRACE_ROWS fetches anyway.
      const MAX_EXECUTION_RECORDS = 20000;

      function classifyWidth(width) {
        if (!Number.isFinite(width) || width <= 0) return widthClass;
        if (width < 560) return "narrow";
        if (width < 920) return "medium";
        return "wide";
      }

      // Predict-and-export is an occasional errand rather than something read
      // cycle by cycle, so it starts folded and gives its height to the
      // pipeline. The two settings groups start open wherever they fit.
      const panelDefaultOpen = { stream: "auto", config: "auto", actions: false };

      function applyPanelVisibility() {
        const compact = widthClass === "narrow";
        Object.entries(panels).forEach(([name, panel]) => {
          const preference = panelPreference[name];
          const fallback = panelDefaultOpen[name];
          const open = preference === null
            ? (fallback === "auto" ? !compact : fallback === true)
            : preference;
          panel.hidden = !open;
          const toggle = panelToggles.find((button) => button.dataset.plabToggle === name);
          if (toggle) toggle.setAttribute("aria-expanded", String(open));
        });
      }

      function applyWidth(width) {
        const next = classifyWidth(width);
        if (next === widthClass) return;
        widthClass = next;
        paletteRoot.dataset.plabWidth = widthClass;
        applyPanelVisibility();
      }

      function currentConfig() {
        return {
          forwarding: controls.forwarding.value === "on",
          delaySlot: controls.delaySlot.value === "on",
          branchPrediction: controls.prediction.value,
          branchResolution: controls.resolution.value,
          memoryLatency: Number(controls.latency.value)
        };
      }

      function syncControls(config) {
        controls.forwarding.value = config.forwarding ? "on" : "off";
        controls.delaySlot.value = config.delaySlot ? "on" : "off";
        controls.prediction.value = config.branchPrediction;
        controls.resolution.value = config.branchResolution;
        controls.latency.value = String(config.memoryLatency);
        const match = PROFILES.find((profile) => Object.keys(profile.config)
          .every((key) => profile.config[key] === config[key]));
        controls.profile.value = match ? match.id : "custom";
      }

      function formatValue(value) {
        if (value === null || value === undefined) return "?";
        return registerBase.value === "dec"
          ? String(value | 0)
          : `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
      }

      // Each stage box shows the address, the assembled instruction and the
      // source line it came from, so all three stay in step cycle by cycle.
      // Replaying a recorded run adds the values the instruction really used,
      // which is what turns "a stall happens here" into "this number is not
      // ready yet".
      function stageText(slot) {
        if (!slot) return "-";
        if (slot.bubble) return `${t("Bubble")}\n${slot.reason}`;
        const sourceLine = slot.source && slot.source !== slot.text
          ? `\n${slot.line ? `${slot.line}: ` : ""}${slot.source}`
          : "";
        const lines = [`${slot.addressHex}${slot.traceStep ? `  ${t("step {step}", { step: slot.traceStep })}` : ""}`, slot.text];
        if (sourceLine) lines.push(sourceLine.slice(1));
        if (slot.speculative) lines.push(t("speculative: never executed"));
        // A syscall nominally reads five registers; listing all of them would
        // make one stage row three times the height of its neighbours and cost
        // the pipeline more space than the detail is worth. The rest stays in
        // the stage tooltip.
        const reads = slot.traceReads ? Object.entries(slot.traceReads) : [];
        if (reads.length) {
          const shown = reads.slice(0, 3).map(([name, value]) => `${name}=${formatValue(value)}`);
          if (reads.length > shown.length) shown.push(`+${reads.length - shown.length}`);
          lines.push(shown.join(" "));
        }
        if (Array.isArray(slot.traceWrites) && slot.traceWrites.length) {
          lines.push(slot.traceWrites.map((write) => `→ ${write.name}=${formatValue(write.after)}`).join(" "));
        }
        return lines.join("\n");
      }

      function stageTooltip(stage, slot) {
        const description = {
          IF: t("IF fetches the instruction the predicted path points at."),
          ID: t("ID decodes the instruction and reads its source registers."),
          EX: t("EX runs the ALU operation or computes a memory address."),
          MEM: t("MEM reads or writes data memory."),
          WB: t("WB writes the result back into the register file.")
        }[stage] || "";
        if (!slot) return `${description} ${t("This stage is empty.")}`;
        if (slot.bubble) return `${description} ${t("A bubble is occupying this stage: {reason}.", { reason: slot.reason })}`;
        // The box truncates the operand values; the tooltip carries all of them.
        const reads = slot.traceReads ? Object.entries(slot.traceReads) : [];
        const values = reads.length
          ? ` ${reads.map(([name, value]) => `${name}=${formatValue(value)}`).join(" ")}`
          : "";
        return `${description} ${slot.text}${values}`;
      }

      function dependencyIndexes(snapshot) {
        if (selectedUid === null) return new Set();
        const row = snapshot.trace.find((entry) => entry.uid === selectedUid);
        if (!row) return new Set();
        const instruction = snapshot.program[row.index];
        if (!instruction) return new Set();
        return new Set(instruction.dependencies.map((dependency) => dependency.producerIndex));
      }

      // The cycle window both the instruction timeline and the register history
      // use, so a column labelled C12 means the same thing in either table.
      const MAX_VISIBLE_CYCLES = 80;

      function visibleCycleRange(snapshot) {
        return {
          first: Math.max(1, snapshot.cycle - MAX_VISIBLE_CYCLES + 1),
          last: snapshot.cycle
        };
      }

      function visibleRegisters(snapshot) {
        const mode = registerFilter.value;
        return snapshot.registers.filter((entry) => {
          if (mode === "all") return true;
          if (mode === "changed") return entry.lastCycle !== null || entry.inFlight !== null;
          // "used" is the default: the handful the program mentions, rather
          // than thirty-four rows of which thirty never move.
          return entry.used === true || entry.lastCycle !== null || entry.inFlight !== null;
        });
      }

      // What the register file holds right now, and what is on its way there.
      // A value sitting in EX or MEM but not yet in the file is exactly the
      // value a forwarding path would carry, so both columns are shown.
      function renderRegisterTable(snapshot) {
        registerTable.replaceChildren();
        const rows = visibleRegisters(snapshot);
        const caption = document.createElement("caption");
        caption.textContent = t("Register file after cycle {cycle}.", { cycle: snapshot.cycle });
        registerTable.appendChild(caption);

        const thead = document.createElement("thead");
        const header = document.createElement("tr");
        [t("Register"), t("Value"), t("Written in cycle"), t("webMARS step"), t("Not yet written back")].forEach((title) => {
          const cell = document.createElement("th");
          cell.textContent = title;
          header.appendChild(cell);
        });
        thead.appendChild(header);
        registerTable.appendChild(thead);

        const tbody = document.createElement("tbody");
        rows.forEach((entry) => {
          const row = document.createElement("tr");
          if (entry.changedThisCycle) row.dataset.changed = "true";
          if (entry.inFlight) row.dataset.inflight = "true";
          const cells = [
            { text: entry.name },
            { text: entry.known ? formatValue(entry.value) : "-", state: entry.known ? null : "unknown" },
            { text: entry.lastCycle === null ? "-" : `C${entry.lastCycle}` },
            { text: entry.lastStep === null || entry.lastStep === undefined ? "-" : String(entry.lastStep) },
            {
              text: entry.inFlight ? `${formatValue(entry.inFlight.value)} (${entry.inFlight.stage})` : "-",
              state: entry.inFlight ? "pending" : null
            }
          ];
          cells.forEach((spec) => {
            const cell = document.createElement("td");
            cell.textContent = spec.text;
            if (spec.state) cell.dataset.state = spec.state;
            row.appendChild(cell);
          });
          tbody.appendChild(row);
        });
        registerTable.appendChild(tbody);
      }

      // The same shape as the instruction timeline, with registers where the
      // instructions were: one row per register, one column per cycle, and the
      // new value written into the cycle that committed it.
      function renderRegisterHistory(snapshot) {
        registerHistory.replaceChildren();
        const { first, last } = visibleCycleRange(snapshot);
        const byCycle = new Map();
        snapshot.registerLog.forEach((entry) => {
          if (entry.cycle < first || entry.cycle > last) return;
          entry.writes.forEach((write) => {
            if (!byCycle.has(write.name)) byCycle.set(write.name, new Map());
            byCycle.get(write.name).set(entry.cycle, write.after);
          });
        });
        const rows = visibleRegisters(snapshot)
          .filter((entry) => registerFilter.value === "all" || byCycle.has(entry.name) || entry.inFlight);

        const caption = document.createElement("caption");
        caption.textContent = last > 0
          ? t("Register values along cycles {first}-{last}.", { first, last })
          : t("Register values appear here once the pipeline advances.");
        registerHistory.appendChild(caption);

        const thead = document.createElement("thead");
        const header = document.createElement("tr");
        const corner = document.createElement("th");
        corner.textContent = t("Register");
        header.appendChild(corner);
        for (let cycle = first; cycle <= last; cycle += 1) {
          const cell = document.createElement("th");
          cell.textContent = `C${cycle}`;
          header.appendChild(cell);
        }
        thead.appendChild(header);
        registerHistory.appendChild(thead);

        const tbody = document.createElement("tbody");
        rows.forEach((entry) => {
          const row = document.createElement("tr");
          const label = document.createElement("td");
          label.textContent = entry.name;
          row.appendChild(label);
          const writes = byCycle.get(entry.name) || new Map();
          for (let cycle = first; cycle <= last; cycle += 1) {
            const cell = document.createElement("td");
            if (writes.has(cycle)) {
              cell.textContent = formatValue(writes.get(cycle));
              cell.dataset.write = "true";
              cell.setAttribute("aria-label", t("{register} becomes {value} in cycle {cycle}", {
                register: entry.name, value: formatValue(writes.get(cycle)), cycle
              }));
            }
            row.appendChild(cell);
          }
          tbody.appendChild(row);
        });
        registerHistory.appendChild(tbody);
      }

      function renderRegisters(snapshot) {
        if (!snapshot.program.length) {
          registerNote.textContent = t("Assemble a program to begin the pipeline simulation.");
        } else if (!snapshot.followingExecution) {
          registerNote.textContent = snapshot.execution.recorded > 0
            ? t("Switch the instruction stream to the recorded execution to see register values.")
            : t("Run the program to see recorded register values.");
        } else if (snapshot.execution.recorded === 0) {
          registerNote.textContent = t("Run or step the program to record execution.");
        } else {
          const inFlight = Math.max(0, snapshot.execution.replayed - snapshot.execution.retired);
          registerNote.textContent = inFlight > 0
            ? t("Registers reflect completed instructions. {inFlight} of {recorded} recorded instructions are still in the pipeline.", {
                recorded: snapshot.execution.recorded, inFlight
              })
            : t("Register values match the Registers window.");
        }
        renderRegisterTable(snapshot);
        renderRegisterHistory(snapshot);
      }

      function renderTimeline(snapshot) {
        timelineNode.replaceChildren();
        const maxVisibleInstructions = 160;
        const maxVisibleCycles = MAX_VISIBLE_CYCLES;
        const rows = snapshot.trace;
        const anchor = Math.max(0, rows.length - 1);
        let firstInstruction = Math.max(0, anchor - 50);
        let lastInstruction = Math.min(rows.length, firstInstruction + maxVisibleInstructions);
        firstInstruction = Math.max(0, lastInstruction - maxVisibleInstructions);
        const firstCycle = Math.max(1, snapshot.cycle - maxVisibleCycles + 1);
        const dependencies = dependencyIndexes(snapshot);

        const caption = document.createElement("caption");
        caption.textContent = snapshot.cycle > 0
          ? t("Showing instructions {first}-{last} of {total}; cycles {cycleFirst}-{cycleLast}.", {
              first: rows.length ? firstInstruction + 1 : 0,
              last: lastInstruction,
              total: rows.length,
              cycleFirst: firstCycle,
              cycleLast: snapshot.cycle
            })
          : t("Showing instructions {first}-{last} of {total}; cycle 0.", {
              first: rows.length ? firstInstruction + 1 : 0,
              last: lastInstruction,
              total: rows.length
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
        rows.slice(firstInstruction, lastInstruction).forEach((entry) => {
          const row = document.createElement("tr");
          row.dataset.uid = String(entry.uid);
          row.tabIndex = 0;
          row.setAttribute("aria-selected", String(entry.uid === selectedUid));
          if (entry.uid === selectedUid) row.dataset.selected = "true";
          if (dependencies.has(entry.index)) row.dataset.dependency = "true";
          if (entry.flushed) row.dataset.flushed = "true";
          const label = document.createElement("td");
          // Flushed and dependency rows are also styled; the text keeps the
          // same information available without relying on colour.
          const marks = [];
          if (entry.flushed) marks.push(t("discarded"));
          if (dependencies.has(entry.index)) marks.push(t("produces an operand"));
          // The webMARS step number is the only bridge between the two clocks,
          // so it travels with the instruction rather than being inferred.
          const step = entry.step ? `#${entry.step} ` : "";
          label.textContent = `${step}${entry.addressHex}  ${entry.text}${marks.length ? `  [${marks.join(", ")}]` : ""}`;
          // The column clips, so the tooltip carries the whole row rather than
          // only the extra the source line would have added.
          label.title = entry.source && entry.source !== entry.text
            ? `${label.textContent}\n${t("Source line {line}: {source}", { line: entry.line ?? "?", source: entry.source })}`
            : label.textContent;
          row.appendChild(label);
          for (let cycle = firstCycle - 1; cycle < snapshot.cycle; cycle += 1) {
            const cell = document.createElement("td");
            const value = entry.stages[cycle] || "";
            cell.textContent = value;
            if (value) {
              cell.dataset.value = value;
              cell.setAttribute("aria-label", t("Cycle {cycle}: stage {stage}", { cycle: cycle + 1, stage: value }));
            }
            row.appendChild(cell);
          }
          tbody.appendChild(row);
        });
        timelineNode.appendChild(tbody);
      }

      function renderExplanation(snapshot) {
        if (selectedUid !== null) {
          const trace = simulator.instructionTrace(selectedUid);
          if (trace) {
            const instruction = snapshot.program[trace.index];
            const path = trace.stages.map((entry) => `C${entry.cycle}:${entry.stage}`).join(" → ");
            const dependencyText = instruction && instruction.dependencies.length
              ? t("Depends on {registers} produced by earlier instructions.", {
                  registers: instruction.dependencies.map((dependency) => dependency.register).join(", ")
                })
              : t("This instruction has no register dependencies in the current program.");
            explanationNode.textContent = `${t("Selected: {instruction}", { instruction: trace.text })} ${path} — ${dependencyText}`;
            return;
          }
        }
        explanationNode.textContent = describeEvent(snapshot.lastEvent)
          || t("Select a row in the timeline to follow one instruction through the pipeline.");
      }

      // Translates every static label inside the SVG once per language change.
      function translateDatapath() {
        datapathNode.querySelectorAll(".plab-arch-title").forEach((node) => {
          const source = node.dataset.plabSource || node.textContent;
          if (!source) return;
          node.dataset.plabSource = source;
          node.textContent = t(source);
        });
        datapathNode.setAttribute("aria-label", t("Five-stage MIPS datapath"));
      }

      function slotLabel(slot) {
        if (!slot) return t("empty");
        if (slot.bubble) return `${t("Bubble")}: ${slot.reason}`;
        return slot.text;
      }

      function renderArchitecture(snapshot) {
        const stages = snapshot.stages;
        const selectedIndex = selectedUid === null
          ? null
          : (snapshot.trace.find((entry) => entry.uid === selectedUid)?.index ?? null);

        STAGES.forEach((stage) => {
          const slot = stages[stage];
          const occupant = datapathNode.querySelector(`[data-arch="occupant"][data-stage="${stage}"]`);
          if (occupant) occupant.textContent = slotLabel(slot);
          const lane = datapathNode.querySelector(`[data-arch="lane"][data-stage="${stage}"]`);
          // The selected instruction stays highlighted wherever it currently is,
          // which is what keeps this view in step with the Learn view.
          if (lane) lane.dataset.active = String(Boolean(slot && !slot.bubble && slot.index === selectedIndex));
        });

        PIPELINE_REGISTERS.forEach((entry) => {
          const slot = stages[entry.stage];
          const group = datapathNode.querySelector(`.plab-arch-preg[data-preg="${entry.id}"]`);
          const value = datapathNode.querySelector(`[data-arch="preg-value"][data-preg="${entry.id}"]`);
          if (value) value.textContent = slotLabel(slot);
          if (group) {
            group.dataset.active = String(Boolean(slot && !slot.bubble));
            group.dataset.bubble = String(Boolean(slot && slot.bubble));
          }
        });

        // Control lines belong to the instruction executing in EX.
        const executing = stages.EX && !stages.EX.bubble ? stages.EX : null;
        CONTROL_LINES.forEach((line) => {
          const node = datapathNode.querySelector(`[data-arch="signal"][data-signal="${line}"]`);
          if (!node) return;
          const on = Boolean(executing && executing.control && executing.control[line]);
          node.textContent = `${line}=${on ? 1 : 0}`;
          node.dataset.active = String(on);
        });
        ["mux-a", "mux-b"].forEach((hook) => {
          const node = datapathNode.querySelector(`[data-arch="${hook}"]`);
          if (node) node.dataset.active = String(Boolean(executing));
        });
        const muxWb = datapathNode.querySelector('[data-arch="mux-wb"]');
        if (muxWb) muxWb.dataset.active = String(Boolean(stages.WB && !stages.WB.bubble));
        const writeback = datapathNode.querySelector('[data-arch="writeback"]');
        if (writeback) {
          writeback.dataset.active = String(Boolean(stages.WB && !stages.WB.bubble && stages.WB.control?.RegWrite));
        }

        const paths = snapshot.activeForwarding || [];
        datapathNode.querySelectorAll('[data-arch="fwd-path"]').forEach((node) => {
          node.dataset.active = String(paths.some((path) => path.from === node.dataset.from));
        });
        const forwardingText = datapathNode.querySelector('[data-arch="forwarding-text"]');
        if (forwardingText) {
          forwardingText.textContent = paths.length
            ? t("{registers} travels straight from {source} to the ALU, so nothing has to stop.", {
                registers: paths.map((path) => path.register).join(", "),
                source: paths.map((path) => path.pipelineRegister).join(", ")
              })
            : t("No value is being forwarded in this cycle.");
        }
        const forwardingUnit = datapathNode.querySelector('[data-arch="forwarding-unit"]');
        if (forwardingUnit) forwardingUnit.dataset.active = String(paths.length > 0);

        const hazard = snapshot.lastHazard;
        const hazardUnit = datapathNode.querySelector('[data-arch="hazard-unit"]');
        if (hazardUnit) hazardUnit.dataset.active = String(Boolean(hazard));
        const hazardText = datapathNode.querySelector('[data-arch="hazard-text"]');
        if (hazardText) {
          hazardText.textContent = hazard
            ? t("Holding IF and ID for {registers}.", { registers: hazard.registers.join(", ") })
            : t("No stall requested in this cycle.");
        }

        // Replaying a recorded run, the components can show the values the
        // instruction really used instead of the names of its operands.
        const operandText = (slot) => {
          if (!slot || slot.bubble) return "-";
          const reads = slot.traceReads ? Object.entries(slot.traceReads) : [];
          if (reads.length) return reads.map(([name, value]) => `${name}=${formatValue(value)}`).join(" ");
          return slot.operands.length ? slot.operands.join(", ") : "-";
        };
        const aluOperands = datapathNode.querySelector('[data-arch="alu-operands"]');
        if (aluOperands) aluOperands.textContent = operandText(stages.EX);
        const memOperands = datapathNode.querySelector('[data-arch="mem-operands"]');
        if (memOperands) memOperands.textContent = operandText(stages.MEM);
        const wbOperands = datapathNode.querySelector('[data-arch="wb-operands"]');
        if (wbOperands) {
          const writes = stages.WB && !stages.WB.bubble ? stages.WB : null;
          if (writes && Array.isArray(writes.traceWrites) && writes.traceWrites.length) {
            wbOperands.textContent = writes.traceWrites.map((write) => `${write.name}=${formatValue(write.after)}`).join(" ");
          } else {
            wbOperands.textContent = writes && writes.writes.length ? writes.writes.join(", ") : "-";
          }
        }

        // The distinction matters: a value shown here was observed in the
        // functional runtime, never computed by the timing model.
        architectureNote.textContent = snapshot.followingExecution
          ? t("Cycle {cycle} · recorded register values.", { cycle: snapshot.cycle })
          : t("Cycle {cycle} · operand names only.", { cycle: snapshot.cycle });
      }

      function renderModelNote(snapshot) {
        modelNoteNode.textContent = t(
          "Cycle-accurate model {model} v{version}; program hash {hash}. Branch outcomes follow the {outcome} assumption and {count} instructions have no modelled timing.",
          {
            model: coreApi.MODEL_ID,
            version: coreApi.MODEL_VERSION,
            hash: snapshot.programHash,
            outcome: snapshot.config.outcomeModel,
            count: snapshot.unmodelled.length
          }
        );
      }

      function renderCompare(results) {
        comparePanel.replaceChildren();
        if (!results) {
          comparePanel.hidden = true;
          return;
        }
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        [t("Pipeline configuration"), t("Cycles"), t("CPI"), t("Stalls"), t("Discarded instructions"), t("Mispredicted branches")].forEach((title) => {
          const cell = document.createElement("th");
          cell.textContent = title;
          headerRow.appendChild(cell);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        const tbody = document.createElement("tbody");
        const activeProfile = controls.profile.value;
        results.forEach((result) => {
          const row = document.createElement("tr");
          if (result.profile === activeProfile) row.dataset.active = "true";
          [
            `${t(result.label)} (v${result.version})`,
            result.cycles,
            result.cpi.toFixed(2),
            result.stalls,
            result.flushes,
            result.mispredicted
          ].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.appendChild(cell);
          });
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
        comparePanel.appendChild(table);
        comparePanel.hidden = false;
      }

      // The two clocks, always side by side. A pipeline cycle is a hardware
      // cycle of the modelled microarchitecture; a webMARS step is one whole
      // instruction of the functional runtime. Conflating them is the single
      // most common misreading of this tool, so neither is ever shown alone.
      function renderClock(snapshot) {
        clockNode.replaceChildren();
        const cycle = document.createElement("span");
        cycle.textContent = t("cycle");
        const cycleValue = document.createElement("b");
        cycleValue.textContent = String(snapshot.cycle);
        const step = document.createElement("span");
        step.textContent = t("webMARS step");
        const stepValue = document.createElement("b");
        // The step the runtime has reached, so this readout and the main
        // window's register display always describe the same instruction.
        stepValue.textContent = snapshot.followingExecution
          ? String(snapshot.execution.lastStep ?? "-")
          : "-";
        clockNode.append(cycle, cycleValue, step, stepValue);

        // Instructions the runtime has finished but the pipeline has not
        // committed yet. This number is the whole reason the two register
        // displays can disagree, so it is shown rather than left to be
        // discovered as a bug.
        const inFlight = Math.max(0, snapshot.execution.replayed - snapshot.execution.retired);
        if (snapshot.followingExecution && inFlight > 0) {
          const flight = document.createElement("span");
          flight.textContent = t("{count} in flight", { count: inFlight });
          clockNode.append(flight);
        }
        clockNode.title = snapshot.followingExecution
          ? t("Recorded: {recorded} · written back: {retired} · in flight: {inFlight}.", {
              recorded: snapshot.execution.recorded, retired: snapshot.execution.retired, inFlight
            })
          : t("Pipeline simulation only; the program is not running.");
      }

      function render() {
        const snapshot = simulator.snapshot();
        metricNodes.cycles.textContent = String(snapshot.cycle);
        metricNodes.steps.textContent = snapshot.followingExecution
          ? `${snapshot.execution.replayed}/${snapshot.execution.recorded}`
          : "-";
        metricNodes.completed.textContent = String(snapshot.completed);
        metricNodes.stalls.textContent = String(snapshot.metrics.stalls);
        metricNodes.flushes.textContent = String(snapshot.metrics.flushes);
        metricNodes.mispredicted.textContent = String(snapshot.metrics.branches.mispredicted);
        metricNodes.cpi.textContent = snapshot.cpi.toFixed(2);
        const selectedIndex = selectedUid === null
          ? null
          : (snapshot.trace.find((entry) => entry.uid === selectedUid)?.index ?? null);
        STAGES.forEach((stage) => {
          const slot = snapshot.stages[stage];
          stageNodes[stage].textContent = stageText(slot);
          const tooltip = stageTooltip(stage, slot);
          stageNodes[stage].title = tooltip;
          stageNodes[stage].setAttribute("aria-label", tooltip);
          const section = stageSections[stage];
          if (!section) return;
          section.dataset.occupied = !slot ? "false" : (slot.bubble ? "bubble" : "true");
          // The instruction picked in the timeline stays marked wherever it is,
          // so following one instruction down the pipeline needs no counting.
          section.dataset.selected = String(Boolean(slot && !slot.bubble && slot.index === selectedIndex));
        });
        // Each pipeline register shows what it is handing to the stage below it.
        PIPELINE_REGISTERS.forEach((entry) => {
          const nodes = pregNodes[entry.id];
          if (!nodes || !nodes.row) return;
          const slot = snapshot.stages[entry.stage];
          nodes.row.dataset.active = String(Boolean(slot && !slot.bubble));
          nodes.row.dataset.bubble = String(Boolean(slot && slot.bubble));
          if (nodes.value) nodes.value.textContent = slot ? slotLabel(slot) : t("empty");
        });
        syncControls(snapshot.config);
        sourceSelect.value = snapshot.source;
        paletteRoot.dataset.plabSource = snapshot.source;
        previousButton.disabled = !snapshot.canBack;
        // At the end of a recording the cycle button becomes a request for one
        // more instruction, so it stays live while the runtime can still run.
        const atHead = snapshot.followingExecution
          && snapshot.execution.replayed >= snapshot.execution.recorded;
        const canExtend = atHead && runtimeCanStep();
        const canRunToExtend = atHead && runtimeCanRun();
        nextButton.disabled = snapshot.done && !canExtend;
        runButton.disabled = snapshot.done && !canRunToExtend;
        resetButton.disabled = snapshot.program.length === 0;
        nextStepButton.disabled = snapshot.followingExecution
          ? (atHead && !runtimeCanStep())
          : snapshot.done;
        previousStepButton.disabled = snapshot.followingExecution
          ? (snapshot.execution.replayed <= 0 && !runtimeCanBackstep())
          : !snapshot.canBack;
        // The tooltip says whether pressing it will also drive the program in
        // the main window, because that is not something to discover by accident.
        nextStepButton.title = atHead
          ? t("Runs one more instruction in webMARS and follows it into the pipeline.")
          : t("Advances until the next instruction enters the pipeline.");
        previousStepButton.title = snapshot.followingExecution && snapshot.execution.replayed <= 0
          ? t("Un-executes one instruction in webMARS.")
          : t("Rewinds until the previous instruction enters the pipeline.");

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
        } else if (snapshot.followingExecution && snapshot.execution.recorded === 0) {
          statusNode.textContent = t("Run or step the program to record execution.");
        } else if (snapshot.done && snapshot.followingExecution) {
          statusNode.textContent = t("Replayed {recorded} recorded steps in {cycles} pipeline cycles.", {
            recorded: snapshot.execution.recorded, cycles: snapshot.cycle
          });
        } else if (snapshot.done) {
          statusNode.textContent = t("Pipeline complete in {cycles} cycles.", { cycles: snapshot.cycle });
        } else if (snapshot.followingExecution) {
          statusNode.textContent = t("Cycle {cycle}, replaying the recorded webMARS run.", { cycle: snapshot.cycle });
        } else {
          statusNode.textContent = t("Pipeline cycle {cycle}.", { cycle: snapshot.cycle });
        }
        if (executionTruncated) {
          statusNode.textContent += ` ${t("The recording stopped at {limit} instructions.", { limit: MAX_EXECUTION_RECORDS })}`;
        }
        renderClock(snapshot);
        renderRegisters(snapshot);
        renderTimeline(snapshot);
        renderExplanation(snapshot);
        renderArchitecture(snapshot);
        renderModelNote(snapshot);
      }

      function selectView(view) {
        activeView = viewPanels[view] ? view : "learn";
        viewTabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.plabViewTab === activeView)));
        Object.entries(viewPanels).forEach(([name, panel]) => { panel.hidden = name !== activeView; });
      }

      function loadSnapshot(snapshot, force = false) {
        if (!snapshot || typeof snapshot !== "object") return;
        latestSnapshot = snapshot;
        if (snapshot.assembled !== true) {
          if (force || loadedSignature) {
            loadedSignature = "";
            selectedUid = null;
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
          // A new program invalidates a recording made against the old one:
          // the addresses may still resolve while meaning something else.
          loadedSignature = signature;
          selectedUid = null;
          executionRecords = [];
          executionTruncated = false;
          executionBaseline = readRegisterMap(snapshot);
          renderCompare(null);
          simulator = coreApi.createSimulator(snapshot.textRows, {
            ...currentConfig(),
            labels: snapshot.labels,
            source: sourceSelect.value
          });
        } else if (executionRecords.length === 0) {
          // Between assemblies the baseline keeps following the runtime, so a
          // recording that starts after a reset begins from the right values.
          executionBaseline = readRegisterMap(snapshot) || executionBaseline;
        } else if (Number(snapshot.steps) === 0) {
          // The runtime was reset. Keeping the old recording would splice two
          // separate runs into one instruction stream, and the pipeline would
          // be asked to explain a jump from the last instruction of one run to
          // the first of the next.
          executionRecords = [];
          executionTruncated = false;
          executionBaseline = readRegisterMap(snapshot) || executionBaseline;
          if (sourceSelect.value === "execution") {
            simulator.setExecutionTrace(executionRecords, { initialRegisters: executionBaseline });
            selectedUid = null;
          }
        }
        render();
      }

      // Index -> name, taken from the runtime's own register rows rather than
      // from a table this tool would have to keep in step by hand.
      function readRegisterMap(snapshot) {
        const rows = snapshot && Array.isArray(snapshot.registers) ? snapshot.registers : null;
        if (!rows) return null;
        if (!registerNames) {
          registerNames = new Map();
          rows.forEach((row) => {
            if (Number.isFinite(Number(row?.index))) registerNames.set(Number(row.index), String(row.name));
          });
        }
        const values = {};
        rows.forEach((row) => {
          if (!row || !row.name || row.name === "$pc") return;
          values[String(row.name)] = Number(row.value) | 0;
        });
        return values;
      }

      function registerNameFor(index) {
        return registerNames ? registerNames.get(Number(index)) || "" : "";
      }

      // One runtime event becomes one recorded step. Only the register changes
      // are kept: the model needs what changed, not the whole file.
      function recordRuntimeEvent(event) {
        if (!event || event.type !== "instruction") return false;
        if (executionRecords.length >= MAX_EXECUTION_RECORDS) {
          executionTruncated = true;
          return false;
        }
        // The index-to-name table comes from a snapshot. One always arrives
        // before any event -- the tool is seeded when it is created -- but
        // without this fallback a missed seed would drop every register value
        // silently, which reads as "the model has no values" rather than as a
        // fault.
        if (!registerNames && latestSnapshot) readRegisterMap(latestSnapshot);

        const changes = Array.isArray(event.registerChanges) ? event.registerChanges : [];
        const writes = [];
        // Triples of index, previous value, new value. A trailing partial group
        // is ignored rather than read past its end.
        for (let offset = 0; offset + 3 <= changes.length; offset += 3) {
          const name = registerNameFor(changes[offset]);
          if (!name) continue;
          writes.push({ name, before: changes[offset + 1] | 0, after: changes[offset + 2] | 0 });
        }
        executionRecords.push({
          address: Number(event.executedAddress) >>> 0,
          step: Number(event.stepAfter) | 0,
          writes
        });
        return true;
      }

      // Backstepping in webMARS un-executes instructions, so the recording has
      // to shrink with it or the pipeline would replay a run that no longer
      // happened.
      function rewindRecording(step) {
        const target = Math.max(0, Number(step) | 0);
        let removed = 0;
        while (executionRecords.length && executionRecords[executionRecords.length - 1].step > target) {
          executionRecords.pop();
          removed += 1;
        }
        return removed > 0;
      }

      // Rebuilds the model from the recording. Replaying from cycle 0 is what
      // keeps the timeline consistent: a pipeline cannot be extended from the
      // middle without re-deciding every prediction that followed.
      function syncExecution({ advance = true } = {}) {
        pendingExecutionSync = false;
        if (sourceSelect.value !== "execution") return;
        // Rebinding restarts the replay, so where the reader was has to be
        // re-reached deliberately rather than lost.
        const held = simulator.snapshot().execution.replayed;
        simulator.setExecutionTrace(executionRecords, { initialRegisters: executionBaseline });
        selectedUid = null;
        if (advance && followInput.checked) {
          // One instruction executed in webMARS is one instruction entering the
          // pipeline here. The stages behind it keep whatever they were
          // holding, so stepping the program walks instructions down the pipe
          // instead of emptying it between steps.
          simulator.seekFetched(executionRecords.length, cycleBudget());
        } else if (held > 0) {
          simulator.seekFetched(held, cycleBudget());
        }
        render();
      }

      // A run delivers a batch per loop tick, and each replay costs the whole
      // recording. Coalescing to one frame keeps a long run from spending more
      // time redrawing the pipeline than executing the program.
      let syncFrame = null;
      function requestExecutionSync() {
        pendingExecutionSync = true;
        if (syncFrame !== null) return;
        // Bound to window on purpose: requestAnimationFrame detached from its
        // receiver only works because this file is sloppy-mode script, where a
        // bare call still gets the global as `this`. Under a module or "use
        // strict" the same line throws Illegal invocation.
        const schedule = typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
          ? (callback) => window.requestAnimationFrame(callback)
          : (callback) => setTimeout(callback, 16);
        syncFrame = schedule(() => {
          syncFrame = null;
          syncExecution({ advance: true });
        });
      }

      function applyConfig() {
        selectedUid = null;
        renderCompare(null);
        simulator.setConfig(currentConfig());
        render();
      }

      Object.entries(controls).forEach(([name, node]) => {
        if (name === "profile") return;
        node.addEventListener("change", applyConfig);
      });
      // Presentation only: changing the palette must not restart the run, or a
      // student loses their place for choosing readable colours.
      paletteSelect.addEventListener("change", () => {
        paletteRoot.dataset.palette = paletteSelect.value;
      });
      paletteRoot.dataset.palette = paletteSelect.value;
      controls.profile.addEventListener("change", () => {
        const profile = PROFILES.find((entry) => entry.id === controls.profile.value);
        if (!profile) return;
        syncControls(profile.config);
        applyConfig();
      });

      sourceSelect.addEventListener("change", () => {
        renderCompare(null);
        simulator.setSource(sourceSelect.value);
        if (sourceSelect.value === "execution") syncExecution({ advance: true });
        else {
          selectedUid = null;
          render();
        }
      });
      followInput.addEventListener("change", () => {
        if (followInput.checked && sourceSelect.value === "execution") syncExecution({ advance: true });
        else render();
      });
      [registerFilter, registerBase].forEach((input) => input.addEventListener("change", () => render()));
      panelToggles.forEach((toggle) => toggle.addEventListener("click", () => {
        const name = toggle.dataset.plabToggle;
        const panel = panels[name];
        if (!panel) return;
        panelPreference[name] = panel.hidden;
        applyPanelVisibility();
      }));
      // The tool lays itself out against its own window, so a narrow floating
      // window on a wide desktop gets the same treatment as a phone.
      shell.onResize(({ width }) => applyWidth(width));

      // Whether the runtime can still produce instructions to replay. Driving
      // it from here is only offered when it would actually do something:
      // an unassembled or halted program has nothing left to give.
      function runtimeCanStep() {
        if (!runtimeControls || typeof runtimeControls.step !== "function") return false;
        if (runtimeControls.isAvailable?.() === false) return false;
        if (runtimeControls.isRunning?.() === true) return false;
        return latestSnapshot?.assembled === true && latestSnapshot?.halted !== true;
      }

      function runtimeCanRun() {
        if (!runtimeControls || typeof runtimeControls.go !== "function") return false;
        if (runtimeControls.isAvailable?.() === false) return false;
        if (runtimeControls.isRunning?.() === true) return false;
        return latestSnapshot?.assembled === true && latestSnapshot?.halted !== true;
      }

      function runtimeCanBackstep() {
        if (!runtimeControls || typeof runtimeControls.backstep !== "function") return false;
        if (runtimeControls.isAvailable?.() === false) return false;
        if (runtimeControls.isRunning?.() === true) return false;
        return latestSnapshot?.assembled === true && Number(latestSnapshot?.backstepDepth) > 0;
      }

      // The fetch stage has nothing left to take. Advancing a cycle now would
      // put a bubble in IF that the real machine would not have: it would have
      // fetched the next instruction. So the pipeline asks the runtime to
      // produce one instead of inventing a gap.
      function needsMoreRecording() {
        const snapshot = simulator.snapshot();
        return snapshot.followingExecution
          && snapshot.execution.replayed >= snapshot.execution.recorded;
      }

      function requestRuntimeStep() {
        if (!runtimeCanStep()) return false;
        // The runtime answers with an event, which extends the recording and
        // brings the replay back here through the normal delivery path.
        runtimeControls.step();
        return true;
      }

      function requestRuntimeRun() {
        if (!runtimeCanRun()) return false;
        // As with Step, the runtime extends the recording through its normal
        // event stream. Run must not merely replay an already exhausted model.
        runtimeControls.go();
        return true;
      }

      function requestRuntimeBackstep() {
        if (!runtimeCanBackstep()) return false;
        runtimeControls.backstep();
        return true;
      }

      function seekFetched(count) {
        simulator.seekFetched(count, cycleBudget());
        render();
      }

      // A recorded run is as long as the loop iterations it actually took, not
      // as long as the program text, so the budget follows whichever stream the
      // fetch unit is reading.
      function cycleBudget() {
        const instructions = sourceSelect.value === "execution"
          ? Math.max(simulator.program.length, executionRecords.length)
          : simulator.program.length;
        return Math.min(1000000, Math.max(100, instructions * 4 + 16));
      }

      resetButton.addEventListener("click", () => { simulator.reset(); selectedUid = null; render(); });
      previousButton.addEventListener("click", () => { simulator.back(); render(); });
      nextButton.addEventListener("click", () => {
        // Advancing a cycle the fetch stage cannot feed is only possible if the
        // program runs one more instruction, so the pipeline asks for it. This
        // is what makes the tool's transport whole rather than a viewer that
        // waits for someone to press Step in the main window. When the runtime
        // has nothing left to give -- halted, or not assembled -- the cycle
        // still advances and the pipeline drains, which is the truth.
        if (needsMoreRecording() && requestRuntimeStep()) return;
        simulator.step();
        render();
      });
      runButton.addEventListener("click", () => {
        const snapshot = simulator.snapshot();
        if (
          snapshot.followingExecution
          && snapshot.execution.replayed >= snapshot.execution.recorded
          && requestRuntimeRun()
        ) return;
        simulator.run(cycleBudget());
        render();
      });
      // Instruction granularity: one press moves the pipeline to the cycle in
      // which the next (or previous) webMARS instruction writes back, so both
      // clocks land on the same event instead of drifting apart.
      nextStepButton.addEventListener("click", () => {
        const snapshot = simulator.snapshot();
        if (snapshot.followingExecution) {
          // One press is one instruction, whichever side of the pair still has
          // work: replay the next recorded one, or run the program to produce
          // it. Either way the instruction ends up entering the pipeline.
          if (snapshot.execution.replayed < snapshot.execution.recorded) {
            seekFetched(snapshot.execution.replayed + 1);
            return;
          }
          if (requestRuntimeStep()) return;
          return;
        }
        // Static stream: the same meaning, keyed on the instructions this run
        // has fetched, because there is no recording to count against.
        simulator.seekFetchedInstructions(snapshot.trace.length + 1, cycleBudget());
        render();
      });
      previousStepButton.addEventListener("click", () => {
        const snapshot = simulator.snapshot();
        if (snapshot.followingExecution) {
          if (snapshot.execution.replayed > 0) {
            seekFetched(snapshot.execution.replayed - 1);
            return;
          }
          // Nothing left to rewind here, so the request is passed to the
          // runtime, which un-executes one step and shrinks the recording.
          requestRuntimeBackstep();
          return;
        }
        simulator.seekFetchedInstructions(Math.max(0, snapshot.trace.length - 1), cycleBudget());
        render();
      });
      // Predict-then-run: the student commits to a number before the reveal,
      // so the comparison is against their own stated expectation.
      rootElement.querySelector("[data-plab='check-prediction']").addEventListener("click", () => {
        const predicted = Number(predictionInput.value);
        if (!Number.isFinite(predicted) || predicted <= 0) {
          explanationNode.textContent = t("Type the number of cycles you expect, then press Check prediction.");
          return;
        }
        if (!simulator.program.length) {
          explanationNode.textContent = t("Assemble a program to begin the pipeline simulation.");
          return;
        }
        // Running to the end is what makes the comparison meaningful.
        simulator.run(cycleBudget());
        render();
        const actual = simulator.snapshot().cycle;
        const difference = actual - predicted;
        explanationNode.textContent = difference === 0
          ? t("You predicted {predicted} cycles and the pipeline took exactly that.", { predicted })
          : t("You predicted {predicted} cycles; the pipeline took {actual}, a difference of {difference}.", {
              predicted, actual, difference: difference > 0 ? `+${difference}` : String(difference)
            });
      });
      rootElement.querySelector("[data-plab='compare']").addEventListener("click", () => {
        if (!simulator.program.length) return;
        const rows = latestSnapshot?.textRows || [];
        renderCompare(coreApi.compareConfigurations(rows, undefined, undefined, latestSnapshot?.labels));
      });
      rootElement.querySelector("[data-plab='export-json']").addEventListener("click", () => {
        if (!simulator.program.length) return;
        downloadText("webmars-pipeline-report.json", JSON.stringify(simulator.report(), null, 2), "application/json");
      });
      rootElement.querySelector("[data-plab='export-csv']").addEventListener("click", () => {
        if (!simulator.program.length) return;
        downloadText("webmars-pipeline-timeline.csv", simulator.toCSV("timeline"), "text/csv");
        downloadText("webmars-pipeline-metrics.csv", simulator.toCSV("metrics"), "text/csv");
        // Only a replayed run has register values; exporting an empty sheet
        // would suggest the model had computed something it never did.
        if (simulator.followsExecution()) {
          downloadText("webmars-pipeline-registers.csv", simulator.toCSV("registers"), "text/csv");
        }
      });
      function toggleSelection(uid) {
        selectedUid = selectedUid === uid ? null : uid;
        render();
      }

      timelineNode.addEventListener("click", (event) => {
        const row = event.target instanceof Element ? event.target.closest("tr[data-uid]") : null;
        if (row) toggleSelection(Number(row.dataset.uid));
      });
      // Rows are focusable so the timeline is usable without a pointer.
      timelineNode.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const row = event.target instanceof Element ? event.target.closest("tr[data-uid]") : null;
        if (!row) return;
        event.preventDefault();
        toggleSelection(Number(row.dataset.uid));
      });
      viewTabs.forEach((tab) => tab.addEventListener("click", () => {
        selectView(tab.dataset.plabViewTab);
        render();
      }));
      rootElement.querySelectorAll("[data-plab-group]").forEach((toggle) => {
        toggle.addEventListener("change", () => {
          const group = datapathNode.querySelector(`.plab-arch-group[data-group='${toggle.dataset.plabGroup}']`);
          if (group) group.hidden = !toggle.checked;
        });
      });
      rootElement.querySelector("[data-plab='close']").addEventListener("click", shell.close);

      subscribeLanguageChange(() => {
        shell.refreshTranslations?.();
        translateDatapath();
        render();
      });
      translateDatapath();
      selectView("learn");
      paletteRoot.dataset.plabWidth = widthClass;
      applyPanelVisibility();
      render();

      return {
        root: rootElement,
        // The tool manager treats isConnected() as "wants runtime updates".
        // The Pipeline Lab has no MMIO connect button, so it is always willing:
        // returning false would deliver a snapshot only at creation time and
        // leave the timeline stale after every later assembly.
        isConnected: () => true,
        open() {
          shell.open();
          if (latestSnapshot) loadSnapshot(latestSnapshot);
          if (pendingExecutionSync) syncExecution({ advance: true });
        },
        close: shell.close,
        onSnapshot(snapshot) {
          loadSnapshot(snapshot);
        },
        // Backstep is delivered here rather than in the event stream, so a tool
        // that only listens to onRuntimeEvent silently keeps replaying
        // instructions the runtime has already un-executed.
        onBackstep(event) {
          if (!event || !rewindRecording(event.stepAfter)) return;
          requestExecutionSync();
        },
        // Recording is unconditional so that switching to the recorded stream
        // never requires re-running the program; replaying it is what costs,
        // and that is deferred to the end of a batch.
        onRuntimeEvent(event, delivery = {}) {
          if (!event) return;
          const changed = event.type === "backstep"
            ? rewindRecording(event.stepAfter)
            : recordRuntimeEvent(event);
          if (!changed) return;
          if (delivery.isLast !== false) requestExecutionSync();
          else pendingExecutionSync = true;
        },
        onRuntimeEventBatch(events) {
          if (!Array.isArray(events) || !events.length) return;
          let changed = false;
          events.forEach((event) => {
            if (!event) return;
            const applied = event.type === "backstep"
              ? rewindRecording(event.stepAfter)
              : recordRuntimeEvent(event);
            changed = changed || applied;
          });
          if (!changed) return;
          // One replay for the whole batch: replaying per instruction would
          // rebuild the timeline from cycle 0 on every step of a fast run.
          requestExecutionSync();
        }
      };
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
