import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const compilerPath = join(repoRoot, "web", "assets", "js", "app-modules", "17-mini-c-compiler.js");
const resultDir = join(repoRoot, "test-results");

export const SUBSET_ORDER = Object.freeze(["C0-S0", "C0-S1", "C0-S2", "C0-S3", "C0-S4", "C1-NATIVE"]);

export function subsetIndex(subsetName) {
  return SUBSET_ORDER.indexOf(String(subsetName || "").toUpperCase());
}

export function subsetAt(index) {
  if (!Number.isFinite(index) || index < 0 || index >= SUBSET_ORDER.length) return null;
  return SUBSET_ORDER[index];
}

export function previousSubset(subsetName) {
  const idx = subsetIndex(subsetName);
  return idx > 0 ? subsetAt(idx - 1) : null;
}

export function ensureResultDirectory() {
  mkdirSync(resultDir, { recursive: true });
  return resultDir;
}

export function writeJsonReport(fileName, payload) {
  ensureResultDirectory();
  const outputPath = join(resultDir, String(fileName || "mini-c-report.json"));
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return outputPath;
}

export function loadMiniCCompiler({ exposeIntrinsics = false } = {}) {
  const source = readFileSync(compilerPath, "utf8");

  const sandbox = {
    globalThis: {},
    window: undefined,
    console
  };
  sandbox.global = sandbox.globalThis;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "17-mini-c-compiler.js" });

  const compiler = sandbox.globalThis?.WebMarsModules?.miniCCompiler;
  if (!compiler || typeof compiler.compile !== "function") {
    throw new Error("Unable to load mini-c compiler module from 17-mini-c-compiler.js.");
  }

  return {
    compiler,
    intrinsics: exposeIntrinsics ? extractFrozenObjectLiteral(source, "const INTRINSICS = Object.freeze(") : null,
    subsetLevels: exposeIntrinsics ? extractFrozenObjectLiteral(source, "const SUBSET_LEVELS = Object.freeze(") : null,
    compilerPath
  };
}

function extractFrozenObjectLiteral(sourceText, marker) {
  const source = String(sourceText || "");
  const markerText = String(marker || "");
  const markerIndex = source.indexOf(markerText);
  if (markerIndex < 0) return null;
  const openParenIndex = markerIndex + markerText.length - 1;
  const openBraceIndex = source.indexOf("{", openParenIndex);
  if (openBraceIndex < 0) return null;

  let depth = 0;
  let inString = false;
  let stringQuote = "";
  let escaped = false;
  let closeBraceIndex = -1;

  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === stringQuote) {
        inString = false;
        stringQuote = "";
      }
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") {
      inString = true;
      stringQuote = ch;
      continue;
    }
    if (ch === "{") {
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        closeBraceIndex = i;
        break;
      }
      continue;
    }
  }

  if (closeBraceIndex < 0) return null;
  const objectLiteral = source.slice(openBraceIndex, closeBraceIndex + 1);
  try {
    return vm.runInNewContext(`(${objectLiteral})`, Object.create(null));
  } catch {
    return null;
  }
}

export function extractSyscallServices(asmText = "") {
  const services = [];
  const pattern = /\bli\s+\$v0,\s*(-?\d+)\b/g;
  let match = null;
  while ((match = pattern.exec(String(asmText || ""))) !== null) {
    const value = Number.parseInt(match[1], 10);
    if (Number.isFinite(value)) services.push(value);
  }
  return services;
}

export function subtractMultiset(values = [], toRemove = []) {
  const counts = new Map();
  for (const value of toRemove) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  const result = [];
  for (const value of values) {
    const current = counts.get(value) || 0;
    if (current > 0) counts.set(value, current - 1);
    else result.push(value);
  }
  return result;
}

export function firstDiagnosticMessage(compileResult) {
  const errors = Array.isArray(compileResult?.errors) ? compileResult.errors : [];
  const first = errors[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof first.message === "string") return first.message;
  return "";
}
