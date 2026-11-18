# Automatic webMARS statistics

## Traffic classification and account adoption

Browser events now use schema **v2**. In addition to the bounded v1 fields,
they carry `context` (`public`, `internal`, `test`), `automation` (`none`,
`webdriver`), `interaction` (`trusted`, `not_seen`) and `visit` (a temporary
navigation token or `none`). The collector still accepts v1 events unchanged.
Rows from the original schema start as `legacy`/unknown. Signing in can
reclassify earlier activity in the same metrics session as internal.

Help > Usage statistics > Traffic classification contains **Mark this browser as internal usage**. This
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
signals, not bot-proof authentication. Signing in with a designated internal
account takes precedence over browser signals.

Public statistics accept `audience=all|public|human|unknown|internal|test|automated`.
`public` includes probable humans and unclassified sessions, excluding marked
internal/tests and probable automation. The UI defaults to this public filter,
offers each class explicitly and displays the population breakdown separately.
The API defaults to `all` for v1 API compatibility. `classification` includes
all-class counts; neither it nor the filtered aggregates exposes individual
tokens. The public aggregate applies the same classification to the selected
period and its comparison period, using retained evidence available at the
time of the query. For example, trusted input can reclassify a session that
started near the end of the previous period. CLI reports accept `--audience`
with the same values.

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
The Cloud view uses the BackMars windows of 60 minutes, 24 hours and 30 days.
It offers a switch to 24 hours when the dashboard is showing 6 hours or 7 days.
Only public/internal/test/all contexts can be selected there; account aggregates
cannot be restricted to the browser-only probable-human class. BackMars keeps
private minute-bucket account activity for 35 days to deduplicate accounts, and
returns counts only. These are account statistics, not anonymous visitor counts.
See the sibling BackMars `SOCIAL-LOGIN.md` for provider activation and linking.

After sign-in or session restoration, BackMars links the current temporary
metrics token to the authenticated account using a private hashed association.
When the account is configured as internal, BackMars asks the local collector
to mark existing and future events with that token as internal. Signing out
rotates the token. Visits with other tokens and old counters that do not
identify an account cannot be attributed retrospectively.

The official installation sends first-party statistics automatically. There is
no acceptance dialog or statistics checkbox. The user-facing explanation is
in Help / About and the Manual’s privacy appendix.
Reports describe measured visits and must never label them as consent records.

## Delivery and grouping

Each current event, including the presence heartbeat, includes the deployed
build label in `YYYYMM.DD.HHmm` or legacy compact format. Older clients can omit
the label and appear under the unknown build in aggregate breakdowns.

The Builds tab and CSV export show distinct sessions and received events per
build for the selected period and audience. A session can span several builds.

App statistics use clock intervals in `Europe/Lisbon`, including the interval
in progress. The 60-minute, 6-hour and 24-hour views use buckets of one minute,
five minutes and one hour, respectively. The 7-day and 30-day views use
calendar days. A timeline bucket exposes its calendar boundary as `until` and
the extent covered by the response as `through`. The nominal `bucket_seconds`
stays at 86400 for days even when a day spans 23 or 25 hours across a
daylight-saving change.

The dashboard loads app aggregates with `part=app`. Web-log diagnostics use
`part=web`, which can return 202 while an aggregate is prepared in the background.
The collector reuses the web aggregate across audience filters and refreshes it
after five minutes. The activity chart does not wait for the logs or BackMars.

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
usable previous timestamp. A return displayed in the dashboard requires at
least 24 hours since the previous recorded visit started in that browser.
No permanent visitor ID or fingerprint is created.

POST requests omit credentials and referrer, reject redirects and use no URL
parameters. Ordinary events have no persistent queue or retry loop. A disabled
installation collector still supports purely static hosting. User preferences
do not disable a configured collector.

Automatic updates produce two separate observations. The old document requests
delivery of `build_update_attempted` immediately before navigation. The target
document sends `build_update_completed` when its runtime is ready. A temporary
tab marker links the observations and allows bounded delivery retries for the
confirmation. The collector stores each phase at most once per transition and
acknowledges it with HTTP 204. An offline or blocked request can leave either
observation missing. Completed events can arrive before attempts, and the
separately reported counts depend on delivery and the selected time window.
The updater works independently of the metrics endpoint.

## Events

The Manual included in the webMARS package uses the same configured collector.
It measures Manual tab sessions, document loads and chapter views grouped by
the Manual's eight parts. Changing section within a chapter does not count as
another chapter view, and direct visits and the in-app Manual use the same
rules. The events contain a fixed part code in place of a chapter title, URL
or search text. The independent Manual package does not load collection scripts.
The Statistics window's Manual tab and CSV use the selected period and audience.
Simulator session and activity totals exclude Manual events.

Schema version 1 has these required keys: `v`, `session`, `event`,
`surface`, `detail`, `seconds`, `returning`, `source`, `device`, `language`.
Version 2 adds the fields described under traffic classification. The `build`
field is optional in both versions for compatibility. Values are allowlisted
on both sides.

The two update events require schema v2 with `surface=app`, `detail=none` and
`seconds=0`. Their extra fields contain a random, per-transition `update_id`
(32 lowercase hexadecimal characters) and `from_build_id` and `to_build_id`
(each a 64-character lowercase hexadecimal artifact digest). These IDs remain
in private event storage under the same retention policy as other events. The
public API exposes only aggregate counts for the phases.

| Event | Meaning |
| --- | --- |
| `page_view` | Public page or simulator loaded |
| `launch_app` | Public-page simulator link clicked |
| `app_ready` | Application scripts loaded successfully |
| `app_startup` | First reported simulator loading attempt for the current document. Details: `under_1s`, `1_to_3s`, `3_to_8s`, `8s_or_more` or `failed` |
| `build_update_attempted` | Automatic reload requested by the source build |
| `build_update_completed` | Target build reached runtime readiness after an automatic reload |
| `example_open` | Example opened; only lesson01–lesson15 or `other` |
| `compile_success`, `compile_error` | Mini-C compilation outcome |
| `assemble_success`, `assemble_error` | Assembly outcome |
| `run_success`, `run_error` | Normal exit or execution error |
| `run_stopped`, `run_fallthrough`, `run_input_cancelled` | User stop, end of the program without an exit call, or cancellation of input |
| `run_fault_group` | Coarse category of an execution error: `address`, `syscall`, `instruction`, `arithmetic`, `trap`, `interrupt` or `other` |
| `window_time` | Visible seconds for an allowed simulator window or shipped tool |
| `operation_time` | Time spent in the compiler or assembler, grouped by operation and outcome |
| `operation_error` | Fixed compiler, assembler or runtime diagnostic category, once per category per operation |
| `tool_open` | Shipped tool opened, identified by manifest ID |
| `feature_use` | Step, Backstep, Run, manual compile and assemble commands, reset, pause, reaching a breakpoint, waiting for input, Project Manager, project save/import, Cloud save/load, help or Teacher Kit |
| `active_time` | Approximate cumulative interaction seconds |
| `heartbeat` | Cumulative visible presence sample, sent with the page-session token |

Tool/feature adoption sends once per resource per session. Reports
deduplicate by visit token; repeated stepping cannot dominate adoption ranks.
These adoption counts measure first use, not every click. Compilation,
assembly, execution and example events retain action and visit counts.
User tools outside the shipped allowlist are excluded. Keep client/server
resource allowlists aligned; tests compare them with the manifest.

No code, filenames, project contents, input/output, diagnostic text, memory
addresses, system call numbers, account IDs, emails, publication slugs, full
URLs or raw referrers are sent. Sources are
broad categories, languages are enumerated and device is touch/pointer.
Temporary tokens do link events within a visit; aggregate reporting does not
make the underlying records unlinkable.

Interaction time requires visibility, focus and interaction in the last minute.
It is sampled every five seconds, sent every 30 active seconds and on hide/exit
where possible. Suspension gaps are capped. Reading without input can be
missed. The run success event records a normal exit. Pauses and input waits
can precede a terminal result. A user stop, reaching the end without an exit
call and cancellation of input have their own result categories. The recovery
and success-rate reports continue to use successful exits and execution errors.

Startup time uses the browser's elapsed time since navigation, through the
first reported completion. The client submits the range only. A reported
startup failure submits `failed` without a duration, diagnostic, module path
or URL. A loading attempt that fails before the reporter can run may go
unobserved.

Window exposure is sampled roughly every five seconds in a visible page and
sent in bounded increments. Hit testing checks a grid of points within each
window's viewport area. A minimized, hidden or completely covered window does
not accrue time. Several partially visible windows may accrue time together.
The result describes exposure, with sampling error for brief transitions and
small visible areas. It cannot be added to session presence or interaction.
The report assigns an increment to its receipt interval and does not reconstruct
its precise start and end. The collector receives only the fixed category and
the number of seconds, with no window titles or on-screen contents.

Operation duration measures the synchronous compiler or assembler call in the
browser and rounds to milliseconds. Samples outside 0–120,000 ms are omitted.
The report shows sample counts, median, P90 and maximum separately for successful
and failed operations. Detailed errors use fixed identifiers from diagnostic
sites, such as syntax, duplicate label, memory read or division by zero. One
failed operation may contribute to several categories. The new measures use
only received samples from updated browsers.

## Presence heartbeat

The browser sends the `heartbeat` event through `/_metrics/events` every 60
seconds while visible, including without focus, and flushes partial presence
on hide or page exit when possible. It reports cumulative visible seconds with
the same temporary session token as other browser events. Live presence counts
sessions with a heartbeat received within five minutes.

The older `/_metrics/heartbeat` endpoint remains available for compatibility.
For that endpoint the collector stores the token's SHA-256 hash and estimates
duration from receipt intervals capped at 90 seconds. The first ping adds zero
seconds. Its `registered` field is a Boolean classification.

Historical minute buckets are repeated cumulative samples, including older
collection methods. Never sum them as total time or interpret ping medians as
visit medians. `event_heartbeat_visits` describes current event samples;
`heartbeat_visits` retains the older separate-endpoint sessions.

## Reading reports

The public dashboard is available inside the simulator at **Help → Usage statistics**.
Its read-only `GET /_metrics/public?window=60m|6h|24h|7d|30d` endpoint publishes
only aggregates. These include trend buckets, event and resource counts, action
outcomes, coarse source, return, device, language and page categories, and
separate interaction and presence durations. It exposes no session tokens,
account data, IP addresses or individual event rows. The endpoint uses a 30-second
server cache and the window refreshes once per minute while open. Historical
legacy duration-only pings have only day-level aggregates and are not merged
into the current event charts.

The overview's four indicator cards show the total for the selected period and
an inline trend when the collector supplies the series. Selecting a card shows
that measure in the main chart. The metric selector also exposes more detailed
measures. Move the pointer over the chart or focus it and use the arrow keys,
Home or End to inspect an interval. A session may appear in multiple trend
buckets. The card totals deduplicate sessions over the full period.

The overview ranks tools, features, examples, sources, languages and input
devices by measured sessions. The Resources tab supports other breakdowns,
event counts where available, text filtering and a configurable number of rows.

The overview counts sessions with a normal execution exit once per session.
For each of compilation, assembly and execution, the outcome table also
shows the observed success and error event counts, distinct sessions with a
result, and sessions with errors and no success for that action. The success
rate divides success events by the sum of success and error events for the
action. An empty denominator leaves the rate unavailable. These outcomes use
existing events and can be calculated from retained records.

The Analysis tab uses the selected time window and audience. For each stage
it counts distinct sessions with a recorded result. It groups them by first
recorded result successful, first result failed followed by a success, and
errors only. Ordering follows collector receipt time. Each stage has its own
population, and results are bounded by the selected window. For example, a
session that receives a success after the window closed can appear as errors
only in that window. Median and p90 recovery times are based on the receipt
time elapsed from the first error to the first subsequent success among
recovered sessions in that stage.

The segment comparison shows counts and rates for interaction and successful
execution. The denominator is every measured session in each segment. The
interface reports absolute differences in percentage points alongside the
session counts. Small groups are sensitive to single events. Segment
differences are descriptive and can reflect differences in audience or task.
Source and input device use the session's first event in the selected window.
Language uses its last event. A session observed on multiple builds
contributes to each applicable build, with interaction and execution
attributed to the builds on which those outcomes were observed.

The Diagnostics tab shows distinct sessions and received event counts for
automatic updates, execution endings, execution error categories and app startup. A session can
contribute to multiple rows. An error category describes the same occurrence as
the execution error, so these counts should be read separately. New categories
cover events from the updated app. Compare equivalent periods with the same
instrumentation coverage. The CSV includes the diagnostic groups supplied by
the collector, with each row's session and event counts.

The public charts calculate interaction and visible presence increments
independently. Each session's first increment for each clock is capped at the
time elapsed since the start of the window. A session counts as interacting
when the window contains a trusted interaction event or a positive interaction
increment with a trusted-input signal. An idle heartbeat can still contribute
evidence to the session's probable-human classification.

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
- `execution_outcomes`, `execution_faults`, `startup` and `build_updates`:
  session and event counts for execution endings, execution error categories,
  app startup and automatic update phases.
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
are measured sessions, sessions with interaction, returns after 24 hours and
sessions with a successful run. Historical v1 interaction time remains
estimated and unclassified.

The API exposes the earliest retained observation and compares the four overview
session counts with the immediately preceding interval of the same elapsed
duration. The dashboard shows comparisons when the preceding period has coverage
and the collector returns the corresponding counts. It omits chart buckets
preceding the first retained record and marks the interval in progress as
partial. The 7-day view supports week-scale comparisons within the 35-day
retention period. Comparison assumes both periods use the same collection policy
and that collection ran continuously.
P90 uses nearest rank (`ceil(0.9*n)-1`), including small samples. Session language
uses the latest received value instead of the pre-translation page-load default.

CSV export includes aggregate totals, action outcomes, timeline, the filtered
resource breakdown, builds and Cloud events for the displayed selection.
It also includes recovery counts and times, the listed segments for the
chosen dimension and minimum session count, and the selected pair's deltas.
Cloud reads and writes are labelled authenticated sessions, not password
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

For the Raspberry Pi collector sources maintained outside the public tree,
apply [the update metrics patch](patches/webmars-build-update-metrics.patch) and
[the Manual metrics patch](patches/webmars-manual-metrics.patch)
from the project root containing `ops/raspberry-pi`:

```sh
git apply --check --ignore-space-change docs/patches/webmars-build-update-metrics.patch
git apply --ignore-space-change docs/patches/webmars-build-update-metrics.patch
git apply --check --ignore-space-change docs/patches/webmars-manual-metrics.patch
git apply --ignore-space-change docs/patches/webmars-manual-metrics.patch
python -B -m unittest discover -s ops/raspberry-pi -p 'test_*metrics.py'
```

The collector migrates the existing SQLite database when the updated service
starts. Keep the collector and frontend changes together when publishing.

1. Install or restart the collector and proxy configuration for your installation
   before the frontend, so it accepts the
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
servers. No tests send production events.
