# Pipeline Lab teaching pack

**Lab set 1.0.0 · webMARS Pipeline Lab model `webmars.pipeline-lab` v2 · Language: English**

Seven guided labs on the classic five-stage MIPS pipeline, built for the
webMARS Pipeline Lab. Everything runs in a browser: no install, no JVM, no
account, no backend.

## What is in this folder

| File | Purpose |
| --- | --- |
| `labs.json` | Machine-readable catalog: duration, prerequisites, objectives and the measured result of every run |
| `lab01-five-stages.md` | The five stages, pipeline fill and drain |
| `lab02-data-hazards.md` | Read-after-write dependencies and stalling |
| `lab03-forwarding.md` | What forwarding removes, and the load-use case it cannot |
| `lab04-branches.md` | Branch resolution, discarded instructions, delay slots |
| `lab05-branch-prediction.md` | Always-taken versus always-not-taken |
| `lab06-cpi-scheduling.md` | Computing CPI and filling a load-use gap |
| `lab07-memory-latency.md` | Structural hazards from a busy memory port |
| `programs/` | The MIPS programs each lab assembles |
| `solutions/` | Answers, measured tables and common misconceptions - hand out after the lab |
| `presentation.md` | A 15-minute talk introducing the Pipeline Lab, with speaker notes and a 5-minute demo script |

The sheets in this folder are the student handouts. They contain no answers, so
they can be printed or shared as they are. Each sheet has a matching file in
`solutions/`.

## Difficulty order

Labs 01 to 05 are a progression and should be run in order. Lab 06 and Lab 07
both build on Lab 03 and are independent of each other, so they can be used as
parallel tracks or dropped if time is short.

```
lab01 -> lab02 -> lab03 -> lab04 -> lab05
                     |
                     +--> lab06
                     +--> lab07
```

Total time for all seven is about 235 minutes of student contact, which fits
four one-hour sessions with room for discussion.

## Running a lab without the author

1. Serve the repository: `npm start`, then open the printed URL.
2. Open the `.asm` file named in the lab's Setup section and press **Assemble**.
3. Open **Tools -> Pipeline Lab**.
4. Follow the sheet. Every number the sheet quotes in bold is produced by the
   tool in front of the student; none of them are illustrative.

Nothing else is required. If a number on a sheet does not match what the tool
shows, that is a bug in this repository, not a mistake by the student - the
suite `tests/pipeline-labs.test.mjs` re-measures every one of them on the
current model, so a mismatch means the commit is broken.

## Predict, then run

Every lab has a **Predict before you run** table that students fill in before
touching the tool. The Pipeline Lab has a **Predicted cycles** box and a
**Check prediction** button: the student types the number they wrote down, and
the tool reports the actual cycle count and the difference. Making the guess
explicit before the reveal is the point of the exercise; do not let students
skip to the run.

## Assessment

- The reflection questions are the assessable part. Question 1 of each lab is
  recall; the last question of each lab requires reading the model's stated
  assumptions and is the one that separates understanding from memorisation.
- For a portfolio or grade record, have students press **Export JSON** and hand
  in the report. It contains the model version, profile, profile version, full
  configuration, program hash and metrics, and no timestamps or personal data,
  so two submissions of the same work are byte-identical.
- **Export CSV** produces a timeline sheet and a metrics sheet for students who
  prefer working in a spreadsheet.

## What these labs deliberately do not teach

The Pipeline Lab is a timing model, not an execution engine. It does not compute
values, does not read memory, and does not observe real branch outcomes - it
declares the assumption it uses instead. Do not present its output as what a
physical MIPS processor would do. The limits are listed in
[../pipeline-lab.md](../pipeline-lab.md) and the functional-versus-timing split
is set out in [../comparison-matrix.md](../comparison-matrix.md).

Caches, dynamic branch prediction, superscalar issue and out-of-order execution
are all outside the model. Lab 05 and Lab 07 point students at that boundary on
purpose.

## Translations

These sheets are English only in lab set 1.0.0. The catalog records
`"language": "en"` so a translated set can be added without ambiguity about
which version it was translated from. The webMARS interface itself is
localized, so a student can work through an English sheet with the tool in
their own language.

## Reusing and adapting

MIT licensed, like the rest of the repository. If you change a program, rerun
`node --test tests/pipeline-labs.test.mjs`; it will tell you exactly which
numbers in `labs.json` no longer hold.
