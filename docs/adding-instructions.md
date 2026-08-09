# Adding an instruction or a pseudo-instruction

Both live in `assets/js/app-modules/00-core.js`. A real instruction is decoded,
encoded and executed; a pseudo-instruction is rewritten into real ones before
any of that happens. Deciding which you are adding is the first step, and it is
usually obvious: if it has no machine encoding of its own, it is a pseudo.

## Where the assembler touches an instruction

The core walks a statement through five places. A new instruction generally
needs all five; a pseudo-instruction usually needs only the first.

| Stage | Function or table | Responsibility |
| --- | --- | --- |
| Expansion | `expandPseudo` / `expandPseudoFromReference` | Rewrites a pseudo into real statements |
| Pass 1 | the pass-1 walk in `assemble` | Sizes the statement and records labels |
| Pass 2 | the pass-2 walk in `assemble` | Builds the plan row: opcode, registers, immediate, target |
| Encoding | `encodeInstructionWordFromPlanRow` | Turns the plan row into a 32-bit word |
| Execution | `executeInstruction` | Applies the effect to registers and memory |

`assets/js/reference/instructions.generated.js` is *data*, extracted from the
MARS 4.5 sources. It drives the help system and the compatibility matrix. It is
not the dispatcher: adding an entry there does not make an instruction work,
and implementing an instruction without an entry there makes it an undocumented
extension.

## Adding a real instruction

Worked shape, using a hypothetical `absu $rd, $rs` (absolute value, unsigned
result). Read it as a checklist, not as code to paste.

### 1. Decide the format

R-type, I-type or J-type determines which fields the plan row carries and how
`encodeInstructionWordFromPlanRow` packs them. Match whatever MARS 4.5 does; if
MARS does not have the instruction, you are adding a webMARS extension and it
must be labelled as one in the compatibility matrix.

### 2. Build the plan row in pass 2

Find the block in the pass-2 walk that handles the closest existing
instruction - `add` for an R-type, `addi` for an I-type - and add yours beside
it. The plan row names the fields the encoder expects (`opcode`, `rs`, `rt`,
`rd`, `immediate`, `address`, `base`, `cc`). Resolve registers through the
engine's register lookup rather than parsing `$` yourself, so aliases and
numeric forms keep working.

### 3. Encode it

Add the case to `encodeInstructionWordFromPlanRow`. The returned word is what
the Text Segment window shows and what a state export carries, so an incorrect
encoding is visible to the user even when execution is right.

### 4. Execute it

Add the case to `executeInstruction`. Rules that are not optional:

- **Never write `$zero`.** Write through the engine's register write path; if
  you assign `this.registers[0]` directly you have broken the architecture, and
  `runtime-isa-regression.test.mjs` will say so.
- **Signed and unsigned are different instructions.** `add` traps on overflow,
  `addu` does not. Do not implement one and alias the other.
- **Sign-extend 16-bit immediates** with `signExtend16` unless the instruction
  is defined to zero-extend (`andi`, `ori`, `xori`).
- **Coerce results to 32 bits.** JavaScript numbers are doubles; `| 0` or
  `>>> 0` at the end of the computation, matching the instruction's signedness.
- **Return the next PC only when you change control flow.** Returning
  `{ nextPc }` from a non-branch silently breaks stepping.
- **Go through the memory API** for any load or store, never through a raw
  array. See [runtime-invariants.md](runtime-invariants.md); bypassing it breaks
  backstep, alignment checks and MMIO notification at once.

### 5. Test it

Add a case to `tests/runtime-isa-regression.test.mjs` that asserts the register
or memory effect, and a case to `tests/runtime-memory-invariants.test.mjs` if
the instruction touches memory. Cover the edge the instruction exists for:
overflow for a trapping form, sign for a signed form, alignment for a
half-word or word access.

### 6. Regenerate the compatibility matrix

```bash
npm run docs:matrix
```

The matrix is generated from the dispatcher, so a new instruction appears
automatically - as `partial` until a test or example names it, then `complete`.
`tests/evidence-package.test.mjs` fails if you forget to regenerate it.

## Adding a pseudo-instruction

Most pseudo-instructions need no code at all. `expandPseudoFromReference` reads
`assets/js/reference/pseudo-ops.generated.js`, which carries the MARS expansion
templates, and rewrites the statement from the template. If MARS 4.5 already
defines your pseudo, the expansion is very likely already there.

Write code only when the expansion cannot be expressed as a template - when it
depends on the operand values, for instance, as `li` does when it decides
between one instruction and two. Those cases are listed in
`MANUAL_PSEUDO_EXPANSION_OPS` and handled in `expandPseudo`.

Rules for a manual expansion:

- **`$at` is yours to use and yours to declare.** The assembler warns when a
  program uses `$at` directly precisely because expansions clobber it.
- **Expansion happens in both passes.** Pass 1 needs the same *number* of
  instructions pass 2 will emit, or every label after it moves. This is the
  single most common way to break the assembler: an expansion that emits one
  instruction in pass 1 and two in pass 2 corrupts every later address.
- **Respect `extendedAssembler`.** With the setting off, a pseudo-instruction
  must be refused, not silently expanded.
- **Do not expand into another pseudo** unless you are certain the second
  expansion also runs; prefer emitting real instructions.

Test a pseudo-instruction by asserting the *expansion*, not only the result:
assemble the statement and check the produced `textRows`, so a change in the
expansion cannot pass just because the arithmetic still comes out right.

## Instructions and the Pipeline Lab

`tools/pipeline-lab.js` decodes instructions independently for its timing
model. A new instruction reaching it unknown is classified `supported: false`,
flows through the five stages as a generic operation, and is listed under
`program.unmodelled` in every exported report - so it is declared rather than
silently mistimed.

Teach the model about it only if its timing behaviour differs from the default:
add the opcode to the relevant set at the top of the file (`LOAD_OPS`,
`STORE_OPS`, `BRANCH_TWO_REG_OPS`, `TRAP_OPS`, and so on), then add a case to
`tests/pipeline-lab-microarchitecture.test.mjs`. Changing timing means bumping
the affected profile version - see [pipeline-lab.md](pipeline-lab.md).

## Checklist

- [ ] Plan row built in pass 2, with registers resolved through the engine
- [ ] Encoded in `encodeInstructionWordFromPlanRow`, matching MARS 4.5
- [ ] Executed in `executeInstruction`, 32-bit coerced, `$zero` protected
- [ ] Memory touched only through the memory API
- [ ] Signed and unsigned variants implemented separately
- [ ] Pseudo-expansions emit the same instruction count in both passes
- [ ] Tests added to the ISA suite, and to the memory suite if it loads or stores
- [ ] `npm run docs:matrix` rerun and the result committed
- [ ] Pipeline Lab classification checked, and profile version bumped if timing moved
