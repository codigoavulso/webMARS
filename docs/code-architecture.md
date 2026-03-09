# Web App Code Architecture

The browser runtime was modularized from the former monolithic `app.bundle.js`.

## Entry Point

- `web/assets/js/app.bundle.js`
  - Small loader that sequentially injects the runtime modules.
  - Keeps compatibility with both `file://` and HTTP usage (no ES module dependency).

## Runtime Modules

- `web/assets/js/app-modules/00-core.js`
  - Core constants, parsing helpers, store, and `MarsEngine`.

- `web/assets/js/app-modules/10-ui.js`
  - Layout rendering, window manager, editor pane, execute/register/message panes,
    style injection, help system, tools manager, and menu system.

- `web/assets/js/app-modules/20-app-runtime.js`
  - App bootstrap, command wiring, run loop scheduler, preferences, examples loading,
    and event binding.

## Notes

- Runtime tool implementations are in `web/tools/*.js` and registered through
  `window.MarsWebTools.register(...)`.
- Tool listing is driven by `web/tools/tools.json`.