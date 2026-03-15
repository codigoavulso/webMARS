import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const webRoot = resolve(repoRoot, "web");
const pseudoOpsPath = resolve(repoRoot, "PseudoOps.txt");
const syscallPropertiesPath = resolve(repoRoot, "Syscall.properties");
const syscallJavaDir = resolve(repoRoot, "mars", "mips", "instructions", "syscalls");
const instructionSetJavaPath = resolve(repoRoot, "mars", "mips", "instructions", "InstructionSet.java");
const directivesJavaPath = resolve(repoRoot, "mars", "assembler", "Directives.java");
const corePath = resolve(webRoot, "assets", "js", "app-modules", "00-core.js");
const referenceDir = resolve(webRoot, "assets", "js", "reference");
const helpDir = resolve(webRoot, "help");
const defaultHelpLanguageDir = resolve(helpDir, "en");
const pseudoOpsOutputPath = resolve(referenceDir, "pseudo-ops.generated.js");
const instructionsOutputPath = resolve(referenceDir, "instructions.generated.js");
const syscallsOutputPath = resolve(referenceDir, "syscalls.generated.js");
const helpReferenceOutputPath = resolve(helpDir, "help-reference.json");
const localizedHelpReferenceOutputPath = resolve(defaultHelpLanguageDir, "help-reference.json");

function tokenizePseudoSource(text) {
  const input = String(text ?? "").trim();
  const tokens = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  const flush = () => {
    const token = current.trim();
    if (token) tokens.push(token);
    current = "";
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : "";

    if (ch === '"' && !inSingle && prev !== "\\") {
      inDouble = !inDouble;
      current += ch;
      continue;
    }

    if (ch === "'" && !inDouble && prev !== "\\") {
      inSingle = !inSingle;
      current += ch;
      continue;
    }

    if (!inSingle && !inDouble && (ch === "(" || ch === ")")) {
      flush();
      tokens.push(ch);
      continue;
    }

    if (!inSingle && !inDouble && (ch === "+" || ch === "-")) {
      const trimmed = current.trim();
      const next = input.slice(i + 1).trimStart();
      if (trimmed && /^[A-Za-z_.$][\w.$]*$/.test(trimmed) && /^(?:0x[\da-f]+|\d+)/i.test(next)) {
        flush();
        tokens.push(ch);
        continue;
      }
    }

    if (!inSingle && !inDouble && (ch === "," || /\s/.test(ch))) {
      flush();
      continue;
    }

    current += ch;
  }

  flush();
  return tokens;
}

function readLines(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n").split("\n");
}

function parsePseudoOps() {
  const lines = readLines(pseudoOpsPath);
  const entries = [];

  lines.forEach((line, index) => {
    if (!line || /^\s/.test(line) || line.startsWith("#")) return;
    const rawParts = line.split("\t").map((part) => part.trim()).filter(Boolean);
    if (rawParts.length < 2) return;

    const source = rawParts[0];
    const templates = [];
    let description = "";
    let compactIndex = -1;

    for (let i = 1; i < rawParts.length; i += 1) {
      const part = rawParts[i];
      if (!part) continue;
      if (part.startsWith("#")) {
        description = part.slice(1).trim();
        break;
      }
      if (part === "COMPACT") {
        compactIndex = templates.length;
        continue;
      }
      templates.push(part);
    }

    const sourceTokens = tokenizePseudoSource(source);
    if (!sourceTokens.length) return;

    const defaultTemplates = compactIndex >= 0 ? templates.slice(0, compactIndex) : templates.slice();
    const compactTemplates = compactIndex >= 0 ? templates.slice(compactIndex) : [];
    entries.push({
      lineNumber: index + 1,
      op: String(sourceTokens[0]).toLowerCase(),
      source,
      sourceTokens,
      defaultTemplates,
      defaultTemplateTokens: defaultTemplates.map(tokenizePseudoSource),
      compactTemplates,
      compactTemplateTokens: compactTemplates.map(tokenizePseudoSource),
      description
    });
  });

  return entries;
}

function unescapeJavaString(value) {
  return String(value ?? "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, "\"")
    .replace(/\\\\/g, "\\");
}

function parseBasicInstructions({ sort = false } = {}) {
  const source = readFileSync(instructionSetJavaPath, "utf8");
  const pattern = /new BasicInstruction\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"/g;
  const entries = [];
  const seen = new Set();
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const example = unescapeJavaString(match[1]).trim();
    const description = unescapeJavaString(match[2]).trim();
    const key = `${example}\u0000${description}`;
    if (!example || seen.has(key)) continue;
    seen.add(key);
    entries.push({ example, description });
  }

  return sort ? entries.sort((a, b) => a.example.localeCompare(b.example)) : entries;
}

function parseDirectivesHelp() {
  const source = readFileSync(directivesJavaPath, "utf8");
  const pattern = /new Directives\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\)/g;
  const entries = [];
  const seen = new Set();
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const name = unescapeJavaString(match[1]).trim();
    const description = unescapeJavaString(match[2]).trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    entries.push({ name, description });
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

function buildHelpReference(pseudoOps) {
  const basicInstructions = parseBasicInstructions({ sort: true });
  return {
    generatedAt: new Date().toISOString(),
    source: {
      basicInstructions: "../mars/mips/instructions/InstructionSet.java",
      extendedInstructions: "../PseudoOps.txt",
      directives: "../mars/assembler/Directives.java"
    },
    basicInstructions,
    extendedInstructions: pseudoOps
      .map((entry) => ({
        example: entry.source,
        description: entry.description || ""
      }))
      .sort((a, b) => a.example.localeCompare(b.example)),
    directives: parseDirectivesHelp()
  };
}

function extractSummaryFromJava(source) {
  const docMatch = /\/\*\*([\s\S]*?)\*\//.exec(source);
  if (!docMatch) return "";
  const lines = docMatch[1]
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter(Boolean);
  return lines[0] || "";
}

function detectSyscallCapabilities(source, name) {
  const text = String(source ?? "");
  return {
    readsMemory: /Globals\.memory\.get[A-Za-z]+/.test(text),
    writesMemory: /Globals\.memory\.set[A-Za-z]+/.test(text),
    readsRegisters: /RegisterFile\.getValue/.test(text),
    writesRegisters: /RegisterFile\.(?:updateRegister|setValue)/.test(text),
    usesDialog: /JOptionPane|Dialog/.test(text) || /Dialog/.test(name),
    usesConsoleInput: /SystemIO\.read/.test(text) || /^Read/.test(name),
    usesConsoleOutput: /SystemIO\.(?:print|write)/.test(text) || /^Print/.test(name),
    usesFileSystem: /SystemIO\.(?:openFile|readFromFile|writeToFile|closeFile)/.test(text) || /^(Open|Read|Write|Close)$/.test(name),
    usesRandom: /Random/.test(text) || /^Rand/.test(name),
    usesTime: /currentTimeMillis|Date/.test(text) || name === "Time",
    usesSleep: /Thread\.sleep/.test(text) || name === "Sleep",
    usesMidi: /ToneGenerator|Midi/.test(text) || /^Midi/.test(name),
    haltsProgram: /name is "Exit/.test(text) || /^Exit/.test(name)
  };
}

function categorizeSyscall(name) {
  if (/^(Print|Read)/.test(name)) return "io";
  if (/^(Open|Write|Close)$/.test(name)) return "fs";
  if (/^(Time|Sleep|Midi)/.test(name)) return "runtime";
  if (/^Rand/.test(name)) return "random";
  if (/Dialog/.test(name)) return "dialog";
  if (/^Sbrk$/.test(name)) return "memory";
  if (/^Exit/.test(name)) return "control";
  return "misc";
}

function parseImplementedSyscalls() {
  const source = readFileSync(corePath, "utf8");
  const start = source.indexOf("executeSyscall()");
  const end = source.indexOf("executeInstruction(", start);
  const slice = start >= 0 && end > start ? source.slice(start, end) : source;
  const services = new Set();
  const matches = slice.matchAll(/case\s+(\d+)\s*:/g);
  for (const match of matches) services.add(Number.parseInt(match[1], 10));
  return services;
}

function parseSyscallMatrix() {
  const implementedServices = parseImplementedSyscalls();
  const rawProperties = readLines(syscallPropertiesPath);
  const entries = [];

  rawProperties.forEach((line) => {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) return;
    const match = /^([A-Za-z0-9_]+)\s*=\s*(\d+)\s*$/.exec(clean);
    if (!match) return;
    const name = match[1];
    const number = Number.parseInt(match[2], 10);
    const className = `Syscall${name}`;
    const javaPath = join(syscallJavaDir, `${className}.java`);
    const javaExists = existsSync(javaPath);
    const javaSource = javaExists ? readFileSync(javaPath, "utf8") : "";
    const summary = extractSummaryFromJava(javaSource);
    const constructorMatch = /super\(\s*(\d+)\s*,\s*"([^"]+)"\s*\)/.exec(javaSource);

    entries.push({
      number,
      name,
      className,
      javaFile: javaExists ? `mars/mips/instructions/syscalls/${className}.java` : "",
      implementedInWeb: implementedServices.has(number),
      constructorNumber: constructorMatch ? Number.parseInt(constructorMatch[1], 10) : null,
      constructorName: constructorMatch ? constructorMatch[2] : "",
      category: categorizeSyscall(name),
      summary,
      capabilities: detectSyscallCapabilities(javaSource, name)
    });
  });

  return entries.sort((a, b) => a.number - b.number);
}

function emitReferenceModule(outputPath, propertyName, value, meta = {}) {
  const relativeSource = [
    meta.source ? `source: ${JSON.stringify(meta.source)},` : "",
    meta.generatedAt ? `generatedAt: ${JSON.stringify(meta.generatedAt)},` : ""
  ].filter(Boolean).join("\n      ");

  const payload = JSON.stringify(value, null, 2);
  const content = `(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  const referenceData = globalScope.WebMarsReferenceData || (globalScope.WebMarsReferenceData = {});
  referenceData.${propertyName} = ${payload};
  referenceData.meta = {
      ...(referenceData.meta || {}),
      ${relativeSource}
  };
})();
`;
  writeFileSync(outputPath, content, "utf8");
}

mkdirSync(referenceDir, { recursive: true });
mkdirSync(helpDir, { recursive: true });
mkdirSync(defaultHelpLanguageDir, { recursive: true });

const generatedAt = new Date().toISOString();
const pseudoOps = parsePseudoOps();
const basicInstructions = parseBasicInstructions();
const syscallMatrix = parseSyscallMatrix();
const helpReference = buildHelpReference(pseudoOps);

emitReferenceModule(pseudoOpsOutputPath, "pseudoOps", pseudoOps, {
  source: "../PseudoOps.txt",
  generatedAt
});
emitReferenceModule(instructionsOutputPath, "basicInstructions", basicInstructions, {
  source: "../mars/mips/instructions/InstructionSet.java",
  generatedAt
});
emitReferenceModule(syscallsOutputPath, "syscallMatrix", syscallMatrix, {
  source: "../Syscall.properties + mars/mips/instructions/syscalls/*.java",
  generatedAt
});
writeFileSync(helpReferenceOutputPath, `${JSON.stringify(helpReference, null, 2)}\n`, "utf8");
writeFileSync(localizedHelpReferenceOutputPath, `${JSON.stringify(helpReference, null, 2)}\n`, "utf8");

console.log(`[reference] Generated ${pseudoOpsOutputPath}`);
console.log(`[reference] Generated ${syscallsOutputPath}`);
console.log(`[reference] Generated ${helpReferenceOutputPath}`);
console.log(`[reference] Generated ${localizedHelpReferenceOutputPath}`);
console.log(`[reference] Pseudo-ops: ${pseudoOps.length}`);
console.log(`[reference] Syscalls: ${syscallMatrix.length}`);
console.log(`[reference] Basic instructions: ${helpReference.basicInstructions.length}`);
console.log(`[reference] Directives: ${helpReference.directives.length}`);
