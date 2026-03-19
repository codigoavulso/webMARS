# webMARS v0.4.5

Live test: [https://webmars.nfiles.top/](https://webmars.nfiles.top/)

![webMARS main window](assets/images/screenshot-main.png)

Browser port of MARS MIPS 4.5 (IDE + assembler + simulator), with a desktop/mobile UI and JS/WASM hybrid execution.

## Product Goal

`webMARS` targets practical compatibility with Java MARS 4.5 while adapting the experience to browser constraints:

- Integrated IDE workflow (edit, assemble, run, debug) in a single page app.
- MARS-like instruction/directive/syscall behavior where feasible.
- Persistent browser session/workspace and tool windows.
- Progressive native acceleration through WebAssembly without breaking compatibility controls.

## Current Scope

- Multi-file editor with undo/redo, syntax highlighting, line numbers.
- Assemble / Go / Step / Backstep / Pause / Stop / Reset.
- Breakpoints, run speed control, Run I/O console, syscall input flows.
- Registers, COP0/COP1, text/data tables, labels table.
- MARS tool ecosystem (Bitmap Display, Digital Lab Sim, Cache, Keyboard/Display MMIO, etc.).
- i18n catalogs (`en`, `pt`, `es`) and translated help resources.
- Browser storage for ASM sources (virtual folders, quota control).
- Session restore (files, machine state, tool windows).

## What's New in v0.4.5

- Cloud backend and authentication:
  - Added configurable cloud backend selection with automatic default routing for local development (`localhost`) and production (`backmars.nfiles.top/api`).
  - Introduced cloud login/register dialogs, user creation flow, production-ready backend integration, and clearer status reporting in both dialogs and `Mars Messages`.
  - Login/register flows were decoupled from project sync so authentication completes immediately and cloud sync continues in background.
- Project and editor workflow:
  - Main authoring workflow consolidated around `Project`, `Editor`, and `Execute`, while preserving C0/Assembly-specific actions based on the active file type.
  - Project tree gained richer selection state, status bar, metadata columns, sync indicators, read-only opening rules for external/libs files, and stronger save/sync behavior.
  - Editor tabs now support read-only restore, proper close behavior, and right-click context actions (`Close`, `Save`, `Save and Close`).
- UI and storage refinements:
  - Mini-C output flow now supports direct ASM opening, optional output window suppression, and improved compile dialog behavior.
  - User project quota was raised to `1 MB`, moved to central config, and is now enforced consistently in browser storage flows.
  - Settings, translations, and cloud/server preferences were expanded to support the new deployment and workspace model.

## Compatibility Controls

### Strict MARS 4.5 Mode (optional)

When enabled (`Settings > Strict MARS 4.5 compatibility mode`), webMARS applies strict segment checks aligned with MARS limits:

- 4 MB segment boundaries (`text`, `data`, `ktext`, `kdata`, `stack` window).
- Strict validation during assembly and runtime memory access.
- Runtime behavior favors the JS core path to preserve strict semantics.

### `.set` Directive Policy

Current behavior follows MARS 4.5 policy in this project:

- `.set` is accepted.
- It is ignored with warning: `MARS currently ignores the .set directive.`

## Architecture (high-level)

- `assets/js/app-modules/00-core.js`: assembler + simulator core (JS).
- `assets/js/app-modules/00-core-wasm-*`: native bridge/hybrid runtime.
- `assets/js/app-modules/10-ui.js`: layout and UI state defaults.
- `assets/js/app-modules/20-app-runtime.js`: runtime orchestration, commands, preferences.
- `tools/`: pluggable MARS-style tool windows.
- `help/`: integrated help system (multi-language).

## Run

From `Mars4_5` root:

```bash
npm start
```

Default URL: `http://localhost:8080`

## Test Suites

From `Mars4_5` root:

```bash
npm run test:robustness
npm run test:differential
npm run test:conformance
```

### Differential Java MARS vs webMARS

The differential harness compiles/runs Java MARS and compares against webMARS for the same input:

- machine code / basic rows
- labels
- warnings/errors
- final state (`PC`, registers, `COP0`, `COP1` flags, sampled memory)

Set Java tools explicitly when needed:

```powershell
$env:JAVA_CMD="C:\Users\user\Desktop\jdk-27\bin\java.exe"
$env:JAVAC_CMD="C:\Users\user\Desktop\jdk-27\bin\javac.exe"
```

Reports:

- `web/test-results/differential-mars-vs-web.json`
- `web/test-results/conformance-suite.json`
- `test-results/robustness-suite.json`

## Release Line

- `v0.4.3`: Mini-C/C0 compiler (S0-S4) integration + UI renewal and project-first workflow
- `v0.4.5`: cloud backend/login productionization + project/editor workflow improvements + storage/sync refinement
- `v0.4.2`: UI polish + simulation runtime bug fixes + final MARS 4.5 parity adjustments
- `v0.3.7`: initial git baseline
- `v0.3.8`: core fixes and UI improvements
- `v0.3.9`: UI fixes + WASM (C++) core reimplementation
- `v0.4.0`: mobile adaptation + i18n + large stabilization cycle
- `v0.4.1`: register window (coprocessors) fixes + tighter MIPS-like register/memory access behavior
