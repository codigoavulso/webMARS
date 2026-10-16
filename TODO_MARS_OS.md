# MARS-OS development roadmap

This file is the working contract for MARS-OS development. A feature is only
finished when it behaves consistently in every language build, reports its
limits honestly, and has a regression test for its failure path.

## Current target: 1.3 — Reliable

The 1.3 release turns the existing demonstration into a small system that can
be trusted with classroom work. The priority is data integrity, predictable
input and explicit limits rather than adding large new applications.

### Implementation checklist

- [x] Use one visible version number (`MARS-OS 1.3`) in the kernel, desktop,
  shell, applications and all language variants.
- [x] Warn during boot that the RAM disk is volatile and a reset restores the
  original image.
- [x] Reject overlong shell input instead of executing a truncated command.
- [x] Support insertion plus Left/Right cursor movement in the shell line
  editor while retaining history, backspace and kill-line behaviour.
- [x] Reject file names longer than 19 characters instead of truncating them.
- [x] Make file writes and appends atomic: either all bytes fit or the original
  file remains unchanged.
- [x] Make `cp`, `write`, `append`, `grep`, `head`, `tail` and `sort` report
  capacity failures explicitly.
- [x] Warn when the full-screen editor buffer is full and confirm dirty exits.
- [x] Reject spreadsheet cell overflow, validate the complete formula text,
  refuse partial saves and confirm dirty exits.
- [x] Reject overlong BASIC lines, refuse partial saves and confirm destructive
  `NEW`, `LOAD` and `BYE` operations when the program is dirty.
- [x] Pass assembly for every locale and the complete MARS-OS runtime regression
  suite.
- [ ] Manually smoke-test editor and spreadsheet prompts in an 80x24 terminal.

### 1.3 release gate

- [x] All 20 localized `mips.asm` entry points assemble without warnings.
- [ ] Every capacity is tested at `limit - 1`, `limit` and `limit + 1`.
- [x] No command reports success after a partial write.
- [x] Cancelling an unsaved-work prompt preserves both data and application
  state; choosing save only exits after a successful save.
- [x] Malformed spreadsheet formulas, including valid prefixes with trailing
  junk, render as `#ERR`.
- [x] Shell insertion, cursor movement, history and overflow recovery are
  covered by automated terminal tests.
- [x] English, Portuguese and Spanish have native strings for every new 1.3
  message; remaining translations have a reviewed English fallback.
- [x] The help text documents the volatile disk and hard limits.
- [x] The webMARS example catalogue assembles every localized MARS-OS build.

## 1.4 — Usable

### Shell and TTY

- [ ] Replace whitespace splitting with a tokenizer supporting quoted strings,
  escaped spaces and tabs.
- [ ] Expand history to at least 32 commands and add duplicate suppression.
- [ ] Add filename and command completion on Tab, with a second Tab listing
  ambiguous matches.
- [ ] Handle Home, End, Delete and word-wise cursor movement.
- [ ] Make editing correct across wrapped terminal rows.
- [ ] Bound the keyboard queue and define an overflow policy.
- [ ] Complete the documented CSI key sequences and ignore malformed sequences
  without leaking their bytes into commands.
- [ ] Decide and document whether the console is ASCII-only or accepts UTF-8.

### Files and interchange

- [ ] Add an explicit `limits` command and expand `df` with per-resource usage.
- [ ] Add import/export between the RAM disk and the webMARS host environment.
- [ ] Add an overwrite confirmation policy shared by `cp`, `mv`, SAVE and GUI
  applications.
- [ ] Add a small disk consistency checker and a deterministic `selftest`.

### Editor

- [ ] Add horizontal scrolling without hiding the cursor.
- [ ] Add single-level undo/redo.
- [ ] Add search and next-match navigation.
- [ ] Show filename, dirty state, cursor position and byte usage continuously.
- [ ] Add a read-only mode for help/manual files.

### Spreadsheet and desktop

- [ ] Detect circular references explicitly instead of relying on fixed passes.
- [ ] Highlight referenced cells and show the active formula separately.
- [ ] Add row/column clearing, copy/paste and a simple CSV interchange path.
- [ ] Make every desktop action keyboard-accessible and expose shortcut hints.
- [ ] Derive the task/status display from real application state rather than
  static labels.
- [x] Add a small, deterministic MIPS Piano Mini-DAW: an 8 x 16 piano roll
  with keyboard and mouse composition, a demo pattern, tempo and General MIDI
  patch selection, plus asynchronous polyphonic playback through syscalls 31
  and 32.

## 1.5 — Educational

- [ ] Add `help TOPIC`/`man COMMAND` pages for the shell, editor, sheet and BASIC.
- [ ] Add `devices`, `memory-map`, `registers` and `syscalls` learning commands.
- [ ] Add an interactive first-run tour explaining the terminal, RAM disk and
  how MARS syscalls connect the system to webMARS.
- [ ] Add BASIC `TRACE`, `STEP`, `CONT` and a compact variable/watch view.
- [ ] Visualize spreadsheet dependencies and circular-reference paths.
- [ ] Turn the benchmark into a repeatable diagnostics screen with clear units.
- [ ] Improve the existing utilities and games before adding breadth: richer
  calendar/clock views, a deterministic guess game mode, and a usable Life
  editor with pause, step and speed controls.
- [ ] Provide lesson-sized example disks and exercises that can be opened by a
  stable webMARS URL.

## Known hard limits in 1.3

| Resource | Limit | Required behaviour |
| --- | ---: | --- |
| File name | 19 characters | Reject; never truncate or alias a name |
| File content | 1023 bytes | Atomic failure; preserve old content |
| Shell/BASIC input buffer | 127 characters | Discard the overlong command and report it |
| Editor document | 1023 bytes | Stop insertion, warn, keep document editable |
| Spreadsheet cell | 11 characters | Keep the previous value and warn |
| Spreadsheet grid | 8 x 12 cells | Navigation must remain inside the grid |
| BASIC program | 64 lines, 63 statement characters | Reject the edit and preserve the program |
| `sort` workspace | 48 lines, 63 characters per line | Abort with an explicit error |

## Engineering rules

1. Never silently truncate user data.
2. Never leave an application with dirty data without an explicit user choice.
3. Never mutate the destination before all capacity and name checks pass.
4. Every user-visible limit needs a useful error message and a regression test.
5. New shared messages must exist in every locale before shared assembly code
   may reference them.
6. Every release changes the version in one sweep and tests for stale versions.
7. Prefer small, deterministic behaviours that can be exercised through the
   existing terminal harness.
