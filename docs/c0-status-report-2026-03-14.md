# C0 Status Report (2026-03-14)

## Scope
This report replaces the old TODO-based tracking for the compiler core.
It re-evaluates the current webMARS state against:
- `docs/c0-reference.txt`
- `docs/c0-libraries.txt`

## Current outcome
The webMARS compiler/runtime is operationally closed for the full internal C0 domain exposed today:
- internal profiles from S0 to S4
- full cumulative runtime profile `C0-S4-`
- documented C0 libraries from `c0-libraries.txt`

## Core language status
Implemented in the current C0 layer:
- int, bool, char, string
- functions, declarations, blocks, return
- assignments and expression statements
- if / else
- while
- assert(e)
- error(s)
- ternary operator `?:`
- arrays, alloc_array, bounds metadata, runtime bounds checks
- pointers, NULL, dereference, alloc(t), null checks
- structs, typedef, field access with `.` and `->`
- #use directives for project and global libraries
- contracts and loop invariants used by the current runtime profile

## Profile notes
- `S2` in webMARS includes `for`, `break`, `continue`, and `++/--`.
- The academic C0 reference moves `break` and `continue` into C1, so this is an intentional project-level profile choice.
- S3 and S4 are cumulative project profiles, not official CMU tiers.
- In the current compiler, part of the array/multidimensional behavior associated with S3 is already accepted below the conceptual S3 profile, so S3 is best understood as a documentation/runtime profile boundary rather than a strict syntactic gate in every case.

## Library status
Documented libraries currently covered:
- conio
- file
- args
- parse
- string
- img
- rand
- util

`printf` and `format` are available as documented when importing `conio` and `string`.

## webMARS-specific adaptations
- Some library APIs that are academically described with array return types are represented internally with pointer-backed arrays.
- These returned arrays still carry length metadata and support `\length` and runtime bounds checks.
- `args_parse()` is supported through the webMARS runtime argument registry rather than a native executable launcher.
- The runtime now aligns `sbrk` allocations and correctly expands large `li` immediates, which was necessary to make the full C0 + libraries layer reliable.

## Conclusion
The current compiler/runtime state is suitable for demonstrating the full internal webMARS C0 layer (`S4-`) together with the documented C0 libraries.
C1 features such as generic pointers, function pointers, and the academic C1-only control model remain outside this closed C0 scope.

