# Lab 02 - Data hazards

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**
**Duration: about 35 minutes**

## Prerequisites

- Lab 01.
- You can read a MIPS instruction and say which registers it reads and writes.

## Objectives

By the end of this lab you can:

1. Spot a read-after-write dependency in a listing.
2. Say how many cycles a dependent instruction waits when the machine has no
   forwarding.

## Setup

1. Assemble `docs/labs/programs/lab02_data_hazards.asm`.
2. Open the Pipeline Lab and select the profile **Stall until WB (no
   forwarding)**.

Every instruction in this program reads a register the previous one wrote.

## Predict before you run

| Question | Your prediction |
| --- | --- |
| How many cycles without forwarding? | |
| How many cycles with forwarding? | |
| How many stall cycles in total? | |

Enter the first number in **Predicted cycles** and press **Check prediction**.

## Steps

1. Run the program with **Stall until WB**. It takes **14 cycles** with 6
   stalls.
2. Step through it one cycle at a time. Each time the tool stalls, read the
   explanation line under the stage boxes: it names the register in conflict,
   the instruction that is waiting and the instruction it is waiting for.
3. Look at the timeline. A held instruction shows `ID*` instead of `ID`. Count
   how many `ID*` cells each instruction gets.
4. Switch the profile to **Forwarding** and run again: **8 cycles**, 0 stalls.
5. Open the Architecture view, step to a cycle where the Forwarding unit is
   highlighted, and read which pipeline register the value came from.

## Reflection

1. Without forwarding, a dependent instruction waits in ID until the producer
   reaches WB. How many cycles is that, and why?
2. The program has three dependencies but six stall cycles. Explain the factor
   of two.
3. Forwarding removed all six stall cycles here. Name a dependency it could not
   have removed.
4. Both runs completed 4 instructions. Compare their CPI and say what CPI is
   actually measuring.
