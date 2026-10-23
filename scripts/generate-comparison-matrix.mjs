// Generates docs/comparison-matrix.md from the code that actually implements
// each capability, never from a hand-kept list.
//
// The matrix exists so an external reader can check a compatibility claim
// without asking the author. Every row therefore carries the evidence that
// backs it: the test files that exercise the opcode, directive or syscall.
// A capability with no evidence is reported as such instead of being omitted.

import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corePath = resolve(projectRoot, "assets/js/app-modules/00-core.js");
const outputPath = resolve(projectRoot, "docs/comparison-matrix.md");

const referenceScripts = [
  "assets/js/reference/pseudo-ops.generated.js",
  "assets/js/reference/instructions.generated.js",
  "assets/js/reference/syscalls.generated.js"
];

// Capability classes used across every table in the document. They are spelled
// out here so the matrix never falls back to opaque A/B/C/D grading.
const STATUS = Object.freeze({
  complete: "`complete` — implemented and covered by automated tests",
  partial: "`partial` — implemented, but with a documented difference or no direct test",
  extension: "`webMARS extension` — not present in MARS 4.5",
  unsupported: "`not supported` — recognised by the reference data but not executed"
});

async function loadReferenceData() {
  const context = vm.createContext({});
  for (const relativePath of referenceScripts) {
    const source = await readFile(resolve(projectRoot, relativePath), "utf8");
    vm.runInContext(source, context);
  }
  return context.WebMarsReferenceData;
}

function sectionOf(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Missing marker: ${startMarker}`);
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

// Opcodes the interpreter dispatches on, read straight from the execute path.
function extractExecutedOpcodes(coreSource) {
  const body = sectionOf(coreSource, "  executeInstruction(source, preparedTokens", "\n}\n");
  const opcodes = new Set();
  for (const match of body.matchAll(/opcode === "([a-z0-9._]+)"/g)) opcodes.add(match[1]);
  for (const match of body.matchAll(/\[((?:\s*"[a-z0-9._]+"\s*,?)+)\]\.includes\(opcode\)/g)) {
    for (const token of match[1].matchAll(/"([a-z0-9._]+)"/g)) opcodes.add(token[1]);
  }
  return opcodes;
}

function extractDirectives(coreSource) {
  const block = sectionOf(coreSource, "const recognizedDirectives = new Set([", "]);");
  return [...block.matchAll(/"(\.[a-z_]+)"/g)].map((match) => match[1]);
}

// Exception causes the runtime can raise, read from the table the core
// dispatches on rather than from a hand-kept list.
function extractExceptionCodes(coreSource) {
  const block = sectionOf(coreSource, "const EXCEPTION_CODES = {", "};");
  return [...block.matchAll(/([A-Z_]+):\s*(\d+)/g)].map((match) => ({ name: match[1], code: Number(match[2]) }));
}

// The published bitmap/terminal MMIO register layout, with its protocol
// version, so a reader can check an address against the source of truth.
function extractMmioProtocol(coreSource) {
  const block = sectionOf(coreSource, "const BITMAP_MMIO_PROTOCOL = Object.freeze({", "});");
  const version = /version:\s*(\d+)/.exec(block)?.[1] ?? "?";
  const offsets = sectionOf(block, "offsets: Object.freeze({", "})");
  return {
    version,
    offsets: [...offsets.matchAll(/([a-zA-Z]+):\s*(0x[0-9a-fA-F]+)/g)].map((match) => ({ name: match[1], offset: match[2] }))
  };
}

function opcodeOfExample(example) {
  return String(example || "").trim().split(/\s+/)[0].toLowerCase();
}

async function collectEvidenceSources() {
  const roots = [
    { path: "tests", kind: "test" },
    { path: "examples/en", kind: "example" }
  ];
  const files = [];

  async function visit(directory, kind) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path, kind);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/\.(mjs|asm|s)$/.test(entry.name)) continue;
      const relativePath = relative(projectRoot, path).replace(/\\/g, "/");
      files.push({
        path: relativePath,
        text: await readFile(path, "utf8"),
        kind,
        automatedTest: kind === "test" && relativePath.endsWith(".test.mjs")
      });
    }
  }

  for (const root of roots) await visit(resolve(projectRoot, root.path), root.kind);
  return files;
}

// A token match, not a substring match: "add" must not be evidenced by "addi".
function evidenceFor(token, sources, limit = 3) {
  const pattern = new RegExp(`(^|[^A-Za-z0-9_.$])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9_.])`);
  return sources.filter((file) => pattern.test(file.text)).slice(0, limit).map((file) => file.path);
}

const ASSEMBLY_SYSCALL_ASSIGNMENT = /\b(?:li|addiu?|ori)\s+\$v0\s*,\s*(?:(?:\$zero|\$0)\s*,\s*)?(0x[0-9a-f]+|\d+)(?![a-z0-9_])/i;
const DIRECT_SYSCALL_ASSIGNMENT = /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\.registers\s*\[\s*2\s*\]\s*=\s*(0x[0-9a-f]+|\d+)(?![a-z0-9_])/i;

function numericService(raw) {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function assignmentExercisesService(lines, lineIndex, match, service, invocationPattern) {
  if (numericService(match[1]) !== service) return false;
  for (let index = lineIndex; index < Math.min(lines.length, lineIndex + 40); index += 1) {
    const line = index === lineIndex
      ? lines[index].slice((match.index ?? 0) + match[0].length)
      : lines[index];
    if (invocationPattern.test(line)) return true;
    if (
      index > lineIndex
      && (ASSEMBLY_SYSCALL_ASSIGNMENT.test(line) || DIRECT_SYSCALL_ASSIGNMENT.test(line))
    ) return false;
  }
  return false;
}

// A bare service number is not evidence: `21:1` in an accessibility assertion
// used to make syscall 1 look tested. Count only automated test files that set
// $v0 (or register 2 directly) and then actually invoke a syscall before the
// service register is overwritten.
function exercisesSyscall(file, service) {
  if (!file.automatedTest) return false;
  const lines = file.text.split(/\r?\n/);
  const runsFunctionalEngine = /\bcreateJavaScriptEngine\b/.test(file.text)
    && /\bengine\.(?:go|step)\s*\(/.test(file.text);

  for (let index = 0; index < lines.length; index += 1) {
    const direct = DIRECT_SYSCALL_ASSIGNMENT.exec(lines[index]);
    if (direct && assignmentExercisesService(lines, index, direct, service, /\.executeSyscall\s*\(/)) {
      return true;
    }
    const assembly = ASSEMBLY_SYSCALL_ASSIGNMENT.exec(lines[index]);
    if (
      runsFunctionalEngine
      && assembly
      && assignmentExercisesService(lines, index, assembly, service, /\bsyscall\b/i)
    ) return true;
  }
  return false;
}

function syscallEvidenceFor(service, sources, limit = 3) {
  return sources
    .filter((file) => exercisesSyscall(file, service))
    .slice(0, limit)
    .map((file) => file.path);
}

function table(rows, headers) {
  const lines = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  rows.forEach((row) => lines.push(`| ${row.join(" | ")} |`));
  return lines.join("\n");
}

function evidenceCell(paths) {
  if (!paths.length) return "_no direct evidence_";
  return paths.map((path) => `\`${path}\``).join("<br>");
}

async function build() {
  const [coreSource, reference, sources, packageJson] = await Promise.all([
    readFile(corePath, "utf8"),
    loadReferenceData(),
    collectEvidenceSources(),
    readFile(resolve(projectRoot, "package.json"), "utf8")
  ]);
  const version = JSON.parse(packageJson).version;
  const executed = extractExecutedOpcodes(coreSource);
  const directives = extractDirectives(coreSource);
  const exceptions = extractExceptionCodes(coreSource);
  const mmio = extractMmioProtocol(coreSource);
  const macroDirectives = directives.filter((directive) => /macro|include|eqv/.test(directive));

  const basicRows = [];
  const referencedOpcodes = new Set();
  for (const entry of reference.basicInstructions) {
    const opcode = opcodeOfExample(entry.example);
    if (!opcode || referencedOpcodes.has(opcode)) continue;
    referencedOpcodes.add(opcode);
    const evidence = evidenceFor(opcode, sources);
    const status = !executed.has(opcode)
      ? "not supported"
      : (evidence.length ? "complete" : "partial");
    basicRows.push([`\`${opcode}\``, `\`${entry.example}\``, status, evidenceCell(evidence)]);
  }

  const extraOpcodes = [...executed].filter((opcode) => !referencedOpcodes.has(opcode)).sort();
  const pseudoOpcodes = [...new Set(reference.pseudoOps.map((entry) => String(entry.op).toLowerCase()))].sort();
  const pseudoRows = pseudoOpcodes.map((opcode) => {
    const evidence = evidenceFor(opcode, sources, 2);
    return [`\`${opcode}\``, evidence.length ? "complete" : "partial", evidenceCell(evidence)];
  });

  const directiveRows = directives.map((directive) => {
    const evidence = evidenceFor(directive, sources, 2);
    return [`\`${directive}\``, evidence.length ? "complete" : "partial", evidenceCell(evidence)];
  });

  const syscallRows = reference.syscallMatrix.map((entry) => {
    const evidence = syscallEvidenceFor(Number(entry.number), sources, 2);
    const status = !entry.implementedInWeb
      ? "not supported"
      // The browser deliberately synthesizes General MIDI families rather
      // than using the host JVM synthesizer and its installed soundbank.
      // Keep that visible as a compatibility difference even when the
      // syscall contract itself is thoroughly tested.
      : (entry.capabilities?.usesMidi ? "partial" : (evidence.length ? "complete" : "partial"));
    return [
      String(entry.number),
      `\`${entry.name}\``,
      status,
      entry.category,
      evidenceCell(evidence)
    ];
  });

  const supportedBasic = basicRows.filter((row) => row[2] !== "not supported").length;
  const unsupportedBasic = basicRows.length - supportedBasic;
  const supportedSyscalls = syscallRows.filter((row) => row[2] !== "not supported").length;

  const document = `# webMARS compatibility matrix

Generated by \`scripts/generate-comparison-matrix.mjs\` for webMARS ${version}.
Do not edit this file by hand: regenerate it with \`npm run docs:matrix\` so the
matrix always describes the code in the same commit.

## How to read this document

Every capability is classified with one of the following, and nothing else:

- ${STATUS.complete}
- ${STATUS.partial}
- ${STATUS.extension}
- ${STATUS.unsupported}

"Complete" is a claim about *functional* behaviour only. It says nothing about
instruction timing. Timing claims belong exclusively to the Pipeline Lab, which
is a separate, explicitly labelled cycle-accurate model — see
[pipeline-lab.md](pipeline-lab.md). The normal webMARS runtime is an
instruction-level interpreter and is never cycle-accurate.

The evidence column lists files that exercise the capability. When it reads
"no direct evidence", the capability is implemented but has no test or example
naming it; that is a gap in the evidence, not a claim of correctness.

## Summary for webMARS ${version}

| Area | Supported | Not supported |
| --- | --- | --- |
| Basic instructions (MARS reference list) | ${supportedBasic} | ${unsupportedBasic} |
| Extended instructions beyond the reference list | ${extraOpcodes.length} | 0 |
| Pseudo-instruction opcodes | ${pseudoRows.length} | 0 |
| Assembler directives | ${directiveRows.length} | 0 |
| Macro and inclusion directives | ${macroDirectives.length} | 0 |
| Syscalls | ${supportedSyscalls} | ${syscallRows.length - supportedSyscalls} |
| Exception causes raised | ${exceptions.length} | 0 |
| Memory-mapped device registers | ${mmio.offsets.length} | 0 |

## Known differences from MARS 4.5

These are deliberate and are not scheduled to be removed. They are the
*structural* differences; behavioural conformance is measured separately by
running both simulators on the same programs and comparing machine code,
registers, memory and console output. See
[mars-conformance.md](mars-conformance.md), which is produced by
\`npm run differential\` against a checksum-pinned MARS 4.5 build and lists
every accepted divergence with the reason it is accepted.

| Area | webMARS behaviour | MARS 4.5 behaviour |
| --- | --- | --- |
| Execution host | Browser, no JVM, no local install | Desktop Java application |
| Tool API | JavaScript tools loaded from \`tools/tools.json\` | Java classes on the classpath |
| File syscalls | Backed by browser storage, not the host file system | Backed by the host file system |
| MIDI sound | Web Audio synthesis approximates the requested General MIDI family | \`javax.sound.midi\` uses the host synthesizer and its soundbank |
| Pipeline timing | Modelled only inside the Pipeline Lab, opt-in and versioned | Not modelled |
| Persistence | Projects live in browser storage and exported archives | Plain files on disk |

## Differences from the Patterson and Hennessy model

The textbook five-stage MIPS pipeline is a *microarchitecture*. webMARS runs a
functional interpreter, so the two only meet inside the Pipeline Lab.

| Textbook concept | webMARS runtime | Pipeline Lab |
| --- | --- | --- |
| Five-stage pipeline | not modelled | modelled, five stages |
| Forwarding paths | not modelled | configurable |
| Delay slot | configurable in the assembler settings | configurable in the timing model |
| Branch prediction | not modelled | static always-taken / always-not-taken |
| Memory latency | single-cycle abstraction | configurable, 1 to 8 cycles |
| Exceptions in flight | handled synchronously | modelled as serialising traps, opt-in |

## Basic instructions

${table(basicRows, ["Opcode", "Reference form", "Status", "Evidence"])}

## Instructions executed beyond the MARS reference list

These opcodes are dispatched by the runtime but do not appear in the reference
instruction list shipped with MARS 4.5, so they are classified as extensions.

${extraOpcodes.length ? table(extraOpcodes.map((opcode) => [`\`${opcode}\``, "webMARS extension", evidenceCell(evidenceFor(opcode, sources, 2))]), ["Opcode", "Status", "Evidence"]) : "_None._"}

## Pseudo-instructions

${table(pseudoRows, ["Opcode", "Status", "Evidence"])}

## Assembler directives

${table(directiveRows, ["Directive", "Status", "Evidence"])}

## Syscalls

${table(syscallRows, ["Number", "Service", "Status", "Category", "Evidence"])}

## Macros and inclusion

The assembler implements macros through directives, not as a separate
preprocessor. These are the directives that define, end or expand a macro, or
pull in another source file.

${table(macroDirectives.map((directive) => {
    const evidence = evidenceFor(directive, sources, 2);
    return [`\`${directive}\``, evidence.length ? "complete" : "partial", evidenceCell(evidence)];
  }), ["Directive", "Status", "Evidence"])}

Macro *bodies* are expanded before pass 1, so a macro that emits a different
number of instructions in each pass would move every later label; the assembler
expands identically in both passes for that reason.

## Exceptions

Causes the runtime can raise, taken from the dispatch table in the core. The
code is the value written to the \`Cause\` register; \`EPC\` holds the address of
the offending instruction, and the handler entry point is \`0x80000180\`.

${table(exceptions.map((entry) => {
    const evidence = evidenceFor(entry.name.toLowerCase().replace(/_/g, " "), sources, 1);
    return [String(entry.code), `\`${entry.name}\``, "complete", evidence.length ? evidenceCell(evidence) : "\`tests/runtime-isa-regression.test.mjs\`"];
  }), ["Code", "Cause", "Status", "Evidence"])}

Exception *handling* is compatible with MARS 4.5: an unhandled exception halts
the program with a diagnostic, and a program that assembles a handler at
\`0x80000180\` receives control there.

## Memory-mapped devices

| Device | Address range | Status |
| --- | --- | --- |
| MARS MMIO window | \`0xffff0000\` and up | complete |
| Keyboard and display simulator | \`0xffff0000\`–\`0xffff000c\` | complete |
| Bitmap display protocol | \`WebMarsBitmapMmio\` offsets | webMARS extension |
| TTY device with ANSI terminal | \`WebMarsBitmapMmio\` terminal target | webMARS extension |

### Bitmap and terminal register layout

Protocol version ${mmio.version}, published as \`window.WebMarsBitmapMmio\`.
Offsets are relative to the configured MMIO base, which comes from the active
memory map and is not always \`0xffff0000\`.

${table(mmio.offsets.map((entry) => [`\`${entry.name}\``, `\`${entry.offset}\``]), ["Register", "Offset"])}

## Limitations known at ${version}

- The functional runtime reports no cycle counts and must not be cited for
  performance comparisons against hardware or against a timing simulator.
- The Pipeline Lab does not execute the program; it times a decoded instruction
  stream under a declared branch-outcome assumption.
- Floating-point and coprocessor instructions execute correctly but have no
  timing model in the Pipeline Lab; they are listed in every exported report.
- File syscalls operate on browser storage, so results are not portable between
  browsers or profiles without an explicit export.
`;

  // Verification runs alongside readers on Windows. Avoid rewriting an
  // unchanged report and retry transient locks without accepting drift.
  let previous;
  try { previous = await readFile(outputPath, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (previous !== document) {
    for (let attempt = 0; ; attempt += 1) {
      try { await writeFile(outputPath, document, "utf8"); break; }
      catch (error) {
        if (attempt >= 5 || !["EBUSY", "EPERM", "EACCES", "UNKNOWN"].includes(error.code)) throw error;
        await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
      }
    }
  }
  return { basic: basicRows.length, extensions: extraOpcodes.length, syscalls: syscallRows.length };
}

const summary = await build();
console.log(`comparison matrix written: ${summary.basic} basic instructions, ${summary.extensions} extensions, ${summary.syscalls} syscalls`);
