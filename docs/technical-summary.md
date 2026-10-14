# webMARS: a browser MIPS assembler, simulator and pipeline teaching model

**Technical summary for academic use — webMARS 0.6.2**

A short, citable description of what the system is, how it was built and what
has been measured about it. Intended for inclusion in a paper, a thesis chapter
or a tool-demonstration abstract. Every figure below links to the generated
report that produced it; none of them are estimates.

## Abstract

webMARS is a browser implementation of the MARS 4.5 MIPS assembler and runtime
simulator. It provides an editor, a MIPS32 assembler, an instruction-level
functional runtime, the classic MARS tool set, a Mini-C compiler, and the
Pipeline Lab: an explicitly separate five-stage cycle-accurate model for
teaching microarchitecture. Editing, compilation and simulation run entirely
client-side from static files, with no install or runtime dependencies. An
optional per-installation BackMars service provides accounts, Cloud projects,
email recovery and a versioned public teaching library. Compatibility
with MARS 4.5 is measured rather than asserted, by assembling and running the
same programs in both simulators and comparing machine code, memory, registers
and console output.

## System description

| Property | Value |
| --- | --- |
| Implementation | JavaScript, no build step, no runtime dependencies |
| Delivery | Static web application; optional Flask/SQLite BackMars for accounts and sharing |
| Architecture simulated | MIPS32, MARS 4.5 dialect |
| Assembler | Two-pass, with macros, pseudo-instructions and MARS directives |
| Runtime | Instruction-level interpreter with backstep, breakpoints, COP0/COP1 and exceptions |
| Timing model | Pipeline Lab, five stages, configurable and versioned, separate from the runtime |
| Localisation | Twenty languages, four right-to-left |
| Licence | MIT |

The application is composed of ordered, non-module scripts sharing browser
globals; dependencies point in one direction, from the composition root down to
a DOM-free core. That core runs unmodified under Node, which is what makes the
whole assembler and runtime testable without a browser. The module boundaries
and the rules governing them are documented in
[code-architecture.md](code-architecture.md).

## Pedagogical contribution: the Pipeline Lab

The Pipeline Lab is the system's main teaching capability and is deliberately
*not* the runtime. It reads assembled instructions and models timing; it never
executes the program and never touches machine state. That separation is what
lets the functional runtime be described honestly as not cycle-accurate.

It models five stages with configurable forwarding, delay slots, static branch
prediction (always-taken and always-not-taken), branch resolution in ID or EX,
memory latency from one to eight cycles, and optional serialisation of trapping
instructions. Seven named, individually versioned profiles can be compared side
by side on the same program.

Because the model does not execute the program, it cannot observe a real branch
outcome. Rather than inventing one, it **declares** the assumption it uses -
sequential fall-through by default, or backward-taken with a bounded iteration
count - and prints that assumption in the interface and in every exported
report. Instructions whose timing is not modelled, such as floating point, are
listed by name in each report instead of being silently mistimed.

Two views are provided: a *Learn* view showing stage occupancy, an
instruction/cycle timeline and a plain-language explanation of every stall,
bubble and flush; and an *Architecture* view drawing the datapath, the four
pipeline registers, the control lines derived per instruction, and the active
forwarding paths. Reports export as JSON and CSV carrying the model version,
profile version, full configuration and an FNV-1a hash of the program, so a
result is reproducible and attributable.

Seven guided laboratories accompany it, each with objectives, prerequisites, a
predict-before-you-run step and reflection questions, with solutions in separate
files. Every numerical claim in every worksheet is re-measured against the model
by the test suite, so a worksheet cannot disagree with the tool a student is
using.

## Evaluation

### Compatibility with MARS 4.5

Eleven programs covering arithmetic, logic, shifts, comparisons, branches,
memory widths, multiply and divide, function calls, pseudo-instruction
expansion, data directives and console output are assembled and executed in both
simulators. Four observables are compared: the encoded text segment, the data
segment, console output, and all 32 general-purpose registers.

| Result | Count |
| --- | --- |
| Byte-identical to MARS 4.5 | 8 |
| Identical apart from a declared difference | 3 |
| Unexplained differences | 0 |

The three declared differences are pseudo-instruction expansions where webMARS
deliberately diverges: a 32-bit `li` that does not destroy `$at`, and a `ble`
against an immediate whose expansion cannot raise a spurious overflow. Each is
documented with a minimal reproduction case. The reference simulator is pinned
by SHA-256. See [mars-conformance.md](mars-conformance.md).

The full capability inventory - 141 basic instructions, 83 pseudo-instruction
opcodes, 20 directives, 39 syscalls, 8 exception causes and the memory-mapped
device registers - is classified per capability and linked to the test or
example that demonstrates it in [comparison-matrix.md](comparison-matrix.md).

### Correctness of the test suite

Coverage is measured from raw V8 data, because the application modules are
evaluated in a sandbox that the standard Node coverage reporter does not
observe. Per-module floors fail the build on regression, and modules that the
harness cannot measure at file level are listed explicitly as unmeasured rather
than omitted. See [coverage-report.md](coverage-report.md).

Coverage records that a line ran, not that it was checked, so a mutation suite
answers the second question directly: twelve hand-written mutants introduce
specific plausible defects into the assembler, the runtime and the timing model.
All twelve are detected. Three survived the first run and are now covered by
tests written in response. See [mutation-report.md](mutation-report.md).

Bounded deterministic fuzzing drives malformed programs and corrupted state
payloads through the assembler, the runtime and the state importer; the property
asserted is that every input produces a diagnostic rather than a crash. One
genuine defect was found this way and fixed.

### Performance

Measured under a published protocol - three discarded warm-up runs, seven
measured repetitions, the fastest and slowest discarded, medians reported with
interquartile ranges - with the machine recorded alongside every result. The
figures are Node.js measurements and are labelled as bounding the engine's cost
rather than predicting a browser's. See [benchmark.md](benchmark.md).

### Accessibility

An initial, partial WCAG 2.2 AA audit runs on every build, checking colour
contrast in both themes, reliance on colour alone, reduced-motion support,
keyboard operability and accessible names. Criteria that require human judgement
are listed as unchecked rather than as passing. No assistive-technology user has
tested the system. See [accessibility.md](accessibility.md).

## Threats to validity

- The differential corpus is eleven programs, not the instruction set. Passing
  it is evidence of compatibility, not proof of it.
- Benchmark figures come from one machine under Node.js. No cross-browser or
  cross-machine claim is made.
- Coverage is measurable at file level for five shipped files; the remainder are
  exercised through extracted source fragments and are reported as unmeasured.
- The mutation set is hand-written and therefore not exhaustive; a perfect score
  does not mean the suite would catch every possible fault.
- No usability study has been conducted. There is no empirical evidence that the
  Pipeline Lab improves learning outcomes, and none is claimed.
- Portability is verified on Chrome under Windows only; other combinations are
  recorded as untested in [portability.md](portability.md).

## Reproducing these results

```bash
git clone https://github.com/codigoavulso/webMARS
cd webMARS
npm test                              # the whole correctness gate
npm run coverage                      # coverage report and thresholds
npm run mutation                      # mutation score
npm run fetch:mars && npm run differential   # conformance with MARS 4.5
npm run benchmark                     # performance under the published protocol
npm run audit:a11y                    # accessibility audit
```

Each command rewrites the report it owns from the code in the working tree.
There is no hidden configuration and no external service.

## Citation

See [CITATION.cff](../CITATION.cff). Cite the version, not the repository: every
figure in this summary is anchored to webMARS 0.6.2, and
[release-process.md](release-process.md) records what a version bump promises.

## Related work

MARS 4.5 (Vollmar and Sanderson) is the reference implementation this system
targets and is compared against directly. The five-stage pipeline model follows
the presentation in Patterson and Hennessy; differences between that model and
both webMARS runtimes are tabulated in
[comparison-matrix.md](comparison-matrix.md).
