# Runtime invariants: memory, snapshots and backstep

These are the properties the rest of the application is allowed to assume. They
are not style preferences: each one is load-bearing for a feature the user can
see, and the sentence after each rule says which feature breaks when it is
violated.

Everything here concerns `assets/js/app-modules/00-core.js`. The Pipeline Lab
does not execute programs and none of this applies to it; see
[pipeline-lab.md](pipeline-lab.md).

## Memory

### The memory map is data, not constants

Every segment boundary - text, data, extern, heap, stack, kernel, MMIO - comes
from the active memory map. The default map is one of several: the compact maps
in `tests/runtime-memory-invariants.test.mjs` place the data segment at address
zero and MMIO at `0x00007f00`.

> **Never hard-code an address.** Read it from the memory map. A literal
> `0xffff0000` works on the default map and silently addresses ordinary data on
> a compact one.

### Every access goes through the memory API

The byte, half-word and word paths do four things a raw array access does not:
enforce the strict memory model, check alignment, record an inverse delta for
backstep, and notify memory observers.

> **Never read or write a raw memory array.** Bypassing the API breaks backstep,
> disables alignment diagnostics, and makes MMIO devices miss the access - all
> silently, and all only visible much later.

### Alignment is enforced, not rounded

A word access on an address that is not a multiple of four, or a half-word
access on an odd address, raises `MarsMemoryAccessError`. It does not round
down and it does not succeed.

> An assembler or syscall change that masks the low address bits turns a program
> bug the user needs to see into a wrong answer they cannot explain.

### `$zero` is hard-wired

Register 0 reads as zero always. Writes to it are discarded - during execution,
during a syscall, and during state import.

> This is checked by `runtime-isa-regression.test.mjs` and by the
> `core-zero-register-writable` mutant. Assigning `this.registers[0]` directly
> is the way it gets broken.

### Values are 32-bit

Results are coerced with `| 0` or `>>> 0` according to the instruction's
signedness before they reach a register or memory.

> JavaScript numbers are doubles. An uncoerced result is right for small values
> and wrong exactly at the boundary the test suite cares about.

## Snapshots

### A snapshot is a read-only view

`getSnapshot()` may share buffers between calls: `memoryWords` is not
necessarily a copy, and `textRows` entries are reused when nothing changed. This
is what keeps large programs responsive.

> **Never mutate a snapshot.** A tool that writes into `memoryWords` corrupts
> the runtime's own state, and the change is invisible to backstep and to every
> other consumer.

### `runtimeRevision` is the cache key

It changes whenever the runtime is reset or reassembled. Anything a consumer
caches across snapshots - decoded instructions, a timeline, an address map -
must be invalidated when it changes.

> The Pipeline Lab keys its program signature on the assembled rows for the same
> reason: without it, a tool keeps showing the previous program's analysis.

### `assembled` is not the same as "has instructions"

A snapshot can report `assembled: true` and carry no `textRows` - the request
may have excluded them, or the program may have no text segment. Consumers must
handle both.

### A snapshot never blocks

Building one performs no I/O and calls nothing in the interface. That is what
lets the whole engine run under Node in the test suite with no DOM.

## Backstep

### Backstep replays inverse deltas, not saved states

Each step records what it would take to undo itself: the previous PC, the
registers it wrote, and the memory bytes it changed. Stepping backwards applies
those inverses in reverse order.

> **A step must record an inverse for everything it changes.** A change made
> outside the register and memory APIs is not recorded, so backstepping past it
> silently produces a machine state that never existed.

### The history is bounded, twice

`maxBacksteps` limits the number of retained steps and
`maxBackstepHistoryBytes` limits their total size; the smaller limit wins. A
snapshot reports both `backstepDepth` and `backstepHistoryStartStep`, so a
consumer can tell how far back the runtime can actually go.

> **A tool must not claim to rewind further than the runtime can.**
> `createToolDeltaHistory` follows these fields for exactly this reason; see
> [tool-api.md](tool-api.md).

### Syscalls are transactional

`executeSyscall` captures state before dispatching and can roll the whole
service back. A syscall that suspends for input leaves the machine exactly as it
was, so resuming re-enters the service cleanly rather than half-completing it.

> **Do not mutate engine state outside the memory and register APIs inside a
> syscall.** The rollback cannot undo what it never saw, and the user's Backstep
> button will produce a state the program could not have reached.

### Backstep and execution must agree

Running N steps forwards and then N steps backwards must reproduce the state
before those steps, exactly - registers, memory, PC, and the runtime's own
bookkeeping.

> This is the property `runtime-regression.test.mjs` and
> `runtime-memory-invariants.test.mjs` exist to defend. If a change makes it
> expensive to maintain, the change is wrong, not the invariant.

## State import and export

### Export is complete; import is defensive

`exportRuntimeState` produces everything needed to restore the machine.
`importRuntimeState` accepts anything at all: state arrives from browser
storage and user-supplied files, where truncation and corruption are ordinary.

> **Import must never throw.** It refuses bad input and leaves a usable machine.
> A raw `TypeError` escaping the importer reaches the user as a blank screen;
> `robustness-fuzz.test.mjs` drives corrupted payloads through it for this
> reason, and found exactly that bug on `null`.

### A refused import leaves the previous state intact

After rejecting a payload, the engine must still be the machine it was, and a
valid import must still work afterwards.

## Quick reference

| Invariant | Broken by | User-visible symptom |
| --- | --- | --- |
| Addresses come from the memory map | A hard-coded address | Programs misbehave on non-default memory maps |
| Access goes through the memory API | A raw array write | Backstep desynchronises; devices miss writes |
| Alignment is enforced | Masking low bits | A program bug becomes a wrong answer |
| `$zero` reads as zero | Direct register assignment | Arithmetic silently wrong across the program |
| Snapshots are read-only | Mutating `memoryWords` | Runtime state corrupted from a tool |
| `runtimeRevision` invalidates caches | Ignoring it | A tool shows the previous program |
| Steps record inverse deltas | State changed outside the APIs | Backstep produces an impossible state |
| History bounds are respected | A tool keeping its own unbounded log | A tool rewinds past what the runtime can restore |
| Syscalls are transactional | Mutating state outside the APIs | A suspended syscall resumes half-applied |
| Import never throws | Assuming a well-formed payload | Blank screen on a corrupted saved session |
