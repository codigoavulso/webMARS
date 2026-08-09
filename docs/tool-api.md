# webMARS tool API

**API version 1** (`webmars.tool-api/1`). Declared by `tools/tools.json` and
verified by `tests/tool-api-contract.test.mjs`.

A tool is a plain JavaScript file that registers itself with the host and gets
back a window plus a stream of runtime updates. There is no build step, no
bundler and no framework: the file is loaded on demand the first time the user
opens the tool from the **Tools** menu.

Start by generating one:

```bash
node scripts/new-tool.mjs --id my-tool --label "My Tool"
```

That writes a complete working tool, a passing test file, and both catalog
registrations. The generated tool already obeys every contract below, so the
first thing you change is behaviour rather than plumbing.

To read rather than generate, [`tools/example-register-watch.js`](../tools/example-register-watch.js)
is the smallest tool that does something real. Read this document alongside it.

## Contents

- [Registering a tool](#registering-a-tool)
- [Lifecycle](#lifecycle)
- [The context object](#the-context-object)
- [The window shell](#the-window-shell)
- [Snapshots](#snapshots)
- [Runtime events and deltas](#runtime-events-and-deltas)
- [Central delta history and backstep](#central-delta-history-and-backstep)
- [Reading and writing memory and MMIO](#reading-and-writing-memory-and-mmio)
- [Driving execution](#driving-execution)
- [Translation](#translation)
- [Windows, mobile and accessibility](#windows-mobile-and-accessibility)
- [Failure isolation](#failure-isolation)
- [Versioning](#versioning)

## Registering a tool

```js
((root) => {
  const host = root.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  host.register({
    id: "my-tool",              // unique, kebab-case, matches tools.json
    label: "My Tool",           // menu label, translated through the catalog
    create(ctx) { /* ... */ }   // called once, the first time the tool opens
  });
})(typeof window !== "undefined" ? window : globalThis);
```

Then add the tool to `tools/tools.json` and to the fallback catalog in
`assets/js/app-modules/12-ui-tool-manager.js`. Both lists are checked by
`tests/tool-runtime-regression.test.mjs`; a tool present in one and missing from
the other fails the suite.

Guard on `MarsWebTools` and return early when it is absent. That is what lets
the same file be loaded in a test harness to exercise its pure logic, as the
Pipeline Lab does with `MarsPipelineLabCore`.

## Lifecycle

| Phase | What happens | What you should do |
| --- | --- | --- |
| Script load | The file runs. `host.register` records the definition. | Register. Do not touch the DOM outside a `<style>` element. |
| First open | The host calls `create(ctx)` exactly once. | Build the window, wire listeners, return the instance object. |
| Seed | Immediately after `create`, the host delivers the current snapshot. | Render from it. Assume nothing was delivered earlier. |
| Open | `instance.open()` is called, then again on every later open. | Show the window and re-render from the last snapshot you kept. |
| Running | `onSnapshot` and, if you implement them, the event hooks fire. | Update incrementally. |
| Close | `instance.close()` is called. The instance is **not** destroyed. | Hide the window. Keep your state. |
| Reopen | `instance.open()` again on the same instance. | Restore from the state you kept. |

`create` is never called twice for the same tool in one page load, so state that
must survive a close/open cycle belongs in the `create` closure.

### The instance object

```js
return {
  root,                            // HTMLElement: the window element
  open,                            // required
  close,                           // required
  isConnected: () => true,         // see below - this gates every update
  onSnapshot(snapshot, delivery) {},
  onRuntimeEvent(event) {},        // optional, high-frequency
  onRuntimeEventBatch(events) {},  // optional, replaces per-event delivery
  onRuntimeBatchEnd(delivery) {},  // optional, flush point
  onBackstep(event) {}             // optional
};
```

**`isConnected` gates everything.** The host computes

```js
isRuntimeActive = isConnected() === true && !windowRoot.classList.contains("window-hidden")
```

and skips every inactive tool when delivering snapshots and events. Tools that
follow the MARS "Connect to MIPS" convention return their connect flag. A tool
with no connect control must return `true`; returning `false` means it receives
the seed snapshot at creation and **nothing ever again**, which looks exactly
like a tool that silently stops updating.

## The context object

`create(ctx)` receives:

| Field | Purpose |
| --- | --- |
| `id`, `label` | The values from the registration |
| `engine` | The assembler and runtime engine |
| `messagesPane` | `postMars(text)` writes to the Mars Messages window |
| `windowManager` | Window registration, focus and pulse |
| `desktop` | The desktop element; carries `desktop-stacked` in narrow layouts |
| `escapeHtml` | Escapes untrusted text for interpolation into markup |
| `defaultMemoryMap` | The default segment layout |
| `createToolWindowShell` | Builds the tool window - see below |
| `createPlaceholderTool` | The stub used by unimplemented tools |
| `createToolDeltaHistory` | Per-tool history that follows the engine's backstep window |
| `createDisplayFitController` | Sizes a window to a fixed-size virtual display |
| `runtimeControls` | The execution control bridge |
| `openHelpDocument` | Opens a help page in the embedded viewer |
| `nextPlacement` | Cascading position for a new window |

## The window shell

```js
const shell = ctx.createToolWindowShell(id, title, width, height, htmlString);
```

Returns:

| Field | Purpose |
| --- | --- |
| `root` | The window `<section>`. Return it as `instance.root`. |
| `content` | The element your markup was placed into |
| `open()` / `close()` | Show and hide |
| `refreshTranslations()` | Re-translates the static markup |
| `onResize(listener)` | Subscribe to size changes; returns an unsubscribe function |

The markup string is translated once when the window is built. Text you write
later from JavaScript is not, so route it through the translation helper
yourself.

Put the tool's CSS in a single `<style>` element with an `id`, and guard on
`document.getElementById` so a reload does not add it twice. Use the theme
tokens (`var(--text)`, `var(--line)`, `var(--surface)`, `var(--accent-strong)`)
rather than literal colours; `tests/release-readiness.test.mjs` enforces this.

## Snapshots

A snapshot is the full state of the machine at a point in time. Fields a tool
usually needs:

| Field | Meaning |
| --- | --- |
| `assembled` | False until the user assembles successfully |
| `halted`, `steps`, `pc`, `pcHex` | Execution state |
| `textRows` | Assembled instructions: `address`, `addressHex`, `basic`, `source`, `line`, `code` |
| `labels` | `[{ label, address, addressHex }]` - needed to resolve branch targets, which stay symbolic in `basic` |
| `registers`, `memoryWords`, `dataRows` | Machine state |
| `runtimeRevision` | Bumped whenever the runtime resets; use it to invalidate caches |

`onSnapshot(snapshot, delivery)` also receives `{ batched, batchSize, batchIndex, isLast }`.
When `batched` is true, cheap tools can process every entry; expensive ones
should do their work only when `isLast` is true.

Snapshots may share memory buffers between deliveries. Never mutate one.

## Runtime events and deltas

Implementing `onRuntimeEvent` or `onRuntimeEventBatch` marks a tool as a
*runtime event consumer*. The runtime then streams per-instruction events to it
instead of rebuilding full snapshots, which is the difference between a tool
that keeps up during Run and one that does not.

An event carries the executed instruction, `stepAfter`, `memoryAccesses`,
register writes, and `historyStartStep`. `onRuntimeBatchEnd(delivery)` fires
once per batch: do a single render there rather than one per event.

## Central delta history and backstep

`ctx.createToolDeltaHistory()` gives a tool a history that follows the engine's
own backstep window, so a tool never claims to rewind further than the runtime
can. It exposes `clear`, `ensure`, `record`, `rewind`, `sync`, `pruneFuture`,
`pruneBefore`, `getCurrentStep` and `getEntryCount`.

Record an inverse delta for each step you consume, and rewind on `onBackstep`.
Do not keep an unbounded log: `pruneBefore` exists because the runtime discards
its own history past the configured budget, and a tool that outlives it will
show state the runtime cannot restore.

## Reading and writing memory and MMIO

Read through the engine rather than caching raw arrays:

```js
const word = ctx.engine.readWord(address);   // aligned 32-bit read
const byte = ctx.engine.readByte(address);   // 8-bit read
```

Writes go through the engine's memory API so that backstep, memory invariants
and MMIO device notification all stay correct. Never write into a snapshot's
`memoryWords`: it may be shared, and the change would be invisible to the
runtime and lost on the next sync.

MMIO devices live at and above `0xffff0000`. The bitmap and terminal protocol is
published as `window.WebMarsBitmapMmio` with its own `version` field; check that
version before assuming an offset layout.

## Driving execution

`ctx.runtimeControls` is the only supported way for a tool to control execution:

```js
ctx.runtimeControls.isAvailable();   // false before the runtime is ready
ctx.runtimeControls.isRunning();
ctx.runtimeControls.go();
ctx.runtimeControls.step();
ctx.runtimeControls.backstep();
ctx.runtimeControls.pause();
ctx.runtimeControls.stop();
ctx.runtimeControls.reset();
```

Do not click the toolbar buttons from a tool. The bridge is what keeps the
run loop, benchmarks and backstep budget consistent, and it is what
`tests/tool-runtime-regression.test.mjs` asserts against.

## Translation

```js
function t(message, params = {}) {
  const i18n = window.WebMarsI18n;
  if (i18n && typeof i18n.t === "function") return i18n.t(message, params);
  return String(message).replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ""));
}
```

Rules:

1. Every user-visible string needs an entry in `assets/js/i18n/en.js`. The check
   in `tests/release-readiness.test.mjs` fails on any string that reaches the
   interface without one.
2. Placeholders use `{name}` and must survive translation unchanged.
3. Subscribe to language changes and re-render:
   `window.WebMarsI18n.subscribe(() => { shell.refreshTranslations(); render(); })`.
4. Text inside SVG is not covered by the shell's static pass. Translate it
   yourself; `tools/pipeline-lab.js` keeps the English source in a data
   attribute and re-translates from it on every language change.
5. Prefer unambiguous English source strings. Single words such as "Profile" or
   "Disabled" translate badly out of context.

## Windows, mobile and accessibility

- The desktop element carries `desktop-stacked` in narrow layouts. Scope mobile
  rules to `.desktop-stacked .my-tool`.
- Wide content must scroll inside its own container. The window must not force
  the desktop to scroll horizontally.
- Do not encode meaning in colour alone. Pipeline stages, hazards and similar
  states need a text label or shape as well.
- Interactive rows need `tabIndex = 0` and an Enter/Space handler, not just a
  click handler.
- Respect `prefers-reduced-motion` for anything that animates.
- Use `aria-label` for cells whose meaning depends on position.

## Failure isolation

The host wraps every call into a tool. An exception in `onSnapshot`,
`onRuntimeEvent` or `onBackstep` is caught, reported once to Mars Messages and
logged to the console; delivery continues to the other tools and the runtime is
never interrupted. A failure in `create` falls back to a placeholder window.

This is a safety net, not a design. A tool that throws on every snapshot keeps
running with a stale window and no visible error after the first, which is hard
to diagnose - check the console when a tool stops updating.

## Versioning

`tools/tools.json` declares `"apiVersion": 1`. Within version 1:

- fields may be **added** to the context, the shell and snapshots;
- existing fields keep their name, type and meaning;
- optional instance hooks may be added, and a tool that does not implement them
  keeps working.

A change that removes or repurposes an existing field raises the API version.
Tools that declare no `apiVersion` are treated as version 1.

## Checklist for a new tool

- [ ] Registered with a unique id, present in both catalogs
- [ ] `isConnected` returns the right thing for whether the tool has a connect control
- [ ] Styles are injected once, use theme tokens, and scope mobile rules to `.desktop-stacked`
- [ ] Every visible string is in `en.js` and re-renders on language change
- [ ] Memory is read and written through the engine, never through a snapshot
- [ ] Execution is driven only through `ctx.runtimeControls`
- [ ] Batched deliveries render once, on `isLast` or `onRuntimeBatchEnd`
- [ ] Has a test file, following `tests/tool-runtime-regression.test.mjs`
