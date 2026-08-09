// Differential test suite: webMARS versus MARS 4.5.
//
// For each program in tests/differential/programs, both simulators assemble and
// run the same source under equivalent settings, and four observable results
// are compared word for word:
//
//   text     the assembled machine code of the text segment
//   data     the assembled contents of the data segment
//   output   everything the program wrote to the console
//   registers the final value of every general-purpose register
//
// Diagnostics are compared separately, on programs that are meant to fail: what
// matters there is that both simulators reject the same source and point at the
// same line, not that they phrase the message identically.
//
// A difference is a defect unless it is listed in INTENTIONAL_DIFFERENCES with
// a reason. That list is the whole point of the exercise: "compatible with MARS"
// is only a meaningful claim when the exceptions are written down.
//
// Usage:
//   node scripts/differential-mars.mjs              run everything, write the report
//   node scripts/differential-mars.mjs --no-write   do not touch the report
//   node scripts/differential-mars.mjs --only <name>

import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { MARS_REFERENCE, referenceStatus } from "./fetch-mars-reference.mjs";

const run = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const programsRoot = resolve(projectRoot, "tests/differential/programs");
const reportPath = resolve(projectRoot, "docs/mars-conformance.md");

// MARS names its 32 general-purpose registers in this order; webMARS exports
// them by index, so the mapping has to be explicit rather than assumed.
const REGISTER_NAMES = Object.freeze([
  "$zero", "$at", "$v0", "$v1", "$a0", "$a1", "$a2", "$a3",
  "$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6", "$t7",
  "$s0", "$s1", "$s2", "$s3", "$s4", "$s5", "$s6", "$s7",
  "$t8", "$t9", "$k0", "$k1", "$gp", "$sp", "$fp", "$ra"
]);

// Registers whose final value is not a property of the program under test.
// $at is scratch for pseudo-instruction expansion and both simulators are free
// to leave anything in it; $k0/$k1 belong to the exception handler.
const VOLATILE_REGISTERS = new Set(["$at", "$k0", "$k1"]);

// Every accepted divergence, with the reason it is accepted. A difference not
// listed here fails the run.
export const INTENTIONAL_DIFFERENCES = Object.freeze([
  {
    id: "diagnostic-wording",
    scope: "diagnostics",
    summary: "Diagnostic wording differs; the rejected line must still match.",
    reason: "webMARS messages are translated into twenty languages, so they cannot be byte-identical to the English originals. The comparison checks that both simulators reject the same source and blame the same line."
  },
  {
    id: "volatile-scratch-registers",
    scope: "registers",
    summary: "$at, $k0 and $k1 are excluded from the register comparison.",
    reason: "$at is assembler scratch whose residue depends on which pseudo-instruction expanded last; $k0 and $k1 belong to the exception handler. Neither is a defined result of a user program."
  },
  {
    id: "stack-pointer-base",
    scope: "registers",
    summary: "$sp, $fp and $gp are compared as deltas from their initial value, not absolutely.",
    reason: "The absolute stack and global pointers come from the memory map, which is configurable. What a program is entitled to rely on is how far it moved them, not where they started."
  },
  {
    id: "li-32bit-preserves-at",
    scope: "encoding",
    summary: "A 32-bit `li` expands without using $at, so the two `lui`/`ori` words differ.",
    reason: "MARS expands `li $t0, 0x12345678` as `lui $at, 0x1234` + `ori $t0, $at, 0x5678`, which destroys $at. webMARS expands it as `lui $t0, 0x1234` + `ori $t0, $t0, 0x5678`, which leaves $at untouched. Both leave the same value in the destination; the instruction count is the same, so no address moves. Verified on tests/differential/cases/case-li-clobbers-at.asm: after `li $at, 999` followed by a 32-bit `li`, MARS reports $at = 305397760 and webMARS reports 999. Keeping $at intact is a deliberate choice - it makes the register usable by hand-written code - and reverting it would be a downgrade, not a fix.",
    minimalCase: "tests/differential/cases/case-li-clobbers-at.asm"
  },
  {
    id: "ble-immediate-cannot-overflow",
    scope: "encoding",
    summary: "`ble`/`bge` against an immediate expand to a sequence that cannot trap.",
    reason: "MARS expands `ble $t0, 5, label` as `addi $at, $t0, -1` + `slti $at, $at, 5` + `bne`. The leading `addi` traps on signed overflow, so the comparison itself raises an exception when $t0 holds -2147483648. webMARS expands it as `addiu $at, $zero, 5` + `slt $at, $at, $t0` + `beq`, which cannot overflow. Verified on tests/differential/cases/case-ble-immediate-min.asm: MARS terminates with \"Runtime exception at 0x00400004: arithmetic overflow\" while webMARS evaluates the comparison and prints 1. A comparison that traps on a legal input is a defect in the expansion, so webMARS does not reproduce it.",
    minimalCase: "tests/differential/cases/case-ble-immediate-min.asm"
  }
]);

function hexWord(value) {
  return (value >>> 0).toString(16).padStart(8, "0");
}

// --- MARS -------------------------------------------------------------------

async function runMars(java, sourcePath, workDir) {
  // A fresh dump path per program: MARS leaves the previous file untouched when
  // a segment was never written, so a shared path silently compares one
  // program's data segment against another's.
  const stem = basename(sourcePath, ".asm");
  const textDump = resolve(workDir, `${stem}.text.hex`);
  const dataDump = resolve(workDir, `${stem}.data.hex`);
  const jar = resolve(projectRoot, "vendor/mars/Mars4_5.jar");

  const registerArgs = REGISTER_NAMES.filter((name) => name !== "$zero");
  const args = [
    "-jar", jar,
    // `me` sends MARS's own warnings and errors to stderr, leaving stdout as
    // the program's console output followed by the requested registers.
    "nc", "me", "sm", "dec", "100000",
    "dump", ".text", "HexText", textDump,
    "dump", ".data", "HexText", dataDump,
    ...registerArgs,
    sourcePath
  ];

  let stdout = "";
  let stderr = "";
  let failed = false;
  try {
    const result = await run(java, args, { timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    failed = true;
    stdout = String(error.stdout || "");
    stderr = String(error.stderr || error.message || "");
  }

  // With `me`, MarsLaunch points its message stream at System.err, and the
  // post-mortem register display goes through that same stream. So stderr
  // carries warnings, errors and registers, while stdout is exactly what the
  // program itself wrote.
  const registers = {};
  stderr.split(/\r?\n/).forEach((line) => {
    const match = /^(\$[a-z0-9]+)\t(-?\d+)$/.exec(line.trim());
    if (match) registers[match[1]] = Number(match[2]) | 0;
  });
  registers.$zero = 0;

  const output = stdout;
  const messages = stderr
    .split(/\r?\n/)
    .filter((line) => !/^\$[a-z0-9]+\t-?\d+$/.test(line.trim()))
    .join("\n")
    .trim();
  const readDump = async (path) => {
    try {
      const text = await readFile(path, "utf8");
      return text.split(/\r?\n/).map((line) => line.trim().toLowerCase()).filter(Boolean);
    } catch {
      return [];
    }
  };

  return {
    ok: !failed && Object.keys(registers).length > 1,
    output,
    registers,
    text: await readDump(textDump),
    data: await readDump(dataDump),
    diagnostics: `${stdout}\n${stderr}`.trim()
  };
}

async function readMarsInitialRegisters(java, workDir) {
  // MarsLaunch only prints registers after a run. This probe exits without
  // touching $gp, $sp or $fp, so their post-mortem values are the reference
  // simulator's actual initial pointer values rather than copied constants.
  const sourcePath = resolve(workDir, "webmars-initial-registers.asm");
  await writeFile(sourcePath, `
        .text
        .globl main
main:   addiu $v0, $zero, 10
        syscall
`, "utf8");
  const result = await runMars(java, sourcePath, workDir);
  if (!result.ok) {
    throw new Error(`Could not read MARS initial registers: ${result.diagnostics || "reference probe failed"}`);
  }
  return result.registers;
}

// --- webMARS ----------------------------------------------------------------

async function runWebMars(createJavaScriptEngine, source, sourceName) {
  const output = [];
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxMemoryBytes: 0x7fffffff }
  });

  const assembled = engine.assemble(source, { sourceName });
  if (!assembled.ok) {
    return {
      ok: false,
      output: "",
      registers: {},
      text: [],
      data: [],
      diagnostics: (assembled.errors || []).map((entry) => `line ${entry.line}: ${entry.message}`).join("\n"),
      errorLines: (assembled.errors || []).map((entry) => Number(entry.line)).filter(Number.isFinite)
    };
  }

  // Assembly establishes the runtime's configured memory map and resets the
  // register file. Capture this state before the first instruction so pointer
  // movement can be compared even when the two maps use different bases.
  const initialState = engine.exportRuntimeState({ includeProgram: false });
  const initialRegisters = {};
  REGISTER_NAMES.forEach((name, index) => { initialRegisters[name] = initialState.registers[index] | 0; });

  // Step rather than `go` so console output can be collected in order, the same
  // way the browser run loop does it.
  for (let step = 0; step < 100000; step += 1) {
    const snapshot = engine.getSnapshot();
    if (snapshot.halted) break;
    const result = engine.step({ includeSnapshot: false });
    if (result.runIo && typeof result.message === "string") output.push(result.message);
    if (result.ok === false) break;
    if (result.done) break;
  }

  const state = engine.exportRuntimeState({ includeProgram: false });
  const registers = {};
  REGISTER_NAMES.forEach((name, index) => { registers[name] = state.registers[index] | 0; });

  const snapshot = engine.getSnapshot();
  const text = (snapshot.textRows || [])
    .map((row) => String(row.code || row.machineCodeHex || "").replace(/^0x/i, "").toLowerCase().padStart(8, "0"));

  return {
    ok: true,
    output: output.join(""),
    registers,
    initialRegisters,
    text,
    data: [],
    diagnostics: "",
    errorLines: [],
    engine
  };
}

// Reading the data segment out of webMARS uses the engine directly, because the
// snapshot's data rows are formatted for display rather than for comparison.
function readWebMarsData(engine, baseAddress, wordCount) {
  const words = [];
  for (let index = 0; index < wordCount; index += 1) {
    try {
      words.push(hexWord(engine.readWord(baseAddress + index * 4)));
    } catch {
      words.push(null);
    }
  }
  return words;
}

// --- comparison -------------------------------------------------------------

export function compareText(marsText, webText) {
  const differences = [];
  const length = Math.max(marsText.length, webText.length);
  if (marsText.length !== webText.length) {
    differences.push({
      kind: "text-length",
      detail: `MARS assembled ${marsText.length} words, webMARS assembled ${webText.length}`
    });
  }
  for (let index = 0; index < length; index += 1) {
    if (marsText[index] !== webText[index]) {
      differences.push({
        kind: "text-word",
        index,
        offset: index * 4,
        mars: marsText[index] ?? null,
        web: webText[index] ?? null,
        detail: `word ${index} (offset 0x${(index * 4).toString(16)}): MARS ${marsText[index] ?? "-"} vs webMARS ${webText[index] ?? "-"}`
      });
      if (differences.length > 8) break;
    }
  }
  return differences;
}

export function compareRegisters(marsRegisters, webRegisters, marsInitialRegisters = {}, webInitialRegisters = {}) {
  const differences = [];
  // $sp, $fp and $gp start from the memory map, so only the delta is defined.
  const pointerRegisters = new Set(["$sp", "$fp", "$gp"]);
  REGISTER_NAMES.forEach((name) => {
    if (VOLATILE_REGISTERS.has(name)) return;
    const mars = marsRegisters[name];
    const web = webRegisters[name];
    if (mars === undefined || web === undefined) {
      differences.push({
        kind: "register-missing",
        detail: `${name}: ${mars === undefined ? "MARS" : "webMARS"} did not report a final value`
      });
      return;
    }
    if (pointerRegisters.has(name)) {
      const marsInitial = marsInitialRegisters[name];
      const webInitial = webInitialRegisters[name];
      if (marsInitial === undefined || webInitial === undefined) {
        differences.push({
          kind: "register-baseline",
          detail: `${name}: ${marsInitial === undefined ? "MARS" : "webMARS"} did not report an initial value`
        });
        return;
      }
      const marsDelta = ((mars | 0) - (marsInitial | 0)) | 0;
      const webDelta = ((web | 0) - (webInitial | 0)) | 0;
      if (marsDelta !== webDelta) {
        differences.push({
          kind: "register-delta",
          detail: `${name}: MARS moved ${marsDelta} (${marsInitial} to ${mars}) vs webMARS ${webDelta} (${webInitial} to ${web})`
        });
      }
      return;
    }
    if ((mars | 0) !== (web | 0)) {
      differences.push({ kind: "register", detail: `${name}: MARS ${mars} vs webMARS ${web}` });
    }
  });
  return differences;
}

export function sourceDeclaresData(source) {
  return /^\s*\.data\b/m.test(String(source));
}

export function compareData(marsData, engine, baseAddress = 0x10010000) {
  const differences = [];
  const webData = readWebMarsData(engine, baseAddress, marsData.length);
  marsData.forEach((word, index) => {
    if (webData[index] !== word) {
      differences.push({
        kind: "data-word",
        index,
        address: (baseAddress + index * 4) >>> 0,
        mars: word,
        web: webData[index] ?? null,
        detail: `data word ${index} (0x${(baseAddress + index * 4).toString(16)}): MARS ${word} vs webMARS ${webData[index] ?? "-"}`
      });
    }
  });
  return differences;
}

function normalizedExpectedWord(value) {
  return String(value ?? "").replace(/^0x/i, "").toLowerCase().padStart(8, "0");
}

function declarationForTextDifference(difference, declarations) {
  if (difference.kind !== "text-word") return null;
  return declarations.find((declaration) => declaration.textWords.some((expected) => (
    expected.offset === difference.offset
    && normalizedExpectedWord(expected.mars) === difference.mars
    && normalizedExpectedWord(expected.web) === difference.web
  ))) || null;
}

export function classifyDifferences(differences, declarations = []) {
  const explained = [];
  const unexplained = [];
  differences.forEach((difference) => {
    const declaration = declarationForTextDifference(difference, declarations);
    if (declaration) explained.push({ ...difference, intentionalDifference: declaration.id });
    else unexplained.push(difference);
  });
  return { explained, unexplained };
}

function compareOutput(marsOutput, webOutput) {
  const normalize = (text) => String(text).replace(/\r\n/g, "\n").replace(/\s+$/, "");
  if (normalize(marsOutput) === normalize(webOutput)) return [];
  return [{
    kind: "output",
    detail: `MARS ${JSON.stringify(normalize(marsOutput).slice(0, 200))} vs webMARS ${JSON.stringify(normalize(webOutput).slice(0, 200))}`
  }];
}

export async function runDifferential(options = {}) {
  const status = await referenceStatus();
  if (!status.canRun) {
    return { skipped: true, reason: status.jarPresent ? "no Java runtime found" : "MARS reference not fetched", status };
  }

  const { createJavaScriptEngine } = await import("../tests/helpers/engines.mjs");
  const expectations = JSON.parse(
    await readFile(resolve(projectRoot, "tests/differential/expectations.json"), "utf8")
  );
  if (expectations.schema !== "webmars.differential-expectations/2") {
    throw new Error(`Unsupported differential expectation schema: ${expectations.schema || "missing"}`);
  }
  const declaredIds = new Set(INTENTIONAL_DIFFERENCES.map((entry) => entry.id));
  Object.entries(expectations.programs).forEach(([program, declarations]) => {
    declarations.forEach((declaration) => {
      if (!declaredIds.has(declaration.id)) {
        throw new Error(`${program} claims intentional difference '${declaration.id}', which is not declared in INTENTIONAL_DIFFERENCES.`);
      }
      if (!Array.isArray(declaration.textWords) || declaration.textWords.length === 0) {
        throw new Error(`${program}/${declaration.id} must declare the exact text words it excuses.`);
      }
      declaration.textWords.forEach((word) => {
        if (!Number.isInteger(word.offset) || word.offset < 0 || word.offset % 4 !== 0) {
          throw new Error(`${program}/${declaration.id} has an invalid text offset '${word.offset}'.`);
        }
        if (!/^(?:0x)?[0-9a-f]{8}$/i.test(String(word.mars)) || !/^(?:0x)?[0-9a-f]{8}$/i.test(String(word.web))) {
          throw new Error(`${program}/${declaration.id} must declare exact eight-digit MARS and webMARS words at offset ${word.offset}.`);
        }
      });
    });
  });

  const names = (await readdir(programsRoot))
    .filter((name) => name.endsWith(".asm"))
    .filter((name) => !options.only || name === options.only)
    .sort();

  const workDir = await mkdtemp(resolve(tmpdir(), "webmars-diff-"));
  const cases = [];
  try {
    const marsInitialRegisters = await readMarsInitialRegisters(status.java.path, workDir);
    for (const name of names) {
      const sourcePath = resolve(programsRoot, name);
      const source = await readFile(sourcePath, "utf8");
      const mars = await runMars(status.java.path, sourcePath, workDir);
      const web = await runWebMars(createJavaScriptEngine, source, name);

      if (!mars.ok || !web.ok) {
        cases.push({
          name,
          agreed: false,
          conformant: false,
          declared: [],
          explained: [],
          differences: [{
            kind: "assembly",
            detail: `MARS ${mars.ok ? "accepted" : "rejected"} the program, webMARS ${web.ok ? "accepted" : "rejected"} it`
          }],
          marsDiagnostics: mars.diagnostics.slice(0, 400),
          webDiagnostics: web.diagnostics.slice(0, 400)
        });
        continue;
      }

      const differences = [
        ...compareText(mars.text, web.text),
        ...compareRegisters(mars.registers, web.registers, marsInitialRegisters, web.initialRegisters),
        ...compareOutput(mars.output, web.output)
      ];

      // The data segment is compared through the engine at the address MARS
      // dumped from, so a directive that lays bytes out differently is caught.
      // Only programs that actually declare data are compared this way.
      if (mars.data.length && sourceDeclaresData(source)) {
        differences.push(...compareData(mars.data, web.engine));
      }

      // An encoding exception can only ever excuse a text-segment difference.
      // A register, data or output difference is a defect whatever is declared,
      // because it means the two simulators computed different results.
      const declarations = expectations.programs[name] || [];
      const declared = declarations.map((entry) => entry.id);
      const { explained, unexplained } = classifyDifferences(differences, declarations);

      cases.push({
        name,
        agreed: differences.length === 0,
        conformant: unexplained.length === 0,
        declared,
        explained: explained.slice(0, 10),
        differences: unexplained.slice(0, 10),
        words: mars.text.length,
        output: mars.output.trim().slice(0, 60)
      });
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  return { skipped: false, cases, status };
}

// --- report -----------------------------------------------------------------

function buildReport(result, version) {
  const { cases, status } = result;
  const agreed = cases.filter((entry) => entry.agreed);
  const explainedOnly = cases.filter((entry) => !entry.agreed && entry.conformant);
  const disagreed = cases.filter((entry) => !entry.conformant);

  const rows = cases.map((entry) => {
    const verdict = entry.agreed
      ? "identical"
      : (entry.conformant
        ? `identical apart from ${entry.declared.map((id) => `\`${id}\``).join(", ")}`
        : `**${entry.differences.length} unexplained difference(s)**`);
    return `| \`${entry.name}\` | ${entry.words ?? "-"} | ${verdict} |`;
  }).join("\n");

  const exceptions = INTENTIONAL_DIFFERENCES.map((entry) => {
    const minimal = entry.minimalCase ? `\n\n**Minimal case:** \`${entry.minimalCase}\`` : "";
    return `### \`${entry.id}\` (${entry.scope})\n\n${entry.summary}\n\n**Why this is accepted:** ${entry.reason}${minimal}`;
  }).join("\n\n");

  return `# webMARS conformance with MARS 4.5

Generated by \`scripts/differential-mars.mjs\` for webMARS ${version}.
Regenerate with \`npm run differential\`. Do not edit this file by hand.

## Reference build

| Field | Value |
| --- | --- |
| Simulator | ${MARS_REFERENCE.name} ${MARS_REFERENCE.version} (${MARS_REFERENCE.released}) |
| Authors | ${MARS_REFERENCE.authors} |
| Licence | ${MARS_REFERENCE.licence} |
| Source | ${MARS_REFERENCE.url} |
| SHA-256 | \`${MARS_REFERENCE.sha256}\` |
| Java | ${status.java ? status.java.banner : "not available"} |

The reference jar is pinned by checksum. \`npm run fetch:mars\` refuses to
install any other build, because a difference found against an unknown
simulator cannot be interpreted.

## What is compared

Both simulators assemble and run the same source under equivalent settings
(start at \`main\`, default memory map, 100 000 step limit), and four
observable results are compared:

| Result | How |
| --- | --- |
| Text segment | MARS \`dump .text HexText\` versus the machine code webMARS reports per row, word for word |
| Data segment | MARS \`dump .data HexText\` versus words read back through the webMARS engine |
| Console output | Everything the program wrote, in order |
| Final registers | All 32 general-purpose registers, minus the exclusions below |

Diagnostics are compared separately and by *line*, not by wording - see the
exceptions.

## Result

| Metric | Value |
| --- | --- |
| Programs compared | ${cases.length} |
| Byte-identical to MARS | ${agreed.length} |
| Identical apart from a declared difference | ${explainedOnly.length} |
| **Unexplained differences** | **${disagreed.length}** |

| Program | Words assembled | Verdict |
| --- | --- | --- |
${rows}

${disagreed.length
    ? `## Unexplained differences\n\n${disagreed.map((entry) =>
        `### \`${entry.name}\`\n\n${entry.differences.map((difference) => `- **${difference.kind}**: ${difference.detail}`).join("\n")}`
      ).join("\n\n")}\n\nEach of these is a defect until it is either fixed or added to the intentional-difference list with a reason.`
    : "## Unexplained differences\n\nNone. Every remaining difference is declared below, and every program leaves the same register state, writes the same console output and lays out the same data segment in both simulators."}

${explainedOnly.length
    ? `## Declared differences observed\n\nThese programs differ only in the encoded text segment, for a reason recorded in the exception list. Registers, data and output still match exactly.\n\n${explainedOnly.map((entry) =>
        `### \`${entry.name}\`\n\nApplies: ${entry.declared.map((id) => `\`${id}\``).join(", ")}\n\n${entry.explained.map((difference) => `- ${difference.detail}`).join("\n")}`
      ).join("\n\n")}`
    : ""}

## Rules for intentional differences

A difference is a defect unless it appears below. Adding an entry requires a
reason that would satisfy a reader who did not write the code - "webMARS does
it differently" is not one.

${exceptions}

## Limitations

- The corpus is ${cases.length} programs. It covers arithmetic, logic, shifts,
  comparisons, branches, memory widths, multiply and divide, function calls,
  pseudo-instruction expansion, data directives and console output. It is not
  the whole instruction set, and passing it does not mean full compatibility.
- Floating point, file syscalls, interactive input, MMIO devices and the
  exception handler are not compared here: they need input or a device the
  command-line MARS does not provide.
- Timing is not compared at all. MARS does not model it, and webMARS models it
  only in the Pipeline Lab. See [pipeline-lab.md](pipeline-lab.md).
- This report describes one commit. It is regenerated per release; see
  [release-process.md](release-process.md).
`;
}

async function main() {
  const write = !process.argv.includes("--no-write");
  const onlyIndex = process.argv.indexOf("--only");
  const only = onlyIndex === -1 ? null : process.argv[onlyIndex + 1];

  const result = await runDifferential({ only });
  if (result.skipped) {
    process.stderr.write(`Differential run skipped: ${result.reason}.\n`);
    process.stderr.write("Run `npm run fetch:mars` and install a JDK to enable it.\n");
    process.exitCode = 1;
    return;
  }

  const version = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version;
  if (write && !only) await writeFile(reportPath, buildReport(result, version), "utf8");

  const disagreed = result.cases.filter((entry) => !entry.conformant);
  const identical = result.cases.filter((entry) => entry.agreed);
  result.cases.forEach((entry) => {
    const tag = entry.agreed ? "  ok  " : (entry.conformant ? " decl " : " FAIL ");
    process.stdout.write(`${tag} ${entry.name}${entry.declared?.length ? ` (${entry.declared.join(", ")})` : ""}\n`);
    entry.differences.forEach((d) => process.stdout.write(`        ${d.kind}: ${d.detail}\n`));
  });
  process.stdout.write(`\n${identical.length} byte-identical, ${result.cases.length - identical.length - disagreed.length} identical apart from a declared difference, ${disagreed.length} unexplained.\n`);
  if (disagreed.length) process.exitCode = 1;
}

if (process.argv[1] && basename(process.argv[1]) === "differential-mars.mjs") {
  await main();
}
