// Which window is in front, and who is allowed to decide.
//
// On the desktop every window is visible at once, so focus only reorders
// overlapping panes and a stray call costs nothing. Stacked mode shows one
// panel at a time, and there the same call replaces what the reader chose.
// That difference turned an innocuous "bring the data segment forward" inside
// every run command into: stepping through a program while reading any tool
// threw you back to the main window on every press.
//
// The rule these tests pin:
//
//   1. Opening a window focuses it, whether or not it was already open.
//   2. Focus that is a side effect of running the program never changes the
//      stacked panel.
//
// These are source-level assertions because the window manager needs a DOM.
// They are written against the rule rather than the formatting, so a rewrite
// that keeps the behaviour keeps them passing.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";

const uiPath = resolve(projectRoot, "assets/js/app-modules/10-ui.js");
const runtimePath = resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js");

test("focus can be asked not to take over the stacked panel", async () => {
  const source = await readFile(uiPath, "utf8");

  // The panel switch is the part that must be skippable; the z-order and the
  // highlight are harmless either way.
  assert.match(
    source,
    /if \(options\.keepStackedPanel !== true\) activateMobilePanelForEntry\(entry\);/,
    "focus() must be able to skip the stacked panel switch"
  );
  assert.match(
    source,
    /function focusForExecution\(windowId\) \{\s*focus\(windowId, \{ keepStackedPanel: isStackedMode\(\) \}\);\s*\}/,
    "focusForExecution must keep the panel in stacked mode and behave like focus on the desktop"
  );
  assert.match(source, /^\s*focusForExecution,$/m, "focusForExecution must be part of the window manager API");
});

test("opening a window still focuses it, including one already open", async () => {
  const source = await readFile(uiPath, "utf8");
  const show = source.slice(source.indexOf("function show(windowId)"));
  const body = show.slice(0, show.indexOf("\n  function "));

  // Rule 1 and rule 3 are the same code path: show() is called whether the
  // window is new or already on screen, and it must always bring it forward.
  assert.match(body, /activateMobilePanelForEntry\(entry\);/, "show() must select the panel in stacked mode");
  assert.match(body, /focus\(windowId\);/, "show() must focus without opting out of the panel switch");
  assert.doesNotMatch(body, /keepStackedPanel/, "show() must never suppress the panel switch");
});

test("no run command takes over the stacked panel", async () => {
  const source = await readFile(runtimePath, "utf8");

  // Every command that runs, steps, rewinds or assembles brings the text and
  // data segments forward. All of them must do it the non-stealing way.
  const stealing = [...source.matchAll(/windowManager\.focus\("window-(?:text|data)"\)/g)];
  assert.deepEqual(stealing.map((match) => match[0]), [],
    "run commands must use focusForExecution for the text and data segments");

  const raising = [...source.matchAll(/windowManager\.focusForExecution\("window-(?:text|data)"\)/g)];
  assert.equal(raising.length, 8,
    "assemble, step, go and backstep each raise both segments; a new one must choose deliberately");
});

test("switching mode steals focus only when the user asked for it", async () => {
  const source = await readFile(uiPath, "utf8");

  // Every run command sets the mode, so an unconditional focus here defeats
  // the whole fix regardless of what the commands themselves do.
  assert.doesNotMatch(
    source,
    /executePanel\?\.classList\.toggle\("active", mode === "execute"\);\s*\n\s*windowManager\.focus\("window-main"\);/,
    "setMode must not focus the main window unconditionally"
  );
  assert.match(
    source,
    /options\.userInitiated === true[\s\S]{0,120}windowManager\.focus\("window-main"\)/,
    "a user-initiated mode change must still focus the main window"
  );
  assert.match(
    source,
    /windowManager\.focusForExecution\("window-main"\)/,
    "a mode change caused by running must not take the panel"
  );

  // The three mode buttons are the user asking, and must say so.
  ["project", "editor", "execute"].forEach((mode) => {
    assert.match(
      source,
      new RegExp(`${mode}Button\\?\\.addEventListener\\("click", \\(\\) => apply\\("${mode}", \\{ userInitiated: true \\}\\)\\)`),
      `the ${mode} mode button must count as user intent`
    );
  });
});
