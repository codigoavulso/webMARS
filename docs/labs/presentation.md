# The webMARS Pipeline Lab

**Lab set 1.0.0 - webMARS Pipeline Lab model `webmars.pipeline-lab` v2 - Language: English**
**A short talk: 15 minutes, 12 slides, plus a 5-minute live demonstration**

Speaker notes are in blockquotes. Everything demonstrated is reproducible in a
browser with no install, so the audience can follow along on their own laptops.

---

## Slide 1 — The problem

Students can watch a MIPS program run, instruction by instruction.

They cannot watch it *stall*.

> A conventional simulator shows the machine's state after each instruction.
> Pipelining is about what happens *between* instructions, which is exactly what
> that view cannot show. Ask the room: how do you currently teach a load-use
> hazard? Most answers involve a whiteboard.

---

## Slide 2 — What the Pipeline Lab is

A five-stage timing model that runs beside the normal webMARS runtime.

- Reads the instructions the assembler produced
- Models IF, ID, EX, MEM, WB cycle by cycle
- **Never executes the program** and never touches machine state

> That last point is the whole design. It is why the functional runtime can be
> described honestly as not cycle-accurate, and why the timing model can be
> changed without any risk to the simulator students rely on.

---

## Slide 3 — What it is not

- Not a claim about any physical MIPS processor
- Not a cache simulator, a dynamic scheduler, or a superscalar model
- Not a replacement for the runtime

It declares its own limits in the interface and in every exported report.

> Being explicit about limits is a teaching feature, not a disclaimer. A student
> who knows what the model omits has learned something about the model.

---

## Slide 4 — Two views

**Learn** — five stage blocks, an instruction/cycle timeline, and a sentence
explaining every stall in plain language.

**Architecture** — the datapath: pipeline registers, control lines, muxes,
forwarding paths, hazard detection unit.

Selecting an instruction in one view keeps it highlighted in the other.

> Demonstrate the switch here. The Learn view answers "what happened"; the
> Architecture view answers "which wire made it happen".

---

## Slide 5 — Live: the load-use hazard

```mips
lw   $2, 20($1)
and  $4, $2, $5
or   $8, $2, $6
```

Run with **Forwarding**. Exactly one bubble appears.

> This is the textbook sequence from Patterson and Hennessy chapter 4. Step to
> the stalling cycle and read the explanation aloud: the consumer needs a value
> the load is still fetching from memory. Then step once more and show the
> forwarding path from EX/MEM lighting up in the Architecture view.

---

## Slide 6 — Configuration is the lesson

| Setting | Choices |
| --- | --- |
| Data hazards | stall until write-back, or forwarding |
| Delay slot | on, off |
| Branch prediction | not taken, taken, branch history table |
| Branch resolution | ID, EX |
| Memory latency | 1 to 8 cycles |
| Traps | serialised, or not |

> Every one of these is a design decision a real architect makes. The student
> changes one and immediately sees what it cost or saved.

---

## Slide 7 — Live: comparing configurations

Press **Compare profiles**. The same program runs under every built-in profile
at once.

| Profile | Cycles | CPI | Discarded |
| --- | --- | --- | --- |
| Stall until WB | higher | higher | - |
| Forwarding | lower | lower | - |
| Predict taken | - | - | 2 per branch |

> Do not read the numbers out. Let the table appear and ask the room which
> profile they expected to win, and why. The disagreement is the lesson.

---

## Slide 8 — Predict before you run

Every worksheet asks the student to commit to a number first.

The tool has a **Predicted cycles** box and a **Check prediction** button. It
reports the actual count and the difference.

> Making the guess explicit before the reveal is the point. A student who
> silently reads the answer learns much less than one who was wrong by four
> cycles and has to work out why.

---

## Slide 9 — Seven guided laboratories

1. The five stages
2. Data hazards
3. Forwarding and the load-use case
4. Branches and discarded instructions
5. Static branch prediction
6. CPI and instruction scheduling
7. Memory latency

Each has objectives, prerequisites, steps, reflection questions, and a separate
solution sheet with common misconceptions.

> About 235 minutes of contact time in total, which fits four one-hour sessions.
> Labs 1 to 5 are a progression; 6 and 7 are parallel tracks off lab 3.

---

## Slide 10 — Why you can trust the numbers

- Every number on every worksheet is **re-measured by the test suite** against
  the model in the same commit
- The model is checked against the canonical Patterson and Hennessy sequences
- Results export as JSON and CSV with the model version, profile version,
  configuration and a hash of the program
- Reports contain no timestamps and no personal data, so the same work produces
  a byte-identical file

> If a worksheet ever disagrees with the tool, that is a bug in the repository
> and the build fails. Students are never asked to trust a number the software
> does not produce.

---

## Slide 11 — Practicalities

- Runs in a browser. No install or JVM; no account or BackMars is required for local work.
- Interface in twenty languages, including four written right to left.
- Keyboard operable; colour is never the only channel; an optional
  colour-vision-safe palette.
- MIT licensed. Adapt the worksheets freely.

> For a lab with locked-down machines: serve the packaged release from a laptop.
> It is a directory of static files.

---

## Slide 12 — Getting started

```bash
git clone https://github.com/codigoavulso/webMARS
cd webMARS
npm start
```

Then open **Tools → Pipeline Lab**, and `docs/labs/README.md` for the teaching
pack.

> Offer to run lab 1 with anyone who wants to try it now. It takes 25 minutes
> and needs nothing but a browser.

---

## Appendix: the five-minute demonstration

If you have only five minutes, do this and nothing else:

1. Assemble `docs/labs/programs/lab03_forwarding.asm`.
2. Open the Pipeline Lab with **Stall until WB**. Run. Note the cycle count.
3. Switch to **Forwarding**. Run. Note the count again.
4. Step to the one remaining stall and read the explanation.
5. Switch to the Architecture view and show the forwarding path.

That sequence contains the entire argument: the model is configurable, the
difference is measurable, and the tool explains the cause in words.

## Appendix: questions you will be asked

**"Is it cycle-accurate for real hardware?"**
No, and it says so. It is a teaching model of the textbook five-stage pipeline.
The limits are listed in `docs/pipeline-lab.md`.

**"How does it know whether a branch is taken?"**
It does not execute the program, so it cannot. It declares the assumption it
uses instead - sequential fall-through by default - in the interface and in
every report. That is deliberate: an invented outcome would be worse than a
declared one.

**"Can students cheat by reading the solutions?"**
The solutions are separate files. The reflection questions, especially the last
one in each lab, require reading the model's stated assumptions rather than
recalling a number.

**"What about caches?"**
Not modelled. Lab 7 points students at that boundary on purpose and asks them to
sketch how they would extend it.

**"Can I use it with my own programs?"**
Yes. Anything the assembler accepts, the Pipeline Lab will time.
