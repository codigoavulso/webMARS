#!/usr/bin/env python3
"""Privacy-conscious analytics from webMARS' structured Nginx access logs.

Raw addresses and user agents are used only in memory to group requests into
approximate browser sessions.  They are never printed or written elsewhere.
"""

from __future__ import annotations

import argparse
import gzip
import json
import math
import re
import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlsplit


DEFAULT_LOG_ROOT = Path("/var/log/nginx/webmars")
BOT_PATTERN = re.compile(
    r"bot|crawler|spider|slurp|bingpreview|facebookexternalhit|facebookcatalog|"
    r"twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|googleother|curl|"
    r"wget|python(?:-requests|/)|aiohttp|go-http-client|headless|uptimerobot|"
    r"statuscake|monitoring|agenticsearch|hnreader|readyou|link.?check|checker|"
    r"palo alto|cortex-xpanse|censys|leakix|l9scan|marginalia|netcraft|"
    r"internetmeasurement|scanner|scan/|vuln_|cms-|productSnap|research|"
    r"surveyagent|(?:^|\s)node(?:$|\s)|bun/|got \(",
    re.IGNORECASE,
)
SCANNER_PATH_PATTERN = re.compile(
    r"^/(?:\.env(?:[./]|$)|\.git(?:/|$)|wp(?:-|/)|wordpress(?:/|$)|"
    r"xmlrpc\.php$|phpmyadmin|cgi-bin|actuator|vendor/phpunit|server-status|"
    r"\.aws|etc/passwd|feed(?:/|$)|rss(?:\.|/|$)|atom\.xml$|index\.xml$|"
    r".*manifest\.json$|webpack-stats\.json$|\.well-known/(?:assetlinks\.json|"
    r"apple-app-site-association)$)",
    re.IGNORECASE,
)
@dataclass(frozen=True)
class Event:
    timestamp: datetime
    client: tuple[str, str]
    user_agent: str
    uri: str
    method: str
    status: int
    referer: str
    language: str
    response_bytes: int
    request_time: float
    navigation: bool
    content_type: str

    @property
    def is_document(self) -> bool:
        if self.method not in {"GET", "HEAD"} or not 200 <= self.status < 400:
            return False
        return self.navigation or self.content_type.startswith("text/html")


@dataclass
class Session:
    client: tuple[str, str]
    events: list[Event] = field(default_factory=list)

    @property
    def documents(self) -> list[Event]:
        return [event for event in self.events if event.is_document]

    @property
    def start(self) -> datetime:
        documents = self.documents
        return documents[0].timestamp if documents else self.events[0].timestamp

    @property
    def end(self) -> datetime:
        return self.events[-1].timestamp

    @property
    def duration_seconds(self) -> float:
        return max(0.0, (self.end - self.start).total_seconds())

    @property
    def entry(self) -> Event:
        documents = self.documents
        return documents[0] if documents else self.events[0]


def open_text(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8", errors="replace")
    return path.open("rt", encoding="utf-8", errors="replace")


def safe_int(value: object) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def safe_float(value: object) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def load_events(log_root: Path, cutoff: datetime, now: datetime) -> tuple[list[Event], int]:
    events: list[Event] = []
    malformed = 0
    for path in sorted(log_root.glob("access.json*")):
        with open_text(path) as handle:
            for line in handle:
                try:
                    row = json.loads(line)
                    stamp = datetime.fromisoformat(row["timestamp"])
                    if stamp.tzinfo is None:
                        stamp = stamp.astimezone()
                except (json.JSONDecodeError, KeyError, TypeError, ValueError):
                    malformed += 1
                    continue
                if stamp < cutoff or stamp > now + timedelta(minutes=5):
                    continue
                agent = str(row.get("user_agent", ""))
                if bool(row.get("is_bot", 0)) or BOT_PATTERN.search(agent):
                    continue
                address = str(row.get("remote_addr", ""))
                if not address or not agent:
                    continue
                events.append(
                    Event(
                        timestamp=stamp,
                        client=(address, agent),
                        user_agent=agent,
                        uri=str(row.get("uri", "")),
                        method=str(row.get("method", "")),
                        status=safe_int(row.get("status")),
                        referer=str(row.get("referer", "")),
                        language=str(row.get("accept_language", "")),
                        response_bytes=safe_int(row.get("response_bytes")),
                        request_time=safe_float(row.get("request_time")),
                        navigation=bool(row.get("browser_navigation", 0)),
                        content_type=str(row.get("content_type", "")).lower(),
                    )
                )
    return sorted(events, key=lambda event: event.timestamp), malformed


def sessionize(events: list[Event], idle_minutes: int) -> list[Session]:
    sessions: list[Session] = []
    current: dict[tuple[str, str], Session] = {}
    idle = timedelta(minutes=idle_minutes)
    for event in events:
        session = current.get(event.client)
        if session is None or event.timestamp - session.events[-1].timestamp > idle:
            session = Session(client=event.client)
            current[event.client] = session
            sessions.append(session)
        session.events.append(event)
    # Asset-only traffic is not a visit. It is usually a prefetch, hotlink or a
    # client whose entry request fell outside the selected reporting window.
    return [session for session in sessions if session.documents]


def looks_like_scanner(session: Session) -> bool:
    """Detect generic-browser scanners by the sensitive paths they probe."""
    return any(SCANNER_PATH_PATTERN.search(event.uri) for event in session.events)


def periodic_monitor_clients(sessions: list[Session]) -> set[tuple[str, str]]:
    """Find clients that poll only an HTML entry point without loading the app."""
    grouped: defaultdict[tuple[str, str], list[Event]] = defaultdict(list)
    for session in sessions:
        grouped[session.client].extend(session.events)
    monitors: set[tuple[str, str]] = set()
    for client, client_events in grouped.items():
        documents = [event for event in client_events if event.is_document]
        if (
            len(documents) >= 5
            and len(client_events) == len(documents)
            and all(event.uri in {"/", "/index.html"} for event in documents)
            and client_events[-1].timestamp - client_events[0].timestamp >= timedelta(hours=1)
        ):
            monitors.add(client)
    return monitors


def classify_device(agent: str) -> str:
    if re.search(r"ipad|tablet|kindle|silk/", agent, re.IGNORECASE):
        return "Tablet"
    if re.search(r"mobile|iphone|ipod|android", agent, re.IGNORECASE):
        return "Mobile"
    if re.search(r"windows|macintosh|x11|linux|cros", agent, re.IGNORECASE):
        return "Desktop"
    return "Other"


def classify_browser(agent: str) -> str:
    checks = (
        (r"EdgA?/|EdgiOS/", "Edge"),
        (r"OPR/|Opera", "Opera"),
        (r"SamsungBrowser/", "Samsung Internet"),
        (r"Firefox/|FxiOS/", "Firefox"),
        (r"Chrome/|CriOS/", "Chrome"),
        (r"Version/.+Safari/", "Safari"),
    )
    for pattern, label in checks:
        if re.search(pattern, agent, re.IGNORECASE):
            return label
    return "Other"


def classify_os(agent: str) -> str:
    checks = (
        (r"iphone|ipad|ipod", "iOS/iPadOS"),
        (r"android", "Android"),
        (r"windows nt", "Windows"),
        (r"cros", "ChromeOS"),
        (r"mac os x|macintosh", "macOS"),
        (r"linux|x11", "Linux"),
    )
    for pattern, label in checks:
        if re.search(pattern, agent, re.IGNORECASE):
            return label
    return "Other"


def locale(value: str) -> str:
    first = value.split(",", 1)[0].split(";", 1)[0].strip().replace("_", "-")
    return first.lower() or "Unknown"


def source(referer: str) -> str:
    if not referer or referer == "-":
        return "Direct / unknown"
    try:
        host = (urlsplit(referer).hostname or "").lower().removeprefix("www.")
    except ValueError:
        return "Direct / unknown"
    if not host or host == "webmars.nfiles.top":
        return "Direct / internal"
    groups = (
        (("news.ycombinator.com",), "Hacker News"),
        (("google.", "googleusercontent.com"), "Google"),
        (("bing.com",), "Bing"),
        (("github.com", "github.io"), "GitHub"),
        (("reddit.com", "redd.it"), "Reddit"),
        (("duckduckgo.com",), "DuckDuckGo"),
    )
    for needles, label in groups:
        if any(needle in host for needle in needles):
            return label
    return host[:80]


def content_group(uri: str) -> str:
    if uri in {"/", "/index.html"}:
        return "Home"
    if uri.startswith("/e/"):
        return "Example link"
    if uri.startswith("/p/"):
        return "Publication link"
    if uri.startswith("/manual"):
        return "Manual"
    if uri.startswith("/help"):
        return "Built-in help"
    return "Other document"


def percentile(values: list[float], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, math.ceil(len(ordered) * fraction) - 1))
    return ordered[index]


def duration(value: float) -> str:
    seconds = max(0, round(value))
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}h {minutes:02d}m"
    if minutes:
        return f"{minutes}m {seconds:02d}s"
    return f"{seconds}s"


def bytes_label(value: int) -> str:
    amount = float(value)
    for unit in ("B", "KiB", "MiB", "GiB"):
        if amount < 1024 or unit == "GiB":
            return f"{amount:.1f} {unit}"
        amount /= 1024
    return f"{amount:.1f} GiB"


def request_time_label(value: float) -> str:
    if value < 1:
        return f"{round(value * 1000)} ms"
    return f"{value:.2f} s"


def percentage(value: int, total: int) -> str:
    return f"{(100 * value / total if total else 0):.1f}%"


def print_counter(title: str, values: Counter[str], total: int, limit: int = 8) -> None:
    print(f"\n{title}")
    for label, count in values.most_common(limit):
        print(f"  {label:<28} {count:>6}  {percentage(count, total):>6}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=30, help="days to include (default: 30)")
    parser.add_argument(
        "--idle-minutes", type=int, default=30, help="new session after this idle period"
    )
    parser.add_argument("--log-root", type=Path, default=DEFAULT_LOG_ROOT)
    args = parser.parse_args()

    now = datetime.now().astimezone()
    cutoff = now - timedelta(days=max(1, args.days))
    events, malformed = load_events(args.log_root, cutoff, now)
    candidate_sessions = sessionize(events, max(1, args.idle_minutes))
    sessions_without_scanners = [
        session for session in candidate_sessions if not looks_like_scanner(session)
    ]
    monitor_clients = periodic_monitor_clients(sessions_without_scanners)
    sessions = [
        session for session in sessions_without_scanners if session.client not in monitor_clients
    ]
    automated_sessions = len(candidate_sessions) - len(sessions)
    if not sessions:
        raise SystemExit("No human browser sessions found in the selected period.")

    clients: defaultdict[tuple[str, str], set[str]] = defaultdict(set)
    devices: Counter[str] = Counter()
    browsers: Counter[str] = Counter()
    systems: Counter[str] = Counter()
    locales: Counter[str] = Counter()
    sources: Counter[str] = Counter()
    content: Counter[str] = Counter()
    durations: list[float] = []
    document_views = 0
    session_requests = 0
    transferred = 0

    for session in sessions:
        entry = session.entry
        clients[session.client].add(session.start.date().isoformat())
        devices[classify_device(entry.user_agent)] += 1
        browsers[classify_browser(entry.user_agent)] += 1
        systems[classify_os(entry.user_agent)] += 1
        locales[locale(entry.language)] += 1
        sources[source(entry.referer)] += 1
        for document in session.documents:
            content[content_group(document.uri)] += 1
        durations.append(session.duration_seconds)
        document_views += len(session.documents)
        session_requests += len(session.events)
        transferred += sum(event.response_bytes for event in session.events)

    returning = sum(1 for days in clients.values() if len(days) >= 2)
    observable = [value for value in durations if value >= 10]
    over_30 = sum(value >= 30 for value in durations)
    over_120 = sum(value >= 120 for value in durations)
    single_page = sum(len(session.documents) == 1 for session in sessions)
    analyzed_events = [event for session in sessions for event in session.events]
    errors_4xx = sum(400 <= event.status < 500 for event in analyzed_events)
    errors_5xx = sum(event.status >= 500 for event in analyzed_events)
    request_times = [event.request_time for event in analyzed_events if event.request_time >= 0]

    print(f"webMARS analytics — last {max(1, args.days)} days")
    print(f"Period: {cutoff.isoformat(timespec='minutes')} to {now.isoformat(timespec='minutes')}")
    print("\nAudience")
    print(f"  Human browser sessions       {len(sessions):>8}")
    print(f"  Approximate visitors         {len(clients):>8}")
    print(f"  Returning visitors           {returning:>8}  {percentage(returning, len(clients)):>6}")
    print(f"  Document views               {document_views:>8}")
    print(f"  Views per session            {document_views / len(sessions):>8.2f}")
    print(f"  Human HTTP requests          {session_requests:>8}")
    print(f"  Response data transferred    {bytes_label(transferred):>8}")

    print("\nEngagement — conservative lower bounds")
    print(f"  Sessions with observable time {len(observable):>7}  {percentage(len(observable), len(sessions)):>6}")
    print(f"  Median observable duration   {duration(statistics.median(observable) if observable else 0):>8}")
    print(f"  75th percentile duration     {duration(percentile(observable, 0.75)):>8}")
    print(f"  Sessions active after 30s    {over_30:>8}  {percentage(over_30, len(sessions)):>6}")
    print(f"  Sessions active after 2m     {over_120:>8}  {percentage(over_120, len(sessions)):>6}")
    print(f"  Single-document sessions     {single_page:>8}  {percentage(single_page, len(sessions)):>6}")
    print("  Note: browser-only work produces no server requests, so actual time may be longer.")

    print_counter("Acquisition source (sessions)", sources, len(sessions))
    print_counter("Devices (sessions)", devices, len(sessions))
    print_counter("Browsers (sessions)", browsers, len(sessions))
    print_counter("Operating systems (sessions)", systems, len(sessions))
    print_counter("Browser locales (sessions; location proxy only)", locales, len(sessions), 10)
    print_counter("Content opened (document views)", content, document_views)

    print("\nReliability")
    print(f"  Automated sessions excluded  {automated_sessions:>8}")
    print(f"  HTTP 4xx responses           {errors_4xx:>8}")
    print(f"  HTTP 5xx responses           {errors_5xx:>8}")
    print(f"  Median request time          {request_time_label(statistics.median(request_times)):>8}")
    print(f"  p95 request time             {request_time_label(percentile(request_times, 0.95)):>8}")
    print(f"  Malformed log lines skipped  {malformed:>8}")


if __name__ == "__main__":
    main()
