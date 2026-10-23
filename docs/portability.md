# webMARS portability matrix

**webMARS 0.6.6.** Maintained by hand, per release. Unlike the generated
reports in [evidence.md](evidence.md), this one records what a person actually
ran, so it cannot be produced by a script.

For 0.6.5, the embedded project manager and Online menu were exercised in a
local Chromium-based browser preview, including the compact layout, location
switching, filters, account-dialog navigation, editable errors and password
visibility. Google callback validation and cancellation were covered by
simulated provider tests; a fresh production Google authorization was not
performed during this cycle. Earlier device checks below retain their original
status and are not claims of new hands-on verification.

## How to read it

- **verified** - the listed features were exercised by hand on that combination
  during this release cycle.
- **expected** - the platform is supported by the same engine as a verified one
  and nothing platform-specific is involved, but nobody ran it.
- **not tested** - nobody has run it. This is not a claim that it fails.

"Expected" is never upgraded to "verified" without someone running it. A matrix
that quietly promotes untested rows is worse than no matrix.

## Browsers

| Browser | Engine | Status | Notes |
| --- | --- | --- | --- |
| Chrome / Chromium (current) | Blink | **verified** | Assemble, run, step, backstep, tools, Pipeline Lab, theme switching, 200% text zoom, Arabic RTL, 375x812 stacked layout |
| Edge (current) | Blink | expected | Same engine as Chrome; no Edge-specific code path exists |
| Firefox (current) | Gecko | not tested | No Gecko-specific code, but `color-mix()` and sticky table headers are worth verifying |
| Safari (current) | WebKit | not tested | WebKit historically differs on `color-mix()`, sticky positioning and file input behaviour |

## Operating systems

| Platform | Status | Notes |
| --- | --- | --- |
| Windows 10/11 | **verified** | Development and release platform; full suite plus manual checks |
| Linux | expected | The application is static files; CI runs the Node suite on Ubuntu |
| macOS | not tested | Expected to behave as Linux under Chrome; Safari is the open question |
| Android | not tested | The stacked mobile layout exists and is exercised by tests, but not on a device |
| iOS | not tested | Same as Android, plus WebKit |

## Features by risk

Features whose portability is not simply "it is HTML".

| Feature | Portability risk | Status |
| --- | --- | --- |
| Assembler and runtime | None; plain JavaScript, no platform API | **verified** on Chrome/Windows, engine suite green under Node |
| Project and session storage | `localStorage` quota and eviction differ per browser, and Safari evicts aggressively | **verified** on Chrome/Windows only |
| File import and export | `File`, `Blob` and download behaviour vary; iOS Safari restricts downloads | **verified** on Chrome/Windows only |
| Theme tokens with `color-mix()` | Supported in all current engines; older Safari lacked it | **verified** on Chrome/Windows |
| Sticky table headers | Long-standing engine differences | **verified** on Chrome/Windows |
| Pipeline Lab SVG datapath | Inline SVG with CSS custom properties | **verified** on Chrome/Windows |
| Report export (JSON/CSV) | `Blob` plus an anchor download | **verified**, and works without BackMars - see below |
| Accounts, Cloud and public library | Cookies, CORS, SMTP and the operator's BackMars availability | optional; verified separately from the local runtime |
| Bitmap, TTY and MMIO device tools | Canvas and timing behaviour | **verified** on Chrome/Windows |
| Mobile stacked layout | Viewport units and virtual keyboards differ sharply between Android and iOS | **verified** in Chrome at 375x812; not tested on a device |
| Right-to-left layout | Mirrored layout must not mirror the pipeline diagram | **verified** in Arabic on Chrome/Windows |

## Core work and exported reports work without BackMars

Every export is produced entirely in the browser and needs no server:

- The Pipeline Lab builds its JSON and CSV in memory and hands them to a `Blob`
  and an anchor with a `download` attribute. There is no upload and no fetch.
- Reports contain no timestamps and no personal data, so the same program under
  the same configuration produces a byte-identical file. That is what makes them
  usable for assessment.
- The IDE/runtime is static and continues to work when BackMars is unreachable.
  On startup it may check the configured `/me` session, and account, Cloud,
  recovery and Public Library actions call the per-installation BackMars API.

This is enforced rather than asserted: `tests/pipeline-lab-microarchitecture.test.mjs`
builds the same reports outside a browser entirely, with no network available.

## Offline and PWA: evaluation, not a plan

The roadmap asks whether an offline or PWA mode is worth adding. Assessment for
this release:

**In favour.** The application shell and MIPS runtime are already a static bundle. A
service worker caching the shell would make it usable without a network, which
matters in a teaching lab with restricted connectivity.

**Against, and why it is not being done yet.**

1. **Update semantics get worse before they get better.** Today the cache-busting
   query string ties every asset to the release version, so a reload always gets
   a coherent set of files. A service worker introduces a second cache with its
   own lifetime, and the classic failure - a user stuck on an old build with no
   obvious way to refresh - is exactly the kind of bug a teaching tool cannot
   afford mid-class.
2. **A partially updated cache is a correctness risk, not just an annoyance.**
   The modules share globals and load in a fixed order. A cache that serves a
   new `00-core.js` with an old `20-app-runtime.js` produces failures that look
   like assembler bugs.
3. **The security surface grows.** A service worker is a persistent,
   origin-scoped interceptor of every request. That is a meaningful addition to
   an application that currently has no persistent code of its own.
4. **The benefit is smaller than it looks.** The application already runs from a
   local directory served over HTTP; a teacher who needs offline use can serve
   the packaged release from a laptop today, which `npm run package:release`
   produces as a self-contained archive.

**Conclusion.** Not adopted for 0.6.0. Revisit when there is a concrete request
from a deployment that cannot serve local files, and treat update coherence as
the design's first requirement rather than an afterthought.

## Closing the gaps

The untested rows need someone with the platform. In priority order:

1. **Firefox on any desktop** - the only current engine with no coverage at all.
2. **Safari on macOS** - the engine most likely to differ.
3. **Android Chrome on a real device** - the stacked layout and virtual keyboard
   behaviour, which no automated test can stand in for.
4. **iOS Safari** - both of the above at once, plus download restrictions.

Report results by opening an issue naming the browser version, the platform and
which of the features above you exercised.
