# Lab 02 - Data hazards - solutions

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**

Hand this file out only after the lab. Every measured number below is checked
by `tests/pipeline-labs.test.mjs` against the model in the same commit.

## Measured results

| Configuration | Cycles | Completed | CPI | Stalls |
| --- | --- | --- | --- | --- |
| Stall until WB (no forwarding) | 14 | 4 | 3.50 | 6 |
| Forwarding | 8 | 4 | 2.00 | 0 |

## Answers

1. **How long does the consumer wait?** Two cycles. The model lets a value
   written in WB be read in ID in the same cycle, so a consumer sitting in ID
   waits while its producer is in EX and again while it is in MEM.
2. **Three dependencies, six stall cycles.** Each dependency costs two stall
   cycles, and this program chains three of them: 3 x 2 = 6.
3. **A dependency forwarding cannot remove.** A load-use pair: the value does
   not exist until the load has read memory. That is Lab 03.
4. **CPI.** 3.50 versus 2.00 for the same four instructions. CPI measures cycles
   per completed instruction, so it separates "how much work" from "how long the
   machine took to do it".

## Common misconceptions

- Students frequently answer "three stalls" because there are three
  dependencies. Have them count `ID*` cells in the timeline instead.
- Some expect forwarding to be free in hardware. Point out that it costs
  multiplexers, wires and a forwarding unit; the model only charges the timing.
