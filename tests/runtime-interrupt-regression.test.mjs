import assert from "node:assert/strict";
import test from "node:test";
import { createJavaScriptEngine } from "./helpers/engines.mjs";

// A program that spins in a loop while a device raises an interrupt. The handler at
// the standard MARS address records the cause, then returns with eret.
const INTERRUPT_PROGRAM = `
.data
ticks:  .word 0
cause:  .word 0
.text
.globl main
main:
  li   $t0, 0
loop:
  addi $t0, $t0, 1
  blt  $t0, 100, loop
  li   $v0, 10
  syscall

.ktext 0x80000180
  mfc0 $k0, $13
  la   $k1, cause
  sw   $k0, 0($k1)
  la   $k1, ticks
  lw   $k0, 0($k1)
  addi $k0, $k0, 1
  sw   $k0, 0($k1)
  eret
`;

async function assembledEngine(source = INTERRUPT_PROGRAM) {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const result = engine.assemble(source, { sourceName: "interrupt.s" });
  assert.equal(result.ok, true, `assembly failed: ${JSON.stringify(result.errors ?? [])}`);
  return engine;
}

function readWordAt(engine, label) {
  const snapshot = engine.getSnapshot();
  const entry = snapshot.labels.find((row) => row.label === label);
  assert.ok(entry, `missing label ${label}`);
  return engine.readWord(entry.address) | 0;
}

test("a device interrupt runs the MARS handler and eret resumes the interrupted instruction", async () => {
  const engine = await assembledEngine();

  engine.step();
  const resumeAddress = engine.getSnapshot().pc >>> 0;
  assert.equal(engine.requestExternalInterrupt(0x100), true, "the timer cause is accepted");

  const delivered = engine.step();
  assert.equal(delivered.ok, true);
  const afterEntry = engine.getSnapshot();
  assert.equal(afterEntry.pc >>> 0, 0x80000180, "control moved to the exception handler");
  assert.equal(afterEntry.cop0[14] >>> 0, resumeAddress, "EPC points at the instruction that did not run");
  assert.equal((afterEntry.cop0[13] >>> 0) & 0xffc, 0x400, "Cause carries the timer bit with exception code 0");
  assert.equal((afterEntry.cop0[12] >>> 0) & 0x2, 0x2, "Status enters exception level");
  assert.equal(afterEntry.pendingExternalInterrupt, 0, "the request is consumed once");

  // The handler is a handful of pseudo-instructions; run until control leaves the
  // kernel segment rather than hard-coding how many words it expands to.
  for (let index = 0; index < 40 && (engine.getSnapshot().pc >>> 0) >= 0x80000000; index += 1) {
    engine.step();
  }
  const afterHandler = engine.getSnapshot();
  assert.equal(afterHandler.pc >>> 0, resumeAddress, "eret resumed the interrupted instruction");
  assert.equal((afterHandler.cop0[12] >>> 0) & 0x2, 0, "eret cleared exception level");
  assert.equal(readWordAt(engine, "ticks"), 1, "the handler ran exactly once");
  assert.equal(readWordAt(engine, "cause") & 0xffc, 0x400);
});

test("interrupts respect the interrupt enable and mask bits, unlike a bare device poke", async () => {
  const engine = await assembledEngine();
  engine.step();

  // Status with IE cleared: the request stays latched instead of being delivered.
  engine.setCop0Value(12, 0x0000ff00);
  assert.equal(engine.requestExternalInterrupt(0x100), true);
  engine.step();
  assert.notEqual(engine.getSnapshot().pc >>> 0, 0x80000180, "a masked interrupt is not taken");
  assert.equal(engine.getSnapshot().pendingExternalInterrupt, 0x100, "the request stays pending");

  // Restoring the MARS default status (IE plus every IM bit) delivers it.
  engine.setCop0Value(12, 0x0000ff11);
  engine.step();
  assert.equal(engine.getSnapshot().pc >>> 0, 0x80000180, "enabling interrupts delivers the pending request");
});

test("simultaneous device requests retain every pending interrupt line", async () => {
  const engine = await assembledEngine();
  engine.step();
  assert.equal(engine.requestExternalInterrupt(0x40), true);
  assert.equal(engine.requestExternalInterrupt(0x80), true);
  assert.equal(engine.requestExternalInterrupt(0x100), true);
  assert.equal(engine.getSnapshot().pendingExternalInterrupt, 0x1c0);

  engine.step();
  assert.equal((engine.getSnapshot().cop0[13] >>> 0) & 0x700, 0x700);
});

test("an interrupt line masked in IM alone never fires", async () => {
  const engine = await assembledEngine();
  engine.step();

  // IE set, but the timer line (Cause bit 10 -> IM bit 10) masked off.
  engine.setCop0Value(12, (0x0000ff11 & ~0x400) >>> 0);
  engine.requestExternalInterrupt(0x100);
  engine.step();
  assert.notEqual(engine.getSnapshot().pc >>> 0, 0x80000180);

  // The keyboard line is still open, so its request is taken.
  engine.requestExternalInterrupt(0x40);
  engine.step();
  assert.equal(engine.getSnapshot().pc >>> 0, 0x80000180);
  assert.equal(
    (engine.getSnapshot().cop0[13] >>> 0) & 0xffc,
    0x500,
    "Cause retains the masked timer line and the deliverable keyboard line"
  );
});

test("backstepping an interrupt restores the pending request and the interrupted PC", async () => {
  const engine = await assembledEngine();
  engine.step();
  const resumeAddress = engine.getSnapshot().pc >>> 0;
  const causeBefore = engine.getSnapshot().cop0[13] >>> 0;

  engine.requestExternalInterrupt(0x100);
  engine.step();
  assert.equal(engine.getSnapshot().pc >>> 0, 0x80000180);

  const back = engine.backstep();
  assert.equal(back.ok, true);
  const restored = engine.getSnapshot();
  assert.equal(restored.pc >>> 0, resumeAddress, "the interrupted instruction is current again");
  assert.equal(restored.pendingExternalInterrupt, 0x100, "the device request is pending again");
  assert.equal(restored.cop0[13] >>> 0, causeBefore, "Cause is back to its previous value");
  assert.equal((restored.cop0[12] >>> 0) & 0x2, 0, "Status left exception level");

  // Stepping forward again delivers the very same interrupt: the run is repeatable.
  engine.step();
  assert.equal(engine.getSnapshot().pc >>> 0, 0x80000180);
});

test("a program without a handler reports the interrupt instead of silently continuing", async () => {
  const engine = await assembledEngine(`
.text
.globl main
main:
  li   $t0, 0
  addi $t0, $t0, 1
  li   $v0, 10
  syscall
`);
  engine.step();
  engine.requestExternalInterrupt(0x100);
  const result = engine.step();
  assert.equal(result.done, true);
  assert.equal(result.exception, true);
  assert.match(String(result.message), /interrupt/i);
});
