# Lab 06 - CPI and instruction scheduling - solutions

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**

Hand this file out only after the lab. Every measured number below is checked
by `tests/pipeline-labs.test.mjs` against the model in the same commit.

## Measured results

| Program | Cycles | Completed | CPI | Stalls |
| --- | --- | --- | --- | --- |
| `lab06_cpi.asm` | 9 | 4 | 2.25 | 1 |
| `lab06_cpi_scheduled.asm` | 8 | 4 | 2.00 | 0 |

## Answers

1. **Why is 11% misleading?** With only four instructions, the fixed four-cycle
   fill and drain dominates. The saving is one bubble; expressed against the
   pipeline overhead rather than against real work, the percentage says almost
   nothing about a longer program.
2. **Why is the reordering legal?** The instructions that moved neither read nor
   write any register that the load and its consumer use, and they touch no
   memory. Formally: no true, anti- or output dependence exists between the
   moved instructions and the pair they crossed.
3. **Compiler versus hardware.** The compiler sees the whole basic block and can
   reorder freely, but it does not know cache behaviour or the actual branch
   outcomes. The hardware knows the real timing but only sees a narrow window
   of instructions.
4. **Which term changed?** Only CPI. Instruction count stayed at 4 and the clock
   period is not modelled at all.

## Common misconceptions

- "Scheduling makes the program shorter." It does not change the instruction
  count; it changes how many cycles those instructions take.
