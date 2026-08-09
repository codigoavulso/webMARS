# Lab 05 - Static branch prediction - solutions

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**

Hand this file out only after the lab. Every measured number below is checked
by `tests/pipeline-labs.test.mjs` against the model in the same commit.

## Measured results

| Configuration | Cycles | Discarded | Mispredicted |
| --- | --- | --- | --- |
| Forwarding (assume not taken) | 11 | 0 | 0 |
| Forwarding + predict taken | 15 | 4 | 2 |

4 discarded / 2 mispredicted = 2 instructions per misprediction, matching Lab 04.

## Answers

1. **Why does not-taken win here?** Under the declared `sequential` outcome
   assumption every conditional branch falls through, so not-taken is right
   every time. Students should notice that this is a property of the *model's
   stated assumption*, not a discovery about branches in general.
2. **Where would always-taken win?** Any loop whose back edge is taken on almost
   every iteration: a backward branch at the bottom of a long-running loop is
   taken N-1 times out of N.
3. **What does a dynamic predictor know?** The outcome history of that specific
   branch, indexed by its address. A static policy has only the instruction
   itself.
4. **Why insist on `config.outcomeModel`?** Because the misprediction count is
   meaningless without it. The same program and the same predictor produce
   different numbers under `sequential` and under `backward-taken`.

## Common misconceptions

- Treating "0 mispredictions" as evidence that the predictor is good. It is
  evidence that the predictor agrees with the model's assumption.
