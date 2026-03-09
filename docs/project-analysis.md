# Project Analysis (Legacy Java MARS 4.5)

Date: 2026-03-07

## High-Level Inventory

- Total Java source files: 218
- Total Java source lines: 59,018
- Main legacy source root: `mars/`
- Generated API docs: `docs/` (311 files)
- Help content: `help/` (20 files)
- Image/icon assets: `images/` (59 files)

## Module Size Breakdown (`mars/*`)

- `venus`: 86 files, 22,583 lines (Swing IDE UI)
- `mips`: 73 files, 11,958 lines (CPU model, memory, instruction set, syscalls)
- `tools`: 22 files, 12,225 lines (educational visual tools)
- `assembler`: 14 files, 4,059 lines (tokenizer + two-pass assembler)
- `simulator`: 7 files, 1,614 lines (runtime control loop)
- `util`: 6 files, 2,233 lines (binary helpers, file lookup, I/O)
- top-level core classes (`Globals`, `MIPSprogram`, `MarsLaunch`, etc.): remaining lines

## Entry Points and Execution Flow

1. `Mars.java` -> `mars.MarsLaunch`
2. `MarsLaunch` chooses mode:
- GUI mode (no CLI args): starts `VenusUI`
- CLI mode: parse args, assemble, simulate, post-mortem display/dumps
3. Core flow:
- `Globals.initialize()`
- `MIPSprogram.prepareFilesForAssembly()`
- `MIPSprogram.assemble()` -> `Assembler`
- `MIPSprogram.simulate*()` -> `Simulator`

## UI Architecture (Swing / Venus)

`VenusUI` builds:

- top menus + toolbar actions
- `MainPane` tabs: `Edit` and `Execute`
- `ExecutePane` windows:
- `TextSegmentWindow`
- `DataSegmentWindow`
- `LabelsWindow`
- right `RegistersPane` tabs:
- integer registers
- coprocessor 1
- coprocessor 0
- bottom `MessagesPane` tabs:
- MARS messages
- Run I/O

## Runtime/Behavioral Sources to Port

- Assembler grammar/tokenization: `mars/assembler/*`
- Instruction behavior + opcodes: `mars/mips/instructions/InstructionSet.java`
- Pseudo instructions: `PseudoOps.txt`
- Syscall mapping: `Syscall.properties` + `mars/mips/instructions/syscalls/*`
- Memory model/configurations: `mars/mips/hardware/Memory*.java`
- Register files: `RegisterFile`, `Coprocessor0`, `Coprocessor1`
- Settings/defaults:
- `Settings.properties`
- `Config.properties`
- `mars/Settings.java`

## Important Legacy Constraints

- Default MARS version constant: `4.5`
- Accepted source extensions: `asm`, `s`
- Max assembler errors per run: `200`
- Message buffer limit: `1,000,000`
- Backstep default limit in config: `2000`

## Porting Risk Areas

- Full semantic parity for all instructions and pseudo-instructions
- Observer-driven UI updates during stepping/run
- Accurate exception/interrupt behavior
- Syscall I/O compatibility and dialog-based variants
- Memory configuration modes (`Default`, `CompactDataAtZero`, `CompactTextAtZero`)
