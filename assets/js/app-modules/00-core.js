const DEFAULT_SETTINGS = {
  version: "4.5",
  cloudApiBase: "https://backmars.nfiles.top/api",
  extendedAssembler: true,
  bareMachine: false,
  assembleOnOpen: false,
  assembleAll: false,
  delayedBranching: false,
  warningsAreErrors: false,
  startAtMain: false,
  strictMarsCompatibility: false,
  selfModifyingCode: false,
  popupSyscallInput: false,
  programArguments: false,
  programArgumentsLine: "",
  maxMessageCharacters: 200000,
  maxErrors: 200,
  maxBacksteps: 100,
  maxUserStorageBytes: 1024 * 1024,
  maxMemoryBytes: 0x7fffffff,
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
const JAVA_MARS_ENDIANNESS = "little";
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
move $a0, $t2
li $v0, 1
syscall
li $a0, 10
li $v0, 11
syscall
li $v0, 10
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
const WEBMARS_RUNIO_EOF_MARKER = "/eof";
const WEBMARS_CUSTOM_SYSCALLS = Object.freeze({
  flush: 60,
  eof: 61,
  readline: 62,
  printf: 63,
  format: 64,
  fileRead: 65,
  fileClosed: 66,
  fileClose: 67,
  fileEof: 68,
  fileReadline: 69,
  argsFlag: 70,
  argsInt: 71,
  argsString: 72,
  argsParse: 73,
  stringLength: 74,
  stringCharAt: 75,
  stringJoin: 76,
  stringSub: 77,
  stringCompare: 78,
  stringFromInt: 79,
  stringFromChar: 80,
  stringToLower: 81,
  stringTerminated: 82,
  stringToCharArray: 83,
  stringFromCharArray: 84,
  charChr: 85,
  parseBool: 86,
  parseInt: 87,
  numTokens: 88,
  intTokens: 89,
  parseTokens: 90,
  parseInts: 91,
  int2Hex: 92,
  imageWidth: 93,
  imageHeight: 94,
  imageCreate: 95,
  imageClone: 96,
  imageSubimage: 97,
  imageLoad: 98,
  imageSave: 99,
  imageData: 100,
  cstrTerminated: 101,
  cstrFromString: 102,
  stringFromCstr: 103
});
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

class BackstepJournalBuffer {
  constructor() {
    this.entries = [];
    this.head = 0;
  }

  get length() {
    return Math.max(0, this.entries.length - this.head);
  }

  clear() {
    this.entries = [];
    this.head = 0;
  }

  push(value) {
    this.entries.push(value);
    return this.length;
  }

  pop() {
    if (this.length === 0) return undefined;
    const value = this.entries.pop();
    if (this.length === 0) this.clear();
    return value;
  }

  shift() {
    if (this.length === 0) return undefined;
    const value = this.entries[this.head];
    this.entries[this.head] = null;
    this.head += 1;
    if (this.head >= 4096 && this.head * 2 >= this.entries.length) {
      this.entries = this.entries.slice(this.head);
      this.head = 0;
    } else if (this.length === 0) {
      this.clear();
    }
    return value;
  }

  peekOldest() {
    return this.length > 0 ? this.entries[this.head] : null;
  }

  at(index) {
    const normalized = Number(index) | 0;
    if (normalized < 0 || normalized >= this.length) return undefined;
    return this.entries[this.head + normalized];
  }

  forEach(callback) {
    if (typeof callback !== "function") return;
    for (let index = 0; index < this.length; index += 1) {
      callback(this.entries[this.head + index], index, this);
    }
  }

  *[Symbol.iterator]() {
    for (let index = this.head; index < this.entries.length; index += 1) {
      yield this.entries[index];
    }
  }
}

class BackstepMemoryRun {
  constructor(start) {
    this.start = start >>> 0;
    this.length = 0;
    this.chunks = [];
  }

  push(value) {
    const chunkIndex = Math.floor(this.length / 4096);
    const chunkOffset = this.length % 4096;
    if (!this.chunks[chunkIndex]) this.chunks[chunkIndex] = new Uint8Array(4096);
    this.chunks[chunkIndex][chunkOffset] = value & 0xff;
    this.length += 1;
  }

  compact() {
    const bytes = new Uint8Array(this.length);
    let targetOffset = 0;
    this.chunks.forEach((chunk) => {
      const length = Math.min(chunk.length, this.length - targetOffset);
      if (length > 0) bytes.set(chunk.subarray(0, length), targetOffset);
      targetOffset += length;
    });
    return bytes;
  }
}

class BackstepMemoryJournal {
  constructor(maxBytes = 0) {
    this.maxBytes = Number.isFinite(maxBytes) ? Math.max(0, Math.floor(maxBytes)) : 0;
    this.runs = [];
    this.byteLength = 0;
    this.overflow = false;
  }

  containsAddress(address) {
    const addr = address >>> 0;
    return this.runs.some((run) => {
      const offset = ((addr - (run.start >>> 0)) >>> 0);
      return offset < run.length;
    });
  }

  record(address, previousByte) {
    if (this.overflow) return false;
    const addr = address >>> 0;
    const last = this.runs[this.runs.length - 1];
    if (last && addr === ((last.start + last.length) >>> 0)) {
      if (this.maxBytes > 0 && this.byteLength + 1 > this.maxBytes) {
        this.overflow = true;
        this.runs = [];
        this.byteLength = 0;
        return false;
      }
      last.push(previousByte);
      this.byteLength += 1;
      return true;
    }
    if (this.containsAddress(addr)) return true;
    if (this.maxBytes > 0 && this.byteLength + 1 > this.maxBytes) {
      this.overflow = true;
      this.runs = [];
      this.byteLength = 0;
      return false;
    }
    const run = new BackstepMemoryRun(addr);
    run.push(previousByte);
    this.runs.push(run);
    this.byteLength += 1;
    return true;
  }

  compact() {
    if (this.overflow || this.byteLength === 0) return null;
    const compacted = new Array(this.runs.length * 2);
    let offset = 0;
    this.runs.forEach((run) => {
      compacted[offset] = run.start >>> 0;
      compacted[offset + 1] = run.compact();
      offset += 2;
    });
    return compacted;
  }
}
const STRICT_MARS_SEGMENT_BYTES = 4 * 1024 * 1024;
const STRICT_MARS_MMIO_BYTES = 64 * 1024;
const HEAP_STACK_GUARD_BYTES = 4;
const SYSCALL_BUFFER_HARD_LIMIT_BYTES = 16 * 1024 * 1024;
const SYSCALL_STRING_HARD_LIMIT_CHARACTERS = 1024 * 1024;
const SYSCALL_ARRAY_HARD_LIMIT_ELEMENTS = 1024 * 1024;
const SYSCALL_IMAGE_HARD_LIMIT_PIXELS = 1024 * 1024;
const SYSCALL_IMAGE_HARD_LIMIT_DIMENSION = 32768;
const UINT32_WRAP = 0x1_0000_0000n;

function unsignedRangeContains(address, byteLength, start, sizeBytes) {
  const numericLength = Number(byteLength);
  const numericWindowSize = Number(sizeBytes);
  const length = BigInt(Number.isSafeInteger(numericLength) ? Math.max(1, numericLength) : 1);
  const windowSize = BigInt(Number.isSafeInteger(numericWindowSize) ? Math.max(1, numericWindowSize) : 1);
  const addrStart = BigInt(address >>> 0);
  const windowStart = BigInt(start >>> 0);
  const windowEnd = windowStart + windowSize;
  const addrEnd = addrStart + length;

  if (windowEnd <= UINT32_WRAP) {
    return addrStart >= windowStart && addrEnd <= windowEnd;
  }

  const wrappedEnd = windowEnd - UINT32_WRAP;
  const startInWindow = addrStart >= windowStart || addrStart < wrappedEnd;
  const endAddress = (addrEnd - 1n) % UINT32_WRAP;
  const endInWindow = endAddress >= windowStart || endAddress < wrappedEnd;
  return startInWindow && endInWindow;
}

function nearestHigherAddress(start, candidates, fallback = 0x1_0000_0000) {
  const base = Number(start) >>> 0;
  let boundary = fallback;
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (!Number.isFinite(value)) continue;
    const address = value >>> 0;
    if (address > base && address < boundary) boundary = address;
  }
  return boundary;
}

function compactAddressSpaceEnd(mmioBase) {
  const base = mmioBase >>> 0;
  if (base >= 0x10000) return 0x1_0000_0000;
  let end = 1;
  while (end <= base && end < 0x1_0000_0000) end *= 2;
  return end;
}

function buildStrictMemoryRanges(memoryMap = DEFAULT_MEMORY_MAP) {
  const map = { ...DEFAULT_MEMORY_MAP, ...(memoryMap ?? {}) };
  const textStart = map.textBase >>> 0;
  const dataStart = (map.dataSegmentBase ?? map.dataBase ?? DEFAULT_MEMORY_MAP.dataSegmentBase) >>> 0;
  const kernelTextStart = (map.kernelTextBase ?? map.kernelBase ?? DEFAULT_MEMORY_MAP.kernelTextBase) >>> 0;
  const kernelDataStart = (map.kernelDataBase ?? DEFAULT_MEMORY_MAP.kernelDataBase) >>> 0;
  const mmioStart = (map.mmioBase ?? DEFAULT_MEMORY_MAP.mmioBase) >>> 0;
  const allStarts = [textStart, dataStart, kernelTextStart, kernelDataStart, mmioStart];
  const textEnd = nearestHigherAddress(textStart, allStarts);
  const dataEnd = nearestHigherAddress(dataStart, allStarts);
  const kernelTextEnd = nearestHigherAddress(kernelTextStart, [kernelDataStart, mmioStart]);
  const kernelDataEnd = nearestHigherAddress(kernelDataStart, [mmioStart]);
  const mmioEnd = compactAddressSpaceEnd(mmioStart);
  const stackBase = (map.stackBase ?? map.stackPointer ?? DEFAULT_MEMORY_MAP.stackBase) >>> 0;
  const stackEnd = Math.min(dataEnd, stackBase + 4);
  const stackStart = Math.max(dataStart, stackEnd - STRICT_MARS_SEGMENT_BYTES);

  return [
    { segment: "text", start: textStart, size: textEnd - textStart },
    { segment: "data", start: dataStart, size: dataEnd - dataStart },
    { segment: "ktext", start: kernelTextStart, size: kernelTextEnd - kernelTextStart },
    { segment: "kdata", start: kernelDataStart, size: kernelDataEnd - kernelDataStart },
    { segment: "stack", start: stackStart, size: stackEnd - stackStart },
    {
      segment: "mmio",
      start: mmioStart,
      size: Math.min(STRICT_MARS_MMIO_BYTES, mmioEnd - mmioStart)
    }
  ];
}

function findStrictSegmentForAddress(memoryMap, address, byteLength = 1) {
  const ranges = buildStrictMemoryRanges(memoryMap);
  for (let i = 0; i < ranges.length; i += 1) {
    const range = ranges[i];
    if (unsignedRangeContains(address, byteLength, range.start, range.size)) {
      return range.segment;
    }
  }
  return null;
}

function isStrictSegmentAddressValid(memoryMap, segment, address, byteLength = 1) {
  const ranges = buildStrictMemoryRanges(memoryMap);
  const target = ranges.find((range) => range.segment === segment);
  if (!target) return false;
  return unsignedRangeContains(address, byteLength, target.start, target.size);
}

function heapAddressLimit(memoryMap = DEFAULT_MEMORY_MAP, runtimeStackPointer = null) {
  const map = { ...DEFAULT_MEMORY_MAP, ...(memoryMap ?? {}) };
  const heapBase = map.heapBase >>> 0;
  const dataRange = buildStrictMemoryRanges(map).find((range) => range.segment === "data");
  const collisionCandidates = [
    runtimeStackPointer,
    map.stackPointer,
    map.stackBase,
    map.kernelTextBase,
    map.kernelBase,
    dataRange ? dataRange.start + dataRange.size : null
  ]
    .filter((value) => Number.isFinite(Number(value)))
    .map((value) => Number(value) >>> 0)
    .filter((address) => address > heapBase);
  const collisionAddress = collisionCandidates.length
    ? Math.min(...collisionCandidates)
    : 0x1_0000_0000;
  return Math.max(heapBase, collisionAddress - HEAP_STACK_GUARD_BYTES);
}

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

function parseStrictIntegerBase(text, base) {
  const raw = String(text ?? "").trim();
  const numericBase = Number(base) | 0;
  if (!Number.isFinite(numericBase) || numericBase < 2 || numericBase > 36) return null;
  if (!raw.length) return null;
  let sign = 1;
  let cursor = 0;
  if (raw[0] === "+") cursor = 1;
  else if (raw[0] === "-") {
    sign = -1;
    cursor = 1;
  }
  if (cursor >= raw.length) return null;
  let value = 0;
  for (let i = cursor; i < raw.length; i += 1) {
    const ch = raw[i];
    const code = ch.charCodeAt(0);
    let digit = -1;
    if (code >= 48 && code <= 57) digit = code - 48;
    else if (code >= 65 && code <= 90) digit = code - 55;
    else if (code >= 97 && code <= 122) digit = code - 87;
    if (digit < 0 || digit >= numericBase) return null;
    value = (value * numericBase) + digit;
    if (!Number.isFinite(value)) return null;
  }
  value *= sign;
  if (value < -2147483648 || value > 2147483647) return null;
  return value | 0;
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

const coreStoreModule = (typeof window !== "undefined" ? window.WebMarsModules : globalThis.WebMarsModules)?.coreStore;
if (!coreStoreModule || typeof coreStoreModule.createStore !== "function") {
  throw new Error("[mars-web] coreStore module was not loaded before core runtime.");
}
const { createStore } = coreStoreModule;

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

const clamp32 = (value) => value | 0;
const signExtend16 = (value) => ((Number(value) || 0) << 16) >> 16;
const zeroExtend16 = (value) => (Number(value) || 0) & 0xffff;
const float32ToBits = (value) => {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, Number(value), false);
  return view.getInt32(0, false);
};
const bitsToFloat32 = (bits) => {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, clamp32(bits), false);
  return view.getFloat32(0, false);
};
const float64HighWord = (value) => {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, Number(value), false);
  return view.getInt32(0, false);
};
const float64LowWord = (value) => {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, Number(value), false);
  return view.getInt32(4, false);
};
const wordsToFloat64 = (highWord, lowWord) => {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setInt32(0, clamp32(highWord), false);
  view.setInt32(4, clamp32(lowWord), false);
  return view.getFloat64(0, false);
};
const composeWord = (b0, b1, b2, b3) => {
  return clamp32((((b3 & 0xff) << 24) | ((b2 & 0xff) << 16) | ((b1 & 0xff) << 8) | (b0 & 0xff)) >>> 0);
};
const getWordByte = (word, index) => {
  return (word >>> ((index & 0x3) * 8)) & 0xff;
};
const setWordByte = (word, index, byte) => {
  const shift = (index & 0x3) * 8;
  return clamp32((word & ~(0xff << shift)) | ((byte & 0xff) << shift));
};
const clz32 = (value) => {
  return Math.clz32((Number(value) || 0) >>> 0);
};
const clo32 = (value) => {
  return Math.clz32(~((Number(value) || 0) >>> 0));
};
const saturatingInt32 = (value) => {
  if (!Number.isFinite(value) || value < -2147483648 || value > 2147483647) return 2147483647;
  return clamp32(value);
};
const roundNearestEven32 = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return numeric;
  const floor = Math.floor(numeric);
  const frac = numeric - floor;
  if (frac < 0.5) return floor;
  if (frac > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
};
const floorNumber = (value) => {
  return Math.floor(Number(value));
};
const ceilNumber = (value) => {
  return Math.ceil(Number(value));
};
const truncNumber = (value) => {
  return Math.trunc(Number(value));
};
const add32 = (a, b) => {
  return clamp32((Number(a) || 0) + (Number(b) || 0));
};
const sub32 = (a, b) => {
  return clamp32((Number(a) || 0) - (Number(b) || 0));
};
const addOverflow32 = (a, b) => {
  const lhs = clamp32(a);
  const rhs = clamp32(b);
  const sum = clamp32(lhs + rhs);
  return (lhs >= 0 && rhs >= 0 && sum < 0) || (lhs < 0 && rhs < 0 && sum >= 0);
};
const subOverflow32 = (a, b) => {
  const lhs = clamp32(a);
  const rhs = clamp32(b);
  const diff = clamp32(lhs - rhs);
  return (lhs >= 0 && rhs < 0 && diff < 0) || (lhs < 0 && rhs >= 0 && diff >= 0);
};
const mulSignedLo32 = (a, b) => {
  const product = BigInt(a | 0) * BigInt(b | 0);
  return clamp32(Number(BigInt.asIntN(32, product)));
};
const mulSignedHi32 = (a, b) => {
  const product = BigInt.asIntN(64, BigInt(a | 0) * BigInt(b | 0));
  return clamp32(Number(BigInt.asIntN(32, product >> 32n)));
};
const mulUnsignedLo32 = (a, b) => {
  const product = BigInt(a >>> 0) * BigInt(b >>> 0);
  return clamp32(Number(BigInt.asUintN(32, product)));
};
const mulUnsignedHi32 = (a, b) => {
  const product = BigInt.asUintN(64, BigInt(a >>> 0) * BigInt(b >>> 0));
  return clamp32(Number(BigInt.asUintN(32, product >> 32n)));
};
const divSignedQuot32 = (a, b) => {
  if ((b | 0) === 0) return 0;
  return clamp32((a | 0) / (b | 0));
};
const divSignedRem32 = (a, b) => {
  if ((b | 0) === 0) return 0;
  return clamp32((a | 0) % (b | 0));
};
const divUnsignedQuot32 = (a, b) => {
  if ((b >>> 0) === 0) return 0;
  return clamp32(Math.floor((a >>> 0) / (b >>> 0)) >>> 0);
};
const divUnsignedRem32 = (a, b) => {
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

function isAssemblerIdentifierStart(ch) {
  return /[A-Za-z_.$]/.test(String(ch ?? ""));
}

function isAssemblerIdentifierPart(ch) {
  return /[\w.$]/.test(String(ch ?? ""));
}

function replaceIdentifiersOutsideLiterals(statement, replacer) {
  const input = String(statement ?? "");
  if (!input) return "";

  let output = "";
  let current = "";
  let inSingle = false;
  let inDouble = false;

  const flush = () => {
    if (!current) return;
    const replacement = typeof replacer === "function" ? replacer(current) : current;
    output += replacement == null ? current : String(replacement);
    current = "";
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : "";

    if (!inSingle && !inDouble && ch === "#") {
      flush();
      output += input.slice(i);
      return output;
    }

    if (ch === '"' && !inSingle && prev !== "\\") {
      flush();
      inDouble = !inDouble;
      output += ch;
      continue;
    }

    if (ch === "'" && !inDouble && prev !== "\\") {
      flush();
      inSingle = !inSingle;
      output += ch;
      continue;
    }

    if (inSingle || inDouble) {
      output += ch;
      continue;
    }

    if (!current) {
      if (isAssemblerIdentifierStart(ch)) {
        current = ch;
      } else {
        output += ch;
      }
      continue;
    }

    if (isAssemblerIdentifierPart(ch)) {
      current += ch;
      continue;
    }

    flush();
    if (isAssemblerIdentifierStart(ch)) {
      current = ch;
    } else {
      output += ch;
    }
  }

  flush();
  return output;
}

function replaceMacroParametersOutsideLiterals(statement, replacements) {
  const input = String(statement ?? "");
  if (!input || !(replacements instanceof Map) || replacements.size === 0) return input;

  let output = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : "";

    if (!inSingle && !inDouble && ch === "#") {
      output += input.slice(i);
      return output;
    }

    if (ch === '"' && !inSingle && prev !== "\\") {
      inDouble = !inDouble;
      output += ch;
      continue;
    }

    if (ch === "'" && !inDouble && prev !== "\\") {
      inSingle = !inSingle;
      output += ch;
      continue;
    }

    if (inSingle || inDouble) {
      output += ch;
      continue;
    }

    if ((ch === "%" || ch === "$") && i + 1 < input.length && isAssemblerIdentifierPart(input[i + 1])) {
      let end = i + 1;
      while (end < input.length && isAssemblerIdentifierPart(input[end])) end += 1;
      const token = input.slice(i, end);
      output += replacements.has(token) ? String(replacements.get(token)) : token;
      i = end - 1;
      continue;
    }

    output += ch;
  }

  return output;
}

function isPotentialSymbolExpression(text) {
  const expression = stripToken(String(text ?? ""));
  if (!expression) return false;
  let sawIdentifier = false;
  const substituted = expression.replace(/[A-Za-z_.$][\w.$]*/g, () => {
    sawIdentifier = true;
    return "1";
  });
  if (!sawIdentifier) return false;
  return /^[0-9a-fxX()\s+\-*/%<>&|^~]+$/.test(substituted);
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
let cachedReferenceBasicInstructionsSource = null;
let cachedReferenceBasicInstructionsIndex = null;

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

function getReferenceBasicInstructionsIndex() {
  const referenceData = getReferenceDataStore();
  const basicInstructions = Array.isArray(referenceData?.basicInstructions) ? referenceData.basicInstructions : null;
  if (!basicInstructions || !basicInstructions.length) return null;
  if (cachedReferenceBasicInstructionsSource === basicInstructions && cachedReferenceBasicInstructionsIndex instanceof Map) {
    return cachedReferenceBasicInstructionsIndex;
  }

  const index = new Map();
  basicInstructions.forEach((entry, order) => {
    const example = String(entry?.example ?? "").trim();
    const description = String(entry?.description ?? "").trim();
    const tokens = tokenizeStatement(example);
    if (!tokens.length) return;
    const opcode = String(tokens[0] ?? "").toLowerCase();
    const spec = {
      opcode,
      example,
      description,
      tokens,
      operandCount: Math.max(0, tokens.length - 1),
      order
    };
    if (!index.has(opcode)) index.set(opcode, []);
    index.get(opcode).push(spec);
  });

  cachedReferenceBasicInstructionsSource = basicInstructions;
  cachedReferenceBasicInstructionsIndex = index;
  return cachedReferenceBasicInstructionsIndex;
}

function parseMacroInvocation(statement) {
  const input = String(statement ?? "").trim();
  if (!input) return null;
  const match = /^([A-Za-z_.$][\w.$]*)(.*)$/.exec(input);
  if (!match) return null;
  let argsText = String(match[2] ?? "").trim();
  if (argsText.startsWith("(") && argsText.endsWith(")")) {
    argsText = argsText.slice(1, -1).trim();
  }
  return {
    name: match[1],
    args: argsText ? tokenizeStatement(argsText) : []
  };
}

function encodeRFormatWord(rs, rt, rd, shamt, funct) {
  return (
    (((rs ?? 0) & 0x1f) << 21)
    | (((rt ?? 0) & 0x1f) << 16)
    | (((rd ?? 0) & 0x1f) << 11)
    | (((shamt ?? 0) & 0x1f) << 6)
    | ((funct ?? 0) & 0x3f)
  ) >>> 0;
}

function encodeIFormatWord(opcode, rs, rt, immediate) {
  return (
    (((opcode ?? 0) & 0x3f) << 26)
    | (((rs ?? 0) & 0x1f) << 21)
    | (((rt ?? 0) & 0x1f) << 16)
    | ((immediate ?? 0) & 0xffff)
  ) >>> 0;
}

function encodeJFormatWord(opcode, targetAddress) {
  return (
    (((opcode ?? 0) & 0x3f) << 26)
    | (((targetAddress ?? 0) >>> 2) & 0x03ffffff)
  ) >>> 0;
}

function encodeCopMoveWord(opcode, rs, rt, rdOrFs) {
  return (
    (((opcode ?? 0) & 0x3f) << 26)
    | (((rs ?? 0) & 0x1f) << 21)
    | (((rt ?? 0) & 0x1f) << 16)
    | (((rdOrFs ?? 0) & 0x1f) << 11)
  ) >>> 0;
}

function encodeCop1FunctionWord(fmt, ft, fs, fd, funct) {
  return (
    (0x11 << 26)
    | (((fmt ?? 0) & 0x1f) << 21)
    | (((ft ?? 0) & 0x1f) << 16)
    | (((fs ?? 0) & 0x1f) << 11)
    | (((fd ?? 0) & 0x1f) << 6)
    | ((funct ?? 0) & 0x3f)
  ) >>> 0;
}

function computeBranchImmediateField(address, target) {
  const nextPc = ((address >>> 0) + 4) >>> 0;
  const signedDelta = (((target >>> 0) - nextPc) | 0) >> 2;
  return signedDelta & 0xffff;
}

function encodeInstructionWordFromPlanRow(row) {
  if (!row || typeof row !== "object") return null;
  const opcode = String(row.opcode ?? "").toLowerCase();
  const rs = row.rs ?? 0;
  const rt = row.rt ?? 0;
  const rd = row.rd ?? 0;
  const fs = row.fs ?? 0;
  const ft = row.ft ?? 0;
  const fd = row.fd ?? 0;
  const base = row.base ?? 0;
  const imm = row.immediate ?? 0;
  const cc = row.cc ?? 0;
  const address = row.address ?? 0;
  const target = row.target ?? 0;

  if (opcode === "nop") return 0;
  if (opcode === "syscall") return 0x0000000c;
  if (opcode === "eret") return 0x42000018;
  if (opcode === "break") return ((((imm >>> 0) & 0xfffff) << 6) | 0x0d) >>> 0;

  switch (opcode) {
    case "add": return encodeRFormatWord(rs, rt, rd, 0, 0x20);
    case "addu": return encodeRFormatWord(rs, rt, rd, 0, 0x21);
    case "sub": return encodeRFormatWord(rs, rt, rd, 0, 0x22);
    case "subu": return encodeRFormatWord(rs, rt, rd, 0, 0x23);
    case "and": return encodeRFormatWord(rs, rt, rd, 0, 0x24);
    case "or": return encodeRFormatWord(rs, rt, rd, 0, 0x25);
    case "xor": return encodeRFormatWord(rs, rt, rd, 0, 0x26);
    case "nor": return encodeRFormatWord(rs, rt, rd, 0, 0x27);
    case "slt": return encodeRFormatWord(rs, rt, rd, 0, 0x2a);
    case "sltu": return encodeRFormatWord(rs, rt, rd, 0, 0x2b);
    case "movn": return encodeRFormatWord(rs, rt, rd, 0, 0x0b);
    case "movz": return encodeRFormatWord(rs, rt, rd, 0, 0x0a);
    case "sll": return encodeRFormatWord(0, rt, rd, imm, 0x00);
    case "srl": return encodeRFormatWord(0, rt, rd, imm, 0x02);
    case "sra": return encodeRFormatWord(0, rt, rd, imm, 0x03);
    case "sllv": return encodeRFormatWord(rs, rt, rd, 0, 0x04);
    case "srlv": return encodeRFormatWord(rs, rt, rd, 0, 0x06);
    case "srav": return encodeRFormatWord(rs, rt, rd, 0, 0x07);
    case "mult": return encodeRFormatWord(rs, rt, 0, 0, 0x18);
    case "multu": return encodeRFormatWord(rs, rt, 0, 0, 0x19);
    case "div": return encodeRFormatWord(rs, rt, 0, 0, 0x1a);
    case "divu": return encodeRFormatWord(rs, rt, 0, 0, 0x1b);
    case "mfhi": return encodeRFormatWord(0, 0, rd, 0, 0x10);
    case "mflo": return encodeRFormatWord(0, 0, rd, 0, 0x12);
    case "mthi": return encodeRFormatWord(rs, 0, 0, 0, 0x11);
    case "mtlo": return encodeRFormatWord(rs, 0, 0, 0, 0x13);
    case "jr": return encodeRFormatWord(rs, 0, 0, 0, 0x08);
    case "jalr": return encodeRFormatWord(rs, 0, rd, 0, 0x09);
    case "teq": return encodeRFormatWord(rs, rt, 0, 0, 0x34);
    case "tne": return encodeRFormatWord(rs, rt, 0, 0, 0x36);
    case "tge": return encodeRFormatWord(rs, rt, 0, 0, 0x30);
    case "tgeu": return encodeRFormatWord(rs, rt, 0, 0, 0x31);
    case "tlt": return encodeRFormatWord(rs, rt, 0, 0, 0x32);
    case "tltu": return encodeRFormatWord(rs, rt, 0, 0, 0x33);
    case "movf": return encodeRFormatWord(rs, ((cc & 0x7) << 2), rd, 0, 0x01);
    case "movt": return encodeRFormatWord(rs, ((cc & 0x7) << 2) | 0x1, rd, 0, 0x01);

    case "addi": return encodeIFormatWord(0x08, rs, rt, imm);
    case "addiu": return encodeIFormatWord(0x09, rs, rt, imm);
    case "andi": return encodeIFormatWord(0x0c, rs, rt, imm);
    case "ori": return encodeIFormatWord(0x0d, rs, rt, imm);
    case "xori": return encodeIFormatWord(0x0e, rs, rt, imm);
    case "slti": return encodeIFormatWord(0x0a, rs, rt, imm);
    case "sltiu": return encodeIFormatWord(0x0b, rs, rt, imm);
    case "lui": return encodeIFormatWord(0x0f, 0, rt, imm);
    case "lw": return encodeIFormatWord(0x23, base, rt, imm);
    case "sw": return encodeIFormatWord(0x2b, base, rt, imm);
    case "lb": return encodeIFormatWord(0x20, base, rt, imm);
    case "lbu": return encodeIFormatWord(0x24, base, rt, imm);
    case "sb": return encodeIFormatWord(0x28, base, rt, imm);
    case "lh": return encodeIFormatWord(0x21, base, rt, imm);
    case "lhu": return encodeIFormatWord(0x25, base, rt, imm);
    case "sh": return encodeIFormatWord(0x29, base, rt, imm);
    case "ll": return encodeIFormatWord(0x30, base, rt, imm);
    case "sc": return encodeIFormatWord(0x38, base, rt, imm);
    case "lwl": return encodeIFormatWord(0x22, base, rt, imm);
    case "lwr": return encodeIFormatWord(0x26, base, rt, imm);
    case "swl": return encodeIFormatWord(0x2a, base, rt, imm);
    case "swr": return encodeIFormatWord(0x2e, base, rt, imm);
    case "beq": return encodeIFormatWord(0x04, rs, rt, computeBranchImmediateField(address, target));
    case "bne": return encodeIFormatWord(0x05, rs, rt, computeBranchImmediateField(address, target));
    case "bgtz": return encodeIFormatWord(0x07, rs, 0, computeBranchImmediateField(address, target));
    case "blez": return encodeIFormatWord(0x06, rs, 0, computeBranchImmediateField(address, target));
    case "bltz": return encodeIFormatWord(0x01, rs, 0x00, computeBranchImmediateField(address, target));
    case "bgez": return encodeIFormatWord(0x01, rs, 0x01, computeBranchImmediateField(address, target));
    case "bltzal": return encodeIFormatWord(0x01, rs, 0x10, computeBranchImmediateField(address, target));
    case "bgezal": return encodeIFormatWord(0x01, rs, 0x11, computeBranchImmediateField(address, target));
    case "teqi": return encodeIFormatWord(0x01, rs, 0x0c, imm);
    case "tnei": return encodeIFormatWord(0x01, rs, 0x0e, imm);
    case "tgei": return encodeIFormatWord(0x01, rs, 0x08, imm);
    case "tgeiu": return encodeIFormatWord(0x01, rs, 0x09, imm);
    case "tlti": return encodeIFormatWord(0x01, rs, 0x0a, imm);
    case "tltiu": return encodeIFormatWord(0x01, rs, 0x0b, imm);
    case "mfc0": return encodeCopMoveWord(0x10, 0x00, rt, rd);
    case "mtc0": return encodeCopMoveWord(0x10, 0x04, rt, rd);
    case "mfc1": return encodeCopMoveWord(0x11, 0x00, rt, fs);
    case "mtc1": return encodeCopMoveWord(0x11, 0x04, rt, fs);
    case "cfc1": return encodeCopMoveWord(0x11, 0x02, rt, fs);
    case "ctc1": return encodeCopMoveWord(0x11, 0x06, rt, fs);
    case "lwc1": return encodeIFormatWord(0x31, base, fs, imm);
    case "swc1": return encodeIFormatWord(0x39, base, fs, imm);
    case "ldc1": return encodeIFormatWord(0x35, base, fs, imm);
    case "sdc1": return encodeIFormatWord(0x3d, base, fs, imm);
    case "bc1f": return encodeIFormatWord(0x11, 0x08, ((cc & 0x7) << 2), computeBranchImmediateField(address, target));
    case "bc1t": return encodeIFormatWord(0x11, 0x08, ((cc & 0x7) << 2) | 0x1, computeBranchImmediateField(address, target));
    case "j": return encodeJFormatWord(0x02, target);
    case "jal": return encodeJFormatWord(0x03, target);
    case "mul": return (((0x1c << 26) | ((rs & 0x1f) << 21) | ((rt & 0x1f) << 16) | ((rd & 0x1f) << 11) | 0x02) >>> 0);
    case "madd": return (((0x1c << 26) | ((rs & 0x1f) << 21) | ((rt & 0x1f) << 16) | 0x00) >>> 0);
    case "maddu": return (((0x1c << 26) | ((rs & 0x1f) << 21) | ((rt & 0x1f) << 16) | 0x01) >>> 0);
    case "msub": return (((0x1c << 26) | ((rs & 0x1f) << 21) | ((rt & 0x1f) << 16) | 0x04) >>> 0);
    case "msubu": return (((0x1c << 26) | ((rs & 0x1f) << 21) | ((rt & 0x1f) << 16) | 0x05) >>> 0);
    case "clz": return (((0x1c << 26) | ((rs & 0x1f) << 21) | ((rd & 0x1f) << 11) | 0x20) >>> 0);
    case "clo": return (((0x1c << 26) | ((rs & 0x1f) << 21) | ((rd & 0x1f) << 11) | 0x21) >>> 0);
    default: {
      const fmt = opcode.endsWith(".s") ? 0x10
        : opcode.endsWith(".d") ? 0x11
        : null;
      const arithmeticFunct = {
        add: 0x00,
        sub: 0x01,
        mul: 0x02,
        div: 0x03
      }[opcode.split(".")[0]];
      if (fmt !== null && arithmeticFunct != null) {
        return encodeCop1FunctionWord(fmt, ft, fs, fd, arithmeticFunct);
      }

      const unaryFunct = {
        sqrt: 0x04,
        abs: 0x05,
        mov: 0x06,
        neg: 0x07
      }[opcode.split(".")[0]];
      if (fmt !== null && unaryFunct != null) {
        return encodeCop1FunctionWord(fmt, 0, fs, fd, unaryFunct);
      }

      if (fmt !== null && (opcode.startsWith("movf.") || opcode.startsWith("movt."))) {
        const conditionField = ((cc & 0x7) << 2) | (opcode.startsWith("movt.") ? 1 : 0);
        return encodeCop1FunctionWord(fmt, conditionField, fs, fd, 0x11);
      }
      if (fmt !== null && (opcode.startsWith("movz.") || opcode.startsWith("movn."))) {
        return encodeCop1FunctionWord(fmt, rt, fs, fd, opcode.startsWith("movn.") ? 0x13 : 0x12);
      }

      const compareFunct = opcode.startsWith("c.eq.") ? 0x32
        : opcode.startsWith("c.lt.") ? 0x3c
        : opcode.startsWith("c.le.") ? 0x3e
        : null;
      if (fmt !== null && compareFunct !== null) {
        return encodeCop1FunctionWord(fmt, ft, fs, (cc & 0x7) << 2, compareFunct);
      }

      const conversionMatch = /^(cvt|round|trunc|ceil|floor)\.([sdw])\.([sdw])$/.exec(opcode);
      if (conversionMatch) {
        const [, operation, destinationKind, sourceKind] = conversionMatch;
        const sourceFmt = sourceKind === "s" ? 0x10 : sourceKind === "d" ? 0x11 : 0x14;
        const funct = operation === "cvt"
          ? (destinationKind === "s" ? 0x20 : destinationKind === "d" ? 0x21 : 0x24)
          : operation === "round" ? 0x0c
          : operation === "trunc" ? 0x0d
          : operation === "ceil" ? 0x0e
          : 0x0f;
        return encodeCop1FunctionWord(sourceFmt, 0, fs, fd, funct);
      }
      return null;
    }
  }
}

function decodeInstructionWordToStatement(machineWord, address) {
  const word = machineWord >>> 0;
  const pc = address >>> 0;
  const opcode = word >>> 26;
  const rs = (word >>> 21) & 0x1f;
  const rt = (word >>> 16) & 0x1f;
  const rd = (word >>> 11) & 0x1f;
  const shamt = (word >>> 6) & 0x1f;
  const funct = word & 0x3f;
  const signedImmediate = signExtend16(word & 0xffff);
  const unsignedImmediate = word & 0xffff;
  const gpr = (index) => `$${index & 0x1f}`;
  const fpr = (index) => `$f${index & 0x1f}`;
  const memory = `${signedImmediate}(${gpr(rs)})`;
  const branch = (name, operands) => `${name} ${operands.join(", ")}, ${signedImmediate}`;

  if (opcode === 0) {
    if (word === 0) return "nop";
    const r3 = {
      0x20: "add",
      0x21: "addu",
      0x22: "sub",
      0x23: "subu",
      0x24: "and",
      0x25: "or",
      0x26: "xor",
      0x27: "nor",
      0x2a: "slt",
      0x2b: "sltu",
      0x0a: "movz",
      0x0b: "movn"
    }[funct];
    if (r3) return `${r3} ${gpr(rd)}, ${gpr(rs)}, ${gpr(rt)}`;
    const shifts = { 0x00: "sll", 0x02: "srl", 0x03: "sra" }[funct];
    if (shifts) return `${shifts} ${gpr(rd)}, ${gpr(rt)}, ${shamt}`;
    const variableShifts = { 0x04: "sllv", 0x06: "srlv", 0x07: "srav" }[funct];
    if (variableShifts) return `${variableShifts} ${gpr(rd)}, ${gpr(rt)}, ${gpr(rs)}`;
    if (funct === 0x01) {
      const cc = (rt >>> 2) & 0x7;
      return `${(rt & 1) === 1 ? "movt" : "movf"} ${gpr(rd)}, ${gpr(rs)}, ${cc}`;
    }
    if (funct === 0x08) return `jr ${gpr(rs)}`;
    if (funct === 0x09) return `jalr ${gpr(rd)}, ${gpr(rs)}`;
    if (funct === 0x0c) return "syscall";
    if (funct === 0x0d) return `break ${(word >>> 6) & 0xfffff}`;
    if (funct === 0x10) return `mfhi ${gpr(rd)}`;
    if (funct === 0x11) return `mthi ${gpr(rs)}`;
    if (funct === 0x12) return `mflo ${gpr(rd)}`;
    if (funct === 0x13) return `mtlo ${gpr(rs)}`;
    const multiply = { 0x18: "mult", 0x19: "multu", 0x1a: "div", 0x1b: "divu" }[funct];
    if (multiply) return `${multiply} ${gpr(rs)}, ${gpr(rt)}`;
    const trap = { 0x30: "tge", 0x31: "tgeu", 0x32: "tlt", 0x33: "tltu", 0x34: "teq", 0x36: "tne" }[funct];
    if (trap) return `${trap} ${gpr(rs)}, ${gpr(rt)}`;
    return null;
  }

  if (opcode === 0x1c) {
    const special2Pair = { 0x00: "madd", 0x01: "maddu", 0x04: "msub", 0x05: "msubu" }[funct];
    if (special2Pair) return `${special2Pair} ${gpr(rs)}, ${gpr(rt)}`;
    if (funct === 0x02) return `mul ${gpr(rd)}, ${gpr(rs)}, ${gpr(rt)}`;
    if (funct === 0x20 || funct === 0x21) return `${funct === 0x20 ? "clz" : "clo"} ${gpr(rd)}, ${gpr(rs)}`;
    return null;
  }

  if (opcode === 0x01) {
    const regimmBranch = {
      0x00: "bltz",
      0x01: "bgez",
      0x10: "bltzal",
      0x11: "bgezal"
    }[rt];
    if (regimmBranch) return branch(regimmBranch, [gpr(rs)]);
    const regimmTrap = {
      0x08: "tgei",
      0x09: "tgeiu",
      0x0a: "tlti",
      0x0b: "tltiu",
      0x0c: "teqi",
      0x0e: "tnei"
    }[rt];
    if (regimmTrap) return `${regimmTrap} ${gpr(rs)}, ${signedImmediate}`;
    return null;
  }

  const immediateOps = {
    0x08: "addi",
    0x09: "addiu",
    0x0a: "slti",
    0x0b: "sltiu"
  };
  if (immediateOps[opcode]) return `${immediateOps[opcode]} ${gpr(rt)}, ${gpr(rs)}, ${signedImmediate}`;
  const logicalImmediateOps = { 0x0c: "andi", 0x0d: "ori", 0x0e: "xori" };
  if (logicalImmediateOps[opcode]) return `${logicalImmediateOps[opcode]} ${gpr(rt)}, ${gpr(rs)}, ${unsignedImmediate}`;
  if (opcode === 0x0f) return `lui ${gpr(rt)}, ${unsignedImmediate}`;
  if (opcode === 0x04) return branch("beq", [gpr(rs), gpr(rt)]);
  if (opcode === 0x05) return branch("bne", [gpr(rs), gpr(rt)]);
  if (opcode === 0x06) return branch("blez", [gpr(rs)]);
  if (opcode === 0x07) return branch("bgtz", [gpr(rs)]);

  if (opcode === 0x02 || opcode === 0x03) {
    const target = ((((pc + 4) >>> 0) & 0xf0000000) | ((word & 0x03ffffff) << 2)) >>> 0;
    return `${opcode === 0x02 ? "j" : "jal"} ${toHex(target)}`;
  }

  const memoryOps = {
    0x20: "lb",
    0x21: "lh",
    0x22: "lwl",
    0x23: "lw",
    0x24: "lbu",
    0x25: "lhu",
    0x26: "lwr",
    0x28: "sb",
    0x29: "sh",
    0x2a: "swl",
    0x2b: "sw",
    0x2e: "swr",
    0x30: "ll",
    0x38: "sc"
  };
  if (memoryOps[opcode]) return `${memoryOps[opcode]} ${gpr(rt)}, ${memory}`;
  const fpuMemoryOps = { 0x31: "lwc1", 0x35: "ldc1", 0x39: "swc1", 0x3d: "sdc1" };
  if (fpuMemoryOps[opcode]) return `${fpuMemoryOps[opcode]} ${fpr(rt)}, ${memory}`;

  if (opcode === 0x10) {
    if (word === 0x42000018) return "eret";
    if (rs === 0x00) return `mfc0 ${gpr(rt)}, $${rd}`;
    if (rs === 0x04) return `mtc0 ${gpr(rt)}, $${rd}`;
    return null;
  }

  if (opcode !== 0x11) return null;
  if (rs === 0x00) return `mfc1 ${gpr(rt)}, ${fpr(rd)}`;
  if (rs === 0x02) return `cfc1 ${gpr(rt)}, $${rd}`;
  if (rs === 0x04) return `mtc1 ${gpr(rt)}, ${fpr(rd)}`;
  if (rs === 0x06) return `ctc1 ${gpr(rt)}, $${rd}`;
  if (rs === 0x08) {
    const cc = (rt >>> 2) & 0x7;
    const name = (rt & 1) === 1 ? "bc1t" : "bc1f";
    return `${name} ${cc}, ${signedImmediate}`;
  }

  const kind = rs === 0x10 ? "s" : rs === 0x11 ? "d" : rs === 0x14 ? "w" : null;
  if (!kind) return null;
  const fd = (word >>> 6) & 0x1f;
  const arithmetic = { 0x00: "add", 0x01: "sub", 0x02: "mul", 0x03: "div" }[funct];
  if (arithmetic && kind !== "w") return `${arithmetic}.${kind} ${fpr(fd)}, ${fpr(rd)}, ${fpr(rt)}`;
  const unary = { 0x04: "sqrt", 0x05: "abs", 0x06: "mov", 0x07: "neg" }[funct];
  if (unary && kind !== "w") return `${unary}.${kind} ${fpr(fd)}, ${fpr(rd)}`;
  if (funct === 0x11 && kind !== "w") {
    const cc = (rt >>> 2) & 0x7;
    return `${(rt & 1) === 1 ? "movt" : "movf"}.${kind} ${fpr(fd)}, ${fpr(rd)}, ${cc}`;
  }
  if ((funct === 0x12 || funct === 0x13) && kind !== "w") {
    return `${funct === 0x13 ? "movn" : "movz"}.${kind} ${fpr(fd)}, ${fpr(rd)}, ${gpr(rt)}`;
  }
  if ([0x32, 0x3c, 0x3e].includes(funct) && kind !== "w") {
    const comparison = funct === 0x32 ? "c.eq" : funct === 0x3c ? "c.lt" : "c.le";
    const cc = (fd >>> 2) & 0x7;
    return `${comparison}.${kind} ${cc}, ${fpr(rd)}, ${fpr(rt)}`;
  }

  const conversion = funct === 0x20 ? "cvt.s"
    : funct === 0x21 ? "cvt.d"
    : funct === 0x24 ? "cvt.w"
    : funct === 0x0c ? "round.w"
    : funct === 0x0d ? "trunc.w"
    : funct === 0x0e ? "ceil.w"
    : funct === 0x0f ? "floor.w"
    : null;
  if (conversion) return `${conversion}.${kind} ${fpr(fd)}, ${fpr(rd)}`;
  return null;
}

function predictAlignedDataLabelAddress(state, statement) {
  if (!state || (state.segment !== "data" && state.segment !== "kdata")) return null;
  const effectiveStatement = String(statement ?? "").trim();
  const colonIndex = effectiveStatement.indexOf(":");
  const directiveSource = colonIndex >= 0
    ? effectiveStatement.slice(colonIndex + 1).trim()
    : effectiveStatement;
  const explicitDirective = directiveSource.startsWith(".")
    ? String(directiveSource.split(/\s+/)[0] || "").toLowerCase()
    : String(state.currentDataDirective || ".word").toLowerCase();
  const scalarAlignment = explicitDirective === ".half" ? 2
    : explicitDirective === ".word" || explicitDirective === ".float" ? 4
    : explicitDirective === ".double" ? 8
    : 0;
  if (!scalarAlignment) {
    return state.segment === "kdata" ? (state.kernelDataAddress >>> 0) : (state.dataAddress >>> 0);
  }
  const autoAlign = state.segment === "kdata" ? state.autoAlignKernelData !== false : state.autoAlignData !== false;
  const baseAddress = state.segment === "kdata" ? (state.kernelDataAddress >>> 0) : (state.dataAddress >>> 0);
  if (!autoAlign) return baseAddress;
  return ((baseAddress + scalarAlignment - 1) & ~(scalarAlignment - 1)) >>> 0;
}

function getReferenceSyscallMatrix() {
  const referenceData = getReferenceDataStore();
  return Array.isArray(referenceData?.syscallMatrix) ? referenceData.syscallMatrix : [];
}

const MANUAL_PSEUDO_EXPANSION_OPS = new Set([
  "nop", "move", "not", "abs", "neg", "negu",
  "li",
  "add", "addu", "sub", "subu", "subi", "subiu",
  "addi", "addiu", "andi", "ori", "xori",
  "and", "or", "xor",
  "b", "beqz", "bnez", "beq", "bne",
  "blt", "bltu", "bgt", "bgtu", "ble", "bleu", "bge", "bgeu",
  "div", "divu", "rem", "remu",
  "seq", "sne", "sgt", "sgtu", "sge", "sgeu", "sle", "sleu",
  "rol", "ror",
  "mul", "mulu", "mulo", "mulou",
  "mfc1.d", "mtc1.d",
  "l.s", "s.s", "l.d", "s.d",
  "ld", "sd",
  "lb", "lbu", "lh", "lhu", "lw", "ll", "lwc1", "ldc1",
  "sb", "sh", "sw", "sc", "swc1", "sdc1",
  "lwl", "lwr", "swl", "swr",
  "ulw", "usw", "ulh", "ulhu", "ush"
]);

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
    if (Math.abs(numericPattern) === 100000) {
      return !fitsPseudoSigned16(actualValue) && !fitsPseudoUnsigned16(actualValue);
    }
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

class MarsMemoryAccessError extends Error {
  constructor(message, accessKind, badAddress) {
    super(String(message ?? "Memory access error."));
    this.name = "MarsMemoryAccessError";
    this.memoryAccessKind = accessKind === "write" ? "write" : "read";
    this.badAddress = badAddress >>> 0;
  }
}

class MarsSyscallLimitError extends Error {
  constructor(message) {
    super(String(message ?? "Syscall resource limit exceeded."));
    this.name = "MarsSyscallLimitError";
  }
}

function normalizeMemoryAccessError(error, accessKind, badAddress) {
  if (
    error instanceof MarsMemoryAccessError
    || (error && typeof error === "object" && (error.memoryAccessKind === "read" || error.memoryAccessKind === "write"))
  ) {
    return error;
  }
  return new MarsMemoryAccessError(
    error instanceof Error ? error.message : String(error ?? "Memory access error."),
    accessKind,
    badAddress
  );
}

class MarsEngine {
  constructor({ settings, memoryMap }) {
    this.settings = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
    this.memoryMap = { ...DEFAULT_MEMORY_MAP, ...(memoryMap ?? {}) };
    this.backstepHistoryPolicy = null;
    this.runtimeHooks = {};
    this.memoryAccessObservers = new Set();
    this.instructionObservers = new Set();
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
    this.backstepHistoryPolicy = null;
    this.reset();
  }

  setSettings(settings = {}) {
    this.settings = { ...this.settings, ...(settings && typeof settings === "object" ? settings : {}) };
    this.backstepHistoryPolicy = null;
    this.trimExecutionHistory();
    return { ...this.settings };
  }

  registerMemoryObserver(observer = {}) {
    if (!observer || typeof observer !== "object") return () => {};
    const start = Number.isFinite(observer.start) ? (observer.start >>> 0) : 0;
    const end = Number.isFinite(observer.end) ? (observer.end >>> 0) : start;
    const entry = {
      start: Math.min(start, end) >>> 0,
      end: Math.max(start, end) >>> 0,
      onRead: typeof observer.onRead === "function" ? observer.onRead : null,
      onWrite: typeof observer.onWrite === "function" ? observer.onWrite : null
    };
    this.memoryAccessObservers.add(entry);
    return () => {
      this.memoryAccessObservers.delete(entry);
    };
  }

  registerInstructionObserver(observer) {
    const handler = typeof observer === "function"
      ? observer
      : (typeof observer?.afterInstruction === "function" ? observer.afterInstruction : null);
    if (!handler) return () => {};
    this.instructionObservers.add(handler);
    return () => {
      this.instructionObservers.delete(handler);
    };
  }

  notifyInstructionObservers(detail = {}) {
    if (!(this.instructionObservers instanceof Set) || this.instructionObservers.size === 0) return;
    this.instructionObservers.forEach((observer) => {
      try {
        observer({
          ...detail,
          steps: this.steps | 0,
          pc: this.pc >>> 0
        });
      } catch {
        // A device observer must never interrupt the simulated program.
      }
    });
  }

  notifyMemoryObservers(kind, address, size, value) {
    if (Array.isArray(this.activeRuntimeMemoryAccesses)) {
      const accessKind = kind === "write" ? "write" : "read";
      const accessAddress = address >>> 0;
      const accessSize = Math.max(1, size | 0);
      const previous = this.activeRuntimeMemoryAccesses[this.activeRuntimeMemoryAccesses.length - 1];
      const outsideMmio = accessAddress < (this.memoryMap.mmioBase >>> 0);
      const followsPrevious = previous
        && previous.kind === accessKind
        && previous.unitSize === accessSize
        && outsideMmio
        && previous.address < (this.memoryMap.mmioBase >>> 0)
        && (previous.address + previous.size) === accessAddress;
      if (followsPrevious) {
        previous.size += accessSize;
        previous.accessCount += 1;
        previous.value = value | 0;
      } else {
        this.activeRuntimeMemoryAccesses.push({
          kind: accessKind,
          address: accessAddress,
          size: accessSize,
          unitSize: accessSize,
          accessCount: 1,
          value: value | 0
        });
      }
    }
    if (!(this.memoryAccessObservers instanceof Set) || this.memoryAccessObservers.size === 0) return;
    const start = address >>> 0;
    const width = Math.max(1, size | 0);
    const end = (start + width - 1) >>> 0;
    this.memoryAccessObservers.forEach((observer) => {
      if (!observer) return;
      if (end < (observer.start >>> 0) || start > (observer.end >>> 0)) return;
      const handler = kind === "write" ? observer.onWrite : observer.onRead;
      if (typeof handler !== "function") return;
      try {
        handler({
          kind,
          address: start >>> 0,
          size: width,
          value: value | 0,
          steps: this.steps | 0
        });
      } catch {
        // Ignore observer failures to keep simulation stable.
      }
    });
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

  cloneArgsRegistry(source) {
    if (!Array.isArray(source)) return [];
    return source
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        kind: String(entry.kind || ""),
        name: String(entry.name || ""),
        address: Number.isFinite(entry.address) ? (entry.address >>> 0) : 0
      }));
  }

  cloneImageHandleMap(source) {
    const map = new Map();
    if (!(source instanceof Map)) return map;
    source.forEach((value, key) => {
      if (!value || typeof value !== "object") return;
      map.set(key | 0, {
        id: Number.isFinite(value.id) ? (value.id | 0) : (key | 0),
        width: Math.max(0, Number(value.width) | 0),
        height: Math.max(0, Number(value.height) | 0),
        dataAddress: Number.isFinite(value.dataAddress) ? (value.dataAddress >>> 0) : 0,
        path: value.path == null ? "" : String(value.path)
      });
    });
    return map;
  }

  reserveHeapBytes(byteCount = 0, alignment = 4) {
    const requestedSize = Number(byteCount);
    const requestedAlignment = Number(alignment);
    const size = Number.isFinite(requestedSize) ? Math.max(0, Math.floor(requestedSize)) : Number.POSITIVE_INFINITY;
    const align = Number.isFinite(requestedAlignment) ? Math.max(1, Math.floor(requestedAlignment)) : 1;
    const currentPointer = this.heapPointer >>> 0;
    const alignedPointer = Math.ceil(currentPointer / align) * align;
    const nextPointer = alignedPointer + size;
    if (
      !Number.isSafeInteger(size)
      || !Number.isSafeInteger(alignedPointer)
      || !Number.isSafeInteger(nextPointer)
      || alignedPointer > 0xffffffff
      || nextPointer > 0xffffffff
    ) {
      throw new Error(translateText("Heap address space exceeded."));
    }
    this.growHeapToChecked(nextPointer);
    return alignedPointer >>> 0;
  }

  allocateCString(text = "") {
    const normalized = String(text ?? "");
    this.assertBoundedSyscallLength(
      normalized.length,
      this.getSyscallStringLimitCharacters(),
      "string"
    );
    const payload = textToBytes(normalized);
    const address = this.reserveHeapBytes(payload.length + 1, 4);
    for (let i = 0; i < payload.length; i += 1) this.setByte((address + i) >>> 0, payload[i]);
    this.setByte((address + payload.length) >>> 0, 0);
    return address >>> 0;
  }

  allocateScalarWord(value = 0) {
    const address = this.reserveHeapBytes(4, 4);
    this.writeWord(address, value | 0);
    return address >>> 0;
  }

  allocateWordArray(values = []) {
    const items = Array.isArray(values) ? values : [];
    this.assertBoundedSyscallLength(
      items.length,
      this.getSyscallArrayLimitElements(),
      "array"
    );
    const baseAddress = this.reserveHeapBytes(4 + (items.length * 4), 4);
    this.writeWord(baseAddress, items.length | 0);
    for (let i = 0; i < items.length; i += 1) {
      this.writeWord((baseAddress + 4 + (i * 4)) >>> 0, items[i] | 0);
    }
    return (baseAddress + 4) >>> 0;
  }

  getArrayLength(address) {
    const ptr = address >>> 0;
    if (ptr === 0) return 0;
    return this.readWord((ptr - 4) >>> 0) | 0;
  }

  readArrayWords(address, explicitLength = null) {
    const ptr = address >>> 0;
    const requestedLength = explicitLength == null ? this.getArrayLength(ptr) : Number(explicitLength);
    const length = this.assertBoundedSyscallLength(
      Math.max(0, requestedLength),
      this.getSyscallArrayLimitElements(),
      "array"
    );
    this.assertBoundedSyscallAddressRange(ptr, length * 4, "array");
    const values = [];
    for (let i = 0; i < length; i += 1) {
      values.push(this.readWord((ptr + (i * 4)) >>> 0) | 0);
    }
    return values;
  }

  readStackArgument(wordIndex = 0) {
    const index = Math.max(0, Number(wordIndex) | 0);
    return this.readWord(((this.registers[29] >>> 0) + (index * 4)) >>> 0) | 0;
  }

  createImageHandle(width, height, dataAddress, path = "") {
    const dimensions = this.getBoundedImageDimensions(width, height, "image");
    this.markImageHandlesDirty();
    const handle = (0x60000000 + (this.nextImageHandleId | 0)) | 0;
    this.nextImageHandleId = (this.nextImageHandleId + 1) | 0;
    this.imageHandles.set(handle, {
      id: handle,
      width: dimensions.width,
      height: dimensions.height,
      dataAddress: dataAddress >>> 0,
      path: String(path || "")
    });
    return handle | 0;
  }

  getImageHandle(handleValue) {
    return this.imageHandles.get(handleValue | 0) || null;
  }

  readImagePixels(handleValue) {
    const handle = this.getImageHandle(handleValue);
    if (!handle) return [];
    const dimensions = this.getBoundedImageDimensions(handle.width, handle.height, "image");
    return this.readArrayWords(handle.dataAddress, dimensions.pixelCount);
  }

  serializeImageHandle(handleValue) {
    const handle = this.getImageHandle(handleValue);
    if (!handle) return null;
    return {
      kind: "webmars-image-v1",
      width: handle.width | 0,
      height: handle.height | 0,
      data: this.readImagePixels(handleValue).map((entry) => entry | 0)
    };
  }

  loadVirtualFileSystemFromStorage() {
    if (typeof window === "undefined") return new Map();
    try {
      const storage = window.localStorage;
      if (!storage) return new Map();
      const raw = storage.getItem(VFS_STORAGE_KEY);
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
    const rollback = () => {
      this.virtualFileSystem = this.cloneVirtualFileSystemMap(this.persistentVirtualFileSystem);
      return false;
    };
    if (!this.isVirtualFileSystemWithinStorageLimit(this.virtualFileSystem)) return rollback();

    let candidate;
    try {
      candidate = this.cloneVirtualFileSystemMap(this.virtualFileSystem);
      if (typeof window === "undefined") {
        this.persistentVirtualFileSystem = candidate;
        return true;
      }
      const storage = window.localStorage;
      if (!storage) return rollback();
      const payload = {};
      candidate.forEach((bytes, name) => {
        payload[name] = { hex: bytesToStorageHex(bytes) };
      });
      storage.setItem(VFS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      return rollback();
    }
    this.persistentVirtualFileSystem = candidate;
    return true;
  }

  getVirtualFileBytes(name) {
    const key = String(name ?? "");
    if (!this.virtualFileSystem.has(key)) return null;
    const bytes = this.virtualFileSystem.get(key);
    const length = this.getByteArrayLength(bytes);
    if (length === null || length > this.getSyscallBufferLimitBytes()) return null;
    return cloneByteArray(bytes);
  }

  setVirtualFileBytes(name, bytes) {
    const key = String(name ?? "");
    const sourceLength = this.getByteArrayLength(bytes);
    if (
      sourceLength === null
      || sourceLength > this.getSyscallBufferLimitBytes()
      || !this.isProjectedVirtualFileSystemWithinStorageLimit(key, sourceLength)
    ) {
      return false;
    }
    let payload;
    try {
      payload = cloneByteArray(bytes);
    } catch {
      return false;
    }
    this.markVirtualFileSystemDirty();
    this.virtualFileSystem.set(key, payload);
    return this.persistVirtualFileSystemToStorage();
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
    this.fpuControlStatus = 0;

    this.memoryBytes = new Map();
    this.memoryWords = new Map();
    this.reservedHeapMappedBytes = 0;
    this.breakpoints = new Set();
    this.decodedInstructionCache = new Map();
    this.executionHistory = new BackstepJournalBuffer();
    this.executionHistoryBytes = 0;
    this.activeHistoryJournal = null;
    this.activeRuntimeMemoryAccesses = null;

    this.heapPointer = this.memoryMap.heapBase >>> 0;
    this.randomStreams = new Map();
    this.delayedBranchTarget = null;
    this.llReservationAddress = null;
    this.breakpointResumeAddress = null;
    this.lastMemoryWriteAddress = null;

    this.openFiles = this.createStdioOpenFileTable();
    this.virtualFileSystem = this.cloneVirtualFileSystemMap(this.persistentVirtualFileSystem);
    this.stdinClosed = false;
    this.argsRegistry = [];
    this.lastProgramArguments = [];
    this.imageHandles = new Map();
    this.nextImageHandleId = 1;

    this.program = {
      source: "",
      textRows: [],
      textRowByAddress: new Map(),
      labels: new Map(),
      warnings: [],
      errors: []
    };
  }

  applyUndoPairs(target, pairs) {
    if (!target || !Array.isArray(pairs)) return;
    for (let offset = 0; offset + 1 < pairs.length; offset += 2) {
      const index = pairs[offset] | 0;
      if (index < 0 || index >= target.length) continue;
      target[index] = pairs[offset + 1] | 0;
    }
  }

  createRuntimeChangeTriples(undoPairs, currentValues) {
    if (!Array.isArray(undoPairs) || !currentValues || undoPairs.length === 0) {
      return [];
    }
    const triples = new Array((undoPairs.length / 2) * 3);
    let targetOffset = 0;
    for (let offset = 0; offset + 1 < undoPairs.length; offset += 2) {
      const index = undoPairs[offset] | 0;
      triples[targetOffset] = index;
      triples[targetOffset + 1] = undoPairs[offset + 1] | 0;
      triples[targetOffset + 2] = index >= 0 && index < currentValues.length
        ? (currentValues[index] | 0)
        : 0;
      targetOffset += 3;
    }
    return triples;
  }

  createRuntimeEvent(journal, details = {}) {
    if (!journal || typeof journal !== "object") return null;
    return {
      type: "instruction",
      stepBefore: journal.s | 0,
      stepAfter: this.steps | 0,
      pcBefore: journal.p >>> 0,
      pcAfter: this.pc >>> 0,
      executedAddress: Number.isFinite(details.executedAddress) ? (details.executedAddress >>> 0) : (journal.p >>> 0),
      executedInstruction: String(details.executedInstruction || ""),
      machineWord: Number.isFinite(details.machineWord) ? (details.machineWord >>> 0) : null,
      controlTransferTarget: Number.isFinite(details.controlTransferTarget)
        ? (details.controlTransferTarget >>> 0)
        : null,
      registerChanges: this.createRuntimeChangeTriples(journal.r, this.registers),
      cop0Changes: this.createRuntimeChangeTriples(journal.c0, this.cop0Registers),
      cop1Changes: this.createRuntimeChangeTriples(journal.c1, this.cop1Registers),
      fpuFlagChanges: this.createRuntimeChangeTriples(journal.ff, this.fpuConditionFlags),
      memoryAccesses: Array.isArray(details.memoryAccesses)
        ? details.memoryAccesses.map((access) => ({
            kind: access?.kind === "write" ? "write" : "read",
            address: Number(access?.address) >>> 0,
            size: Math.max(1, Number(access?.size) | 0),
            unitSize: Math.max(1, Number(access?.unitSize) | 0),
            accessCount: Math.max(1, Number(access?.accessCount) | 0),
            value: Number(access?.value) | 0
          }))
        : [],
      lastMemoryWriteAddress: this.lastMemoryWriteAddress == null ? null : (this.lastMemoryWriteAddress >>> 0),
      exception: details.exception === true,
      halted: this.halted === true,
      haltReason: details.haltReason ?? null,
      backstepDepth: this.executionHistory.length,
      historyStartStep: this.getBackstepHistoryStartStep()
    };
  }

  recordIndexedUndo(key, target, index) {
    const journal = this.activeHistoryJournal;
    const normalizedIndex = index | 0;
    if (!journal || !target || normalizedIndex < 0 || normalizedIndex >= target.length) return;
    let pairs = journal[key];
    if (!Array.isArray(pairs)) {
      pairs = [];
      journal[key] = pairs;
    } else {
      for (let offset = 0; offset + 1 < pairs.length; offset += 2) {
        if ((pairs[offset] | 0) === normalizedIndex) return;
      }
    }
    pairs.push(normalizedIndex, target[normalizedIndex] | 0);
  }

  setRegisterValue(index, value) {
    const normalizedIndex = index | 0;
    if (normalizedIndex < 0 || normalizedIndex >= this.registers.length) return;
    const next = clamp32(value);
    if ((this.registers[normalizedIndex] | 0) === next) return;
    this.recordIndexedUndo("r", this.registers, normalizedIndex);
    this.registers[normalizedIndex] = next;
  }

  setCop0Value(index, value) {
    const normalizedIndex = index | 0;
    if (normalizedIndex < 0 || normalizedIndex >= this.cop0Registers.length) return;
    const next = clamp32(value);
    if ((this.cop0Registers[normalizedIndex] | 0) === next) return;
    this.recordIndexedUndo("c0", this.cop0Registers, normalizedIndex);
    this.cop0Registers[normalizedIndex] = next;
  }

  setCop1Value(index, value) {
    const normalizedIndex = index | 0;
    if (normalizedIndex < 0 || normalizedIndex >= this.cop1Registers.length) return;
    const next = clamp32(value);
    if ((this.cop1Registers[normalizedIndex] | 0) === next) return;
    this.recordIndexedUndo("c1", this.cop1Registers, normalizedIndex);
    this.cop1Registers[normalizedIndex] = next;
  }

  setFpuFlagValue(index, value) {
    const normalizedIndex = index | 0;
    if (normalizedIndex < 0 || normalizedIndex >= this.fpuConditionFlags.length) return;
    const next = value ? 1 : 0;
    if ((this.fpuConditionFlags[normalizedIndex] | 0) === next) return;
    this.recordIndexedUndo("ff", this.fpuConditionFlags, normalizedIndex);
    this.fpuConditionFlags[normalizedIndex] = next;
  }

  captureState(options = {}) {
    const captureMemory = options.captureMemory === true;
    const memoryBudgetBytes = Number(options.memoryBudgetBytes);
    return {
      pc: this.pc >>> 0,
      steps: this.steps,
      halted: this.halted,
      r: null,
      c0: null,
      c1: null,
      ff: null,
      captureResources: captureMemory,
      fpuControlStatus: this.getFpuControlStatus(),
      heapPointer: this.heapPointer >>> 0,
      reservedHeapMappedBytes: this.reservedHeapMappedBytes,
      delayedBranchTarget: this.delayedBranchTarget == null ? null : (this.delayedBranchTarget >>> 0),
      llReservationAddress: this.llReservationAddress == null ? null : (this.llReservationAddress >>> 0),
      lastMemoryWriteAddress: this.lastMemoryWriteAddress == null ? null : (this.lastMemoryWriteAddress >>> 0),
      memoryChanges: captureMemory
        ? new BackstepMemoryJournal(
            Number.isFinite(memoryBudgetBytes)
              ? Math.max(0, Math.floor(memoryBudgetBytes) - 512)
              : 0
          )
        : null,
      openFiles: null,
      virtualFileSystem: null,
      randomStreams: null,
      stdinClosed: this.stdinClosed === true,
      argsRegistry: null,
      imageHandles: null,
      nextImageHandleId: this.nextImageHandleId | 0,
      estimatedBytes: 0
    };
  }

  finalizeCapturedState(state) {
    if (!state || typeof state !== "object") return null;
    const journal = {
      p: state.pc >>> 0,
      s: state.steps | 0
    };
    if (Array.isArray(state.r) && state.r.length) journal.r = state.r;
    if (Array.isArray(state.c0) && state.c0.length) journal.c0 = state.c0;
    if (Array.isArray(state.c1) && state.c1.length) journal.c1 = state.c1;
    if (Array.isArray(state.ff) && state.ff.length) journal.ff = state.ff;
    if (state.memoryChanges instanceof BackstepMemoryJournal) {
      if (state.memoryChanges.overflow) journal.overflow = true;
      const changes = state.memoryChanges.compact();
      if (changes) journal.m = changes;
    }
    if (state.halted !== this.halted) journal.h = state.halted === true;
    if ((state.fpuControlStatus | 0) !== (this.getFpuControlStatus() | 0)) journal.fc = state.fpuControlStatus | 0;
    if ((state.heapPointer >>> 0) !== (this.heapPointer >>> 0)) journal.hp = state.heapPointer >>> 0;
    if (Number(state.reservedHeapMappedBytes) !== Number(this.reservedHeapMappedBytes)) {
      journal.hm = Number(state.reservedHeapMappedBytes);
    }
    if (state.delayedBranchTarget !== this.delayedBranchTarget) journal.db = state.delayedBranchTarget;
    if (state.llReservationAddress !== this.llReservationAddress) journal.ll = state.llReservationAddress;
    if (state.lastMemoryWriteAddress !== this.lastMemoryWriteAddress) journal.mw = state.lastMemoryWriteAddress;
    if (state.stdinClosed !== this.stdinClosed) journal.si = state.stdinClosed === true;
    if ((state.nextImageHandleId | 0) !== (this.nextImageHandleId | 0)) journal.ni = state.nextImageHandleId | 0;
    if (state.openFiles instanceof Map) journal.of = state.openFiles;
    if (state.virtualFileSystem instanceof Map) journal.vf = state.virtualFileSystem;
    if (state.randomStreams instanceof Map) journal.rs = state.randomStreams;
    if (Array.isArray(state.argsRegistry)) journal.ar = state.argsRegistry;
    if (state.imageHandles instanceof Map) journal.ih = state.imageHandles;
    journal.estimatedBytes = this.estimateCapturedStateBytes(journal);
    return journal;
  }

  restoreState(state) {
    this.pc = state.p >>> 0;
    this.steps = state.s | 0;
    if (Object.hasOwn(state, "h")) this.halted = state.h === true;
    this.applyUndoPairs(this.registers, state.r);
    this.applyUndoPairs(this.cop0Registers, state.c0);
    this.applyUndoPairs(this.cop1Registers, state.c1);
    this.applyUndoPairs(this.fpuConditionFlags, state.ff);
    if (Object.hasOwn(state, "fc")) this.fpuControlStatus = clamp32(state.fc);
    if (Object.hasOwn(state, "hp")) this.heapPointer = state.hp >>> 0;
    this.activeHistoryJournal = null;
    this.activeRuntimeMemoryAccesses = null;

    if (state.rs instanceof Map) {
      this.randomStreams = new Map(state.rs);
    }

    if (state.of instanceof Map) {
      const restoredOpen = this.cloneOpenFilesTable(state.of);
      const stdio = this.createStdioOpenFileTable();
      stdio.forEach((entry, fd) => {
        if (!restoredOpen.has(fd)) restoredOpen.set(fd, entry);
      });
      this.openFiles = restoredOpen;
    }

    if (state.vf instanceof Map) {
      this.virtualFileSystem = this.cloneVirtualFileSystemMap(state.vf);
      this.persistVirtualFileSystemToStorage();
    }
    if (Object.hasOwn(state, "si")) this.stdinClosed = state.si === true;
    if (Array.isArray(state.ar)) {
      this.argsRegistry = this.cloneArgsRegistry(state.ar);
    }
    if (state.ih instanceof Map) {
      this.imageHandles = this.cloneImageHandleMap(state.ih);
    }
    if (Object.hasOwn(state, "ni")) this.nextImageHandleId = Math.max(1, Number(state.ni) | 0);

    const memoryChanges = Array.isArray(state.m) ? state.m : [];
    if (memoryChanges.length) {
      const dirtyWords = new Set();
      for (let offset = 0; offset + 1 < memoryChanges.length; offset += 2) {
        const start = memoryChanges[offset] >>> 0;
        const bytes = memoryChanges[offset + 1];
        if (!(bytes instanceof Uint8Array)) continue;
        for (let index = 0; index < bytes.length; index += 1) {
          const addr = (start + index) >>> 0;
          this.setByteRaw(addr, bytes[index]);
          dirtyWords.add(addr & ~0x3);
        }
      }
      dirtyWords.forEach((baseAddress) => this.syncWordCache(baseAddress));
    }
    if (Object.hasOwn(state, "hm")) {
      const restoredHeapMappedBytes = Number(state.hm);
      this.reservedHeapMappedBytes = Math.max(0, Math.min(
        this.memoryBytes.size,
        this.getHeapReservationBytes(),
        Number.isSafeInteger(restoredHeapMappedBytes) ? restoredHeapMappedBytes : 0
      ));
    }

    if (Object.hasOwn(state, "db")) {
      this.delayedBranchTarget = state.db == null ? null : (state.db >>> 0);
    }
    if (Object.hasOwn(state, "ll")) {
      this.llReservationAddress = state.ll == null ? null : (state.ll >>> 0);
    }
    this.breakpointResumeAddress = null;
    if (Object.hasOwn(state, "mw")) {
      this.lastMemoryWriteAddress = state.mw == null ? null : (state.mw >>> 0);
    }
  }

  exportRuntimeState(options = {}) {
    const includeProgram = options.includeProgram !== false;
    const includeBreakpoints = options.includeBreakpoints !== false;
    const includeExecutionPlan = includeProgram && options.includeExecutionPlan === true;
    return {
      assembled: this.assembled,
      halted: this.halted,
      pc: this.pc >>> 0,
      steps: this.steps | 0,
      heapPointer: this.heapPointer >>> 0,
      delayedBranchTarget: this.delayedBranchTarget == null ? null : (this.delayedBranchTarget >>> 0),
      llReservationAddress: this.llReservationAddress == null ? null : (this.llReservationAddress >>> 0),
      lastMemoryWriteAddress: this.lastMemoryWriteAddress == null ? null : (this.lastMemoryWriteAddress >>> 0),
      memoryUsageBytes: this.getMemoryUsageBytes(),
      maxMemoryBytes: this.getMaxMemoryBytes(),
      backstepDepth: this.executionHistory.length,
      backstepHistoryStartStep: this.getBackstepHistoryStartStep(),
      backstepHistoryBytes: this.getBackstepHistoryUsageBytes(),
      backstepHistoryBudgetBytes: this.getBackstepHistoryBudgetBytes(),
      registers: Array.from(this.registers, (value) => value | 0),
      cop0: Array.from(this.cop0Registers, (value) => value | 0),
      cop1: Array.from(this.cop1Registers, (value) => value | 0),
      fpuFlags: Array.from(this.fpuConditionFlags, (value) => value | 0),
      fpuControlStatus: this.getFpuControlStatus(),
      memoryWords: Array.from(this.memoryWords.entries(), ([address, value]) => [address >>> 0, value | 0]),
      randomStreams: Array.from(this.randomStreams.entries(), ([stream, state]) => [stream | 0, state >>> 0]),
      openFiles: Array.from(this.cloneOpenFilesTable(this.openFiles).entries(), ([fd, file]) => [
        fd | 0,
        {
          ...file,
          data: Array.from(file.data, (value) => value & 0xff)
        }
      ]),
      virtualFileSystem: Array.from(this.cloneVirtualFileSystemMap(this.virtualFileSystem).entries(), ([name, bytes]) => [
        String(name),
        Array.from(bytes, (value) => value & 0xff)
      ]),
      stdinClosed: this.stdinClosed === true,
      argsRegistry: this.cloneArgsRegistry(this.argsRegistry),
      lastProgramArguments: Array.isArray(this.lastProgramArguments)
        ? this.lastProgramArguments.map((value) => String(value))
        : [],
      imageHandles: Array.from(this.cloneImageHandleMap(this.imageHandles).entries(), ([handle, image]) => [
        handle | 0,
        { ...image }
      ]),
      nextImageHandleId: Math.max(1, this.nextImageHandleId | 0),
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
      executionPlan: includeExecutionPlan ? this.buildExecutionPlan() : [],
      labels: includeProgram
        ? Array.from(this.program.labels.entries(), ([label, address]) => ({
            label: String(label),
            address: address >>> 0
          }))
        : [],
      warnings: includeProgram ? this.program.warnings.map((entry) => ({ ...entry })) : [],
      errors: includeProgram ? this.program.errors.map((entry) => ({ ...entry })) : [],
      ...(includeBreakpoints
        ? { breakpoints: Array.from(this.breakpoints, (address) => address >>> 0) }
        : {})
    };
  }

  importRuntimeState(snapshot = {}, options = {}) {
    const preserveProgram = options.preserveProgram === true;
    const preserveBreakpoints = options.preserveBreakpoints === true;
    const hasSnapshotField = (field) => Object.prototype.hasOwnProperty.call(snapshot, field);
    const registers = Array.isArray(snapshot.registers) ? snapshot.registers : [];
    const cop0 = Array.isArray(snapshot.cop0) ? snapshot.cop0 : [];
    const cop1 = Array.isArray(snapshot.cop1) ? snapshot.cop1 : [];
    const fpuFlags = Array.isArray(snapshot.fpuFlags) ? snapshot.fpuFlags : [];
    const importedMemoryMap = (
      options.preserveMemoryMap !== true
      && snapshot.memoryMap
      && typeof snapshot.memoryMap === "object"
      && !Array.isArray(snapshot.memoryMap)
    )
      ? { ...this.memoryMap, ...snapshot.memoryMap }
      : { ...this.memoryMap };
    const importedHeapPointer = Number.isFinite(snapshot.heapPointer)
      ? (snapshot.heapPointer >>> 0)
      : (importedMemoryMap.heapBase >>> 0);
    const memoryEntries = snapshot.memoryWords instanceof Map
      ? Array.from(snapshot.memoryWords.entries())
      : Array.isArray(snapshot.memoryWords)
        ? snapshot.memoryWords
        : [];
    const importedMemoryBytes = new Map();
    memoryEntries.forEach((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return;
      const address = Number(entry[0]) >>> 0;
      const value = clamp32(entry[1]) >>> 0;
      for (let index = 0; index < 4; index += 1) {
        const byteAddress = (address + index) >>> 0;
        const byteValue = (value >>> (index * 8)) & 0xff;
        if (byteValue === 0) importedMemoryBytes.delete(byteAddress);
        else importedMemoryBytes.set(byteAddress, byteValue);
      }
    });

    const importedHeapBase = importedMemoryMap.heapBase >>> 0;
    const importedStackPointer = Number.isFinite(registers[29])
      ? (Number(registers[29]) >>> 0)
      : ((importedMemoryMap.stackPointer ?? importedMemoryMap.stackBase) >>> 0);
    const importedHeapLimit = heapAddressLimit(importedMemoryMap, importedStackPointer);
    if (
      importedHeapPointer < importedHeapBase
      || importedHeapPointer > importedHeapLimit
    ) {
      throw new Error(translateText(
        "Heap address space exceeded: {address} reaches the stack, guard, or kernel region.",
        { address: toHex(importedHeapPointer) }
      ));
    }
    let importedHeapMappedBytes = 0;
    importedMemoryBytes.forEach((_value, address) => {
      if (address >= importedHeapBase && address < importedHeapPointer) {
        importedHeapMappedBytes += 1;
      }
    });
    const importedMemoryUsage = (importedHeapPointer - importedHeapBase)
      + importedMemoryBytes.size
      - importedHeapMappedBytes;
    this.assertMemoryUsageWithinLimit(importedMemoryUsage);

    if (
      options.preserveMemoryMap !== true
      && snapshot.memoryMap
      && typeof snapshot.memoryMap === "object"
      && !Array.isArray(snapshot.memoryMap)
    ) {
      this.memoryMap = { ...this.memoryMap, ...snapshot.memoryMap };
    }

    this.assembled = Boolean(snapshot.assembled);
    this.halted = Boolean(snapshot.halted);
    this.pc = Number.isFinite(snapshot.pc) ? (snapshot.pc >>> 0) : (this.memoryMap.textBase >>> 0);
    this.steps = Number.isFinite(snapshot.steps) ? (snapshot.steps | 0) : 0;
    this.heapPointer = Number.isFinite(snapshot.heapPointer) ? (snapshot.heapPointer >>> 0) : (this.memoryMap.heapBase >>> 0);
    this.delayedBranchTarget = snapshot.delayedBranchTarget == null ? null : (snapshot.delayedBranchTarget >>> 0);
    this.llReservationAddress = snapshot.llReservationAddress == null ? null : (snapshot.llReservationAddress >>> 0);
    this.breakpointResumeAddress = null;
    this.lastMemoryWriteAddress = snapshot.lastMemoryWriteAddress == null ? null : (snapshot.lastMemoryWriteAddress >>> 0);
    this.registers = new Int32Array(USER_REGISTER_NAMES.length + EXTRA_REGISTER_NAMES.length);
    this.cop0Registers = new Int32Array(32);
    this.cop1Registers = new Int32Array(32);
    this.fpuConditionFlags = new Uint8Array(8);
    this.fpuControlStatus = Number.isFinite(snapshot.fpuControlStatus)
      ? clamp32(snapshot.fpuControlStatus)
      : 0;
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
    this.reservedHeapMappedBytes = importedHeapMappedBytes;
    this.memoryBytes = importedMemoryBytes;
    const importedDirtyWords = new Set();
    importedMemoryBytes.forEach((_value, address) => importedDirtyWords.add(address & ~0x3));
    importedDirtyWords.forEach((baseAddress) => this.syncWordCache(baseAddress));

    this.executionHistory = new BackstepJournalBuffer();
    this.executionHistoryBytes = 0;
    this.activeHistoryJournal = null;
    this.activeRuntimeMemoryAccesses = null;

    if (hasSnapshotField("randomStreams")) {
      const entries = snapshot.randomStreams instanceof Map
        ? Array.from(snapshot.randomStreams.entries())
        : (Array.isArray(snapshot.randomStreams) ? snapshot.randomStreams : []);
      this.randomStreams = new Map();
      entries.forEach((entry) => {
        if (!Array.isArray(entry) || entry.length < 2) return;
        const stream = Number(entry[0]);
        const state = Number(entry[1]);
        if (!Number.isFinite(stream) || !Number.isFinite(state)) return;
        this.randomStreams.set(stream | 0, state >>> 0);
      });
    } else this.randomStreams = new Map();

    if (hasSnapshotField("openFiles")) {
      const entries = snapshot.openFiles instanceof Map
        ? Array.from(snapshot.openFiles.entries())
        : (Array.isArray(snapshot.openFiles) ? snapshot.openFiles : []);
      const candidates = new Map(
        entries.filter((entry) => Array.isArray(entry) && entry.length >= 2)
      );
      const restoredOpenFiles = this.cloneOpenFilesTable(candidates);
      this.createStdioOpenFileTable().forEach((file, fd) => {
        if (!restoredOpenFiles.has(fd)) restoredOpenFiles.set(fd, file);
      });
      this.openFiles = restoredOpenFiles;
    } else this.openFiles = this.createStdioOpenFileTable();

    if (hasSnapshotField("virtualFileSystem")) {
      const entries = snapshot.virtualFileSystem instanceof Map
        ? Array.from(snapshot.virtualFileSystem.entries())
        : (Array.isArray(snapshot.virtualFileSystem) ? snapshot.virtualFileSystem : []);
      this.virtualFileSystem = this.cloneVirtualFileSystemMap(new Map(
        entries.filter((entry) => Array.isArray(entry) && entry.length >= 2)
      ));
      this.persistVirtualFileSystemToStorage();
    }

    this.stdinClosed = hasSnapshotField("stdinClosed") && snapshot.stdinClosed === true;
    this.argsRegistry = hasSnapshotField("argsRegistry")
      ? this.cloneArgsRegistry(snapshot.argsRegistry)
      : [];
    this.lastProgramArguments = hasSnapshotField("lastProgramArguments") && Array.isArray(snapshot.lastProgramArguments)
      ? snapshot.lastProgramArguments.map((value) => String(value))
      : [];
    if (hasSnapshotField("imageHandles")) {
      const entries = snapshot.imageHandles instanceof Map
        ? Array.from(snapshot.imageHandles.entries())
        : (Array.isArray(snapshot.imageHandles) ? snapshot.imageHandles : []);
      this.imageHandles = this.cloneImageHandleMap(new Map(
        entries.filter((entry) => Array.isArray(entry) && entry.length >= 2)
      ));
    } else this.imageHandles = new Map();
    let derivedNextImageHandleId = 1;
    this.imageHandles.forEach((_image, handle) => {
      const sequence = (handle >>> 0) - 0x60000000;
      if (sequence >= derivedNextImageHandleId && sequence < 0x20000000) {
        derivedNextImageHandleId = sequence + 1;
      }
    });
    const requestedNextImageHandleId = hasSnapshotField("nextImageHandleId")
      ? Math.max(1, Number(snapshot.nextImageHandleId) | 0)
      : 1;
    this.nextImageHandleId = Math.max(derivedNextImageHandleId, requestedNextImageHandleId);

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

    if (!preserveBreakpoints && Array.isArray(snapshot.breakpoints)) {
      this.breakpoints = new Set(
        snapshot.breakpoints.map((address) => Number(address) >>> 0)
      );
    }

    this.forceZeroRegister();
  }

  getReferenceInstructionCandidates(opcode) {
    const index = getReferenceBasicInstructionsIndex();
    if (!(index instanceof Map)) return [];
    return index.get(String(opcode ?? "").toLowerCase()) ?? [];
  }

  chooseReferenceInstructionExample(opcode, operandCount = 0) {
    const candidates = this.getReferenceInstructionCandidates(opcode);
    if (!candidates.length) return String(opcode ?? "").toLowerCase();
    const desired = Math.max(0, operandCount | 0);
    const sorted = [...candidates].sort((left, right) => {
      const delta = Math.abs(left.operandCount - desired) - Math.abs(right.operandCount - desired);
      if (delta !== 0) return delta;
      return (left.order | 0) - (right.order | 0);
    });
    return sorted[0]?.example || candidates[0]?.example || String(opcode ?? "").toLowerCase();
  }

  pushInstructionCountError(lineNumber, opcodeToken, operandCount, errors) {
    const candidates = this.getReferenceInstructionCandidates(opcodeToken);
    const example = this.chooseReferenceInstructionExample(opcodeToken, operandCount);
    if (!candidates.length) {
      errors.push({
        line: lineNumber,
        message: translateText('"{opcode}" is not a recognized operator', {
          opcode: opcodeToken
        })
      });
      return;
    }

    const expectedCounts = candidates.map((entry) => entry.operandCount);
    const minOperands = Math.min(...expectedCounts);
    const message = operandCount < minOperands
      ? `Too few or incorrectly formatted operands. Expected: ${example}`
      : `Too many or incorrectly formatted operands. Expected: ${example}`;
    errors.push({
      line: lineNumber,
      message: translateText('"{opcode}": {message}', {
        opcode: opcodeToken,
        message
      })
    });
  }

  pushInstructionFormatError(lineNumber, opcodeToken, operandCount, errors) {
    const candidates = this.getReferenceInstructionCandidates(opcodeToken);
    const example = this.chooseReferenceInstructionExample(opcodeToken, operandCount);
    if (!candidates.length) {
      errors.push({
        line: lineNumber,
        message: translateText('"{opcode}" is not a recognized operator', {
          opcode: opcodeToken
        })
      });
      return;
    }

    errors.push({
      line: lineNumber,
      message: translateText('"{opcode}": {message}', {
        opcode: opcodeToken,
        message: `Too few or incorrectly formatted operands. Expected: ${example}`
      })
    });
  }

  pushInstructionOperandError(lineNumber, token, message, errors) {
    errors.push({
      line: lineNumber,
      message: translateText('"{token}": {message}', {
        token: String(token ?? ""),
        message
      })
    });
  }

  extractFirstUnresolvedSymbol(token) {
    const expression = stripToken(String(token ?? ""));
    if (!expression) return null;
    const matches = expression.match(/[A-Za-z_.$][\w.$]*/g);
    if (!matches) return null;
    for (let i = 0; i < matches.length; i += 1) {
      const symbol = matches[i];
      if (this.program.labels.has(symbol)) continue;
      return symbol;
    }
    return null;
  }

  pushUndefinedSymbolError(lineNumber, token, errors) {
    const symbol = this.extractFirstUnresolvedSymbol(token);
    if (!symbol) return false;
    errors.push({
      line: lineNumber,
      message: translateText('Symbol "{symbol}" not found in symbol table.', {
        symbol
      })
    });
    return true;
  }

  validateInstructionStatement(statement, lineNumber, address, errors, options = {}) {
    const tokens = tokenizeStatement(statement);
    if (!tokens.length) return true;

    const opcodeToken = String(tokens[0] ?? "");
    const opcode = opcodeToken.toLowerCase();
    const operandCount = Math.max(0, tokens.length - 1);
    const allowUnresolvedSymbols = options?.allowUnresolvedSymbols === true;
    const nextPc = ((address >>> 0) + 4) >>> 0;

    const candidates = this.getReferenceInstructionCandidates(opcode);
    if (!candidates.length) {
      errors.push({
        line: lineNumber,
        message: translateText('"{opcode}" is not a recognized operator', {
          opcode: opcodeToken
        })
      });
      return false;
    }

    const allowedCounts = new Set(candidates.map((entry) => entry.operandCount));
    if (!allowedCounts.has(operandCount)) {
      this.pushInstructionCountError(lineNumber, opcodeToken, operandCount, errors);
      return false;
    }

    const reg = (index) => this.resolveRegister(tokens[index]);
    const freg = (index) => this.resolveFloatRegister(tokens[index]);
    const cop0 = (index) => this.resolveCop0Register(tokens[index]);
    const cop1Control = (index) => this.resolveCop1ControlRegister(tokens[index]);

    const reportType = (index, message = "operand is of incorrect type") => {
      this.pushInstructionOperandError(lineNumber, tokens[index], message, errors);
      return false;
    };
    const reportRange = (index) => reportType(index, "operand is out of range");
    const reportFormat = () => {
      this.pushInstructionFormatError(lineNumber, opcodeToken, operandCount, errors);
      return false;
    };
    const reportUndefined = (index) => {
      if (this.pushUndefinedSymbolError(lineNumber, tokens[index], errors)) return false;
      return reportType(index);
    };

    const expectRegister = (index) => reg(index) !== null || reportType(index);
    const expectFloatRegister = (index) => freg(index) !== null || reportType(index);
    const expectCop0Register = (index) => cop0(index) !== null || reportType(index);
    const expectCop1ControlRegister = (index) => cop1Control(index) !== null || reportType(index);
    const expectImmediate = (index, range = null) => {
      const raw = String(tokens[index] ?? "").trim();
      if (!raw) return reportType(index);
      const parsed = parseImmediate(raw);
      const value = Number.isFinite(parsed) ? parsed : this.resolveValue(raw);
      if (!Number.isFinite(value)) {
        if (allowUnresolvedSymbols && isPotentialSymbolExpression(raw)) return true;
        return reportUndefined(index);
      }
      if (range && (value < range.min || value > range.max)) return reportRange(index);
      return true;
    };
    const expectMemory = (index) => {
      const raw = String(tokens[index] ?? "").trim();
      if (!raw) return reportFormat();
      if (this.resolveExecutionMemoryOperand(raw)) return true;

      const compact = raw.replace(/\s+/g, "");
      const hasParenSyntax = compact.includes("(") || compact.includes(")");
      const memMatch = /^(.*)\((\$?[\w\d]+)\)$/.exec(compact);
      if (memMatch) {
        if (this.resolveRegister(memMatch[2]) === null) return reportFormat();
        const offsetExpr = String(memMatch[1] ?? "").trim();
        if (!offsetExpr) return true;
        if (Number.isFinite(this.resolveValue(offsetExpr))) return true;
        if (allowUnresolvedSymbols && isPotentialSymbolExpression(offsetExpr)) return true;
        if (!allowUnresolvedSymbols && this.pushUndefinedSymbolError(lineNumber, offsetExpr, errors)) return false;
        return reportFormat();
      }

      if (hasParenSyntax) return reportFormat();

      if (!allowUnresolvedSymbols && this.pushUndefinedSymbolError(lineNumber, raw, errors)) return false;
      if (allowUnresolvedSymbols && isPotentialSymbolExpression(raw)) return true;
      return reportFormat();
    };
    const expectBranchTarget = (index) => {
      const raw = String(tokens[index] ?? "").trim();
      const immediate = parseImmediate(raw);
      if (Number.isFinite(immediate)) {
        if (immediate < -32768 || immediate > 32767) return reportRange(index);
        return true;
      }
      const target = this.branchTarget(raw, nextPc);
      if (target !== null) {
        const byteDelta = (((target >>> 0) - nextPc) | 0);
        if ((byteDelta & 0x3) !== 0 || byteDelta < -131072 || byteDelta > 131068) {
          return reportRange(index);
        }
        return true;
      }
      if (allowUnresolvedSymbols && isPotentialSymbolExpression(raw)) return true;
      if (!allowUnresolvedSymbols && this.pushUndefinedSymbolError(lineNumber, raw, errors)) return false;
      return reportType(index);
    };
    const expectJumpTarget = (index) => {
      const raw = String(tokens[index] ?? "").trim();
      const label = this.resolveLabelAddress(raw);
      const immediate = parseImmediate(raw);
      const expression = this.resolveValue(raw);
      const target = label !== null
        ? label
        : Number.isFinite(immediate)
          ? immediate
          : expression;
      if (Number.isFinite(target)) {
        const absolute = target >>> 0;
        if ((absolute & 0x3) !== 0 || (absolute & 0xf0000000) !== (nextPc & 0xf0000000)) {
          return reportRange(index);
        }
        return true;
      }
      if (allowUnresolvedSymbols && isPotentialSymbolExpression(raw)) return true;
      if (!allowUnresolvedSymbols && this.pushUndefinedSymbolError(lineNumber, raw, errors)) return false;
      return reportType(index);
    };

    if (["nop", "syscall", "eret"].includes(opcode)) return true;
    if (opcode === "break") return operandCount === 0 || expectImmediate(1);
    if (["teq", "tne", "tge", "tgeu", "tlt", "tltu"].includes(opcode)) return expectRegister(1) && expectRegister(2);
    if (["teqi", "tnei", "tgei", "tgeiu", "tlti", "tltiu"].includes(opcode)) return expectRegister(1) && expectImmediate(2, { min: -32768, max: 32767 });
    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu", "mul", "movn", "movz"].includes(opcode)) return expectRegister(1) && expectRegister(2) && expectRegister(3);
    if (["clz", "clo"].includes(opcode)) return expectRegister(1) && expectRegister(2);
    if (["addi", "addiu", "slti", "sltiu"].includes(opcode)) return expectRegister(1) && expectRegister(2) && expectImmediate(3, { min: -32768, max: 32767 });
    if (["andi", "ori", "xori"].includes(opcode)) return expectRegister(1) && expectRegister(2) && expectImmediate(3, { min: 0, max: 65535 });
    if (opcode === "lui") return expectRegister(1) && expectImmediate(2, { min: 0, max: 65535 });
    if (["sll", "srl", "sra"].includes(opcode)) return expectRegister(1) && expectRegister(2) && expectImmediate(3, { min: 0, max: 31 });
    if (["sllv", "srlv", "srav"].includes(opcode)) return expectRegister(1) && expectRegister(2) && expectRegister(3);
    if (["mult", "multu", "div", "divu", "madd", "maddu", "msub", "msubu"].includes(opcode)) return expectRegister(1) && expectRegister(2);
    if (["mfhi", "mflo", "mthi", "mtlo"].includes(opcode)) return expectRegister(1);
    if (["mfc0", "mtc0"].includes(opcode)) return expectRegister(1) && expectCop0Register(2);
    if (["mfc1", "mtc1"].includes(opcode)) return expectRegister(1) && expectFloatRegister(2);
    if (["cfc1", "ctc1"].includes(opcode)) return expectRegister(1) && expectCop1ControlRegister(2);
    if (["lw", "sw", "lb", "lbu", "sb", "lh", "lhu", "sh", "ll", "sc", "lwl", "lwr", "swl", "swr"].includes(opcode)) return expectRegister(1) && expectMemory(2);
    if (["lwc1", "swc1", "ldc1", "sdc1"].includes(opcode)) return expectFloatRegister(1) && expectMemory(2);
    if (["beq", "bne"].includes(opcode)) return expectRegister(1) && expectRegister(2) && expectBranchTarget(3);
    if (["bgtz", "blez", "bltz", "bgez", "bgezal", "bltzal"].includes(opcode)) return expectRegister(1) && expectBranchTarget(2);
    if (["bc1f", "bc1t"].includes(opcode)) {
      return operandCount === 1
        ? expectBranchTarget(1)
        : expectImmediate(1, { min: 0, max: 7 }) && expectBranchTarget(2);
    }
    if (["j", "jal"].includes(opcode)) return expectJumpTarget(1);
    if (opcode === "jr") return expectRegister(1);
    if (opcode === "jalr") return operandCount === 1 ? expectRegister(1) : expectRegister(1) && expectRegister(2);
    if (["movf", "movt"].includes(opcode)) {
      return operandCount === 2
        ? expectRegister(1) && expectRegister(2)
        : expectRegister(1) && expectRegister(2) && expectImmediate(3, { min: 0, max: 7 });
    }
    if (["add.s", "sub.s", "mul.s", "div.s", "add.d", "sub.d", "mul.d", "div.d"].includes(opcode)) return expectFloatRegister(1) && expectFloatRegister(2) && expectFloatRegister(3);
    if (["mov.s", "mov.d", "neg.s", "neg.d", "abs.s", "abs.d", "sqrt.s", "sqrt.d"].includes(opcode)) return expectFloatRegister(1) && expectFloatRegister(2);
    if (["movf.s", "movt.s", "movf.d", "movt.d"].includes(opcode)) {
      return operandCount === 2
        ? expectFloatRegister(1) && expectFloatRegister(2)
        : expectFloatRegister(1) && expectFloatRegister(2) && expectImmediate(3, { min: 0, max: 7 });
    }
    if (["movn.s", "movz.s", "movn.d", "movz.d"].includes(opcode)) return expectFloatRegister(1) && expectFloatRegister(2) && expectRegister(3);
    if (["c.eq.s", "c.lt.s", "c.le.s", "c.eq.d", "c.lt.d", "c.le.d"].includes(opcode)) {
      return operandCount === 2
        ? expectFloatRegister(1) && expectFloatRegister(2)
        : expectImmediate(1, { min: 0, max: 7 }) && expectFloatRegister(2) && expectFloatRegister(3);
    }
    if (["cvt.s.d", "cvt.s.w", "cvt.d.s", "cvt.d.w", "cvt.w.s", "cvt.w.d", "round.w.s", "round.w.d", "trunc.w.s", "trunc.w.d", "ceil.w.s", "ceil.w.d", "floor.w.s", "floor.w.d"].includes(opcode)) return expectFloatRegister(1) && expectFloatRegister(2);

    const row = this.buildExecutionPlanRow({
      address: address >>> 0,
      line: lineNumber,
      basic: statement
    });
    if (!row.valid || row.delegate) {
      if (!allowUnresolvedSymbols && operandCount > 0 && this.pushUndefinedSymbolError(lineNumber, tokens[tokens.length - 1], errors)) {
        return false;
      }
      return reportType(1);
    }
    return true;
  }

  resolveExecutionMemoryOperand(token) {
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

  buildExecutionPlanRow(row) {
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
      fd: -1,
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
    const cop1Control = (index) => this.resolveCop1ControlRegister(tokens[index]);
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
      const sourceMove = opcode === "mthi" || opcode === "mtlo";
      if (sourceMove) entry.rs = reg(1);
      else entry.rd = reg(1);
      return (sourceMove ? entry.rs : entry.rd) === null ? markDelegate() : entry;
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

    if (["cfc1", "ctc1"].includes(opcode)) {
      entry.rt = reg(1);
      entry.fs = cop1Control(2);
      return (entry.rt === null || entry.fs === null) ? markDelegate() : entry;
    }

    if (["lw", "sw", "lb", "lbu", "sb", "lh", "lhu", "sh", "ll", "sc", "lwl", "lwr", "swl", "swr", "lwc1", "swc1", "ldc1", "sdc1"].includes(opcode)) {
      const operand = this.resolveExecutionMemoryOperand(tokens[2]);
      if (!operand) return markDelegate();
      entry.base = operand.base ?? -1;
      entry.immediate = operand.offset | 0;
      entry.absolute = operand.absolute == null ? 0 : (operand.absolute >>> 0);
      if (["lwc1", "swc1", "ldc1", "sdc1"].includes(opcode)) {
        entry.fs = freg(1);
        return entry.fs === null ? markDelegate() : entry;
      }
      entry.rt = reg(1);
      return entry.rt === null ? markDelegate() : entry;
    }

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

    if (["add.s", "sub.s", "mul.s", "div.s", "add.d", "sub.d", "mul.d", "div.d"].includes(opcode)) {
      entry.fd = freg(1);
      entry.fs = freg(2);
      entry.ft = freg(3);
      return (entry.fd === null || entry.fs === null || entry.ft === null) ? markDelegate("fpu") : entry;
    }

    if (["mov.s", "mov.d", "neg.s", "neg.d", "abs.s", "abs.d", "sqrt.s", "sqrt.d"].includes(opcode)) {
      entry.fd = freg(1);
      entry.fs = freg(2);
      return (entry.fd === null || entry.fs === null) ? markDelegate("fpu") : entry;
    }

    if (["movf.s", "movt.s", "movf.d", "movt.d"].includes(opcode)) {
      entry.fd = freg(1);
      entry.fs = freg(2);
      const condition = tokens.length >= 4 ? imm(3) : 0;
      entry.cc = Number.isFinite(condition) ? ((condition | 0) & 0x7) : 0;
      return (entry.fd === null || entry.fs === null || !Number.isFinite(condition)) ? markDelegate("fpu") : entry;
    }

    if (["movn.s", "movz.s", "movn.d", "movz.d"].includes(opcode)) {
      entry.fd = freg(1);
      entry.fs = freg(2);
      entry.rt = reg(3);
      return (entry.fd === null || entry.fs === null || entry.rt === null) ? markDelegate("fpu") : entry;
    }

    if (["c.eq.s", "c.lt.s", "c.le.s", "c.eq.d", "c.lt.d", "c.le.d"].includes(opcode)) {
      const hasConditionCode = tokens.length >= 4;
      const condition = hasConditionCode ? imm(1) : 0;
      entry.cc = Number.isFinite(condition) ? ((condition | 0) & 0x7) : 0;
      entry.fs = freg(hasConditionCode ? 2 : 1);
      entry.ft = freg(hasConditionCode ? 3 : 2);
      return (entry.fs === null || entry.ft === null || !Number.isFinite(condition)) ? markDelegate("fpu") : entry;
    }

    if (["cvt.s.d", "cvt.s.w", "cvt.d.s", "cvt.d.w", "cvt.w.s", "cvt.w.d", "round.w.s", "round.w.d", "trunc.w.s", "trunc.w.d", "ceil.w.s", "ceil.w.d", "floor.w.s", "floor.w.d"].includes(opcode)) {
      entry.fd = freg(1);
      entry.fs = freg(2);
      return (entry.fd === null || entry.fs === null) ? markDelegate("fpu") : entry;
    }

    return markDelegate("unsupported");
  }

  buildExecutionPlan() {
    return this.program.textRows.map((row) => this.buildExecutionPlanRow(row));
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
    const estimateNumericArray = (value) => Array.isArray(value)
      ? 32 + (value.length * 8)
      : 0;
    const registerBytes =
      estimateNumericArray(state.r)
      + estimateNumericArray(state.c0)
      + estimateNumericArray(state.c1)
      + estimateNumericArray(state.ff);
    const memoryChangesBytes = Array.isArray(state.m)
      ? 32 + state.m.reduce((total, value, index) => (
          total + (
            index % 2 === 0
              ? 8
              : (value instanceof Uint8Array ? 32 + value.byteLength : 0)
          )
        ), 0)
      : 0;
    const openFilesBytes = this.estimateOpenFilesTableBytes(state.of);
    const virtualFileSystemBytes = this.estimateVirtualFileSystemBytes(state.vf);
    const randomStreamsBytes = state.rs instanceof Map
      ? (state.rs.size * GENERIC_MAP_ENTRY_ESTIMATE_BYTES)
      : 0;
    const argsRegistryBytes = Array.isArray(state.ar)
      ? state.ar.reduce((total, entry) => (
          total
          + GENERIC_MAP_ENTRY_ESTIMATE_BYTES
          + this.estimateStringStorageBytes(entry?.kind)
          + this.estimateStringStorageBytes(entry?.name)
        ), 0)
      : 0;
    const imageHandlesBytes = state.ih instanceof Map
      ? Array.from(state.ih.values()).reduce((total, image) => (
          total
          + GENERIC_MAP_ENTRY_ESTIMATE_BYTES
          + this.estimateStringStorageBytes(image?.path)
        ), 0)
      : 0;
    return Math.max(
      112,
      112
      + registerBytes
      + memoryChangesBytes
      + openFilesBytes
      + virtualFileSystemBytes
      + randomStreamsBytes
      + argsRegistryBytes
      + imageHandlesBytes
    );
  }

  recordMemoryChange(address, nextValue = null) {
    const journal = this.activeHistoryJournal;
    if (!journal || !(journal.memoryChanges instanceof BackstepMemoryJournal)) return;
    const addr = address >>> 0;
    const previousByte = this.getByte(addr);
    if (nextValue != null && previousByte === (nextValue & 0xff)) return;
    journal.memoryChanges.record(addr, previousByte);
  }

  markOpenFilesDirty() {
    const journal = this.activeHistoryJournal;
    if (!journal || journal.captureResources !== true || journal.openFiles instanceof Map) return;
    journal.openFiles = this.cloneOpenFilesTable(this.openFiles);
  }

  markVirtualFileSystemDirty() {
    const journal = this.activeHistoryJournal;
    if (!journal || journal.captureResources !== true || journal.virtualFileSystem instanceof Map) return;
    journal.virtualFileSystem = this.cloneVirtualFileSystemMap(this.virtualFileSystem);
  }

  markRandomStreamsDirty() {
    const journal = this.activeHistoryJournal;
    if (!journal || journal.captureResources !== true || journal.randomStreams instanceof Map) return;
    journal.randomStreams = new Map(this.randomStreams);
  }

  markArgsRegistryDirty() {
    const journal = this.activeHistoryJournal;
    if (!journal || journal.captureResources !== true || Array.isArray(journal.argsRegistry)) return;
    journal.argsRegistry = this.cloneArgsRegistry(this.argsRegistry);
  }

  markImageHandlesDirty() {
    const journal = this.activeHistoryJournal;
    if (!journal || journal.captureResources !== true || journal.imageHandles instanceof Map) return;
    journal.imageHandles = this.cloneImageHandleMap(this.imageHandles);
  }

  clearExecutionHistory() {
    this.executionHistory.clear();
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

  getBackstepHistoryStartStep() {
    if (!this.executionHistory.length) return this.steps | 0;
    const oldest = this.executionHistory.peekOldest();
    return Number.isFinite(oldest?.s) ? (oldest.s | 0) : Math.max(0, (this.steps | 0) - this.executionHistory.length);
  }

  getBackstepHistoryBudgetBytes() {
    return this.getBackstepHistoryPolicy().budgetBytes;
  }

  getBackstepHistoryPolicy() {
    if (this.backstepHistoryPolicy) return this.backstepHistoryPolicy;
    const maxBacksteps = Math.max(0, Number(this.settings.maxBacksteps) | 0);
    const configured = Number(this.settings.maxBackstepHistoryBytes);
    if (Number.isFinite(configured) && configured > 0) {
      this.backstepHistoryPolicy = {
        maxBacksteps,
        budgetBytes: Math.floor(configured)
      };
      return this.backstepHistoryPolicy;
    }
    const maxMemoryBytes = this.getMaxMemoryBytes();
    if (!Number.isFinite(maxMemoryBytes) || maxMemoryBytes <= 0) {
      this.backstepHistoryPolicy = {
        maxBacksteps,
        budgetBytes: BACKSTEP_HISTORY_BUDGET_CAP_BYTES
      };
      return this.backstepHistoryPolicy;
    }
    const derived = Math.floor(maxMemoryBytes / BACKSTEP_HISTORY_BUDGET_DIVISOR);
    this.backstepHistoryPolicy = {
      maxBacksteps,
      budgetBytes: Math.max(
        BACKSTEP_HISTORY_BUDGET_MIN_BYTES,
        Math.min(BACKSTEP_HISTORY_BUDGET_CAP_BYTES, derived)
      )
    };
    return this.backstepHistoryPolicy;
  }

  trimExecutionHistory() {
    const { maxBacksteps, budgetBytes } = this.getBackstepHistoryPolicy();
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
    const { maxBacksteps, budgetBytes } = this.getBackstepHistoryPolicy();
    if (maxBacksteps <= 0 || !Number.isFinite(budgetBytes) || budgetBytes <= 0) {
      if (this.executionHistory.length || this.executionHistoryBytes) this.clearExecutionHistory();
      return { capture: false, budgetBytes };
    }

    return { capture: true, budgetBytes };
  }

  pushExecutionHistory(state) {
    if (!state || typeof state !== "object") return false;
    const { maxBacksteps, budgetBytes } = this.getBackstepHistoryPolicy();
    if (maxBacksteps <= 0 || !Number.isFinite(budgetBytes) || budgetBytes <= 0) {
      this.clearExecutionHistory();
      return false;
    }

    const estimatedBytes = Number(state.estimatedBytes);
    const size = Number.isFinite(estimatedBytes) && estimatedBytes > 0
      ? Math.floor(estimatedBytes)
      : this.estimateCapturedStateBytes(state);
    if (state.overflow === true || size > budgetBytes) {
      this.clearExecutionHistory();
      return false;
    }

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
    return true;
  }

  forceZeroRegister() {
    this.setRegisterValue(0, 0);
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
    this.setRegisterValue(32, Number((masked >> 32n) & 0xffffffffn));
    this.setRegisterValue(33, Number(masked & 0xffffffffn));
  }

  getConditionFlag(index = 0) {
    if (!Number.isFinite(index)) return 0;
    const idx = Math.max(0, Math.min(7, index | 0));
    return this.fpuConditionFlags[idx] ? 1 : 0;
  }

  setConditionFlag(index, value) {
    if (!Number.isFinite(index)) return;
    const idx = Math.max(0, Math.min(7, index | 0));
    this.setFpuFlagValue(idx, value);
  }

  getFpuControlStatus() {
    let status = (this.fpuControlStatus >>> 0) & 0x017fffff;
    if (this.fpuConditionFlags[0]) status |= 0x00800000;
    for (let index = 1; index < this.fpuConditionFlags.length; index += 1) {
      if (this.fpuConditionFlags[index]) status |= (1 << (24 + index));
    }
    return clamp32(status);
  }

  setFpuControlStatus(value) {
    const status = clamp32(value);
    this.fpuControlStatus = status;
    this.setFpuFlagValue(0, (status >>> 23) & 0x1);
    for (let index = 1; index < this.fpuConditionFlags.length; index += 1) {
      this.setFpuFlagValue(index, (status >>> (24 + index)) & 0x1);
    }
  }

  getFpuRoundingMode() {
    return this.getFpuControlStatus() & 0x3;
  }

  roundUsingFpuControl(value) {
    const mode = this.getFpuRoundingMode();
    if (mode === 1) return truncNumber(value);
    if (mode === 2) return ceilNumber(value);
    if (mode === 3) return floorNumber(value);
    return roundNearestEven32(value);
  }

  resolveFloatRegister(token) {
    const normalized = normalizeRegisterToken(token);
    if (/^f\d+$/.test(normalized)) {
      const index = Number.parseInt(normalized.slice(1), 10);
      if (index >= 0 && index < 32) return index;
    }
    return null;
  }

  resolveCop1ControlRegister(token) {
    const normalized = normalizeRegisterToken(token);
    if (normalized === "fcsr") return 31;
    const numericToken = normalized.startsWith("f") ? normalized.slice(1) : normalized;
    if (/^\d+$/.test(numericToken)) {
      const index = Number.parseInt(numericToken, 10);
      if (index >= 0 && index < 32) return index;
    }
    return null;
  }

  readCop1ControlRegister(index) {
    return (index | 0) === 31 ? this.getFpuControlStatus() : 0;
  }

  writeCop1ControlRegister(index, value) {
    if ((index | 0) === 31) this.setFpuControlStatus(value);
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
    this.setCop1Value(registerIndex, float32ToBits(value));
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
    this.setCop1Value(registerIndex + 1, float64HighWord(value));
    this.setCop1Value(registerIndex, float64LowWord(value));
  }

  getByte(address) {
    return this.memoryBytes.get(address >>> 0) ?? 0;
  }

  isTextAddress(address) {
    const addr = address >>> 0;
    const ranges = buildStrictMemoryRanges(this.memoryMap);
    return ranges
      .filter((range) => range.segment === "text" || range.segment === "ktext")
      .some((range) => unsignedRangeContains(addr, 1, range.start, range.size));
  }

  isStrictMarsCompatibilityEnabled() {
    return this.settings?.strictMarsCompatibility === true;
  }

  assertAddressInStrictMemoryModel(address, byteLength = 1, operationLabel = "memory access") {
    if (!this.isStrictMarsCompatibilityEnabled()) return;
    const addr = address >>> 0;
    const length = Math.max(1, byteLength | 0);
    const segment = findStrictSegmentForAddress(this.memoryMap, addr, length);
    if (segment) return;
    throw new MarsMemoryAccessError(
      translateText(
        "Strict MARS memory mode rejected {operation} at {address} ({length} byte(s)).",
        {
          operation: operationLabel,
          address: toHex(addr),
          length
        }
      ),
      String(operationLabel).toLowerCase().includes("write") ? "write" : "read",
      addr
    );
  }

  assertWritableAddress(address, byteLength = 1) {
    if (this.settings.selfModifyingCode) return;
    const size = Math.max(1, byteLength | 0);
    for (let i = 0; i < size; i += 1) {
      const addr = (address + i) >>> 0;
      if (this.isTextAddress(addr)) {
        throw new MarsMemoryAccessError(
          translateText("Self-modifying code is disabled for text segment writes ({address}).", {
            address: toHex(addr)
          }),
          "write",
          addr
        );
      }
    }
  }

  getMemoryUsageBytes() {
    return this.memoryBytes.size;
  }

  getHeapReservationBytes() {
    const heapBase = this.memoryMap.heapBase >>> 0;
    const pointer = this.heapPointer >>> 0;
    if (pointer < heapBase) return 0;
    return pointer - heapBase;
  }

  isReservedHeapAddress(address, heapPointer = this.heapPointer) {
    const heapBase = this.memoryMap.heapBase >>> 0;
    const heapLimit = Number(heapPointer);
    const addr = address >>> 0;
    return Number.isSafeInteger(heapLimit)
      && heapLimit >= heapBase
      && addr >= heapBase
      && addr < heapLimit;
  }

  countMappedBytesInReservedHeap(heapPointer = this.heapPointer) {
    let count = 0;
    this.memoryBytes.forEach((_value, address) => {
      if (this.isReservedHeapAddress(address, heapPointer)) count += 1;
    });
    return count;
  }

  getAccountedMemoryUsageBytes() {
    return this.getHeapReservationBytes()
      + this.getMemoryUsageBytes()
      - this.reservedHeapMappedBytes;
  }

  getMaxMemoryBytes() {
    const configured = Number(this.settings.maxMemoryBytes);
    if (Number.isFinite(configured) && configured > 0) {
      return Math.min(0x7fffffff, Math.floor(configured));
    }
    return 0x7fffffff;
  }

  getSyscallBufferLimitBytes() {
    return SYSCALL_BUFFER_HARD_LIMIT_BYTES;
  }

  getSyscallStringLimitCharacters() {
    return SYSCALL_STRING_HARD_LIMIT_CHARACTERS;
  }

  getSyscallArrayLimitElements() {
    return SYSCALL_ARRAY_HARD_LIMIT_ELEMENTS;
  }

  getVirtualFileSystemStorageLimitBytes() {
    const configured = Number(this.settings.maxUserStorageBytes);
    const requested = Number.isFinite(configured) && configured > 0
      ? Math.floor(configured)
      : SYSCALL_BUFFER_HARD_LIMIT_BYTES;
    return Math.max(1, Math.min(SYSCALL_BUFFER_HARD_LIMIT_BYTES, requested));
  }

  getByteArrayLength(value) {
    if (value instanceof Uint8Array || Array.isArray(value) || typeof value === "string") {
      return Number.isSafeInteger(value.length) && value.length >= 0 ? value.length : null;
    }
    if (value && ArrayBuffer.isView(value)) {
      return Number.isSafeInteger(value.byteLength) && value.byteLength >= 0 ? value.byteLength : null;
    }
    return 0;
  }

  assertBoundedSyscallLength(value, maximum, label = "buffer") {
    const length = Number(value);
    const limit = Number(maximum);
    if (
      !Number.isSafeInteger(length)
      || length < 0
      || !Number.isSafeInteger(limit)
      || limit < 0
      || length > limit
    ) {
      throw new MarsSyscallLimitError(translateText(
        "{label} length exceeds the syscall limit ({limit}).",
        { label: String(label || "buffer"), limit }
      ));
    }
    return length;
  }

  assertBoundedSyscallAddressRange(address, byteLength, label = "buffer") {
    const length = this.assertBoundedSyscallLength(
      byteLength,
      this.getSyscallBufferLimitBytes(),
      label
    );
    const start = BigInt(address >>> 0);
    if (start + BigInt(length) > UINT32_WRAP) {
      throw new MarsSyscallLimitError(translateText(
        "{label} range exceeds the address space.",
        { label: String(label || "buffer") }
      ));
    }
    return length;
  }

  getBoundedImageDimensions(widthValue, heightValue, label = "image") {
    const width = Number(widthValue);
    const height = Number(heightValue);
    if (
      !Number.isSafeInteger(width)
      || !Number.isSafeInteger(height)
      || width <= 0
      || height <= 0
      || width > SYSCALL_IMAGE_HARD_LIMIT_DIMENSION
      || height > SYSCALL_IMAGE_HARD_LIMIT_DIMENSION
    ) {
      throw new MarsSyscallLimitError(translateText(
        "{label} dimensions exceed the syscall limit.",
        { label: String(label || "image") }
      ));
    }
    const pixelCount = width * height;
    this.assertBoundedSyscallLength(pixelCount, SYSCALL_IMAGE_HARD_LIMIT_PIXELS, `${label} pixel`);
    return { width, height, pixelCount };
  }

  isVirtualFileSystemWithinStorageLimit(source) {
    if (!(source instanceof Map)) return false;
    const limit = this.getVirtualFileSystemStorageLimitBytes();
    let total = 0;
    for (const bytes of source.values()) {
      const length = this.getByteArrayLength(bytes);
      if (length === null) return false;
      total += length;
      if (!Number.isSafeInteger(total) || total > limit) return false;
    }
    return true;
  }

  isProjectedVirtualFileSystemWithinStorageLimit(name, replacementLength) {
    const length = Number(replacementLength);
    if (!Number.isSafeInteger(length) || length < 0) return false;
    const key = String(name ?? "");
    const limit = this.getVirtualFileSystemStorageLimitBytes();
    let total = length;
    for (const [existingName, bytes] of this.virtualFileSystem.entries()) {
      if (existingName === key) continue;
      const existingLength = this.getByteArrayLength(bytes);
      if (existingLength === null) return false;
      total += existingLength;
      if (!Number.isSafeInteger(total) || total > limit) return false;
    }
    return total <= limit;
  }

  assertMemoryUsageWithinLimit(requestedUsage) {
    const limit = this.getMaxMemoryBytes();
    if (!Number.isFinite(limit) || limit <= 0) return;
    const requested = Number(requestedUsage);
    if (!Number.isFinite(requested) || requested > limit) {
      throw new Error(translateText("Memory limit exceeded: {requested} bytes requested (limit {limit} bytes).", {
        requested,
        limit
      }));
    }
  }

  ensureMemoryCapacity(extraBytes = 0) {
    const requestedGrowth = Number(extraBytes);
    const growth = Number.isFinite(requestedGrowth)
      ? Math.max(0, Math.floor(requestedGrowth))
      : Number.POSITIVE_INFINITY;
    if (!growth) return;
    const used = this.getAccountedMemoryUsageBytes();
    this.assertMemoryUsageWithinLimit(used + growth);
  }

  growHeapToChecked(nextHeapPointer) {
    const currentHeap = this.heapPointer >>> 0;
    const heapBase = this.memoryMap.heapBase >>> 0;
    const nextHeap = Number(nextHeapPointer);
    const stackPointer = this.registers?.[29] >>> 0;
    const heapLimit = heapAddressLimit(this.memoryMap, stackPointer);
    if (
      !Number.isSafeInteger(nextHeap)
      || nextHeap < currentHeap
      || nextHeap < heapBase
      || nextHeap > 0xffffffff
    ) {
      throw new Error(translateText("Heap address space exceeded."));
    }
    if (nextHeap > heapLimit) {
      throw new Error(translateText(
        "Heap address space exceeded: {address} reaches the stack, guard, or kernel region.",
        { address: toHex(nextHeap) }
      ));
    }

    let newlyCoveredMappedBytes = 0;
    if (nextHeap > currentHeap) {
      this.memoryBytes.forEach((_value, address) => {
        const addr = address >>> 0;
        if (addr >= currentHeap && addr < nextHeap) newlyCoveredMappedBytes += 1;
      });
    }
    const projectedHeapMappedBytes = this.reservedHeapMappedBytes + newlyCoveredMappedBytes;
    const requested = (nextHeap - heapBase)
      + this.getMemoryUsageBytes()
      - projectedHeapMappedBytes;
    this.assertMemoryUsageWithinLimit(requested);
    this.heapPointer = nextHeap >>> 0;
    this.reservedHeapMappedBytes = projectedHeapMappedBytes;
  }

  ensureMemoryWriteCapacity(entries) {
    const pendingWrites = new Map();
    Array.from(entries ?? []).forEach(([address, value]) => {
      pendingWrites.set(address >>> 0, value & 0xff);
    });

    let requested = this.getAccountedMemoryUsageBytes();
    const heapBase = this.memoryMap.heapBase >>> 0;
    const heapLimit = this.heapPointer >>> 0;
    const hasReservedHeap = heapLimit >= heapBase;
    pendingWrites.forEach((value, address) => {
      if (hasReservedHeap && address >= heapBase && address < heapLimit) return;
      const mappedBefore = this.memoryBytes.has(address);
      const mappedAfter = value !== 0;
      if (mappedBefore === mappedAfter) return;
      requested += mappedAfter ? 1 : -1;
    });
    this.assertMemoryUsageWithinLimit(requested);
  }

  invalidateLoadLinkedReservationForWrites(entries) {
    if (this.llReservationAddress == null) return false;
    const reservedAddress = this.llReservationAddress >>> 0;
    const overlapsReservation = Array.from(entries ?? []).some(([address]) => {
      return (((address >>> 0) - reservedAddress) >>> 0) < 4;
    });
    if (overlapsReservation) this.llReservationAddress = null;
    return overlapsReservation;
  }

  writeBytesAtomic(address, values) {
    const addr = address >>> 0;
    const bytes = Array.from(values ?? [], (value) => value & 0xff);
    if (!bytes.length) return;

    const entries = bytes.map((value, index) => [((addr + index) >>> 0), value]);
    try {
      this.assertAddressInStrictMemoryModel(addr, bytes.length, "write");
      this.assertWritableAddress(addr, bytes.length);
      this.ensureMemoryWriteCapacity(entries);
    } catch (error) {
      throw normalizeMemoryAccessError(error, "write", addr);
    }
    this.invalidateLoadLinkedReservationForWrites(entries);

    const dirtyWords = new Set();
    entries.forEach(([entryAddress, value]) => {
      this.recordMemoryChange(entryAddress, value);
    });
    entries.forEach(([entryAddress, value]) => {
      this.setByteRaw(entryAddress, value);
      dirtyWords.add(entryAddress & ~0x3);
    });
    dirtyWords.forEach((baseAddress) => this.syncWordCache(baseAddress));
    this.lastMemoryWriteAddress = (entries[entries.length - 1][0] & ~0x3) >>> 0;
  }

  writeAssemblyBytesAtomic(address, values) {
    const addr = address >>> 0;
    const bytes = Array.from(values ?? [], (value) => value & 0xff);
    if (!bytes.length) return;
    const entries = bytes.map((value, index) => [((addr + index) >>> 0), value]);
    this.ensureMemoryWriteCapacity(entries);
    entries.forEach(([entryAddress, value]) => this.setByteRaw(entryAddress, value));
    const dirtyWords = new Set(entries.map(([entryAddress]) => entryAddress & ~0x3));
    dirtyWords.forEach((baseAddress) => this.syncWordCache(baseAddress));
  }

  setByteRaw(address, value) {
    const addr = address >>> 0;
    const masked = value & 0xff;
    const mappedBefore = this.memoryBytes.has(addr);
    const mappedAfter = masked !== 0;
    if (mappedBefore !== mappedAfter && this.isReservedHeapAddress(addr)) {
      this.reservedHeapMappedBytes += mappedAfter ? 1 : -1;
    }
    if (masked === 0) this.memoryBytes.delete(addr);
    else this.memoryBytes.set(addr, masked);
  }

  setByte(address, value) {
    const addr = address >>> 0;
    this.assertAddressInStrictMemoryModel(addr, 1, "write");
    this.assertWritableAddress(addr, 1);
    const masked = value & 0xff;
    this.ensureMemoryWriteCapacity([[addr, masked]]);
    this.invalidateLoadLinkedReservationForWrites([[addr, masked]]);
    this.recordMemoryChange(addr, masked);
    this.setByteRaw(addr, masked);
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
    const addr = address >>> 0;
    this.assertAddressInStrictMemoryModel(addr, 1, "read");
    const value = this.getByte(addr);
    const result = signed ? ((value << 24) >> 24) : value;
    this.notifyMemoryObservers("read", addr, 1, result);
    return result;
  }

  writeByte(address, value) {
    const addr = address >>> 0;
    this.writeBytesAtomic(addr, [value]);
    this.notifyMemoryObservers("write", addr, 1, value & 0xff);
  }

  readHalf(address, signed = true) {
    const addr = address >>> 0;
    this.assertAddressInStrictMemoryModel(addr, 2, "read");
    if (addr % 2 !== 0) {
      throw new MarsMemoryAccessError(
        translateText("Address not aligned on halfword boundary: {address}", { address: toHex(addr) }),
        "read",
        addr
      );
    }
    const value = (this.getByte(addr) | (this.getByte(addr + 1) << 8)) & 0xffff;
    const result = signed ? signExtend16(value) : zeroExtend16(value);
    this.notifyMemoryObservers("read", addr, 2, result);
    return result;
  }

  writeHalf(address, value) {
    const addr = address >>> 0;
    this.assertAddressInStrictMemoryModel(addr, 2, "write");
    if (addr % 2 !== 0) {
      throw new MarsMemoryAccessError(
        translateText("Address not aligned on halfword boundary: {address}", { address: toHex(addr) }),
        "write",
        addr
      );
    }
    const numeric = zeroExtend16(value);
    this.writeBytesAtomic(addr, [
      numeric & 0xff,
      (numeric >>> 8) & 0xff
    ]);
    this.notifyMemoryObservers("write", addr, 2, numeric);
  }

  readWord(address) {
    const addr = address >>> 0;
    this.assertAddressInStrictMemoryModel(addr, 4, "read");
    if (addr % 4 !== 0) {
      throw new MarsMemoryAccessError(
        translateText("Address not aligned on word boundary: {address}", { address: toHex(addr) }),
        "read",
        addr
      );
    }
    const result = this.memoryWords.get(addr) ?? composeWord(this.getByte(addr), this.getByte(addr + 1), this.getByte(addr + 2), this.getByte(addr + 3));
    this.notifyMemoryObservers("read", addr, 4, result);
    return result;
  }

  writeWord(address, value) {
    const addr = address >>> 0;
    this.assertAddressInStrictMemoryModel(addr, 4, "write");
    if (addr % 4 !== 0) {
      throw new MarsMemoryAccessError(
        translateText("Address not aligned on word boundary: {address}", { address: toHex(addr) }),
        "write",
        addr
      );
    }
    const numeric = value >>> 0;
    this.writeBytesAtomic(addr, [
      numeric & 0xff,
      (numeric >>> 8) & 0xff,
      (numeric >>> 16) & 0xff,
      (numeric >>> 24) & 0xff
    ]);
    this.notifyMemoryObservers("write", addr, 4, numeric | 0);
  }

  readDoubleWords(address) {
    const addr = address >>> 0;
    this.assertAddressInStrictMemoryModel(addr, 8, "read");
    if (addr % 8 !== 0) {
      throw new MarsMemoryAccessError(
        translateText("address not aligned on doubleword boundary: {address}", { address: toHex(addr) }),
        "read",
        addr
      );
    }
    const lowWord = this.readWord(addr);
    const highWord = this.readWord((addr + 4) >>> 0);
    return { lowWord, highWord };
  }

  writeDoubleWords(address, lowWord, highWord) {
    const addr = address >>> 0;
    this.assertAddressInStrictMemoryModel(addr, 8, "write");
    if (addr % 8 !== 0) {
      throw new MarsMemoryAccessError(
        translateText("address not aligned on doubleword boundary: {address}", { address: toHex(addr) }),
        "write",
        addr
      );
    }
    const low = lowWord >>> 0;
    const high = highWord >>> 0;
    this.writeBytesAtomic(addr, [
      low & 0xff,
      (low >>> 8) & 0xff,
      (low >>> 16) & 0xff,
      (low >>> 24) & 0xff,
      high & 0xff,
      (high >>> 8) & 0xff,
      (high >>> 16) & 0xff,
      (high >>> 24) & 0xff
    ]);
    this.notifyMemoryObservers("write", addr, 4, low | 0);
    this.notifyMemoryObservers("write", (addr + 4) >>> 0, 4, high | 0);
  }
  readNullTerminatedString(address, maxLen = 16384) {
    let out = "";
    let cursor = address >>> 0;
    for (let i = 0; i < maxLen; i += 1) {
      const byte = this.readByte(cursor, false);
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
    this.llReservationAddress = null;
    const code = cause | 0;
    const exceptionLevelActive = (this.cop0Registers[COP0_REGISTERS.status] & (1 << 1)) !== 0;
    const preserved = this.cop0Registers[COP0_REGISTERS.cause]
      & (exceptionLevelActive ? 0xfffffc83 : 0x7ffffc83);
    this.setCop0Value(COP0_REGISTERS.cause, preserved | ((code & 0x1f) << 2));
    if (Number.isFinite(badAddress)) {
      this.setCop0Value(COP0_REGISTERS.vaddr, badAddress);
    }
    if (!exceptionLevelActive) {
      this.setCop0Value(COP0_REGISTERS.epc, this.pc);
    }
    this.setCop0Value(
      COP0_REGISTERS.status,
      this.cop0Registers[COP0_REGISTERS.status] | (1 << 1)
    );

    const handlerAddress = (this.memoryMap.exceptionHandlerAddress ?? EXCEPTION_HANDLER_ADDRESS) >>> 0;
    const hasHandler = this.program.textRowByAddress?.has(handlerAddress) ?? this.program.textRows.some((row) => row.address === handlerAddress);
    if (hasHandler) {
      return {
        nextPc: handlerAddress,
        message: message ?? translateText("exception {code}", { code }),
        exception: true,
        exceptionContextCaptured: !exceptionLevelActive
      };
    }

    return {
      halt: true,
      message: message ?? translateText("exception {code}", { code }),
      exception: true,
      exceptionContextCaptured: !exceptionLevelActive
    };
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
    const parsed = parseMacroInvocation(statement);
    if (!parsed || parsed.name !== name) return [];
    return parsed.args;
  }

  applyEqv(statement, eqvMap) {
    return replaceIdentifiersOutsideLiterals(statement, (identifier) => (
      eqvMap.has(identifier) ? eqvMap.get(identifier) : identifier
    ));
  }

  expandPseudoFromReference(statement, firstPass = false, allowExtendedAssembler = this.settings.extendedAssembler) {
    if (!allowExtendedAssembler) return null;

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

  expandPseudo(statement, firstPass = false, setOptions = null) {
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

    const high16Carry = (value) => ((value >>> 16) + ((value & 0x8000) ? 1 : 0)) & 0xffff;
    const high16Logical = (value) => (value >>> 16) & 0xffff;
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
      return [`lui $at, ${high16Logical(asUnsigned)}`, `ori $at, $at, ${low16(asUnsigned)}`];
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

    const allowExtendedAssembler = this.settings.extendedAssembler && (setOptions?.macro !== false);
    if (!allowExtendedAssembler) return [statement];

    if (!MANUAL_PSEUDO_EXPANSION_OPS.has(op)) {
      const referenceExpanded = this.expandPseudoFromReference(statement, firstPass, allowExtendedAssembler);
      if (Array.isArray(referenceExpanded) && referenceExpanded.length) return referenceExpanded;
    }

    switch (op) {
      case "nop":
        return ["sll $zero, $zero, 0"];
      case "move":
        return args.length >= 2 ? [`addu ${args[0]}, ${args[1]}, $zero`] : [statement];
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
        return [`lui ${args[0]}, ${high16Logical(asUnsigned)}`, `ori ${args[0]}, ${args[0]}, ${low16(asUnsigned)}`];
      }

      case "la": {
        if (args.length < 2) return [statement];
        const destination = args[0];
        const addressToken = String(args[1]).trim();
        const memMatch = /^(.*)\((\$?[\w\d]+)\)$/.exec(addressToken.replace(/\s+/g, ""));
        const high16Logical = (value) => ((value >>> 16) & 0xffff);

        if (memMatch) {
          const offsetToken = (memMatch[1] && memMatch[1].length > 0) ? memMatch[1] : "0";
          const baseToken = memMatch[2];
          const offsetValue = asImmediate(offsetToken);
          if (fitsSigned16(offsetValue)) return [`addiu ${destination}, ${baseToken}, ${offsetValue}`];
          if (fitsUnsigned16(offsetValue)) {
            return [`ori $at, $zero, ${offsetValue >>> 0}`, `addu ${destination}, ${baseToken}, $at`];
          }
          const offsetUnsigned = offsetValue >>> 0;
          return [
            `lui $at, ${high16Logical(offsetUnsigned)}`,
            `ori $at, $at, ${low16(offsetUnsigned)}`,
            `addu ${destination}, ${baseToken}, $at`
          ];
        }

        const directImmediate = parseImmediate(addressToken);
        if (!Number.isFinite(directImmediate)) {
          const resolvedValue = firstPass ? 0 : this.resolveValue(addressToken);
          const asUnsigned = (Number.isFinite(resolvedValue) ? resolvedValue : 0) >>> 0;
          return [
            `lui $at, ${high16Logical(asUnsigned)}`,
            `ori ${destination}, $at, ${low16(asUnsigned)}`
          ];
        }
        const value = directImmediate;
        if (fitsSigned16(value)) return [`addiu ${destination}, $zero, ${value}`];
        if (fitsUnsigned16(value)) return [`ori ${destination}, $zero, ${value >>> 0}`];
        const asUnsigned = value >>> 0;
        return [
          `lui $at, ${high16Logical(asUnsigned)}`,
          `ori ${destination}, $at, ${low16(asUnsigned)}`
        ];
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
        const compactMemoryToken = memoryToken.replace(/\s+/g, "");
        const memMatch = /^(.*)\((\$?[\w\d]+)\)$/.exec(compactMemoryToken);
        const hasParenSyntax = compactMemoryToken.includes("(") || compactMemoryToken.includes(")");

        if (memMatch) {
          const offsetToken = (memMatch[1] && memMatch[1].length > 0) ? memMatch[1] : "0";
          const baseToken = memMatch[2];
          if (this.resolveRegister(baseToken) === null) return [statement];
          const offsetImmediate = parseImmediate(offsetToken);
          if (Number.isFinite(offsetImmediate) && fitsSigned16(offsetImmediate)) return [statement];
          return [
            ...loadToAt(offsetToken, false),
            `addu $at, $at, ${baseToken}`,
            `${op} ${target}, 0($at)`
          ];
        }

        if (hasParenSyntax) return [statement];

        const absolute = parseImmediate(memoryToken);
        if (Number.isFinite(absolute) && fitsSigned16(absolute)) {
          return [`${op} ${target}, ${absolute}($zero)`];
        }

        let absoluteValue = Number.NaN;
        if (Number.isFinite(absolute)) {
          absoluteValue = absolute;
        } else if (!firstPass) {
          absoluteValue = asImmediate(memoryToken);
          if (!Number.isFinite(absoluteValue)) absoluteValue = Number.NaN;
        }

        if (Number.isFinite(absoluteValue) && fitsSigned16(absoluteValue)) {
          return [`${op} ${target}, ${absoluteValue}($zero)`];
        }

        if (!Number.isFinite(absoluteValue)) {
          return [
            "lui $at, 0",
            `${op} ${target}, 0($at)`
          ];
        }

        const absoluteUnsigned = absoluteValue >>> 0;
        const absoluteLow16Signed = signExtend16(absoluteUnsigned & 0xffff);
        return [
          `lui $at, ${high16Carry(absoluteUnsigned)}`,
          `${op} ${target}, ${absoluteLow16Signed}($at)`
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

    const enforceStrictSegmentRange = (segmentName, address, byteLength, contextLabel) => {
      if (!this.isStrictMarsCompatibilityEnabled()) return true;
      const start = address >>> 0;
      const size = Math.max(0, byteLength | 0);
      if (size === 0) return true;
      if (isStrictSegmentAddressValid(this.memoryMap, segmentName, start, size)) return true;
      errors.push({
        line: lineNumber,
        message: translateText(
          "Strict MARS segment limit exceeded for {context} at {address} ({bytes} byte(s)).",
          {
            context: contextLabel,
            address: toHex(start),
            bytes: size
          }
        )
      });
      return false;
    };

    const enforceStrictDataRange = (byteLength, contextLabel) => (
      enforceStrictSegmentRange(state.segment === "kdata" ? "kdata" : "data", getAddr(), byteLength, contextLabel)
    );

    const writeDataBytes = (address, values, contextLabel) => {
      try {
        this.writeBytesAtomic(address, values);
        Array.from(values ?? []).forEach((value, index) => {
          this.notifyMemoryObservers("write", ((address >>> 0) + index) >>> 0, 1, value & 0xff);
        });
        return true;
      } catch (error) {
        errors.push({
          line: lineNumber,
          message: translateText(
            "Cannot emit {context} at {address}: {message}",
            {
              context: contextLabel,
              address: toHex(address),
              message: error instanceof Error ? error.message : String(error)
            }
          )
        });
        return false;
      }
    };

    const writeIntegerBySize = (address, size, value) => {
      const numeric = Number(value) >>> 0;
      const addr = address >>> 0;
      if (size === 1) {
        return writeDataBytes(addr, [numeric & 0xff], directive);
      }
      if (size === 2) {
        return writeDataBytes(addr, [
          numeric & 0xff,
          (numeric >>> 8) & 0xff
        ], directive);
      }
      return writeDataBytes(addr, [
        numeric & 0xff,
        (numeric >>> 8) & 0xff,
        (numeric >>> 16) & 0xff,
        (numeric >>> 24) & 0xff
      ], directive);
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
      if (!enforceStrictDataRange(amount, directive)) return;
      setAddr(getAddr() + amount);
      return;
    }

      if (directive === ".set") {
        if (args.length < 1) {
          errors.push({ line: lineNumber, message: translateText('".set" requires at least one argument.') });
          return;
        }
      if (sizeOnly) {
        warnings.push({
          line: lineNumber,
          message: translateText("MARS currently ignores the .set directive.")
        });
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
          if (!enforceStrictSegmentRange("data", externalBase, size | 0, directive)) return;
          state.labelsMap.set(symbol, externalBase);
          state.externAddress = (state.externAddress + (size | 0)) >>> 0;
        }
      } else {
        if (!enforceStrictSegmentRange("data", state.externAddress >>> 0, size | 0, directive)) return;
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

      for (const arg of args) {
        const repetition = parseRepeatedArg(arg);
        if (!repetition) continue;

        for (let rep = 0; rep < repetition.repetitions; rep += 1) {
          if (!enforceStrictDataRange(size, directive)) return;
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
              if (size === 4) view.setFloat32(0, parsed, JAVA_MARS_ENDIANNESS === "little");
              else view.setFloat64(0, parsed, JAVA_MARS_ENDIANNESS === "little");
              const base = getAddr();
              const values = Array.from({ length: size }, (_unused, index) => view.getUint8(index));
              if (!writeDataBytes(base, values, directive)) return;
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
          if (!sizeOnly && !writeIntegerBySize(getAddr(), size, value)) return;
          setAddr(getAddr() + size);
        }
      }
      return;
    }

    if (directive === ".ascii" || directive === ".asciiz") {
      for (const arg of args) {
        const decoded = parseStringLiteral(arg);
        if (decoded === null) {
          errors.push({ line: lineNumber, message: translateText("Invalid string literal '{arg}'.", { arg }) });
          continue;
        }
        const totalBytes = decoded.length + (directive === ".asciiz" ? 1 : 0);
        if (!enforceStrictDataRange(totalBytes, directive)) return;
        const base = getAddr();
        if (!sizeOnly) {
          const values = Array.from(
            { length: decoded.length },
            (_unused, index) => decoded.charCodeAt(index) & 0xff
          );
          if (directive === ".asciiz") values.push(0);
          if (!writeDataBytes(base, values, directive)) return;
        }
        setAddr(base + totalBytes);
      }
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
      const candidates = Array.from(new Set([
        pathJoinLike(pathDirnameLike(currentFile), cleanRequest),
        cleanRequest
      ].filter(Boolean)));
      for (const candidate of candidates) {
        if (includeMap.has(candidate)) return candidate;
      }
      return "";
    };

    const walk = (fileName, stack = []) => {
      const normalizedName = normalizePathLike(fileName);
      const sourceText = includeMap.get(normalizedName);
      if (typeof sourceText !== "string") {
        errors.push({
          line: 0,
          message: translateText("Error reading include file {includeName}", {
            includeName: projectPathBasename(normalizedName)
          })
        });
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
            const includeName = normalizePathLike(includeMatch[1]) || includeMatch[1];
            errors.push({
              line: lineNumber,
              message: translateText("Error reading include file {includeName}", {
                includeName
              })
            });
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

      const parsedInvocation = parseMacroInvocation(eqvApplied);
      if (!parsedInvocation) {
        output.push({ lineNumber: lineObj.lineNumber, fileName: lineObj.fileName, statement: eqvApplied });
        return;
      }
      const macroName = parsedInvocation.name;
      const args = parsedInvocation.args;
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
          let expanded = replaceMacroParametersOutsideLiterals(entry.statement, argMap);
          labelSet.forEach((label) => {
            expanded = replaceIdentifiersOutsideLiterals(expanded, (identifier) => (
              identifier === label ? `${label}${suffix}` : identifier
            ));
          });
          emit({ lineNumber: lineObj.lineNumber, fileName: lineObj.fileName, statement: expanded }, depth + 1);
        });
        return;
      }

      const hasMacroWithDifferentArity = Array.from(macros.keys()).some((macroKey) => (
        macroKey.startsWith(`${macroName}/`)
      ));
      if (hasMacroWithDifferentArity) {
        errors.push({
          line: lineObj.lineNumber,
          message: translateText('Forward reference or invalid parameters for macro "{macroName}"', {
            macroName
          })
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
    const finalizeAssemblyFailure = () => {
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

      this.program.labels = new Map();
      this.program.textRows = [];
      this.program.textRowByAddress = new Map();
      this.program.warnings = warnings;
      this.program.errors = errors;
      this.memoryBytes = new Map();
      this.memoryWords = new Map();
      this.reservedHeapMappedBytes = 0;
      this.lastMemoryWriteAddress = null;
      this.assembled = false;
      this.halted = false;
      this.pc = this.memoryMap.textBase >>> 0;

      return {
        ok: false,
        warnings,
        errors
      };
    };

    if (errors.length > 0) {
      return finalizeAssemblyFailure();
    }

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
      labelsMap: labels,
      setOptions: {
        reorder: true,
        at: true,
        macro: true
      }
    };
    const strictEnabled = this.isStrictMarsCompatibilityEnabled();
    const validateStrictSegmentRange = (segmentName, address, byteLength, lineNumber, contextLabel) => {
      if (!strictEnabled) return true;
      const start = address >>> 0;
      const size = Math.max(0, byteLength | 0);
      if (size === 0) return true;
      if (isStrictSegmentAddressValid(this.memoryMap, segmentName, start, size)) return true;
      errors.push({
        line: lineNumber,
        message: translateText(
          "Strict MARS segment limit exceeded for {context} at {address} ({bytes} byte(s)).",
          {
            context: contextLabel,
            address: toHex(start),
            bytes: size
          }
        )
      });
      return false;
    };
    const updateSegmentAddress = (state, directive, argToken, lineNumber = 0) => {
      const parsed = argToken != null && argToken !== "" ? this.resolveValue(argToken) : Number.NaN;
      const explicit = Number.isFinite(parsed) ? (parsed >>> 0) : null;
      if (directive === ".text") {
        state.segment = "text";
        if (explicit !== null) {
          if (!validateStrictSegmentRange("text", explicit, 1, lineNumber, ".text directive")) return false;
          state.textAddress = explicit;
        }
      } else if (directive === ".data") {
        state.segment = "data";
        if (explicit !== null) {
          if (!validateStrictSegmentRange("data", explicit, 1, lineNumber, ".data directive")) return false;
          state.dataAddress = explicit;
        }
        state.autoAlignData = true;
        state.currentDataDirective = ".word";
      } else if (directive === ".ktext") {
        state.segment = "ktext";
        if (explicit !== null) {
          if (!validateStrictSegmentRange("ktext", explicit, 1, lineNumber, ".ktext directive")) return false;
          state.kernelTextAddress = explicit;
        }
      } else if (directive === ".kdata") {
        state.segment = "kdata";
        if (explicit !== null) {
          if (!validateStrictSegmentRange("kdata", explicit, 1, lineNumber, ".kdata directive")) return false;
          state.kernelDataAddress = explicit;
        }
        state.autoAlignKernelData = true;
        state.currentDataDirective = ".word";
      }
      return true;
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
    const hasAtRegister = (statementText) => /(^|[^\w$.])\$at([^\w$.]|$)/i.test(String(statementText || ""));
    const emitsAtFromPseudo = (sourceStatement, expandedStatements) => {
      const sourceUsesAt = hasAtRegister(sourceStatement);
      return expandedStatements.some((item) => hasAtRegister(item)) && !sourceUsesAt;
    };

    lines.forEach((entry) => {
      let statement = entry.statement;
      if (!statement) return;

      const labelMatch = /^([A-Za-z_.$][\w.$]*):/.exec(statement);
      if (labelMatch) {
        const label = labelMatch[1];
        let address = pass1State.textAddress;
        if (pass1State.segment === "data") address = predictAlignedDataLabelAddress(pass1State, statement) ?? pass1State.dataAddress;
        else if (pass1State.segment === "ktext") address = pass1State.kernelTextAddress;
        else if (pass1State.segment === "kdata") address = predictAlignedDataLabelAddress(pass1State, statement) ?? pass1State.kernelDataAddress;

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
        if (!updateSegmentAddress(pass1State, directive, args[0], entry.lineNumber)) return;
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
      const expanded = this.expandPseudo(statement, true, pass1State.setOptions);
      const validationBaseAddress = pass1State.segment === "text" ? pass1State.textAddress : pass1State.kernelTextAddress;
      for (let i = 0; i < expanded.length; i += 1) {
        const basic = expanded[i];
        const address = (validationBaseAddress + (i * 4)) >>> 0;
        if (!this.validateInstructionStatement(basic, entry.lineNumber, address, errors, { allowUnresolvedSymbols: true })) {
          return;
        }
      }
      if (pass1State.segment === "text") {
        if (!validateStrictSegmentRange("text", pass1State.textAddress, expanded.length * 4, entry.lineNumber, "instruction expansion")) return;
        pass1State.textAddress = (pass1State.textAddress + expanded.length * 4) >>> 0;
      } else {
        if (!validateStrictSegmentRange("ktext", pass1State.kernelTextAddress, expanded.length * 4, entry.lineNumber, "instruction expansion")) return;
        pass1State.kernelTextAddress = (pass1State.kernelTextAddress + expanded.length * 4) >>> 0;
      }
    });


    if (errors.length > 0) {
      return finalizeAssemblyFailure();
    }

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
      labelsMap: labels,
      setOptions: {
        reorder: true,
        at: true,
        macro: true
      }
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
        if (!updateSegmentAddress(pass2State, directive, args[0], entry.lineNumber)) return;
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

      const expanded = this.expandPseudo(statement, false, pass2State.setOptions);
      const currentTextAddress = pass2State.segment === "text" ? pass2State.textAddress : pass2State.kernelTextAddress;
      const currentTextSegment = pass2State.segment === "text" ? "text" : "ktext";
      if (!validateStrictSegmentRange(currentTextSegment, currentTextAddress, expanded.length * 4, entry.lineNumber, "instruction emission")) {
        return;
      }
      for (let i = 0; i < expanded.length; i += 1) {
        const basic = expanded[i];
        const address = (currentTextAddress + (i * 4)) >>> 0;
        if (!this.validateInstructionStatement(basic, entry.lineNumber, address, errors, { allowUnresolvedSymbols: false })) {
          return;
        }
      }
      for (let index = 0; index < expanded.length; index += 1) {
        const basic = expanded[index];
        const address = pass2State.segment === "text" ? pass2State.textAddress : pass2State.kernelTextAddress;
        const planRow = this.buildExecutionPlanRow({
          address: address >>> 0,
          line: entry.lineNumber,
          basic
        });
        const machineCodeWord = encodeInstructionWordFromPlanRow(planRow);
        if (machineCodeWord == null) {
          errors.push({
            line: entry.lineNumber,
            message: translateText(
              "Instruction '{instruction}' has no machine-code encoding.",
              { instruction: basic }
            )
          });
          break;
        }
        try {
          this.writeAssemblyBytesAtomic(address, [
            machineCodeWord & 0xff,
            (machineCodeWord >>> 8) & 0xff,
            (machineCodeWord >>> 16) & 0xff,
            (machineCodeWord >>> 24) & 0xff
          ]);
        } catch (error) {
          errors.push({
            line: entry.lineNumber,
            message: translateText(
              "Cannot emit instruction at {address}: {message}",
              {
                address: toHex(address),
                message: error instanceof Error ? error.message : String(error)
              }
            )
          });
          break;
        }
        textRows.push({
          index: textRows.length,
          address: address >>> 0,
          line: entry.lineNumber,
          source: index === 0 ? statement : "",
          basic,
          code: toHex(machineCodeWord),
          machineCodeHex: toHex(machineCodeWord)
        });

        if (pass2State.segment === "text") {
          pass2State.textAddress = (pass2State.textAddress + 4) >>> 0;
        } else {
          pass2State.kernelTextAddress = (pass2State.kernelTextAddress + 4) >>> 0;
        }
      }
    });

    const writeFixupValue = (address, size, value) => {
      const addr = address >>> 0;
      const numeric = Number(value) >>> 0;
      let values;
      if (size === 1) {
        values = [numeric & 0xff];
      } else if (size === 2) {
        values = [
          numeric & 0xff,
          (numeric >>> 8) & 0xff
        ];
      } else {
        values = [
          numeric & 0xff,
          (numeric >>> 8) & 0xff,
          (numeric >>> 16) & 0xff,
          (numeric >>> 24) & 0xff
        ];
      }
      this.writeBytesAtomic(addr, values);
    };

    unresolvedFixups.forEach((fixup) => {
      const resolved = this.resolveValue(fixup.token);
      if (!Number.isFinite(resolved)) {
        errors.push({ line: fixup.line, message: translateText("Cannot resolve '{token}' in data directive.", {
          token: fixup.token
        }) });
        return;
      }
      try {
        writeFixupValue(fixup.address, fixup.size, resolved);
      } catch (error) {
        errors.push({
          line: fixup.line,
          message: translateText(
            "Cannot emit data fixup at {address}: {message}",
            {
              address: toHex(fixup.address),
              message: error instanceof Error ? error.message : String(error)
            }
          )
        });
      }
    });
    if (errors.length > 0) {
      return finalizeAssemblyFailure();
    }

    this.program.labels = labels;
    this.program.textRows = textRows;
    this.program.textRowByAddress = new Map(textRows.map((row) => [row.address >>> 0, row]));
    this.program.warnings = warnings;
    this.program.errors = errors;
    this.lastMemoryWriteAddress = null;

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
      if (this.breakpointResumeAddress === key) this.breakpointResumeAddress = null;
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
    const includeRuntimeEvent = options.includeRuntimeEvent === true;
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

    const currentPc = this.pc >>> 0;
    const resumingPastBreakpoint = this.breakpointResumeAddress === currentPc;
    if (this.breakpointResumeAddress != null && !resumingPastBreakpoint) {
      this.breakpointResumeAddress = null;
    }

    if (this.breakpoints.has(currentPc) && !resumingPastBreakpoint) {
      this.breakpointResumeAddress = currentPc;
      return attachSnapshot({
        ok: true,
        done: false,
        stoppedOnBreakpoint: true,
        message: translateText("Breakpoint hit at {address}.", { address: toHex(currentPc) })
      });
    }

    const row = this.program.textRowByAddress?.get(this.pc) ?? this.program.textRows.find((entry) => entry.address === this.pc);

    if (!row) {
      this.breakpointResumeAddress = null;
      this.halted = true;
      return attachSnapshot({
        ok: true,
        done: true,
        message: translateText("Program completed."),
        haltReason: "cliff"
      });
    }

    const machineWord = (
      this.memoryWords.get(currentPc)
      ?? composeWord(
        this.getByte(currentPc),
        this.getByte((currentPc + 1) >>> 0),
        this.getByte((currentPc + 2) >>> 0),
        this.getByte((currentPc + 3) >>> 0)
      )
    ) >>> 0;
    const cachedInstruction = this.decodedInstructionCache.get(currentPc);
    const decodedInstruction = cachedInstruction?.machineWord === machineWord
      ? cachedInstruction.statement
      : decodeInstructionWordToStatement(machineWord, currentPc);
    if (cachedInstruction?.machineWord !== machineWord) {
      this.decodedInstructionCache.set(currentPc, {
        machineWord,
        statement: decodedInstruction
      });
    }
    const historyCapture = this.prepareExecutionHistoryCapture();
    const previousState = (historyCapture.capture || includeRuntimeEvent)
      ? this.captureState({
          captureMemory: historyCapture.capture,
          memoryBudgetBytes: historyCapture.budgetBytes
        })
      : null;
    this.activeHistoryJournal = previousState;
    this.activeRuntimeMemoryAccesses = includeRuntimeEvent ? [] : null;
    this.lastMemoryWriteAddress = null;
    let runtimeMemoryAccesses = [];
    let result;
    try {
      result = decodedInstruction
        ? this.executeInstruction(decodedInstruction)
        : this.raiseException(
            EXCEPTION_CODES.RESERVED,
            translateText("Unsupported machine instruction {instruction}.", { instruction: toHex(machineWord) })
          );
    } catch (error) {
      if (
        error instanceof MarsMemoryAccessError
        || (error && typeof error === "object" && (error.memoryAccessKind === "read" || error.memoryAccessKind === "write"))
      ) {
        const accessKind = error.memoryAccessKind === "write" ? "write" : "read";
        result = this.raiseException(
          accessKind === "write" ? EXCEPTION_CODES.ADDRESS_STORE : EXCEPTION_CODES.ADDRESS_LOAD,
          error?.message ?? translateText("Memory exception."),
          Number.isFinite(error?.badAddress) ? (error.badAddress >>> 0) : null
        );
      } else {
        result = this.raiseException(EXCEPTION_CODES.RESERVED, error?.message ?? translateText("Runtime exception."));
      }
    } finally {
      runtimeMemoryAccesses = Array.isArray(this.activeRuntimeMemoryAccesses)
        ? this.activeRuntimeMemoryAccesses
        : [];
      this.activeRuntimeMemoryAccesses = null;
    }

    if (result?.waitForInput) {
      this.activeHistoryJournal = null;
      return attachSnapshot({
        ok: true,
        done: false,
        waitingForInput: true,
        executedAddress: currentPc,
        executedInstruction: decodedInstruction ?? "",
        machineWord,
        message: result.message ?? translateText("Waiting for input.")
      });
    }
    this.breakpointResumeAddress = null;

    this.steps += 1;

    const sequentialPc = (this.pc + 4) >>> 0;
    const pendingBranchTarget = this.delayedBranchTarget == null ? null : (this.delayedBranchTarget >>> 0);
    const opcodeToken = tokenizeStatement(decodedInstruction)[0]?.toLowerCase() ?? "";
    const hasDelaySlot = ["beq", "bne", "bgtz", "blez", "bltz", "bgez", "bgezal", "bltzal", "bc1f", "bc1t", "j", "jal", "jr", "jalr"].includes(opcodeToken);

    let resolvedNextPc = sequentialPc;

    if (
      result.exception
      && result.exceptionContextCaptured !== false
      && this.settings.delayedBranching
      && pendingBranchTarget !== null
    ) {
      this.setCop0Value(
        COP0_REGISTERS.cause,
        (this.cop0Registers[COP0_REGISTERS.cause] >>> 0) | 0x80000000
      );
      this.setCop0Value(COP0_REGISTERS.epc, (this.pc - 4) >>> 0);
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
    if (!result.exception && !result.halt && (this.pc & 0x3) !== 0) {
      const invalidPc = this.pc >>> 0;
      const fetchException = this.raiseException(
        EXCEPTION_CODES.ADDRESS_LOAD,
        translateText("Address not aligned on word boundary: {address}", { address: toHex(invalidPc) }),
        invalidPc
      );
      this.delayedBranchTarget = null;
      result = { ...result, ...fetchException };
      if (typeof fetchException.nextPc === "number") {
        this.pc = fetchException.nextPc >>> 0;
      }
    }
    if (result.halt) {
      this.halted = true;
    }

    const hasNextInstruction = this.program.textRowByAddress?.has(this.pc) ?? this.program.textRows.some((entry) => entry.address === this.pc);
    let fellOffBottom = false;
    if (!hasNextInstruction && !this.halted) {
      this.halted = true;
      fellOffBottom = true;
      result = {
        ...result,
        haltReason: result.haltReason ?? "cliff",
        message: result.message ?? translateText("Program completed.")
      };
    }

    const sleepMs = Number.isFinite(result.sleepMs) ? Math.max(0, result.sleepMs | 0) : 0;
    this.notifyInstructionObservers({
      type: "instruction",
      executedAddress: currentPc,
      executedInstruction: decodedInstruction ?? "",
      machineWord,
      exception: result.exception === true,
      haltReason: result.haltReason
    });
    let runtimeEvent = null;
    if (previousState) {
      const journal = this.finalizeCapturedState(previousState);
      if (historyCapture.capture) this.pushExecutionHistory(journal);
      if (includeRuntimeEvent) {
        runtimeEvent = this.createRuntimeEvent(journal, {
          executedAddress: currentPc,
          executedInstruction: decodedInstruction ?? "",
          machineWord,
          controlTransferTarget: result.nextPc,
          memoryAccesses: runtimeMemoryAccesses,
          exception: result.exception === true,
          haltReason: result.haltReason
        });
      }
    }
    this.activeHistoryJournal = null;

    return attachSnapshot({
      ok: true,
      done: this.halted,
      sleepMs,
      runIo: result.runIo === true,
      exception: result.exception === true,
      haltReason: result.haltReason,
      executedAddress: currentPc,
      executedInstruction: decodedInstruction ?? "",
      machineWord,
      runtimeEvent,
      message: result.message ?? translateText("Executed line {line}.", { line: row.line }),
      messageCode: fellOffBottom || result.message ? undefined : "executed-line"
    });
  }
  go(maxSteps = 500) {
    if (!this.assembled) {
      return { ok: false, message: translateText("Program is not assembled.") };
    }

    const initialStepCount = this.steps;
    let executed = 0;
    let lastResult = null;

    while (executed < maxSteps) {
      const stepResult = this.step();
      lastResult = stepResult;

      if (!stepResult.ok) {
        return stepResult;
      }

      if (
        stepResult.stoppedOnBreakpoint
        || stepResult.done
        || stepResult.waitingForInput
        || stepResult.haltReason
      ) {
        break;
      }

      executed += 1;
    }

    const stoppedOnBreakpoint = lastResult?.stoppedOnBreakpoint === true;
    const waitingForInput = lastResult?.waitingForInput === true;
    const exception = lastResult?.exception === true && lastResult?.done === true;
    const haltReason = lastResult?.haltReason ?? null;
    const stepLimitReached = (
      !this.halted
      && !stoppedOnBreakpoint
      && !waitingForInput
      && !exception
      && haltReason === null
      && executed >= maxSteps
    );

    return {
      ok: true,
      done: this.halted,
      stoppedOnBreakpoint,
      waitingForInput,
      exception,
      haltReason,
      stepLimitReached,
      message: lastResult?.message ?? translateText("Execution stopped."),
      stepsExecuted: Math.max(0, this.steps - initialStepCount),
      snapshot: this.getSnapshot()
    };
  }

  backstep() {
    if (this.executionHistory.length === 0) {
      return { ok: false, message: translateText("No backstep history available.") };
    }

    const stepBefore = this.steps | 0;
    const pcBefore = this.pc >>> 0;
    const previousState = this.executionHistory.pop();
    const estimatedBytes = Number(previousState?.estimatedBytes);
    if (Number.isFinite(estimatedBytes) && estimatedBytes > 0) {
      this.executionHistoryBytes = Math.max(0, this.executionHistoryBytes - Math.floor(estimatedBytes));
    }
    this.restoreState(previousState);

    return {
      ok: true,
      message: translateText("Returned to {address}.", { address: toHex(this.pc) }),
      runtimeEvent: {
        type: "backstep",
        stepBefore,
        stepAfter: this.steps | 0,
        pcBefore,
        pcAfter: this.pc >>> 0,
        backstepDepth: this.executionHistory.length,
        historyStartStep: this.getBackstepHistoryStartStep()
      },
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
      backstepHistoryStartStep: this.getBackstepHistoryStartStep(),
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
      llReservationAddress: this.llReservationAddress == null ? null : (this.llReservationAddress >>> 0),
      lastMemoryWriteAddress: this.lastMemoryWriteAddress == null ? null : (this.lastMemoryWriteAddress >>> 0),
      cop0: Array.from(this.cop0Registers),
      cop1: Array.from(this.cop1Registers),
      fpuFlags: Array.from(this.fpuConditionFlags),
      fpuControlStatus: this.getFpuControlStatus(),
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
      const safeLength = this.assertBoundedSyscallAddressRange(
        address,
        Math.max(0, Number(length)),
        "buffer"
      );
      if (safeLength > 0) {
        this.assertAddressInStrictMemoryModel(address, safeLength, "read");
      }
      const output = new Uint8Array(safeLength);
      for (let i = 0; i < safeLength; i += 1) output[i] = this.getByte((address + i) >>> 0) & 0xff;
      return output;
    };
    const writeBufferBytes = (address, values) => {
      const sourceLength = this.getByteArrayLength(values);
      this.assertBoundedSyscallAddressRange(address, sourceLength, "buffer");
      const bytes = Array.from(values ?? [], (value) => value & 0xff);
      if (!bytes.length) return;
      this.writeBytesAtomic(address, bytes);
      bytes.forEach((value, index) => {
        this.notifyMemoryObservers("write", ((address >>> 0) + index) >>> 0, 1, value);
      });
    };

    const parseStrictInteger = (text) => {
      const raw = String(text ?? "").trim();
      if (!/^[+-]?\d+$/.test(raw)) return null;
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) return null;
      if (parsed < -2147483648 || parsed > 2147483647) return null;
      return parsed | 0;
    };
    const parseStrictFiniteFloat = (text) => {
      const raw = String(text ?? "").trim();
      if (!/^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/.test(raw)) return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
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
    const parseWhitespaceTokens = (text) => {
      const normalized = String(text ?? "").trim();
      return normalized.length ? normalized.split(/\s+/g) : [];
    };
    const consumeConsoleLine = () => {
      if (this.stdinClosed === true) return { eof: true, value: null };
      const inputResult = promptInput("ReadLine", "", { kind: "read-line" });
      if (inputResult.waitForInput) return inputResult;
      if (inputResult.cancelled) {
        this.stdinClosed = true;
        return { eof: true, value: null };
      }
      const value = String(inputResult.value ?? "");
      if (value.trim() === WEBMARS_RUNIO_EOF_MARKER) {
        this.stdinClosed = true;
        return { eof: true, value: null };
      }
      return { value };
    };
    const allocateStringArray = (items = []) => {
      const strings = (Array.isArray(items) ? items : []).map((entry) => String(entry ?? ""));
      this.assertBoundedSyscallLength(
        strings.length,
        this.getSyscallArrayLimitElements(),
        "string array"
      );
      strings.forEach((entry) => {
        this.assertBoundedSyscallLength(
          entry.length,
          this.getSyscallStringLimitCharacters(),
          "string"
        );
      });
      return this.allocateWordArray(strings.map((entry) => this.allocateCString(entry)));
    };
    const getManagedFile = (handleValue) => this.openFiles.get(handleValue | 0) || null;
    const isManagedFileClosed = (handleValue) => {
      const handle = handleValue | 0;
      return handle === 0 || !this.openFiles.has(handle);
    };
    const openReadonlyManagedFile = (path) => {
      const filename = String(path ?? "");
      const existing = this.getVirtualFileBytes(filename);
      if (existing === null) return 0;
      const fd = this.allocateFileDescriptor();
      if (fd < 0) return 0;
      this.markOpenFilesDirty();
      this.openFiles.set(fd, {
        fd,
        name: filename,
        flag: FILE_OPEN_RDONLY,
        cursor: 0,
        stdio: false,
        data: cloneByteArray(existing)
      });
      return fd | 0;
    };
    const readManagedFileLine = (file) => {
      if (!file || typeof file !== "object") return "";
      const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(0);
      let start = Math.max(0, file.cursor | 0);
      let end = start;
      while (end < data.length && data[end] !== 10 && data[end] !== 13) end += 1;
      const line = bytesToText(data.slice(start, end));
      if (end < data.length && data[end] === 13) end += 1;
      if (end < data.length && data[end] === 10) end += 1;
      this.markOpenFilesDirty();
      file.cursor = end | 0;
      return line;
    };
    const renderFormatString = (formatAddress, argAddress, argCount) => {
      const formatText = this.readNullTerminatedString(formatAddress >>> 0);
      const safeArgCount = this.assertBoundedSyscallLength(
        Math.max(0, Number(argCount)),
        this.getSyscallArrayLimitElements(),
        "format argument"
      );
      let output = "";
      let cursor = 0;
      let argIndex = 0;
      const appendOutput = (value) => {
        const fragment = String(value ?? "");
        this.assertBoundedSyscallLength(
          output.length + fragment.length,
          this.getSyscallStringLimitCharacters(),
          "formatted string"
        );
        output += fragment;
      };
      while (cursor < formatText.length) {
        const ch = formatText[cursor];
        if (ch !== "%") {
          appendOutput(ch);
          cursor += 1;
          continue;
        }
        if ((cursor + 1) >= formatText.length) {
          throw new Error("Format string cannot end with '%'.");
        }
        const spec = formatText[cursor + 1];
        if (spec === "%") {
          appendOutput("%");
          cursor += 2;
          continue;
        }
        if (argIndex >= safeArgCount) {
          throw new Error("Insufficient arguments for format string.");
        }
        const rawValue = this.readWord(((argAddress >>> 0) + (argIndex * 4)) >>> 0) | 0;
        if (spec === "s") appendOutput(this.readNullTerminatedString(rawValue >>> 0));
        else if (spec === "d") appendOutput(String(rawValue | 0));
        else if (spec === "c") appendOutput(String.fromCharCode(rawValue & 0xff));
        else throw new Error(`Unsupported format specifier '%${spec}'.`);
        argIndex += 1;
        cursor += 2;
      }
      return output;
    };
    const registerArgumentBinding = (kind, name, address) => {
      const normalizedName = String(name ?? "").trim();
      if (!normalizedName || !Number.isFinite(address)) return;
      this.markArgsRegistryDirty();
      const entry = {
        kind: String(kind || ""),
        name: normalizedName,
        address: address >>> 0
      };
      const existingIndex = this.argsRegistry.findIndex((item) => item.kind === entry.kind && item.name === entry.name && item.address === entry.address);
      if (existingIndex >= 0) this.argsRegistry[existingIndex] = entry;
      else this.argsRegistry.push(entry);
    };
    const performArgsParse = () => {
      const remaining = [];
      const tokens = Array.isArray(this.lastProgramArguments) ? [...this.lastProgramArguments] : [];
      for (let i = 0; i < tokens.length; i += 1) {
        const token = String(tokens[i] ?? "");
        if (!token.startsWith("-") || token.length <= 1) {
          remaining.push(token);
          continue;
        }
        const optionName = token.slice(1);
        const matches = this.argsRegistry.filter((entry) => entry.name === optionName);
        if (!matches.length) {
          remaining.push(token);
          continue;
        }
        let consumed = false;
        matches.forEach((entry) => {
          if (entry.kind === "flag") {
            this.writeWord(entry.address, 1);
            consumed = true;
          }
        });
        if (consumed) continue;
        const nextToken = tokens[i + 1];
        if (nextToken == null) return null;
        const stringEntry = matches.find((entry) => entry.kind === "string");
        if (stringEntry) {
          this.writeWord(stringEntry.address, this.allocateCString(String(nextToken)));
          i += 1;
          continue;
        }
        const intEntry = matches.find((entry) => entry.kind === "int");
        if (intEntry) {
          const parsed = parseStrictInteger(String(nextToken));
          if (parsed === null) return null;
          this.writeWord(intEntry.address, parsed | 0);
          i += 1;
          continue;
        }
        remaining.push(token);
      }
      return remaining;
    };
    const buildArgsResult = (remainingArgs) => {
      const argvAddress = allocateStringArray(remainingArgs);
      const structAddress = this.reserveHeapBytes(8, 4);
      this.writeWord(structAddress, remainingArgs.length | 0);
      this.writeWord((structAddress + 4) >>> 0, argvAddress >>> 0);
      return structAddress >>> 0;
    };
    const parseImagePayload = (bytes) => {
      const sourceLength = this.getByteArrayLength(bytes);
      this.assertBoundedSyscallLength(
        sourceLength,
        this.getSyscallBufferLimitBytes(),
        "image payload"
      );
      const text = bytesToText(bytes);
      const parsed = JSON.parse(text);
      if (parsed?.kind !== "webmars-image-v1") {
        throw new Error("Unsupported image payload.");
      }
      const dimensions = this.getBoundedImageDimensions(parsed.width, parsed.height, "image payload");
      if (!Array.isArray(parsed.data) || parsed.data.length !== dimensions.pixelCount) {
        throw new Error("Unsupported image payload.");
      }
      const data = new Array(dimensions.pixelCount);
      for (let index = 0; index < dimensions.pixelCount; index += 1) {
        data[index] = parsed.data[index] | 0;
      }
      return { width: dimensions.width, height: dimensions.height, data };
    };

    try {
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
        this.setRegisterValue(2, clamp32(parsed));
        return {};
      }
      case 6: {
        const inputResult = promptInput("ReadFloat syscall", "0", { kind: "read-float" });
        if (inputResult.waitForInput) return inputResult;
        if (inputResult.cancelled) return { halt: true, message: "", haltReason: "user" };
        const parsed = parseStrictFiniteFloat(inputResult.value);
        if (parsed === null) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid float input (syscall 6)"));
        }
        this.setFloat32(0, parsed);
        return {};
      }
      case 7: {
        const inputResult = promptInput("ReadDouble syscall", "0", { kind: "read-double" });
        if (inputResult.waitForInput) return inputResult;
        if (inputResult.cancelled) return { halt: true, message: "", haltReason: "user" };
        const parsed = parseStrictFiniteFloat(inputResult.value);
        if (parsed === null) {
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
        this.assertBoundedSyscallAddressRange(
          address,
          maxLength + (addNullByte ? 1 : 0),
          "read string buffer"
        );
        const inputResult = promptInput("ReadString syscall", "", { kind: "read-string", maxLength });
        if (inputResult.waitForInput) return inputResult;
        if (inputResult.cancelled) return { halt: true, message: "", haltReason: "user" };
        const input = inputResult.value ?? "";
        const size = Math.min(maxLength, input.length);
        const output = Array.from(
          { length: size },
          (_unused, index) => input.charCodeAt(index) & 0xff
        );
        if (size < maxLength) {
          output.push("\n".charCodeAt(0));
        }
        if (addNullByte) output.push(0);
        writeBufferBytes(address, output);
        return {};
      }
      case 9: {
        const bytes = this.registers[4] | 0;
        if (bytes < 0) return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("sbrk with negative byte count"));
        const currentHeap = this.heapPointer >>> 0;
        const alignedHeap = Math.ceil(currentHeap / 4) * 4;
        const nextHeap = alignedHeap + bytes;
        if (
          !Number.isSafeInteger(alignedHeap)
          || !Number.isSafeInteger(nextHeap)
          || alignedHeap > 0xffffffff
          || nextHeap > 0xffffffff
        ) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("sbrk exceeds the address space"));
        }
        try {
          this.growHeapToChecked(nextHeap);
        } catch (error) {
          return this.raiseException(
            EXCEPTION_CODES.SYSCALL,
            error instanceof Error ? error.message : String(error)
          );
        }
        this.setRegisterValue(2, clamp32(alignedHeap));
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
        this.setRegisterValue(2, value.charCodeAt(0) & 0xff);
        return {};
      }
      case 13: {
        const filename = readMessage(4);
        const flag = this.registers[5] | 0;
        if (![FILE_OPEN_RDONLY, FILE_OPEN_WRONLY, FILE_OPEN_APPEND].includes(flag)) {
          this.setRegisterValue(2, -1);
          return {};
        }
        if (this.filenameAlreadyOpen(filename)) {
          this.setRegisterValue(2, -1);
          return {};
        }

        const fd = this.allocateFileDescriptor();
        if (fd < 0) {
          this.setRegisterValue(2, -1);
          return {};
        }

        let existing = this.getVirtualFileBytes(filename);
        if (flag === FILE_OPEN_RDONLY) {
          if (existing === null) {
            this.setRegisterValue(2, -1);
            return {};
          }
        } else if (flag === FILE_OPEN_WRONLY) {
          existing = new Uint8Array(0);
          if (!this.setVirtualFileBytes(filename, existing)) {
            this.setRegisterValue(2, -1);
            return {};
          }
        } else if (flag === FILE_OPEN_APPEND) {
          if (existing === null) existing = new Uint8Array(0);
          if (!this.setVirtualFileBytes(filename, existing)) {
            this.setRegisterValue(2, -1);
            return {};
          }
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
        this.setRegisterValue(2, fd);
        return {};
      }
      case 14: {
        const fd = this.registers[4] | 0;
        const address = this.registers[5] >>> 0;
        const length = Math.max(0, this.registers[6] | 0);
        this.assertBoundedSyscallAddressRange(address, length, "read buffer");
        let payload = new Uint8Array(0);
        let sourceFile = null;
        let sourceNextCursor = null;

        if (fd === STDIN_FD) {
          const inputResult = promptInput("Read syscall (fd 0)", "", { kind: "read-fd0", length });
          if (inputResult.waitForInput) return inputResult;
          payload = textToBytes(String(inputResult.value ?? "")).slice(0, length);
        } else {
          const file = this.openFiles.get(fd);
          if (!file || file.flag !== FILE_OPEN_RDONLY) {
            this.setRegisterValue(2, -1);
            return {};
          }
          const available = Math.max(0, file.data.length - file.cursor);
          const count = Math.min(length, available);
          payload = file.data.slice(file.cursor, file.cursor + count);
          sourceFile = file;
          sourceNextCursor = file.cursor + count;
        }

        writeBufferBytes(address, payload);
        if (sourceFile && sourceNextCursor !== null) {
          this.markOpenFilesDirty();
          sourceFile.cursor = sourceNextCursor;
        }
        this.setRegisterValue(2, payload.length);
        return {};
      }
      case 15: {
        const fd = this.registers[4] | 0;
        const address = this.registers[5] >>> 0;
        const length = Math.max(0, this.registers[6] | 0);
        const output = readBufferBytes(address, length);

        if (fd === STDOUT_FD || fd === STDERR_FD) {
          this.setRegisterValue(2, output.length);
          return { message: bytesToText(output), runIo: true };
        }

        const file = this.openFiles.get(fd);
        if (!file || (file.flag !== FILE_OPEN_WRONLY && file.flag !== FILE_OPEN_APPEND)) {
          this.setRegisterValue(2, -1);
          return {};
        }

        const start = file.flag === FILE_OPEN_APPEND
          ? file.data.length
          : Math.max(0, file.cursor | 0);
        const requiredLength = start + output.length;
        if (
          !Number.isSafeInteger(requiredLength)
          || requiredLength > this.getVirtualFileSystemStorageLimitBytes()
        ) {
          this.setRegisterValue(2, -1);
          return {};
        }
        const merged = new Uint8Array(Math.max(requiredLength, file.data.length));
        merged.set(file.data, 0);
        merged.set(output, start);

        if (!this.setVirtualFileBytes(file.name, merged)) {
          this.setRegisterValue(2, -1);
          return {};
        }
        this.markOpenFilesDirty();
        file.data = merged;
        file.cursor = requiredLength;

        this.setRegisterValue(2, output.length);
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
        this.setRegisterValue(4, clamp32(now & 0xffffffff));
        this.setRegisterValue(5, clamp32(Math.floor(now / 0x100000000)));
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
        this.setRegisterValue(4, clamp32((nextRandomUnit() * 0x100000000) >>> 0));
        return {};
      case 42: {
        const bound = this.registers[5] | 0;
        this.setRegisterValue(4, clamp32(bound > 0 ? Math.floor(nextRandomUnit() * bound) : 0));
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
        this.setRegisterValue(4, clamp32(choice));
        return {};
      }
      case 51: {
        const inputResult = promptInput(readMessage(4), "", { kind: "input-int", forcePopup: true });
        if (inputResult.waitForInput) return inputResult;
        const input = inputResult.value;
        if (input == null) {
          this.setRegisterValue(4, 0);
          this.setRegisterValue(5, -2);
        } else if (input.length === 0) {
          this.setRegisterValue(4, 0);
          this.setRegisterValue(5, -3);
        } else {
          const parsed = parseStrictInteger(input);
          if (parsed === null) {
            this.setRegisterValue(4, 0);
            this.setRegisterValue(5, -1);
          } else {
            this.setRegisterValue(4, clamp32(parsed));
            this.setRegisterValue(5, 0);
          }
        }
        return {};
      }
      case 52: {
        const inputResult = promptInput(readMessage(4), "", { kind: "input-float", forcePopup: true });
        if (inputResult.waitForInput) return inputResult;
        const input = inputResult.value;
        this.setFloat32(0, 0);
        if (input == null) this.setRegisterValue(5, -2);
        else if (input.length === 0) this.setRegisterValue(5, -3);
        else {
          const parsed = parseStrictFiniteFloat(input);
          if (parsed === null) this.setRegisterValue(5, -1);
          else {
            this.setFloat32(0, parsed);
            this.setRegisterValue(5, 0);
          }
        }
        return {};
      }
      case 53: {
        const inputResult = promptInput(readMessage(4), "", { kind: "input-double", forcePopup: true });
        if (inputResult.waitForInput) return inputResult;
        const input = inputResult.value;
        this.setFloat64(0, 0);
        if (input == null) this.setRegisterValue(5, -2);
        else if (input.length === 0) this.setRegisterValue(5, -3);
        else {
          const parsed = parseStrictFiniteFloat(input);
          if (parsed === null) this.setRegisterValue(5, -1);
          else {
            this.setFloat64(0, parsed);
            this.setRegisterValue(5, 0);
          }
        }
        return {};
      }
      case 54: {
        const bufferAddress = this.registers[5] >>> 0;
        const maxLength = this.registers[6] | 0;
        this.assertBoundedSyscallAddressRange(
          bufferAddress,
          Math.max(0, maxLength),
          "input string buffer"
        );
        const inputResult = promptInput(readMessage(4), "", { kind: "input-string", maxLength, forcePopup: true });
        if (inputResult.waitForInput) return inputResult;
        const input = inputResult.value;
        if (input == null) {
          this.setRegisterValue(5, -2);
          return {};
        }
        if (input.length === 0) {
          this.setRegisterValue(5, -3);
          return {};
        }
        const maxChars = Math.max(0, maxLength - 1);
        const payload = input.slice(0, maxChars);
        const output = Array.from(
          { length: payload.length },
          (_unused, index) => payload.charCodeAt(index) & 0xff
        );
        if (payload.length < maxChars) output.push("\n".charCodeAt(0));
        output.push(0);
        writeBufferBytes(bufferAddress, output);
        this.setRegisterValue(5, input.length > maxChars ? -4 : 0);
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
      case WEBMARS_CUSTOM_SYSCALLS.flush:
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.eof:
        this.setRegisterValue(2, this.stdinClosed === true ? 1 : 0);
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.readline: {
        const lineResult = consumeConsoleLine();
        if (lineResult.waitForInput) return lineResult;
        if (lineResult.eof) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("readline at end-of-file"));
        }
        this.setRegisterValue(2, clamp32(this.allocateCString(String(lineResult.value ?? ""))));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.printf:
      case WEBMARS_CUSTOM_SYSCALLS.format: {
        const formatAddress = this.registers[4] >>> 0;
        const argPointer = this.registers[5] >>> 0;
        const argCount = Math.max(0, this.registers[6] | 0);
        try {
          const rendered = renderFormatString(formatAddress, argPointer, argCount);
          if (service === WEBMARS_CUSTOM_SYSCALLS.printf) {
            return { message: rendered, runIo: true };
          }
          this.setRegisterValue(2, clamp32(this.allocateCString(rendered)));
          return {};
        } catch (error) {
          if (error instanceof MarsMemoryAccessError) throw error;
          return this.raiseException(EXCEPTION_CODES.SYSCALL, error instanceof Error ? error.message : String(error));
        }
      }
      case WEBMARS_CUSTOM_SYSCALLS.fileRead: {
        const handle = openReadonlyManagedFile(readMessage(4));
        this.setRegisterValue(2, clamp32(handle));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.fileClosed:
        this.setRegisterValue(2, isManagedFileClosed(this.registers[4] | 0) ? 1 : 0);
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.fileClose: {
        const fd = this.registers[4] | 0;
        if (fd > STDERR_FD) {
          this.markOpenFilesDirty();
          this.openFiles.delete(fd);
        }
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.fileEof: {
        const file = getManagedFile(this.registers[4] | 0);
        this.setRegisterValue(2, (!file || file.cursor >= file.data.length) ? 1 : 0);
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.fileReadline: {
        const file = getManagedFile(this.registers[4] | 0);
        if (!file) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid file handle"));
        }
        this.setRegisterValue(2, clamp32(this.allocateCString(readManagedFileLine(file))));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.argsFlag:
        this.writeWord(this.registers[5] >>> 0, 0);
        registerArgumentBinding("flag", readMessage(4), this.registers[5] >>> 0);
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.argsInt:
        registerArgumentBinding("int", readMessage(4), this.registers[5] >>> 0);
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.argsString:
        registerArgumentBinding("string", readMessage(4), this.registers[5] >>> 0);
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.argsParse: {
        const remaining = performArgsParse();
        this.setRegisterValue(2, clamp32(remaining == null ? 0 : buildArgsResult(remaining)));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.stringLength:
        this.setRegisterValue(2, clamp32(readMessage(4).length | 0));
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.stringCharAt: {
        const text = readMessage(4);
        const index = this.registers[5] | 0;
        if (index < 0 || index >= text.length) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("string_charat index out of bounds"));
        }
        this.setRegisterValue(2, text.charCodeAt(index) & 0xff);
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.stringJoin:
        this.setRegisterValue(2, clamp32(this.allocateCString(readMessage(4) + readMessage(5))));
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.stringSub: {
        const text = readMessage(4);
        const start = this.registers[5] | 0;
        const end = this.registers[6] | 0;
        if (start < 0 || end < start || end > text.length) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid substring bounds"));
        }
        this.setRegisterValue(2, clamp32(this.allocateCString(text.slice(start, end))));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.stringCompare: {
        const left = readMessage(4);
        const right = readMessage(5);
        this.setRegisterValue(2, clamp32(left === right ? 0 : (left < right ? -1 : 1)));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.stringFromInt:
        this.setRegisterValue(2, clamp32(this.allocateCString(String(this.registers[4] | 0))));
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.stringFromChar: {
        const value = this.registers[4] & 0xff;
        if (value === 0) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("string_fromchar requires non-null character"));
        }
        this.setRegisterValue(2, clamp32(this.allocateCString(String.fromCharCode(value))));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.stringToLower:
        this.setRegisterValue(2, clamp32(this.allocateCString(readMessage(4).replace(/[A-Z]/g, (match) => match.toLowerCase()))));
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.stringTerminated: {
        const address = this.registers[4] >>> 0;
        const count = this.assertBoundedSyscallLength(
          Math.max(0, this.registers[5] | 0),
          this.getSyscallArrayLimitElements(),
          "string array"
        );
        this.assertBoundedSyscallAddressRange(address, count * 4, "string array");
        let terminated = false;
        for (let i = 0; i < count; i += 1) {
          if ((this.readWord((address + (i * 4)) >>> 0) | 0) === 0) {
            terminated = true;
            break;
          }
        }
        this.setRegisterValue(2, terminated ? 1 : 0);
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.stringToCharArray: {
        const text = readMessage(4);
        const values = Array.from(text).map((ch) => ch.charCodeAt(0) & 0xff);
        values.push(0);
        this.setRegisterValue(2, clamp32(this.allocateWordArray(values)));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.stringFromCharArray: {
        const address = this.registers[4] >>> 0;
        const length = this.assertBoundedSyscallLength(
          Math.max(0, this.getArrayLength(address)),
          this.getSyscallArrayLimitElements(),
          "character array"
        );
        this.assertBoundedSyscallAddressRange(address, length * 4, "character array");
        let output = "";
        for (let i = 0; i < length; i += 1) {
          const value = this.readWord((address + (i * 4)) >>> 0) & 0xff;
          if (value === 0) break;
          output += String.fromCharCode(value);
        }
        this.setRegisterValue(2, clamp32(this.allocateCString(output)));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.cstrTerminated: {
        const address = this.registers[4] >>> 0;
        const count = this.assertBoundedSyscallLength(
          Math.max(0, this.registers[5] | 0),
          this.getSyscallStringLimitCharacters(),
          "C string"
        );
        this.assertBoundedSyscallAddressRange(address, count, "C string");
        let terminated = false;
        for (let i = 0; i < count; i += 1) {
          if ((this.readByte((address + i) >>> 0, false) & 0xff) === 0) {
            terminated = true;
            break;
          }
        }
        this.setRegisterValue(2, terminated ? 1 : 0);
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.cstrFromString:
        this.setRegisterValue(2, clamp32(this.allocateCString(readMessage(4))));
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.stringFromCstr:
        this.setRegisterValue(2, clamp32(this.allocateCString(this.readNullTerminatedString(this.registers[4] >>> 0))));
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.charChr: {
        const value = this.registers[4] | 0;
        if (value < 0 || value > 127) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("char_chr argument out of ASCII range"));
        }
        this.setRegisterValue(2, value & 0xff);
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.parseBool: {
        const text = readMessage(4);
        if (text === "true") this.setRegisterValue(2, clamp32(this.allocateScalarWord(1)));
        else if (text === "false") this.setRegisterValue(2, clamp32(this.allocateScalarWord(0)));
        else this.setRegisterValue(2, 0);
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.parseInt: {
        const parsed = parseStrictIntegerBase(readMessage(4), this.registers[5] | 0);
        this.setRegisterValue(2, clamp32(parsed == null ? 0 : this.allocateScalarWord(parsed)));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.numTokens:
        this.setRegisterValue(2, clamp32(parseWhitespaceTokens(readMessage(4)).length | 0));
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.intTokens: {
        const tokens = parseWhitespaceTokens(readMessage(4));
        const base = this.registers[5] | 0;
        const ok = tokens.every((entry) => parseStrictIntegerBase(entry, base) != null);
        this.setRegisterValue(2, ok ? 1 : 0);
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.parseTokens: {
        const tokens = parseWhitespaceTokens(readMessage(4));
        this.setRegisterValue(2, clamp32(allocateStringArray(tokens)));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.parseInts: {
        const tokens = parseWhitespaceTokens(readMessage(4));
        const base = this.registers[5] | 0;
        const values = [];
        for (let i = 0; i < tokens.length; i += 1) {
          const parsed = parseStrictIntegerBase(tokens[i], base);
          if (parsed == null) {
            return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("parse_ints received non-integer token"));
          }
          values.push(parsed | 0);
        }
        this.setRegisterValue(2, clamp32(this.allocateWordArray(values)));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.int2Hex:
        this.setRegisterValue(2, clamp32(this.allocateCString((this.registers[4] >>> 0).toString(16).padStart(8, "0"))));
        return {};
      case WEBMARS_CUSTOM_SYSCALLS.imageWidth: {
        const handle = this.getImageHandle(this.registers[4] | 0);
        this.setRegisterValue(2, clamp32(handle ? handle.width : 0));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.imageHeight: {
        const handle = this.getImageHandle(this.registers[4] | 0);
        this.setRegisterValue(2, clamp32(handle ? handle.height : 0));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.imageCreate: {
        const width = this.registers[4] | 0;
        const height = this.registers[5] | 0;
        if (width <= 0 || height <= 0) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("image_create requires positive dimensions"));
        }
        const dimensions = this.getBoundedImageDimensions(width, height, "image_create");
        const dataAddress = this.allocateWordArray(new Array(dimensions.pixelCount).fill(0));
        this.setRegisterValue(2, clamp32(this.createImageHandle(dimensions.width, dimensions.height, dataAddress)));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.imageClone: {
        const sourceHandle = this.getImageHandle(this.registers[4] | 0);
        if (!sourceHandle) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid image handle"));
        }
        this.getBoundedImageDimensions(sourceHandle.width, sourceHandle.height, "image_clone");
        const dataAddress = this.allocateWordArray(this.readImagePixels(sourceHandle.id));
        this.setRegisterValue(2, clamp32(this.createImageHandle(sourceHandle.width, sourceHandle.height, dataAddress)));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.imageSubimage: {
        const sourceHandle = this.getImageHandle(this.registers[4] | 0);
        const x = this.registers[5] | 0;
        const y = this.registers[6] | 0;
        const width = this.registers[7] | 0;
        const height = this.readStackArgument(0);
        if (!sourceHandle) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid image handle"));
        }
        if (width <= 0 || height <= 0) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("image_subimage requires positive dimensions"));
        }
        const dimensions = this.getBoundedImageDimensions(width, height, "image_subimage");
        this.getBoundedImageDimensions(sourceHandle.width, sourceHandle.height, "source image");
        const sourcePixels = this.readImagePixels(sourceHandle.id);
        const output = new Array(dimensions.pixelCount);
        let outputIndex = 0;
        for (let row = 0; row < dimensions.height; row += 1) {
          for (let col = 0; col < dimensions.width; col += 1) {
            const sx = x + col;
            const sy = y + row;
            if (sx < 0 || sy < 0 || sx >= sourceHandle.width || sy >= sourceHandle.height) {
              output[outputIndex] = 0;
            } else {
              output[outputIndex] = sourcePixels[(sy * sourceHandle.width) + sx] | 0;
            }
            outputIndex += 1;
          }
        }
        const dataAddress = this.allocateWordArray(output);
        this.setRegisterValue(2, clamp32(this.createImageHandle(dimensions.width, dimensions.height, dataAddress)));
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.imageLoad: {
        const path = readMessage(4);
        const bytes = this.getVirtualFileBytes(path);
        if (bytes === null) {
          this.setRegisterValue(2, 0);
          return {};
        }
        try {
          const payload = parseImagePayload(bytes);
          const dataAddress = this.allocateWordArray(payload.data);
          this.setRegisterValue(2, clamp32(this.createImageHandle(payload.width, payload.height, dataAddress, path)));
          return {};
        } catch (error) {
          if (error instanceof MarsMemoryAccessError) throw error;
          return this.raiseException(EXCEPTION_CODES.SYSCALL, error instanceof Error ? error.message : String(error));
        }
      }
      case WEBMARS_CUSTOM_SYSCALLS.imageSave: {
        const handleValue = this.registers[4] | 0;
        const path = readMessage(5);
        const payload = this.serializeImageHandle(handleValue);
        if (!payload) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid image handle"));
        }
        const serialized = JSON.stringify(payload);
        this.assertBoundedSyscallLength(
          serialized.length,
          this.getVirtualFileSystemStorageLimitBytes(),
          "image_save payload"
        );
        if (!this.setVirtualFileBytes(path, textToBytes(serialized))) {
          return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("image_save could not persist the virtual file"));
        }
        const imageHandle = this.getImageHandle(handleValue);
        if (imageHandle) imageHandle.path = path;
        return {};
      }
      case WEBMARS_CUSTOM_SYSCALLS.imageData: {
        const handle = this.getImageHandle(this.registers[4] | 0);
        this.setRegisterValue(2, clamp32(handle ? handle.dataAddress : 0));
        return {};
      }
      default:
        return this.raiseException(EXCEPTION_CODES.SYSCALL, tx("invalid or unimplemented syscall service: {service}", { service }));
      }
    } catch (error) {
      if (error instanceof MarsSyscallLimitError) {
        return this.raiseException(
          EXCEPTION_CODES.SYSCALL,
          error.message || tx("syscall resource limit exceeded")
        );
      }
      throw error;
    }
  }
  executeInstruction(source) {
    const tokens = tokenizeStatement(source);
    if (!tokens.length) return {};

    const opcode = tokens[0].toLowerCase();
    const nextPc = (this.pc + 4) >>> 0;
    const linkPc = (nextPc + (this.settings.delayedBranching ? 4 : 0)) >>> 0;

    const reg = (index) => this.resolveRegister(tokens[index]);
    const freg = (index) => this.resolveFloatRegister(tokens[index]);
    const imm = (index) => this.resolveValue(tokens[index]);
    const asSigned16 = (num) => signExtend16(num);
    const overflow32 = (value) => value > 2147483647 || value < -2147483648;
    const saturatingInt = (value) => saturatingInt32(value);
    const roundNearestEven = (value) => roundNearestEven32(value);
    const roundUsingFpuControl = (value) => this.roundUsingFpuControl(value);

    if (opcode === "syscall") {
      const syscallResult = this.executeSyscall();
      if (!syscallResult?.waitForInput) this.llReservationAddress = null;
      return syscallResult;
    }
    if (opcode === "nop") {
      this.forceZeroRegister();
      return {};
    }

    if (opcode === "eret") {
      this.llReservationAddress = null;
      this.setCop0Value(
        COP0_REGISTERS.status,
        this.cop0Registers[COP0_REGISTERS.status] & ~(1 << 1)
      );
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
          this.setRegisterValue(rd, add32(a, b));
        } else if (opcode === "addu") this.setRegisterValue(rd, add32(a, b));
        else if (opcode === "sub") {
          if (subOverflow32(a, b)) return this.raiseException(EXCEPTION_CODES.OVERFLOW, translateText("arithmetic overflow"));
          this.setRegisterValue(rd, sub32(a, b));
        } else if (opcode === "subu") this.setRegisterValue(rd, sub32(a, b));
        else if (opcode === "and") this.setRegisterValue(rd, a & b);
        else if (opcode === "or") this.setRegisterValue(rd, a | b);
        else if (opcode === "xor") this.setRegisterValue(rd, a ^ b);
        else if (opcode === "nor") this.setRegisterValue(rd, ~(a | b));
        else if (opcode === "slt") this.setRegisterValue(rd, a < b ? 1 : 0);
        else if (opcode === "sltu") this.setRegisterValue(rd, (a >>> 0) < (b >>> 0) ? 1 : 0);
        else if (opcode === "mul") {
          this.setRegisterValue(32, mulSignedHi32(a, b));
          this.setRegisterValue(33, mulSignedLo32(a, b));
          this.setRegisterValue(rd, this.registers[33]);
        } else if (opcode === "movn") {
          if (b !== 0) this.setRegisterValue(rd, a);
        } else if (opcode === "movz") {
          if (b === 0) this.setRegisterValue(rd, a);
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
        this.setRegisterValue(rd, opcode === "clz" ? clz32(value) : clo32(value));
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
          this.setRegisterValue(rt, add32(a, s16));
        } else if (opcode === "addiu") this.setRegisterValue(rt, add32(a, s16));
        else if (opcode === "andi") this.setRegisterValue(rt, a & zeroExtend16(value));
        else if (opcode === "ori") this.setRegisterValue(rt, a | zeroExtend16(value));
        else if (opcode === "xori") this.setRegisterValue(rt, a ^ zeroExtend16(value));
        else if (opcode === "slti") this.setRegisterValue(rt, a < s16 ? 1 : 0);
        else this.setRegisterValue(rt, (a >>> 0) < (s16 >>> 0) ? 1 : 0);
      }
      this.forceZeroRegister();
      return {};
    }

    if (opcode === "lui" && tokens.length >= 3) {
      const rt = reg(1);
      const value = imm(2);
      if (rt !== null && Number.isFinite(value)) this.setRegisterValue(rt, clamp32(zeroExtend16(value) << 16));
      this.forceZeroRegister();
      return {};
    }

    if (["sll", "srl", "sra"].includes(opcode) && tokens.length >= 4) {
      const rd = reg(1);
      const rt = reg(2);
      const shamt = imm(3);
      if (rd !== null && rt !== null && Number.isFinite(shamt)) {
        const amount = shamt & 0x1f;
        if (opcode === "sll") this.setRegisterValue(rd, clamp32((this.registers[rt] << amount) >>> 0));
        else if (opcode === "srl") this.setRegisterValue(rd, clamp32(this.registers[rt] >>> amount));
        else this.setRegisterValue(rd, this.registers[rt] >> amount);
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
        if (opcode === "sllv") this.setRegisterValue(rd, clamp32((this.registers[rt] << amount) >>> 0));
        else if (opcode === "srlv") this.setRegisterValue(rd, clamp32(this.registers[rt] >>> amount));
        else this.setRegisterValue(rd, this.registers[rt] >> amount);
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
            this.setRegisterValue(32, mulSignedHi32(a, b));
            this.setRegisterValue(33, mulSignedLo32(a, b));
          } else {
            this.setRegisterValue(32, mulUnsignedHi32(a, b));
            this.setRegisterValue(33, mulUnsignedLo32(a, b));
          }
        } else if (opcode === "div" || opcode === "divu") {
          if (b !== 0) {
            if (opcode === "div") {
              this.setRegisterValue(33, divSignedQuot32(a, b));
              this.setRegisterValue(32, divSignedRem32(a, b));
            } else {
              this.setRegisterValue(33, divUnsignedQuot32(a, b));
              this.setRegisterValue(32, divUnsignedRem32(a, b));
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
        if (opcode === "mfhi") this.setRegisterValue(rd, this.registers[32]);
        else if (opcode === "mflo") this.setRegisterValue(rd, this.registers[33]);
        else if (opcode === "mthi") this.setRegisterValue(32, this.registers[rd]);
        else this.setRegisterValue(33, this.registers[rd]);
      }
      this.forceZeroRegister();
      return {};
    }

    if (["mfc0", "mtc0"].includes(opcode) && tokens.length >= 3) {
      const rt = reg(1);
      const rd = this.resolveCop0Register(tokens[2]);
      if (rt !== null && rd !== null) {
        if (opcode === "mfc0") this.setRegisterValue(rt, this.cop0Registers[rd] | 0);
        else this.setCop0Value(rd, this.registers[rt] | 0);
      }
      this.forceZeroRegister();
      return {};
    }

    if (["mfc1", "mtc1"].includes(opcode) && tokens.length >= 3) {
      const rt = reg(1);
      const fs = freg(2);
      if (rt !== null && fs !== null) {
        if (opcode === "mfc1") this.setRegisterValue(rt, this.cop1Registers[fs] | 0);
        else this.setCop1Value(fs, this.registers[rt] | 0);
      }
      this.forceZeroRegister();
      return {};
    }

    if (["cfc1", "ctc1"].includes(opcode) && tokens.length >= 3) {
      const rt = reg(1);
      const control = this.resolveCop1ControlRegister(tokens[2]);
      if (rt !== null && control !== null) {
        if (opcode === "cfc1") this.setRegisterValue(rt, this.readCop1ControlRegister(control));
        else this.writeCop1ControlRegister(control, this.registers[rt]);
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
        if (opcode === "lw") this.setRegisterValue(gpr, this.readWord(addr));
        else if (opcode === "ll") {
          const loadedValue = this.readWord(addr);
          this.setRegisterValue(gpr, loadedValue);
          this.llReservationAddress = addr;
        }
        else if (opcode === "sw") this.writeWord(addr, this.registers[gpr]);
        else if (opcode === "lb") this.setRegisterValue(gpr, this.readByte(addr, true));
        else if (opcode === "lbu") this.setRegisterValue(gpr, this.readByte(addr, false));
        else if (opcode === "sb") this.writeByte(addr, this.registers[gpr]);
        else if (opcode === "lh") this.setRegisterValue(gpr, this.readHalf(addr, true));
        else if (opcode === "lhu") this.setRegisterValue(gpr, this.readHalf(addr, false));
        else if (opcode === "sh") this.writeHalf(addr, this.registers[gpr]);
        else if (opcode === "sc") {
          this.assertAddressInStrictMemoryModel(addr, 4, "write");
          if (addr % 4 !== 0) {
            throw new Error(translateText("Address not aligned on word boundary: {address}", { address: toHex(addr) }));
          }
          this.assertWritableAddress(addr, 4);
          const source = this.registers[gpr] | 0;
          const succeeded = this.llReservationAddress != null
            && (this.llReservationAddress >>> 0) === addr;
          this.llReservationAddress = null;
          if (succeeded) this.writeWord(addr, source);
          this.setRegisterValue(gpr, succeeded ? 1 : 0);
        }
        else if (opcode === "lwl") {
          const baseAddress = (addr - (addr & 0x3)) >>> 0;
          this.assertAddressInStrictMemoryModel(baseAddress, (addr & 0x3) + 1, "read");
          let result = this.registers[gpr] | 0;
          for (let i = 0; i <= addr % 4; i += 1) result = setWordByte(result, 3 - i, this.readByte((addr - i) >>> 0, false));
          this.setRegisterValue(gpr, result);
        } else if (opcode === "lwr") {
          this.assertAddressInStrictMemoryModel(addr, 4 - (addr & 0x3), "read");
          let result = this.registers[gpr] | 0;
          for (let i = 0; i <= 3 - (addr % 4); i += 1) result = setWordByte(result, i, this.readByte((addr + i) >>> 0, false));
          this.setRegisterValue(gpr, result);
        } else if (opcode === "swl") {
          const source = this.registers[gpr] | 0;
          const width = (addr % 4) + 1;
          const baseAddress = (addr - width + 1) >>> 0;
          const values = Array.from(
            { length: width },
            (_unused, index) => getWordByte(source, 4 - width + index)
          );
          this.writeBytesAtomic(baseAddress, values);
          for (let i = 0; i < width; i += 1) {
            this.notifyMemoryObservers("write", (addr - i) >>> 0, 1, getWordByte(source, 3 - i));
          }
        } else if (opcode === "swr") {
          const source = this.registers[gpr] | 0;
          const width = 4 - (addr % 4);
          const values = Array.from({ length: width }, (_unused, index) => getWordByte(source, index));
          this.writeBytesAtomic(addr, values);
          for (let i = 0; i < width; i += 1) {
            this.notifyMemoryObservers("write", (addr + i) >>> 0, 1, getWordByte(source, i));
          }
        } else if (opcode === "lwc1") this.setCop1Value(fpr, this.readWord(addr));
        else if (opcode === "swc1") this.writeWord(addr, this.cop1Registers[fpr]);
        else if (opcode === "ldc1") {
          if ((fpr & 1) !== 0) return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("first register must be even-numbered"));
          const { lowWord, highWord } = this.readDoubleWords(addr);
          this.setCop1Value(fpr, lowWord);
          this.setCop1Value(fpr + 1, highWord);
        } else if (opcode === "sdc1") {
          if ((fpr & 1) !== 0) return this.raiseException(EXCEPTION_CODES.RESERVED, translateText("first register must be even-numbered"));
          this.writeDoubleWords(addr, this.cop1Registers[fpr], this.cop1Registers[fpr + 1]);
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
        const take = opcode === "beq"
          ? this.registers[rs] === this.registers[rt]
          : this.registers[rs] !== this.registers[rt];
        if (take) return { nextPc: target };
      }
      return {};
    }

    if (["bgtz", "blez", "bltz", "bgez", "bgezal", "bltzal"].includes(opcode) && tokens.length >= 3) {
      const rs = reg(1);
      const target = this.branchTarget(tokens[2], nextPc);
      if (rs !== null && target !== null) {
        const value = this.registers[rs] | 0;
        const linkInstruction = opcode === "bgezal" || opcode === "bltzal";
        if (linkInstruction) {
          this.setRegisterValue(31, clamp32(linkPc));
          this.forceZeroRegister();
        }
        let take = false;
        if (opcode === "bgtz") take = value > 0;
        else if (opcode === "blez") take = value <= 0;
        else if (opcode === "bltz" || opcode === "bltzal") take = value < 0;
        else take = value >= 0;
        if (take) {
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
        if (opcode === "jal") this.setRegisterValue(31, clamp32(linkPc));
        this.forceZeroRegister();
        return { nextPc: target };
      }
      const absolute = parseImmediate(tokens[1]);
      if (Number.isFinite(absolute)) {
        if (opcode === "jal") this.setRegisterValue(31, clamp32(linkPc));
        this.forceZeroRegister();
        return { nextPc: absolute >>> 0 };
      }
      return {};
    }

    if ((opcode === "jr" || opcode === "jalr") && tokens.length >= 2) {
      const rs = opcode === "jalr" && tokens.length >= 3 ? reg(2) : reg(1);
      if (rs !== null) {
        const jumpTarget = this.registers[rs] >>> 0;
        if (opcode === "jalr") {
          const rd = tokens.length >= 3 ? reg(1) : 31;
          if (rd !== null) this.setRegisterValue(rd, clamp32(linkPc));
        }
        this.forceZeroRegister();
        return { nextPc: jumpTarget };
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
        if (kind === "s") this.setCop1Value(fd, this.cop1Registers[fs] | 0);
        else { this.setCop1Value(fd, this.cop1Registers[fs] | 0); this.setCop1Value(fd + 1, this.cop1Registers[fs + 1] | 0); }
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
        if (take) this.setRegisterValue(rd, this.registers[rs]);
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
        if (kind === "s") this.setCop1Value(fd, this.cop1Registers[fs] | 0);
        else { this.setCop1Value(fd, this.cop1Registers[fs] | 0); this.setCop1Value(fd + 1, this.cop1Registers[fs + 1] | 0); }
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
        if (kind === "s") this.setCop1Value(fd, this.cop1Registers[fs] | 0);
        else {
          this.setCop1Value(fd, this.cop1Registers[fs] | 0);
          this.setCop1Value(fd + 1, this.cop1Registers[fs + 1] | 0);
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
        this.setCop1Value(fd, saturatingInt(roundUsingFpuControl(source)));
        return {};
      }

      const source = opcode.endsWith(".s") ? this.getFloat32(fs) : this.getFloat64(fs);
      let rounded = 0;
      if (opcode.startsWith("round")) rounded = roundNearestEven(source);
      else if (opcode.startsWith("trunc")) rounded = truncNumber(source);
      else if (opcode.startsWith("ceil")) rounded = ceilNumber(source);
      else rounded = floorNumber(source);
      this.setCop1Value(fd, saturatingInt(rounded));
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
  return new MarsEngine(options);
}
