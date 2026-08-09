# Lab 01 - The five stages

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**
**Duration: about 25 minutes**

## Prerequisites

- You can open a `.asm` file in webMARS and press **Assemble**.
- You know that a MIPS instruction is fetched, decoded, executed, may touch
  memory, and finally writes its result.

## Objectives

By the end of this lab you can:

1. Name the five pipeline stages and say what each one does.
2. Explain why four instructions with no dependencies take eight cycles.

## Setup

1. Open `docs/labs/programs/lab01_five_stages.asm` and assemble it.
2. Open **Tools -> Pipeline Lab** and switch the profile to **Forwarding**.

The program is four `addi` instructions that write four different registers.
Nothing depends on anything else.

## Predict before you run

Write your answers down *before* pressing anything. Then type your cycle
prediction into the **Predicted cycles** box in the toolbar and press **Check
prediction**; the tool will tell you how far off you were.

| Question | Your prediction |
| --- | --- |
| How many cycles until all four instructions finish? | |
| In which cycle is the first instruction in WB? | |
| How many stages are busy in cycle 3? | |

## Steps

1. Press **Next cycle** once. Only IF is occupied. Read the IF box: it shows the
   address, the assembled instruction and the source line it came from.
2. Press **Next cycle** again. The first instruction moved to ID and the second
   entered IF. Two stages are busy.
3. Keep pressing **Next cycle** until the Cycles metric reads 5. Every stage is
   now occupied: the pipeline is full.
4. Continue to the end. The run finishes in **8 cycles** with 4 completed
   instructions.
5. Switch to the **Architecture view**. Step back and forward and watch the four
   pipeline registers IF/ID, ID/EX, EX/MEM and MEM/WB pick up each instruction
   one stage later than the one before it.

## Reflection

1. Four instructions took 8 cycles. Where do the extra 4 cycles go?
2. Write the general rule for N independent instructions.
3. CPI here is 2.00. What would CPI approach if the program had 1000
   independent instructions? Why can it never reach exactly 1.00?
4. The Architecture view labels IF/ID, ID/EX, EX/MEM and MEM/WB. Why does a
   pipeline need those registers at all?
