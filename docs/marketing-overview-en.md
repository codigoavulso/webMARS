# webMARS — Product and Marketing Overview

## Positioning statement

**webMARS is a browser-native MIPS32 learning environment that brings assembly programming, debugging, interactive devices, and a teaching-focused C compiler into one accessible workspace.**

It preserves the familiar educational model of MARS 4.5 while removing the Java installation barrier and adding modern project workflows, responsive mobile support, multilingual learning material, optional cloud synchronization, and new runtime tools.

## Elevator pitch

Learn how a computer works from the instruction level upward—directly in the browser.

webMARS combines a MIPS assembler, simulator, debugger, Mini-C compiler, interactive hardware tools, structured lessons, and persistent projects in a single interface. Students can write code, inspect registers and memory, step backward through execution, explore interrupts and memory-mapped devices, and even run a mouse-driven desktop environment written entirely in MIPS assembly.

No Java installation is required. Local work stays in the browser by default, and the same interface adapts to desktop computers, tablets, and phones.

## The problem webMARS solves

Traditional architecture labs often begin with installation instructions, Java version issues, operating-system differences, and files scattered across local machines. Those obstacles appear before the first instruction is assembled.

webMARS moves the learning environment to the browser while retaining the visibility that makes MIPS useful for education:

- source code remains close to the generated instructions;
- registers, memory, labels, exceptions, and device state remain inspectable;
- execution can be controlled one instruction at a time;
- students can see how high-level constructs become assembly;
- instructors can provide one URL and a consistent interface across platforms.

## Core capabilities

### MIPS assembly and simulation

- MARS-style MIPS32 assembly syntax, directives, macros, pseudo-instructions, and common addressing forms.
- Multi-file assembly projects with includes and linked teaching examples.
- Integer instructions, branches, memory operations, exceptions, `LL`/`SC`, COP0, and COP1 floating-point execution.
- Configurable delayed branching and strict MARS compatibility options.
- Standard teaching memory maps plus compact text and compact data configurations.
- MARS-compatible syscalls for console, files, dialogs, random values, time, MIDI, and other educational services, together with additional services used by the bundled Mini-C libraries.

### Debugging and observability

- Run, step, pause, stop, reset, and backstep controls.
- Breakpoints directly associated with assembled instructions.
- Live register, COP0, COP1, text segment, data segment, label, message, and Run I/O views.
- Configurable backstep history using bounded inverse deltas instead of complete memory copies for every instruction.
- Runtime-state export and restoration covering registers, memory changes, breakpoints, random streams, virtual files, input state, program arguments, and device-related state.
- Local compile, assemble, and execution measurements with estimated JavaScript utilization and instruction throughput.

### Mini-C and C0 learning path

- A built-in teaching compiler that generates MIPS assembly.
- Cumulative C0 profiles from C0-S0 through C0-S4.
- A focused C1-NATIVE profile with byte-addressed `char` data, `argc`/`argv`, `void*`, and function pointers.
- Functions, structured control flow, arrays, pointers, structs, allocation, contracts, and project-local multi-file imports within the documented profiles.
- Compatibility headers and libraries for console I/O, strings, files, graphics, time, and related teaching tasks.
- Generated assembly remains available for inspection, assembly, execution, and comparison with the original C source.

### Interactive tools and devices

webMARS currently includes 18 browser-native tools:

- BHT Simulator
- Bitmap Display
- Bitmap Terminal Tool
- Data Cache Simulator
- Digital Lab Sim
- Floating Point Representation
- Instruction Counter
- Instruction Statistics
- Introduction to Tools
- Keyboard and Display MMIO Simulator
- Mars Bot
- Memory Reference Visualization
- MIPS X-Ray
- Scavenger Hunt
- Screen Magnifier
- Stack Visualizer
- System Clock and Timer
- TTY Device + ANSI Terminal

The device model includes external interrupts for the timer, keyboard, display, and hexadecimal keypad. Tool state is synchronized with execution, and stateful tools participate in backstep where applicable.

### Learning content

- 58 curated examples across lessons, fundamentals, algorithms, C compilation, devices, and systems topics.
- A 15-part introductory sequence covering registers, two's complement, logic, shifts, branches, loops, memory, endianness, arrays, stack frames, function calls, recursion, instruction encoding, IEEE 754, and memory hierarchy.
- Example variants and explanatory comments in English, Portuguese, and Spanish.
- Integrated help for the IDE, assembler, debugger, syscalls, tools, Mini-C profiles, settings, limits, and compatibility.

### Projects and accessibility

- Multi-file editor with tabs, syntax highlighting, undo/redo, virtual folders, and file management.
- Automatic session recovery and explicit local project storage in the browser.
- Import and download through standard browser file controls.
- Optional cloud accounts and project synchronization; cloud access is not required for local work.
- Light and dark themes.
- English, Portuguese, and Spanish interface, help, diagnostics, and learning material.
- Responsive desktop, tablet, and phone layouts.
- Android keyboard-aware terminal and editor sizing.
- No Java or WebAssembly runtime requirement.

## What webMARS adds beyond the original MARS 4.5

The original MARS 4.5 remains an important and stable Java desktop teaching application. webMARS follows its educational lineage but is an independent browser implementation rather than a repackaging of the Java program.

| Area | Original MARS 4.5 | webMARS extension |
| --- | --- | --- |
| Delivery | Downloadable Java JAR | Static browser application accessed through a URL |
| Device support | Desktop Java tools | Browser-native tools with responsive layouts and synchronized runtime state |
| Mobile use | Desktop-oriented interface | Dedicated stacked mobile interface with touch and Android keyboard handling |
| High-level language | Assembly-focused | Integrated Mini-C/C0 and C1-NATIVE teaching compiler targeting MIPS |
| Projects | Local desktop files and command-line multi-file assembly | Browser project workspace, virtual folders, recovery, local slots, and optional cloud synchronization |
| Languages | Primarily English | English, Portuguese, and Spanish UI, help, diagnostics, lessons, and examples |
| Runtime state | Forward/backward interactive debugging | Bounded inverse-delta backstep plus broader runtime and tool-state restoration |
| New tools | Classic MARS tool ecosystem | Adds tools such as Stack Visualizer, System Clock and Timer, and ANSI TTY with mouse input |
| Deployment | Java runtime on each machine | Static hosting, suitable for classroom servers and centrally managed environments |
| Demonstration systems | Assembly programs and devices | MARS-OS: a multi-module assembly environment with desktop UI, applications, RAM disk, and shell |

MARS 4.5 already provided an integrated editor, MIPS assembly and simulation, breakpoints, variable-speed execution, backward stepping, command-line execution, and a strong set of educational tools. Marketing comparisons should credit those foundations and describe webMARS as a browser-native continuation with additional workflows—not as the first product to offer them.

## MARS-OS: a showcase built inside the simulator

MARS-OS demonstrates what can be built using the same mechanisms available to students.

- Boots directly into a Windows 95-inspired Program Manager.
- Accepts mouse input through xterm SGR reports generated by the TTY tool.
- Includes a Start menu, desktop icons, windows, Terminal, text editor, spreadsheet, BASIC interpreter, and About dialog.
- Provides a 46-command shell inside the Terminal application.
- Includes a writable volatile RAM disk and multi-file application modules.
- Uses MMIO, ANSI terminal control, device waits, and MIPS assembly throughout.

MARS-OS is an educational demonstration, not a general-purpose operating system. It does not provide hardware boot, process isolation, virtual memory, networking, or compatibility with native desktop applications.

## What webMARS deliberately does not do

Clear limits strengthen the product message and help educators choose it for the right purpose.

- It is not a cycle-accurate processor, pipeline, cache, or board emulator.
- It is not a replacement for FPGA tools, hardware debuggers, JTAG, or a production embedded toolchain.
- It does not run Linux or arbitrary MIPS operating-system binaries.
- Mini-C is not a complete ISO C compiler, full preprocessor, native libc, or general desktop C environment.
- It does not provide unrestricted access to the host operating system's file system.
- It cannot load historical MARS extensions that depend on Java classes or desktop plug-ins.
- It does not currently reproduce the original Java MARS command-line batch and grading interface.
- It is not currently an installable offline PWA; it must be served over HTTP from a local or remote static host.
- Browser scheduling means sleep, MIDI, UI, and tool timing are not cycle-accurate.
- Browser quotas, popup policies, download rules, and audio permissions still apply.
- Practical MARS 4.5 compatibility is a goal, but unusual edge cases may behave differently from the original Java implementation.

## Target audiences

### Primary audiences

**Computer architecture and organization students**  
Students learning instructions, registers, memory, calling conventions, floating point, exceptions, and memory-mapped I/O.

**Assembly language instructors**  
Lecturers and teaching assistants who need a consistent lab environment that can be opened from a URL and demonstrated live.

**Introductory systems-programming courses**  
Courses that want students to move between a constrained C-like language, generated assembly, and machine-level execution.

**Self-directed learners**  
People who want an immediate, visual environment for understanding what code does below the source-language level.

### Secondary audiences

**Schools using Chromebooks, tablets, or managed computers**  
Institutions where installing a Java desktop application on every machine is inconvenient or impossible.

**Educators designing device and interrupt labs**  
Teachers exploring MMIO, timers, keyboards, displays, cache behavior, branch prediction, and stack structure.

**Retro-computing and low-level programming enthusiasts**  
Users interested in terminal interfaces, compact operating-system experiments, BASIC interpreters, and assembly-only applications.

**Open-source contributors and language-tooling students**  
Developers interested in assemblers, interpreters, compilers, debuggers, browser runtimes, or educational visualization.

### Not the primary audience

webMARS is not positioned for production firmware validation, performance prediction for physical MIPS processors, full-system emulation, or compiling arbitrary existing C applications.

## Technical overview

- **Application model:** static single-page web application.
- **Runtime:** one independent JavaScript assembler and simulator core; no native or WebAssembly execution backend.
- **Architecture:** educational MIPS32, little-endian memory, COP0/COP1, exceptions, external interrupts, and configurable memory maps.
- **Default addresses:** user text at `0x00400000`, static data at `0x10010000`, heap at `0x10040000`, exception handler at `0x80000180`, and MMIO at `0xffff0000`.
- **Memory:** sparse allocation with a selectable practical limit from 0.25 to 2 GiB.
- **Backstep:** configurable from 0 to 1,000,000 steps, bounded by a memory budget and stored as inverse deltas.
- **Compiler:** teaching-focused Mini-C/C0 and C1-NATIVE profiles generating MIPS assembly with the o32 calling convention.
- **Tool architecture:** dynamically registered browser tools receive compact runtime event batches and synchronized snapshots.
- **Persistence:** local browser storage by default, with optional configurable cloud synchronization.
- **Quality controls:** more than 200 automated regression tests covering the assembler, runtime, instruction behavior, memory invariants, interrupts, compiler, tools, examples, help, and release readiness.
- **Distribution:** MIT-licensed project distributed as static files; historical MARS material retains its original attribution and licensing.

## Privacy and deployment message

webMARS is local-first. Source files, settings, virtual files, recovery state, and benchmark measurements remain on the device unless the user explicitly invokes cloud functionality. The product contains no advertising.

Institutions can deploy it as a static site on an internal server or public host. The application does not require a database for local use. Optional cloud project features communicate only with the server configured for that purpose.

Important work should still be downloaded or backed up: browser storage is convenient recovery storage, not a permanent archival system.

## Recommended messaging pillars

### 1. Start immediately

No Java setup. No platform-specific installer. Open the browser and begin assembling.

### 2. Make execution visible

Registers, memory, labels, instructions, stack frames, devices, exceptions, and performance behavior remain observable while the program runs.

### 3. Move from C to machine code

Compile a structured teaching subset of C, inspect the generated MIPS assembly, and debug the result in the same workspace.

### 4. Learn through systems, not isolated snippets

Use multi-file projects, interrupts, MMIO devices, tools, and MARS-OS to connect individual instructions to complete working systems.

### 5. Teach anywhere

Use the same environment on desktop computers, tablets, phones, and managed classroom devices, in three supported languages.

## Ready-to-use marketing copy

### Homepage hero

**Understand the machine. Build from the instruction up.**

Write, assemble, run, and debug MIPS32 programs directly in your browser. Explore registers, memory, interrupts, interactive devices, Mini-C compilation, and a complete assembly-built desktop environment—without installing Java.

**Primary call to action:** Launch webMARS  
**Secondary call to action:** Explore the lessons

### Short product description

webMARS is a free, open-source, browser-native MIPS32 learning environment inspired by MARS 4.5. It combines an assembler, JavaScript simulator, debugger, Mini-C compiler, 18 interactive tools, 58 curated examples, multilingual documentation, persistent projects, and responsive desktop/mobile workflows in one accessible application.

### Institutional description

webMARS gives computer architecture and systems-programming courses a consistent MIPS learning environment that can be deployed as a static website. Students can work locally without accounts, while optional cloud projects support continuity across devices. Its integrated debugger, Mini-C compiler, device tools, structured lessons, and multilingual interface reduce setup friction without hiding machine-level behavior.

### Social post

Meet webMARS: a browser-native MIPS32 IDE for learning computer architecture from the instruction level upward. Assemble and debug MIPS, compile Mini-C, inspect registers and memory, experiment with MMIO and interrupts, and run MARS-OS—all without installing Java.

### One-line descriptions

- **A modern MIPS learning lab in your browser.**
- **From Mini-C to MIPS, registers, memory, and devices—all in one workspace.**
- **The educational spirit of MARS 4.5, rebuilt for the modern web.**
- **Write the instruction. Watch the machine change.**

### Tagline options

1. **Understand the machine.**
2. **MIPS learning, rebuilt for the web.**
3. **From source code to system state.**
4. **Build from the instruction up.**
5. **See what every instruction does.**

## Frequently asked questions

### Is webMARS the original MARS 4.5?

No. webMARS is an independent browser implementation inspired by and designed for practical compatibility with the original MARS educational environment. It uses its own JavaScript assembler, simulator, compiler, interface, and browser tools.

### Does it require Java?

No. A modern web browser is sufficient for the application. A simple HTTP server is required when hosting it locally because the app loads its resources as a static website.

### Can students use it without an account?

Yes. Editing, compiling, assembling, running, browser storage, and downloads work locally. Cloud accounts and synchronization are optional.

### Is it a full C compiler?

No. The integrated compiler implements documented C0 teaching profiles and a focused C1-NATIVE extension. It is designed for education and inspection of generated MIPS assembly, not for compiling arbitrary ISO C software.

### Does it work on phones?

Yes. The interface has a dedicated stacked mobile layout, touch-friendly controls, and Android keyboard-aware editors and terminal display. A larger screen remains preferable for long debugging sessions.

### Can it replace hardware simulation?

No. webMARS models the architectural behavior needed for teaching and software experiments. It is not cycle-accurate and does not predict the timing, pipeline, caches, or electrical behavior of a physical processor.

### Can instructors host it themselves?

Yes. The local-first application is distributed as static files and can be served from a conventional web server. Optional cloud features require a compatible configured backend, but local teaching use does not.

### What is MARS-OS?

MARS-OS is a multi-file MIPS assembly demonstration included with webMARS. It combines a mouse-driven desktop, Terminal, editor, spreadsheet, BASIC interpreter, RAM disk, and command shell to demonstrate how MMIO, terminal control, data structures, and application logic fit together.

## Comparison and attribution notes

The original MARS project describes MARS 4.5 as a Java-based educational IDE with editing, assembly, simulation, breakpoints, variable-speed execution, backward stepping, command-line operation, and pluggable tools. Those capabilities should not be claimed as webMARS inventions.

Recommended attribution:

> webMARS is inspired by the original MARS MIPS Assembler and Runtime Simulator created by Pete Sanderson, Kenneth Vollmar, and contributors. webMARS is an independent browser implementation maintained by Nelson Ferreira.

Primary references for the historical comparison:

- Original MARS repository: <https://github.com/dpetersanderson/MARS>
- MARS 4.5 introduction: <https://dpetersanderson.github.io/Help/MarsHelpIntro.html>
- MARS project overview: <https://computerscience.missouristate.edu/mars-mips-simulator.htm>

## Claims guidance

Prefer:

- “practical MARS 4.5 source compatibility”
- “browser-native”
- “teaching-focused Mini-C compiler”
- “architectural simulator”
- “local-first with optional cloud synchronization”
- “more than 200 automated regression tests”

Avoid:

- “100% MARS compatible”
- “full MIPS hardware emulator”
- “full C/C1 compiler”
- “cycle-accurate”
- “works fully offline”
- “permanent browser backup”
- “the first MIPS debugger with backstep or tools”

