# Your first contribution to webMARS

This is the shortest path from a clone to a merged change. It assumes you know
JavaScript and can read MIPS assembly; it assumes nothing about this codebase.

## What you need

Node 20 or newer, and a browser. That is the whole list.

There is no build step, no bundler, no transpiler and no runtime dependency:
`node_modules` holds nothing the application uses. The application is a static
site made of ordered `<script>` tags, which is why you can edit a file and
reload the page.

```bash
git clone https://github.com/codigoavulso/webMARS
cd webMARS
npm start
```

`npm start` serves the repository over HTTP on the printed URL. Opening
`index.html` from the file system does *not* work: manifests, help pages,
examples and tools are fetched at runtime.

## Run the tests before you change anything

```bash
npm test
```

If that does not pass on a clean clone, stop and open an issue - do not start
debugging your own change against a broken baseline.

## Find where your change belongs

| If your change is about | Edit |
| --- | --- |
| What an instruction *does* | `assets/js/app-modules/00-core.js` |
| Assembler syntax, directives, pseudo-instructions | `assets/js/app-modules/00-core.js` |
| A syscall or a memory-mapped device | `assets/js/app-modules/00-core.js` |
| The editor, windows, panes, dialogs | `assets/js/app-modules/10-ui.js` |
| Menus and keyboard commands | `assets/js/app-modules/13-ui-menu-system.js` |
| A tool in the Tools menu | `tools/<tool>.js` |
| Mini-C compilation | `assets/js/app-modules/17-mini-c-compiler.js` |
| Saving, loading, projects, sessions | `assets/js/app-modules/18-runtime-browser-storage.js` |
| Wiring any of the above together | `assets/js/app-modules/20-app-runtime.js` |
| In-app help | `help/en/` first, then the other languages |
| A worked example program | `examples/en/` and `examples/examples.json` |

[code-architecture.md](code-architecture.md) explains why the split falls where
it does, and which direction dependencies are allowed to point.

## The five rules that will catch you out

1. **Scripts load in a fixed order and share globals.** A module must not use
   anything defined by a script loaded after it. The order is in
   `assets/js/app.bundle.js` and is repeated in
   [code-architecture.md](code-architecture.md).
2. **Every user-visible string needs a catalog entry.** Add it to
   `assets/js/i18n/en.js`. `npm test` fails on any string that reaches the
   interface without one. Prefer unambiguous English: single words such as
   "Profile" or "Disabled" translate badly out of context.
3. **Never write a literal colour.** Use the theme tokens (`var(--text)`,
   `var(--line)`, `var(--surface)`, `var(--accent-strong)`). The only exception
   is simulated device output - a bitmap screen or an LED keeps its real colour.
4. **Persistence failure is an error path, not a success.** Nothing may report
   that it saved until storage has actually accepted the write.
5. **The functional runtime is not cycle-accurate and must never be described
   as if it were.** Timing claims belong to the Pipeline Lab, which is a
   separate, explicitly labelled model.

## Write the test first, or at least at the same time

Tests live in `tests/` and use `node:test` with no framework. The helper
`tests/helpers/engines.mjs` gives you a real assembler and runtime:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createJavaScriptEngine } from "./helpers/engines.mjs";

test("addi adds a signed immediate", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  assert.equal(engine.assemble(`
.text
main:
  addi $t0, $zero, -5
  li $v0, 10
  syscall
`, { sourceName: "example.s" }).ok, true);

  engine.go(50);
  assert.equal(engine.exportRuntimeState({ includeProgram: false }).registers[8], -5);
});
```

Register a new test file in the `test` script in `package.json`, or it will
never run in CI.

Adding a test file also changes the compatibility matrix, because the matrix
collects its evidence column from `tests/`. Run `npm run docs:matrix` and commit
the result; `tests/evidence-package.test.mjs` fails until you do. That is the
check working, not a flaky test.

Pick the suite that matches what you changed:

| Suite | Covers |
| --- | --- |
| `core-regression.test.mjs` | Assembler, directives, persistence, layout |
| `runtime-isa-regression.test.mjs` | Individual instruction semantics |
| `runtime-memory-invariants.test.mjs` | Memory maps, alignment, segment limits |
| `tool-runtime-regression.test.mjs` | Tools and snapshot delivery |
| `pipeline-lab-microarchitecture.test.mjs` | Pipeline Lab timing only |
| `robustness-fuzz.test.mjs` | Malformed input, extreme state |
| `differential-mars.test.mjs` | Conformance with the real MARS 4.5 |
| `release-readiness.test.mjs` | Translations, theming, manifests, version |

## Check your work

```bash
npm test
npm run build
```

`npm run build` validates the static release tree. If you touched anything that
the browser renders, also load the page and look at it: several classes of bug
here only exist in a real DOM.

Optional, and worth running when you have changed the assembler, the runtime or
the Pipeline Lab:

```bash
npm run coverage
npm run mutation
```

`coverage` enforces per-module floors and refreshes
[coverage-report.md](coverage-report.md). `mutation` breaks the source on
purpose and checks that the suite notices; see
[mutation-report.md](mutation-report.md). A survivor there means your change
has no test that would catch it being wrong.

If you touched the assembler or an instruction, also run the differential
against the real MARS 4.5:

```bash
npm run fetch:mars
npm run differential
```

It assembles and runs the same programs in both simulators and compares machine
code, registers, memory and console output. A new difference is a defect unless
you add it to the exception list in `scripts/differential-mars.mjs` with a
reason and a minimal case. Not every difference is a bug - webMARS deliberately
diverges in a few places - but every one of them has to be written down. See
[mars-conformance.md](mars-conformance.md).

## What a good change looks like

- It does one thing, and the commit message says which.
- It has a test that fails before the change and passes after.
- It leaves `npm test` green, including the translation and theming checks.
- It does not lower a coverage threshold or delete a mutant to make a run pass.
- If it changes documented behaviour, it changes the documentation in the same
  commit.
- If it changes Pipeline Lab timing, it bumps the affected profile version -
  published reports must stay distinguishable.

## Where to go next

- [code-architecture.md](code-architecture.md) - the module map and the
  boundaries between them.
- [adding-instructions.md](adding-instructions.md) - instructions and
  pseudo-instructions, end to end.
- [adding-syscalls-and-devices.md](adding-syscalls-and-devices.md) - syscalls
  and memory-mapped devices.
- [runtime-invariants.md](runtime-invariants.md) - what memory, snapshots and
  backstep guarantee, and what breaks if you violate it.
- [tool-api.md](tool-api.md) - writing a tool for the Tools menu.
- [release-process.md](release-process.md) - how a version is cut.
