# Java -> Web Mapping

## Core Runtime Mapping

- `mars/Globals.java` -> `web/assets/js/config/defaults.js` + app bootstrap global context
- `mars/MIPSprogram.java` -> `web/assets/js/core/mars-engine.js` (program lifecycle controller)
- `mars/assembler/*` -> `web/assets/js/core/assembler/*` (planned)
- `mars/simulator/Simulator.java` -> `web/assets/js/core/simulator/*` (planned)
- `mars/mips/hardware/*` -> `web/assets/js/core/hardware/*` (planned)
- `mars/mips/instructions/*` -> `web/assets/js/core/instructions/*` (planned)
- `mars/mips/instructions/syscalls/*` -> `web/assets/js/core/syscalls/*` (planned)

## UI Mapping

- `mars/venus/VenusUI.java` -> `web/assets/js/ui/layout.js`
- `mars/venus/MainPane.java` -> main tab sections in `layout.js`
- `mars/venus/EditPane.java` -> `web/assets/js/ui/editor-pane.js`
- `mars/venus/ExecutePane.java` -> `web/assets/js/ui/execute-pane.js`
- `mars/venus/RegistersWindow.java` -> `web/assets/js/ui/registers-pane.js`
- `mars/venus/MessagesPane.java` -> `web/assets/js/ui/messages-pane.js`
- menu/toolbar action classes -> command handlers in `web/assets/js/app.js`

## Config and Data Assets

- `Settings.properties` + `mars/Settings.java` -> `defaults.js` settings object + persisted browser storage (planned)
- `Config.properties` -> compile/runtime limits and file extension config in `defaults.js`
- `PseudoOps.txt` -> pseudo-op rule set parser (planned)
- `Syscall.properties` -> syscall number mapping registry (planned)
- `images/*` -> shared visual assets in web UI (current and planned)
- `help/*` -> embedded help panel/pages (planned)

## State/Events Mapping

- Java `Observable/Observer` usage -> `createStore()` pub/sub + targeted render refresh
- Swing model listeners -> DOM event listeners + state subscriptions
- Runtime stop listeners -> simulator event callbacks in JS
