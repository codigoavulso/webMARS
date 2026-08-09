# Lab 05 - Static branch prediction

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**
**Duration: about 30 minutes**

## Prerequisites

- Lab 04.

## Objectives

By the end of this lab you can:

1. Compare always-not-taken with always-taken on the same program.
2. Explain why the wrong static policy costs cycles on every single branch.

## Setup

1. Assemble `docs/labs/programs/lab05_prediction.asm`.
2. Open the Pipeline Lab.

This program has two conditional branches on the same path.

## Predict before you run

| Question | Your prediction |
| --- | --- |
| Cycles with **assume not taken** | |
| Cycles with **assume taken** | |
| Mispredicted branches with **assume taken** | |
| Discarded instructions per misprediction | |

## Steps

1. Run with **Forwarding** (assume not taken): **11 cycles**, 0 discarded.
2. Switch the prediction to **Assume branch is taken** and run: **15 cycles**,
   4 discarded instructions, 2 mispredicted branches.
3. Divide discarded instructions by mispredicted branches. The result should
   match the penalty you measured in Lab 04.
4. Press **Compare profiles**. The table runs the same program under every
   built-in profile at once. Note that each profile carries a version number,
   so a result can be quoted later without ambiguity.
5. Export the run with **Export JSON** and find `metrics.branches` in the file.
   Check `total`, `predicted` and `mispredicted` against what the tool showed.

## Reflection

1. A static predictor never learns. What property of this program makes
   always-not-taken the better policy here?
2. Construct a short program where always-taken would win. You do not have to
   run it; describe its shape.
3. Real processors use dynamic prediction with a history table. webMARS ships a
   BHT Simulator as a separate tool. What information does a dynamic predictor
   have that a static one does not?
4. The exported report includes `config.outcomeModel`. Why would a reader of
   your results insist on seeing that field?
