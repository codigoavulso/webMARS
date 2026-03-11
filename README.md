# webMARS 0.9.10

Port of MARS MIPS 4.5 for the browser, featuring a Java MARS-inspired interface and native JavaScript execution.

[Live demo](https://webmars.nfiles.top/)

![webMARS screenshot](assets/images/screenshot-main.png)

## Release 0.9.10

This is a massive update, validated by a full folder comparison against `web - Copia_20260309_0005`.

Comparison summary:
- Net delta: **+189 files**, **14 changed**, **0 removed**
- Main expansion areas: `examples/` (+87), `help/` (+76), `assets/` (+12), `wasm/` (+8), `scripts/` (+4)

Key changes in 0.9.10:
- **UI bug fixes**
  - Major refactor of window behavior, focus flow, splitters, and restore logic.
  - `Help > About...` now uses a dedicated compact card (`help/about-card.html`) with reliable restore after refresh.
  - `About` and browser-storage windows now behave like dialogs instead of cascading tool windows.
  - Settings dialogs were regrouped into two panels: `Interface...` and `Runtime & Memory...`.
- **Desktop/mobile UI modes**
  - Added responsive runtime modes (`desktop`, `stacked`, `compact`) with dedicated behavior.
  - Added shared desktop splitters and resolution-aware layout history persistence.
- **Core WebAssembly reimplementation**
  - Added WASM bootstrap modules (`00-core-wasm-hotpath.js`, `00-core-wasm-native.js`, `00-core-wasm-bridge.js`).
  - Added C++ engine/hotpath artifacts in `wasm/` and server MIME support for `.wasm`.
  - `createMarsEngine()` now supports JS/native/hybrid backend flow with fallback.
- **Memory usage fine tuning**
  - Runtime memory caps and backstep limits tightened for browser stability.
  - Dynamic backstep budget pruning and sparse-memory optimizations.
- **localStorage reliability and space improvements**
  - Session persistence migrated to `mars45-web-session-v2` with legacy compatibility.
  - Added compact server-draft channel (`mars45-web-session-server-draft-v1`).
  - Stronger restore validation for files, windows, and machine state.
  - Added browser-side source storage with a 50 kB quota, graphical file/folder manager, and explicit open/save flows.
  - Empty placeholder tabs are now discarded automatically when opening/creating a real file.
- **Tools bug fixes**
  - Digital Lab Sim now keeps latched key state and clearly marks active keys in green.
  - Bitmap Display, Cache Simulator, Keyboard/Display MMIO, and Screen Magnifier received behavior and resize robustness fixes.
- **i18n language system**
  - Added `00-i18n.js`, language catalogs (`en`, `pt`, `es`), and manifest-driven language loading.
  - Localized help/examples structures added with language-aware selection.

## Overview

This directory contains the web application (`webMARS`) including:

- MARS-style IDE (Edit/Execute, Registers, Messages/Run I/O)
- MIPS simulation in the browser (assembler + runtime)
- Internal window system (no native popups for the main UI)
- Modularly loaded tools
- Integrated Help in its own window

## Current Status

Project in an advanced state of functionality.

- Instruction coverage: high (including pseudo-instructions and main MARS 4.5 syscalls)
- Main UI aligned with the classic MARS layout
- Multi-file editor, examples, local persistence, functional Run I/O, and tools
- Edge-case differences compared to the original Java MARS may still exist

## Features Implemented

### IDE and Layout

- 3 main native windows "like" original MARS MIPS:
  - Main (Edit/Execute)
  - Registers (with Coproc 1 / Coproc 0 tabs)
  - Messages / Run I/O
- Sub-windows within Execute:
  - Text Segment
  - Data Segment
- Window system:
  - drag, resize, minimize/maximize
  - z-index based focus
  - MARS-style initial proportions
  - responsive resize with proportional preservation

### Editor

- Multi-file with tabs
- New / Open / Save / Save As / Close / Close All
- Separate file flows for disk download/upload and browser storage
- Graphical browser-storage manager with virtual folders and file deletion
- Undo / Redo
- Line numbering
- Syntax highlighting
- Unsaved data protection (tab close, refresh, exit)

### Execution

- Assemble / Go / Step / Backstep / Pause / Stop / Reset
- Breakpoints
- Execution speed slider
- Cooperative loop to reduce browser locking
- Additional non-interactive optimization at max speed (minimal UI sync, no highlight flashes)
- Automatic highlighting and focus on updates for:
  - current instruction (text segment)
  - modified memory (data segment)
  - modified registers
- Input Syscalls:
  - pauses when input is required
  - resumes after input/confirm
- Output to Run I/O even at high speeds (incl. 30+ inst/sec)

### Assembler / Runtime

- Support for main MARS 4.5 directives
- Pseudo-instructions with assembler expansion
- MARS Syscalls adapted for the browser (includes popup/Run I/O, sleep, MIDI)
- `Assemble all` and `.include` support within the loaded context
- Program arguments support
- Runtime memory/backstep caps configurable via `Settings > Uso máximo de Memória...`
- Engine factory ready for future WASM/C++ core (`createMarsEngine` + bridge fallback to JS)
- Incremental WASM hotpath bootstrap (`web/wasm/core_hotpath.cpp` + `00-core-wasm-hotpath.js`)

### Help

- Integrated Help window within the window system
- Classic tabs (MIPS, MARS, License, etc.)
- Additional `webMARS` tab featuring:
  - `Info`
  - `Changelog`
- Compact `About...` window using a dedicated localized card page

### Preferences and Persistence

- Grouped preference panels:
  - `Settings > Interface...`
  - `Settings > Runtime & Memory...`
- Session restore for files, machine state, and tool windows
- Local browser storage manager for ASM sources with quota control and folder-style paths

### Tools

Tools loaded via the `tools/tools.json` manifest and scripts in `tools/*.js`.

Currently included:

- BHT Simulator
- Bitmap Display
- Bitmap Terminal Tool
- Data Cache Simulator
- Digital Lab Sim
- Floating Point Representation
- Instruction Counter
- Instruction Statistics
- Intro to Tools
- Keyboard/Display MMIO
- Mars Bot
- Memory Reference Visualization
- MIPS X-Ray
- Scavenger Hunt
- Screen Magnifier

## Examples

ASM examples located in `examples/` and accessible via the `File > Examples` menu (`examples/examples.json` manifest).

Includes simple and academic demos, such as:

- `hello_world_runio.asm`
- `guess_number.asm`
- `digital_lab_sim_demo.asm`
- `floating_point_demo.asm`
- `mars_bot_game.asm`
- `bitmap_display_bars.asm`
- `keyboard_display_mmio_echo.asm`
- `cache_stride_benchmark.asm`
- `branch_predictor_bht_demo.asm`
- `factorial_recursive.asm`
- `fibonacci_iterative.asm`
- `bubble_sort_array.asm`
- `matrix_mul_3x3.asm`
- `c_compiled_style_sum.asm`
- `string_strlen_strcpy.asm`

## Folder Structure

- `index.html` - application entry point
- `assets/css/` - styles
- `assets/js/app.bundle.js` - bootstrap loader
- `assets/js/app-modules/` - main modules
  - `00-core.js` - core/engine
  - `10-ui.js` - UI/layout/windows/help
  - `20-app-runtime.js` - runtime/commands/run loop
- `help/` - help content
- `tools/` - modular tools
- `examples/` - ASM examples + manifest
- `docs/` - technical/migration documentation

## How to Run

### From the project root

- open index.html directly with browser (file://...)

### From the project root

#### Requirement

- Node.js 18+ (recommended)

#### Execute from the project root

```bash
npm start
```

Default server:

- `http://localhost:8080`

### Alternative (Windows)

- `start-web.bat`
- `powershell -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8080`

### Optional: Build C++ WASM Hotpath

Requires Emscripten (`emcc`) available on PATH:

```bash
node wasm/build-wasm-core.mjs
```

## Immediate Roadmap (0.9.x -> 1.0)

- **Fine-grained semantic parity**
  - Close residual edge-case differences vs Java MARS (exceptions, delayed branching, specific runtime messages).
- **Automated regression**
  - Create a test suite with reference programs to validate instructions, pseudo-ops, directives, and syscalls.
- **Continuous execution performance**
  - Reduce rendering cost during high-speed `Go` mode, using additional batching and fewer DOM recalculations. (IMPORTANT)
- **Tools (full functional parity)**
  - Complete the behavior of all tools for practical equivalence with Java versions.
- **I/O and Debugging UX**
  - Refine input/output flow in mixed scenarios (Run I/O + dialogs), maintaining predictable pauses and robust resumption.
- **Technical documentation**
  - Consolidate Java->Web mapping by subsystem and guides for new contributors.

## Compatibility Notes

- The browser imposes security and execution limits (I/O and real-time timing differ from Java/Swing).
- Inevitable adaptations for the web environment (filesystem, dialogs, audio, timing).
- The goal is maximum functional and visual similarity to MARS 4.5 within browser constraints.

## License

MIT (with credits to the original Java MARS project).

## Credits

- Original Java MARS: Pete Sanderson, Kenneth Vollmar, and contributors
- webMARS port (JavaScript): Nelson Ferreira
