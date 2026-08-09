# Lab 03 - Forwarding and the load-use case

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**
**Duration: about 35 minutes**

## Prerequisites

- Lab 02.
- You know what `lw` does and when its result becomes available.

## Objectives

By the end of this lab you can:

1. Explain which dependencies forwarding removes and which it cannot.
2. Show why a load followed immediately by its consumer costs exactly one
   bubble, no matter how good the forwarding network is.

## Setup

1. Assemble `docs/labs/programs/lab03_forwarding.asm`.
2. Open the Pipeline Lab.

The program contains two dependencies: an ALU-to-ALU pair and a load-use pair.

## Predict before you run

| Question | Your prediction |
| --- | --- |
| Cycles with **Stall until WB** | |
| Cycles with **Forwarding** | |
| Stall cycles remaining with forwarding | |

## Steps

1. Run with **Stall until WB (no forwarding)**: **14 cycles**, 6 stalls.
2. Run with **Forwarding**: **9 cycles**, 1 stall. Exactly one stall survives.
3. Step to the stalling cycle. The explanation says `load-use`, not `raw`. Read
   it carefully: the consumer needs a value the load is *still fetching from
   memory*.
4. In the Architecture view, notice the load is in EX while its consumer is in
   ID. The data memory has not been read yet, so there is nothing to forward.
5. Step one more cycle. Now the load is in MEM and the forwarding path from
   EX/MEM lights up. The value exists, and the consumer can proceed.

## Reflection

1. Forwarding sends a result backwards in time from a later stage to an earlier
   one. Which two pipeline registers does it read from?
2. Why can an ALU result be forwarded with no penalty, while a loaded value
   costs one cycle?
3. Rewrite the program so the load-use bubble disappears without changing what
   the program computes. Which instruction did you move, and why is that legal?
4. The tool reports this stall under `hazards.load-use`, separately from
   `hazards.raw`. Why is that distinction worth keeping in a report?
