# Lab 07 - Memory latency - solutions

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**

Hand this file out only after the lab. Every measured number below is checked
by `tests/pipeline-labs.test.mjs` against the model in the same commit.

## Measured results

| Configuration | Cycles | Stalls | Structural stalls |
| --- | --- | --- | --- |
| Forwarding, latency 1 | 8 | 0 | 0 |
| Forwarding + 2-cycle memory | 11 | 3 | 3 |
| Forwarding, latency 3 | 14 | 6 | 6 |

## Answers

1. **Formula.** Extra cycles = (number of memory accesses) x (latency - 1). Here
   3 x 1 = 3 and 3 x 2 = 6. It depends on how many instructions occupy the MEM
   stage, not on how many instructions the program has.
2. **Why structural, not data?** Nothing is waiting for a *value*. Two
   instructions want the same memory port in the same cycle, and one of them
   must wait. That is a resource conflict.
3. **Extending the lab with a cache.** Give each access a hit or miss outcome,
   charge latency 1 on a hit and the miss penalty otherwise, and let students
   change the access stride so the hit rate changes. The current model does not
   support this; `docs/pipeline-lab.md` records it as a known limitation.
4. **Why is an unrelated instruction delayed?** The pipeline is in order. While
   MEM is occupied nothing behind it can advance, so an instruction that never
   touches memory still finishes later.

## Common misconceptions

- Students sometimes expect only the memory instructions to slow down. Have them
  point at the final `addi` in the timeline and count its cycles.
