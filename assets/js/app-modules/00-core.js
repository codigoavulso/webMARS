const DEFAULT_SETTINGS = {
  version: "4.5",
  extendedAssembler: true,
  bareMachine: false,
  assembleOnOpen: false,
  assembleAll: false,
  delayedBranching: false,
  warningsAreErrors: false,
  startAtMain: false,
  selfModifyingCode: false,
  popupSyscallInput: false,
  programArguments: false,
  programArgumentsLine: "",
  maxMessageCharacters: 200000,
  maxErrors: 200,
  maxBacksteps: 100,
  maxMemoryBytes: 2 * 1024 * 1024 * 1024,
  coreBackend: "wasm",
  fileExtensions: ["asm", "s"],
  asciiNonPrint: "."
};

const DEFAULT_MEMORY_MAP = {
  textBase: 0x00400000,
  externBase: 0x10000000,
  dataSegmentBase: 0x10000000,
  globalPointer: 0x10008000,
  dataBase: 0x10010000,
  heapBase: 0x10040000,
  stackPointer: 0x7fffeffc,
  stackBase: 0x7ffffffc,
  kernelBase: 0x80000000,
  kernelTextBase: 0x80000000,
  kernelDataBase: 0x90000000,
  exceptionHandlerAddress: 0x80000180,
  mmioBase: 0xffff0000
};
const MEMORY_CONFIG_PRESETS = {
  Default: {
    id: "Default",
    label: "Default",
    textBase: 0x00400000,
    externBase: 0x10000000,
    dataSegmentBase: 0x10000000,
    globalPointer: 0x10008000,
    dataBase: 0x10010000,
    heapBase: 0x10040000,
    stackPointer: 0x7fffeffc,
    stackBase: 0x7ffffffc,
    kernelBase: 0x80000000,
    kernelTextBase: 0x80000000,
    kernelDataBase: 0x90000000,
    exceptionHandlerAddress: 0x80000180,
    mmioBase: 0xffff0000
  },
  CompactDataAtZero: {
    id: "CompactDataAtZero",
    label: "Compact, Data at Address 0",
    textBase: 0x00003000,
    externBase: 0x00001000,
    dataSegmentBase: 0x00000000,
    globalPointer: 0x00001800,
    dataBase: 0x00000000,
    heapBase: 0x00002000,
    stackPointer: 0x00002ffc,
    stackBase: 0x00002ffc,
    kernelBase: 0x00004000,
    kernelTextBase: 0x00004000,
    kernelDataBase: 0x00005000,
    exceptionHandlerAddress: 0x00004180,
    mmioBase: 0x00007f00
  },
  CompactTextAtZero: {
    id: "CompactTextAtZero",
    label: "Compact, Text at Address 0",
    textBase: 0x00000000,
    externBase: 0x00001000,
    dataSegmentBase: 0x00001000,
    globalPointer: 0x00001800,
    dataBase: 0x00002000,
    heapBase: 0x00003000,
    stackPointer: 0x00003ffc,
    stackBase: 0x00003ffc,
    kernelBase: 0x00004000,
    kernelTextBase: 0x00004000,
    kernelDataBase: 0x00005000,
    exceptionHandlerAddress: 0x00004180,
    mmioBase: 0x00007f00
  }
};
const INITIAL_SOURCE = `# MARS 4.5 web shell
# Example program
.text
main:
li $t0, 5
li $t1, 7
add $t2, $t0, $t1
syscall`;

const EXAMPLE_FILES = [
  { label: "mips.asm", path: "./examples/mips.asm", category: "Tools" }
];

const SYSCALL_MAX_FILES = 32;
const STDIN_FD = 0;
const STDOUT_FD = 1;
const STDERR_FD = 2;
const FILE_OPEN_RDONLY = 0;
const FILE_OPEN_WRONLY = 1;
const FILE_OPEN_APPEND = 9;
const VFS_STORAGE_KEY = "webmars-vfs-v1";
const MIDI_DEFAULTS = Object.freeze({
  pitch: 60,
  duration: 1000,
  instrument: 0,
  volume: 100
});
const BACKSTEP_HISTORY_BUDGET_CAP_BYTES = 64 * 1024 * 1024;
const BACKSTEP_HISTORY_BUDGET_MIN_BYTES = 512 * 1024;
const BACKSTEP_HISTORY_BUDGET_DIVISOR = 8;
const GENERIC_MAP_ENTRY_ESTIMATE_BYTES = 40;
const BACKSTEP_MEMORY_CHANGE_ENTRY_ESTIMATE_BYTES = 16;
const STRING_CHAR_ESTIMATE_BYTES = 2;

function clampByte(value) {
  return Number(value) & 0xff;
}

function cloneByteArray(value) {
  if (value instanceof Uint8Array) {
    return new Uint8Array(value);
  }
  if (Array.isArray(value)) {
    return Uint8Array.from(value.map(clampByte));
  }
  if (value && ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  }
  if (typeof value === "string") {
    const out = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i += 1) out[i] = value.charCodeAt(i) & 0xff;
    return out;
  }
  return new Uint8Array(0);
}

function bytesToText(bytes) {
  const payload = cloneByteArray(bytes);
  let out = "";
  for (let i = 0; i < payload.length; i += 1) out += String.fromCharCode(payload[i]);
  return out;
}

function textToBytes(text) {
  return cloneByteArray(String(text ?? ""));
}

function bytesToStorageHex(bytes) {
  const payload = cloneByteArray(bytes);
  let out = "";
  for (let i = 0; i < payload.length; i += 1) out += payload[i].toString(16).padStart(2, "0");
  return out;
}

function storageHexToBytes(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return new Uint8Array(0);
  if (!/^[\da-f]+$/i.test(raw) || (raw.length % 2) !== 0) return new Uint8Array(0);
  const out = new Uint8Array(raw.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16) & 0xff;
  }
  return out;
}

function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    getState: () => state,
    setState: (patch) => {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener(state));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

const USER_REGISTER_NAMES = [
  "$zero", "$at", "$v0", "$v1", "$a0", "$a1", "$a2", "$a3",
  "$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6", "$t7",
  "$s0", "$s1", "$s2", "$s3", "$s4", "$s5", "$s6", "$s7",
  "$t8", "$t9", "$k0", "$k1", "$gp", "$sp", "$fp", "$ra"
];

const EXTRA_REGISTER_NAMES = ["$hi", "$lo"];

const REGISTER_ALIASES = {
  zero: 0,
  at: 1,
  v0: 2,
  v1: 3,
  a0: 4,
  a1: 5,
  a2: 6,
  a3: 7,
  t0: 8,
  t1: 9,
  t2: 10,
  t3: 11,
  t4: 12,
  t5: 13,
  t6: 14,
  t7: 15,
  s0: 16,
  s1: 17,
  s2: 18,
  s3: 19,
  s4: 20,
  s5: 21,
  s6: 22,
  s7: 23,
  t8: 24,
  t9: 25,
  k0: 26,
  k1: 27,
  gp: 28,
  sp: 29,
  fp: 30,
  s8: 30,
  ra: 31,
  hi: 32,
  lo: 33
};

const toHex = (value, size = 8) => `0x${(value >>> 0).toString(16).padStart(size, "0")}`;

let wasmHotpath = null;
function getWasmHotpath() {
  if (wasmHotpath && wasmHotpath.ready === true) return wasmHotpath;
  if (typeof window === "undefined") return null;
  const candidate = window.WebMarsWasmHotpath;
  if (candidate && candidate.ready === true && typeof candidate.clamp32 === "function") {
    wasmHotpath = candidate;
    return wasmHotpath;
  }
  return null;
}

const clamp32 = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath) return hotpath.clamp32(value);
  return value | 0;
};
const signExtend16 = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.signExtend16 === "function") return hotpath.signExtend16(value);
  return ((Number(value) || 0) << 16) >> 16;
};
const zeroExtend16 = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.zeroExtend16 === "function") return hotpath.zeroExtend16(value);
  return (Number(value) || 0) & 0xffff;
};
const float32ToBits = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.float32ToBits === "function") return hotpath.float32ToBits(value);
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, Number(value) || 0, false);
  return view.getInt32(0, false);
};
const bitsToFloat32 = (bits) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.bitsToFloat32 === "function") return hotpath.bitsToFloat32(bits);
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, clamp32(bits), false);
  return view.getFloat32(0, false);
};
const float64HighWord = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.float64HighWord === "function") return hotpath.float64HighWord(value);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, Number(value) || 0, false);
  return view.getInt32(0, false);
};
const float64LowWord = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.float64LowWord === "function") return hotpath.float64LowWord(value);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, Number(value) || 0, false);
  return view.getInt32(4, false);
};
const wordsToFloat64 = (highWord, lowWord) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.wordsToFloat64 === "function") return hotpath.wordsToFloat64(highWord, lowWord);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setInt32(0, clamp32(highWord), false);
  view.setInt32(4, clamp32(lowWord), false);
  return view.getFloat64(0, false);
};
const composeWord = (b0, b1, b2, b3) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.composeWord === "function") return hotpath.composeWord(b0, b1, b2, b3);
  return clamp32((((b0 & 0xff) << 24) | ((b1 & 0xff) << 16) | ((b2 & 0xff) << 8) | (b3 & 0xff)) >>> 0);
};
const getWordByte = (word, index) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.getWordByte === "function") return hotpath.getWordByte(word, index);
  return (word >>> ((3 - (index & 0x3)) * 8)) & 0xff;
};
const setWordByte = (word, index, byte) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.setWordByte === "function") return hotpath.setWordByte(word, index, byte);
  const shift = (3 - (index & 0x3)) * 8;
  return clamp32((word & ~(0xff << shift)) | ((byte & 0xff) << shift));
};
const clz32 = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.clz32 === "function") return hotpath.clz32(value);
  return Math.clz32((Number(value) || 0) >>> 0);
};
const clo32 = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.clo32 === "function") return hotpath.clo32(value);
  return Math.clz32(~((Number(value) || 0) >>> 0));
};
const saturatingInt32 = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.saturatingInt32 === "function") return hotpath.saturatingInt32(value);
  if (!Number.isFinite(value) || value < -2147483648 || value > 2147483647) return 2147483647;
  return clamp32(value);
};
const roundNearestEven32 = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.roundNearestEven === "function") return hotpath.roundNearestEven(value);
  const numeric = Number(value) || 0;
  const floor = Math.floor(numeric);
  const frac = numeric - floor;
  if (frac < 0.5) return floor;
  if (frac > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
};
const floorNumber = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.floorNumber === "function") return hotpath.floorNumber(value);
  return Math.floor(Number(value) || 0);
};
const ceilNumber = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.ceilNumber === "function") return hotpath.ceilNumber(value);
  return Math.ceil(Number(value) || 0);
};
const truncNumber = (value) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.truncNumber === "function") return hotpath.truncNumber(value);
  return Math.trunc(Number(value) || 0);
};
const add32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.add32 === "function") return hotpath.add32(a, b);
  return clamp32((Number(a) || 0) + (Number(b) || 0));
};
const sub32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.sub32 === "function") return hotpath.sub32(a, b);
  return clamp32((Number(a) || 0) - (Number(b) || 0));
};
const addOverflow32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.addOverflow32 === "function") return hotpath.addOverflow32(a, b) === 1;
  const lhs = clamp32(a);
  const rhs = clamp32(b);
  const sum = clamp32(lhs + rhs);
  return (lhs >= 0 && rhs >= 0 && sum < 0) || (lhs < 0 && rhs < 0 && sum >= 0);
};
const subOverflow32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.subOverflow32 === "function") return hotpath.subOverflow32(a, b) === 1;
  const lhs = clamp32(a);
  const rhs = clamp32(b);
  const diff = clamp32(lhs - rhs);
  return (lhs >= 0 && rhs < 0 && diff < 0) || (lhs < 0 && rhs >= 0 && diff >= 0);
};
const mulSignedLo32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.mulSignedLo32 === "function") return hotpath.mulSignedLo32(a, b);
  const product = BigInt(a | 0) * BigInt(b | 0);
  return clamp32(Number(BigInt.asIntN(32, product)));
};
const mulSignedHi32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.mulSignedHi32 === "function") return hotpath.mulSignedHi32(a, b);
  const product = BigInt.asIntN(64, BigInt(a | 0) * BigInt(b | 0));
  return clamp32(Number(BigInt.asIntN(32, product >> 32n)));
};
const mulUnsignedLo32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.mulUnsignedLo32 === "function") return hotpath.mulUnsignedLo32(a, b);
  const product = BigInt(a >>> 0) * BigInt(b >>> 0);
  return clamp32(Number(BigInt.asUintN(32, product)));
};
const mulUnsignedHi32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.mulUnsignedHi32 === "function") return hotpath.mulUnsignedHi32(a, b);
  const product = BigInt.asUintN(64, BigInt(a >>> 0) * BigInt(b >>> 0));
  return clamp32(Number(BigInt.asUintN(32, product >> 32n)));
};
const divSignedQuot32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.divSignedQuot32 === "function") return hotpath.divSignedQuot32(a, b);
  if ((b | 0) === 0) return 0;
  return clamp32((a | 0) / (b | 0));
};
const divSignedRem32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.divSignedRem32 === "function") return hotpath.divSignedRem32(a, b);
  if ((b | 0) === 0) return 0;
  return clamp32((a | 0) % (b | 0));
};
const divUnsignedQuot32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.divUnsignedQuot32 === "function") return hotpath.divUnsignedQuot32(a, b);
  if ((b >>> 0) === 0) return 0;
  return clamp32(Math.floor((a >>> 0) / (b >>> 0)) >>> 0);
};
const divUnsignedRem32 = (a, b) => {
  const hotpath = getWasmHotpath();
  if (hotpath && typeof hotpath.divUnsignedRem32 === "function") return hotpath.divUnsignedRem32(a, b);
  if ((b >>> 0) === 0) return 0;
  return clamp32(((a >>> 0) % (b >>> 0)) >>> 0);
};
const translateText = (message, variables = {}) => {
  const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
  if (i18n && typeof i18n.t === "function") return i18n.t(message, variables);
  return String(message ?? "").replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match
  ));
};

function stripToken(token) {
  return token.replace(/[(),]/g, "").trim();
}

function parseImmediate(token) {
  const clean = stripToken(token).replace(/_/g, "");
  if (/^[-+]?0x[\da-f]+$/i.test(clean)) {
    return parseInt(clean, 16);
  }
  if (/^[-+]?0b[01]+$/i.test(clean)) {
    const sign = clean.startsWith("-") ? -1 : 1;
    const bits = clean.replace(/^[-+]?0b/i, "");
    return sign * parseInt(bits, 2);
  }
  if (/^[-+]?\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }
  if (/^'(?:\\.|[^\\'])'$/.test(clean)) {
    const body = clean.slice(1, -1);
    if (!body.startsWith("\\")) {
      return body.charCodeAt(0);
    }
    const esc = body[1];
    if (esc === "n") return "\n".charCodeAt(0);
    if (esc === "t") return "\t".charCodeAt(0);
    if (esc === "r") return "\r".charCodeAt(0);
    if (esc === "0") return 0;
    if (esc === "'") return "'".charCodeAt(0);
    if (esc === '"') return '"'.charCodeAt(0);
    if (esc === "\\") return "\\".charCodeAt(0);
    return esc.charCodeAt(0);
  }
  return Number.NaN;
}

function extractOffsetAndBase(token) {
  const clean = token.replace(/\s+/g, "");
  const match = /^([-+]?0x[\da-f]+|[-+]?\d+)?\((\$?[\w\d]+)\)$/i.exec(clean);
  if (!match) {
    return null;
  }
  return {
    offset: match[1] ? parseImmediate(match[1]) : 0,
    base: match[2]
  };
}

function normalizeRegisterToken(token) {
  return stripToken(token).toLowerCase().replace(/^\$/, "");
}

function stripComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : "";
    if (ch === '"' && !inSingle && prev !== "\\") inDouble = !inDouble;
    else if (ch === "'" && !inDouble && prev !== "\\") inSingle = !inSingle;
    else if (ch === "#" && !inSingle && !inDouble) return line.slice(0, i);
  }
  return line;
}

function splitArguments(text) {
  const values = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : "";

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

    if (!inSingle && !inDouble && ch === ",") {
      const token = current.trim();
      if (token) values.push(token);
      current = "";
      continue;
    }

    current += ch;
  }

  const token = current.trim();
  if (token) values.push(token);
  return values;
}

function parseStringLiteral(token) {
  const raw = String(token ?? "").trim();
  if (!raw.startsWith('"') || !raw.endsWith('"')) return null;

  let output = "";
  for (let i = 1; i < raw.length - 1; i += 1) {
    const ch = raw[i];
    if (ch !== "\\") {
      output += ch;
      continue;
    }

    i += 1;
    if (i >= raw.length - 1) break;
    const esc = raw[i];
    if (esc === "n") output += "\n";
    else if (esc === "t") output += "\t";
    else if (esc === "r") output += "\r";
    else if (esc === "0") output += "\0";
    else if (esc === "\\") output += "\\";
    else if (esc === '"') output += '"';
    else if (esc === "'") output += "'";
    else output += esc;
  }

  return output;
}

function tokenizeStatement(statement) {
  const input = String(statement ?? "").trim();
  if (!input) return [];

  const tokens = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

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

    if (!inSingle && !inDouble && (ch === "," || /\s/.test(ch))) {
      const token = current.trim();
      if (token) tokens.push(token);
      current = "";
      continue;
    }

    current += ch;
  }

  const token = current.trim();
  if (token) tokens.push(token);
  return tokens;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizePathLike(value) {
  return String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/\.\//g, "/")
    .replace(/\/$/, "");
}

function pathBasenameLike(value) {
  const normalized = normalizePathLike(value);
  if (!normalized) return "";
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

function pathDirnameLike(value) {
  const normalized = normalizePathLike(value);
  if (!normalized) return "";
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(0, idx) : "";
}

function pathJoinLike(base, rel) {
  const left = normalizePathLike(base);
  const right = normalizePathLike(rel);
  if (!left) return right;
  if (!right) return left;
  if (right.startsWith("/")) return right.slice(1);
  const parts = `${left}/${right}`.split("/");
  const stack = [];
  parts.forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") {
      if (stack.length) stack.pop();
      return;
    }
    stack.push(part);
  });
  return stack.join("/");
}

let cachedReferencePseudoOpsSource = null;
let cachedReferencePseudoOpsIndex = null;

function getReferenceDataStore() {
  if (typeof window !== "undefined") return window.WebMarsReferenceData || null;
  return globalThis.WebMarsReferenceData || null;
}

function getReferencePseudoOpsIndex() {
  const referenceData = getReferenceDataStore();
  const pseudoOps = Array.isArray(referenceData?.pseudoOps) ? referenceData.pseudoOps : null;
  if (!pseudoOps || !pseudoOps.length) return null;
  if (cachedReferencePseudoOpsSource === pseudoOps && cachedReferencePseudoOpsIndex instanceof Map) {
    return cachedReferencePseudoOpsIndex;
  }

  const index = new Map();
  pseudoOps.forEach((entry) => {
    const op = String(entry?.op || "").toLowerCase();
    if (!op) return;
    if (!index.has(op)) index.set(op, []);
    index.get(op).push(entry);
  });
  cachedReferencePseudoOpsSource = pseudoOps;
  cachedReferencePseudoOpsIndex = index;
  return index;
}

function getReferenceSyscallMatrix() {
  const referenceData = getReferenceDataStore();
  return Array.isArray(referenceData?.syscallMatrix) ? referenceData.syscallMatrix : [];
}

function tokenizePseudoSourceStatement(statement) {
  const input = String(statement ?? "").trim();
  if (!input) return [];

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

function isPseudoPlainLabelToken(token) {
  return /^[A-Za-z_.$][\w.$]*$/.test(String(token ?? "").trim());
}

function parsePseudoLabelExpression(token) {
  const clean = String(token ?? "").trim();
  const match = /^([A-Za-z_.$][\w.$]*)([-+](?:0x[\da-f]+|\d+))$/i.exec(clean);
  if (!match) return null;
  const delta = parseImmediate(match[2]);
  if (!Number.isFinite(delta)) return null;
  return { label: match[1], delta };
}

function fitsPseudoSigned16(value) {
  return Number.isFinite(value) && value >= -32768 && value <= 32767;
}

function fitsPseudoUnsigned16(value) {
  return Number.isFinite(value) && value >= 0 && value <= 65535;
}

function fitsPseudoUnsigned5(value) {
  return Number.isFinite(value) && value >= 0 && value <= 31;
}

function low16SignedValue(value) {
  return signExtend16(value);
}

function low16UnsignedValue(value) {
  return zeroExtend16(value);
}

function high16CarryValue(value) {
  const normalized = Number(value) >>> 0;
  return ((normalized >>> 16) + ((normalized & 0x8000) ? 1 : 0)) & 0xffff;
}

function high16LogicalValue(value) {
  return (Number(value) >>> 16) & 0xffff;
}

function resolvePseudoTokenValue(engine, token, firstPass = false) {
  const direct = parseImmediate(token);
  if (Number.isFinite(direct)) return direct;
  if (firstPass) return Number.NaN;
  const resolved = engine.resolveValue(token);
  return Number.isFinite(resolved) ? resolved : Number.NaN;
}

function resolvePseudoTemplateValue(engine, token, firstPass = false) {
  const resolved = resolvePseudoTokenValue(engine, token, firstPass);
  return Number.isFinite(resolved) ? resolved : 0;
}

function resolvePseudoTokenAddress(engine, token, firstPass = false) {
  const resolved = resolvePseudoTokenValue(engine, token, firstPass);
  return Number.isFinite(resolved) ? (resolved >>> 0) : Number.NaN;
}

function composePseudoSourceValueToken(sourceTokens, index) {
  const base = String(sourceTokens[index] ?? "").trim();
  if (!base) return "";
  const op = String(sourceTokens[index + 1] ?? "").trim();
  const rhs = String(sourceTokens[index + 2] ?? "").trim();
  if ((op === "+" || op === "-") && rhs) return `${base}${op}${rhs}`;
  return base;
}

function nextPseudoRegisterToken(engine, token) {
  const floatIndex = engine.resolveFloatRegister(token);
  if (floatIndex !== null) return floatIndex < 31 ? `$f${floatIndex + 1}` : String(token);
  const registerIndex = engine.resolveRegister(token);
  if (registerIndex !== null) return registerIndex < 31 ? `$${registerIndex + 1}` : String(token);
  return String(token);
}

function matchPseudoPatternToken(engine, patternToken, actualToken, firstPass = false) {
  const pattern = String(patternToken ?? "").trim();
  const actual = String(actualToken ?? "").trim();

  if (pattern === "(" || pattern === ")") return pattern === actual;

  if (/^\$f\d+$/i.test(pattern)) {
    return engine.resolveFloatRegister(actual) !== null;
  }
  if (/^\$/.test(pattern)) {
    return engine.resolveRegister(actual) !== null;
  }

  if (pattern.toLowerCase() === "label") {
    return isPseudoPlainLabelToken(actual);
  }

  if (/^label[-+](?:0x[\da-f]+|\d+)$/i.test(pattern)) {
    return parsePseudoLabelExpression(actual) !== null;
  }

  const numericPattern = parseImmediate(pattern);
  if (Number.isFinite(numericPattern)) {
    const actualValue = resolvePseudoTokenValue(engine, actual, firstPass);
    if (!Number.isFinite(actualValue)) return false;
    if (numericPattern === 10) return fitsPseudoUnsigned5(actualValue);
    if (numericPattern === -100) return fitsPseudoSigned16(actualValue);
    if (numericPattern === 100) return fitsPseudoUnsigned16(actualValue);
    if (Math.abs(numericPattern) === 100000) return true;
  }

  return pattern.toLowerCase() === actual.toLowerCase();
}

function renderPseudoInstructionTokens(tokens) {
  if (!Array.isArray(tokens) || !tokens.length) return "";
  if (tokens.length === 1) return String(tokens[0]);

  const opcode = String(tokens[0]);
  const operands = [];
  let current = "";
  let parenDepth = 0;

  for (let i = 1; i < tokens.length; i += 1) {
    const token = String(tokens[i]);
    if (token === "(") {
      current += "(";
      parenDepth += 1;
      continue;
    }
    if (token === ")") {
      current += ")";
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (!current) {
      current = token;
      continue;
    }
    if (parenDepth > 0) {
      current += token;
      continue;
    }
    operands.push(current);
    current = token;
  }

  if (current) operands.push(current);
  return operands.length ? `${opcode} ${operands.join(", ")}` : opcode;
}

function resolvePseudoTemplateToken(engine, token, sourceTokens, firstPass = false) {
  const templateToken = String(token ?? "").trim();
  if (!templateToken) return "";

  if (/^RG(\d+)$/i.test(templateToken)) {
    const index = Number.parseInt(templateToken.slice(2), 10);
    return String(sourceTokens[index] ?? "");
  }

  if (/^NR(\d+)$/i.test(templateToken)) {
    const index = Number.parseInt(templateToken.slice(2), 10);
    return nextPseudoRegisterToken(engine, sourceTokens[index] ?? "");
  }

  if (/^OP(\d+)$/i.test(templateToken)) {
    const index = Number.parseInt(templateToken.slice(2), 10);
    return String(sourceTokens[index] ?? "");
  }

  if (templateToken === "LAB") {
    return String(sourceTokens[sourceTokens.length - 1] ?? "");
  }

  if (templateToken === "S32") {
    const value = resolvePseudoTemplateValue(engine, sourceTokens[sourceTokens.length - 1], firstPass);
    return String(32 - value);
  }

  const branchOffsetMatch = /^BROFF(\d)(\d)$/i.exec(templateToken);
  if (branchOffsetMatch) {
    return engine.settings.delayedBranching ? branchOffsetMatch[2] : branchOffsetMatch[1];
  }

  const valueTokenMatch = /^(VHL|VH|VL)(\d+)(?:P([1-4]))?(U)?$/i.exec(templateToken);
  if (valueTokenMatch) {
    const kind = valueTokenMatch[1].toUpperCase();
    const index = Number.parseInt(valueTokenMatch[2], 10);
    const plus = Number.parseInt(valueTokenMatch[3] || "0", 10);
    const unsigned = valueTokenMatch[4] === "U";
    const value = (resolvePseudoTemplateValue(engine, sourceTokens[index], firstPass) + plus) >>> 0;
    if (kind === "VL") return String(unsigned ? low16UnsignedValue(value) : low16SignedValue(value));
    if (kind === "VH") return String(high16CarryValue(value));
    return String(high16LogicalValue(value));
  }

  const labelTokenMatch = /^(LH|LL)(\d+)(?:P([1-4]))?(U)?$/i.exec(templateToken);
  if (labelTokenMatch) {
    const kind = labelTokenMatch[1].toUpperCase();
    const index = Number.parseInt(labelTokenMatch[2], 10);
    const plus = Number.parseInt(labelTokenMatch[3] || "0", 10);
    const unsigned = labelTokenMatch[4] === "U";
    const value = (resolvePseudoTokenAddress(engine, sourceTokens[index], firstPass) + plus) >>> 0;
    if (kind === "LL") return String(unsigned ? low16UnsignedValue(value) : low16SignedValue(value));
    return String(high16CarryValue(value));
  }

  const labelPlusMatch = /^(LLP)(P([1-4]))?(U)?$/i.exec(templateToken);
  if (labelPlusMatch) {
    const plus = Number.parseInt(labelPlusMatch[3] || "0", 10);
    const unsigned = labelPlusMatch[4] === "U";
    const value = (resolvePseudoTokenAddress(engine, composePseudoSourceValueToken(sourceTokens, 2), firstPass) + plus) >>> 0;
    return String(unsigned ? low16UnsignedValue(value) : low16SignedValue(value));
  }

  const labelHighMatch = /^(LHPA)(P([1-4]))?$/i.exec(templateToken);
  if (labelHighMatch) {
    const plus = Number.parseInt(labelHighMatch[3] || "0", 10);
    const value = (resolvePseudoTokenAddress(engine, composePseudoSourceValueToken(sourceTokens, 2), firstPass) + plus) >>> 0;
    return String(high16CarryValue(value));
  }

  if (templateToken === "LHPN") {
    const value = resolvePseudoTokenAddress(engine, composePseudoSourceValueToken(sourceTokens, 2), firstPass);
    return String(high16LogicalValue(value));
  }

  if (templateToken === "LHL") {
    const value = resolvePseudoTokenAddress(engine, composePseudoSourceValueToken(sourceTokens, 2), firstPass);
    return String(high16LogicalValue(value));
  }

  return templateToken;
}

function canUseCompactPseudoTemplates(engine, entry, sourceTokens, firstPass = false) {
  if (!Array.isArray(entry?.compactTemplateTokens) || !entry.compactTemplateTokens.length) return false;
  if (firstPass) return false;

  const labelSourceTokens = new Set();
  entry.compactTemplateTokens.forEach((templateTokens) => {
    templateTokens.forEach((token) => {
      const tokenText = String(token ?? "").trim();
      const indexedLabel = /^(?:LL|LH)(\d+)/i.exec(tokenText);
      if (indexedLabel) {
        labelSourceTokens.add(Number.parseInt(indexedLabel[1], 10));
      } else if (/^(?:LLP|LLPU|LLPP\d|LHPA|LHPAP\d|LHPN|LHL)$/i.test(tokenText)) {
        labelSourceTokens.add(2);
      }
    });
  });

  if (!labelSourceTokens.size) return false;
  for (const index of labelSourceTokens) {
    const value = resolvePseudoTokenAddress(engine, sourceTokens[index], false);
    if (!Number.isFinite(value) || !fitsPseudoSigned16(clamp32(value))) return false;
  }
  return true;
}

function expandPseudoFromReferenceEntry(engine, entry, sourceTokens, firstPass = false) {
  const normalizedEntry = entry && typeof entry === "object" ? entry : null;
  if (!normalizedEntry) return null;
  const templateSet = canUseCompactPseudoTemplates(engine, normalizedEntry, sourceTokens, firstPass)
    ? normalizedEntry.compactTemplateTokens
    : normalizedEntry.defaultTemplateTokens;
  if (!Array.isArray(templateSet) || !templateSet.length) return null;

  const expanded = [];
  for (const templateTokens of templateSet) {
    if (!Array.isArray(templateTokens) || !templateTokens.length) return null;
    if (templateTokens.length === 1 && String(templateTokens[0]).trim() === "DBNOP") {
      if (engine.settings.delayedBranching) expanded.push("nop");
      continue;
    }
    const resolvedTokens = templateTokens.map((token) => resolvePseudoTemplateToken(engine, token, sourceTokens, firstPass));
    if (resolvedTokens.some((token) => token == null || token === "")) return null;
    const rendered = renderPseudoInstructionTokens(resolvedTokens);
    if (!rendered) return null;
    expanded.push(rendered);
  }

  return expanded.length ? expanded : null;
}

function stableHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

const EXCEPTION_CODES = {
  ADDRESS_LOAD: 4,
  ADDRESS_STORE: 5,
  SYSCALL: 8,
  BREAKPOINT: 9,
  RESERVED: 10,
  OVERFLOW: 12,
  TRAP: 13,
  DIVIDE_BY_ZERO: 15
};

const COP0_REGISTERS = {
  vaddr: 8,
  badvaddr: 8,
  status: 12,
  cause: 13,
  epc: 14
};

const COP0_DEFAULT_STATUS = 0x0000ff11;
const EXCEPTION_HANDLER_ADDRESS = 0x80000180;

class MarsEngine {
  constructor({ settings, memoryMap }) {
    this.settings = settings;
    this.memoryMap = { ...DEFAULT_MEMORY_MAP, ...(memoryMap ?? {}) };
    this.runtimeHooks = {};
    this.sourceFiles = new Map();
    this.defaultSourceName = "main.s";
    this.activeSourceName = this.defaultSourceName;
    this.lastProgramArguments = [];
    this.persistentVirtualFileSystem = this.loadVirtualFileSystemFromStorage();
    this.reset();
  }

  setRuntimeHooks(hooks = {}) {
    this.runtimeHooks = hooks && typeof hooks === "object" ? hooks : {};
  }

  setMemoryMap(memoryMap = {}) {
    this.memoryMap = { ...this.memoryMap, ...memoryMap };
    this.reset();
  }

  setSourceFiles(files = new Map()) {
    this.sourceFiles = new Map();
    const ingest = (name, source) => {
      const normalizedName = normalizePathLike(name);
      if (!normalizedName) return;
      const text = String(source ?? "");
      this.sourceFiles.set(normalizedName, text);
      const base = pathBasenameLike(normalizedName);
      if (base && !this.sourceFiles.has(base)) this.sourceFiles.set(base, text);
    };

    if (files instanceof Map) {
      files.forEach((source, name) => ingest(name, source));
      return;
    }

    if (Array.isArray(files)) {
      files.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        ingest(entry.name || entry.path || entry.label, entry.source);
      });
      return;
    }

    if (files && typeof files === "object") {
      Object.entries(files).forEach(([name, source]) => ingest(name, source));
    }
  }

  createStdioOpenFileTable() {
    const table = new Map();
    table.set(STDIN_FD, {
      fd: STDIN_FD,
      name: "STDIN",
      flag: FILE_OPEN_RDONLY,
      cursor: 0,
      stdio: true,
      data: new Uint8Array(0)
    });
    table.set(STDOUT_FD, {
      fd: STDOUT_FD,
      name: "STDOUT",
      flag: FILE_OPEN_WRONLY,
      cursor: 0,
      stdio: true,
      data: new Uint8Array(0)
    });
    table.set(STDERR_FD, {
      fd: STDERR_FD,
      name: "STDERR",
      flag: FILE_OPEN_WRONLY,
      cursor: 0,
      stdio: true,
      data: new Uint8Array(0)
    });
    return table;
  }

  cloneVirtualFileSystemMap(source) {
    const map = new Map();
    if (!(source instanceof Map)) return map;
    source.forEach((value, key) => {
      map.set(String(key), cloneByteArray(value));
    });
    return map;
  }

  cloneOpenFilesTable(source) {
    const map = new Map();
    if (!(source instanceof Map)) return map;
    source.forEach((value, key) => {
      if (!value || typeof value !== "object") return;
      map.set(key | 0, {
        fd: Number.isFinite(value.fd) ? (value.fd | 0) : (key | 0),
        name: String(value.name ?? ""),
        flag: Number.isFinite(value.flag) ? (value.flag | 0) : FILE_OPEN_RDONLY,
        cursor: Math.max(0, Number(value.cursor) | 0),
        stdio: Boolean(value.stdio),
        data: cloneByteArray(value.data)
      });
    });
    return map;
  }

  loadVirtualFileSystemFromStorage() {
    if (typeof window === "undefined" || !window.localStorage) return new Map();
    try {
      const raw = window.localStorage.getItem(VFS_STORAGE_KEY);
      if (!raw) return new Map();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return new Map();
      const entries = new Map();
      Object.entries(parsed).forEach(([name, payload]) => {
        const normalized = String(name || "").trim();
        if (!normalized) return;
        if (payload && typeof payload === "object" && typeof payload.hex === "string") {
          entries.set(normalized, storageHexToBytes(payload.hex));
          return;
        }
        if (typeof payload === "string") {
          entries.set(normalized, storageHexToBytes(payload));
        }
      });
      return entries;
    } catch {
      return new Map();
    }
  }

  persistVirtualFileSystemToStorage() {
    this.persistentVirtualFileSystem = this.cloneVirtualFileSystemMap(this.virtualFileSystem);
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const payload = {};
      this.persistentVirtualFileSystem.forEach((bytes, name) => {
        payload[name] = { hex: bytesToStorageHex(bytes) };
      });
      window.localStorage.setItem(VFS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage failures.
    }
  }

  getVirtualFileBytes(name) {
    const key = String(name ?? "");
    if (!this.virtualFileSystem.has(key)) return null;
    return cloneByteArray(this.virtualFileSystem.get(key));
  }

  setVirtualFileBytes(name, bytes) {
    const key = String(name ?? "");
    const payload = cloneByteArray(bytes);
    this.markVirtualFileSystemDirty();
    this.virtualFileSystem.set(key, payload);
    this.persistVirtualFileSystemToStorage();
  }

  allocateFileDescriptor() {
    for (let fd = STDERR_FD + 1; fd < SYSCALL_MAX_FILES; fd += 1) {
      if (!this.openFiles.has(fd)) return fd;
    }
    return -1;
  }

  filenameAlreadyOpen(name) {
    const target = String(name ?? "");
    for (const file of this.openFiles.values()) {
      if (String(file?.name ?? "") === target) return true;
    }
    return false;
  }

  reset() {
    this.assembled = false;
    this.halted = false;
    this.pc = this.memoryMap.textBase >>> 0;
    this.steps = 0;
    this.registers = new Int32Array(USER_REGISTER_NAMES.length + EXTRA_REGISTER_NAMES.length);
    this.registers[28] = clamp32(this.memoryMap.globalPointer ?? DEFAULT_MEMORY_MAP.globalPointer);
    this.registers[29] = clamp32(this.memoryMap.stackPointer ?? this.memoryMap.stackBase ?? DEFAULT_MEMORY_MAP.stackPointer);

    // Coprocessor state
    this.cop0Registers = new Int32Array(32);
    this.cop0Registers[COP0_REGISTERS.status] = COP0_DEFAULT_STATUS;
    this.cop1Registers = new Int32Array(32);
    this.fpuConditionFlags = new Uint8Array(8);

    this.memoryBytes = new Map();
    this.memoryWords = new Map();
    this.breakpoints = new Set();
    this.executionHistory = [];
    this.executionHistoryBytes = 0;
    this.activeHistoryJournal = null;

    this.heapPointer = this.memoryMap.heapBase >>> 0;
    this.randomStreams = new Map();
    this.delayedBranchTarget = null;
    this.lastMemoryWriteAddress = null;

    this.openFiles = this.createStdioOpenFileTable();
    this.virtualFileSystem = this.cloneVirtualFileSystemMap(this.persistentVirtualFileSystem);

    this.program = {
      source: "",
      textRows: [],
      textRowByAddress: new Map(),
      labels: new Map(),
      warnings: [],
      errors: []
    };
  }

  captureState() {
    return {
      pc: this.pc >>> 0,
      steps: this.steps,
      halted: this.halted,
      registers: new Int32Array(this.registers),
      cop0Registers: new Int32Array(this.cop0Registers),
      cop1Registers: new Int32Array(this.cop1Registers),
      fpuConditionFlags: new Uint8Array(this.fpuConditionFlags),
      heapPointer: this.heapPointer >>> 0,
      delayedBranchTarget: this.delayedBranchTarget == null ? null : (this.delayedBranchTarget >>> 0),
      lastMemoryWriteAddress: this.lastMemoryWriteAddress == null ? null : (this.lastMemoryWriteAddress >>> 0),
      memoryChanges: new Map(),
      openFiles: null,
      virtualFileSystem: null,
      randomStreams: null,
      estimatedBytes: 0
    };
  }

  restoreState(state) {
    this.pc = state.pc >>> 0;
    this.steps = state.steps | 0;
    this.halted = Boolean(state.halted);
    this.registers = new Int32Array(state.registers);
    this.cop0Registers = new Int32Array(state.cop0Registers ?? 32);
    this.cop1Registers = new Int32Array(state.cop1Registers ?? 32);
    this.fpuConditionFlags = new Uint8Array(state.fpuConditionFlags ?? 8);
    this.heapPointer = state.heapPointer >>> 0;
    this.activeHistoryJournal = null;

    if (state.randomStreams instanceof Map || Array.isArray(state.randomStreams)) {
      this.randomStreams = new Map(state.randomStreams ?? []);
    }

    if (state.openFiles instanceof Map || Array.isArray(state.openFiles)) {
      const restoredOpen = this.cloneOpenFilesTable(state.openFiles instanceof Map ? state.openFiles : new Map(state.openFiles ?? []));
      const stdio = this.createStdioOpenFileTable();
      stdio.forEach((entry, fd) => {
        restoredOpen.set(fd, entry);
      });
      this.openFiles = restoredOpen;
    }

    if (state.virtualFileSystem instanceof Map || Array.isArray(state.virtualFileSystem)) {
      const restoredVfs = state.virtualFileSystem instanceof Map
        ? state.virtualFileSystem
        : new Map(state.virtualFileSystem ?? []);
      this.virtualFileSystem = this.cloneVirtualFileSystemMap(restoredVfs);
      this.persistVirtualFileSystemToStorage();
    }

    const memoryChanges = state.memoryChanges instanceof Map
      ? state.memoryChanges
      : new Map(state.memoryChanges ?? []);
    if (memoryChanges.size) {
      const dirtyWords = new Set();
      memoryChanges.forEach((previousByte, address) => {
        const addr = address >>> 0;
        this.setByteRaw(addr, previousByte);
        dirtyWords.add(addr & ~0x3);
      });
      dirtyWords.forEach((baseAddress) => this.syncWordCache(baseAddress));
    }

    this.delayedBranchTarget = state.delayedBranchTarget == null ? null : (state.delayedBranchTarget >>> 0);
    this.lastMemoryWriteAddress = state.lastMemoryWriteAddress == null ? null : (state.lastMemoryWriteAddress >>> 0);
  }

  exportNativeState(options = {}) {
    const includeProgram = options.includeProgram !== false;
    const includeBreakpoints = options.includeBreakpoints === true;
    const includeExecutionPlan = includeProgram && options.includeExecutionPlan === true;
    return {
      assembled: this.assembled,
      halted: this.halted,
      pc: this.pc >>> 0,
      steps: this.steps | 0,
      heapPointer: this.heapPointer >>> 0,
      delayedBranchTarget: this.delayedBranchTarget == null ? null : (this.delayedBranchTarget >>> 0),
      lastMemoryWriteAddress: this.lastMemoryWriteAddress == null ? null : (this.lastMemoryWriteAddress >>> 0),
      memoryUsageBytes: this.getMemoryUsageBytes(),
      maxMemoryBytes: this.getMaxMemoryBytes(),
      backstepDepth: this.executionHistory.length,
      backstepHistoryBytes: this.getBackstepHistoryUsageBytes(),
      backstepHistoryBudgetBytes: this.getBackstepHistoryBudgetBytes(),
      registers: Array.from(this.registers, (value) => value | 0),
      cop0: Array.from(this.cop0Registers, (value) => value | 0),
      cop1: Array.from(this.cop1Registers, (value) => value | 0),
      fpuFlags: Array.from(this.fpuConditionFlags, (value) => value | 0),
      memoryWords: Array.from(this.memoryWords.entries(), ([address, value]) => [address >>> 0, value | 0]),
      memoryMap: { ...this.memoryMap },
      source: includeProgram ? String(this.program.source ?? "") : "",
      textRows: includeProgram
        ? this.program.textRows.map((row) => ({
            index: row.index | 0,
            address: row.address >>> 0,
            line: row.line | 0,
            source: String(row.source ?? ""),
            basic: String(row.basic ?? row.source ?? ""),
            machineCodeHex: row.machineCodeHex == null ? "" : String(row.machineCodeHex),
            addressHex: row.addressHex == null ? toHex(row.address) : String(row.addressHex),
            code: row.code ?? null
          }))
        : [],
      executionPlan: includeExecutionPlan ? this.buildNativeExecutionPlan() : [],
      labels: includeProgram
        ? Array.from(this.program.labels.entries(), ([label, address]) => ({
            label: String(label),
            address: address >>> 0
          }))
        : [],
      warnings: includeProgram ? this.program.warnings.map((entry) => ({ ...entry })) : [],
      errors: includeProgram ? this.program.errors.map((entry) => ({ ...entry })) : [],
      breakpoints: includeBreakpoints ? Array.from(this.breakpoints, (address) => address >>> 0) : []
    };
  }

  importNativeState(snapshot = {}, options = {}) {
    const preserveProgram = options.preserveProgram === true;
    const preserveBreakpoints = options.preserveBreakpoints === true;
    const registers = Array.isArray(snapshot.registers) ? snapshot.registers : [];
    const cop0 = Array.isArray(snapshot.cop0) ? snapshot.cop0 : [];
    const cop1 = Array.isArray(snapshot.cop1) ? snapshot.cop1 : [];
    const fpuFlags = Array.isArray(snapshot.fpuFlags) ? snapshot.fpuFlags : [];

    this.assembled = Boolean(snapshot.assembled);
    this.halted = Boolean(snapshot.halted);
    this.pc = Number.isFinite(snapshot.pc) ? (snapshot.pc >>> 0) : (this.memoryMap.textBase >>> 0);
    this.steps = Number.isFinite(snapshot.steps) ? (snapshot.steps | 0) : 0;
    this.heapPointer = Number.isFinite(snapshot.heapPointer) ? (snapshot.heapPointer >>> 0) : (this.memoryMap.heapBase >>> 0);
    this.delayedBranchTarget = snapshot.delayedBranchTarget == null ? null : (snapshot.delayedBranchTarget >>> 0);
    this.lastMemoryWriteAddress = snapshot.lastMemoryWriteAddress == null ? null : (snapshot.lastMemoryWriteAddress >>> 0);
    this.registers = new Int32Array(USER_REGISTER_NAMES.length + EXTRA_REGISTER_NAMES.length);
    this.cop0Registers = new Int32Array(32);
    this.cop1Registers = new Int32Array(32);
    this.fpuConditionFlags = new Uint8Array(8);
    registers.forEach((value, index) => {
      if (index >= 0 && index < this.registers.length) this.registers[index] = clamp32(value);
    });
    cop0.forEach((value, index) => {
      if (index >= 0 && index < this.cop0Registers.length) this.cop0Registers[index] = clamp32(value);
    });
    cop1.forEach((value, index) => {
      if (index >= 0 && index < this.cop1Registers.length) this.cop1Registers[index] = clamp32(value);
    });
    fpuFlags.forEach((value, index) => {
      if (index >= 0 && index < this.fpuConditionFlags.length) this.fpuConditionFlags[index] = value ? 1 : 0;
    });

    this.memoryBytes = new Map();
    this.memoryWords = new Map();
    const memoryEntries = snapshot.memoryWords instanceof Map
      ? Array.from(snapshot.memoryWords.entries())
      : Array.isArray(snapshot.memoryWords)
        ? snapshot.memoryWords
        : [];
    memoryEntries.forEach((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return;
      const address = Number(entry[0]) >>> 0;
      const value = clamp32(entry[1]);
      if (value === 0) return;
      this.memoryWords.set(address, value);
      this.setByteRaw(address, (value >>> 24) & 0xff);
      this.setByteRaw(address + 1, (value >>> 16) & 0xff);
      this.setByteRaw(address + 2, (value >>> 8) & 0xff);
      this.setByteRaw(address + 3, value & 0xff);
    });

    this.executionHistory = [];
    this.executionHistoryBytes = 0;
    this.activeHistoryJournal = null;

    if (!preserveProgram) {
      const textRows = Array.isArray(snapshot.textRows) ? snapshot.textRows : [];
      const labels = Array.isArray(snapshot.labels) ? snapshot.labels : [];
      this.program = {
        source: String(snapshot.source ?? ""),
        textRows: textRows.map((row, index) => ({
          index: Number.isFinite(row?.index) ? (row.index | 0) : index,
          address: Number.isFinite(row?.address) ? (row.address >>> 0) : 0,
          addressHex: row?.addressHex ? String(row.addressHex) : toHex(Number.isFinite(row?.address) ? row.address : 0),
          line: Number.isFinite(row?.line) ? (row.line | 0) : 0,
          source: String(row?.source ?? ""),
          basic: String(row?.basic ?? row?.source ?? ""),
          machineCodeHex: row?.machineCodeHex == null ? "" : String(row.machineCodeHex),
          code: row?.code ?? null
        })),
        textRowByAddress: new Map(),
        labels: new Map(labels.map((entry) => [String(entry?.label ?? ""), Number(entry?.address) >>> 0])),
        warnings: Array.isArray(snapshot.warnings) ? snapshot.warnings.map((entry) => ({ ...entry })) : [],
        errors: Array.isArray(snapshot.errors) ? snapshot.errors.map((entry) => ({ ...entry })) : []
      };
      this.program.textRowByAddress = new Map(this.program.textRows.map((row) => [row.address >>> 0, row]));
    }

    if (!preserveBreakpoints) {
      this.breakpoints = new Set(
        Array.isArray(snapshot.breakpoints)
          ? snapshot.breakpoints.map((address) => Number(address) >>> 0)
          : []
      );
    }

    this.forceZeroRegister();
  }

  resolveNativeMemoryOperand(token) {
    const parsed = extractOffsetAndBase(String(token ?? ""));
    if (parsed) {
      const base = this.resolveRegister(parsed.base);
      if (base === null || !Number.isFinite(parsed.offset)) return null;
      return {
        base,
        offset: clamp32(parsed.offset),
        absolute: null
      };
    }

    const clean = stripToken(String(token ?? ""));
    if (!clean) return null;

    const direct = this.resolveValue(clean);
    if (Number.isFinite(direct)) {
      return {
        base: -1,
        offset: clamp32(direct),
        absolute: direct >>> 0
      };
    }

    const memMatch = /^(.*)\((\$?[\w\d]+)\)$/.exec(clean);
    if (!memMatch) return null;
    const base = this.resolveRegister(memMatch[2]);
    if (base === null) return null;
    const offsetExpr = memMatch[1].trim();
    const offset = offsetExpr ? this.resolveValue(offsetExpr) : 0;
    if (!Number.isFinite(offset)) return null;
    return {
      base,
      offset: clamp32(offset),
      absolute: null
    };
  }

  buildNativeExecutionPlanRow(row) {
    const basic = String(row?.basic ?? row?.source ?? "").trim();
    const entry = {
      address: Number(row?.address) >>> 0,
      line: Number(row?.line) | 0,
      basic,
      opcode: "nop",
      rd: -1,
      rs: -1,
      rt: -1,
      fs: -1,
      ft: -1,
      base: -1,
      immediate: 0,
      target: 0,
      cc: 0,
      absolute: 0,
      delegate: false,
      delegateReason: "",
      valid: true
    };

    const tokens = tokenizeStatement(basic);
    if (!tokens.length) return entry;

    const opcode = String(tokens[0] ?? "").toLowerCase();
    const nextPc = (entry.address + 4) >>> 0;
    const reg = (index) => this.resolveRegister(tokens[index]);
    const freg = (index) => this.resolveFloatRegister(tokens[index]);
    const cop0 = (index) => this.resolveCop0Register(tokens[index]);
    const imm = (index) => this.resolveValue(tokens[index]);
    const markDelegate = (reason = "unsupported") => ({
      ...entry,
      opcode,
      delegate: true,
      delegateReason: reason,
      valid: false
    });

    entry.opcode = opcode;

    if (opcode === "nop") return entry;
    if (opcode === "syscall") return markDelegate("syscall");

    if (opcode === "eret") return entry;

    if (opcode === "break") {
      const code = tokens.length >= 2 ? imm(1) : 0;
      entry.immediate = Number.isFinite(code) ? (code | 0) : 0;
      return entry;
    }

    if (["teq", "tne", "tge", "tgeu", "tlt", "tltu"].includes(opcode)) {
      entry.rs = reg(1);
      entry.rt = reg(2);
      return (entry.rs === null || entry.rt === null) ? markDelegate() : entry;
    }

    if (["teqi", "tnei", "tgei", "tgeiu", "tlti", "tltiu"].includes(opcode)) {
      const value = imm(2);
      entry.rs = reg(1);
      entry.immediate = Number.isFinite(value) ? (value | 0) : 0;
      return (entry.rs === null || !Number.isFinite(value)) ? markDelegate() : entry;
    }

    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu", "mul", "movn", "movz"].includes(opcode)) {
      entry.rd = reg(1);
      entry.rs = reg(2);
      entry.rt = reg(3);
      return (entry.rd === null || entry.rs === null || entry.rt === null) ? markDelegate() : entry;
    }

    if (["clz", "clo"].includes(opcode)) {
      entry.rd = reg(1);
      entry.rs = reg(2);
      return (entry.rd === null || entry.rs === null) ? markDelegate() : entry;
    }

    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(opcode)) {
      const value = imm(3);
      entry.rt = reg(1);
      entry.rs = reg(2);
      entry.immediate = Number.isFinite(value) ? (value | 0) : 0;
      return (entry.rt === null || entry.rs === null || !Number.isFinite(value)) ? markDelegate() : entry;
    }

    if (opcode === "lui") {
      const value = imm(2);
      entry.rt = reg(1);
      entry.immediate = Number.isFinite(value) ? (value | 0) : 0;
      return (entry.rt === null || !Number.isFinite(value)) ? markDelegate() : entry;
    }

    if (["sll", "srl", "sra"].includes(opcode)) {
      const value = imm(3);
      entry.rd = reg(1);
      entry.rt = reg(2);
      entry.immediate = Number.isFinite(value) ? (value | 0) : 0;
      return (entry.rd === null || entry.rt === null || !Number.isFinite(value)) ? markDelegate() : entry;
    }

    if (["sllv", "srlv", "srav"].includes(opcode)) {
      entry.rd = reg(1);
      entry.rt = reg(2);
      entry.rs = reg(3);
      return (entry.rd === null || entry.rt === null || entry.rs === null) ? markDelegate() : entry;
    }

    if (["mult", "multu", "div", "divu", "madd", "maddu", "msub", "msubu"].includes(opcode)) {
      entry.rs = reg(1);
      entry.rt = reg(2);
      return (entry.rs === null || entry.rt === null) ? markDelegate() : entry;
    }

    if (["mfhi", "mflo", "mthi", "mtlo"].includes(opcode)) {
      entry.rd = reg(1);
      return entry.rd === null ? markDelegate() : entry;
    }

    if (["mfc0", "mtc0"].includes(opcode)) {
      entry.rt = reg(1);
      entry.rd = cop0(2);
      return (entry.rt === null || entry.rd === null) ? markDelegate() : entry;
    }

    if (["mfc1", "mtc1"].includes(opcode)) {
      entry.rt = reg(1);
      entry.fs = freg(2);
      return (entry.rt === null || entry.fs === null) ? markDelegate() : entry;
    }

    if (["lw", "sw", "lb", "lbu", "sb", "lh", "lhu", "sh", "ll", "sc", "lwl", "lwr", "swl", "swr", "lwc1", "swc1"].includes(opcode)) {
      const operand = this.resolveNativeMemoryOperand(tokens[2]);
      if (!operand) return markDelegate();
      entry.base = operand.base ?? -1;
      entry.immediate = operand.offset | 0;
      entry.absolute = operand.absolute == null ? 0 : (operand.absolute >>> 0);
      if (opcode === "lwc1" || opcode === "swc1") {
        entry.fs = freg(1);
        return entry.fs === null ? markDelegate() : entry;
      }
      entry.rt = reg(1);
      return entry.rt === null ? markDelegate() : entry;
    }

    if (["ldc1", "sdc1"].includes(opcode)) return markDelegate("fpu");

    if (opcode === "beq" || opcode === "bne") {
      const target = this.branchTarget(tokens[3], nextPc);
      entry.rs = reg(1);
      entry.rt = reg(2);
      entry.target = target == null ? 0 : (target >>> 0);
      return (entry.rs === null || entry.rt === null || target === null) ? markDelegate() : entry;
    }

    if (["bgtz", "blez", "bltz", "bgez", "bgezal", "bltzal"].includes(opcode)) {
      const target = this.branchTarget(tokens[2], nextPc);
      entry.rs = reg(1);
      entry.target = target == null ? 0 : (target >>> 0);
      return (entry.rs === null || target === null) ? markDelegate() : entry;
    }

    if (["bc1f", "bc1t"].includes(opcode)) {
      let cc = 0;
      let targetToken = tokens[1];
      if (tokens.length >= 3) {
        const maybeCc = imm(1);
        if (Number.isFinite(maybeCc)) {
          cc = (maybeCc | 0) & 0x7;
          targetToken = tokens[2];
        }
      }
      const target = this.branchTarget(targetToken, nextPc);
      entry.cc = cc;
      entry.target = target == null ? 0 : (target >>> 0);
      return target === null ? markDelegate() : entry;
    }

    if (opcode === "j" || opcode === "jal") {
      const target = this.resolveLabelAddress(tokens[1]);
      if (target !== null) {
        entry.target = target >>> 0;
        return entry;
      }
      const absolute = parseImmediate(tokens[1]);
      if (!Number.isFinite(absolute)) return markDelegate();
      entry.target = absolute >>> 0;
      return entry;
    }

    if (opcode === "jr" || opcode === "jalr") {
      if (opcode === "jalr") {
        entry.rd = tokens.length >= 3 ? reg(1) : 31;
        entry.rs = tokens.length >= 3 ? reg(2) : reg(1);
      } else {
        entry.rs = reg(1);
        entry.rd = -1;
      }
      return entry.rs === null || (opcode === "jalr" && entry.rd === null) ? markDelegate() : entry;
    }

    if (opcode === "movf" || opcode === "movt") {
      entry.rd = reg(1);
      entry.rs = reg(2);
      const condition = tokens.length >= 4 ? imm(3) : 0;
      entry.cc = Number.isFinite(condition) ? ((condition | 0) & 0x7) : 0;
      return (entry.rd === null || entry.rs === null) ? markDelegate() : entry;
    }

    return markDelegate("unsupported");
  }

  buildNativeExecutionPlan() {
    return this.program.textRows.map((row) => this.buildNativeExecutionPlanRow(row));
  }

  estimateStringStorageBytes(value) {
    return String(value ?? "").length * STRING_CHAR_ESTIMATE_BYTES;
  }

  estimateByteArrayStorageBytes(value) {
    if (value instanceof Uint8Array) return value.byteLength >>> 0;
    if (Array.isArray(value)) return value.length >>> 0;
    if (value && ArrayBuffer.isView(value)) return value.byteLength >>> 0;
    if (typeof value === "string") return value.length >>> 0;
    return 0;
  }

  estimateOpenFilesTableBytes(source) {
    if (!(source instanceof Map)) return 0;
    let total = 0;
    source.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      total += GENERIC_MAP_ENTRY_ESTIMATE_BYTES;
      total += this.estimateStringStorageBytes(entry.name);
      total += this.estimateByteArrayStorageBytes(entry.data);
    });
    return total;
  }

  estimateVirtualFileSystemBytes(source) {
    if (!(source instanceof Map)) return 0;
    let total = 0;
    source.forEach((bytes, name) => {
      total += GENERIC_MAP_ENTRY_ESTIMATE_BYTES;
      total += this.estimateStringStorageBytes(name);
      total += this.estimateByteArrayStorageBytes(bytes);
    });
    return total;
  }

  estimateCapturedStateBytes(state) {
    if (!state || typeof state !== "object") return 0;
    const registerBytes =
      (state.registers?.byteLength ?? 0)
      + (state.cop0Registers?.byteLength ?? 0)
      + (state.cop1Registers?.byteLength ?? 0)
      + (state.fpuConditionFlags?.byteLength ?? 0);
    const memoryChangesBytes = (state.memoryChanges instanceof Map ? state.memoryChanges.size : 0) * BACKSTEP_MEMORY_CHANGE_ENTRY_ESTIMATE_BYTES;
    const openFilesBytes = this.estimateOpenFilesTableBytes(state.openFiles);
    const virtualFileSystemBytes = this.estimateVirtualFileSystemBytes(state.virtualFileSystem);
    const randomStreamsBytes = state.randomStreams instanceof Map
      ? (state.randomStreams.size * GENERIC_MAP_ENTRY_ESTIMATE_BYTES)
      : 0;
    return Math.max(256, 256 + registerBytes + memoryChangesBytes + openFilesBytes + virtualFileSystemBytes + randomStreamsBytes);
  }

  recordMemoryChange(address) {
    const journal = this.activeHistoryJournal;
    if (!journal || !(journal.memoryChanges instanceof Map)) return;
    const addr = address >>> 0;
    if (!journal.memoryChanges.has(addr)) {
      journal.memoryChanges.set(addr, this.getByte(addr));
    }
  }

  markOpenFilesDirty() {
    const journal = this.activeHistoryJournal;
    if (!journal || journal.openFiles instanceof Map) return;
    journal.openFiles = this.cloneOpenFilesTable(this.openFiles);
  }

  markVirtualFileSystemDirty() {
    const journal = this.activeHistoryJournal;
    if (!journal || journal.virtualFileSystem instanceof Map) return;
    journal.virtualFileSystem = this.cloneVirtualFileSystemMap(this.virtualFileSystem);
  }

  markRandomStreamsDirty() {
    const journal = this.activeHistoryJournal;
    if (!journal || journal.randomStreams instanceof Map) return;
    journal.randomStreams = new Map(this.randomStreams);
  }

  clearExecutionHistory() {
    this.executionHistory.length = 0;
    this.executionHistoryBytes = 0;
  }

  discardOldestExecutionHistory() {
    if (!this.executionHistory.length) return null;
    const removed = this.executionHistory.shift();
    const estimatedBytes = Number(removed?.estimatedBytes);
    if (Number.isFinite(estimatedBytes) && estimatedBytes > 0) {
      this.executionHistoryBytes = Math.max(0, this.executionHistoryBytes - Math.floor(estimatedBytes));
    }
    return removed;
  }

  getBackstepHistoryUsageBytes() {
    return this.executionHistoryBytes >>> 0;
  }

  getBackstepHistoryBudgetBytes() {
    const configured = Number(this.settings.maxBackstepHistoryBytes);
    if (Number.isFinite(configured) && configured > 0) {
      return Math.floor(configured);
    }
    const maxMemoryBytes = this.getMaxMemoryBytes();
    if (!Number.isFinite(maxMemoryBytes) || maxMemoryBytes <= 0) {
      return BACKSTEP_HISTORY_BUDGET_CAP_BYTES;
    }
    const derived = Math.floor(maxMemoryBytes / BACKSTEP_HISTORY_BUDGET_DIVISOR);
    return Math.max(
      BACKSTEP_HISTORY_BUDGET_MIN_BYTES,
      Math.min(BACKSTEP_HISTORY_BUDGET_CAP_BYTES, derived)
    );
  }

  trimExecutionHistory() {
    const maxBacksteps = Math.max(0, Number(this.settings.maxBacksteps) | 0);
    const budgetBytes = this.getBackstepHistoryBudgetBytes();
    if (maxBacksteps <= 0 || !Number.isFinite(budgetBytes) || budgetBytes <= 0) {
      this.clearExecutionHistory();
      return;
    }

    while (
      this.executionHistory.length > maxBacksteps
      || (this.executionHistory.length > 1 && this.executionHistoryBytes > budgetBytes)
    ) {
      this.discardOldestExecutionHistory();
    }
  }

  prepareExecutionHistoryCapture() {
    const maxBacksteps = Math.max(0, Number(this.settings.maxBacksteps) | 0);
    const budgetBytes = this.getBackstepHistoryBudgetBytes();
    if (maxBacksteps <= 0 || !Number.isFinite(budgetBytes) || budgetBytes <= 0) {
      this.clearExecutionHistory();
      return { capture: false, budgetBytes };
    }

    return { capture: true, budgetBytes };
  }

  pushExecutionHistory(state) {
    if (!state || typeof state !== "object") return;
    const maxBacksteps = Math.max(0, Number(this.settings.maxBacksteps) | 0);
    const budgetBytes = this.getBackstepHistoryBudgetBytes();
    if (maxBacksteps <= 0 || !Number.isFinite(budgetBytes) || budgetBytes <= 0) {
      this.clearExecutionHistory();
      return;
    }

    const estimatedBytes = Number(state.estimatedBytes);
    const size = Number.isFinite(estimatedBytes) && estimatedBytes > 0
      ? Math.floor(estimatedBytes)
      : this.estimateCapturedStateBytes(state);

    while (
      this.executionHistory.length
      && (
        this.executionHistory.length >= maxBacksteps
        || (this.executionHistoryBytes + size) > budgetBytes
      )
    ) {
      this.discardOldestExecutionHistory();
    }

    state.estimatedBytes = size;
    this.executionHistory.push(state);
    this.executionHistoryBytes += size;
    this.trimExecutionHistory();
  }

  forceZeroRegister() {
    this.registers[0] = 0;
  }

  toSigned64(value) {
    const masked = BigInt.asUintN(64, value);
    return BigInt.asIntN(64, masked);
  }

  getHiLoBigInt() {
    const hi = BigInt(this.registers[32] >>> 0);
    const lo = BigInt(this.registers[33] >>> 0);
    return (hi << 32n) | lo;
  }

  setHiLoBigInt(value) {
    const masked = BigInt.asUintN(64, value);
    this.registers[32] = clamp32(Number((masked >> 32n) & 0xffffffffn));
    this.registers[33] = clamp32(Number(masked & 0xffffffffn));
  }

  getConditionFlag(index = 0) {
    if (!Number.isFinite(index)) return 0;
    const idx = Math.max(0, Math.min(7, index | 0));
    return this.fpuConditionFlags[idx] ? 1 : 0;
  }

  setConditionFlag(index, value) {
    if (!Number.isFinite(index)) return;
    const idx = Math.max(0, Math.min(7, index | 0));
    this.fpuConditionFlags[idx] = value ? 1 : 0;
  }

  resolveFloatRegister(token) {
    const normalized = normalizeRegisterToken(token);
    if (/^f\d+$/.test(normalized)) {
      const index = Number.parseInt(normalized.slice(1), 10);
      if (index >= 0 && index < 32) return index;
    }
    return null;
  }

  resolveCop0Register(token) {
    const normalized = normalizeRegisterToken(token);
    if (/^\d+$/.test(normalized)) {
      const index = Number.parseInt(normalized, 10);
      if (index >= 0 && index < 32) return index;
    }
    if (Object.prototype.hasOwnProperty.call(COP0_REGISTERS, normalized)) {
      return COP0_REGISTERS[normalized];
    }
    return null;
  }

  getFloat32(registerIndex) {
    return bitsToFloat32(this.cop1Registers[registerIndex] | 0);
  }

  setFloat32(registerIndex, value) {
    this.cop1Registers[registerIndex] = float32ToBits(value);
  }

  getFloat64(registerIndex) {
    if ((registerIndex & 1) !== 0) {
      throw new Error(translateText("Double-precision register must be even: $f{register}", { register: registerIndex }));
    }
    return wordsToFloat64(
      this.cop1Registers[registerIndex + 1] | 0,
      this.cop1Registers[registerIndex] | 0
    );
  }

  setFloat64(registerIndex, value) {
    if ((registerIndex & 1) !== 0) {
      throw new Error(translateText("Double-precision register must be even: $f{register}", { register: registerIndex }));
    }
    this.cop1Registers[registerIndex + 1] = float64HighWord(value);
    this.cop1Registers[registerIndex] = float64LowWord(value);
  }

  getByte(address) {
    return this.memoryBytes.get(address >>> 0) ?? 0;
  }

  isTextAddress(address) {
    const addr = address >>> 0;
    const userTextStart = this.memoryMap.textBase >>> 0;
    const userTextEnd = (this.memoryMap.dataSegmentBase ?? this.memoryMap.dataBase ?? DEFAULT_MEMORY_MAP.dataSegmentBase) >>> 0;
    const kernelTextStart = (this.memoryMap.kernelTextBase ?? this.memoryMap.kernelBase ?? DEFAULT_MEMORY_MAP.kernelTextBase) >>> 0;
    const kernelTextEnd = (this.memoryMap.kernelDataBase ?? DEFAULT_MEMORY_MAP.kernelDataBase) >>> 0;
    const inUserText = addr >= userTextStart && addr < userTextEnd;
    const inKernelText = addr >= kernelTextStart && addr < kernelTextEnd;
    return inUserText || inKernelText;
  }

  assertWritableAddress(address, byteLength = 1) {
    if (this.settings.selfModifyingCode) return;
    const size = Math.max(1, byteLength | 0);
    for (let i = 0; i < size; i += 1) {
      const addr = (address + i) >>> 0;
      if (this.isTextAddress(addr)) {
        throw new Error(translateText("Self-modifying code is disabled for text segment writes ({address}).", {
          address: toHex(addr)
        }));
      }
    }
  }

  getMemoryUsageBytes() {
    return this.memoryBytes.size >>> 0;
  }

  getMaxMemoryBytes() {
    const configured = Number(this.settings.maxMemoryBytes);
    if (Number.isFinite(configured) && configured > 0) return Math.floor(configured);
    return 2 * 1024 * 1024 * 1024;
  }

  ensureMemoryCapacity(extraBytes = 0) {
    const growth = Math.max(0, extraBytes | 0);
    if (!growth) return;
    const limit = this.getMaxMemoryBytes();
    if (!Number.isFinite(limit) || limit <= 0) return;
    const used = this.getMemoryUsageBytes();
    if ((used + growth) > limit) {
      throw new Error(translateText("Memory limit exceeded: {requested} bytes requested (limit {limit} bytes).", {
        requested: used + growth,
        limit
      }));
    }
  }

  setByteRaw(address, value) {
    const addr = address >>> 0;
    const masked = value & 0xff;
    if (masked === 0) this.memoryBytes.delete(addr);
    else this.memoryBytes.set(addr, masked);
  }

  setByte(address, value) {
    const addr = address >>> 0;
    this.assertWritableAddress(addr, 1);
    this.recordMemoryChange(addr);
    const masked = value & 0xff;
    if (masked === 0) {
      this.memoryBytes.delete(addr);
    } else {
      if (!this.memoryBytes.has(addr)) this.ensureMemoryCapacity(1);
      this.memoryBytes.set(addr, masked);
    }
    this.syncWordCache(addr & ~0x3);
    this.lastMemoryWriteAddress = (addr & ~0x3) >>> 0;
  }

  syncWordCache(baseAddress) {
    const base = baseAddress >>> 0;
    const b0 = this.getByte(base);
    const b1 = this.getByte(base + 1);
    const b2 = this.getByte(base + 2);
    const b3 = this.getByte(base + 3);
    const word = composeWord(b0, b1, b2, b3);
    if (word === 0) this.memoryWords.delete(base);
    else this.memoryWords.set(base, word);
  }

  readByte(address, signed = true) {
    const value = this.getByte(address >>> 0);
    return signed ? ((value << 24) >> 24) : value;
  }

  writeByte(address, value) {
    this.assertWritableAddress(address >>> 0, 1);
    this.setByte(address >>> 0, value);
  }

  readHalf(address, signed = true) {
    const addr = address >>> 0;
    if (addr % 2 !== 0) throw new Error(translateText("Address not aligned on halfword boundary: {address}", { address: toHex(addr) }));
    const value = ((this.getByte(addr) << 8) | this.getByte(addr + 1)) & 0xffff;
    return signed ? signExtend16(value) : zeroExtend16(value);
  }

  writeHalf(address, value) {
    const addr = address >>> 0;
    if (addr % 2 !== 0) throw new Error(translateText("Address not aligned on halfword boundary: {address}", { address: toHex(addr) }));
    this.assertWritableAddress(addr, 2);
    const numeric = zeroExtend16(value);
    this.setByte(addr, (numeric >>> 8) & 0xff);
    this.setByte(addr + 1, numeric & 0xff);
  }

  readWord(address) {
    const addr = address >>> 0;
    if (addr % 4 !== 0) throw new Error(translateText("Address not aligned on word boundary: {address}", { address: toHex(addr) }));
    return this.memoryWords.get(addr) ?? composeWord(this.getByte(addr), this.getByte(addr + 1), this.getByte(addr + 2), this.getByte(addr + 3));
  }

  writeWord(address, value) {
    const addr = address >>> 0;
    if (addr % 4 !== 0) throw new Error(translateText("Address not aligned on word boundary: {address}", { address: toHex(addr) }));
    this.assertWritableAddress(addr, 4);
    const numeric = value >>> 0;
    this.setByte(addr, (numeric >>> 24) & 0xff);
    this.setByte(addr + 1, (numeric >>> 16) & 0xff);
    this.setByte(addr + 2, (numeric >>> 8) & 0xff);
    this.setByte(addr + 3, numeric & 0xff);
  }
  readNullTerminatedString(address, maxLen = 16384) {
    let out = "";
    let cursor = address >>> 0;
    for (let i = 0; i < maxLen; i += 1) {
      const byte = this.getByte(cursor);
      if (byte === 0) break;
      out += String.fromCharCode(byte);
      cursor = (cursor + 1) >>> 0;
    }
    return out;
  }

  writeString(address, text, includeNull = true, maxBytes = Number.MAX_SAFE_INTEGER) {
    let cursor = address >>> 0;
    let written = 0;
    for (let i = 0; i < text.length && written < maxBytes; i += 1) {
      this.setByte(cursor, text.charCodeAt(i) & 0xff);
      cursor = (cursor + 1) >>> 0;
      written += 1;
    }
    if (includeNull && written < maxBytes) {
      this.setByte(cursor, 0);
      written += 1;
    }
    return written;
  }

  parseProgramArguments(argumentLine) {
    const line = String(argumentLine ?? "").trim();
    if (!line) return [];
    const tokens = [];
    let current = "";
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      const prev = i > 0 ? line[i - 1] : "";
      if (ch === '"' && !inSingle && prev !== "\\") { inDouble = !inDouble; continue; }
      if (ch === "'" && !inDouble && prev !== "\\") { inSingle = !inSingle; continue; }
      if (!inSingle && !inDouble && /\s/.test(ch)) {
        if (current) { tokens.push(current); current = ""; }
        continue;
      }
      current += ch;
    }
    if (current) tokens.push(current);
    return tokens;
  }

  applyProgramArguments(argumentLine) {
    const args = this.parseProgramArguments(argumentLine);
    this.lastProgramArguments = [...args];
    if (!args.length) return;

    let stackCursor = (this.memoryMap.stackPointer ?? this.memoryMap.stackBase ?? DEFAULT_MEMORY_MAP.stackPointer) >>> 0;
    const argPointers = [];

    for (let i = args.length - 1; i >= 0; i -= 1) {
      const bytes = Array.from(args[i]).map((ch) => ch.charCodeAt(0) & 0xff);
      stackCursor = (stackCursor - (bytes.length + 1)) >>> 0;
      this.assertWritableAddress(stackCursor, bytes.length + 1);
      bytes.forEach((byte, index) => this.setByte((stackCursor + index) >>> 0, byte));
      this.setByte((stackCursor + bytes.length) >>> 0, 0);
      argPointers.unshift(stackCursor >>> 0);
    }

    stackCursor &= ~0x3;
    stackCursor = (stackCursor - 4) >>> 0;
    this.writeWord(stackCursor, 0);
    for (let i = argPointers.length - 1; i >= 0; i -= 1) {
      stackCursor = (stackCursor - 4) >>> 0;
      this.writeWord(stackCursor, argPointers[i] >>> 0);
    }

    this.registers[4] = clamp32(args.length);
    this.registers[5] = clamp32(stackCursor);
    this.registers[29] = clamp32(stackCursor);
    this.forceZeroRegister();
  }
  raiseException(cause, message, badAddress = null) {
    const code = cause | 0;
    const preserved = this.cop0Registers[COP0_REGISTERS.cause] & 0x7ffffc83;
    this.cop0Registers[COP0_REGISTERS.cause] = preserved | ((code & 0x1f) << 2);
    if (Number.isFinite(badAddress)) {
      this.cop0Registers[COP0_REGISTERS.vaddr] = clamp32(badAddress);
    }
    this.cop0Registers[COP0_REGISTERS.epc] = clamp32(this.pc);
    this.cop0Registers[COP0_REGISTERS.status] |= (1 << 1);

    const handlerAddress = (this.memoryMap.exceptionHandlerAddress ?? EXCEPTION_HANDLER_ADDRESS) >>> 0;
    const hasHandler = this.program.textRowByAddress?.has(handlerAddress) ?? this.program.textRows.some((row) => row.address === handlerAddress);
    if (hasHandler) {
      return { nextPc: handlerAddress, message: message ?? translateText("exception {code}", { code }), exception: true };
    }

    return { halt: true, message: message ?? translateText("exception {code}", { code }), exception: true };
  }

  parseFpuCondition(tokens, index) {
    if (tokens.length > index + 2) {
      const cc = this.resolveValue(tokens[index]);
      if (Number.isFinite(cc)) return (cc | 0) & 0x7;
    }
    return 0;
  }

  resolveMemoryAddress(token, baseRegisterValue = 0) {
    const parsed = extractOffsetAndBase(token);
    if (parsed) {
      const base = this.resolveRegister(parsed.base);
      if (base === null) return null;
      return (((this.registers[base] | 0) + parsed.offset) >>> 0);
    }

    const clean = stripToken(token);
    if (/\(\$/.test(clean)) {
      const memMatch = /^(.*)\((\$?[\w\d]+)\)$/.exec(clean);
      if (!memMatch) return null;
      const offsetExpr = memMatch[1].trim();
      const base = this.resolveRegister(memMatch[2]);
      if (base === null) return null;
      const offsetValue = offsetExpr ? this.resolveValue(offsetExpr) : 0;
      if (!Number.isFinite(offsetValue)) return null;
      return (((this.registers[base] | 0) + offsetValue) >>> 0);
    }

    const absolute = this.resolveValue(clean);
    if (Number.isFinite(absolute)) return absolute >>> 0;
    if (Number.isFinite(baseRegisterValue)) return (baseRegisterValue >>> 0);
    return null;
  }

  parseFloatingArgs(tokens, precision) {
    if (precision === "single") {
      if (tokens.length < 4) return null;
      return {
        fd: this.resolveFloatRegister(tokens[1]),
        fs: this.resolveFloatRegister(tokens[2]),
        ft: this.resolveFloatRegister(tokens[3])
      };
    }
    if (tokens.length < 4) return null;
    return {
      fd: this.resolveFloatRegister(tokens[1]),
      fs: this.resolveFloatRegister(tokens[2]),
      ft: this.resolveFloatRegister(tokens[3])
    };
  }

  parseRoundingMode(opcode) {
    if (opcode.startsWith("round.")) return "round";
    if (opcode.startsWith("ceil.")) return "ceil";
    if (opcode.startsWith("floor.")) return "floor";
    if (opcode.startsWith("trunc.")) return "trunc";
    return null;
  }

  parseMacroHeader(statement) {
    const body = statement.replace(/^\.macro\b/i, "").trim();
    if (!body) return null;
    const match = /^([A-Za-z_.$][\w.$]*)(.*)$/.exec(body);
    if (!match) return null;

    let argsText = (match[2] ?? "").trim();
    if (argsText.startsWith("(") && argsText.endsWith(")")) {
      argsText = argsText.slice(1, -1).trim();
    }

    const args = argsText
      ? tokenizeStatement(argsText).map((token) => token.trim()).filter(Boolean)
      : [];

    return { name: match[1], args };
  }

  parseMacroInvocationArguments(statement, name) {
    let argsText = statement.slice(name.length).trim();
    if (!argsText) return [];
    if (argsText.startsWith("(") && argsText.endsWith(")")) {
      argsText = argsText.slice(1, -1).trim();
    }
    return argsText ? tokenizeStatement(argsText) : [];
  }

  applyEqv(statement, eqvMap) {
    let output = statement;
    const entries = [...eqvMap.entries()].sort((a, b) => b[0].length - a[0].length);
    entries.forEach(([key, value]) => {
      const pattern = new RegExp(`(?<![\\w.$])${escapeRegExp(key)}(?![\\w.$])`, "g");
      output = output.replace(pattern, value);
    });
    return output;
  }

  expandPseudoFromReference(statement, firstPass = false) {
    if (!this.settings.extendedAssembler) return null;

    const sourceTokens = tokenizePseudoSourceStatement(statement);
    if (!sourceTokens.length) return null;

    const referenceIndex = getReferencePseudoOpsIndex();
    if (!(referenceIndex instanceof Map)) return null;

    const op = String(sourceTokens[0]).toLowerCase();
    const candidates = referenceIndex.get(op);
    if (!Array.isArray(candidates) || !candidates.length) return null;

    for (const entry of candidates) {
      const patternTokens = Array.isArray(entry?.sourceTokens) ? entry.sourceTokens : [];
      if (patternTokens.length !== sourceTokens.length) continue;

      let matched = true;
      for (let i = 0; i < patternTokens.length; i += 1) {
        if (!matchPseudoPatternToken(this, patternTokens[i], sourceTokens[i], firstPass)) {
          matched = false;
          break;
        }
      }
      if (!matched) continue;

      const expanded = expandPseudoFromReferenceEntry(this, entry, sourceTokens, firstPass);
      if (Array.isArray(expanded) && expanded.length) return expanded;
    }

    return null;
  }

  expandPseudo(statement, firstPass = false) {
    const tokens = tokenizeStatement(statement);
    if (!tokens.length) return [];

    const op = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    const asImmediate = (token) => {
      const direct = parseImmediate(token);
      if (Number.isFinite(direct)) return direct;
      if (firstPass) return 0;
      const resolved = this.resolveValue(token);
      return Number.isFinite(resolved) ? resolved : 0;
    };

    const high16 = (value) => ((value >>> 16) + ((value & 0x8000) ? 1 : 0)) & 0xffff;
    const low16 = (value) => value & 0xffff;

    const isImmediateToken = (token) => {
      if (Number.isFinite(parseImmediate(token))) return true;
      if (firstPass) return false;
      return Number.isFinite(this.resolveValue(token));
    };

    const fitsSigned16 = (value) => value >= -32768 && value <= 32767;
    const fitsUnsigned16 = (value) => value >= 0 && value <= 65535;

    const loadToAt = (token, preferUnsignedOri = true) => {
      const value = asImmediate(token);
      if (fitsSigned16(value)) return [`addiu $at, $zero, ${value}`];
      if (preferUnsignedOri && fitsUnsigned16(value)) return [`ori $at, $zero, ${value}`];
      const asUnsigned = value >>> 0;
      return [`lui $at, ${high16(asUnsigned)}`, `ori $at, $at, ${low16(asUnsigned)}`];
    };
    const delaySlotNop = this.settings.delayedBranching ? ["nop"] : [];
    const branchOffset = this.settings.delayedBranching ? 2 : 1;

    const nextIntegerRegister = (token) => {
      const index = this.resolveRegister(token);
      if (index === null || index < 0 || index >= 31) return token;
      return `$${index + 1}`;
    };

    const addToAddressToken = (token, delta) => {
      const clean = String(token).trim().replace(/\s+/g, "");
      const match = /^(.*)\((\$?[\w\d]+)\)$/.exec(clean);
      if (!match) {
        if (delta === 0) return token;
        return `${token}${delta >= 0 ? "+" : ""}${delta}`;
      }

      const prefix = match[1] || "0";
      const base = match[2];
      const numeric = parseImmediate(prefix);
      if (Number.isFinite(numeric)) {
        return `${numeric + delta}(${base})`;
      }
      if (delta === 0) return `${prefix}(${base})`;
      return `${prefix}${delta >= 0 ? "+" : ""}${delta}(${base})`;
    };

    if (!this.settings.extendedAssembler) return [statement];

    const referenceExpanded = this.expandPseudoFromReference(statement, firstPass);
    if (Array.isArray(referenceExpanded) && referenceExpanded.length) return referenceExpanded;

    switch (op) {
      case "nop":
        return ["sll $zero, $zero, 0"];
      case "move":
        return args.length >= 2 ? [`addu ${args[0]}, ${args[1]}, $zero`] : [statement];
      case "clear":
        return args.length >= 1 ? [`addu ${args[0]}, $zero, $zero`] : [statement];
      case "not":
        return args.length >= 2 ? [`nor ${args[0]}, ${args[1]}, $zero`] : [statement];
      case "abs":
        return args.length >= 2
          ? [`sra $at, ${args[1]}, 31`, `xor ${args[0]}, $at, ${args[1]}`, `subu ${args[0]}, ${args[0]}, $at`]
          : [statement];
      case "neg":
        return args.length >= 2 ? [`sub ${args[0]}, $zero, ${args[1]}`] : [statement];
      case "negu":
        return args.length >= 2 ? [`subu ${args[0]}, $zero, ${args[1]}`] : [statement];

      case "li": {
        if (args.length < 2) return [statement];
        const value = asImmediate(args[1]);
        if (fitsSigned16(value)) return [`addiu ${args[0]}, $zero, ${value}`];
        if (fitsUnsigned16(value)) return [`ori ${args[0]}, $zero, ${value}`];
        const asUnsigned = value >>> 0;
        return [`lui ${args[0]}, ${high16(asUnsigned)}`, `ori ${args[0]}, ${args[0]}, ${low16(asUnsigned)}`];
      }

      case "la": {
        if (args.length < 2) return [statement];
        const value = asImmediate(args[1]);
        const asUnsigned = value >>> 0;
        return [`lui ${args[0]}, ${high16(asUnsigned)}`, `ori ${args[0]}, ${args[0]}, ${low16(asUnsigned)}`];
      }

      case "add":
      case "addu":
      case "sub":
      case "subu": {
        if (args.length >= 3 && isImmediateToken(args[2])) {
          const rt = args[0];
          const rs = args[1];
          const imm = args[2];
          if ((op === "add" || op === "addu") && fitsSigned16(asImmediate(imm))) {
            return [`addiu ${rt}, ${rs}, ${asImmediate(imm)}`];
          }
          if ((op === "sub" || op === "subu") && fitsSigned16(asImmediate(imm))) {
            return [`addiu $at, $zero, ${asImmediate(imm)}`, `${op} ${rt}, ${rs}, $at`];
          }
          return [...loadToAt(imm), `${op} ${rt}, ${rs}, $at`];
        }
        return [statement];
      }

      case "subi":
        return args.length >= 3
          ? (fitsSigned16(asImmediate(args[2]))
            ? [`addiu $at, $zero, ${asImmediate(args[2])}`, `sub ${args[0]}, ${args[1]}, $at`]
            : [...loadToAt(args[2]), `sub ${args[0]}, ${args[1]}, $at`])
          : [statement];
      case "subiu":
        return args.length >= 3
          ? (fitsSigned16(asImmediate(args[2]))
            ? [`addiu $at, $zero, ${asImmediate(args[2])}`, `subu ${args[0]}, ${args[1]}, $at`]
            : [...loadToAt(args[2]), `subu ${args[0]}, ${args[1]}, $at`])
          : [statement];

      case "addi":
      case "addiu":
      case "andi":
      case "ori":
      case "xori": {
        if (args.length >= 3 && isImmediateToken(args[2])) {
          const rt = args[0];
          const rs = args[1];
          const immValue = asImmediate(args[2]);
          if ((op === "addi" || op === "addiu") && fitsSigned16(immValue)) return [statement];
          if ((op === "andi" || op === "ori" || op === "xori") && fitsUnsigned16(immValue)) return [statement];
          const logicalOp = op === "andi" ? "and" : (op === "ori" ? "or" : (op === "xori" ? "xor" : (op === "addi" ? "add" : "addu")));
          return [...loadToAt(args[2]), `${logicalOp} ${rt}, ${rs}, $at`];
        }
        return [statement];
      }

      case "and":
      case "or":
      case "xor": {
        if (args.length === 2 && isImmediateToken(args[1])) {
          const rt = args[0];
          const imm = asImmediate(args[1]);
          const immOp = op === "and" ? "andi" : (op === "or" ? "ori" : "xori");
          if (fitsUnsigned16(imm)) return [`${immOp} ${rt}, ${rt}, ${imm >>> 0}`];
          return [...loadToAt(args[1]), `${op} ${rt}, ${rt}, $at`];
        }

        if (args.length >= 3 && isImmediateToken(args[2])) {
          const rt = args[0];
          const rs = args[1];
          const imm = asImmediate(args[2]);
          const immOp = op === "and" ? "andi" : (op === "or" ? "ori" : "xori");
          if (fitsUnsigned16(imm)) return [`${immOp} ${rt}, ${rs}, ${imm >>> 0}`];
          return [...loadToAt(args[2]), `${op} ${rt}, ${rs}, $at`];
        }
        return [statement];
      }

      case "b":
        return args.length >= 1 ? [`bgez $zero, ${args[0]}`] : [statement];
      case "beqz":
        return args.length >= 2 ? [`beq ${args[0]}, $zero, ${args[1]}`] : [statement];
      case "bnez":
        return args.length >= 2 ? [`bne ${args[0]}, $zero, ${args[1]}`] : [statement];

      case "beq":
      case "bne": {
        if (args.length >= 3 && isImmediateToken(args[1])) {
          return [...loadToAt(args[1]), `${op} $at, ${args[0]}, ${args[2]}`];
        }
        return [statement];
      }

      case "blt":
      case "bltu":
      case "bgt":
      case "bgtu":
      case "ble":
      case "bleu":
      case "bge":
      case "bgeu": {
        if (args.length < 3) return [statement];
        const label = args[2];
        const unsigned = op.endsWith("u");
        const sltOp = unsigned ? "sltu" : "slt";
        const left = args[0];
        const right = args[1];
        const rightIsImmediate = isImmediateToken(right);
        const loadRight = rightIsImmediate ? loadToAt(right, unsigned) : [];
        const rightOperand = rightIsImmediate ? "$at" : right;

        if (op.startsWith("blt")) {
          return [...loadRight, `${sltOp} $at, ${left}, ${rightOperand}`, `bne $at, $zero, ${label}`];
        }
        if (op.startsWith("bgt")) {
          return [...loadRight, `${sltOp} $at, ${rightOperand}, ${left}`, `bne $at, $zero, ${label}`];
        }
        if (op.startsWith("ble")) {
          return [...loadRight, `${sltOp} $at, ${rightOperand}, ${left}`, `beq $at, $zero, ${label}`];
        }
        return [...loadRight, `${sltOp} $at, ${left}, ${rightOperand}`, `beq $at, $zero, ${label}`];
      }

      case "div":
      case "divu": {
        if (args.length < 3) return [statement];
        const divOp = op;
        if (isImmediateToken(args[2])) {
          return [...loadToAt(args[2]), `${divOp} ${args[1]}, $at`, `mflo ${args[0]}`];
        }
        return [`${divOp} ${args[1]}, ${args[2]}`, `mflo ${args[0]}`];
      }

      case "rem":
      case "remu": {
        if (args.length < 3) return [statement];
        const divOp = op === "rem" ? "div" : "divu";
        if (isImmediateToken(args[2])) {
          return [...loadToAt(args[2]), `${divOp} ${args[1]}, $at`, `mfhi ${args[0]}`];
        }
        return [`${divOp} ${args[1]}, ${args[2]}`, `mfhi ${args[0]}`];
      }
      case "seq":
      case "sne":
      case "sgt":
      case "sgtu":
      case "sge":
      case "sgeu":
      case "sle":
      case "sleu": {
        if (args.length < 3) return [statement];
        const dst = args[0];
        const left = args[1];
        const right = args[2];
        const unsigned = op.endsWith("u");
        const sltOp = unsigned ? "sltu" : "slt";
        const rightIsImmediate = isImmediateToken(right);
        const setup = rightIsImmediate ? loadToAt(right, unsigned) : [];
        const rightOperand = rightIsImmediate ? "$at" : right;

        if (op.startsWith("seq")) {
          return [...setup, `subu ${dst}, ${left}, ${rightOperand}`, `ori $at, $zero, 1`, `sltu ${dst}, ${dst}, $at`];
        }
        if (op.startsWith("sne")) {
          return [...setup, `subu ${dst}, ${left}, ${rightOperand}`, `sltu ${dst}, $zero, ${dst}`];
        }
        if (op.startsWith("sgt")) {
          return [...setup, `${sltOp} ${dst}, ${rightOperand}, ${left}`];
        }
        if (op.startsWith("sge")) {
          return [...setup, `${sltOp} ${dst}, ${left}, ${rightOperand}`, `ori $at, $zero, 1`, `subu ${dst}, $at, ${dst}`];
        }
        if (op.startsWith("sle")) {
          return [...setup, `${sltOp} ${dst}, ${rightOperand}, ${left}`, `ori $at, $zero, 1`, `subu ${dst}, $at, ${dst}`];
        }
        return [statement];
      }

      case "rol":
      case "ror": {
        if (args.length < 3) return [statement];
        const dst = args[0];
        const src = args[1];
        const amountToken = args[2];
        if (isImmediateToken(amountToken)) {
          const amount = asImmediate(amountToken) & 0x1f;
          const inverse = (32 - amount) & 0x1f;
          if (op === "rol") {
            return [`srl $at, ${src}, ${inverse}`, `sll ${dst}, ${src}, ${amount}`, `or ${dst}, ${dst}, $at`];
          }
          return [`sll $at, ${src}, ${inverse}`, `srl ${dst}, ${src}, ${amount}`, `or ${dst}, ${dst}, $at`];
        }
        if (op === "rol") {
          return [`subu $at, $zero, ${amountToken}`, `srlv $at, ${src}, $at`, `sllv ${dst}, ${src}, ${amountToken}`, `or ${dst}, ${dst}, $at`];
        }
        return [`subu $at, $zero, ${amountToken}`, `sllv $at, ${src}, $at`, `srlv ${dst}, ${src}, ${amountToken}`, `or ${dst}, ${dst}, $at`];
      }

      case "mul": {
        if (args.length < 3) return [statement];
        if (isImmediateToken(args[2])) {
          return [...loadToAt(args[2]), `mul ${args[0]}, ${args[1]}, $at`];
        }
        return [statement];
      }
      case "mulu": {
        if (args.length < 3) return [statement];
        if (isImmediateToken(args[2])) {
          return [...loadToAt(args[2]), `multu ${args[1]}, $at`, `mflo ${args[0]}`];
        }
        return [`multu ${args[1]}, ${args[2]}`, `mflo ${args[0]}`];
      }

      case "mulo": {
        if (args.length < 3) return [statement];
        if (isImmediateToken(args[2])) {
          return [
            ...loadToAt(args[2]),
            `mult ${args[1]}, $at`,
            `mfhi $at`,
            `mflo ${args[0]}`,
            `sra ${args[0]}, ${args[0]}, 31`,
            `beq $at, ${args[0]}, ${branchOffset}`,
            ...delaySlotNop,
            "break",
            `mflo ${args[0]}`
          ];
        }
        return [
          `mult ${args[1]}, ${args[2]}`,
          `mfhi $at`,
          `mflo ${args[0]}`,
          `sra ${args[0]}, ${args[0]}, 31`,
          `beq $at, ${args[0]}, ${branchOffset}`,
          ...delaySlotNop,
          "break",
          `mflo ${args[0]}`
        ];
      }

      case "mulou": {
        if (args.length < 3) return [statement];
        if (isImmediateToken(args[2])) {
          return [
            ...loadToAt(args[2]),
            `multu ${args[1]}, $at`,
            `mfhi $at`,
            `beq $at, $zero, ${branchOffset}`,
            ...delaySlotNop,
            "break",
            `mflo ${args[0]}`
          ];
        }
        return [
          `multu ${args[1]}, ${args[2]}`,
          `mfhi $at`,
          `beq $at, $zero, ${branchOffset}`,
          ...delaySlotNop,
          "break",
          `mflo ${args[0]}`
        ];
      }

      case "mfc1.d":
        return args.length >= 2
          ? [`mfc1 ${args[0]}, ${args[1]}`, `mfc1 ${nextIntegerRegister(args[0])}, ${nextIntegerRegister(args[1])}`]
          : [statement];
      case "mtc1.d":
        return args.length >= 2
          ? [`mtc1 ${args[0]}, ${args[1]}`, `mtc1 ${nextIntegerRegister(args[0])}, ${nextIntegerRegister(args[1])}`]
          : [statement];

      case "l.s":
        return args.length >= 2 ? [`lwc1 ${args[0]}, ${args[1]}`] : [statement];
      case "s.s":
        return args.length >= 2 ? [`swc1 ${args[0]}, ${args[1]}`] : [statement];
      case "l.d":
        return args.length >= 2 ? [`ldc1 ${args[0]}, ${args[1]}`] : [statement];
      case "s.d":
        return args.length >= 2 ? [`sdc1 ${args[0]}, ${args[1]}`] : [statement];

      case "ld":
        return args.length >= 2
          ? [`lw ${args[0]}, ${args[1]}`, `lw ${nextIntegerRegister(args[0])}, ${addToAddressToken(args[1], 4)}`]
          : [statement];
      case "sd":
        return args.length >= 2
          ? [`sw ${args[0]}, ${args[1]}`, `sw ${nextIntegerRegister(args[0])}, ${addToAddressToken(args[1], 4)}`]
          : [statement];

      case "lb":
      case "lbu":
      case "lh":
      case "lhu":
      case "lw":
      case "ll":
      case "lwc1":
      case "ldc1":
      case "sb":
      case "sh":
      case "sw":
      case "sc":
      case "swc1":
      case "sdc1":
      case "lwl":
      case "lwr":
      case "swl":
      case "swr": {
        if (args.length < 2) return [statement];
        const target = args[0];
        const memoryToken = String(args[1]).trim();
        const memMatch = /^(.*)\((\$?[\w\d]+)\)$/.exec(memoryToken.replace(/\s+/g, ""));

        if (memMatch) {
          const offsetToken = (memMatch[1] && memMatch[1].length > 0) ? memMatch[1] : "0";
          const baseToken = memMatch[2];
          const offsetImmediate = parseImmediate(offsetToken);
          if (Number.isFinite(offsetImmediate) && fitsSigned16(offsetImmediate)) return [statement];
          return [
            ...loadToAt(offsetToken, false),
            `addu $at, $at, ${baseToken}`,
            `${op} ${target}, 0($at)`
          ];
        }

        const absolute = parseImmediate(memoryToken);
        if (Number.isFinite(absolute) && fitsSigned16(absolute)) {
          return [`${op} ${target}, ${absolute}($zero)`];
        }

        return [
          ...loadToAt(memoryToken, false),
          `${op} ${target}, 0($at)`
        ];
      }
      case "ulw":
        return args.length >= 2
          ? [`lwl ${args[0]}, ${addToAddressToken(args[1], 3)}`, `lwr ${args[0]}, ${args[1]}`]
          : [statement];
      case "usw":
        return args.length >= 2
          ? [`swl ${args[0]}, ${addToAddressToken(args[1], 3)}`, `swr ${args[0]}, ${args[1]}`]
          : [statement];
      case "ulh":
        return args.length >= 2
          ? [`lb $at, ${args[1]}`, `lbu ${args[0]}, ${addToAddressToken(args[1], 1)}`, `sll $at, $at, 8`, `or ${args[0]}, ${args[0]}, $at`]
          : [statement];
      case "ulhu":
        return args.length >= 2
          ? [`lbu $at, ${args[1]}`, `lbu ${args[0]}, ${addToAddressToken(args[1], 1)}`, `sll $at, $at, 8`, `or ${args[0]}, ${args[0]}, $at`]
          : [statement];
      case "ush":
        return args.length >= 2
          ? [`srl $at, ${args[0]}, 8`, `sb $at, ${args[1]}`, `sb ${args[0]}, ${addToAddressToken(args[1], 1)}`]
          : [statement];

      default:
        return [statement];
    }
  }
  processDataDirective(statement, lineNumber, state, errors, warnings, unresolvedFixups, sizeOnly = false) {
    const tokens = tokenizeStatement(statement);
    if (!tokens.length) return;

    const directive = tokens[0].toLowerCase();
    const body = statement.slice(tokens[0].length).trim();
    const args = splitArguments(body);

    const dataField = state.segment === "kdata" ? "kernelDataAddress" : "dataAddress";
    const alignField = state.segment === "kdata" ? "autoAlignKernelData" : "autoAlignData";

    const getAddr = () => state[dataField] >>> 0;
    const setAddr = (value) => {
      state[dataField] = value >>> 0;
    };
    const autoAlignEnabled = () => state[alignField] !== false;
    const setAutoAlign = (enabled) => {
      state[alignField] = Boolean(enabled);
    };
    const alignAddress = (alignment) => {
      if (!Number.isFinite(alignment) || alignment <= 1) return;
      const addr = getAddr();
      setAddr((addr + alignment - 1) & ~(alignment - 1));
    };

    const writeIntegerBySize = (address, size, value) => {
      const numeric = Number(value) >>> 0;
      const addr = address >>> 0;
      if (size === 1) {
        this.writeByte(addr, numeric & 0xff);
        return;
      }
      if (size === 2) {
        this.writeByte(addr, (numeric >>> 8) & 0xff);
        this.writeByte((addr + 1) >>> 0, numeric & 0xff);
        return;
      }
      this.writeByte(addr, (numeric >>> 24) & 0xff);
      this.writeByte((addr + 1) >>> 0, (numeric >>> 16) & 0xff);
      this.writeByte((addr + 2) >>> 0, (numeric >>> 8) & 0xff);
      this.writeByte((addr + 3) >>> 0, numeric & 0xff);
    };

    const warnIfTruncated = (value, byteSize) => {
      if (byteSize === 1 && (value < -128 || value > 127)) {
        warnings.push({ line: lineNumber, message: translateText("Value '{value}' is out-of-range for .byte and may be truncated.", { value }) });
      }
      if (byteSize === 2 && (value < -32768 || value > 32767)) {
        warnings.push({ line: lineNumber, message: translateText("Value '{value}' is out-of-range for .half and may be truncated.", { value }) });
      }
    };

    const parseRepeatedArg = (arg) => {
      const match = /^(.+?)\s*:\s*(.+)$/.exec(arg);
      if (!match) return { valueToken: arg, repetitions: 1 };
      const count = parseImmediate(match[2]);
      if (!Number.isFinite(count) || (count | 0) <= 0) {
        errors.push({ line: lineNumber, message: translateText("Invalid repetition factor '{factor}' in '{arg}'.", {
          factor: match[2],
          arg
        }) });
        return null;
      }
      return {
        valueToken: match[1].trim(),
        repetitions: count | 0
      };
    };

    if (directive === ".align") {
      if (args.length !== 1) {
        errors.push({ line: lineNumber, message: translateText('".align" requires one operand') });
        return;
      }
      const value = parseImmediate(args[0]);
      if (!Number.isFinite(value) || Math.trunc(value) !== value || value < 0) {
        errors.push({ line: lineNumber, message: translateText('".align" requires a non-negative integer') });
        return;
      }
      if (value === 0) {
        setAutoAlign(false);
        return;
      }
      setAutoAlign(true);
      const alignment = 1 << Math.min(value | 0, 16);
      alignAddress(alignment);
      return;
    }

    if (directive === ".space") {
      if (args.length !== 1) {
        errors.push({ line: lineNumber, message: translateText('".space" requires one operand') });
        return;
      }
      const count = parseImmediate(args[0]);
      if (!Number.isFinite(count) || Math.trunc(count) !== count || count < 0) {
        errors.push({ line: lineNumber, message: translateText('".space" requires a non-negative integer') });
        return;
      }
      const amount = count | 0;
      // Fresh assembly memory is already zero-initialized, so materializing
      // every byte here only wastes browser memory for sparse segments.
      setAddr(getAddr() + amount);
      return;
    }

    if (directive === ".set") {
      if (sizeOnly) {
        warnings.push({ line: lineNumber, message: translateText("MARS currently ignores the .set directive.") });
      }
      return;
    }

    if (directive === ".globl") {
      if (args.length < 1) {
        errors.push({ line: lineNumber, message: translateText('".globl" directive requires at least one argument.') });
        return;
      }
      if (!(state.globalDeclarations instanceof Set)) state.globalDeclarations = new Set();
      for (const token of args) {
        const symbol = stripToken(token);
        if (!/^[A-Za-z_.$][\w.$]*$/.test(symbol)) {
          errors.push({ line: lineNumber, message: translateText('".globl" directive argument must be label.') });
          return;
        }
        state.globalDeclarations.add(symbol);
      }
      return;
    }

    if (directive === ".extern") {
      if (args.length !== 2) {
        errors.push({ line: lineNumber, message: translateText('".extern" directive requires two operands (label and size).') });
        return;
      }
      const symbol = stripToken(args[0]);
      const size = parseImmediate(args[1]);
      if (!/^[A-Za-z_.$][\w.$]*$/.test(symbol)) {
        errors.push({ line: lineNumber, message: translateText("Invalid .extern symbol '{symbol}'.", { symbol: args[0] }) });
        return;
      }
      if (!Number.isFinite(size) || Math.trunc(size) !== size || size < 0) {
        errors.push({ line: lineNumber, message: translateText('".extern" requires a non-negative integer size') });
        return;
      }
      if (state.labelsMap instanceof Map) {
        if (!state.labelsMap.has(symbol)) {
          const externalBase = state.externAddress >>> 0;
          state.labelsMap.set(symbol, externalBase);
          state.externAddress = (state.externAddress + (size | 0)) >>> 0;
        }
      } else {
        state.externAddress = (state.externAddress + (size | 0)) >>> 0;
      }
      return;
    }

    // .include is resolved during preprocessSourceLines and should not reach here.
    if (directive === ".include") {
      return;
    }
    const scalarSize = {
      ".byte": 1,
      ".half": 2,
      ".word": 4,
      ".float": 4,
      ".double": 8
    };

    if (Object.prototype.hasOwnProperty.call(scalarSize, directive)) {
      const size = scalarSize[directive];
      if (autoAlignEnabled() && size > 1) {
        alignAddress(size);
      }

      args.forEach((arg) => {
        const repetition = parseRepeatedArg(arg);
        if (!repetition) return;

        for (let rep = 0; rep < repetition.repetitions; rep += 1) {
          const token = repetition.valueToken;
          if (directive === ".float" || directive === ".double") {
            const parsed = Number.parseFloat(stripToken(token));
            if (!Number.isFinite(parsed)) {
              errors.push({ line: lineNumber, message: translateText("Invalid {directive} value '{token}'.", {
                directive,
                token
              }) });
              continue;
            }

            if (!sizeOnly) {
              const buffer = new ArrayBuffer(size);
              const view = new DataView(buffer);
              if (size === 4) view.setFloat32(0, parsed, false);
              else view.setFloat64(0, parsed, false);
              const base = getAddr();
              for (let i = 0; i < size; i += 1) {
                this.writeByte((base + i) >>> 0, view.getUint8(i));
              }
            }
            setAddr(getAddr() + size);
            continue;
          }

          const value = parseImmediate(token);
          if (!Number.isFinite(value)) {
            if (!sizeOnly) unresolvedFixups.push({ address: getAddr(), token, size, line: lineNumber });
            setAddr(getAddr() + size);
            continue;
          }

          warnIfTruncated(value, size);
          if (!sizeOnly) writeIntegerBySize(getAddr(), size, value);
          setAddr(getAddr() + size);
        }
      });
      return;
    }

    if (directive === ".ascii" || directive === ".asciiz") {
      args.forEach((arg) => {
        const decoded = parseStringLiteral(arg);
        if (decoded === null) {
          errors.push({ line: lineNumber, message: translateText("Invalid string literal '{arg}'.", { arg }) });
          return;
        }
        if (!sizeOnly) {
          for (let i = 0; i < decoded.length; i += 1) {
            this.writeByte(getAddr(), decoded.charCodeAt(i));
            setAddr(getAddr() + 1);
          }
          if (directive === ".asciiz") {
            this.writeByte(getAddr(), 0);
            setAddr(getAddr() + 1);
          }
        } else {
          setAddr(getAddr() + decoded.length + (directive === ".asciiz" ? 1 : 0));
        }
      });
      return;
    }

    errors.push({
      line: lineNumber,
      message: translateText('"{directive}" directive is invalid or not implemented in MARS', { directive })
    });
  }
  preprocessSourceLines(sourceCode, warnings, errors, options = {}) {
    const includeMap = new Map();
    const sourceName = normalizePathLike(options.sourceName || this.activeSourceName || this.defaultSourceName) || this.defaultSourceName;

    const registerSource = (name, source) => {
      const normalized = normalizePathLike(name);
      if (!normalized) return;
      const text = String(source ?? "");
      includeMap.set(normalized, text);
      const base = pathBasenameLike(normalized);
      if (base && !includeMap.has(base)) includeMap.set(base, text);
    };

    if (this.sourceFiles instanceof Map) {
      this.sourceFiles.forEach((source, name) => registerSource(name, source));
    }

    if (options.includeMap instanceof Map) {
      options.includeMap.forEach((source, name) => registerSource(name, source));
    }

    registerSource(sourceName, sourceCode);

    const flattened = [];
    const resolveInclude = (requested, currentFile) => {
      const cleanRequest = normalizePathLike(requested);
      const candidates = [
        cleanRequest,
        pathJoinLike(pathDirnameLike(currentFile), cleanRequest),
        pathBasenameLike(cleanRequest)
      ].filter(Boolean);
      for (const candidate of candidates) {
        if (includeMap.has(candidate)) return candidate;
      }
      return "";
    };

    const walk = (fileName, stack = []) => {
      const normalizedName = normalizePathLike(fileName);
      const sourceText = includeMap.get(normalizedName);
      if (typeof sourceText !== "string") {
        errors.push({ line: 0, message: translateText("[{fileName}] include source not found.", { fileName: normalizedName }) });
        return;
      }
      const lines = sourceText.replace(/\r\n/g, "\n").split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const lineNumber = i + 1;
        const statement = stripComment(lines[i]).trim();
        if (!statement) continue;

        if (/^\.include\b/i.test(statement)) {
          const includeMatch = /^\.include\s+["']([^"']+)["']/i.exec(statement);
          if (!includeMatch) {
            errors.push({ line: lineNumber, message: translateText("[{fileName}] malformed .include directive.", { fileName: normalizedName }) });
            continue;
          }
          const resolved = resolveInclude(includeMatch[1], normalizedName);
          if (!resolved) {
            errors.push({ line: lineNumber, message: translateText("[{fileName}] include '{includeName}' not found.", {
              fileName: normalizedName,
              includeName: includeMatch[1]
            }) });
            continue;
          }
          if (stack.includes(resolved)) {
            errors.push({ line: lineNumber, message: translateText("[{fileName}] circular include detected for '{resolved}'.", {
              fileName: normalizedName,
              resolved
            }) });
            continue;
          }
          walk(resolved, [...stack, resolved]);
          continue;
        }

        flattened.push({ lineNumber, fileName: normalizedName, statement });
      }
    };

    walk(sourceName, [sourceName]);

    const eqvMap = new Map();
    const macros = new Map();
    const output = [];
    let macroCounter = 0;

    const emit = (lineObj, depth = 0) => {
      if (depth > 20) {
        errors.push({ line: lineObj.lineNumber, message: translateText("[{fileName}] Macro expansion depth exceeded.", {
          fileName: lineObj.fileName
        }) });
        return;
      }

      const eqvApplied = this.applyEqv(lineObj.statement, eqvMap).trim();
      if (!eqvApplied) return;

      const tokens = tokenizeStatement(eqvApplied);
      if (!tokens.length) return;
      const macroName = tokens[0];
      const args = this.parseMacroInvocationArguments(eqvApplied, macroName);
      const key = `${macroName}/${args.length}`;

      if (macros.has(key)) {
        const def = macros.get(key);
        const argMap = new Map();
        def.args.forEach((name, index) => argMap.set(name, args[index] ?? ""));

        const labelSet = new Set();
        def.body.forEach((entry) => {
          const labelMatch = /^([A-Za-z_.$][\w.$]*):/.exec(entry.statement);
          if (labelMatch) labelSet.add(labelMatch[1]);
        });

        const suffix = `_M${macroCounter}`;
        macroCounter += 1;

        def.body.forEach((entry) => {
          let expanded = entry.statement;
          argMap.forEach((value, formal) => {
            const pattern = new RegExp(`(?<![\\w.$])${escapeRegExp(formal)}(?![\\w.$])`, "g");
            expanded = expanded.replace(pattern, value);
          });
          labelSet.forEach((label) => {
            const pattern = new RegExp(`(?<![\\w.$])${escapeRegExp(label)}(?![\\w.$])`, "g");
            expanded = expanded.replace(pattern, `${label}${suffix}`);
          });
          emit({ lineNumber: lineObj.lineNumber, fileName: lineObj.fileName, statement: expanded }, depth + 1);
        });
        return;
      }

      output.push({ lineNumber: lineObj.lineNumber, fileName: lineObj.fileName, statement: eqvApplied });
    };

    for (let i = 0; i < flattened.length; i += 1) {
      const lineEntry = flattened[i];
      const { lineNumber, fileName } = lineEntry;
      const statement = lineEntry.statement;
      if (!statement) continue;

      if (/^\.eqv\b/i.test(statement)) {
        const body = statement.replace(/^\.eqv\b/i, "").trim();
        const match = /^([A-Za-z_.$][\w.$]*)\s+(.+)$/.exec(body);
        if (!match) {
          errors.push({ line: lineNumber, message: translateText("[{fileName}] Malformed .eqv directive.", { fileName }) });
          continue;
        }
        eqvMap.set(match[1], match[2].trim());
        continue;
      }

      if (/^\.macro\b/i.test(statement)) {
        const header = this.parseMacroHeader(statement);
        if (!header) {
          errors.push({ line: lineNumber, message: translateText("[{fileName}] Malformed .macro header.", { fileName }) });
          continue;
        }

        const key = `${header.name}/${header.args.length}`;
        if (macros.has(key)) {
          warnings.push({ line: lineNumber, message: translateText("[{fileName}] Duplicate macro '{macroName}' ignored.", {
            fileName,
            macroName: `${header.name}/${header.args.length}`
          }) });
        }

        const bodyLines = [];
        let closed = false;
        while (i + 1 < flattened.length) {
          i += 1;
          const innerEntry = flattened[i];
          const innerLine = stripComment(innerEntry.statement).trim();
          if (/^\.macro\b/i.test(innerLine)) {
            errors.push({ line: innerEntry.lineNumber, message: translateText("[{fileName}] Nested macros are not allowed.", {
              fileName: innerEntry.fileName
            }) });
            continue;
          }
          if (/^\.end_macro\b/i.test(innerLine)) {
            if (!/^\.end_macro\b\s*$/i.test(innerLine)) {
              errors.push({ line: innerEntry.lineNumber, message: translateText("[{fileName}] invalid text after .END_MACRO", {
                fileName: innerEntry.fileName
              }) });
            }
            closed = true;
            break;
          }
          if (innerLine) bodyLines.push({ lineNumber: innerEntry.lineNumber, fileName: innerEntry.fileName, statement: innerLine });
        }

        if (!closed) {
          errors.push({ line: lineNumber, message: translateText("[{fileName}] Macro '{macroName}' missing .end_macro.", {
            fileName,
            macroName: header.name
          }) });
          continue;
        }

        if (!macros.has(key)) {
          macros.set(key, {
            name: header.name,
            args: header.args,
            body: bodyLines
          });
        }
        continue;
      }

      if (/^\.end_macro\b/i.test(statement)) {
        if (!/^\.end_macro\b\s*$/i.test(statement)) {
          errors.push({ line: lineNumber, message: translateText("[{fileName}] invalid text after .END_MACRO", { fileName }) });
        } else {
          errors.push({ line: lineNumber, message: translateText("[{fileName}] .END_MACRO without .MACRO", { fileName }) });
        }
        continue;
      }

      emit({ lineNumber, fileName, statement });
    }

    return output;
  }
  assemble(sourceCode, options = {}) {
    this.reset();
    const normalizedSource = String(sourceCode ?? "");
    const sourceName = normalizePathLike(options.sourceName || this.activeSourceName || this.defaultSourceName) || this.defaultSourceName;
    this.activeSourceName = sourceName;
    this.program.source = normalizedSource;

    const warnings = [];
    const errors = [];
    const lines = this.preprocessSourceLines(normalizedSource, warnings, errors, {
      sourceName,
      includeMap: options.includeMap
    });

    const labels = new Map();
    const textRows = [];

    const pass1State = {
      segment: "text",
      textAddress: this.memoryMap.textBase >>> 0,
      dataAddress: this.memoryMap.dataBase >>> 0,
      externAddress: (this.memoryMap.externBase ?? DEFAULT_MEMORY_MAP.externBase) >>> 0,
      kernelTextAddress: (this.memoryMap.kernelTextBase ?? this.memoryMap.kernelBase ?? DEFAULT_MEMORY_MAP.kernelTextBase) >>> 0,
      kernelDataAddress: (this.memoryMap.kernelDataBase ?? DEFAULT_MEMORY_MAP.kernelDataBase) >>> 0,
      autoAlignData: true,
      autoAlignKernelData: true,
      currentDataDirective: ".word",
      labelsMap: labels
    };
    const updateSegmentAddress = (state, directive, argToken) => {
      const parsed = argToken != null && argToken !== "" ? this.resolveValue(argToken) : Number.NaN;
      const explicit = Number.isFinite(parsed) ? (parsed >>> 0) : null;
      if (directive === ".text") {
        state.segment = "text";
        if (explicit !== null) state.textAddress = explicit;
      } else if (directive === ".data") {
        state.segment = "data";
        if (explicit !== null) state.dataAddress = explicit;
        state.autoAlignData = true;
        state.currentDataDirective = ".word";
      } else if (directive === ".ktext") {
        state.segment = "ktext";
        if (explicit !== null) state.kernelTextAddress = explicit;
      } else if (directive === ".kdata") {
        state.segment = "kdata";
        if (explicit !== null) state.kernelDataAddress = explicit;
        state.autoAlignKernelData = true;
        state.currentDataDirective = ".word";
      }
    };

    const isDataListDirective = (directive) => [
      ".byte", ".half", ".word", ".float", ".double", ".ascii", ".asciiz"
    ].includes(directive);
    const isGlobalDirective = (directive) => directive === ".globl" || directive === ".set" || directive === ".extern" || directive === ".include";
    const recognizedDirectives = new Set([
      ".text", ".data", ".ktext", ".kdata", ".byte", ".half", ".word", ".float", ".double",
      ".ascii", ".asciiz", ".align", ".space", ".extern", ".globl", ".set", ".eqv",
      ".macro", ".end_macro", ".include"
    ]);

    lines.forEach((entry) => {
      let statement = entry.statement;
      if (!statement) return;

      const labelMatch = /^([A-Za-z_.$][\w.$]*):/.exec(statement);
      if (labelMatch) {
        const label = labelMatch[1];
        let address = pass1State.textAddress;
        if (pass1State.segment === "data") address = pass1State.dataAddress;
        else if (pass1State.segment === "ktext") address = pass1State.kernelTextAddress;
        else if (pass1State.segment === "kdata") address = pass1State.kernelDataAddress;

        if (labels.has(label)) {
          errors.push({ line: entry.lineNumber, message: translateText("Duplicate label '{label}'.", { label }) });
        } else {
          labels.set(label, address >>> 0);
        }
        statement = statement.slice(labelMatch[0].length).trim();
      }

      if (!statement) return;

      if (/^\.(text|data|ktext|kdata)\b/i.test(statement)) {
        const directive = statement.split(/\s+/)[0].toLowerCase();
        const args = splitArguments(statement.slice(directive.length).trim());
        updateSegmentAddress(pass1State, directive, args[0]);
        return;
      }

      if (/^\./.test(statement)) {
        const directive = statement.split(/\s+/)[0].toLowerCase();
        if (!recognizedDirectives.has(directive)) {
          errors.push({
            line: entry.lineNumber,
            message: translateText('"{directive}" directive is invalid or not implemented in MARS', { directive })
          });
          return;
        }
        const canProcessInCurrentSegment = pass1State.segment === "data" || pass1State.segment === "kdata" || isGlobalDirective(directive);
        if (canProcessInCurrentSegment) {
          this.processDataDirective(statement, entry.lineNumber, pass1State, errors, warnings, [], true);
          if (isDataListDirective(directive)) pass1State.currentDataDirective = directive;
        } else {
          errors.push({
            line: entry.lineNumber,
            message: translateText('"{directive}" directive cannot appear in text segment', { directive })
          });
        }
        return;
      }

      if (pass1State.segment === "data" || pass1State.segment === "kdata") {
        const continuation = `${pass1State.currentDataDirective} ${statement}`;
        this.processDataDirective(continuation, entry.lineNumber, pass1State, errors, warnings, [], true);
        return;
      }

      if (pass1State.segment !== "text" && pass1State.segment !== "ktext") {
        errors.push({ line: entry.lineNumber, message: translateText("Instruction found in non-text segment.") });
        return;
      }
      const expanded = this.expandPseudo(statement, true);
      if (pass1State.segment === "text") {
        pass1State.textAddress = (pass1State.textAddress + expanded.length * 4) >>> 0;
      } else {
        pass1State.kernelTextAddress = (pass1State.kernelTextAddress + expanded.length * 4) >>> 0;
      }
    });


    this.program.labels = labels;

    const pass2State = {
      segment: "text",
      textAddress: this.memoryMap.textBase >>> 0,
      dataAddress: this.memoryMap.dataBase >>> 0,
      externAddress: (this.memoryMap.externBase ?? DEFAULT_MEMORY_MAP.externBase) >>> 0,
      kernelTextAddress: (this.memoryMap.kernelTextBase ?? this.memoryMap.kernelBase ?? DEFAULT_MEMORY_MAP.kernelTextBase) >>> 0,
      kernelDataAddress: (this.memoryMap.kernelDataBase ?? DEFAULT_MEMORY_MAP.kernelDataBase) >>> 0,
      autoAlignData: true,
      autoAlignKernelData: true,
      currentDataDirective: ".word",
      labelsMap: labels
    };
    const unresolvedFixups = [];

    lines.forEach((entry) => {
      let statement = entry.statement;
      if (!statement) return;

      const labelMatch = /^([A-Za-z_.$][\w.$]*):/.exec(statement);
      if (labelMatch) {
        statement = statement.slice(labelMatch[0].length).trim();
      }
      if (!statement) return;

      if (/^\.(text|data|ktext|kdata)\b/i.test(statement)) {
        const directive = statement.split(/\s+/)[0].toLowerCase();
        const args = splitArguments(statement.slice(directive.length).trim());
        updateSegmentAddress(pass2State, directive, args[0]);
        return;
      }

      if (/^\./.test(statement)) {
        const directive = statement.split(/\s+/)[0].toLowerCase();
        if (!recognizedDirectives.has(directive)) {
          errors.push({
            line: entry.lineNumber,
            message: translateText('"{directive}" directive is invalid or not implemented in MARS', { directive })
          });
          return;
        }
        const canProcessInCurrentSegment = pass2State.segment === "data" || pass2State.segment === "kdata" || isGlobalDirective(directive);
        if (canProcessInCurrentSegment) {
          this.processDataDirective(statement, entry.lineNumber, pass2State, errors, warnings, unresolvedFixups, false);
          if (isDataListDirective(directive)) pass2State.currentDataDirective = directive;
        } else {
          errors.push({
            line: entry.lineNumber,
            message: translateText('"{directive}" directive cannot appear in text segment', { directive })
          });
        }
        return;
      }

      if (pass2State.segment === "data" || pass2State.segment === "kdata") {
        const continuation = `${pass2State.currentDataDirective} ${statement}`;
        this.processDataDirective(continuation, entry.lineNumber, pass2State, errors, warnings, unresolvedFixups, false);
        return;
      }
      if (pass2State.segment !== "text" && pass2State.segment !== "ktext") return;

      const expanded = this.expandPseudo(statement, false);
      expanded.forEach((basic, index) => {
        const address = pass2State.segment === "text" ? pass2State.textAddress : pass2State.kernelTextAddress;
        textRows.push({
          index: textRows.length,
          address: address >>> 0,
          line: entry.lineNumber,
          source: index === 0 ? statement : "",
          basic,
          code: toHex(stableHash(basic))
        });

        if (pass2State.segment === "text") {
          pass2State.textAddress = (pass2State.textAddress + 4) >>> 0;
        } else {
          pass2State.kernelTextAddress = (pass2State.kernelTextAddress + 4) >>> 0;
        }
      });
    });

    const writeFixupValue = (address, size, value) => {
      const addr = address >>> 0;
      const numeric = Number(value) >>> 0;
      if (size === 1) {
        this.writeByte(addr, numeric & 0xff);
      } else if (size === 2) {
        this.writeByte(addr, (numeric >>> 8) & 0xff);
        this.writeByte((addr + 1) >>> 0, numeric & 0xff);
      } else {
        this.writeByte(addr, (numeric >>> 24) & 0xff);
        this.writeByte((addr + 1) >>> 0, (numeric >>> 16) & 0xff);
        this.writeByte((addr + 2) >>> 0, (numeric >>> 8) & 0xff);
        this.writeByte((addr + 3) >>> 0, numeric & 0xff);
      }
    };

    unresolvedFixups.forEach((fixup) => {
      const resolved = this.resolveValue(fixup.token);
      if (!Number.isFinite(resolved)) {
        errors.push({ line: fixup.line, message: translateText("Cannot resolve '{token}' in data directive.", {
          token: fixup.token
        }) });
        return;
      }
      writeFixupValue(fixup.address, fixup.size, resolved);
    });
    if (this.settings.warningsAreErrors && warnings.length > 0) {
      warnings.forEach((warning) => {
        errors.push({
          line: warning.line,
          message: translateText("Warning treated as error: {message}", { message: warning.message })
        });
      });
    }

    if (Number.isFinite(this.settings.maxErrors) && this.settings.maxErrors > 0 && errors.length > this.settings.maxErrors) {
      errors.length = this.settings.maxErrors;
    }
    this.program.labels = labels;
    this.program.textRows = textRows;
    this.program.textRowByAddress = new Map(textRows.map((row) => [row.address >>> 0, row]));
    this.program.warnings = warnings;
    this.program.errors = errors;
    this.lastMemoryWriteAddress = null;

    if (errors.length > 0) {
      return {
        ok: false,
        warnings,
        errors
      };
    }

    this.assembled = true;
    this.halted = false;

    if (this.settings.startAtMain && labels.has("main")) {
      this.pc = labels.get("main") >>> 0;
    } else {
      this.pc = this.memoryMap.textBase >>> 0;
    }

    const shouldApplyProgramArguments = options.programArgumentsEnabled ?? this.settings.programArguments;
    const argumentLine = String(options.programArguments ?? this.settings.programArgumentsLine ?? "");
    if (shouldApplyProgramArguments) {
      try {
        this.applyProgramArguments(argumentLine);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ line: 0, message: translateText("Program arguments error: {message}", { message }) });
        this.program.errors = errors;
        this.assembled = false;
        return { ok: false, warnings, errors };
      }
    }

    return {
      ok: true,
      warnings,
      errors: []
    };
  }
  toggleBreakpoint(address) {
    const key = address >>> 0;
    if (this.breakpoints.has(key)) {
      this.breakpoints.delete(key);
      return false;
    }
    this.breakpoints.add(key);
    return true;
  }

  stop() {
    if (!this.assembled) {
      return { ok: false, message: translateText("Program is not assembled.") };
    }
    this.halted = true;
    return {
      ok: true,
      done: true,
      haltReason: "user",
      message: translateText("Execution stopped."),
      snapshot: this.getSnapshot()
    };
  }

  getSyscallMatrix() {
    return getReferenceSyscallMatrix().map((entry) => ({ ...entry }));
  }

  auditSyscallMatrix() {
    const matrix = this.getSyscallMatrix();
    const missingInWeb = matrix.filter((entry) => entry.implementedInWeb !== true);
    const constructorMismatches = matrix.filter((entry) => (
      (Number.isFinite(entry.constructorNumber) && entry.constructorNumber !== entry.number)
      || (entry.constructorName && entry.constructorName !== entry.name)
    ));
    return {
      total: matrix.length,
      implemented: matrix.length - missingInWeb.length,
      missingInWeb,
      constructorMismatches
    };
  }

  step(options = {}) {
    const includeSnapshot = options.includeSnapshot !== false;
    const snapshotOptions = options && typeof options.snapshotOptions === "object"
      ? options.snapshotOptions
      : {};
    const attachSnapshot = (payload) => {
      if (includeSnapshot) payload.snapshot = this.getSnapshot(snapshotOptions);
      return payload;
    };

    if (!this.assembled) {
      return { ok: false, message: translateText("Program is not assembled.") };
    }

    if (this.halted) {
      return attachSnapshot({ ok: true, done: true, message: translateText("Program already halted.") });
    }

    if (this.breakpoints.has(this.pc)) {
      return attachSnapshot({
        ok: true,
        done: false,
        stoppedOnBreakpoint: true,
        message: translateText("Breakpoint hit at {address}.", { address: toHex(this.pc) })
      });
    }

    const row = this.program.textRowByAddress?.get(this.pc) ?? this.program.textRows.find((entry) => entry.address === this.pc);

    if (!row) {
      this.halted = true;
      return attachSnapshot({
        ok: true,
        done: true,
        message: translateText("Program completed."),
        haltReason: "cliff"
      });
    }

    const historyCapture = this.prepareExecutionHistoryCapture();
    const previousState = historyCapture.capture ? this.captureState() : null;
    this.activeHistoryJournal = previousState;
    this.lastMemoryWriteAddress = null;
    let result;
    try {
      result = this.executeInstruction(row.basic || row.source);
    } catch (error) {
      result = this.raiseException(EXCEPTION_CODES.RESERVED, error?.message ?? translateText("Runtime exception."));
    } finally {
      this.activeHistoryJournal = null;
    }

    if (result?.waitForInput) {
      return attachSnapshot({
        ok: true,
        done: false,
        waitingForInput: true,
        message: result.message ?? translateText("Waiting for input.")
      });
    }

    if (previousState) {
      previousState.estimatedBytes = this.estimateCapturedStateBytes(previousState);
      this.pushExecutionHistory(previousState);
    }

    this.steps += 1;

    const sequentialPc = (this.pc + 4) >>> 0;
    const pendingBranchTarget = this.delayedBranchTarget == null ? null : (this.delayedBranchTarget >>> 0);
    const opcodeToken = tokenizeStatement(row.basic || row.source)[0]?.toLowerCase() ?? "";
    const hasDelaySlot = ["beq", "bne", "bgtz", "blez", "bltz", "bgez", "bgezal", "bltzal", "bc1f", "bc1t", "j", "jal", "jr", "jalr"].includes(opcodeToken);

    let resolvedNextPc = sequentialPc;

    if (result.exception && this.settings.delayedBranching && pendingBranchTarget !== null) {
      this.cop0Registers[COP0_REGISTERS.cause] = clamp32((this.cop0Registers[COP0_REGISTERS.cause] >>> 0) | 0x80000000);
      this.cop0Registers[COP0_REGISTERS.epc] = clamp32((this.pc - 4) >>> 0);
    }

    if (result.exception || result.noDelay) {
      this.delayedBranchTarget = null;
      if (typeof result.nextPc === "number") {
        resolvedNextPc = result.nextPc >>> 0;
      }
    } else if (this.settings.delayedBranching) {
      resolvedNextPc = pendingBranchTarget ?? sequentialPc;
      this.delayedBranchTarget = null;
      if (typeof result.nextPc === "number") {
        if (hasDelaySlot) {
          if (pendingBranchTarget === null) {
            resolvedNextPc = sequentialPc;
          }
          this.delayedBranchTarget = result.nextPc >>> 0;
        } else {
          resolvedNextPc = result.nextPc >>> 0;
        }
      }
    } else {
      this.delayedBranchTarget = null;
      if (typeof result.nextPc === "number") {
        resolvedNextPc = result.nextPc >>> 0;
      }
    }

    this.pc = resolvedNextPc >>> 0;
    if (result.halt) {
      this.halted = true;
    }

    const hasNextInstruction = this.program.textRowByAddress?.has(this.pc) ?? this.program.textRows.some((entry) => entry.address === this.pc);
    if (!hasNextInstruction && !this.halted) {
      this.halted = true;
    }

    const sleepMs = Number.isFinite(result.sleepMs) ? Math.max(0, result.sleepMs | 0) : 0;

    return attachSnapshot({
      ok: true,
      done: this.halted,
      sleepMs,
      runIo: result.runIo === true,
      exception: result.exception === true,
      haltReason: result.haltReason,
      message: result.message ?? translateText("Executed line {line}.", { line: row.line }),
      messageCode: result.message ? undefined : "executed-line"
    });
  }
  go(maxSteps = 500) {
    if (!this.assembled) {
      return { ok: false, message: translateText("Program is not assembled.") };
    }

    let executed = 0;
    let lastResult = null;

    while (executed < maxSteps) {
      const stepResult = this.step();
      lastResult = stepResult;

      if (!stepResult.ok) {
        return stepResult;
      }

      if (stepResult.stoppedOnBreakpoint || stepResult.done || stepResult.waitingForInput) {
        break;
      }

      executed += 1;
    }

    return {
      ok: true,
      done: this.halted,
      stoppedOnBreakpoint: lastResult?.stoppedOnBreakpoint ?? false,
      message: lastResult?.message ?? translateText("Execution stopped."),
      stepsExecuted: executed + (lastResult?.done ? 1 : 0),
      snapshot: this.getSnapshot()
    };
  }

  backstep() {
    if (this.executionHistory.length === 0) {
      return { ok: false, message: translateText("No backstep history available.") };
    }

    const previousState = this.executionHistory.pop();
    const estimatedBytes = Number(previousState?.estimatedBytes);
    if (Number.isFinite(estimatedBytes) && estimatedBytes > 0) {
      this.executionHistoryBytes = Math.max(0, this.executionHistoryBytes - Math.floor(estimatedBytes));
    }
    this.restoreState(previousState);

    return {
      ok: true,
      message: translateText("Returned to {address}.", { address: toHex(this.pc) }),
      snapshot: this.getSnapshot()
    };
  }
  getSnapshot(options = {}) {
    const shareMemoryWords = options.shareMemoryWords === true;
    const includeTextRows = options.includeTextRows !== false;
    const includeLabels = options.includeLabels !== false;
    const includeDataRows = options.includeDataRows !== false;
    const includeRegisters = options.includeRegisters !== false;
    const includeMemoryWords = options.includeMemoryWords !== false;

    const rows = includeTextRows
      ? this.program.textRows.map((row) => ({
          ...row,
          addressHex: row.addressHex || toHex(row.address),
          isCurrent: row.address === this.pc,
          breakpoint: this.breakpoints.has(row.address)
        }))
      : [];

    const labels = includeLabels
      ? [...this.program.labels.entries()]
          .map(([label, address]) => ({
            label,
            address,
            addressHex: toHex(address)
          }))
          .sort((a, b) => a.address - b.address)
      : [];

    const dataRows = [];
    if (includeDataRows) {
      const dataBase = this.memoryMap.dataBase >>> 0;
      for (let i = 0; i < 32; i += 1) {
        const address = (dataBase + i * 4) >>> 0;
        const value = this.memoryWords.get(address) ?? 0;
        dataRows.push({
          address,
          addressHex: toHex(address),
          value,
          valueUnsigned: value >>> 0,
          valueHex: toHex(value)
        });
      }
    }

    const registerRows = [];
    if (includeRegisters) {
      registerRows.push({
        index: "pc",
        name: "$pc",
        value: this.pc | 0,
        valueUnsigned: this.pc >>> 0,
        valueHex: toHex(this.pc)
      });

      for (let i = 0; i < USER_REGISTER_NAMES.length; i += 1) {
        const value = this.registers[i] | 0;
        registerRows.push({
          index: i,
          name: USER_REGISTER_NAMES[i],
          value,
          valueUnsigned: value >>> 0,
          valueHex: toHex(value)
        });
      }

      for (let i = 0; i < EXTRA_REGISTER_NAMES.length; i += 1) {
        const index = USER_REGISTER_NAMES.length + i;
        const value = this.registers[index] | 0;
        registerRows.push({
          index,
          name: EXTRA_REGISTER_NAMES[i],
          value,
          valueUnsigned: value >>> 0,
          valueHex: toHex(value)
        });
      }
    }

    return {
      assembled: this.assembled,
      halted: this.halted,
      steps: this.steps,
      backstepDepth: this.executionHistory.length,
      backstepHistoryBytes: this.getBackstepHistoryUsageBytes(),
      backstepHistoryBudgetBytes: this.getBackstepHistoryBudgetBytes(),
      memoryUsageBytes: this.getMemoryUsageBytes(),
      maxMemoryBytes: this.getMaxMemoryBytes(),
      pc: this.pc,
      pcHex: toHex(this.pc),
      textRows: rows,
      dataRows,
      labels,
      registers: registerRows,
      memoryWords: includeMemoryWords
        ? (shareMemoryWords ? this.memoryWords : new Map(this.memoryWords))
        : new Map(),
      lastMemoryWriteAddress: this.lastMemoryWriteAddress == null ? null : (this.lastMemoryWriteAddress >>> 0),
      cop0: Array.from(this.cop0Registers),
      cop1: Array.from(this.cop1Registers),
      fpuFlags: Array.from(this.fpuConditionFlags),
      warnings: this.program.warnings,
      errors: this.program.errors
    };
  }  branchTarget(token, nextPc) {
    const label = this.resolveLabelAddress(token);
    if (label !== null) return label;

    const immediate = parseImmediate(token);
    if (Number.isFinite(immediate)) return (nextPc + (immediate << 2)) >>> 0;

    const expression = this.resolveValue(token);
    if (Number.isFinite(expression)) return expression >>> 0;
    return null;
  }
  executeSyscall() {
    const service = this.registers[2] | 0;

    const runtimeHooks = this.runtimeHooks && typeof this.runtimeHooks === "object" ? this.runtimeHooks : {};

    const normalizeHookResult = (result, fallbackValue = null) => {
      if (result && typeof result === "object") {
        if (result.wait || result.pending) {
          const pendingMessage = typeof result.message === "string" && result.message.trim().length
            ? result.message
            : "Waiting for input...";
          return { waitForInput: true, message: pendingMessage };
        }
        if (result.cancelled === true) {
          return { cancelled: true };
        }
        if (Object.prototype.hasOwnProperty.call(result, "value")) {
          return { value: result.value };
        }
      }
      if (result === undefined) return { value: fallbackValue };
      return { value: result };
    };

    const promptInput = (label, fallback = "", meta = {}) => {
      if (typeof runtimeHooks.readInput === "function") {
        const popup = meta.forcePopup === true ? true : (this.settings.popupSyscallInput === true);
        const hooked = normalizeHookResult(runtimeHooks.readInput({
          label,
          fallback,
          popup,
          service,
          ...meta
        }), fallback);
        if (hooked.waitForInput) return hooked;
        if (hooked.cancelled) return { cancelled: true };
        return { value: hooked.value == null ? null : String(hooked.value) };
      }

      return { value: fallback };
    };

    const confirmInput = (message, meta = {}) => {
      if (typeof runtimeHooks.confirmInput === "function") {
        const popup = meta.forcePopup === true ? true : (this.settings.popupSyscallInput === true);
        const hooked = normalizeHookResult(runtimeHooks.confirmInput({
          message,
          popup,
          service,
          ...meta
        }), meta.forcePopup ? 2 : true);
        if (hooked.waitForInput) return hooked;
        return { value: hooked.value };
      }

      return { value: meta.forcePopup ? 2 : true };
    };

    const showMessageDialog = (message, meta = {}) => {
      if (typeof runtimeHooks.messageDialog === "function") {
        const popup = meta.forcePopup !== false;
        const hooked = normalizeHookResult(runtimeHooks.messageDialog({
          message,
          popup,
          service,
          ...meta
        }), true);
        if (hooked.waitForInput) return hooked;
        return { value: hooked.value };
      }
      return { value: true };
    };

    const readMessage = (register = 4) => this.readNullTerminatedString(this.registers[register] >>> 0);
    const readBufferBytes = (address, length) => {
      const safeLength = Math.max(0, length | 0);
      const output = new Uint8Array(safeLength);
      for (let i = 0; i < safeLength; i += 1) output[i] = this.getByte((address + i) >>> 0) & 0xff;
      return output;
    };

    const parseStrictInteger = (text) => {
      const raw = String(text ?? "").trim();
      if (!/^[+-]?\d+$/.test(raw)) return null;
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) return null;
      if (parsed < -2147483648 || parsed > 2147483647) return null;
      return parsed | 0;
    };

    const normalizeMidiByte = (value, fallback) => {
      const parsed = value | 0;
      if (parsed < 0 || parsed > 127) return fallback;
      return parsed;
    };
    const streamKey = this.registers[4] | 0;
    const getStream = () => {
      if (!this.randomStreams.has(streamKey)) {
        this.markRandomStreamsDirty();
        this.randomStreams.set(streamKey, 0x9e3779b9 ^ (streamKey >>> 0));
      }
      return this.randomStreams.get(streamKey) >>> 0;
    };
    const setStream = (value) => {
      this.markRandomStreamsDirty();
      this.randomStreams.set(streamKey, value >>> 0);
    };
    const nextRandomUnit = () => {
      let state = getStream();
      state = (state + 0x6d2b79f5) >>> 0;
      setStream(state);
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const tx = (template, variables = {}) => translateText(template, variables);

    switch (service) {
      case 1:
        return { message: String(this.registers[4] | 0), runIo: true };
      case 2:
        return { message: String(this.getFloat32(12)), runIo: true };
      case 3:
        return { message: String(this.getFloat64(12)), runIo: true };
      case 4:
        return { message: readMessage(4), runIo: true };
      case 5: {
        const inputResult = promptInput("ReadInt syscall", "0", { kind: "read-int" });
        if (inputResult.waitForInput) return inputResult;
        if (inputResult.cancelled) return { halt: true, message: "", haltReason: "user" };
        const parsed = parseStrictInteger(inputResult.value);
        if (parsed === null) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid integer input (syscall 5)"));
        }
        this.registers[2] = clamp32(parsed);
        return {};
      }
      case 6: {
        const inputResult = promptInput("ReadFloat syscall", "0", { kind: "read-float" });
        if (inputResult.waitForInput) return inputResult;
        if (inputResult.cancelled) return { halt: true, message: "", haltReason: "user" };
        const parsed = Number.parseFloat(String(inputResult.value ?? "").trim());
        if (!Number.isFinite(parsed)) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid float input (syscall 6)"));
        }
        this.setFloat32(0, parsed);
        return {};
      }
      case 7: {
        const inputResult = promptInput("ReadDouble syscall", "0", { kind: "read-double" });
        if (inputResult.waitForInput) return inputResult;
        if (inputResult.cancelled) return { halt: true, message: "", haltReason: "user" };
        const parsed = Number.parseFloat(String(inputResult.value ?? "").trim());
        if (!Number.isFinite(parsed)) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid double input (syscall 7)"));
        }
        this.setFloat64(0, parsed);
        return {};
      }
      case 8: {
        const address = this.registers[4] >>> 0;
        let maxLength = (this.registers[5] | 0) - 1;
        let addNullByte = true;
        if (maxLength < 0) {
          maxLength = 0;
          addNullByte = false;
        }
        const inputResult = promptInput("ReadString syscall", "", { kind: "read-string", maxLength });
        if (inputResult.waitForInput) return inputResult;
        if (inputResult.cancelled) return { halt: true, message: "", haltReason: "user" };
        const input = inputResult.value ?? "";
        const size = Math.min(maxLength, input.length);
        for (let i = 0; i < size; i += 1) this.writeByte((address + i) >>> 0, input.charCodeAt(i));
        let cursor = (address + size) >>> 0;
        if (size < maxLength) {
          this.writeByte(cursor, "\n".charCodeAt(0));
          cursor = (cursor + 1) >>> 0;
        }
        if (addNullByte) this.writeByte(cursor, 0);
        return {};
      }
      case 9: {
        const bytes = this.registers[4] | 0;
        if (bytes < 0) return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("sbrk with negative byte count"));
        const oldHeap = this.heapPointer >>> 0;
        this.heapPointer = (this.heapPointer + bytes) >>> 0;
        this.registers[2] = clamp32(oldHeap);
        return {};
      }
      case 10:
        return { halt: true, message: "", haltReason: "exit" };
      case 11:
        return { message: String.fromCharCode(this.registers[4] & 0xff), runIo: true };
      case 12: {
        const inputResult = promptInput("ReadChar syscall", "", { kind: "read-char" });
        if (inputResult.waitForInput) return inputResult;
        if (inputResult.cancelled) return { halt: true, message: "", haltReason: "user" };
        const value = String(inputResult.value ?? "");
        if (!value.length) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid char input (syscall 12)"));
        }
        this.registers[2] = value.charCodeAt(0) & 0xff;
        return {};
      }
      case 13: {
        const filename = readMessage(4);
        const flag = this.registers[5] | 0;
        if (![FILE_OPEN_RDONLY, FILE_OPEN_WRONLY, FILE_OPEN_APPEND].includes(flag)) {
          this.registers[2] = -1;
          return {};
        }
        if (this.filenameAlreadyOpen(filename)) {
          this.registers[2] = -1;
          return {};
        }

        const fd = this.allocateFileDescriptor();
        if (fd < 0) {
          this.registers[2] = -1;
          return {};
        }

        let existing = this.getVirtualFileBytes(filename);
        if (flag === FILE_OPEN_RDONLY) {
          if (existing === null) {
            this.registers[2] = -1;
            return {};
          }
        } else if (flag === FILE_OPEN_WRONLY) {
          existing = new Uint8Array(0);
          this.setVirtualFileBytes(filename, existing);
        } else if (flag === FILE_OPEN_APPEND) {
          if (existing === null) existing = new Uint8Array(0);
          this.setVirtualFileBytes(filename, existing);
        }

        const file = {
          fd,
          name: filename,
          flag,
          cursor: flag === FILE_OPEN_APPEND ? existing.length : 0,
          stdio: false,
          data: cloneByteArray(existing)
        };
        this.markOpenFilesDirty();
        this.openFiles.set(fd, file);
        this.registers[2] = fd;
        return {};
      }
      case 14: {
        const fd = this.registers[4] | 0;
        const address = this.registers[5] >>> 0;
        const length = Math.max(0, this.registers[6] | 0);
        let payload = new Uint8Array(0);

        if (fd === STDIN_FD) {
          const inputResult = promptInput("Read syscall (fd 0)", "", { kind: "read-fd0", length });
          if (inputResult.waitForInput) return inputResult;
          payload = textToBytes(String(inputResult.value ?? "")).slice(0, length);
        } else {
          const file = this.openFiles.get(fd);
          if (!file || file.flag !== FILE_OPEN_RDONLY) {
            this.registers[2] = -1;
            return {};
          }
          const available = Math.max(0, file.data.length - file.cursor);
          const count = Math.min(length, available);
          payload = file.data.slice(file.cursor, file.cursor + count);
          this.markOpenFilesDirty();
          file.cursor += count;
        }

        for (let i = 0; i < payload.length; i += 1) this.writeByte((address + i) >>> 0, payload[i]);
        this.registers[2] = payload.length;
        return {};
      }
      case 15: {
        const fd = this.registers[4] | 0;
        const address = this.registers[5] >>> 0;
        const length = Math.max(0, this.registers[6] | 0);
        const output = readBufferBytes(address, length);

        if (fd === STDOUT_FD || fd === STDERR_FD) {
          this.registers[2] = output.length;
          return { message: bytesToText(output), runIo: true };
        }

        const file = this.openFiles.get(fd);
        if (!file || (file.flag !== FILE_OPEN_WRONLY && file.flag !== FILE_OPEN_APPEND)) {
          this.registers[2] = -1;
          return {};
        }

        this.markOpenFilesDirty();
        if (file.flag === FILE_OPEN_APPEND && file.cursor < file.data.length) {
          file.cursor = file.data.length;
        }

        const start = file.cursor;
        const requiredLength = start + output.length;
        const merged = new Uint8Array(Math.max(requiredLength, file.data.length));
        merged.set(file.data, 0);
        merged.set(output, start);

        file.data = merged;
        file.cursor = requiredLength;
        this.setVirtualFileBytes(file.name, file.data);

        this.registers[2] = output.length;
        return {};
      }
      case 16: {
        const fd = this.registers[4] | 0;
        if (fd <= STDERR_FD || fd >= SYSCALL_MAX_FILES) {
          return {};
        }
        this.markOpenFilesDirty();
        this.openFiles.delete(fd);
        return {};
      }
      case 17:
        return { halt: true, message: "", haltReason: "exit" };
      case 30: {
        const now = Date.now();
        this.registers[4] = clamp32(now & 0xffffffff);
        this.registers[5] = clamp32(Math.floor(now / 0x100000000));
        return {};
      }
      case 31:
      case 33: {
        const payload = {
          service,
          pitch: normalizeMidiByte(this.registers[4], MIDI_DEFAULTS.pitch),
          duration: (this.registers[5] | 0) < 0 ? MIDI_DEFAULTS.duration : (this.registers[5] | 0),
          instrument: normalizeMidiByte(this.registers[6], MIDI_DEFAULTS.instrument),
          volume: normalizeMidiByte(this.registers[7], MIDI_DEFAULTS.volume)
        };
        if (typeof runtimeHooks.midi === "function") {
          try {
            runtimeHooks.midi(payload);
          } catch {
            // Ignore runtime hook failures and keep simulation running.
          }
        }
        const blockingSleep = service === 33 ? Math.max(0, payload.duration | 0) : 0;
        return { sleepMs: blockingSleep };
      }
      case 32: {
        const requestedSleep = Math.max(0, this.registers[4] | 0);
        let effectiveSleep = requestedSleep;
        if (typeof runtimeHooks.sleep === "function") {
          try {
            const sleepResult = runtimeHooks.sleep({ service, milliseconds: requestedSleep });
            if (sleepResult && Number.isFinite(sleepResult.milliseconds)) {
              effectiveSleep = Math.max(0, sleepResult.milliseconds | 0);
            } else if (sleepResult && Number.isFinite(sleepResult.sleepMs)) {
              effectiveSleep = Math.max(0, sleepResult.sleepMs | 0);
            }
          } catch {
            // Ignore runtime hook failures and keep simulation running.
          }
        }
        return { sleepMs: effectiveSleep };
      }
      case 34:
        return { message: toHex(this.registers[4] >>> 0), runIo: true };
      case 35:
        return { message: (this.registers[4] >>> 0).toString(2).padStart(32, "0"), runIo: true };
      case 36:
        return { message: String(this.registers[4] >>> 0), runIo: true };
      case 40:
        setStream(this.registers[5] >>> 0);
        return {};
      case 41:
        this.registers[4] = clamp32((nextRandomUnit() * 0x100000000) >>> 0);
        return {};
      case 42: {
        const bound = this.registers[5] | 0;
        this.registers[4] = clamp32(bound > 0 ? Math.floor(nextRandomUnit() * bound) : 0);
        return {};
      }
      case 43:
        this.setFloat32(0, nextRandomUnit());
        return {};
      case 44:
        this.setFloat64(0, nextRandomUnit());
        return {};
      case 50: {
        const confirmResult = confirmInput(readMessage(4), { kind: "confirm-dialog", forcePopup: true });
        if (confirmResult.waitForInput) return confirmResult;
        let choice = 2;
        if (typeof confirmResult.value === "number" && Number.isFinite(confirmResult.value)) {
          const parsed = confirmResult.value | 0;
          choice = (parsed === 0 || parsed === 1 || parsed === 2) ? parsed : 2;
        } else if (confirmResult.value === true) {
          choice = 0;
        } else if (confirmResult.value === false) {
          choice = 1;
        }
        this.registers[4] = clamp32(choice);
        return {};
      }
      case 51: {
        const inputResult = promptInput(readMessage(4), "", { kind: "input-int", forcePopup: true });
        if (inputResult.waitForInput) return inputResult;
        const input = inputResult.value;
        if (input == null) {
          this.registers[4] = 0;
          this.registers[5] = -2;
        } else if (input.length === 0) {
          this.registers[4] = 0;
          this.registers[5] = -3;
        } else {
          const parsed = parseStrictInteger(input);
          if (parsed === null) {
            this.registers[4] = 0;
            this.registers[5] = -1;
          } else {
            this.registers[4] = clamp32(parsed);
            this.registers[5] = 0;
          }
        }
        return {};
      }
      case 52: {
        const inputResult = promptInput(readMessage(4), "", { kind: "input-float", forcePopup: true });
        if (inputResult.waitForInput) return inputResult;
        const input = inputResult.value;
        this.setFloat32(0, 0);
        if (input == null) this.registers[5] = -2;
        else if (input.length === 0) this.registers[5] = -3;
        else {
          const parsed = Number.parseFloat(String(input).trim());
          if (!Number.isFinite(parsed)) this.registers[5] = -1;
          else {
            this.setFloat32(0, parsed);
            this.registers[5] = 0;
          }
        }
        return {};
      }
      case 53: {
        const inputResult = promptInput(readMessage(4), "", { kind: "input-double", forcePopup: true });
        if (inputResult.waitForInput) return inputResult;
        const input = inputResult.value;
        this.setFloat64(0, 0);
        if (input == null) this.registers[5] = -2;
        else if (input.length === 0) this.registers[5] = -3;
        else {
          const parsed = Number.parseFloat(String(input).trim());
          if (!Number.isFinite(parsed)) this.registers[5] = -1;
          else {
            this.setFloat64(0, parsed);
            this.registers[5] = 0;
          }
        }
        return {};
      }
      case 54: {
        const bufferAddress = this.registers[5] >>> 0;
        const maxLength = this.registers[6] | 0;
        const inputResult = promptInput(readMessage(4), "", { kind: "input-string", maxLength, forcePopup: true });
        if (inputResult.waitForInput) return inputResult;
        const input = inputResult.value;
        if (input == null) {
          this.registers[5] = -2;
          return {};
        }
        if (input.length === 0) {
          this.registers[5] = -3;
          return {};
        }
        const maxChars = Math.max(0, maxLength - 1);
        const payload = input.slice(0, maxChars);
        for (let i = 0; i < payload.length; i += 1) this.writeByte((bufferAddress + i) >>> 0, payload.charCodeAt(i) & 0xff);
        if (payload.length < maxChars) this.writeByte((bufferAddress + payload.length) >>> 0, "\n".charCodeAt(0));
        this.writeByte((bufferAddress + Math.min(payload.length + 1, Math.max(0, maxLength - 1))) >>> 0, 0);
        this.registers[5] = input.length > maxChars ? -4 : 0;
        return {};
      }
      case 55:
      case 56:
      case 57:
      case 58:
      case 59: {
        let message = readMessage(4);
        if (service === 56) message += String(this.registers[5] | 0);
        else if (service === 57) message += String(this.getFloat32(12));
        else if (service === 58) message += String(this.getFloat64(12));
        else if (service === 59) message += readMessage(5);

        const messageType = service === 55
          ? (() => {
            const rawType = this.registers[5] | 0;
            return (rawType >= 1 && rawType <= 4) ? rawType : 0;
          })()
          : 2;

        const dialogResult = showMessageDialog(message, {
          kind: "message-dialog",
          forcePopup: true,
          messageType
        });
        if (dialogResult.waitForInput) return dialogResult;
        return {};
      }
      default:
        return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid or unimplemented syscall service: {service}", { service }));
    }
  }
  executeInstruction(source) {
    const tokens = tokenizeStatement(source);
    if (!tokens.length) return {};

    const opcode = tokens[0].toLowerCase();
    const nextPc = (this.pc + 4) >>> 0;

    const reg = (index) => this.resolveRegister(tokens[index]);
    const freg = (index) => this.resolveFloatRegister(tokens[index]);
    const imm = (index) => this.resolveValue(tokens[index]);
    const asSigned16 = (num) => signExtend16(num);
    const overflow32 = (value) => value > 2147483647 || value < -2147483648;
    const saturatingInt = (value) => saturatingInt32(value);
    const roundNearestEven = (value) => roundNearestEven32(value);

    if (opcode === "syscall") return this.executeSyscall();
    if (opcode === "nop") {
      this.forceZeroRegister();
      return {};
    }

    if (opcode === "eret") {
      this.cop0Registers[COP0_REGISTERS.status] &= ~(1 << 1);
      this.forceZeroRegister();
      return { nextPc: this.cop0Registers[COP0_REGISTERS.epc] >>> 0, noDelay: true };
    }

    if (opcode === "break") {
      const code = tokens.length >= 2 ? (imm(1) | 0) : 0;
      return this.raiseException(EXCEPTION_CODES.BREAKPOINT, translateText("break instruction executed; code = {code}", { code }));
    }

    if (["teq", "tne", "tge", "tgeu", "tlt", "tltu"].includes(opcode) && tokens.length >= 3) {
      const rs = reg(1);
      const rt = reg(2);
      if (rs !== null && rt !== null) {
        const a = this.registers[rs] | 0;
        const b = this.registers[rt] | 0;
        let trap = false;
        if (opcode === "teq") trap = a === b;
        else if (opcode === "tne") trap = a !== b;
        else if (opcode === "tge") trap = a >= b;
        else if (opcode === "tgeu") trap = (a >>> 0) >= (b >>> 0);
        else if (opcode === "tlt") trap = a < b;
        else trap = (a >>> 0) < (b >>> 0);
        if (trap) return this.raiseException(EXCEPTION_CODES.TRAP, translateText("trap"));
      }
      this.forceZeroRegister();
      return {};
    }

    if (["teqi", "tnei", "tgei", "tgeiu", "tlti", "tltiu"].includes(opcode) && tokens.length >= 3) {
      const rs = reg(1);
      const iv = imm(2);
      if (rs !== null && Number.isFinite(iv)) {
        const a = this.registers[rs] | 0;
        const b = asSigned16(iv | 0);
        let trap = false;
        if (opcode === "teqi") trap = a === b;
        else if (opcode === "tnei") trap = a !== b;
        else if (opcode === "tgei") trap = a >= b;
        else if (opcode === "tgeiu") trap = (a >>> 0) >= (b >>> 0);
        else if (opcode === "tlti") trap = a < b;
        else trap = (a >>> 0) < (b >>> 0);
        if (trap) return this.raiseException(EXCEPTION_CODES.TRAP, translateText("trap"));
      }
      this.forceZeroRegister();
      return {};
    }

    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu", "mul", "movn", "movz"].includes(opcode) && tokens.length >= 4) {
      const rd = reg(1);
      const rs = reg(2);
      const rt = reg(3);
      if (rd !== null && rs !== null && rt !== null) {
        const a = this.registers[rs] | 0;
        const b = this.registers[rt] | 0;
        if (opcode === "add") {
          if (addOverflow32(a, b)) return this.raiseException(EXCEPTION_CODES.OVERFLOW, translateText("arithmetic overflow"));
          this.registers[rd] = add32(a, b);
        } else if (opcode === "addu") this.registers[rd] = add32(a, b);
        else if (opcode === "sub") {
          if (subOverflow32(a, b)) return this.raiseException(EXCEPTION_CODES.OVERFLOW, translateText("arithmetic overflow"));
          this.registers[rd] = sub32(a, b);
        } else if (opcode === "subu") this.registers[rd] = sub32(a, b);
        else if (opcode === "and") this.registers[rd] = a & b;
        else if (opcode === "or") this.registers[rd] = a | b;
        else if (opcode === "xor") this.registers[rd] = a ^ b;
        else if (opcode === "nor") this.registers[rd] = ~(a | b);
        else if (opcode === "slt") this.registers[rd] = a < b ? 1 : 0;
        else if (opcode === "sltu") this.registers[rd] = (a >>> 0) < (b >>> 0) ? 1 : 0;
        else if (opcode === "mul") {
          this.registers[32] = mulSignedHi32(a, b);
          this.registers[33] = mulSignedLo32(a, b);
          this.registers[rd] = this.registers[33];
        } else if (opcode === "movn") {
          if (b !== 0) this.registers[rd] = a;
        } else if (opcode === "movz") {
          if (b === 0) this.registers[rd] = a;
        }
      }
      this.forceZeroRegister();
      return {};
    }

    if (["clz", "clo"].includes(opcode) && tokens.length >= 3) {
      const rd = reg(1);
      const rs = reg(2);
      if (rd !== null && rs !== null) {
        const value = this.registers[rs] | 0;
        this.registers[rd] = opcode === "clz" ? clz32(value) : clo32(value);
      }
      this.forceZeroRegister();
      return {};
    }

    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(opcode) && tokens.length >= 4) {
      const rt = reg(1);
      const rs = reg(2);
      const value = imm(3);
      if (rt !== null && rs !== null && Number.isFinite(value)) {
        const a = this.registers[rs] | 0;
        const s16 = asSigned16(value | 0);
        if (opcode === "addi") {
          if (addOverflow32(a, s16)) return this.raiseException(EXCEPTION_CODES.OVERFLOW, translateText("arithmetic overflow"));
          this.registers[rt] = add32(a, s16);
        } else if (opcode === "addiu") this.registers[rt] = add32(a, s16);
        else if (opcode === "andi") this.registers[rt] = a & zeroExtend16(value);
        else if (opcode === "ori") this.registers[rt] = a | zeroExtend16(value);
        else if (opcode === "xori") this.registers[rt] = a ^ zeroExtend16(value);
        else if (opcode === "slti") this.registers[rt] = a < s16 ? 1 : 0;
        else this.registers[rt] = (a >>> 0) < (s16 >>> 0) ? 1 : 0;
      }
      this.forceZeroRegister();
      return {};
    }

    if (opcode === "lui" && tokens.length >= 3) {
      const rt = reg(1);
      const value = imm(2);
      if (rt !== null && Number.isFinite(value)) this.registers[rt] = clamp32(zeroExtend16(value) << 16);
      this.forceZeroRegister();
      return {};
    }

    if (["sll", "srl", "sra"].includes(opcode) && tokens.length >= 4) {
      const rd = reg(1);
      const rt = reg(2);
      const shamt = imm(3);
      if (rd !== null && rt !== null && Number.isFinite(shamt)) {
        const amount = shamt & 0x1f;
        if (opcode === "sll") this.registers[rd] = clamp32((this.registers[rt] << amount) >>> 0);
        else if (opcode === "srl") this.registers[rd] = clamp32(this.registers[rt] >>> amount);
        else this.registers[rd] = this.registers[rt] >> amount;
      }
      this.forceZeroRegister();
      return {};
    }

    if (["sllv", "srlv", "srav"].includes(opcode) && tokens.length >= 4) {
      const rd = reg(1);
      const rt = reg(2);
      const rs = reg(3);
      if (rd !== null && rt !== null && rs !== null) {
        const amount = this.registers[rs] & 0x1f;
        if (opcode === "sllv") this.registers[rd] = clamp32((this.registers[rt] << amount) >>> 0);
        else if (opcode === "srlv") this.registers[rd] = clamp32(this.registers[rt] >>> amount);
        else this.registers[rd] = this.registers[rt] >> amount;
      }
      this.forceZeroRegister();
      return {};
    }

    if (["mult", "multu", "div", "divu", "madd", "maddu", "msub", "msubu"].includes(opcode) && tokens.length >= 3) {
      const rs = reg(1);
      const rt = reg(2);
      if (rs !== null && rt !== null) {
        const a = this.registers[rs] | 0;
        const b = this.registers[rt] | 0;
        if (opcode === "mult" || opcode === "multu") {
          if (opcode === "mult") {
            this.registers[32] = mulSignedHi32(a, b);
            this.registers[33] = mulSignedLo32(a, b);
          } else {
            this.registers[32] = mulUnsignedHi32(a, b);
            this.registers[33] = mulUnsignedLo32(a, b);
          }
        } else if (opcode === "div" || opcode === "divu") {
          if (b !== 0) {
            if (opcode === "div") {
              this.registers[33] = divSignedQuot32(a, b);
              this.registers[32] = divSignedRem32(a, b);
            } else {
              this.registers[33] = divUnsignedQuot32(a, b);
              this.registers[32] = divUnsignedRem32(a, b);
            }
          }
        } else {
          const signed = opcode === "madd" || opcode === "msub";
          const add = opcode === "madd" || opcode === "maddu";
          const current = signed ? BigInt.asIntN(64, this.getHiLoBigInt()) : BigInt.asUintN(64, this.getHiLoBigInt());
          const product = signed ? BigInt.asIntN(64, BigInt(a) * BigInt(b)) : BigInt.asUintN(64, BigInt(a >>> 0) * BigInt(b >>> 0));
          this.setHiLoBigInt(add ? (current + product) : (current - product));
        }
      }
      this.forceZeroRegister();
      return {};
    }

    if (["mfhi", "mflo", "mthi", "mtlo"].includes(opcode) && tokens.length >= 2) {
      const rd = reg(1);
      if (rd !== null) {
        if (opcode === "mfhi") this.registers[rd] = this.registers[32];
        else if (opcode === "mflo") this.registers[rd] = this.registers[33];
        else if (opcode === "mthi") this.registers[32] = this.registers[rd];
        else this.registers[33] = this.registers[rd];
      }
      this.forceZeroRegister();
      return {};
    }

    if (["mfc0", "mtc0"].includes(opcode) && tokens.length >= 3) {
      const rt = reg(1);
      const rd = this.resolveCop0Register(tokens[2]);
      if (rt !== null && rd !== null) {
        if (opcode === "mfc0") this.registers[rt] = this.cop0Registers[rd] | 0;
        else this.cop0Registers[rd] = this.registers[rt] | 0;
      }
      this.forceZeroRegister();
      return {};
    }

    if (["mfc1", "mtc1"].includes(opcode) && tokens.length >= 3) {
      const rt = reg(1);
      const fs = freg(2);
      if (rt !== null && fs !== null) {
        if (opcode === "mfc1") this.registers[rt] = this.cop1Registers[fs] | 0;
        else this.cop1Registers[fs] = this.registers[rt] | 0;
      }
      this.forceZeroRegister();
      return {};
    }

    if (["lw", "sw", "lb", "lbu", "sb", "lh", "lhu", "sh", "ll", "sc", "lwl", "lwr", "swl", "swr", "lwc1", "swc1", "ldc1", "sdc1"].includes(opcode) && tokens.length >= 3) {
      const address = this.resolveMemoryAddress(tokens[2]);
      if (!Number.isFinite(address)) {
        this.forceZeroRegister();
        return {};
      }
      const addr = address >>> 0;
      const gpr = reg(1);
      const fpr = freg(1);

      const fpuMemoryOp = ["lwc1", "swc1", "ldc1", "sdc1"].includes(opcode);
      if (fpuMemoryOp && fpr === null) {
        this.forceZeroRegister();
        return {};
      }
      if (!fpuMemoryOp && gpr === null) {
        this.forceZeroRegister();
        return {};
      }
      try {
        if (opcode === "lw" || opcode === "ll") this.registers[gpr] = this.readWord(addr);
        else if (opcode === "sw") this.writeWord(addr, this.registers[gpr]);
        else if (opcode === "lb") this.registers[gpr] = this.readByte(addr, true);
        else if (opcode === "lbu") this.registers[gpr] = this.readByte(addr, false);
        else if (opcode === "sb") this.writeByte(addr, this.registers[gpr]);
        else if (opcode === "lh") this.registers[gpr] = this.readHalf(addr, true);
        else if (opcode === "lhu") this.registers[gpr] = this.readHalf(addr, false);
        else if (opcode === "sh") this.writeHalf(addr, this.registers[gpr]);
        else if (opcode === "sc") { this.writeWord(addr, this.registers[gpr]); this.registers[gpr] = 1; }
        else if (opcode === "lwl") {
          let result = this.registers[gpr] | 0;
          for (let i = 0; i <= addr % 4; i += 1) result = setWordByte(result, 3 - i, this.getByte((addr - i) >>> 0));
          this.registers[gpr] = result;
        } else if (opcode === "lwr") {
          let result = this.registers[gpr] | 0;
          for (let i = 0; i <= 3 - (addr % 4); i += 1) result = setWordByte(result, i, this.getByte((addr + i) >>> 0));
          this.registers[gpr] = result;
        } else if (opcode === "swl") {
          const source = this.registers[gpr] | 0;
          for (let i = 0; i <= addr % 4; i += 1) this.writeByte((addr - i) >>> 0, getWordByte(source, 3 - i));
        } else if (opcode === "swr") {
          const source = this.registers[gpr] | 0;
          for (let i = 0; i <= 3 - (addr % 4); i += 1) this.writeByte((addr + i) >>> 0, getWordByte(source, i));
        } else if (opcode === "lwc1") this.cop1Registers[fpr] = this.readWord(addr);
        else if (opcode === "swc1") this.writeWord(addr, this.cop1Registers[fpr]);
        else if (opcode === "ldc1") {
          if ((fpr & 1) !== 0) return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("first register must be even-numbered"));
          if ((addr & 0x7) !== 0) return this.raiseException(EXCEPTION_CODES.ADDRESS_LOAD, translateText("address not aligned on doubleword boundary: {address}", { address: toHex(addr) }), addr);
          this.cop1Registers[fpr] = this.readWord(addr + 4);
          this.cop1Registers[fpr + 1] = this.readWord(addr);
        } else if (opcode === "sdc1") {
          if ((fpr & 1) !== 0) return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("first register must be even-numbered"));
          if ((addr & 0x7) !== 0) return this.raiseException(EXCEPTION_CODES.ADDRESS_STORE, translateText("address not aligned on doubleword boundary: {address}", { address: toHex(addr) }), addr);
          this.writeWord(addr, this.cop1Registers[fpr + 1]);
          this.writeWord(addr + 4, this.cop1Registers[fpr]);
        }
      } catch (error) {
        const writeOp = ["sw", "sb", "sh", "sc", "swl", "swr", "swc1", "sdc1"].includes(opcode);
        return this.raiseException(writeOp ? EXCEPTION_CODES.ADDRESS_STORE : EXCEPTION_CODES.ADDRESS_LOAD, error?.message ?? translateText("memory exception"), addr);
      }
      this.forceZeroRegister();
      return {};
    }

    if ((opcode === "beq" || opcode === "bne") && tokens.length >= 4) {
      const rs = reg(1);
      const rt = reg(2);
      const target = this.branchTarget(tokens[3], nextPc);
      if (rs !== null && rt !== null && target !== null) {
        const take = opcode === "beq" ? this.registers[rs] === this.registers[rt] : this.registers[rs] !== this.registers[rt];
        if (take) return { nextPc: target };
      }
      return {};
    }

    if (["bgtz", "blez", "bltz", "bgez", "bgezal", "bltzal"].includes(opcode) && tokens.length >= 3) {
      const rs = reg(1);
      const target = this.branchTarget(tokens[2], nextPc);
      if (rs !== null && target !== null) {
        const value = this.registers[rs] | 0;
        let take = false;
        if (opcode === "bgtz") take = value > 0;
        else if (opcode === "blez") take = value <= 0;
        else if (opcode === "bltz" || opcode === "bltzal") take = value < 0;
        else take = value >= 0;
        if (take) {
          if (opcode === "bgezal" || opcode === "bltzal") this.registers[31] = clamp32(nextPc);
          this.forceZeroRegister();
          return { nextPc: target };
        }
      }
      return {};
    }

    if (["bc1f", "bc1t"].includes(opcode) && tokens.length >= 2) {
      let cc = 0;
      let targetToken = tokens[1];
      if (tokens.length >= 3) {
        const maybeCc = imm(1);
        if (Number.isFinite(maybeCc)) {
          cc = (maybeCc | 0) & 0x7;
          targetToken = tokens[2];
        }
      }
      const target = this.branchTarget(targetToken, nextPc);
      if (target !== null) {
        const flag = this.getConditionFlag(cc);
        const take = opcode === "bc1t" ? flag === 1 : flag === 0;
        if (take) return { nextPc: target };
      }
      return {};
    }

    if ((opcode === "j" || opcode === "jal") && tokens.length >= 2) {
      const target = this.resolveLabelAddress(tokens[1]);
      if (target !== null) {
        if (opcode === "jal") this.registers[31] = clamp32(nextPc);
        this.forceZeroRegister();
        return { nextPc: target };
      }
      const absolute = parseImmediate(tokens[1]);
      if (Number.isFinite(absolute)) {
        if (opcode === "jal") this.registers[31] = clamp32(nextPc);
        this.forceZeroRegister();
        return { nextPc: absolute >>> 0 };
      }
      return {};
    }

    if ((opcode === "jr" || opcode === "jalr") && tokens.length >= 2) {
      const rs = opcode === "jalr" && tokens.length >= 3 ? reg(2) : reg(1);
      if (rs !== null) {
        if (opcode === "jalr") {
          const rd = tokens.length >= 3 ? reg(1) : 31;
          if (rd !== null) this.registers[rd] = clamp32(nextPc);
        }
        this.forceZeroRegister();
        return { nextPc: this.registers[rs] >>> 0 };
      }
      return {};
    }

    if (["add.s", "sub.s", "mul.s", "div.s", "add.d", "sub.d", "mul.d", "div.d"].includes(opcode) && tokens.length >= 4) {
      const kind = opcode.endsWith(".s") ? "s" : "d";
      const fd = freg(1), fs = freg(2), ft = freg(3);
      if (fd === null || fs === null || ft === null) return {};
      if (kind === "d" && ((fd & 1) || (fs & 1) || (ft & 1))) return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("double-precision register must be even-numbered"));
      const a = kind === "s" ? this.getFloat32(fs) : this.getFloat64(fs);
      const b = kind === "s" ? this.getFloat32(ft) : this.getFloat64(ft);
      let out = 0;
      if (opcode.startsWith("add")) out = a + b;
      else if (opcode.startsWith("sub")) out = a - b;
      else if (opcode.startsWith("mul")) out = a * b;
      else out = a / b;
      if (kind === "s") this.setFloat32(fd, out);
      else this.setFloat64(fd, out);
      return {};
    }

    if (["mov.s", "mov.d", "neg.s", "neg.d", "abs.s", "abs.d", "sqrt.s", "sqrt.d"].includes(opcode) && tokens.length >= 3) {
      const kind = opcode.endsWith(".s") ? "s" : "d";
      const fd = freg(1), fs = freg(2);
      if (fd === null || fs === null) return {};
      if (kind === "d" && ((fd & 1) || (fs & 1))) return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("double-precision register must be even-numbered"));
      if (opcode.startsWith("mov")) {
        if (kind === "s") this.cop1Registers[fd] = this.cop1Registers[fs] | 0;
        else { this.cop1Registers[fd] = this.cop1Registers[fs] | 0; this.cop1Registers[fd + 1] = this.cop1Registers[fs + 1] | 0; }
        return {};
      }
      const input = kind === "s" ? this.getFloat32(fs) : this.getFloat64(fs);
      const out = opcode.startsWith("neg") ? -input : (opcode.startsWith("abs") ? Math.abs(input) : Math.sqrt(input));
      if (kind === "s") this.setFloat32(fd, out); else this.setFloat64(fd, out);
      return {};
    }

    if (["movf", "movt"].includes(opcode) && tokens.length >= 3) {
      const rd = reg(1), rs = reg(2);
      const cc = tokens.length >= 4 ? ((imm(3) | 0) & 0x7) : 0;
      if (rd !== null && rs !== null) {
        const flag = this.getConditionFlag(cc);
        const take = opcode === "movt" ? flag === 1 : flag === 0;
        if (take) this.registers[rd] = this.registers[rs];
      }
      this.forceZeroRegister();
      return {};
    }

    if (["movf.s", "movt.s", "movf.d", "movt.d"].includes(opcode) && tokens.length >= 3) {
      const kind = opcode.endsWith(".s") ? "s" : "d";
      const fd = freg(1), fs = freg(2);
      const cc = tokens.length >= 4 ? ((imm(3) | 0) & 0x7) : 0;
      if (fd === null || fs === null) return {};
      if (kind === "d" && ((fd & 1) || (fs & 1))) return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("double-precision register must be even-numbered"));
      const flag = this.getConditionFlag(cc);
      const take = opcode.startsWith("movt") ? flag === 1 : flag === 0;
      if (take) {
        if (kind === "s") this.cop1Registers[fd] = this.cop1Registers[fs] | 0;
        else { this.cop1Registers[fd] = this.cop1Registers[fs] | 0; this.cop1Registers[fd + 1] = this.cop1Registers[fs + 1] | 0; }
      }
      return {};
    }

    if (["movn.s", "movz.s", "movn.d", "movz.d"].includes(opcode) && tokens.length >= 4) {
      const kind = opcode.endsWith(".s") ? "s" : "d";
      const fd = freg(1), fs = freg(2), rt = reg(3);
      if (fd === null || fs === null || rt === null) return {};
      if (kind === "d" && ((fd & 1) || (fs & 1))) return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("double-precision register must be even-numbered"));
      const take = opcode.startsWith("movn") ? (this.registers[rt] | 0) !== 0 : (this.registers[rt] | 0) === 0;
      if (take) {
        if (kind === "s") this.cop1Registers[fd] = this.cop1Registers[fs] | 0;
        else {
          this.cop1Registers[fd] = this.cop1Registers[fs] | 0;
          this.cop1Registers[fd + 1] = this.cop1Registers[fs + 1] | 0;
        }
      }
      return {};
    }
    if (["c.eq.s", "c.lt.s", "c.le.s", "c.eq.d", "c.lt.d", "c.le.d"].includes(opcode)) {
      let cc = 0;
      let fsToken = tokens[1], ftToken = tokens[2];
      if (tokens.length >= 4) {
        const maybeCc = imm(1);
        if (Number.isFinite(maybeCc)) { cc = (maybeCc | 0) & 0x7; fsToken = tokens[2]; ftToken = tokens[3]; }
      }
      const fs = this.resolveFloatRegister(fsToken), ft = this.resolveFloatRegister(ftToken);
      if (fs === null || ft === null) return {};
      const kind = opcode.endsWith(".s") ? "s" : "d";
      if (kind === "d" && ((fs & 1) || (ft & 1))) return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("double-precision register must be even-numbered"));
      const a = kind === "s" ? this.getFloat32(fs) : this.getFloat64(fs);
      const b = kind === "s" ? this.getFloat32(ft) : this.getFloat64(ft);
      let result = false;
      if (opcode.includes("c.eq")) result = a === b;
      else if (opcode.includes("c.lt")) result = a < b;
      else result = a <= b;
      this.setConditionFlag(cc, result ? 1 : 0);
      return {};
    }

    if (["cvt.s.d", "cvt.s.w", "cvt.d.s", "cvt.d.w", "cvt.w.s", "cvt.w.d", "round.w.s", "round.w.d", "trunc.w.s", "trunc.w.d", "ceil.w.s", "ceil.w.d", "floor.w.s", "floor.w.d"].includes(opcode) && tokens.length >= 3) {
      const fd = freg(1), fs = freg(2);
      if (fd === null || fs === null) return {};
      if (["cvt.d.s", "cvt.w.d", "round.w.d", "trunc.w.d", "ceil.w.d", "floor.w.d"].includes(opcode) && (fs & 1)) return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("second register must be even-numbered"));
      if (opcode.startsWith("cvt.d") && (fd & 1)) return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("first register must be even-numbered"));

      if (opcode === "cvt.s.d") { this.setFloat32(fd, this.getFloat64(fs)); return {}; }
      if (opcode === "cvt.d.s") { this.setFloat64(fd, this.getFloat32(fs)); return {}; }
      if (opcode === "cvt.s.w") { this.setFloat32(fd, this.cop1Registers[fs] | 0); return {}; }
      if (opcode === "cvt.d.w") { this.setFloat64(fd, this.cop1Registers[fs] | 0); return {}; }
      if (opcode === "cvt.w.s" || opcode === "cvt.w.d") {
        const source = opcode.endsWith(".s") ? this.getFloat32(fs) : this.getFloat64(fs);
        this.cop1Registers[fd] = clamp32(source);
        return {};
      }

      const source = opcode.endsWith(".s") ? this.getFloat32(fs) : this.getFloat64(fs);
      let rounded = 0;
      if (opcode.startsWith("round")) rounded = roundNearestEven(source);
      else if (opcode.startsWith("trunc")) rounded = truncNumber(source);
      else if (opcode.startsWith("ceil")) rounded = ceilNumber(source);
      else rounded = floorNumber(source);
      this.cop1Registers[fd] = saturatingInt(rounded);
      return {};
    }

    return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("Unsupported instruction '{opcode}'", { opcode }));
  }
  resolveValue(token) {
    const immediate = parseImmediate(token);
    if (Number.isFinite(immediate)) {
      return immediate;
    }

    const expression = stripToken(token);
    if (!expression) return Number.NaN;

    const simpleMatch = /^([A-Za-z_.$][\w.$]*)([-+]\d+)?$/.exec(expression);
    if (simpleMatch && this.program.labels.has(simpleMatch[1])) {
      const base = this.program.labels.get(simpleMatch[1]) >>> 0;
      const delta = simpleMatch[2] ? Number.parseInt(simpleMatch[2], 10) : 0;
      return clamp32(base + delta);
    }

    const label = this.resolveLabelAddress(token);
    if (label !== null) {
      return label;
    }

    let unresolved = false;
    const substituted = expression.replace(/[A-Za-z_.$][\w.$]*/g, (symbol) => {
      if (this.program.labels.has(symbol)) {
        return `${this.program.labels.get(symbol) >>> 0}`;
      }
      unresolved = true;
      return symbol;
    });

    if (unresolved) return Number.NaN;
    if (!/^[0-9a-fxX()\s+\-*/%<>&|^~]+$/.test(substituted)) return Number.NaN;

    try {
      const evaluated = Function(`"use strict"; return (${substituted});`)();
      if (!Number.isFinite(evaluated)) return Number.NaN;
      return clamp32(evaluated);
    } catch {
      return Number.NaN;
    }
  }
  resolveLabelAddress(token) {
    const label = stripToken(token);
    if (this.program.labels.has(label)) {
      return this.program.labels.get(label) >>> 0;
    }
    return null;
  }
  resolveRegister(token) {
    const normalized = normalizeRegisterToken(token);

    if (/^\d+$/.test(normalized)) {
      const index = Number.parseInt(normalized, 10);
      if (index >= 0 && index < USER_REGISTER_NAMES.length) {
        return index;
      }
      return null;
    }

    if (Object.hasOwn(REGISTER_ALIASES, normalized)) {
      return REGISTER_ALIASES[normalized];
    }

    return null;
  }
}

function createMarsEngine(options = {}) {
  const settings = options?.settings || {};
  const backend = String(settings.coreBackend || DEFAULT_SETTINGS.coreBackend || "js").trim().toLowerCase();
  const wasmFactory = typeof window !== "undefined" ? window.WebMarsWasmCore : null;

  const wrapBackend = (engine, backendInfo = {}) => {
    if (!engine || typeof engine !== "object") return engine;
    if (engine.__webMarsBackend === true) return engine;

    const info = {
      backend: backendInfo.backend || backend || "js",
      backendName: backendInfo.backendName || (backend === "wasm" ? "wasm-cpp" : "js-core"),
      native: backendInfo.native === true
    };

    return {
      __webMarsBackend: true,
      getBackendInfo() {
        if (typeof engine.getBackendInfo === "function") {
          const dynamicInfo = engine.getBackendInfo();
          if (dynamicInfo && typeof dynamicInfo === "object") {
            return {
              backend: dynamicInfo.backend || info.backend,
              backendName: dynamicInfo.backendName || info.backendName,
              native: dynamicInfo.native === true
            };
          }
        }
        return { ...info };
      },
      assemble(...args) {
        return engine.assemble(...args);
      },
      step(...args) {
        return engine.step(...args);
      },
      stepMany(...args) {
        if (typeof engine.stepMany === "function") return engine.stepMany(...args);
        if (typeof engine.go === "function") return engine.go(...args);
        return engine.step(...args);
      },
      go(...args) {
        return engine.go(...args);
      },
      backstep(...args) {
        return engine.backstep(...args);
      },
      reset(...args) {
        return engine.reset(...args);
      },
      stop(...args) {
        if (typeof engine.stop === "function") return engine.stop(...args);
        engine.halted = true;
        return {
          ok: true,
          done: true,
          haltReason: "user",
          message: translateText("Execution stopped."),
          snapshot: engine.getSnapshot()
        };
      },
      getSnapshot(...args) {
        return engine.getSnapshot(...args);
      },
      toggleBreakpoint(...args) {
        return engine.toggleBreakpoint(...args);
      },
      setRuntimeHooks(...args) {
        return engine.setRuntimeHooks(...args);
      },
      setMemoryMap(...args) {
        return engine.setMemoryMap(...args);
      },
      setSourceFiles(...args) {
        return engine.setSourceFiles(...args);
      },
      trimExecutionHistory(...args) {
        if (typeof engine.trimExecutionHistory === "function") return engine.trimExecutionHistory(...args);
        return undefined;
      },
      getMemoryUsageBytes(...args) {
        if (typeof engine.getMemoryUsageBytes === "function") return engine.getMemoryUsageBytes(...args);
        return 0;
      },
      readByte(...args) {
        if (typeof engine.readByte === "function") return engine.readByte(...args);
        throw new Error("Backend does not support readByte.");
      },
      writeByte(...args) {
        if (typeof engine.writeByte === "function") return engine.writeByte(...args);
        throw new Error("Backend does not support writeByte.");
      },
      readWord(...args) {
        if (typeof engine.readWord === "function") return engine.readWord(...args);
        throw new Error("Backend does not support readWord.");
      },
      writeWord(...args) {
        if (typeof engine.writeWord === "function") return engine.writeWord(...args);
        throw new Error("Backend does not support writeWord.");
      },
      getSyscallMatrix(...args) {
        if (typeof engine.getSyscallMatrix === "function") return engine.getSyscallMatrix(...args);
        return getReferenceSyscallMatrix().map((entry) => ({ ...entry }));
      },
      auditSyscallMatrix(...args) {
        if (typeof engine.auditSyscallMatrix === "function") return engine.auditSyscallMatrix(...args);
        const matrix = getReferenceSyscallMatrix();
        return {
          total: matrix.length,
          implemented: matrix.filter((entry) => entry.implementedInWeb === true).length,
          missingInWeb: matrix.filter((entry) => entry.implementedInWeb !== true),
          constructorMismatches: matrix.filter((entry) => (
            (Number.isFinite(entry.constructorNumber) && entry.constructorNumber !== entry.number)
            || (entry.constructorName && entry.constructorName !== entry.name)
          ))
        };
      }
    };
  };

  if (backend === "wasm" && wasmFactory && typeof wasmFactory.createEngineSync === "function") {
    try {
      const wasmEngine = wasmFactory.createEngineSync(options);
      if (wasmEngine) {
        return wrapBackend(wasmEngine, {
          backend: "wasm",
          backendName: wasmFactory?.status?.backendName || "wasm-cpp",
          native: true
        });
      }
    } catch {
      // Fallback to JavaScript engine on any wasm bridge failure.
    }
  }

  return wrapBackend(new MarsEngine(options), {
    backend: "js",
    backendName: "js-core",
    native: false
  });
}

































