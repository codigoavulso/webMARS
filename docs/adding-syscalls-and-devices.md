# Adding a syscall or a memory-mapped device

Both are extension points of `assets/js/app-modules/00-core.js`. A syscall is a
service the program requests explicitly; a memory-mapped device is one it
reaches by reading or writing an address. They fail in different ways and are
tested differently, so they are documented separately here.

## Syscalls

### Where the dispatch happens

`executeSyscall()` reads the service number from `$v0` and runs a `switch`.
Everything a syscall may need is set up around that switch: buffer helpers,
strict number parsing, the runtime hooks that reach the interface, and the
transaction that lets a syscall be undone.

`assets/js/reference/syscalls.generated.js` is the matrix extracted from MARS
4.5. It records the number, name, category and capabilities of each service and
whether webMARS implements it. It is data for the help system and the
compatibility matrix; it does not dispatch anything.

### The return contract

A syscall case returns an object, and the shape of that object is the whole
protocol between the engine and the run loop:

| Return | Meaning |
| --- | --- |
| `{}` | Done; execution continues with the next instruction |
| `{ message, runIo: true }` | Done, and this text goes to the Run I/O pane |
| `{ waitForInput: true, ... }` | Suspended; the run loop must collect input and resume |
| `{ halt: true, haltReason }` | The program has ended |
| `this.raiseException(code, text)` | A trap; control goes to the exception handler |

Returning nothing at all is a defect: the run loop cannot tell the difference
between "finished" and "forgot to return".

### Rules

- **Validate every argument before acting.** `parseStrictInteger` and
  `parseStrictFiniteFloat` exist because a service that half-accepts a bad value
  leaves the machine in a state no test can describe. Reject with an exception
  rather than clamping silently.
- **Bound every address range.** Call `assertBoundedSyscallAddressRange` before
  reading or writing a buffer. A syscall is the easiest way to write outside the
  memory map, and the check is what stops it.
- **Write memory through the atomic helpers.** `writeBytesAtomic` plus
  `notifyMemoryObservers` keeps backstep and connected devices correct. A direct
  array write is invisible to both.
- **Do not touch the interface directly.** Anything that needs the user - input,
  a dialog, a file picker - goes through `this.runtimeHooks`. The core has no
  DOM, which is what lets the whole engine run under Node in the test suite.
- **A waiting syscall must be resumable.** When you return `waitForInput`, the
  machine state must be exactly what it was before the call, so resuming
  re-enters the service cleanly. The syscall transaction captured at the top of
  `executeSyscall` is what makes a rollback possible; do not defeat it by
  mutating state outside the memory and register APIs.
- **Numbers are 32-bit.** Coerce with `| 0` or `>>> 0` on the way out.

### Steps

1. Choose the service number. Match MARS 4.5 if the service exists there. A
   number MARS does not define makes this a webMARS extension, and it must be
   labelled as one.
2. Add the `case` to the switch in `executeSyscall`.
3. Update `assets/js/reference/syscalls.generated.js` so the help system and the
   compatibility matrix know about it, including `implementedInWeb`.
4. Add a test. `tests/runtime-regression.test.mjs` covers services that produce
   output; use `runtimeHooks` in the test to supply input rather than driving the
   UI.
5. Document it in `help/en/` and then in the other languages.
6. Run `npm run docs:matrix` and commit the regenerated matrix.

### Testing a syscall that needs input

Install a hook instead of a dialog:

```js
const engine = await createJavaScriptEngine({
  settings: { startAtMain: true },
  runtimeHooks: { readInput: () => ({ value: "42" }) }
});
```

That is the same seam the browser uses, so the test exercises the real path.

## Memory-mapped devices

### The address window

MMIO lives at and above the memory map's `mmioBase`, `0xffff0000` in the default
map. The map is configurable - the compact maps in
`tests/runtime-memory-invariants.test.mjs` move it to `0x00007f00` - so never
hard-code `0xffff0000` in a device. Read the base from the active memory map.

### How a device observes the program

Register an observer; do not poll:

```js
engine.registerMemoryObserver({
  // called for every read and write the program performs
  onAccess(kind, address, size, value) { /* ... */ }
});
```

`notifyMemoryObservers` fires from inside the byte, half-word and word paths, so
an observer sees every access the program makes, including those a syscall
performs through the atomic helpers. That is the mechanism the Keyboard and
Display simulator, the bitmap display and the TTY terminal are built on.

### Rules

- **Reads must not have side effects the model does not declare.** A device
  register that clears on read is a legitimate design, but it must be documented
  and it must be reversible - backstep replays reads.
- **Respect the strict memory model.** `assertAddressInStrictMemoryModel` is what
  keeps a device inside its window; a device that answers outside its range
  hides program bugs from the user.
- **Publish a protocol version.** `WebMarsBitmapMmio` carries a `version` field
  precisely so a tool can refuse a layout it does not understand. Do the same,
  and check the version on the tool side rather than assuming offsets.
- **A device is not allowed to break the runtime.** The tool manager isolates a
  throwing tool, but a device hook inside the core is not isolated. Validate
  input and never throw from an observer.

### Steps

1. Define the register layout as a frozen object with a `version`, next to
   `BITMAP_MMIO_PROTOCOL` in the core, and publish it on the global scope so
   tools can read it.
2. Compute addresses from the active memory map's `mmioBase`, never from a
   literal.
3. Handle reads and writes in the memory path, or observe them with
   `registerMemoryObserver` if the device only watches.
4. Build the tool that renders the device in `tools/`, following
   [tool-api.md](tool-api.md). Devices with a connect control return their
   connect flag from `isConnected`; a device that should always receive updates
   returns `true`.
5. Add tests: one in `tests/runtime-memory-invariants.test.mjs` that the window
   sits where the memory map says, and one in
   `tests/tool-runtime-regression.test.mjs` that the tool reacts to a write.
6. Add the device to the "Memory-mapped devices" section of
   `scripts/generate-comparison-matrix.mjs`, then regenerate the matrix.

## Checklist

- [ ] Service number or address window matches MARS 4.5, or is labelled an extension
- [ ] Every argument validated; every address range bounded
- [ ] Memory written through the atomic helpers, with observers notified
- [ ] The interface reached only through `runtimeHooks`
- [ ] A waiting syscall resumes cleanly from an unchanged state
- [ ] MMIO addresses derived from the active memory map, never hard-coded
- [ ] Protocol object carries a version, and the tool checks it
- [ ] Reference data updated (`syscalls.generated.js`) and matrix regenerated
- [ ] Help documented in `help/en/` and the other languages
