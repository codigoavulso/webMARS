# Automatic webMARS statistics

## Traffic classification and account adoption (local implementation)

Browser events now use schema **v2**. In addition to the bounded v1 fields,
they carry `context` (`public`, `internal`, `test`), `automation` (`none`,
`webdriver`), `interaction` (`trusted`, `not_seen`) and `visit` (a temporary
navigation token or `none`). The collector still accepts v1 events unchanged.
Existing rows migrate additively to `legacy`/unknown; they are never retrospectively
declared human, internal or automated.

Help > About > Privacy contains **Mark this browser as internal usage**. This
persists a one-bit operator marker locally and starts a new metrics session when
changed. It labels all subsequent use in that browser, including genuine operator
work, until cleared. A second coarse context cookie lets web logs see the same
marker. Local/preview deployments can force `metrics.context="test"`; this cannot
be relabelled public by the operator control. It does not disable collection.

The Nginx logging configuration supplies `webmars_visit`, a random first-party
cookie valid for 30 minutes, refreshed on document navigation. It is included as
`visit` in events and structured logs to cross-check a navigation against app
activity. It is not a permanent visitor ID, account ID or fingerprint. The event
POST still omits Cookie credentials; the bounded temporary token is in its body.
The request User-Agent is inspected in memory for a coarse bot flag; raw headers
are not stored by the collector. Normal access logs retain their existing policy.

Classification is conservative, in priority order: marked internal, configured
tests, probable automation (WebDriver/known bot UA), probable human (trusted input
reported by the browser), unclassified. Merely loading JavaScript is insufficient
evidence of humanity. Trusted-input reports can be forged; these are statistical
signals, not bot-proof authentication. Unmarked operator use cannot be inferred.

Public statistics accept `audience=all|public|human|unknown|internal|test|automated`.
`public` includes probable humans and unclassified sessions, excluding marked
internal/tests and probable automation. The UI defaults to this public filter,
offers each class explicitly and displays the population breakdown separately.
The API defaults to `all` for v1 API compatibility. `classification` includes
all-class counts; neither it nor the filtered aggregates exposes individual
tokens. CLI reports accept `--audience` with the same values.

Install the updated logging configuration before the frontend; confirm the HTML
response actually sets the navigation cookie. A location with its own
`add_header` directives must also include `add_header Set-Cookie
$webmars_visit_cookie always;` without removing its other security/cache headers.
The logging installer adds the server-level directive for the bundled layout.
Install/restart the v2 collector before deploying the v2 frontend. The collector
service uses `SupplementaryGroups=adm` to read access logs; it publishes only
the aggregate output of `webmars-audience`, never raw log rows.

`sudo webmars-audience --hours 24` cross-checks web visits, known bots, operator
markers and app events using the temporary navigation token. Legacy logs can be
grouped using address/UA only in memory; those values are never printed or
persisted by this report. App-only sessions are reported as unlinked, not silently
discarded or called bots. Browser and HTTP visits have different boundaries and
must not be added. Missing cache/network/cookie observations remain uncertain.

New event kinds: `interaction` (first trusted pointer/key input), `login_start`,
`login_success`, `login_error`, `account_created`, `account_linked`. Auth-event
details are limited to `password`, `google`, `facebook`. No email, provider
subject, user ID or account identifier is sent to this collector.

The dashboard's separate Cloud section calls BackMars `/api/statistics` for
server-confirmed counts and distinct active accounts in minute-rounded windows.
Only public/internal/test/all contexts can be selected there; account aggregates
cannot be restricted to the browser-only probable-human class. BackMars keeps
private minute-bucket account activity for 35 days to deduplicate accounts, and
returns counts only. These are account statistics, not anonymous visitor counts.
See the sibling BackMars `SOCIAL-LOGIN.md` for provider activation and linking.

The following older v1 protocol description documents compatibility behavior;
v2 fields and the temporary navigation/context cookies above extend it.

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
visit medians. `event_heartbeat_visits` describes current event samples;
`heartbeat_visits` retains the older separate-endpoint sessions.

## Reading reports

The public dashboard is available inside the simulator at **Help → Usage statistics**.
Its read-only `GET /_metrics/public?window=60m|24h|30d` endpoint publishes
only aggregates: 5-minute, hourly or daily trend buckets; event and resource
counts; coarse source, return, device, language and page categories; activation;
and separate interaction/presence durations. It exposes no session tokens,
account data, IP addresses or individual event rows. The window offers column
and line charts plus local filters for metric, breakdown, measure, text and
number of categories. A session may appear in multiple trend buckets, and
session counts are never unique-person counts. The endpoint uses a 30-second
server cache and the window refreshes once per minute while open. Historical
legacy duration-only pings have only day-level aggregates and are not merged
into the current event charts.

Interaction seconds and heartbeat seconds represent different clocks. Public
charts derive their increments independently; they must not be added. The
current event heartbeat has no authenticated-account classification, so the
dashboard does not infer registered users.

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
- `event_heartbeat_visits`: current page sessions with heartbeat events and
  their browser-reported cumulative visible-presence distribution.
- `heartbeat_visits`: older separate-endpoint page sessions with server-observed
  duration distribution and a boundary-crossing count.
- `live_presence`: recent session estimates; `duration_only_heartbeats` keeps
  the historical sample histogram for compatibility.

Compare complete days/weeks under the same collection policy. Historical
opt-in/opt-out data have lower coverage. Enabling automatic collection can
raise counts without proving audience growth. Access-log analytics provide
independent reach evidence; neither system counts exact unique people or
cross-device retention. Historical events never received cannot be recovered.

## Retention and hosting

### Collection and dashboard revision (21 October 2026)

Interaction time now requires a trusted pointer/key action: merely opening the
page no longer starts the interaction clock. Presence is still separate and
includes reading without typing. Partial presence is flushed when hiding or
leaving a page, and its cumulative counter survives same-tab reloads. Resource
adoption is deduplicated across those reloads; it measures visits using a
resource rather than every click. Internal/public markers propagate to other
open tabs through the browser storage event. No account identifier is added.

The overview separates app-session classification from web-visit classification,
including automation visible only in the HTTP logs. Its four primary measures
are sessions, sessions with interaction, returns on later days, and sessions
with a successful run. Returning sessions exclude same-day reloads and are not
unique returning people. Historical v1 interaction time remains estimated and
unclassified; these changes cannot retrospectively identify human visitors.

The API exposes the earliest retained observation and previous-period session
counts, with a completeness flag. The dashboard only shows comparisons when the
whole preceding period is covered, and omits chart buckets preceding the first
retained record. Completeness does not prove uninterrupted collection or an
unchanged policy. Compare periods under the same policy before claiming growth.
P90 uses nearest rank (`ceil(0.9*n)-1`), including small samples. Session language
uses the latest received value instead of the pre-translation page-load default.

Overview, Resources and Cloud views retain the numerical details, with CSV
export of aggregate totals, timeline, the filtered resource breakdown and Cloud
events. Cloud reads and writes are labelled authenticated sessions, not password
logins; historical default labels are normalized at query time without rewriting
the stored counters.

Standard-library Python/SQLite listens on loopback port 8766. Systemd isolates
its private state directory. Records expire after 35 days with hourly pruning.
No historical data need deleting: `consenting_tab_sessions` is renamed to
`measured_tab_sessions`; downstream scripts must adopt the new name.

The Nginx telemetry routes disable access/error logging, forward no IP or
Cookie headers and limit request rates. Origin, Content-Type, fixed proxy Host
and the event endpoint's User-Agent are forwarded. The User-Agent is reduced
to a bot flag in memory, never retained by the collector. HTTP still exposes a network
IP to the host. Ordinary site logs are a separate system.

## Installation/update and verification

1. Install/restart the collector and snippets with
   `ops/raspberry-pi/install-metrics.sh` before the frontend, so it accepts the
   new event types. Browser collection is independent of BackMars; social login
   and the server-confirmed Cloud section require the updated BackMars schema
   and API described in `SOCIAL-LOGIN.md`.
2. Include `/etc/nginx/snippets/webmars-metrics.conf` in the HTTPS server,
   validate Nginx and reload it. The snippet serves the aggregate public GET
   endpoint as well as the event POST endpoint.
3. Deploy the frontend with the configured same-origin endpoints.
4. Verify valid events return 204, unknown resources/details 400 and other
   origins 403. Use an isolated database for synthetic tests.
5. Record the deployment date for comparisons with older collection policies.

`--days` accepts 1–35; a missing database is an error, not an empty report.
`npm run test:metrics` covers automatic delivery with old settings, browser
signals, blocked storage, resource allowlists and temporary SQLite/HTTP
servers. No tests send production events. Regenerate public privacy content
using `npm run docs:public` after editing its source.
