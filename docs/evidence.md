# Comparison and Evidence

Every public claim webMARS makes about itself is backed by a document generated
from the code in the same commit. This page is the index to those documents and
to the commands that regenerate them.

Nothing here is written by hand. If a number in one of these reports disagrees
with the software, the build fails.

## The reports

| Report | Question it answers | Regenerate with |
| --- | --- | --- |
| [comparison-matrix.md](comparison-matrix.md) | What does webMARS support, and what test or example proves it? | `npm run docs:matrix` |
| [mars-conformance.md](mars-conformance.md) | Where does webMARS behave differently from the real MARS 4.5, and why? | `npm run differential` |
| [coverage-report.md](coverage-report.md) | How much of the shipped source do the tests actually execute? | `npm run coverage` |
| [mutation-report.md](mutation-report.md) | Would the tests notice if the code were wrong? | `npm run mutation` |
| [benchmark.md](benchmark.md) | How fast is it, under what protocol, on what machine? | `npm run benchmark` |
| [accessibility.md](accessibility.md) | Which WCAG 2.2 criteria were checked, and which were not? | `npm run audit:a11y` |
| [portability.md](portability.md) | Which browsers and platforms has it actually been run on? | maintained by hand, per release |

## How to check a claim without asking the author

1. **Clone and run the tests.** `npm test` is the whole gate; there is no
   hidden CI configuration and no external service.
2. **Regenerate any report.** Each command above rewrites its document from the
   current code. `tests/evidence-package.test.mjs` fails if the compatibility
   matrix is stale, so a commit cannot ship documentation describing a different
   version of itself.
3. **Reproduce the MARS comparison.** `npm run fetch:mars` downloads the exact
   MARS 4.5 build the conformance report was produced against and refuses any
   other, verified by SHA-256. Then `npm run differential` reruns the whole
   comparison.
4. **Reproduce a benchmark figure.** The protocol - warm-up, repetitions,
   outlier rule, statistic - is printed in the report and applied by the script.

## What the evidence says today

These are summaries; the linked report is the authority in each case.

### Functional compatibility

141 basic instructions, 83 pseudo-instruction opcodes, 20 directives, 39
syscalls and 8 exception causes are inventoried, each classified as `complete`,
`partial`, `webMARS extension` or `not supported`. A capability is only marked
`complete` when a test or example names it; otherwise it is `partial`. There is
no grade without evidence behind it.

### Behavioural conformance with MARS 4.5

Eleven programs are assembled and run in both simulators, comparing machine
code, data segment, console output and all 32 general-purpose registers. Eight
are byte-identical. Three differ only in the encoding of a pseudo-instruction,
for reasons written down in the report, and each of those has a minimal
reproduction case. There are no unexplained differences.

### Correctness of the tests themselves

Coverage is measured from raw V8 data, because the application modules run in a
sandbox that `node --test` coverage cannot see. Per-module floors fail the build
when coverage drops. Separately, twelve hand-written mutants introduce specific
plausible defects into the assembler, the runtime and the Pipeline Lab; all
twelve are detected. Three were not, until the tests that catch them were
written.

### Performance

Measured under a published protocol with a declared warm-up, repetition count
and outlier rule, reported as medians with interquartile ranges. The figures are
Node.js measurements on one machine and are labelled as such: they bound the
engine's cost and predict nothing about a different machine or a browser.

### Accessibility

An initial, partial WCAG 2.2 AA audit. The criteria that were checked
automatically are listed, and so are the ones that were not checked at all. No
assistive-technology user has tested the application, and the statement says so
rather than rounding the claim up.

## What is deliberately not claimed

- **The functional runtime is not cycle-accurate.** It reports no cycle counts
  and must never be cited for performance comparisons against hardware. Timing
  belongs exclusively to the Pipeline Lab, which is a separate model that
  declares its profile, its version and its branch-outcome assumption in every
  exported report. See [pipeline-lab.md](pipeline-lab.md).
- **Full WCAG 2.2 AA conformance is not claimed.** See the accessibility
  statement for exactly which criteria remain unevaluated.
- **No cross-browser performance claim is made.** The benchmark runs under
  Node.js; browser automation is not part of it.
- **The differential corpus is eleven programs, not the instruction set.**
  Passing it is evidence, not proof, of compatibility.

## Citing this work

[CITATION.cff](../CITATION.cff) carries the title, version, licence and
repository, and references the MARS 4.5 release webMARS targets. See
[release-process.md](release-process.md) for what a version bump promises and
how a citable archive is prepared.
