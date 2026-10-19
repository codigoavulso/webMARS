# Automatic webMARS statistics

The official installation sends first-party statistics automatically. There is
no acceptance dialog or statistics checkbox. The user-facing explanation is
in Help/About's privacy area and the public English/Portuguese privacy pages.
Reports describe measured visits and must never label them as consent records.

## Delivery and grouping

The official hostname enables same-origin collectors in `webmars-config.js`.
Custom operators configure their own endpoints. Interface preferences, old
statistics choices, Do Not Track and Global Privacy Control do not gate these
requests. Browser/network blocking can still prevent delivery.

A random 128-bit token groups tab events, in sessionStorage where available
and otherwise in memory. It rotates after 30 minutes without measured activity.
Blocked storage does not stop collection; it prevents continuity on reload.
Duplicated tabs can inherit sessionStorage. These are approximate visits, not
unique people or registered accounts. A local last-visit timestamp supplies a
coarse return category; without storage the historical `new` bucket means no
usable previous timestamp, not a proven new person. No permanent visitor ID
or fingerprint is created.

POST requests omit credentials and referrer, reject redirects and use no URL
parameters. Failures never interrupt the simulator. There is no persistent
queue or retry loop. A disabled installation collector still supports purely
static hosting. User preferences do not disable a configured collector.

## Events

JSON retains schema version 1 and exactly these keys: `v`, `session`, `event`,
`surface`, `detail`, `seconds`, `returning`, `source`, `device`, `language`.
Values are allowlisted on both sides.

| Event | Meaning |
| --- | --- |
| `page_view` | Public page or simulator loaded |
| `launch_app` | Public-page simulator link clicked |
| `app_ready` | Application scripts loaded successfully |
| `example_open` | Example opened; only lesson01–lesson15 or `other` |
| `compile_success`, `compile_error` | Mini-C compilation outcome |
| `assemble_success`, `assemble_error` | Assembly outcome |
| `run_success`, `run_error` | Normal exit or execution error |
| `tool_open` | Shipped tool opened, identified by manifest ID |
| `feature_use` | Step, Backstep, Run, project save/import, Cloud save/load, help or Teacher Kit |
| `active_time` | Approximate cumulative interaction seconds |
| `heartbeat` | Cumulative visible presence sample, sent with the page-session token |

Tool/feature adoption sends once per resource per page/visit. Reports
deduplicate by visit token; repeated stepping cannot dominate adoption ranks.
These adoption counts measure first use, not every click. Compilation,
assembly, execution and example events retain action and visit counts.
User tools outside the shipped allowlist are excluded. Keep client/server
resource allowlists aligned; tests compare them with the manifest.

No code, filenames, project contents, input/output, diagnostics, account IDs,
emails, publication slugs, full URLs or raw referrers are sent. Sources are
broad categories, languages are enumerated and device is touch/pointer.
Temporary tokens do link events within a visit; aggregate reporting does not
make the underlying records unlinkable.

Interaction time requires visibility, focus and interaction in the last minute.
It is sampled every five seconds, sent every 30 active seconds and on hide/exit
where possible. Suspension gaps are capped. Reading without input can be
missed. Pause, input waits, Stop and falling off the program do not count as
successful execution. A normal exit does not prove a correct solution or
completed lesson.

## Presence heartbeat

The `heartbeat` event is sent every 60 seconds while visible, including without
focus, through `/_metrics/events`. It carries the same page-session token as
the other events and its cumulative seconds. The legacy `/_metrics/heartbeat`
collector remains available for rollout compatibility but is no longer called
by the frontend. The random token is memory-only and resets on reload;
`registered` is the authenticated/not-authenticated classification, never an
account ID. The collector stores the token's SHA-256 hash.

The collector estimates time from receipt intervals, capped at 90 seconds.
The first ping adds zero seconds. This is observed presence, not exact
attention: hidden gaps can contribute up to the cap. Visits under a minute
and the final partial interval are absent. Live presence counts sessions seen
within five minutes, not simultaneous people. Event and heartbeat records can be
joined within a page visit through the temporary token, but their durations must
not be summed because they use different timing rules.

Historical minute buckets are repeated cumulative samples, including older
collection methods. Never sum them as total time or interpret ping medians as
visit medians. `heartbeat_visits` provides tracked page-session distributions.

## Reading reports

Run `sudo webmars-metrics --report --days 14`:

Add `--summary` for a readable daily/adoption/action report without handling
JSON: `sudo webmars-metrics --report --days 14 --summary`.

- `measured_tab_sessions`: distinct event-session tokens in the rolling window.
- `daily_usage`: sessions seen, action counts and positive observed active-time
  increments per UTC day. Summing sessions across days can count a visit twice;
  boundary days can be partial. Missing days have no events (plot as zero).
- `resource_usage`: ranked distinct visits per tool, feature or lesson and
  received event counts. Tool/feature events count adoption, not every click.
- `sessions_by_event` and `activation`: visits per action and ready visits
  with successful execution, including the denominator.
- `session_durations`: visit-level interaction duration buckets, median, p90
  and maximum. Zero includes short/unmeasured visits.
- `sources`, `activation_by_source`, `languages`, `input_devices`,
  `sessions_by_surface`: broad audience and entry-point breakdowns.
- `heartbeat_visits`: page sessions seen in the window, lifetime observed
  duration distribution and a boundary-crossing count.
- `live_presence`: recent session estimates; `duration_only_heartbeats` keeps
  the historical sample histogram for compatibility.

Compare complete days/weeks under the same collection policy. Historical
opt-in/opt-out data have lower coverage. Enabling automatic collection can
raise counts without proving audience growth. Access-log analytics provide
independent reach evidence; neither system counts exact unique people or
cross-device retention. Historical events never received cannot be recovered.

## Retention and hosting

Standard-library Python/SQLite listens on loopback port 8766. Systemd isolates
its private state directory. Records expire after 35 days with hourly pruning.
No historical data need deleting: `consenting_tab_sessions` is renamed to
`measured_tab_sessions`; downstream scripts must adopt the new name.

Both Nginx telemetry routes disable access/error logging, forward no IP,
cookies or raw browser headers and limit request rates. Only Origin,
Content-Type and fixed proxy Host are forwarded. HTTP still exposes a network
IP to the host. Ordinary site logs are a separate system.

## Installation/update and verification

1. Install/restart the collector and snippets with
   `ops/raspberry-pi/install-metrics.sh` before the frontend, so it accepts the
   new event types. No BackMars API/database change is needed.
2. Include `/etc/nginx/snippets/webmars-metrics.conf` in the HTTPS server,
   validate Nginx and reload it.
3. Deploy the frontend with the configured same-origin endpoints.
4. Verify valid events return 204, unknown resources/details 400 and other
   origins 403. Use an isolated database for synthetic tests.
5. Record the deployment date for comparisons with older collection policies.

`--days` accepts 1–35; a missing database is an error, not an empty report.
`npm run test:metrics` covers automatic delivery with old settings, browser
signals, blocked storage, resource allowlists and temporary SQLite/HTTP
servers. No tests send production events. Regenerate public privacy content
using `npm run docs:public` after editing its source.
