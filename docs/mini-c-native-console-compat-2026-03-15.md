# Mini-C Native Console Compatibility Review

Date: 2026-03-15

## Objective

Measure how far the current Mini-C compiler/runtime can go for "native-like" console C code without forcing source adaptation, and separate:
- compatibility that fits cleanly inside the current `C0-S4` product scope
- compatibility that really points to a future `C1/native` profile

## Current state after this pass

Implemented inside the existing `C0-S4` flow:
- `#include <...>` and `#include "..."` now reuse the same safe import pipeline as `#use`
- new compatibility headers shipped in `web/libs/`:
  - `stdlib.h`
  - `ctype.h`
  - `stddef.h`
  - `stdbool.h`
- `string` now also exposes C-style aliases that are practical in the current string model:
  - `strlen`
  - `strcmp`
  - `strncmp`
- `stdio.h` was tightened for predictable console/file behavior:
  - mode parsing for `r/rb/rt`, `w/wb/wt`, `a/ab/at`
  - file-backed `fputs`
  - `fflush(stdout/stderr)`
  - direct-string `snprintf`

Important architectural conclusion:
- these gains did not require a new runtime service or memory model change
- because of that, the default exposed profile can remain in the current `C0-S4` family for now

## What still blocks "real native C" without adaptation

The remaining blockers are not mostly about missing headers anymore. They are about language/runtime semantics.

### Char pointer model

Current Mini-C strings and character arrays do not yet behave like native C `char*` byte strings in all contexts.

Practical consequences:
- native code built around `char*` / `const char*` variables is still not broadly source-compatible
- classic C string APIs that mutate or walk raw `char*` buffers are only partially representable today
- `argv`-style byte strings from a native `main(int argc, char** argv)` interface are not yet a drop-in fit for the current higher-level string model

### FILE* model

`stdio.h` currently exposes stream handles as integer descriptors, not as a true `FILE*` object graph.

Practical consequences:
- straightforward `FILE`-style code can be adapted
- strict native `FILE*` code is still outside the current compatibility envelope

### Generic allocation layer

The academic/runtime `C1` gap still matters for native compatibility:
- no productized `void*`
- no generic `malloc/calloc/realloc/free` family
- no function pointers

Without those pieces, a large class of portable C libraries cannot be imported unchanged.

### Native program entry

The runtime already seeds MIPS argument registers, but the productized Mini-C surface is still centered on `int main(void)`.

For a future native-compatibility profile, this should be revisited together with the `char** argv` memory model question rather than patched in isolation.

## Recommended next step

Treat the current work as a `C0-S4` compatibility layer for simple console programs and teaching-oriented examples.

If the project goal becomes broader "compile common Windows/Linux console C without source edits", then the next formal milestone should be:
- a dedicated `C1/native` profile
- explicit scope for byte-addressed `char*`
- a real `FILE*` compatibility story
- productized `main(argc, argv)` support
- a minimal portable libc subset (`malloc`, buffer/string mutation, stream objects)
