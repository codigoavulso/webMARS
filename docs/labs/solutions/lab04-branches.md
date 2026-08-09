# Lab 04 - Branches and discarded instructions - solutions

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**

Hand this file out only after the lab. Every measured number below is checked
by `tests/pipeline-labs.test.mjs` against the model in the same commit.

## Measured results

| Configuration | Cycles | Discarded | Mispredicted |
| --- | --- | --- | --- |
| Forwarding (assume not taken) | 11 | 0 | 0 |
| Forwarding + predict taken | 13 | 2 | 1 |
| Predict taken + delay slot | 12 | 1 | 1 |
| Predict taken + resolve in ID | 12 | 1 | 1 |

## Answers

1. **What had already been fetched?** Two instructions. The branch is in EX in
   cycle 3; by then the instructions fetched in cycles 2 and 3 are in ID and IF.
2. **Why does a delay slot save one?** The instruction immediately after the
   branch is defined to execute whatever the outcome, so it is never on the
   wrong path and is never discarded. Only the instruction behind it is.
3. **What does resolving in ID cost in real hardware?** The comparison and
   target adder move into the decode stage, lengthening it. That can raise the
   clock period, which the model does not charge because it counts cycles, not
   nanoseconds. Accept any answer naming the clock-period trade-off.
4. **Unconditional jumps.** The model predicts a resolvable jump target
   correctly at fetch, which is equivalent to assuming a branch target buffer
   that always hits. Real hardware does not know the target until the
   instruction is decoded, so a cold or missing BTB entry costs cycles the model
   never charges.

## Common misconceptions

- Students often think the branch penalty depends on whether the branch is
  taken. In this model it depends only on whether the *prediction* matched the
  assumed outcome.
- Watch for students quoting the delay-slot result as "faster hardware". It is
  the same hardware with a different instruction-set contract.
