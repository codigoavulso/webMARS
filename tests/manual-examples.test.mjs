import assert from "node:assert/strict";
import { posix } from "node:path";
import test from "node:test";
import { WORKED_EXAMPLES } from "../manual/content/worked-examples.mjs";
import { createJavaScriptEngine, loadMiniCCompiler } from "./helpers/engines.mjs";

let compiler;

async function execute(example, delayedBranching = false) {
  let assembly = example.source;
  if (example.language === "minic") {
    compiler ||= await loadMiniCCompiler();
    const compiled = compiler.compile(example.source, {
      sourceName: example.sourceName, subset: example.subset,
      targetAbi: "o32", emitComments: false, useLibrarySources: {},
      includeResolver: ({ target, fromSourceName }) => {
        const name = posix.normalize(posix.join(posix.dirname(fromSourceName), target));
        return example.files?.[name] ? { sourceName: name, source: example.files[name] } : null;
      }
    });
    assert.equal(compiled.ok, true, JSON.stringify(compiled.errors));
    assembly = compiled.asm;
  }
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true, delayedBranching } });
  const assembled = engine.assemble(assembly, { sourceName: example.sourceName });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors));
  const initialStack = engine.exportRuntimeState({ includeProgram: false }).registers[29];
  let output = "";
  for (let step = 0; step < 200000 && !engine.getSnapshot().halted; step += 1) {
    const result = engine.step({ includeSnapshot: false });
    assert.equal(result.ok, true, result.message);
    assert.notEqual(result.waitingForInput, true, "Example unexpectedly requested input");
    if (result.runIo) output += result.message;
  }
  assert.equal(engine.getSnapshot().halted, true, "Example did not halt within its instruction budget");
  assert.equal(output, example.expectedOutput);
  const registers = engine.exportRuntimeState({ includeProgram: false }).registers;
  for (const [address, expected] of example.memory || []) assert.equal(engine.readWord(address) >>> 0, expected >>> 0);
  for (const [register, expected] of example.registers || []) assert.equal(registers[register], expected);
  if (example.preservesStack) assert.equal(registers[29], initialStack);
  return { engine, registers };
}

for (const [name, example] of Object.entries(WORKED_EXAMPLES)) {
  const modes = example.language === "assembly" ? [false, true] : [false];
  for (const delayedBranching of modes) {
    test(`Manual ${name}: output and state match the guide (delay slots ${delayedBranching})`, async () => {
      await execute(example, delayedBranching);
    });
  }
}

for (const [count, expectedOutput] of [[3, "8\n"], [5, "12\n"]]) {
  test(`Manual debugger exercise: ${count} loads demonstrate the documented boundary error`, async () => {
    const example = WORKED_EXAMPLES.arrayAssembly;
    const result = await execute({ ...example,
      source: example.source.replace("li    $t1, 4", `li    $t1, ${count}`),
      expectedOutput, memory: [[0x10010010, Number(expectedOutput)]]
    });
    assert.equal(result.registers[8] >>> 0, 0x10010000 + count * 4);
  });
}

test("Manual exercise: changing the vector produces seven in both languages", async () => {
  for (const example of [WORKED_EXAMPLES.arrayAssembly, WORKED_EXAMPLES.arrayMiniC]) {
    await execute({ ...example, source: example.source.replace("3, -2, 7, 4", "10, 0, -5, 2"),
      expectedOutput: "7\n", memory: example.memory ? [[0x10010010, 7]] : undefined });
  }
});

test("Manual project exercise: the implementation remains linked after editing the root", async () => {
  const example = WORKED_EXAMPLES.multiFileMiniC;
  await execute({ ...example, source: example.source.replace("3, 5, 8, 2, 11, 13", "3, 5, 8, 2, 11, 1"),
    expectedOutput: "soma=30\nmaximo=11\n" });
});

for (const [input, expected] of [[0, 1], [1, 1], [12, 479001600]]) {
  test(`Manual recursion exercise: factorial(${input}) = ${expected}`, async () => {
    const example = WORKED_EXAMPLES.recursiveMiniC;
    await execute({ ...example, source: example.source.replace("fatorial(6)", `fatorial(${input})`),
      expectedOutput: `${expected}\n` });
  });
}
