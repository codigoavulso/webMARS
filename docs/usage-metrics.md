# Duration heartbeat and optional usage metrics

## Automatic duration-only heartbeat

The official installation is configured to send one background POST to
`/_metrics/heartbeat` every 60 seconds while the app is visible, including when another tab or window has focus. Each page load receives a random, memory-only session token; the collector stores only its one-way hash.
The JSON body has exactly one field: `{"active_seconds":60}`. Subsequent
values are cumulative active seconds since this page load. No user/session
identifier, event name, language, source, code or account data is included.
There is no consent control or notification for this duration-only mode.

The counter is memory-only, resets on refresh, and continues while reading
without typing. Hidden time is excluded; visible background tabs count. Five-second sampling caps
long timer gaps so browser/OS suspension does not inflate the duration.
Browser scheduling may delay a ping. There is no retry queue or final unload
ping, so visits under a minute and the final partial minute may be unobserved.
The wire value is capped at one year of active seconds.

No cookies or referrer are attached; only the time is in the payload. Normal
network transport still exposes the source IP to the web server, so this
does not mean the HTTP request itself is free of network metadata. The supplied
Nginx route disables access/error logging and forwards no IP, cookie or browser
headers to the collector. Check any additional reverse proxy/CDN logging too.

The collector rejects additional payload fields and immediately increments a
daily UTC/minute-duration bucket. It stores no individual ping, exact arrival
time or identifier. These daily aggregates expire with the 35-day retention
cutoff (up to one additional partial calendar day). The report's
`duration_only_heartbeats` section uses UTC calendar days and stays separate
from the optional session-based report. **Do not sum cumulative durations or
interpret ping counts as visitors/sessions.** Long visits generate more samples;
neither unique users nor mean completed-session duration can be derived.

Deployment: install/restart the collector first to create the aggregate table,
install the updated Nginx snippet, validate and reload Nginx, then deploy the
frontend. `heartbeat.enabled` defaults to the official hostname only; other
installations must configure it explicitly. Production is unchanged until
deployment. Test with `npm run test:metrics`.

## Optional richer events

This complements the access-log reports in `raspberry-pi-analytics.md`. Logs
measure HTTP requests; this first-party collector measures selected product
actions. The official webMARS installation enables it by default. Visitors can
disable it at any time in **Settings → Interface Preferences → Usage
statistics**. Self-hosted installations remain disabled until their operator
sets `metrics.enabled` deliberately.

## Scope and interpretation

| Event | Meaning | Not evidence of |
| --- | --- | --- |
| `page_view` | Public page opened after consent, or consent accepted there | A unique visitor |
| `launch_app` | A marked public-page simulator link was clicked | The app actually loaded |
| `app_ready` | Application modules loaded successfully after consent | A program was executed |
| `example_open` | Built-in example opened successfully | A lesson was completed |
| `assemble_success` / `assemble_error` | Assembler returned success / failure | A correct solution |
| `run_success` | Go or Step reached a normal exit | Expected output or exercise completion |
| `run_error` | Execution reported an error | The error message or user code |
| `active_time` | Cumulative approximate active seconds for the tab session | Exact attention or learning time |

Pause, breakpoint, input waits, Stop and falling off the end of a program do
not count as `run_success`. Opening at least two distinct built-in lesson
numbers is reported as exploration, never as completion. Assessment and
teacher/class identities do not exist in this telemetry.

Activation is the fraction of consenting `app_ready` sessions also recording a
`run_success` in the window. Sessions with consent granted late, blocked
requests or partial windows can be incomplete. Reports deduplicate repeated
actions by session and use the maximum cumulative active time per session.

## Privacy boundary

- Disabled configuration, an in-app opt-out, Do Not Track and Global Privacy
  Control suppress collection. Opting out clears the tab ID and last-visit
  timestamp; no retrospective queue is uploaded.
- Only first-party same-origin POST requests are allowed, with no credentials,
  referrer, URL parameters, third-party dependencies or retry queue.
  Fetch uses CORS mode to retain the Origin header with `no-referrer`, as
  specified by the [Fetch standard](https://fetch.spec.whatwg.org/#append-a-request-origin-header).
  A strict same-origin URL check and rejected redirects prevent forwarding
  the payload to another host. The collector grants no cross-origin access.
- The schema accepts only an allowlist of event names, page categories, lesson
  numbers, language codes, source categories and touch/pointer categories.
- Never pass source code, console input/output, filenames, public publication
  slugs, account IDs or free text to the collector.
- A random tab-session ID is stored in sessionStorage and renewed after 30
  minutes without measured activity. It is not a persistent visitor ID. Tabs
  copied by a browser can share their initial sessionStorage, so sessions are
  approximate, not exact counts of tabs or people.
- The device-local last-visit timestamp yields a coarse return category. This
  measures self-reported returning sessions, not longitudinal cohort retention.
- Active time requires a visible page and interaction in the last 60
  seconds. It is sampled every five seconds and sent every 30 active seconds
  and on hide/exit when possible. Long timer gaps are capped; event loss is
  tolerated rather than interfering with the app.
- The supplied endpoint omits access logging and forwards only Origin and
  Content-Type. The collector logs no IP, cookies, raw browser headers or body.
  Ordinary site access/error logs remain a separate operator responsibility.
- Raw events expire after 35 days, with hourly pruning even without traffic.
  The database and its directory are private to the service. Do not add it to
  indefinite backups. Revocation stops new events; existing events age out.

The public explanation is available in English and Portuguese under
`discover/privacy/` and `discover/pt/privacy/`. Keep it aligned with the actual
deployment, especially if changing retention or the existing access-log policy.

## Raspberry Pi installation

Review the service origin and port for the installation, then copy the files
in `ops/raspberry-pi/` to the server and run:

```bash
bash install-metrics.sh
```

Include the installed snippet inside the HTTPS server that serves webMARS:

```nginx
include /etc/nginx/snippets/webmars-metrics.conf;
```

Check `sudo nginx -t`, reload Nginx, and verify the endpoint. Invalid data must
return 400; other origins must return 403; a valid same-origin JSON event must
return 204. The collector listens only on `127.0.0.1:8766`; never expose that
port publicly. The supplied Nginx configuration limits this route to twenty
requests per second per network address, with a burst allowance of one hundred
to accommodate classroom networks sharing one address.

Only then set `metrics.enabled: true` in the installation's public
`webmars-config.js`. Leave the endpoint on the same origin. For installations
under a subdirectory, adjust the endpoint location and `appBasePath` together.
Open the simulator and execute a small program; the Interface Preferences
checkbox must remain enabled for richer events to be sent.

```bash
sudo webmars-metrics --report --days 30
```

The JSON report contains aggregate session counts, activation numerator and
denominator, active time, observed time to first successful run, two-lesson
exploration, coarse return buckets, origin categories, input-device categories
and languages. It never prints session IDs. A missing database is an error, not
an empty report. `--days` accepts 1–35 days, matching retention.

## Local verification

```text
node --test tests/usage-metrics.test.mjs tests/public-pages.test.mjs
python -m unittest discover -s tests -p test_usage_metrics.py
```

Client unit tests use a controlled clock and storage. Collector tests use temporary
databases and an ephemeral loopback port; no test writes production events.

## Rollout

First verify endpoint delivery, then compare weekly cohorts of sessions using
consistent report windows. Keep access-log counts separate: product telemetry
is not a denominator for all visitors, because users may opt out or block it.
Do not infer educational improvement from runtime activation alone.
- Live presence counts sessions whose last heartbeat was within five minutes. It is an estimate, not a guaranteed count of people: suspended browsers, offline devices and blocked requests can cause under-counting.
- The heartbeat includes only cumulative seconds, an ephemeral random session token and a boolean registered classification. No account ID, email, IP address or browser fingerprint is stored by the collector.
