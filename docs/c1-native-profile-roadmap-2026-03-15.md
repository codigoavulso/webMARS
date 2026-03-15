# C1 Native Profile Roadmap

Date: 2026-03-15

## Verified status today

### `argc/argv`

There is already partial runtime plumbing for program arguments:
- `MarsEngine.applyProgramArguments(...)` writes argument strings to memory and seeds:
  - `$a0` with `argc`
  - `$a1` with `argv`
- current implementation location:
  - `web/assets/js/app-modules/00-core.js`

However, this is not currently productized in the Mini-C language surface:
- the compiler still requires `int main(void)`
- only `C0-S0 .. C0-S4` profiles are exposed today

So the accurate statement is:
- runtime support exists in latent form
- `main(argc, argv)` is not yet part of any released `C0-Sx` profile

## Why we should not expose `main(argc, argv)` prematurely

The current Mini-C runtime/compiler model for `char*` is not native-C-compatible yet.

Today:
- `string_to_chararray(...)` returns a word-strided `char*`
- Mini-C pointer indexing/dereference uses word-based loads/stores
- the existing argument runtime writes native byte strings on the stack

That means:
- the runtime-side `argv` memory layout and the compiler-side `char*` semantics do not yet match cleanly
- enabling `int main(int argc, char** argv)` before fixing `char*` would expose a misleading half-compatible surface

Conclusion:
- `main(argc, argv)` should land together with byte-addressed `char*` in the new `C1/native` profile

## Recommended C1 scope

The first release-grade `C1/native` profile should focus on the smallest set of changes that unlock real console-C compatibility:

1. Byte-addressed `char*`
- native byte indexing
- byte reads/writes instead of word-stride semantics
- compatibility with stack-allocated C strings and `argv`

2. Native program entry
- support `int main(int argc, char** argv)`
- keep `int main(void)` valid for simpler programs

3. Generic allocation layer
- productized `void*`
- `malloc`
- `calloc`
- `realloc`
- `free`

4. `FILE*` compatibility layer
- real stream objects instead of raw integer fd aliases
- `stdin`, `stdout`, `stderr` as handles
- path/mode semantics that sit above an abstract VFS

5. Wider libc compatibility
- finish the practical console subset:
  - `string.h`
  - `stdlib.h`
  - `ctype.h`
  - `stdio.h`
  - small pieces of `errno`/`unistd` only if justified

## Storage/server implications

The future remote workspace system should influence `C1`, but indirectly.

The important design rule is:
- runtime file I/O must target an abstract virtual filesystem
- the backing store may be:
  - localStorage
  - IndexedDB
  - remote workspace API
  - imported archive / project snapshot

We should avoid binding `FILE*` or file syscalls directly to localStorage semantics.

### Recommended layering

1. Editor/workspace storage layer
- owns projects, tabs, autosave, sync, conflict handling
- may talk to local or remote persistence

2. Runtime VFS layer
- exposes a stable filesystem snapshot to Mini-C/MIPS programs
- can be read-only or read-write depending on policy
- should not depend on network round-trips during execution

3. Remote sync service
- uploads/downloads workspace state
- optional versioning and sharing

This separation keeps C1 file APIs stable even if persistence changes later.

## GitHub vs own server

### Recommendation

Use your own lightweight workspace service as the primary storage backend.

GitHub can still be useful, but as:
- optional import/export
- optional publish/share target
- optional advanced sync for users who explicitly connect accounts

### Why not GitHub as the primary store

GitHub is strong for:
- version control
- collaboration
- history
- public/private repos

GitHub is weak as the default persistence model for webMARS learners because:
- it adds auth and account friction
- it forces repository concepts too early
- autosave/drafts/temp projects become awkward
- rate limits, tokens, scopes, and abuse protections complicate UX
- many users just want "my files follow me to another device"

### Why a simple own server is a better default

It lets us design for:
- frictionless login/session model
- autosave
- project snapshots
- quotas tuned for the app
- future sharing links
- future classroom features

## Practical recommendation for the next implementation step

Do not start C1 with `FILE*` first.

Start with:
1. formal `C1/native` profile exposure in compiler/runtime preferences
2. byte-addressed `char*`
3. `main(argc, argv)`
4. tests proving `argv[0]`, `argv[1]`, and C-string traversal work

After that:
5. introduce `void*` + malloc-family
6. migrate `stdio` toward real `FILE*`

This ordering minimizes rework because:
- `argv`
- libc string APIs
- many file/path APIs

all become much easier once the `char*` model is correct.
