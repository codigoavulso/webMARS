# Migration Roadmap

## Phase 0 - Baseline Analysis (Done)

- Full repository inventory completed.
- Package/module sizing completed.
- Legacy architecture and entry flow mapped.
- Initial Java->Web migration mapping documented.

## Phase 1 - Web Shell Foundation (In Progress)

- Create `/web` folder structure.
- Build IDE-like shell in HTML/CSS/JS:
- top menu + toolbar
- Edit/Execute tabs
- Text/Data/Labels panels
- Registers/Coprocessor tabs
- Messages/Run I/O tabs
- Implement state store and message bus.
- Implement engine scaffold for assemble/step/go/reset.

## Phase 2 - Assembler Port

- Port tokenizer rules and token types.
- Port directives handling (`.text`, `.data`, `.word`, strings, alignment, etc.).
- Port symbol table and two-pass assembly behavior.
- Port pseudo-op expansion from `PseudoOps.txt`.
- Produce `ProgramStatement`-like intermediate representation.

## Phase 3 - Simulator + Hardware Port

- Port memory model and address segmentation.
- Port integer and coprocessor register files.
- Port instruction simulation table from `InstructionSet.java`.
- Port exceptions, delayed branching, start-at-main and step limits.
- Port backstep support.

## Phase 4 - Syscalls and Runtime I/O

- Port syscall registry and dispatch logic.
- Port standard I/O syscalls and file syscalls.
- Port dialog-style syscalls with web equivalents.
- Match CLI-style output formatting where relevant.

## Phase 5 - UX and Settings Parity

- Persist settings in browser storage.
- Add help/documentation integration.
- Add memory dump UI/export formats.
- Add breakpoints UX parity and advanced execution controls.

## Phase 6 - Verification and Compatibility

- Build regression corpus from MARS sample programs.
- Compare assembly output and final machine state with legacy behavior.
- Document any intentional compatibility differences.
