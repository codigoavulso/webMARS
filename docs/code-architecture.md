# Web App Code Architecture

The web runtime still has 3 large modules (`00-core.js`, `10-ui.js`, `20-app-runtime.js`), but
now follows an incremental "strangler" strategy to reduce monolithic risk without breaking
compatibility.

## Entry Point

- `web/assets/js/app.bundle.js`
  - Sequential script loader (non-ESM) for browser and `file://` compatibility.
  - Explicit load order to guarantee global symbols and legacy behavior.

## Current Module Layers

### Foundation Modules (new)

- `web/assets/js/app-modules/00-core-store.js`
  - Shared state-store factory (`createStore`) extracted from `00-core.js`.

- `web/assets/js/app-modules/09-ui-translation.js`
  - DOM i18n tree translator (`translateStaticTree`) extracted from `10-ui.js`.

- `web/assets/js/app-modules/19-runtime-settings.js`
  - Runtime preference helpers (memory limits, i18n language preference helpers)
    extracted from `20-app-runtime.js`.

- `web/assets/js/app-modules/11-ui-help-system-bridge.js`
  - Extracted Help window bridge and About/document window orchestration from `10-ui.js`.

- `web/assets/js/app-modules/12-ui-tool-manager.js`
  - Extracted tool loading/registration/window host logic from `10-ui.js`.

- `web/assets/js/app-modules/13-ui-menu-system.js`
  - Extracted top menu definitions + popup/submenu interactions from `10-ui.js`.

- `web/assets/js/app-modules/18-runtime-browser-storage.js`
  - Extracted browser-storage and online-source workflows from `20-app-runtime.js`.

### Legacy-Large Modules (to keep shrinking)

- `web/assets/js/app-modules/00-core.js`
  - Engine state, assembler/runtime semantics, syscall runtime, memory/register behavior.
  - Now consumes store helper from `00-core-store.js`.

- `web/assets/js/app-modules/10-ui.js`
  - Layout renderer, window manager, editor/execute panes, shared UI helpers.
  - Translation helper moved to `09-ui-translation.js`.
  - Help, tools, and menu moved to `11/12/13-*` modules.

- `web/assets/js/app-modules/20-app-runtime.js`
  - App bootstrap, command orchestration, run loop, persistence, examples.
  - Runtime settings helpers moved to `19-runtime-settings.js`.
  - Browser-storage/online-source logic moved to `18-runtime-browser-storage.js`.

## Current Concentration

- Heavy 3 modules (`00-core.js`, `10-ui.js`, `20-app-runtime.js`) now represent
  about **76.13%** of `app-modules` lines (down from the previous ~87.6% baseline).

## Refactor Boundaries (next extractions)

### `00-core.js`

- `core/settings/*`: defaults, memory presets, config parsing.
- `core/bytes/*`: byte-array conversion and storage codecs.
- `core/engine/*`: execution loop, instruction handlers, breakpoints/backstep.
- `core/syscalls/*`: syscall implementation matrix and browser adapters.

### `10-ui.js`

- `ui/layout/*`: shell render, desktop/mobile layout logic.
- `ui/window-manager/*`: drag/resize/maximize/focus and splitter orchestration.
- `ui/panes/*`: editor, execute, registers, messages.
- `ui/menu/*`: menu definitions, popup renderer, shortcuts.
- `ui/tools/*`: tool loading and host window integration.

### `20-app-runtime.js`

- `runtime/preferences/*`: settings application and dialogs.
- `runtime/session/*`: load/save/restore and migration.
- `runtime/run-loop/*`: go/step/pause scheduler and UI sync strategy.
- `runtime/file-system/*`: disk/browser storage workflows.
- `runtime/commands/*`: command handlers and action wiring.

## Contributor Rules

- Keep behavior stable first; extract pure/helper code before orchestration code.
- New code goes to focused modules; avoid adding new responsibilities to big files.
- Every extraction must preserve public globals used by downstream modules.
- Prefer adapters/facades over rewrite-in-place.

## Notes

- Runtime tool implementations are in `web/tools/*.js`, registered via
  `window.MarsWebTools.register(...)`.
- Tool discovery remains driven by `web/tools/tools.json`.
