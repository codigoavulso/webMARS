export const DEFAULT_SETTINGS = {
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
  maxMessageCharacters: 200_000,
  maxErrors: 200,
  maxBacksteps: 2000,
  fileExtensions: ["asm", "s"],
  asciiNonPrint: "."
};

export const DEFAULT_MEMORY_MAP = {
  textBase: 0x00400000,
  dataBase: 0x10010000,
  heapBase: 0x10040000,
  stackBase: 0x7ffffffc,
  kernelBase: 0x80000000,
  mmioBase: 0xffff0000
};

export const INITIAL_SOURCE = `# MARS 4.5 web shell\n# Example program\n.text\nmain:\n  li $t0, 5\n  li $t1, 7\n  add $t2, $t0, $t1\n  syscall`;

