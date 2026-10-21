#!/usr/bin/env python3
"""Automatic first-party statistics. Standard library only; no IP/header/body logging."""
import argparse
from collections import Counter, defaultdict
from contextlib import closing
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import hashlib
from pathlib import Path
import re
import sqlite3
import time
import threading
import runpy
from urllib.parse import parse_qs, urlsplit

EVENTS = {"page_view", "app_ready", "launch_app", "example_open", "assemble_success", "assemble_error", "compile_success", "compile_error", "run_success", "run_error", "active_time", "heartbeat", "tool_open", "feature_use"}
TOOLS = set("bht-simulator bitmap-display bitmap-terminal-tool cache-simulator digital-lab-sim float-representation instruction-counter instruction-statistics intro-to-tools keyboard-display-mmio mars-bot memory-reference-visualization mips-xray example-register-watch pipeline-lab scavenger-hunt screen-magnifier stack-visualizer system-clock tty-ansi-terminal".split())
FEATURES = {"step", "backstep", "run", "project_save", "project_import", "cloud_save", "cloud_load", "help", "teacher_kit"}
SURFACES = {"overview", "learn", "teach", "stack", "pipeline", "minic", "privacy", "app"}
SOURCES = {"direct", "search", "social", "internal", "other"}
RETURNS = {"new", "same_day", "days_1_6", "days_7_30", "older"}
LANGUAGES = set("en pt es zh hi ar fr bn ru id de ja ko tr vi ur it pl fa th other".split())
FIELDS = {"v", "session", "event", "surface", "detail", "seconds", "returning", "source", "device", "language"}
AUTH_EVENTS = {"login_start", "login_success", "login_error", "account_created", "account_linked"}
EVENTS |= AUTH_EVENTS | {"interaction"}
FIELDS_V2 = FIELDS | {"context", "automation", "interaction", "visit"}
AUDIENCES = {"all", "public", "human", "unknown", "internal", "test", "automated"}
BOT_PATTERN = re.compile(r"bot|crawler|spider|headless|curl|wget|python|playwright|puppeteer|selenium|uptimerobot|scanner", re.I)
RETENTION_SECONDS = 35 * 86400
HEARTBEAT_INTERVAL_CAP = 90
PUBLIC_WINDOWS = {"60m": (3600, 300), "24h": (86400, 3600), "30d": (30 * 86400, 86400)}


def validate_event(data):
    if not isinstance(data, dict) or set(data) not in (FIELDS, FIELDS_V2):
        return False
    if type(data["v"]) is not int or data["v"] not in {1, 2} or set(data) != (FIELDS if data["v"] == 1 else FIELDS_V2):
        return False
    if not all(isinstance(data[key], str) for key in set(data) - {"v", "seconds"}):
        return False
    if data["v"] == 2 and (data["context"] not in {"public", "internal", "test"}
            or data["automation"] not in {"none", "webdriver"}
            or data["interaction"] not in {"trusted", "not_seen"}
            or not re.fullmatch(r"[a-f0-9]{32}|none", data["visit"])):
        return False
    if not re.fullmatch(r"[a-f0-9]{32}", data["session"]):
        return False
    if data["event"] not in EVENTS or data["surface"] not in SURFACES:
        return False
    if type(data["seconds"]) is not int or not 0 <= data["seconds"] <= 86400:
        return False
    if data["source"] not in SOURCES or data["returning"] not in RETURNS:
        return False
    if data["language"] not in LANGUAGES or data["device"] not in {"touch", "pointer"}:
        return False
    if data["event"] == "example_open":
        return bool(re.fullmatch(r"lesson(?:0[1-9]|1[0-5])|other", data["detail"]))
    if data["event"] == "tool_open":
        return data["detail"] in TOOLS
    if data["event"] == "feature_use":
        return data["detail"] in FEATURES
    if data["event"] in AUTH_EVENTS:
        return data["detail"] in {"password", "google", "facebook"}
    return data["detail"] == "none"


def initialize(database):
    with closing(sqlite3.connect(database)) as db, db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("PRAGMA secure_delete=ON")
        db.execute("""CREATE TABLE IF NOT EXISTS events (
            received INTEGER NOT NULL, session TEXT NOT NULL, event TEXT NOT NULL,
            surface TEXT NOT NULL, detail TEXT NOT NULL, seconds INTEGER NOT NULL,
            return_bucket TEXT NOT NULL, source TEXT NOT NULL, device TEXT NOT NULL,
            language TEXT NOT NULL)""")
        db.execute("CREATE INDEX IF NOT EXISTS events_received ON events(received)")
        db.execute("CREATE INDEX IF NOT EXISTS events_session ON events(session)")
        columns = {r[1] for r in db.execute("PRAGMA table_info(events)")}
        for column, declaration in {"context": "TEXT NOT NULL DEFAULT 'legacy'",
                "automation": "TEXT NOT NULL DEFAULT 'unknown'", "interaction": "TEXT NOT NULL DEFAULT 'not_seen'",
                "visit": "TEXT NOT NULL DEFAULT 'none'"}.items():
            if column not in columns:
                db.execute(f"ALTER TABLE events ADD COLUMN {column} {declaration}")
        # Aggregate immediately: no per-ping timestamps or session identifiers.
        db.execute("""CREATE TABLE IF NOT EXISTS heartbeats (
            day TEXT NOT NULL, active_minutes INTEGER NOT NULL, pings INTEGER NOT NULL,
            PRIMARY KEY (day, active_minutes))""")
        db.execute("""CREATE TABLE IF NOT EXISTS heartbeat_sessions (
            session_hash TEXT PRIMARY KEY, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL,
            active_seconds INTEGER NOT NULL, pings INTEGER NOT NULL, registered INTEGER NOT NULL)""")
        db.execute("CREATE INDEX IF NOT EXISTS heartbeat_sessions_last_seen ON heartbeat_sessions(last_seen)")


def prune(database, now=None):
    with closing(sqlite3.connect(database)) as db, db:
        db.execute("PRAGMA secure_delete=ON")
        db.execute("DELETE FROM events WHERE received < ?", (int(now or time.time()) - RETENTION_SECONDS,))
        cutoff = datetime.fromtimestamp(int(now or time.time()) - RETENTION_SECONDS, timezone.utc).strftime("%Y-%m-%d")
        db.execute("DELETE FROM heartbeats WHERE day < ?", (cutoff,))
        db.execute("DELETE FROM heartbeat_sessions WHERE last_seen < ?", (int(now or time.time()) - RETENTION_SECONDS,))
        db.commit()
        db.execute("PRAGMA wal_checkpoint(TRUNCATE)")


def record(database, data, now=None, user_agent=""):
    if not validate_event(data):
        raise ValueError("Invalid metrics event")
    with closing(sqlite3.connect(database)) as db, db:
        db.execute("INSERT INTO events(received,session,event,surface,detail,seconds,return_bucket,source,device,language,context,automation,interaction,visit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
            int(now or time.time()), data["session"], data["event"], data["surface"], data["detail"],
            data["seconds"], data["returning"], data["source"], data["device"], data["language"],
            data.get("context", "legacy"), "detected_bot" if BOT_PATTERN.search(user_agent) else data.get("automation", "unknown"),
            data.get("interaction", "not_seen"), data.get("visit", "none")
        ))


def validate_heartbeat(data):
    return (isinstance(data, dict) and set(data) == {"active_seconds", "session", "registered"}
            and type(data["active_seconds"]) is int
            and 1 <= data["active_seconds"] <= 31536000
            and isinstance(data["session"], str) and re.fullmatch(r"[a-f0-9]{32}", data["session"])
            and type(data["registered"]) is bool)


def record_heartbeat(database, data, now=None):
    if not validate_heartbeat(data):
        raise ValueError("Invalid heartbeat")
    day = datetime.fromtimestamp(int(now or time.time()), timezone.utc).strftime("%Y-%m-%d")
    received = int(now or time.time())
    session_hash = hashlib.sha256(data["session"].encode("ascii")).hexdigest()
    with closing(sqlite3.connect(database)) as db, db:
        previous = db.execute("SELECT last_seen, active_seconds FROM heartbeat_sessions WHERE session_hash = ?", (session_hash,)).fetchone()
        # The browser-reported duration is untrusted. Count only elapsed time
        # between server receipt timestamps, capped to tolerate timer/network
        # jitter without allowing a delayed/replayed request to inflate usage.
        elapsed = 0 if previous is None else min(HEARTBEAT_INTERVAL_CAP, max(0, received - previous[0]))
        server_active_seconds = (previous[1] if previous else 0) + elapsed
        db.execute("""INSERT INTO heartbeat_sessions
            (session_hash, first_seen, last_seen, active_seconds, pings, registered)
            VALUES (?, ?, ?, ?, 1, ?)
            ON CONFLICT(session_hash) DO UPDATE SET
              last_seen = excluded.last_seen,
              active_seconds = excluded.active_seconds,
              pings = heartbeat_sessions.pings + 1,
              registered = MAX(heartbeat_sessions.registered, excluded.registered)""",
                   (session_hash, received, received, server_active_seconds, int(data["registered"])))
        db.execute("""INSERT INTO heartbeats (day, active_minutes, pings) VALUES (?, ?, 1)
            ON CONFLICT(day, active_minutes) DO UPDATE SET pings = pings + 1""",
                   (day, server_active_seconds // 60))


def classify_sessions(rows):
    signals = defaultdict(set)
    for row in rows:
        values = signals[row["session"]]
        if row["context"] in {"internal", "test"}: values.add(row["context"])
        if row["automation"] in {"webdriver", "detected_bot"}: values.add("automated")
        if row["interaction"] == "trusted": values.add("human")
    return {sid: next((kind for kind in ("internal", "test", "automated", "human") if kind in values), "unknown")
            for sid, values in signals.items()}


def select_audience(rows, audience):
    if audience not in AUDIENCES:
        raise ValueError("Invalid audience")
    classes = classify_sessions(rows)
    selected = rows if audience == "all" else [r for r in rows if
        (classes[r["session"]] in {"human", "unknown"} if audience == "public" else classes[r["session"]] == audience)]
    return selected, Counter(classes.values())


def public_statistics(database, window="60m", now=None, audience="all", log_root=None):
    """Publish fixed, aggregate windows without session tokens or individual records."""
    if window not in PUBLIC_WINDOWS:
        raise ValueError("Invalid statistics window")
    now = int(now or time.time())
    duration, step = PUBLIC_WINDOWS[window]
    start = now - duration
    uri = Path(database).resolve().as_uri() + "?mode=ro"
    with closing(sqlite3.connect(uri, uri=True)) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute("SELECT * FROM events WHERE received >= ? AND received <= ? ORDER BY received", (start, now)).fetchall()
        collected_from = db.execute("SELECT MIN(received) FROM events").fetchone()[0]
        previous_rows = db.execute("SELECT * FROM events WHERE received >= ? AND received < ? ORDER BY received", (start-duration, start)).fetchall()
        earlier = {row[0] for row in db.execute("SELECT DISTINCT session FROM events WHERE received < ?", (start,))}
        interaction_baseline = dict(db.execute(
            "SELECT session, MAX(seconds) FROM events WHERE received < ? AND event != 'heartbeat' GROUP BY session", (start,)))
        presence_baseline = dict(db.execute(
            "SELECT session, MAX(seconds) FROM events WHERE received < ? AND event = 'heartbeat' GROUP BY session", (start,)))

    all_rows = rows
    rows, population = select_audience(rows, audience)
    previous_rows, _ = select_audience(previous_rows, audience)
    classes = classify_sessions(rows)
    buckets = [{"from": start + index * step, "through": min(now, start + (index + 1) * step),
                "sessions": set(), "new_sessions": 0, "events": 0, "interaction_seconds": 0,
                "presence_seconds": 0, "event_counts": Counter()}
               for index in range(duration // step)]
    sessions = {}
    event_sessions = defaultdict(set)
    resources = defaultdict(lambda: {"events": 0, "sessions": set()})
    facets = {name: defaultdict(set) for name in ("source", "returning", "device", "language", "surface", "audience")}
    interaction_by_session = Counter()
    presence_by_session = Counter()
    recent_presence = set()
    for row in rows:
        sid = row["session"]
        index = min(len(buckets) - 1, (row["received"] - start) // step)
        bucket = buckets[index]
        bucket["sessions"].add(sid)
        bucket["events"] += 1
        bucket["event_counts"][row["event"]] += 1
        if sid not in sessions:
            sessions[sid] = {"events": set()}
            if sid not in earlier:
                bucket["new_sessions"] += 1
            for name, value in (("source", row["source"]), ("returning", row["return_bucket"]),
                                ("device", row["device"])):
                facets[name][value].add(sid)
        sessions[sid]["language"] = row["language"]
        sessions[sid]["events"].add(row["event"])
        facets["surface"][row["surface"]].add(sid)
        facets["audience"][classes[sid]].add(sid)
        event_sessions[row["event"]].add(sid)
        if row["event"] in {"tool_open", "feature_use", "example_open"} | AUTH_EVENTS:
            resource = resources[(row["event"], row["detail"])]
            resource["events"] += 1
            resource["sessions"].add(sid)
        if row["event"] == "heartbeat":
            previous = presence_baseline.get(sid, 0)
            increment = max(0, row["seconds"] - previous)
            # A first sample after the boundary may include earlier presence.
            if sid not in presence_baseline:
                increment = min(increment, row["received"] - start)
            presence_baseline[sid] = max(previous, row["seconds"])
            bucket["presence_seconds"] += increment
            presence_by_session[sid] += increment
            if row["received"] >= now - 300:
                recent_presence.add(sid)
        else:
            previous = interaction_baseline.get(sid, 0)
            increment = max(0, row["seconds"] - previous)
            interaction_baseline[sid] = max(previous, row["seconds"])
            bucket["interaction_seconds"] += increment
            interaction_by_session[sid] += increment

    def duration_distribution(values):
        values = sorted(values)
        if not values:
            return {"median_seconds": None, "p90_seconds": None, "max_seconds": None}
        mid = len(values) // 2
        median = values[mid] if len(values) % 2 else (values[mid - 1] + values[mid]) / 2
        return {"median_seconds": median, "p90_seconds": values[max(0, math.ceil(len(values) * .9) - 1)], "max_seconds": values[-1]}

    for sid, item in sessions.items():
        facets["language"][item["language"]].add(sid)
    event_counts = Counter(row["event"] for row in rows)
    ready = {sid for sid, item in sessions.items() if "app_ready" in item["events"]}
    activated = sum("run_success" in sessions[sid]["events"] for sid in ready)
    # Historical active_time started at page load. It is not evidence of input.
    engaged = {row["session"] for row in rows if row["interaction"] == "trusted"}
    successful = {sid for sid, item in sessions.items() if "run_success" in item["events"]}
    errors = {sid for sid, item in sessions.items() if item["events"] & {"run_error", "assemble_error", "compile_error"}}
    iso = lambda timestamp: datetime.fromtimestamp(timestamp, timezone.utc).isoformat()
    web_traffic = None
    if log_root:
        analyzer_path = Path(__file__).with_name("webmars-audience.py")
        if not analyzer_path.exists():
            analyzer_path = Path(__file__).with_name("webmars-audience")
        try:
            web_traffic = runpy.run_path(str(analyzer_path))["analyze"](log_root, database, duration // 3600, now)
        except (OSError, ValueError, sqlite3.Error):
            web_traffic = {"unavailable": True}
    return {
        "window": window, "from": iso(start), "through": iso(now), "bucket_seconds": step,
        "audience": audience, "classification": {"sessions_by_class": dict(population),
            "note": "Human/automation are probable signals, not identity proof. Unknown includes historical events. Internal/test are explicit markers; unmarked operator use cannot be inferred."},
        "web_traffic": web_traffic,
        "quality": {"collected_from": iso(collected_from) if collected_from is not None else None,
                    "classified_sessions": sum(value for key, value in population.items() if key != "unknown"),
                    "total_sessions": sum(population.values()),
                    "legacy_sessions": len({r["session"] for r in all_rows if r["context"] == "legacy"})},
        "comparison": {"complete": collected_from is not None and collected_from <= start-duration,
                       "from": iso(start-duration), "through": iso(start),
                       "sessions": len({r["session"] for r in previous_rows})},
        "totals": {
            "sessions": len(sessions), "new_sessions": len(sessions.keys() - earlier),
            "interacting_sessions": len(engaged), "successful_sessions": len(successful), "error_sessions": len(errors),
            "returning_sessions": len({r["session"] for r in rows if r["return_bucket"] in {"days_1_6", "days_7_30", "older"}}),
            "events": len(rows), "interaction_seconds": sum(interaction_by_session.values()),
            "presence_seconds": sum(presence_by_session.values()), "recent_presence_sessions": len(recent_presence),
            "ready_sessions": len(ready), "ready_with_successful_run": activated,
            "interaction_distribution": duration_distribution(interaction_by_session.values()),
            "presence_distribution": duration_distribution(presence_by_session.values())
        },
        "timeline": [{"from": iso(bucket["from"]), "through": iso(bucket["through"]),
                      "sessions": len(bucket["sessions"]), "new_sessions": bucket["new_sessions"],
                      "events": bucket["events"], "interaction_seconds": bucket["interaction_seconds"],
                      "presence_seconds": bucket["presence_seconds"], "event_counts": dict(bucket["event_counts"])}
                     for bucket in buckets],
        "breakdowns": {
            "events": [{"key": event, "events": count, "sessions": len(event_sessions[event])}
                       for event, count in sorted(event_counts.items(), key=lambda entry: (-entry[1], entry[0]))],
            "resources": [{"kind": kind, "key": detail, "events": value["events"],
                           "sessions": len(value["sessions"])}
                          for (kind, detail), value in sorted(resources.items(),
                              key=lambda entry: (-len(entry[1]["sessions"]), entry[0]))],
            **{name: [{"key": value, "sessions": len(sids)} for value, sids in sorted(groups.items(),
                key=lambda entry: (-len(entry[1]), entry[0]))] for name, groups in facets.items()}
        },
        "note": "Sessions are temporary page tokens, not people. Buckets can repeat a session. Interaction and visible presence are different measurements and must not be added."
    }


def report(database, days=30, now=None, audience="all"):
    now = int(now or time.time())
    # Read-only connection: asking for a report must not create an empty database.
    uri = Path(database).resolve().as_uri() + "?mode=ro"
    with closing(sqlite3.connect(uri, uri=True)) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute("SELECT * FROM events WHERE received >= ? AND received <= ? ORDER BY received", (now - days * 86400, now)).fetchall()
        start_day = datetime.fromtimestamp(now - (days - 1) * 86400, timezone.utc).strftime("%Y-%m-%d")
        end_day = datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m-%d")
        heartbeat_rows = db.execute("SELECT day, active_minutes, pings FROM heartbeats WHERE day >= ? AND day <= ? ORDER BY day, active_minutes", (start_day, end_day)).fetchall()
        presence_rows = db.execute("SELECT session_hash, first_seen, last_seen, active_seconds, pings, registered FROM heartbeat_sessions WHERE last_seen >= ? AND last_seen <= ? ORDER BY last_seen", (now - 300, now)).fetchall()
        # Include only history in the report window; never sum cumulative
        # heartbeat buckets as time or describe legacy samples as sessions.
        heartbeat_visits = db.execute("SELECT first_seen, last_seen, active_seconds, pings FROM heartbeat_sessions WHERE last_seen >= ? AND last_seen <= ?", (now - days * 86400, now)).fetchall()
        baseline = dict(db.execute("SELECT session, MAX(seconds) FROM events WHERE received < ? AND event != 'heartbeat' GROUP BY session", (now - days * 86400,)).fetchall())
    rows, population = select_audience(rows, audience)
    sessions = {}
    for row in rows:
        sid = row["session"]
        current = sessions.setdefault(sid, {"events": set(), "surfaces": set(), "lessons": set(), "seconds": 0, "returning": row["return_bucket"], "source": row["source"], "device": row["device"], "language": row["language"], "first": row["received"], "ready": None, "success": None})
        current["events"].add(row["event"])
        current["surfaces"].add(row["surface"])
        if row["event"] != "heartbeat":
            current["seconds"] = max(current["seconds"], row["seconds"])
        if row["event"] == "example_open" and row["detail"].startswith("lesson"):
            current["lessons"].add(row["detail"])
        if row["event"] == "app_ready" and current["ready"] is None:
            current["ready"] = row["received"]
        if row["event"] == "run_success" and current["success"] is None:
            current["success"] = row["received"]
    count = lambda event: sum(event in item["events"] for item in sessions.values())
    ready = [item for item in sessions.values() if "app_ready" in item["events"]]
    activated = sum("run_success" in item["events"] for item in ready)
    durations = sorted(max(0, item["seconds"] - baseline.get(sid, 0)) for sid, item in sessions.items())
    first_runs = sorted(item["success"] - item["ready"] for item in ready if item["success"] is not None and item["success"] >= item["ready"])
    daily = {}
    resources = {}
    last_seconds = baseline
    for row in rows:
        day = datetime.fromtimestamp(row["received"], timezone.utc).strftime("%Y-%m-%d")
        item = daily.setdefault(day, {"sessions": set(), "events": Counter(), "active_seconds_observed": 0})
        item["sessions"].add(row["session"])
        item["events"][row["event"]] += 1
        if row["event"] != "heartbeat":
            previous = last_seconds.get(row["session"], 0)
            item["active_seconds_observed"] += max(0, row["seconds"] - previous)
            last_seconds[row["session"]] = max(previous, row["seconds"])
        if row["event"] in {"tool_open", "feature_use", "example_open"}:
            resource = resources.setdefault((row["event"], row["detail"]), {"sessions": set(), "events": 0})
            resource["sessions"].add(row["session"])
            resource["events"] += 1
    def median(values):
        if not values:
            return None
        middle = len(values) // 2
        return values[middle] if len(values) % 2 else (values[middle - 1] + values[middle]) / 2
    def duration_summary(values):
        values = sorted(values)
        return {"sessions": len(values), "median_seconds": median(values),
                "p90_seconds": values[max(0, math.ceil(len(values) * .9) - 1)] if values else None,
                "max_seconds": max(values) if values else None,
                "buckets": {name: sum(lower <= value < upper for value in values)
                            for name, lower, upper in [("under_1m", 0, 60), ("1m_to_5m", 60, 300),
                                                       ("5m_to_15m", 300, 900), ("15m_to_1h", 900, 3600),
                                                       ("1h_plus", 3600, float("inf"))]}}
    event_heartbeat = {}
    for row in rows:
        if row["event"] != "heartbeat":
            continue
        visit = event_heartbeat.setdefault(row["session"], {"seconds": 0, "pings": 0})
        visit["seconds"] = max(visit["seconds"], row["seconds"])
        visit["pings"] += 1
    event_recent_hashes = {hashlib.sha256(row["session"].encode("ascii")).hexdigest()
                           for row in rows if row["event"] == "heartbeat" and row["received"] >= now - 300}
    legacy_recent_hashes = {row["session_hash"] for row in presence_rows}
    return {
        "window_days": days,
        "audience": audience,
        "traffic_classification": dict(population),
        "event_window_utc": {"from": datetime.fromtimestamp(now - days * 86400, timezone.utc).isoformat(),
                             "through": datetime.fromtimestamp(now, timezone.utc).isoformat()},
        "duration_only_heartbeats": {
            "utc_calendar_days": {"from": start_day, "through": end_day},
            "pings": sum(row["pings"] for row in heartbeat_rows),
            "daily_minute_buckets": [dict(row) for row in heartbeat_rows],
            "interpretation": "Historical cumulative-duration samples; collection methods changed over time. Pings are not users and cumulative bucket values must not be summed as time."
        },
        "heartbeat_visits": {
            **duration_summary([row["active_seconds"] for row in heartbeat_visits]),
            "pings": sum(row["pings"] for row in heartbeat_visits),
            "crossing_window_start": sum(row["first_seen"] < now - days * 86400 for row in heartbeat_visits),
            "note": "Memory-only page sessions seen in this window; duration is lifetime server-observed elapsed time capped at 90 seconds per interval. Reloads create new sessions; visits under one minute are absent. This is not exact attention or a count of people."
        },
        "event_heartbeat_visits": {
            **duration_summary([item["seconds"] for item in event_heartbeat.values()]),
            "pings": sum(item["pings"] for item in event_heartbeat.values()),
            "note": "Current heartbeat events; cumulative browser-reported visible seconds, separate from interaction time. Legacy endpoint sessions are reported in heartbeat_visits."
        },
        "live_presence": {
            "window_seconds": 300,
            "active_sessions_estimated": len(event_recent_hashes | legacy_recent_hashes),
            "event_sessions_estimated": len(event_recent_hashes),
            "legacy_sessions_estimated": len(legacy_recent_hashes),
            "registered_sessions_estimated": sum(row["registered"] for row in presence_rows),
            "anonymous_sessions_estimated": sum(not row["registered"] for row in presence_rows),
            "unclassified_sessions_estimated": len(event_recent_hashes - legacy_recent_hashes),
            "sessions": [{"first_seen": row["first_seen"], "last_seen": row["last_seen"], "active_seconds": row["active_seconds"], "pings": row["pings"], "registered": bool(row["registered"])} for row in presence_rows],
            "precision_note": "Best-effort session presence; browser suspension, network loss and blocked requests can make this an underestimate."
        },
        "generated_at": datetime.fromtimestamp(now, timezone.utc).isoformat(),
        "measured_tab_sessions": len(sessions),
        "daily_usage": [{"day_utc": day, "sessions_seen": len(item["sessions"]),
                         "events": dict(item["events"]), "active_seconds_observed": item["active_seconds_observed"]}
                        for day, item in sorted(daily.items())],
        "resource_usage": [{"kind": key[0], "resource": key[1], "sessions": len(item["sessions"]), "events": item["events"]}
                           for key, item in sorted(resources.items(), key=lambda pair: (-len(pair[1]["sessions"]), pair[0]))],
        "session_durations": duration_summary(durations),
        "sessions_by_event": {event: count(event) for event in sorted(EVENTS)},
        "event_counts": dict(Counter(row["event"] for row in rows)),
        "activation": {"ready_sessions": len(ready), "ready_sessions_with_successful_run": activated, "percent": round(100 * activated / len(ready), 1) if ready else None},
        "sessions_opening_two_distinct_lessons": sum(len(item["lessons"]) >= 2 for item in sessions.values()),
        "approx_active_seconds": {"total": sum(durations), "median": median(durations)},
        "seconds_from_ready_to_first_success": {"sample_sessions": len(first_runs), "median": median(first_runs)},
        "return_categories": dict(Counter(item["returning"] for item in sessions.values())),
        "sources": dict(Counter(item["source"] for item in sessions.values())),
        "activation_by_source": {
            source: {"ready_sessions": sum(item["source"] == source for item in ready),
                     "ready_sessions_with_successful_run": sum(item["source"] == source and "run_success" in item["events"] for item in ready)}
            for source in sorted(SOURCES)
        },
        "sessions_by_surface": {surface: sum(surface in item["surfaces"] for item in sessions.values()) for surface in sorted(SURFACES)},
        "input_devices": dict(Counter(item["device"] for item in sessions.values())),
        "languages": dict(Counter(item["language"] for item in sessions.values())),
        "limitations": [
            "Automatically measured browser sessions, not unique people. Blocked requests, disabled installation collectors and network loss cause undercounting.",
            "Historical opt-in/opt-out events and automatic events share this report; do not interpret them as consent records or compare collection regimes as audience growth.",
            "Daily sessions are distinct within each UTC day; summing days can count a visit twice. Daily active seconds are positive observed cumulative increments, not attention.",
            "Successful execution means a normal runtime exit, not a correct solution or completed exercise.",
            "Opening two lessons does not prove either lesson was completed.",
            "Return categories use a local last-visit timestamp, not longitudinal cohort retention.",
            "Approximate interaction time excludes hidden, unfocused and idle pages; heartbeat presence uses a separate clock and must not be added to it.",
            "Sessions crossing the report boundary may be partial; active time is a cumulative session estimate.",
            "Events are client-reported and can be blocked or forged; this is not an assessment system."
        ]
    }


def summary(data):
    """Human-readable aggregate report, without tokens or individual visits."""
    lines = [f"webMARS statistics — last {data['window_days']} days",
             f"UTC: {data['event_window_utc']['from']} to {data['event_window_utc']['through']}",
             f"Measured tab visits: {data['measured_tab_sessions']}",
             f"Recent heartbeat sessions (5 min): {data['live_presence']['active_sessions_estimated']}",
             f"Ready visits with successful execution: {data['activation']['ready_sessions_with_successful_run']} / {data['activation']['ready_sessions']}",
             "", "UTC day       Visits   Interaction seconds observed"]
    for day in data["daily_usage"]:
        lines.append(f"{day['day_utc']} {day['sessions_seen']:>8} {day['active_seconds_observed']:>30}")
    lines.extend(["", "Resource adoption (visits, not clicks)"])
    for resource in data["resource_usage"]:
        lines.append(f"{resource['kind']:<13} {resource['resource']:<32} {resource['sessions']:>6}")
    lines.extend(["", "Actions (received events / distinct visits)"])
    for event, visits in data["sessions_by_event"].items():
        if visits:
            lines.append(f"{event:<24} {data['event_counts'].get(event, 0):>7} / {visits}")
    for key, label in [("sources", "Acquisition"), ("languages", "Languages"), ("input_devices", "Input devices")]:
        lines.extend(["", label + ": " + ", ".join(f"{name}={count}" for name, count in sorted(data[key].items(), key=lambda pair: -pair[1]))])
    sections = [("session_durations", "Interaction time per visit")]
    if data["event_heartbeat_visits"]["sessions"]:
        sections.append(("event_heartbeat_visits", "Event heartbeat visible presence per page session"))
    if data["heartbeat_visits"]["sessions"]:
        sections.append(("heartbeat_visits", "Legacy ping observed presence per page session"))
    for key, label in sections:
        durations = data[key]
        lines.extend(["", f"{label}: median={durations['median_seconds']}s, p90={durations['p90_seconds']}s, max={durations['max_seconds']}s",
                      ", ".join(f"{name}={count}" for name, count in durations["buckets"].items())])
    lines.extend(["", "Visits are not unique people. Historical collection rules differ; higher collection coverage is not audience growth."])
    return "\n".join(lines)


def make_handler(database, origin, log_root=None):
    public_cache = {}
    public_cache_lock = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        # Do not log request URLs, IP addresses, payloads or headers.
        def log_message(self, *args):
            pass

        def reply(self, status):
            self.send_response(status)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_POST(self):
            try:
                size = int(self.headers.get("Content-Length", "0"))
                self.connection.settimeout(5)
                if not 0 < size <= 2048 or self.headers.get("Transfer-Encoding"):
                    # Nginx rejects these before proxying. Drain small direct
                    # loopback uploads so the rejection survives TCP close.
                    if 0 < size <= 65536 and not self.headers.get("Transfer-Encoding"):
                        self.rfile.read(size)
                    return self.reply(413)
                # Consume the bounded body before rejecting headers, so closing
                # an HTTP/1.0 connection cannot reset an unread upload on Windows.
                raw = self.rfile.read(size)
                if self.path not in {"/events", "/heartbeat"} or self.headers.get("Origin") != origin:
                    return self.reply(403)
                if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
                    return self.reply(415)
                data = json.loads(raw)
                if self.path == "/heartbeat":
                    if not validate_heartbeat(data):
                        return self.reply(400)
                    record_heartbeat(database, data)
                else:
                    if not validate_event(data):
                        return self.reply(400)
                    record(database, data, user_agent=self.headers.get("User-Agent", ""))
            except (ValueError, UnicodeError, TimeoutError):
                return self.reply(400)
            except sqlite3.Error:
                return self.reply(503)
            self.reply(204)

        def do_GET(self):
            parsed = urlsplit(self.path)
            if parsed.path != "/public":
                return self.reply(404)
            params = parse_qs(parsed.query, keep_blank_values=True)
            if not {"window"} <= set(params) <= {"window", "audience"} or len(params["window"]) != 1 or params["window"][0] not in PUBLIC_WINDOWS or ("audience" in params and (len(params["audience"]) != 1 or params["audience"][0] not in AUDIENCES)):
                return self.reply(400)
            window = params["window"][0]
            audience = params.get("audience", ["all"])[0]
            cache_key = (window, audience)
            try:
                with public_cache_lock:
                    cached = public_cache.get(cache_key)
                    if cached and time.monotonic() - cached[0] < 30:
                        body = cached[1]
                    else:
                        body = json.dumps(public_statistics(database, window, audience=audience, log_root=log_root), separators=(",", ":")).encode("utf-8")
                        public_cache[cache_key] = (time.monotonic(), body)
            except sqlite3.Error:
                return self.reply(503)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", default="/var/lib/webmars-metrics/events.sqlite3")
    parser.add_argument("--origin", default="https://webmars.nfiles.top")
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--report", action="store_true")
    parser.add_argument("--summary", action="store_true", help="Print an aggregate readable report (with --report)")
    parser.add_argument("--days", type=int, choices=range(1, 36), default=30)
    parser.add_argument("--audience", choices=sorted(AUDIENCES), default="all")
    parser.add_argument("--access-log-root", default=None)
    args = parser.parse_args()
    if args.summary and not args.report:
        parser.error("--summary requires --report")
    if args.report:
        data = report(args.database, args.days, audience=args.audience)
        print(summary(data) if args.summary else json.dumps(data, indent=2, ensure_ascii=False))
        return
    initialize(args.database)
    prune(args.database)
    class Server(ThreadingHTTPServer):
        last_prune = time.monotonic()
        daemon_threads = True

        def service_actions(self):
            if time.monotonic() - self.last_prune >= 3600:
                prune(args.database)
                self.last_prune = time.monotonic()
    Server(("127.0.0.1", args.port), make_handler(args.database, args.origin, args.access_log_root)).serve_forever()


if __name__ == "__main__":
    main()
