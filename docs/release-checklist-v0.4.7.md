# webMARS v0.4.7 release checklist

Date: 2026-07-25
Branch: `codex/release-v0.4.7`
Status: ready locally; publication actions have not been performed.

## Release identity

- [x] `package.json`, `package-lock.json`, `assets/js/app-version.js`, README, loaders and localized changelogs identify v0.4.7.
- [x] Cache-busting query strings use v0.4.7.
- [x] The runtime is JavaScript-only; obsolete hybrid/WASM artifacts are absent from the release tree.
- [x] Temporary generated files and development-only assets are excluded.

## Runtime and persistence

- [x] Runtime correctness regressions cover memory limits, atomic stores, COP1 doubles, delayed branches, breakpoints, LL/SC, strict memory, COP1 rounding, handled exceptions and halt reasons.
- [x] Runtime-state roundtrips cover breakpoints, random streams, files, input, arguments and image handles.
- [x] Browser project persistence rolls back if either transactional localStorage write fails.
- [x] Rename, delete, close, editor synchronization, state slots, imports and project mutations publish success only after persistence succeeds.
- [x] Stop cancels pending sleep and terminates the engine.

## Examples and documentation

- [x] Every Assembly example variant assembles.
- [x] Every C example variant compiles and its generated Assembly assembles.
- [x] New examples cover native arguments, the argument library, multi-file projects, COP1, exception recovery and program calls.
- [x] In-app help is current in English, Spanish and Portuguese.
- [x] Localized help pages have structural parity and all local links resolve.
- [x] The Spanish MIPS reference contains 157 basic instructions, 388 extended instructions and 20 directives with localized descriptions.
- [x] Interface labels and document language switch correctly for English, Spanish and Portuguese.

## Automated validation

- [x] Static build validation: 437 source files.
- [x] Full automated suite: 89 passed, 0 failed.
- [x] `git diff --check` passed.
- [x] CI installs exact dependencies, runs the supported validation command, builds the release package and uploads the ZIP plus checksum.

## Browser validation

- [x] Source workspace loaded on localhost without console warnings or errors.
- [x] C compile, Assembly assemble and execution flows completed successfully.
- [x] The factorial C example produced `120`.
- [x] English, Spanish and Portuguese help, changelog, About and privacy text were checked.
- [x] Responsive layout was checked at 390 × 844 and the desktop viewport was restored.
- [x] The isolated packaged application loaded from `dist/webmars-0.4.7`.
- [x] The packaged application compiled C, assembled MIPS and ran the starter Assembly program, producing `12`.
- [x] Packaged benchmark metrics updated for compile, assemble and run.
- [x] Packaged browser console contained 0 warnings/errors.

## Release artifact

- [x] Release package contains 336 validated public files.
- [x] ZIP size: 1,313,338 bytes.
- [x] ZIP generation is deterministic across consecutive builds.
- [x] ZIP: `dist/webmars-0.4.7.zip`
- [x] SHA-256: `d9e4eadf6eae6ab194309fe5dda9cf42139d4d0a6bf4de05d57fffca3148720f`
- [x] Checksum file: `dist/webmars-0.4.7.zip.sha256`

## External publication

The following actions remain intentionally unchecked because they require an
explicit publication decision:

- [ ] Stage and commit the release preparation.
- [ ] Push `codex/release-v0.4.7`.
- [ ] Create tag `v0.4.7`.
- [ ] Create the GitHub Release and attach the ZIP/checksum.
- [ ] Deploy or update the public hosting environment.
