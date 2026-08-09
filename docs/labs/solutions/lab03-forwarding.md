# Lab 03 - Forwarding and the load-use case - solutions

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**

Hand this file out only after the lab. Every measured number below is checked
by `tests/pipeline-labs.test.mjs` against the model in the same commit.

## Measured results

| Configuration | Cycles | Completed | CPI | Stalls |
| --- | --- | --- | --- | --- |
| Stall until WB (no forwarding) | 14 | 4 | 3.50 | 6 |
| Forwarding | 9 | 4 | 2.25 | 1 (load-use) |

## Answers

1. **Which pipeline registers does forwarding read?** EX/MEM and MEM/WB. The
   Architecture view labels both, and the tool names the source register in its
   explanation line.
2. **Why is a load different?** An ALU result exists at the end of EX, one stage
   before the consumer needs it. A loaded value does not exist until the end of
   MEM, which is the same cycle the consumer would need it in EX. One bubble
   buys the missing cycle.
3. **Removing the bubble.** Move an instruction that does not depend on `$t2`
   between the `lw` and the `add`. It is legal because the moved instruction
   neither reads nor writes any register the reordered pair uses, so the data
   flow is unchanged.
4. **Why separate load-use from raw?** They have different fixes. A raw stall is
   removed by adding forwarding hardware; a load-use stall is removed only by
   scheduling or by a longer pipeline. A report that merges them hides which
   change would help.

## Common misconceptions

- "Forwarding failed here." It did not: it removed five of the six stall cycles.
  The remaining one is a property of the pipeline depth, not of the network.
