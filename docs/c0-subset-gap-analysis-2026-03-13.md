# C0/C1 subset gap analysis

Date: 2026-03-13

Reference baseline:
- `web/c0-reference.pdf`
- extracted text: `web/docs/c0-reference-cmu-extracted.txt`

Implementation baseline:
- `web/assets/js/app-modules/17-mini-c-compiler.js`
- `web/TODO.txt`

## Overall conclusion

The current compiler is formally exposed only up to `C0-S4`.

Evidence:
- `SUBSET_LEVELS` currently defines `C0-S0` .. `C0-S4` only.
- `web/TODO.txt` also treats `S5` and `S6+` as future work rather than released subsets.

There is also an important divergence from the CMU reference:
- the current compiler already enables `for`, `break`, `continue`, and `++/--` under `C0-S2`
- in the reference, `break` and `continue` belong to the `C1` extension

## C0-S0

### Implemented
- core `int` language
- function declarations and definitions
- local/global declarations
- assignment
- expression statements
- `if / else`
- `while`
- `return`
- ternary `?:`
- `assert(e);`
- `error(e);`
- pointers:
  - `t*`
  - `NULL`
  - dereference expression `*e`
  - dereference lvalue `*lv`
  - null-checks on runtime dereference paths
- `typedef`
- `struct`
  - field access `.`
  - pointer field access `->`
  - forward struct declarations
  - large-type restrictions enforced for direct variables/params/returns
- `alloc(tp)` with zero-initialized storage
- `alloc_array(tp, e)` with non-negative length runtime check and zero-initialized storage
- contracts:
  - `requires`
  - `ensures`
  - `loop_invariant` / `invariant`
  - `\result`
  - `\old`
  - `\length`
- C0-style runtime safety model for the currently implemented S0 surface:
  - null checks on pointer dereference/member/index roots
  - lower/upper bounds checks for array indexing
  - hidden bound propagation for array parameters
  - hidden bound propagation for pointer parameters
  - header-backed bounds for `alloc_array(...)`
- arithmetic, comparison, bitwise, and shift operators

### Partially implemented
- nothing headline-level remains open for the current webMARS `C0-S0` scope

### Missing
- no known missing headline feature inside the current declared `C0-S0` scope

## C0-S1

### Implemented
- `#use <lib>`
- `#use "file"`
- S1 intrinsic support
- library resolution pipeline for project/global libraries
- formalized `#use` policy:
  - duplicate loads are ignored
  - circular `#use` chains are rejected
  - library/file search order is explicit in the runtime include resolver
  - `#use` directives must appear before declarations/statements
- explicit runtime/compiler profile selection for `C0-S1-`

### Partially implemented
- standard-library compatibility breadth is still growing
- some compatibility headers, such as the current `stdio` layer, intentionally sit above the minimal S1 core because they rely on later subset features

### Missing
- no fundamental subset blocker remains for the intended S1 scope

## C0-S2

### Implemented
- `for`
- `break`
- `continue`
- pre/post `++`
- pre/post `--`
- semantic gating for loop-only use of `break/continue`
- code generation for these constructs

### Partially implemented
- regression depth for nested/edge-case loop scenarios can still be improved

### Missing
- nothing core for the current webMARS interpretation of S2

### Divergence from reference
- CMU reference places `break` and `continue` in `C1`, not `C0`
- webMARS currently promotes them into `C0-S2`

## C0-S3

### Implemented
- local arrays
- global arrays
- multidimensional arrays
- initializer lists
- array passing to functions
- parameter shape compatibility checks

### Missing
- no separate S3-only gap is currently tracked here; the remaining work is mostly about later subset definition and formal packaging

## C0-S4

### Implemented
- `bool`
- `char`
- `string`
- short-circuit `&&` and `||`
- S4 subset gates for declarations, parameters, and returns of these types
- string comparison restrictions
- full C0 `char` / `string` escape coverage
- rejection of `\0` inside string literals
- default `string` value as `""` across declarations and allocation paths
- associated intrinsics such as `print_bool`

### Missing
- no major S4 headline feature appears totally absent

## C0-S5

### Implemented
- no formal `C0-S5` subset is currently exposed

### Partially implemented
- the compiler/runtime already contains more infrastructure than the currently formalized subset map exposes
- however, that work is not yet productized as a distinct `C0-S5` release profile

### Missing
- formal subset definition
- release gating as `C0-S5`
- matrix describing what belongs specifically to `S5` after `S0..S4` are accounted for

## C0-S6

### Implemented
- no formal `C0-S6` subset is currently exposed

### Partially implemented
- none in a release-grade/formally declared sense

### Missing
- formal subset definition
- compiler gating/profile for `C0-S6`
- feature matrix describing what distinguishes S6 from earlier subsets

## C1 (S6+)

### Implemented
- partial overlap only:
  - `break`
  - `continue`
  - these already work, but they are currently classified under `C0-S2` rather than `C1`

### Partially implemented
- casts and some pointer machinery exist in the parser/semantic layer
- typed pointers are present in non-final form

### Missing
- formal `C1` mode/subset
- generic pointers `void*`
- `\hastag(tp, e)`
- proper tagged generic-pointer semantics
- function pointers
- typedef-based function pointer declarations compatible with the reference
- invocation through function pointers

## Practical status summary

### Release-grade today
- `C0-S0`
- `C0-S1`
- `C0-S2`
- `C0-S3`
- `C0-S4`

### Not yet release-grade/formally declared
- `C0-S5`
- `C0-S6`
- `C1 / S6+`

## Recommended interpretation

If we compare strictly against the PDF:
- webMARS is solidly in the `C0-S0` to `C0-S4` range
- it already contains some advanced infrastructure beyond that range
- but `S5`, `S6`, and `C1` are not yet complete or formally productized

If we compare pragmatically against the actual codebase:
- the compiler is ahead of the formal roadmap in a few places
- the biggest gap is not parsing anymore
- the biggest gap is semantic closure, runtime safety guarantees, and formal subset definition
