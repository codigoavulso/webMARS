# Lab 06 - CPI and instruction scheduling

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**
**Duration: about 40 minutes**

## Prerequisites

- Lab 03.

## Objectives

By the end of this lab you can:

1. Compute CPI from cycles and completed instructions.
2. Reorder independent work to fill a load-use gap, and measure the gain.

## Setup

1. Assemble `docs/labs/programs/lab06_cpi.asm`.
2. Open the Pipeline Lab with the **Forwarding** profile.

## Predict before you run

| Question | Your prediction |
| --- | --- |
| Cycles for the original program | |
| Cycles after you move one instruction | |
| CPI in each case | |

## Steps

1. Run the original program: **9 cycles**, 4 completed, 1 stall, CPI 2.25.
2. Look at the listing. The `add` immediately after the `lw` needs the loaded
   value. The two `addi` instructions below it need nothing at all.
3. Before looking at the answer, write down the reordering you would apply.
4. Assemble `docs/labs/programs/lab06_cpi_scheduled.asm`, which applies one
   such reordering, and run it: **8 cycles**, 0 stalls, CPI 2.00.
5. Export both runs as CSV and put the two metric sheets side by side. The
   program hash differs, which is how you can prove the two rows describe
   different programs rather than the same program measured twice.

## Reflection

1. One cycle saved out of nine is about 11%. Why is that a misleading figure to
   quote on its own for a four-instruction program?
2. The reordering is only legal because of a specific property of the
   instructions you moved. State it precisely.
3. A compiler does this automatically. What does the compiler know that the
   hardware does not, and what does the hardware know that the compiler does
   not?
4. CPI fell from 2.25 to 2.00 while the instruction count stayed at 4. Which of
   the three terms of the classic performance equation did you change?
