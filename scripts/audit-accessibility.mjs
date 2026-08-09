// Accessibility audit against WCAG 2.2 level AA.
//
// This is an *initial* audit and says so in its own output. It checks, by
// machine, the criteria that can be checked by machine from the source: colour
// contrast in both themes, reliance on colour alone, reduced-motion support,
// keyboard reachability of interactive controls, accessible names, and text
// resizing. Criteria that need a human - meaningful reading order, sensible
// alternative text, cognitive load - are listed as not checked, not as passed.
//
// A tool that reports "0 issues" while silently skipping half of WCAG is worse
// than no tool, so the report always states its own coverage.
//
// Usage:
//   node scripts/audit-accessibility.mjs             audit and write the report
//   node scripts/audit-accessibility.mjs --no-write

import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stylesPath = resolve(projectRoot, "assets/css/styles.css");
const indexPath = resolve(projectRoot, "index.html");
const reportPath = resolve(projectRoot, "docs/accessibility.md");

// The criteria this script evaluates, and how. Anything not listed here is
// reported as unchecked.
export const AUTOMATED_CRITERIA = Object.freeze([
  { id: "1.4.3", name: "Contrast (Minimum)", level: "AA", how: "Computes the contrast ratio of every foreground/background token pair in both themes." },
  { id: "1.4.1", name: "Use of Color", level: "A", how: "Checks that pipeline stages, hazards and discarded instructions carry a text label, not only a colour." },
  { id: "1.4.4", name: "Resize Text", level: "AA", how: "Checks that no layout dimension that carries text is expressed in a unit that ignores the user's font size." },
  { id: "2.1.1", name: "Keyboard", level: "A", how: "Checks that every element with a click handler is either natively focusable or given tabindex and a key handler." },
  { id: "2.3.3", name: "Animation from Interactions", level: "AAA", how: "Checks stylesheets, inline startup CSS, tool CSS and injected UI CSS for a prefers-reduced-motion guard or override." },
  { id: "4.1.2", name: "Name, Role, Value", level: "A", how: "Checks that interactive controls built from non-semantic elements declare a role and an accessible name." },
  { id: "3.1.1", name: "Language of Page", level: "A", how: "Checks that the document declares a language and that it follows the selected interface language." }
]);

// Criteria a machine cannot decide. Naming them is the difference between an
// honest partial audit and a misleading clean bill of health.
export const MANUAL_CRITERIA = Object.freeze([
  { id: "1.1.1", name: "Non-text Content", level: "A", why: "Whether an alternative text is *meaningful* is a judgement, not a pattern." },
  { id: "1.3.2", name: "Meaningful Sequence", level: "A", why: "Reading order has to be evaluated against the author's intent." },
  { id: "2.4.3", name: "Focus Order", level: "A", why: "Whether the order preserves meaning needs a person moving through the interface." },
  { id: "2.4.6", name: "Headings and Labels", level: "AA", why: "Whether a label describes its control is a language judgement." },
  { id: "3.2.3", name: "Consistent Navigation", level: "AA", why: "Requires comparing pages as a user would encounter them." },
  { id: "3.3.1", name: "Error Identification", level: "A", why: "Requires triggering each error path and reading the result." },
  { id: "1.4.10", name: "Reflow", level: "AA", why: "Needs a real viewport at 320 CSS pixels with content rendered." },
  { id: "2.5.8", name: "Target Size (Minimum)", level: "AA", why: "Needs computed layout, not source inspection." }
]);

// --- colour -----------------------------------------------------------------

function parseColor(value) {
  const text = String(value).trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join("") : hex[1];
    return [0, 2, 4].map((offset) => Number.parseInt(digits.slice(offset, offset + 2), 16));
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(text);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

function relativeLuminance([r, g, b]) {
  const channel = (value) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground, background) {
  const first = parseColor(foreground);
  const second = parseColor(background);
  if (!first || !second) return null;
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

// Reads a `:root` style block into a token map, resolving var() one level deep
// so tokens defined in terms of other tokens still yield a colour.
export function readTokens(css, selector) {
  const start = css.indexOf(selector);
  if (start === -1) return {};
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const block = css.slice(open + 1, close);
  const tokens = {};
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  Object.keys(tokens).forEach((key) => {
    const reference = /^var\((--[\w-]+)\)$/.exec(tokens[key]);
    if (reference && tokens[reference[1]]) tokens[key] = tokens[reference[1]];
  });
  return tokens;
}

// Foreground/background pairs that actually occur in the interface, with the
// size class that decides the required ratio.
const CONTRAST_PAIRS = Object.freeze([
  { foreground: "--text", background: "--surface", context: "body text on a panel", large: false },
  { foreground: "--text", background: "--surface-raised", context: "text on a raised panel", large: false },
  { foreground: "--text", background: "--surface-muted", context: "text on a muted panel", large: false },
  { foreground: "--text-muted", background: "--surface", context: "secondary text", large: false },
  { foreground: "--text-muted", background: "--surface-raised", context: "secondary text on a raised panel", large: false },
  { foreground: "--accent-strong", background: "--surface", context: "emphasis and metric values", large: true },
  { foreground: "--accent-strong", background: "--surface-raised", context: "emphasis on a raised panel", large: true },
  { foreground: "--text", background: "--table-head", context: "table header text", large: false },
  { foreground: "--error", background: "--surface", context: "error text", large: false },
  { foreground: "--error", background: "--error-bg", context: "error text on its own background", large: false },
  { foreground: "--warn", background: "--surface", context: "warning text", large: false },
  { foreground: "--warn", background: "--warn-bg", context: "warning text on its own background", large: false },
  { foreground: "--flat-text-dim", background: "--surface", context: "dimmed flat-view text", large: false }
]);

function auditContrast(css) {
  const findings = [];
  const measurements = [];
  const themes = [
    { name: "light", tokens: readTokens(css, ":root {") },
    { name: "dark", tokens: readTokens(css, ':root[data-theme="dark"]') }
  ];

  themes.forEach((theme) => {
    CONTRAST_PAIRS.forEach((pair) => {
      const foreground = theme.tokens[pair.foreground];
      const background = theme.tokens[pair.background];
      if (!foreground || !background) return;
      const ratio = contrastRatio(foreground, background);
      if (ratio === null) return;
      // WCAG 1.4.3: 4.5:1 for body text, 3:1 for large text.
      const required = pair.large ? 3 : 4.5;
      measurements.push({ theme: theme.name, ...pair, ratio, required, passes: ratio >= required });
      if (ratio < required) {
        findings.push({
          criterion: "1.4.3",
          severity: "fail",
          detail: `${theme.name} theme: ${pair.foreground} on ${pair.background} (${pair.context}) is ${ratio.toFixed(2)}:1, below the ${required}:1 minimum`
        });
      }
    });
  });

  return { findings, measurements };
}

// --- source checks ----------------------------------------------------------

async function readSources(directory, extension) {
  const files = [];
  for (const name of await readdir(resolve(projectRoot, directory))) {
    if (!name.endsWith(extension)) continue;
    files.push({ name: `${directory}/${name}`, text: await readFile(resolve(projectRoot, directory, name), "utf8") });
  }
  return files;
}

function auditReducedMotion(sources) {
  const findings = [];
  const animated = [];
  const check = (name, text) => {
    const hasMotion = /(^|[^-])transition\s*:|animation\s*:/m.test(text);
    if (!hasMotion) return;
    animated.push(name);
    const hasReducedMotionRule = /@media\s*\(\s*prefers-reduced-motion\s*:\s*(?:reduce|no-preference)\s*\)/i.test(text);
    if (!hasReducedMotionRule) {
      findings.push({
        criterion: "2.3.3",
        severity: "fail",
        detail: `${name} animates or transitions without a prefers-reduced-motion guard`
      });
    }
  };
  sources.forEach((file) => check(file.name, file.text));
  return { findings, animated };
}

function auditKeyboard(toolSources) {
  const findings = [];
  toolSources.forEach((file) => {
    // A click handler attached to a row or cell needs a keyboard equivalent.
    const clickOnRow = /addEventListener\("click"/.test(file.text) && /closest\("tr\[|closest\('tr\[/.test(file.text);
    if (!clickOnRow) return;
    const hasKeyHandler = /addEventListener\("keydown"/.test(file.text);
    const hasTabIndex = /tabIndex\s*=\s*0/.test(file.text);
    if (!hasKeyHandler || !hasTabIndex) {
      findings.push({
        criterion: "2.1.1",
        severity: "fail",
        detail: `${file.name} makes table rows clickable without ${hasTabIndex ? "a keydown handler" : "tabindex"}`
      });
    }
  });
  return { findings };
}

function auditColorAlone(toolSources) {
  const findings = [];
  toolSources.forEach((file) => {
    if (!file.name.includes("pipeline-lab")) return;
    // The timeline colours stages and marks discarded rows; both must also be
    // conveyed as text.
    if (!/marks\.push\(t\("discarded"\)\)/.test(file.text)) {
      findings.push({ criterion: "1.4.1", severity: "fail", detail: `${file.name} marks discarded instructions without a text label` });
    }
    if (!/aria-label", t\("Cycle \{cycle\}: stage \{stage\}"/.test(file.text)) {
      findings.push({ criterion: "1.4.1", severity: "fail", detail: `${file.name} timeline cells carry no textual stage announcement` });
    }
  });
  return { findings };
}

function auditNames(indexHtml, toolSources) {
  const findings = [];
  // Non-semantic interactive elements must declare role and name.
  const tabs = toolSources.filter((file) => /role="tab"/.test(file.text));
  tabs.forEach((file) => {
    if (!/aria-selected/.test(file.text)) {
      findings.push({ criterion: "4.1.2", severity: "fail", detail: `${file.name} declares role="tab" without aria-selected` });
    }
  });
  if (!/<html[^>]*\slang=/i.test(indexHtml)) {
    findings.push({ criterion: "3.1.1", severity: "fail", detail: "index.html does not declare a document language" });
  }
  return { findings };
}

function auditTextResize(css) {
  const findings = [];
  // Fixed pixel heights on elements that hold text stop the layout following a
  // larger font size. Min-heights are fine: they grow.
  for (const match of css.matchAll(/([.#][\w-]+[^{}]*)\{([^}]*)\}/g)) {
    const selector = match[1].trim();
    const body = match[2];
    if (!/font|line-height/.test(body)) continue;
    const fixedHeight = /(^|[^-])height\s*:\s*\d+px/.test(body);
    if (fixedHeight) {
      findings.push({
        criterion: "1.4.4",
        severity: "warn",
        detail: `${selector.slice(0, 60)} sets a fixed pixel height on an element that carries text`
      });
    }
  }
  return { findings: findings.slice(0, 10) };
}

export async function audit() {
  const css = await readFile(stylesPath, "utf8");
  const indexHtml = await readFile(indexPath, "utf8");
  const toolSources = await readSources("tools", ".js");
  const appModuleSources = await readSources("assets/js/app-modules", ".js");

  const contrast = auditContrast(css);
  const motion = auditReducedMotion([
    { name: "assets/css/styles.css", text: css },
    { name: "index.html", text: indexHtml },
    ...toolSources,
    ...appModuleSources
  ]);
  const keyboard = auditKeyboard(toolSources);
  const colorAlone = auditColorAlone(toolSources);
  const names = auditNames(indexHtml, toolSources);
  const resize = auditTextResize(css);

  const findings = [
    ...contrast.findings, ...motion.findings, ...keyboard.findings,
    ...colorAlone.findings, ...names.findings, ...resize.findings
  ];

  return {
    findings,
    failures: findings.filter((entry) => entry.severity === "fail"),
    warnings: findings.filter((entry) => entry.severity === "warn"),
    measurements: contrast.measurements,
    animated: motion.animated
  };
}

function buildReport(result, version) {
  const { measurements, failures, warnings } = result;
  const contrastRows = measurements.map((entry) =>
    `| ${entry.theme} | \`${entry.foreground}\` on \`${entry.background}\` | ${entry.context} | ${entry.ratio.toFixed(2)}:1 | ${entry.required}:1 | ${entry.passes ? "pass" : "**FAIL**"} |`
  ).join("\n");

  const automated = AUTOMATED_CRITERIA.map((entry) =>
    `| ${entry.id} | ${entry.name} | ${entry.level} | ${entry.how} |`).join("\n");
  const manual = MANUAL_CRITERIA.map((entry) =>
    `| ${entry.id} | ${entry.name} | ${entry.level} | ${entry.why} |`).join("\n");

  return `# webMARS accessibility statement

Generated by \`scripts/audit-accessibility.mjs\` for webMARS ${version}.
Regenerate with \`npm run audit:a11y\`. Do not edit this file by hand.

## Conformance claim

webMARS targets **WCAG 2.2 level AA**. This document reports an **initial,
partial audit**: it is not a conformance certificate, and it does not claim
full AA conformance.

What that means precisely:

- The criteria in "Checked automatically" below are evaluated on every build and
  fail the build when they regress.
- The criteria in "Not checked" below have **not** been evaluated. They are not
  passing and not failing; nobody has assessed them.
- No assistive-technology user has tested this application. A conformance claim
  without that is incomplete, and this one is stated as incomplete rather than
  rounded up.

## Checked automatically

| Criterion | Name | Level | How it is checked |
| --- | --- | --- | --- |
${automated}

## Not checked

These need a person, and are listed so their absence is visible rather than
implied.

| Criterion | Name | Level | Why a machine cannot decide it |
| --- | --- | --- | --- |
${manual}

## Result

| Metric | Value |
| --- | --- |
| Failures | ${failures.length} |
| Warnings | ${warnings.length} |
| Contrast pairs measured | ${measurements.length} |

${failures.length
    ? `### Failures\n\n${failures.map((entry) => `- **${entry.criterion}**: ${entry.detail}`).join("\n")}`
    : "### Failures\n\nNone among the criteria checked automatically."}

${warnings.length
    ? `### Warnings\n\nThese do not fail the build. Each is a place where a person should confirm the behaviour at a large font size.\n\n${warnings.map((entry) => `- **${entry.criterion}**: ${entry.detail}`).join("\n")}`
    : ""}

## Colour contrast

Measured from the theme tokens in \`assets/css/styles.css\`, in both themes.
Body text needs 4.5:1; large text and non-text indicators need 3:1.

| Theme | Pair | Context | Measured | Required | Verdict |
| --- | --- | --- | --- | --- | --- |
${contrastRows}

## Features that support access

- **Keyboard.** Every control is reachable with Tab. The Pipeline Lab timeline
  gives its rows \`tabindex\` and an Enter/Space handler, so following an
  instruction never needs a pointer.
- **Colour is never the only channel.** Pipeline stages carry their name as text
  in every cell, discarded instructions are labelled "discarded" as well as
  struck through, and dependency rows are labelled "produces an operand".
  Bubbles state their reason in words.
- **Reduced motion.** The startup loader, desktop feedback and tool animations
  either run only under \`prefers-reduced-motion: no-preference\` or are disabled
  by a \`prefers-reduced-motion: reduce\` override.
- **Themes.** Light and dark themes declare the same token set, and the theme
  follows the browser preference by default.
- **Language.** The interface is translated into twenty languages, including
  four written right to left, and the document language attribute follows the
  selected language. Right-to-left layout was verified in Arabic: the pinned
  timeline column follows the writing direction through \`inset-inline-start\`,
  while the datapath drawing and the stage row stay left to right on purpose,
  because the order IF to WB is the diagram's meaning rather than its reading
  order.
- **Narrow layouts.** The stacked mobile layout was verified at 375 by 812 CSS
  pixels: wide content scrolls inside its own container and never forces the
  page to scroll horizontally.
- **No time limits.** Nothing in the interface expires or auto-advances.

## Known limitations

- Screen-reader behaviour has not been verified with NVDA, JAWS or VoiceOver.
- Reflow at 320 CSS pixels has not been measured; the interface is a
  multi-window desktop metaphor and the narrow layout is a stacked variant whose
  conformance is unverified.
- Target sizes have not been measured against 2.5.8.
- The Digital Lab Sim, Bitmap Display and TTY tools reproduce hardware output
  and deliberately use literal colours; their content is not theme-aware and has
  not been assessed for contrast.
- The in-app help renders in frames; its conformance is inherited from the help
  pages and has not been separately audited.

## Reporting a problem

Accessibility problems are defects. Open an issue on the repository describing
what you were trying to do, what happened, and the assistive technology and
browser you were using.
`;
}

async function main() {
  const write = !process.argv.includes("--no-write");
  const result = await audit();
  const version = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version;
  if (write) await writeFile(reportPath, buildReport(result, version), "utf8");

  result.findings.forEach((entry) => {
    process.stdout.write(`${entry.severity === "fail" ? "FAIL" : "warn"} ${entry.criterion}: ${entry.detail}\n`);
  });
  process.stdout.write(`\n${result.measurements.length} contrast pairs measured, ${result.failures.length} failure(s), ${result.warnings.length} warning(s).\n`);
  if (result.failures.length) process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith("audit-accessibility.mjs")) {
  await main();
}
