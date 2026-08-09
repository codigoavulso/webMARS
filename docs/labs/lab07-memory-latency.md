# Lab 07 - Memory latency

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**
**Duration: about 30 minutes**

## Prerequisites

- Lab 03.

## Objectives

By the end of this lab you can:

1. Distinguish a structural hazard from a data hazard.
2. Predict the cost of raising memory latency for a given number of accesses.

This lab is about the memory *port*, not about caches. The Pipeline Lab does
not model a cache; `docs/pipeline-lab.md` lists that under known limitations.
What it does model is how long the MEM stage is occupied.

## Setup

1. Assemble `docs/labs/programs/lab07_memory.asm`.
2. Open the Pipeline Lab with the **Forwarding** profile.

The program performs three memory accesses in a row.

## Predict before you run

| Memory latency | Predicted cycles |
| --- | --- |
| 1 cycle | |
| 2 cycles | |
| 3 cycles | |

## Steps

1. Run with memory latency 1: **8 cycles**, 0 stalls.
2. Select the **Forwarding + 2-cycle memory** profile and run: **11 cycles**,
   3 stalls, all of them structural.
3. Set **Memory latency** to 3 and run: **14 cycles**, 6 structural stalls.
4. Step through a stalled cycle. WB receives a bubble labelled `structural`
   while MEM holds the same instruction for a second cycle. Nothing upstream
   advances.
5. Confirm in the explanation line that the tool calls this a structural
   hazard and names the instruction holding the port.

## Reflection

1. Three accesses at latency 2 cost 3 extra cycles, and at latency 3 they cost
   6. Write the formula and say what it depends on.
2. Why does the tool count these as `structuralStalls` rather than
   `dataStalls`? What is actually in conflict?
3. A cache would make most accesses hit in one cycle. Sketch how you would
   extend this lab if the Pipeline Lab modelled a cache.
4. The final `addi` needs no memory at all, yet it finishes later. Explain why
   an instruction can be delayed by a hazard it has no part in.
