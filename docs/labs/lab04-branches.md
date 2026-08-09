# Lab 04 - Branches and discarded instructions

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**
**Duration: about 40 minutes**

## Prerequisites

- Lab 03.
- You know what a conditional branch does to the program counter.

## Objectives

By the end of this lab you can:

1. Count the instructions discarded when a branch resolves against the
   predicted path.
2. Explain how a delay slot and earlier branch resolution each remove one of
   them.

## Setup

1. Assemble `docs/labs/programs/lab04_branches.asm`.
2. Open the Pipeline Lab.

Read the model note at the bottom of the tool first. The Pipeline Lab does not
execute your program, so it cannot observe a real branch outcome. It states the
assumption it uses instead: under the `sequential` assumption every conditional
branch falls through. Everything below is about the *cost of guessing wrong*,
not about which way the branch really goes.

## Predict before you run

| Configuration | Predicted cycles |
| --- | --- |
| Forwarding, assume branch is not taken | |
| Forwarding, assume branch is taken | |
| Assume taken, with delay slot | |
| Assume taken, resolve in ID | |

## Steps

1. Run with **Forwarding** (prediction: assume not taken). The guess matches the
   assumed outcome, so nothing is discarded: **11 cycles**, 0 discarded
   instructions.
2. Switch to **Forwarding + predict taken** and run again: **13 cycles**, 2
   discarded instructions, 1 mispredicted branch.
3. Step to the cycle where the branch leaves EX. Two younger instructions turn
   into bubbles marked `control`, and the timeline strikes their rows through
   and labels them `discarded`.
4. Keep **Assume branch is taken** but set **Delay slot** to *With delay slot*:
   **12 cycles**, 1 discarded instruction.
5. Set the delay slot back to off and change **Branch resolution** to `ID`:
   **12 cycles** again, 1 discarded instruction.

## Reflection

1. The branch was fetched, decoded, then executed. Which instructions had
   already been fetched by the time the outcome was known?
2. Explain in one sentence why a delay slot saves exactly one instruction.
3. Resolving in ID also saves one. What does a real processor pay for that,
   which this model does not charge?
4. `jal` and `j` never discard anything in this model. Read the "Known
   limitations" section of `docs/pipeline-lab.md` and say what assumption makes
   that true, and when it would be wrong on real hardware.
