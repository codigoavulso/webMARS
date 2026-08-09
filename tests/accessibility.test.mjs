// Accessibility regression gate.
//
// The audit in scripts/audit-accessibility.mjs is only useful if it runs. These
// tests run it on every build and fail when a criterion it can check regresses,
// and they check that the published statement stays honest about what it did
// not check - a partial audit that starts reading as a full one is the failure
// mode worth guarding against.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";
import { AUTOMATED_CRITERIA, MANUAL_CRITERIA, audit, contrastRatio, readTokens } from "../scripts/audit-accessibility.mjs";

const statementPath = resolve(projectRoot, "docs/accessibility.md");

test("the contrast calculation matches the WCAG reference values", () => {
  // Black on white is exactly 21:1; a mid grey on white is a known 4.5:1 edge.
  assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
  assert.equal(Math.round(contrastRatio("#ffffff", "#ffffff")), 1);
  assert.ok(contrastRatio("#767676", "#ffffff") >= 4.5, "#767676 on white is the documented 4.5:1 boundary");
  assert.ok(contrastRatio("#777777", "#ffffff") < 4.5, "one step lighter must fall below the boundary");
  assert.equal(contrastRatio("not a colour", "#ffffff"), null);
});

test("both themes declare the same token set", async () => {
  const css = await readFile(resolve(projectRoot, "assets/css/styles.css"), "utf8");
  const light = Object.keys(readTokens(css, ":root {"));
  const dark = Object.keys(readTokens(css, ':root[data-theme="dark"]'));

  assert.ok(light.length > 100, "the light theme should declare the full token set");
  assert.deepEqual(
    light.filter((token) => !dark.includes(token)),
    [],
    "every light-theme token needs a dark-theme counterpart"
  );
});

test("no checked accessibility criterion regresses", async () => {
  const result = await audit();
  const detail = result.failures.map((entry) => `${entry.criterion}: ${entry.detail}`).join("\n");
  assert.equal(result.failures.length, 0, `accessibility failures:\n${detail}`);
  assert.ok(result.measurements.length >= 20, "both themes must be measured");
});

test("every measured contrast pair clears its WCAG threshold", async () => {
  const result = await audit();
  result.measurements.forEach((entry) => {
    assert.ok(
      entry.ratio >= entry.required,
      `${entry.theme} theme: ${entry.foreground} on ${entry.background} is ${entry.ratio.toFixed(2)}:1, needs ${entry.required}:1`
    );
  });
  // Both themes must actually be present, or a passing run means nothing.
  assert.ok(result.measurements.some((entry) => entry.theme === "light"));
  assert.ok(result.measurements.some((entry) => entry.theme === "dark"));
});

test("the statement claims an initial audit and names what it did not check", async () => {
  const statement = await readFile(statementPath, "utf8");
  const version = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version;

  assert.ok(statement.includes(`for webMARS ${version}`));
  assert.match(statement, /initial\*\*,? \*\*partial audit\*\*|\*\*initial, ?\n?partial audit\*\*/,
    "the statement must describe itself as an initial, partial audit");
  assert.match(statement, /does not claim\s*\n?full AA conformance/);
  assert.match(statement, /## Not checked/);
  assert.match(statement, /## Known limitations/);
  assert.match(statement, /No assistive-technology user has tested/);

  // Every criterion, checked or not, must be listed by number.
  [...AUTOMATED_CRITERIA, ...MANUAL_CRITERIA].forEach((entry) => {
    assert.ok(statement.includes(entry.id), `the statement omits criterion ${entry.id}`);
  });
});

test("the Pipeline Lab conveys state as text, not only as colour", async () => {
  const source = await readFile(resolve(projectRoot, "tools/pipeline-lab.js"), "utf8");

  // Stage names are written into every timeline cell.
  assert.match(source, /cell\.textContent = value;/);
  assert.match(source, /aria-label", t\("Cycle \{cycle\}: stage \{stage\}"/);
  // Discarded and dependency rows are labelled in words as well as styled.
  assert.match(source, /marks\.push\(t\("discarded"\)\)/);
  assert.match(source, /marks\.push\(t\("produces an operand"\)\)/);
  // Bubbles state their cause.
  assert.match(source, /\$\{t\("Bubble"\)\}: \$\{slot\.reason\}/);
});

test("interactive rows are reachable and operable from the keyboard", async () => {
  const source = await readFile(resolve(projectRoot, "tools/pipeline-lab.js"), "utf8");

  assert.match(source, /row\.tabIndex = 0;/, "timeline rows must be focusable");
  assert.match(source, /addEventListener\("keydown"/, "timeline rows need a key handler");
  assert.match(source, /event\.key !== "Enter" && event\.key !== " "/, "Enter and Space must both activate a row");
  assert.match(source, /row\.setAttribute\("aria-selected"/, "selection state must be exposed");
  assert.match(source, /role="tab"[\s\S]*aria-selected/, "the view switcher must expose tab semantics");
});

test("animation is gated on the reduced-motion preference everywhere it appears", async () => {
  const result = await audit();
  assert.ok(result.animated.length > 0, "the audit should find animated sources to check");
  // A file that animates without a guard is reported as a failure, which the
  // earlier test already asserts is empty; this pins the check itself.
  assert.ok(
    result.animated.some((name) => name.includes("pipeline-lab")),
    "the datapath transitions must be among the animations checked"
  );
  assert.ok(result.animated.includes("index.html"), "inline startup CSS must be checked");
  assert.ok(
    result.animated.includes("assets/js/app-modules/10-ui.js"),
    "CSS injected by the desktop UI must be checked"
  );
});
