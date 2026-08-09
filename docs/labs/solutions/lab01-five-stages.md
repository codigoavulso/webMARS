# Lab 01 - The five stages - solutions

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**

Hand this file out only after the lab. Every measured number below is checked
by `tests/pipeline-labs.test.mjs` against the model in the same commit.

## Measured results

| Configuration | Cycles | Completed | CPI | Stalls |
| --- | --- | --- | --- | --- |
| Forwarding | 8 | 4 | 2.00 | 0 |

## Answers

1. **Where do the extra 4 cycles go?** Filling and draining the pipeline. The
   first instruction needs 5 cycles on its own; after that one instruction
   completes per cycle. The last 4 cycles of the run are the drain, during which
   fewer than five stages are busy.
2. **General rule.** N independent instructions take `N + 4` cycles: 5 for the
   first, then one each for the remaining `N - 1`.
3. **CPI for 1000 instructions.** `1004 / 1000 = 1.004`. It approaches 1.00 but
   never reaches it, because the four fill cycles are paid once regardless of N.
   Accept any answer that identifies the fixed overhead.
4. **Why pipeline registers?** Each stage works on a different instruction in the
   same cycle. The registers hold each instruction's decoded fields, operands and
   control signals so they travel with it and do not get overwritten by the
   instruction behind it.

## Common misconceptions

- "Eight cycles means each instruction took two." No: each instruction still
  takes five cycles end to end; they overlap.
- Students often expect the pipeline to be full in cycle 4. It is full in cycle
  5, because the first instruction only reaches WB then.
