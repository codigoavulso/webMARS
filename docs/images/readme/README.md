# README screenshots

Real browser captures of the local webMARS checkout reporting version 0.6.6,
prepared on 2026-11-02 for the main README. These are separate from the Manual's
older, independently documented screenshot set.

Profile: English interface and examples, light theme, default browser viewport
(1543 × 892), JPEG, no Cloud login. All projects are bundled public examples.
No synthetic tool results or composited interfaces are used.

Start the app with `npm start`, then open each `/e/<id>` route and choose
**Open as New Project**. Use a separate local origin for capture work to keep
an existing browser workspace intact. Set English and Light under
**Settings → Interface** before opening the examples.

| Image | How to reproduce the visible state |
| --- | --- |
| `editor.jpg` | Open `lesson01-registers`, clear Mars Messages and show Editor. |
| `execute.jpg` | Assemble and run that lesson; Run I/O shows `12 + 30 = 42`. |
| `minic.jpg` | Open `bitmap-rectangles`, Compile, choose Generated MIPS and move the compiler window right to expose the source. |
| `stack.jpg` | Open `factorial-recursive`, Assemble, open Stack Visualizer and Connect to MIPS. Enter `5` at the ReadInt prompt. Step until three `fact` frames have saved their arguments; pause before the fourth call. Maximise the tool. |
| `pipeline.jpg` | With the assembled registers lesson, open and maximise Pipeline Lab. Keep the default assembled-program stream and Stall until WB profile; advance to cycle 9. |
| `bitmap.jpg` | Open `bitmap-display-bars`, connect Bitmap Display, assemble and run. Set unit width/height to 4 and display width/height to 256 for a readable 64 × 64 framebuffer. Hide settings and pause after the image fills. The pattern varies with animation time. |
| `projects.jpg` | Show Project after opening the registers and bitmap examples; local example files and navigation are visible. |

Window positions and project timestamps can vary. Recapture affected images
when the interface or the example workflow changes; retain meaningful program
output and readable controls.
