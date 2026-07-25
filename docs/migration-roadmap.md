# Migration Roadmap (v0.4.7 status)

This document originally tracked the migration from desktop Java MARS to a
browser application. That baseline migration is complete for the current
webMARS compatibility target. It is now a status record and a maintenance
roadmap, not a list of unimplemented shell, assembler or simulator work.

The dated analysis and compatibility reports in `docs/` remain historical
records and should not be rewritten to describe the current release.

## Phase 0 - Baseline analysis (complete)

- Inventoried the original MARS subsystems and repository inputs.
- Mapped the Java entry flow, assembler, simulator, syscalls, tools and help
  material to browser responsibilities.
- Recorded the initial migration analysis in the historical project documents.

## Phase 1 - Browser shell foundation (complete)

- Delivered the static single-page IDE shell.
- Added the editor and Execute views, MARS Messages and Run I/O, register and
  coprocessor panes, text/data/label views, menus, toolbar and window manager.
- Added responsive desktop, stacked and compact layouts.
- Established ordered script loading, shared state and command orchestration.

## Phase 2 - Assembler migration (complete for the current target)

- Implemented tokenizer/parser behavior, directives, labels, expressions,
  macros, pseudo-ops and two-pass assembly in JavaScript.
- Added machine encoding and generated instruction, pseudo-op and syscall
  reference data.
- Added diagnostics and regression coverage for invalid encodings and assembly
  rollback.

Compatibility with Java MARS remains a tested target rather than a claim that
every undocumented desktop edge case is identical.

## Phase 3 - Simulator and hardware model (complete for the current target)

- Implemented memory, integer registers, COP0/COP1, exceptions and instruction
  execution in JavaScript.
- Implemented Step, Go, Pause, Stop, Reset, breakpoints, delayed branching,
  backstep, LL/SC reservations and self-modifying-code behavior.
- Added configurable memory maps, strict MARS compatibility and runtime-state
  snapshots.
- Removed the experimental WASM/hybrid backend; v0.4.7 has one JavaScript
  execution engine.

## Phase 4 - Syscalls and runtime I/O (complete for the current target)

- Implemented console, input, dialog, file, random, time, sleep, MIDI and
  project-specific image/string services used by webMARS.
- Integrated Run I/O, popup input and the browser-backed virtual file system.
- Added bounds, memory-fault and persistence-failure regression coverage.

Intentional browser adaptations and remaining compatibility limits belong in
the in-app help rather than being hidden in this roadmap.

## Phase 5 - UX, tools and settings parity (complete for v0.4.7)

- Added persistent projects, sessions, preferences and browser source storage.
- Added breakpoints, advanced execution settings and memory/backstep limits.
- Integrated MARS-style tools, localized examples and Mini-C/C0 compilation.
- Rebuilt the in-app help in English, Spanish and Portuguese.
- Added local compile, assemble and run benchmarks with instrumented JavaScript
  utilization.

## Phase 6 - Verification and release discipline (established; ongoing)

- Regression suites cover the assembler, ISA/runtime behavior, memory
  invariants, stopping, tools, examples, help and release readiness.
- Static validation checks the script graph, syntax, manifests, local assets and
  privacy declarations.
- Release packaging uses an explicit public-file allowlist and verifies the
  generated directory, ZIP and checksum.
- Compatibility defects should be captured by a failing regression before or
  alongside the fix.

Verification remains ongoing because every new feature can expose another MARS
compatibility edge case; this does not mean the original migration is still in
progress.

## Post-migration maintenance roadmap

1. Preserve execution correctness and snapshot/persistence invariants.
2. Reduce the largest modules through behavior-preserving extractions with
   regression coverage.
3. Expand Mini-C grammar, library and compatibility documentation only when it
   can be tied to implemented, tested behavior.
4. Improve accessibility, responsive interaction and performance without
   weakening tool snapshot dependencies.
5. Keep localized help, examples, privacy statements and release metadata in
   sync for every release.

These are maintenance directions, not promises of full ISO C support, complete
Java MARS identity or a return to multiple runtime backends.
