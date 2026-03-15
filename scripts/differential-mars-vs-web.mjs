import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const webRoot = resolve(repoRoot, "web");
const javaRunnerSource = resolve(webRoot, "scripts", "java", "MarsDifferentialRunner.java");
const javaBuildDir = resolve(webRoot, "test-results", ".java-diff-build");
const resultDir = resolve(webRoot, "test-results");
const defaultOutputPath = resolve(resultDir, "differential-mars-vs-web.json");

const EDGE_PATH = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT = Number(process.env.EDGE_DEBUG_PORT || 9224);
const APP_PORT = Number(process.env.DIFF_APP_PORT || 8082);
const TARGET_URL = process.env.DIFF_TARGET_URL || `http://localhost:${APP_PORT}/`;
const WEB_BACKEND = String(process.env.DIFF_WEB_BACKEND || "wasm").trim().toLowerCase();
const JAVA_CMD = process.env.JAVA_CMD || "java";
const JAVAC_CMD = process.env.JAVAC_CMD || "javac";
const JAVA_SOURCE_ENCODING = process.env.JAVA_SOURCE_ENCODING || (process.platform === "win32" ? "windows-1252" : "UTF-8");
const DEFAULT_TIMEOUT_MS = Number(process.env.DIFF_TIMEOUT_MS || 180000);
const JAVA_CLASSPATH_SEPARATOR = process.platform === "win32" ? ";" : ":";

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

function parseArgs(argv) {
  const options = {
    output: defaultOutputPath,
    casesPath: "",
    targetUrl: TARGET_URL,
    appPort: APP_PORT,
    timeoutMs: DEFAULT_TIMEOUT_MS
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output" && i + 1 < argv.length) {
      options.output = resolve(repoRoot, argv[++i]);
    } else if (arg === "--cases" && i + 1 < argv.length) {
      options.casesPath = resolve(repoRoot, argv[++i]);
    } else if (arg === "--target-url" && i + 1 < argv.length) {
      options.targetUrl = String(argv[++i]);
    } else if (arg === "--app-port" && i + 1 < argv.length) {
      options.appPort = Number(argv[++i]);
    } else if (arg === "--timeout-ms" && i + 1 < argv.length) {
      options.timeoutMs = Number(argv[++i]);
    }
  }
  return options;
}

function defaultCases() {
  return [
    {
      id: "delay_branch_off",
      area: "branches-delay-slot",
      description: "Branch semantics with delayed branching disabled.",
      settings: { delayedBranching: false },
      source: `.text
main:
  addiu $t0, $zero, 1
  addiu $t1, $zero, 0
  beq $t0, $t0, done
  addiu $t1, $t1, 5
done:
  li $v0, 10
  syscall
`
    },
    {
      id: "delay_branch_on",
      area: "branches-delay-slot",
      description: "Branch semantics with delayed branching enabled.",
      settings: { delayedBranching: true },
      source: `.text
main:
  addiu $t0, $zero, 1
  addiu $t1, $zero, 0
  beq $t0, $t0, done
  addiu $t1, $t1, 5
done:
  li $v0, 10
  syscall
`
    },
    {
      id: "unaligned_exception",
      area: "exceptions",
      description: "Unaligned LW should raise address exception.",
      settings: {},
      source: `.data
buf: .space 8
.text
main:
  la $t0, buf
  addiu $t0, $t0, 1
  lw $t1, 0($t0)
  li $v0, 10
  syscall
`
    },
    {
      id: "trap_teq",
      area: "traps",
      description: "Trap instruction side effect and exception state.",
      settings: {},
      source: `.text
main:
  li $t0, 1
  li $t1, 1
  teq $t0, $t1
  li $v0, 10
  syscall
`
    },
    {
      id: "fpu_round_and_flag",
      area: "fpu-rounding-flags",
      description: "FPU round + compare/flag behavior.",
      settings: {},
      source: `.data
value: .float 1.5
.text
main:
  lwc1 $f0, value
  round.w.s $f2, $f0
  c.eq.s $f0, $f0
  bc1t done
  nop
done:
  li $v0, 10
  syscall
`
    },
    {
      id: "syscall_output_side_effect",
      area: "syscall-side-effects",
      description: "Console-output syscalls must produce equivalent output.",
      settings: {},
      source: `.text
main:
  li $a0, 42
  li $v0, 1
  syscall
  li $a0, 10
  li $v0, 11
  syscall
  li $v0, 10
  syscall
`
    },
  ];
}

function collectJavaSources(root) {
  const results = [];
  const marsDir = resolve(root, "mars");
  const marsEntry = resolve(root, "Mars.java");
  const walk = (dir) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "web") return;
        walk(fullPath);
        return;
      }
      if (!entry.isFile()) return;
      if (!fullPath.endsWith(".java")) return;
      if (fullPath.startsWith(marsDir) || fullPath === marsEntry) {
        results.push(fullPath);
      }
    });
  };
  walk(root);
  results.push(javaRunnerSource);
  return Array.from(new Set(results));
}

function ensureJavaTools() {
  const javaVersion = spawnSync(JAVA_CMD, ["-version"], { encoding: "utf8", cwd: repoRoot });
  if (javaVersion.status !== 0) {
    throw new Error(
      `Java runtime not found (${JAVA_CMD}). Install Java and ensure "${JAVA_CMD}" is in PATH.`
    );
  }
  const javacVersion = spawnSync(JAVAC_CMD, ["-version"], { encoding: "utf8", cwd: repoRoot });
  if (javacVersion.status !== 0) {
    throw new Error(
      `Java compiler not found (${JAVAC_CMD}). Install JDK and ensure "${JAVAC_CMD}" is in PATH.`
    );
  }
}

function ensureJavaRunnerCompiled() {
  ensureJavaTools();
  mkdirSync(javaBuildDir, { recursive: true });
  const marker = resolve(javaBuildDir, ".compiled.marker");
  const runnerClass = resolve(javaBuildDir, "MarsDifferentialRunner.class");
  const javaSources = collectJavaSources(repoRoot);
  let needCompile = !existsSync(runnerClass) || !existsSync(marker);
  if (!needCompile) {
    const markerMtime = statSync(marker).mtimeMs;
    needCompile = javaSources.some((sourcePath) => {
      try {
        return statSync(sourcePath).mtimeMs > markerMtime;
      } catch {
        return true;
      }
    });
  }
  if (!needCompile) return;

  const argFile = resolve(javaBuildDir, "javac-files.txt");
  writeFileSync(
    argFile,
    javaSources.map((file) => `"${file.replace(/\\/g, "/")}"`).join("\n"),
    "utf8"
  );

  const compile = spawnSync(
    JAVAC_CMD,
    ["-encoding", JAVA_SOURCE_ENCODING, "-d", javaBuildDir, `@${argFile}`],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );
  if (compile.status !== 0) {
    throw new Error(
      `Failed to compile Java differential runner.\nstdout:\n${compile.stdout}\nstderr:\n${compile.stderr}`
    );
  }
  writeFileSync(marker, new Date().toISOString(), "utf8");
}

async function waitForHttpReady(url) {
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Keep polling.
    }
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function getTarget(debugPort, targetUrl) {
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const targets = await response.json();
      const page = targets.find((entry) => String(entry?.url || "").startsWith(targetUrl));
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      // Keep waiting.
    }
    await wait(250);
  }
  throw new Error(`No DevTools target found for ${targetUrl}`);
}

async function createCdpClient(page) {
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 1;

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolvePending, rejectPending } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectPending(new Error(message.error.message || "CDP error"));
    else resolvePending(message.result);
  };

  await new Promise((resolveOpen, rejectOpen) => {
    socket.onopen = resolveOpen;
    socket.onerror = rejectOpen;
  });

  const send = (method, params = {}) => new Promise((resolvePending, rejectPending) => {
    const id = nextId++;
    pending.set(id, { resolvePending, rejectPending });
    socket.send(JSON.stringify({ id, method, params }));
  });

  return { socket, send };
}

function normalizeText(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeDiagnosticMessage(text) {
  const normalized = normalizeText(text).replace(/\\/g, "/");
  const includeMatch = /^error reading include file (.+)$/.exec(normalized);
  if (includeMatch) {
    const rawPath = String(includeMatch[1] || "").trim();
    const basename = rawPath.split("/").filter(Boolean).pop() || rawPath;
    return `error reading include file ${basename}`;
  }
  return normalized;
}

function toHex(value) {
  return `0x${(Number(value) >>> 0).toString(16).padStart(8, "0")}`;
}

function normalizeMessages(messages = []) {
  return messages.map((entry) => ({
    line: Number(entry?.line ?? 0) | 0,
    message: String(entry?.message ?? ""),
    normalized: normalizeDiagnosticMessage(entry?.message ?? "")
  }));
}

function runJavaCase(sourcePath, testCase, sampledAddresses) {
  const memoryAddressesArg = sampledAddresses.map((address) => toHex(address)).join(",");
  const classpath = `${javaBuildDir}${JAVA_CLASSPATH_SEPARATOR}${repoRoot}`;
  const args = [
    "-cp",
    classpath,
    "MarsDifferentialRunner",
    "--source",
    sourcePath,
    "--memory-configuration",
    String(testCase.memoryConfiguration || "Default"),
    "--extended-assembler",
    String(testCase.settings?.extendedAssembler !== false),
    "--warnings-are-errors",
    String(testCase.settings?.warningsAreErrors === true),
    "--delayed-branching",
    String(testCase.settings?.delayedBranching === true),
    "--start-at-main",
    String(testCase.settings?.startAtMain === true),
    "--self-modifying-code",
    String(testCase.settings?.selfModifyingCode === true),
    "--program-arguments-enabled",
    String(testCase.settings?.programArguments === true),
    "--program-arguments",
    String(testCase.settings?.programArgumentsLine || ""),
    "--max-steps",
    String(Number(testCase.maxSteps || 100000) | 0),
    "--memory-addresses",
    memoryAddressesArg
  ];

  const run = spawnSync(JAVA_CMD, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });

  if (run.status !== 0) {
    throw new Error(`Java runner failed for case "${testCase.id}".\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
  }
  return JSON.parse(run.stdout || "{}");
}

function buildWebCaseExpression(testCase) {
  const payload = JSON.stringify({
    id: testCase.id,
    source: testCase.source,
    sourceName: testCase.sourceName || `${testCase.id}.s`,
    files: testCase.files && typeof testCase.files === "object" ? testCase.files : {},
    settings: testCase.settings || {},
    maxSteps: Number(testCase.maxSteps || 100000) | 0
  });

  return `(async () => {
    const testCase = ${payload};
    const baseSettings = { ...DEFAULT_SETTINGS, ...testCase.settings, coreBackend: "${WEB_BACKEND}" };
    const includeMap = new Map(Object.entries(testCase.files || {}).map(([name, text]) => [String(name), String(text ?? "")]));
    const engine = createMarsEngine({
      settings: baseSettings,
      memoryMap: { ...DEFAULT_MEMORY_MAP }
    });
    if (typeof engine.whenReady === "function") {
      await engine.whenReady();
    }

    const assembled = engine.assemble(testCase.source, {
      sourceName: testCase.sourceName || (testCase.id + ".s"),
      includeMap,
      programArgumentsEnabled: baseSettings.programArguments === true,
      programArguments: baseSettings.programArgumentsLine || ""
    });

    let runResult = null;
    const runIoOutputs = [];
    let guard = 0;
    if (assembled && assembled.ok) {
      while (guard < testCase.maxSteps) {
        guard += 1;
        runResult = engine.step({ includeSnapshot: false });
        if (runResult?.runIo) runIoOutputs.push(String(runResult?.message || ""));
        if (!runResult?.ok || runResult?.done || runResult?.waitingForInput || runResult?.stoppedOnBreakpoint) break;
      }
    }

    const snapshot = engine.getSnapshot({
      includeDataRows: false,
      includeLabels: true,
      includeTextRows: true,
      includeRegisters: true,
      includeMemoryWords: true
    });

    const nativeState = typeof engine.exportNativeState === "function"
      ? engine.exportNativeState({ includeProgram: true, includeExecutionPlan: true })
      : null;

    const byAddress = new Map();
    const applyRow = (row) => {
      const address = Number(row?.address) >>> 0;
      const existing = byAddress.get(address) || { address, line: 0, basic: "", machineCodeHex: "" };
      if (row?.line != null) existing.line = Number(row.line) | 0;
      if (typeof row?.basic === "string" && row.basic.trim()) existing.basic = row.basic;
      if (typeof row?.source === "string" && !existing.basic && row.source.trim()) existing.basic = row.source;
      if (typeof row?.machineCodeHex === "string" && row.machineCodeHex.trim()) {
        existing.machineCodeHex = row.machineCodeHex.trim();
      }
      byAddress.set(address, existing);
    };

    (Array.isArray(snapshot?.textRows) ? snapshot.textRows : []).forEach(applyRow);
    (Array.isArray(nativeState?.textRows) ? nativeState.textRows : []).forEach(applyRow);

    const memoryWords = [];
    if (snapshot?.memoryWords instanceof Map) {
      snapshot.memoryWords.forEach((value, address) => {
        memoryWords.push({
          address: Number(address) >>> 0,
          value: Number(value) | 0,
          valueHex: "0x" + ((Number(value) >>> 0).toString(16).padStart(8, "0"))
        });
      });
    } else if (Array.isArray(snapshot?.memoryWords)) {
      snapshot.memoryWords.forEach((entry) => {
        memoryWords.push({
          address: Number(entry?.address ?? 0) >>> 0,
          value: Number(entry?.value ?? 0) | 0,
          valueHex: "0x" + ((Number(entry?.value ?? 0) >>> 0).toString(16).padStart(8, "0"))
        });
      });
    }

    const memoryBytes = [];
    const memoryByteAddresses = new Set();
    memoryWords.forEach((entry) => {
      const base = Number(entry?.address ?? 0) >>> 0;
      for (let i = 0; i < 4; i += 1) memoryByteAddresses.add((base + i) >>> 0);
    });
    memoryByteAddresses.forEach((address) => {
      try {
        const value = Number(engine.readByte(address, false)) & 0xff;
        memoryBytes.push({
          address,
          value,
          valueHex: "0x" + value.toString(16).padStart(2, "0"),
          present: true
        });
      } catch {
        memoryBytes.push({
          address,
          value: null,
          valueHex: null,
          present: false
        });
      }
    });

    const labels = (Array.isArray(snapshot?.labels) ? snapshot.labels : []).map((entry) => ({
      label: String(entry?.label || ""),
      address: Number(entry?.address || 0) >>> 0
    }));

    const registers = (Array.isArray(snapshot?.registers) ? snapshot.registers : []).map((entry) => ({
      name: String(entry?.name || ""),
      value: Number(entry?.value || 0) | 0,
      valueHex: String(entry?.valueHex || "")
    }));

    return {
      caseId: testCase.id,
      assembledOk: Boolean(assembled?.ok),
      warnings: Array.isArray(assembled?.warnings) ? assembled.warnings : [],
      errors: Array.isArray(assembled?.errors) ? assembled.errors : [],
      runResult,
      runIoOutputs,
      textRows: Array.from(byAddress.values()).sort((a, b) => a.address - b.address),
      labels,
      registers,
      pc: Number(snapshot?.pc || 0) >>> 0,
      cop0: Array.isArray(snapshot?.cop0) ? snapshot.cop0.map((value) => Number(value) | 0) : [],
      cop1: Array.isArray(snapshot?.cop1) ? snapshot.cop1.map((value) => Number(value) | 0) : [],
      fpuFlags: Array.isArray(snapshot?.fpuFlags) ? snapshot.fpuFlags.map((value) => Number(value) | 0) : [],
      memoryBytes: memoryBytes.sort((a, b) => a.address - b.address),
      memoryWords: memoryWords.sort((a, b) => a.address - b.address),
      nativeBackend: engine.getBackendInfo ? engine.getBackendInfo() : null
    };
  })()`;
}

function buildAddressSample(webResult) {
  const addresses = new Set();
  (webResult.textRows || []).forEach((row) => addresses.add(Number(row.address) >>> 0));
  (webResult.memoryWords || []).forEach((row) => addresses.add(Number(row.address) >>> 0));
  const spEntry = (webResult.registers || []).find((row) => row.name === "$sp");
  if (spEntry) {
    const sp = Number(spEntry.value) >>> 0;
    for (let i = 0; i < 16; i += 1) {
      addresses.add((sp + i * 4) >>> 0);
    }
  }
  return Array.from(addresses).sort((a, b) => a - b);
}

function mapBy(list, keyFn) {
  const map = new Map();
  list.forEach((entry) => map.set(keyFn(entry), entry));
  return map;
}

function toNumberValueMap(values) {
  const map = new Map();
  if (!Array.isArray(values)) return map;
  values.forEach((entry, index) => {
    if (entry && typeof entry === "object" && Number.isFinite(entry.number)) {
      map.set(Number(entry.number) | 0, Number(entry.value) | 0);
      return;
    }
    if (Number.isFinite(entry)) {
      map.set(index | 0, Number(entry) | 0);
    }
  });
  return map;
}

function mapMemoryBytes(entries = []) {
  const map = new Map();
  if (!Array.isArray(entries)) return map;
  entries.forEach((entry) => {
    const address = Number(entry?.address ?? 0) >>> 0;
    map.set(address, {
      present: entry?.present === true || Number.isFinite(entry?.value),
      value: Number(entry?.value ?? 0) & 0xff
    });
  });
  return map;
}

function equalWordBytesAt(address, webBytes, javaBytes) {
  for (let i = 0; i < 4; i += 1) {
    const addr = (address + i) >>> 0;
    const web = webBytes.get(addr);
    const java = javaBytes.get(addr);
    const webPresent = web?.present === true;
    const javaPresent = java?.present === true;
    if (webPresent !== javaPresent) return false;
    if (webPresent && ((web.value & 0xff) !== (java.value & 0xff))) return false;
  }
  return true;
}

function compareMessages(kind, webMessages, javaMessages) {
  const web = normalizeMessages(webMessages);
  const java = normalizeMessages(javaMessages);
  const webSet = new Set(web.map((entry) => `${entry.line}|${entry.normalized}`));
  const javaSet = new Set(java.map((entry) => `${entry.line}|${entry.normalized}`));
  const missingInWeb = Array.from(javaSet).filter((key) => !webSet.has(key));
  const extraInWeb = Array.from(webSet).filter((key) => !javaSet.has(key));
  return {
    kind,
    webCount: web.length,
    javaCount: java.length,
    missingInWeb,
    extraInWeb
  };
}

function compareCase(testCase, webResult, javaResult) {
  const mismatches = [];

  if (Boolean(webResult.assembledOk) !== Boolean(javaResult.assembledOk)) {
    mismatches.push({
      area: "assemble",
      detail: `assembledOk differs (web=${webResult.assembledOk}, java=${javaResult.assembledOk})`
    });
  }

  const warningDiff = compareMessages("warnings", webResult.warnings, javaResult.warnings);
  if (warningDiff.missingInWeb.length || warningDiff.extraInWeb.length) {
    mismatches.push({ area: "warnings", detail: warningDiff });
  }
  const errorDiff = compareMessages("errors", webResult.errors, javaResult.errors);
  if (errorDiff.missingInWeb.length || errorDiff.extraInWeb.length) {
    mismatches.push({ area: "errors", detail: errorDiff });
  }

  const webLabels = mapBy(webResult.labels || [], (entry) => String(entry.label || ""));
  const javaLabels = mapBy(javaResult.labels || [], (entry) => String(entry.label || ""));
  const labelNames = new Set([...webLabels.keys(), ...javaLabels.keys()]);
  labelNames.forEach((label) => {
    const web = webLabels.get(label);
    const java = javaLabels.get(label);
    if (!web || !java) {
      mismatches.push({ area: "labels", detail: `Missing label '${label}' in ${!web ? "web" : "java"}` });
      return;
    }
    if ((Number(web.address) >>> 0) !== (Number(java.address) >>> 0)) {
      mismatches.push({
        area: "labels",
        detail: `Label '${label}' address differs (web=${toHex(web.address)}, java=${toHex(java.address)})`
      });
    }
  });

  const webText = mapBy(webResult.textRows || [], (entry) => Number(entry.address) >>> 0);
  const javaText = mapBy(javaResult.machineCode || [], (entry) => Number(entry.address) >>> 0);
  const textAddresses = new Set([...webText.keys(), ...javaText.keys()]);
  textAddresses.forEach((address) => {
    const web = webText.get(address);
    const java = javaText.get(address);
    if (!web || !java) {
      mismatches.push({ area: "binary", detail: `Missing text row @ ${toHex(address)} in ${!web ? "web" : "java"}` });
      return;
    }
    const webHex = String(web.machineCodeHex || "").trim();
    const javaHex = String(java.machineCodeHex || "").trim();
    if (webHex && javaHex && webHex.toLowerCase() !== javaHex.toLowerCase()) {
      mismatches.push({
        area: "binary",
        detail: `Machine code mismatch @ ${toHex(address)} (web=${webHex}, java=${javaHex})`
      });
    }
  });

  if ((Number(webResult.pc) >>> 0) !== (Number(javaResult?.finalState?.pc) >>> 0)) {
    mismatches.push({
      area: "pc",
      detail: `PC mismatch (web=${toHex(webResult.pc)}, java=${toHex(javaResult?.finalState?.pc || 0)})`
    });
  }

  const webRegisters = mapBy(webResult.registers || [], (entry) => String(entry.name || ""));
  const javaRegisters = mapBy(javaResult?.finalState?.registers || [], (entry) => String(entry.name || ""));
  const regNames = new Set([...webRegisters.keys(), ...javaRegisters.keys()]);
  regNames.forEach((name) => {
    const web = webRegisters.get(name);
    const java = javaRegisters.get(name);
    if (!web || !java) return;
    if ((Number(web.value) | 0) !== (Number(java.value) | 0)) {
      mismatches.push({
        area: "registers",
        detail: `Register ${name} mismatch (web=${toHex(web.value)}, java=${toHex(java.value)})`
      });
    }
  });

  const webCop0 = toNumberValueMap(webResult.cop0);
  const javaCop0 = toNumberValueMap(javaResult?.finalState?.cop0);
  javaCop0.forEach((javaValue, registerNumber) => {
    if (!webCop0.has(registerNumber)) return;
    const webValue = webCop0.get(registerNumber);
    if ((webValue | 0) !== (javaValue | 0)) {
      mismatches.push({
        area: "cop0",
        detail: `COP0[${registerNumber}] mismatch (web=${toHex(webValue)}, java=${toHex(javaValue)})`
      });
    }
  });

  const webCop1 = toNumberValueMap(webResult.cop1);
  const javaCop1 = toNumberValueMap(javaResult?.finalState?.cop1);
  javaCop1.forEach((javaValue, registerNumber) => {
    if (!webCop1.has(registerNumber)) return;
    const webValue = webCop1.get(registerNumber);
    if ((webValue | 0) !== (javaValue | 0)) {
      mismatches.push({
        area: "cop1",
        detail: `COP1[${registerNumber}] mismatch (web=${toHex(webValue)}, java=${toHex(javaValue)})`
      });
    }
  });

  const webFlags = Array.isArray(webResult.fpuFlags) ? webResult.fpuFlags : [];
  const javaFlags = Array.isArray(javaResult?.finalState?.fpuFlags) ? javaResult.finalState.fpuFlags : [];
  const fpuFlagLength = Math.min(webFlags.length, javaFlags.length);
  for (let i = 0; i < fpuFlagLength; i += 1) {
    if ((Number(webFlags[i]) | 0) !== (Number(javaFlags[i]) | 0)) {
      mismatches.push({
        area: "fpu-flags",
        detail: `FPU condition flag[${i}] mismatch (web=${Number(webFlags[i]) | 0}, java=${Number(javaFlags[i]) | 0})`
      });
    }
  }

  const webMemory = mapBy(webResult.memoryWords || [], (entry) => Number(entry.address) >>> 0);
  const javaMemory = mapBy(javaResult?.finalState?.memoryWords || [], (entry) => Number(entry.address) >>> 0);
  const webMemoryBytes = mapMemoryBytes(webResult.memoryBytes || []);
  const javaMemoryBytes = mapMemoryBytes(javaResult?.finalState?.memoryBytes || []);
  const memAddresses = new Set([...webMemory.keys(), ...javaMemory.keys()]);
  memAddresses.forEach((address) => {
    const web = webMemory.get(address);
    const java = javaMemory.get(address);
    if (!web || !java) return;
    const webPresent = web.value !== undefined && web.value !== null;
    const javaPresent = java.present === true && java.value !== null;
    if (webPresent !== javaPresent) {
      mismatches.push({
        area: "memory",
        detail: `Memory presence mismatch @ ${toHex(address)} (web=${webPresent}, java=${javaPresent})`
      });
      return;
    }
    if (webPresent && ((Number(web.value) | 0) !== (Number(java.value) | 0))) {
      if (equalWordBytesAt(address >>> 0, webMemoryBytes, javaMemoryBytes)) {
        return;
      }
      mismatches.push({
        area: "memory",
        detail: `Memory word mismatch @ ${toHex(address)} (web=${toHex(web.value)}, java=${toHex(java.value)})`
      });
    }
  });

  const webOutput = String((webResult.runIoOutputs || []).join(""));
  const javaOutput = String(javaResult.consoleOutput || "");
  if (normalizeText(webOutput) !== normalizeText(javaOutput)) {
    mismatches.push({
      area: "syscall-output",
      detail: `Output mismatch (web='${webOutput}', java='${javaOutput}')`
    });
  }

  return {
    caseId: testCase.id,
    area: testCase.area,
    description: testCase.description,
    pass: mismatches.length === 0,
    mismatchCount: mismatches.length,
    mismatches
  };
}

async function runWebCase(send, testCase) {
  const response = await send("Runtime.evaluate", {
    expression: buildWebCaseExpression(testCase),
    awaitPromise: true,
    returnByValue: true
  });
  if (!response?.result) {
    throw new Error(`Web runner returned no result for case '${testCase.id}'.`);
  }
  if (response.result.subtype === "error") {
    throw new Error(`Web runner runtime error for case '${testCase.id}': ${response.result.description || response.result.value}`);
  }
  return response.result.value;
}

async function runDifferentialCases(cases, options) {
  ensureJavaRunnerCompiled();
  mkdirSync(resultDir, { recursive: true });

  const sourceTmpDir = mkdtempSync(join(tmpdir(), "webmars-diff-"));
  const userDataDir = mkdtempSync(join(tmpdir(), "webmars-diff-edge-"));
  const server = spawn("node", [resolve(repoRoot, "scripts", "serve-web.mjs")], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(options.appPort) },
    stdio: "ignore",
    detached: false
  });
  const browser = spawn(EDGE_PATH, [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    options.targetUrl
  ], {
    stdio: "ignore",
    detached: false
  });

  const report = {
    generatedAt: new Date().toISOString(),
    targetUrl: options.targetUrl,
    totalCases: cases.length,
    passedCases: 0,
    failedCases: 0,
    cases: [],
    summaryByArea: {}
  };

  try {
    await waitForHttpReady(options.targetUrl);
    const page = await getTarget(DEBUG_PORT, options.targetUrl);
    const { socket, send } = await createCdpClient(page);
    try {
      await send("Page.enable");
      await send("Runtime.enable");
      await wait(1200);

      for (const testCase of cases) {
        const sourceName = String(testCase.sourceName || `${testCase.id}.s`);
        const sourcePath = resolve(sourceTmpDir, sourceName);
        mkdirSync(dirname(sourcePath), { recursive: true });
        writeFileSync(sourcePath, String(testCase.source || ""), "utf8");
        if (testCase.files && typeof testCase.files === "object") {
          Object.entries(testCase.files).forEach(([relativePath, content]) => {
            const targetPath = resolve(sourceTmpDir, String(relativePath));
            mkdirSync(dirname(targetPath), { recursive: true });
            writeFileSync(targetPath, String(content ?? ""), "utf8");
          });
        }

        const webResult = await runWebCase(send, testCase);
        const sampledAddresses = buildAddressSample(webResult);
        const javaResult = runJavaCase(sourcePath, testCase, sampledAddresses);
        const comparison = compareCase(testCase, webResult, javaResult);

        report.cases.push({
          ...comparison,
          sampledAddressCount: sampledAddresses.length,
          webBackend: webResult.nativeBackend || null
        });

        const area = String(testCase.area || "uncategorized");
        const areaStats = report.summaryByArea[area] || { total: 0, passed: 0, failed: 0 };
        areaStats.total += 1;
        if (comparison.pass) areaStats.passed += 1;
        else areaStats.failed += 1;
        report.summaryByArea[area] = areaStats;
      }
    } finally {
      socket.close();
    }
  } finally {
    try { server.kill(); } catch {}
    try { browser.kill(); } catch {}
    try { rmSync(sourceTmpDir, { recursive: true, force: true }); } catch {}
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }

  report.passedCases = report.cases.filter((entry) => entry.pass).length;
  report.failedCases = report.cases.length - report.passedCases;
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let cases = defaultCases();
  if (options.casesPath) {
    const raw = readFileSync(options.casesPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`Invalid cases file: expected array at ${options.casesPath}`);
    }
    cases = parsed;
  }

  if (!cases.length) {
    throw new Error("No differential test cases provided.");
  }

  const report = await runDifferentialCases(cases, options);
  mkdirSync(dirname(options.output), { recursive: true });
  writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const statusLine = `[differential] cases=${report.totalCases} passed=${report.passedCases} failed=${report.failedCases}`;
  console.log(statusLine);
  console.log(`[differential] report=${options.output}`);

  if (report.failedCases > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[differential] ${error?.stack || error}`);
  process.exitCode = 1;
});
