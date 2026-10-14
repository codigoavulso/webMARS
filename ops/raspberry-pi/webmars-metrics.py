#!/usr/bin/env python3
"""First-party opt-in metrics. Standard library only; no IP/header/body logging."""
import argparse
from collections import Counter
from contextlib import closing
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import hashlib
from pathlib import Path
import re
import sqlite3
import time

EVENTS = {"page_view", "app_ready", "launch_app", "example_open", "assemble_success", "assemble_error", "run_success", "run_error", "active_time"}
SURFACES = {"overview", "learn", "teach", "stack", "pipeline", "minic", "privacy", "app"}
SOURCES = {"direct", "search", "social", "internal", "other"}
RETURNS = {"new", "same_day", "days_1_6", "days_7_30", "older"}
LANGUAGES = set("en pt es zh hi ar fr bn ru id de ja ko tr vi ur it pl fa th other".split())
FIELDS = {"v", "session", "event", "surface", "detail", "seconds", "returning", "source", "device", "language"}
RETENTION_SECONDS = 35 * 86400


def validate_event(data):
    if not isinstance(data, dict) or set(data) != FIELDS:
        return False
    if type(data["v"]) is not int or data["v"] != 1:
        return False
    if not all(isinstance(data[key], str) for key in FIELDS - {"v", "seconds"}):
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


def record(database, data, now=None):
    if not validate_event(data):
        raise ValueError("Invalid metrics event")
    with closing(sqlite3.connect(database)) as db, db:
        db.execute("INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
            int(now or time.time()), data["session"], data["event"], data["surface"], data["detail"],
            data["seconds"], data["returning"], data["source"], data["device"], data["language"]
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
        db.execute("""INSERT INTO heartbeats (day, active_minutes, pings) VALUES (?, ?, 1)
            ON CONFLICT(day, active_minutes) DO UPDATE SET pings = pings + 1""",
                   (day, data["active_seconds"] // 60))
        db.execute("""INSERT INTO heartbeat_sessions
            (session_hash, first_seen, last_seen, active_seconds, pings, registered)
            VALUES (?, ?, ?, ?, 1, ?)
            ON CONFLICT(session_hash) DO UPDATE SET
              last_seen = excluded.last_seen,
              active_seconds = MAX(heartbeat_sessions.active_seconds, excluded.active_seconds),
              pings = heartbeat_sessions.pings + 1,
              registered = MAX(heartbeat_sessions.registered, excluded.registered)""",
                   (session_hash, received, received, data["active_seconds"], int(data["registered"])))


def report(database, days=30, now=None):
    now = int(now or time.time())
    # Read-only connection: asking for a report must not create an empty database.
    uri = Path(database).resolve().as_uri() + "?mode=ro"
    with closing(sqlite3.connect(uri, uri=True)) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute("SELECT * FROM events WHERE received >= ? AND received <= ? ORDER BY received", (now - days * 86400, now)).fetchall()
        start_day = datetime.fromtimestamp(now - (days - 1) * 86400, timezone.utc).strftime("%Y-%m-%d")
        end_day = datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m-%d")
        heartbeat_rows = db.execute("SELECT day, active_minutes, pings FROM heartbeats WHERE day >= ? AND day <= ? ORDER BY day, active_minutes", (start_day, end_day)).fetchall()
        presence_rows = db.execute("SELECT first_seen, last_seen, active_seconds, pings, registered FROM heartbeat_sessions WHERE last_seen >= ? ORDER BY last_seen", (now - 300,)).fetchall()
    sessions = {}
    for row in rows:
        sid = row["session"]
        current = sessions.setdefault(sid, {"events": set(), "surfaces": set(), "lessons": set(), "seconds": 0, "returning": row["return_bucket"], "source": row["source"], "device": row["device"], "language": row["language"], "first": row["received"], "ready": None, "success": None})
        current["events"].add(row["event"])
        current["surfaces"].add(row["surface"])
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
    durations = sorted(item["seconds"] for item in sessions.values())
    first_runs = sorted(item["success"] - item["ready"] for item in ready if item["success"] is not None and item["success"] >= item["ready"])
    def median(values):
        if not values:
            return None
        middle = len(values) // 2
        return values[middle] if len(values) % 2 else (values[middle - 1] + values[middle]) / 2
    return {
        "window_days": days,
        "duration_only_heartbeats": {
            "utc_calendar_days": {"from": start_day, "through": end_day},
            "pings": sum(row["pings"] for row in heartbeat_rows),
            "daily_minute_buckets": [dict(row) for row in heartbeat_rows],
            "interpretation": "Historical cumulative active-duration samples. Live presence below counts ephemeral browser sessions, not people."
        },
        "live_presence": {
            "window_seconds": 300,
            "active_sessions_estimated": len(presence_rows),
            "registered_sessions_estimated": sum(row["registered"] for row in presence_rows),
            "anonymous_sessions_estimated": sum(not row["registered"] for row in presence_rows),
            "sessions": [{"first_seen": row["first_seen"], "last_seen": row["last_seen"], "active_seconds": row["active_seconds"], "pings": row["pings"], "registered": bool(row["registered"])} for row in presence_rows],
            "precision_note": "Best-effort session presence; browser suspension, network loss and blocked requests can make this an underestimate."
        },
        "generated_at": datetime.fromtimestamp(now, timezone.utc).isoformat(),
        "consenting_tab_sessions": len(sessions),
        "sessions_by_event": {event: count(event) for event in sorted(EVENTS)},
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
            "Consenting tab sessions only; not unique people or all visitors.",
            "Successful execution means a normal runtime exit, not a correct solution or completed exercise.",
            "Opening two lessons does not prove either lesson was completed.",
            "Return categories use a local last-visit timestamp, not longitudinal cohort retention.",
            "Approximate active time excludes hidden, unfocused and idle pages; delivery is best effort.",
            "Sessions crossing the report boundary may be partial; active time is a cumulative session estimate.",
            "Events are client-reported and can be blocked or forged; this is not an assessment system."
        ]
    }


def make_handler(database, origin):
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
                    record(database, data)
            except (ValueError, UnicodeError, TimeoutError):
                return self.reply(400)
            except sqlite3.Error:
                return self.reply(503)
            self.reply(204)

        def do_GET(self):
            self.reply(405)

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", default="/var/lib/webmars-metrics/events.sqlite3")
    parser.add_argument("--origin", default="https://webmars.nfiles.top")
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--report", action="store_true")
    parser.add_argument("--days", type=int, choices=range(1, 36), default=30)
    args = parser.parse_args()
    if args.report:
        print(json.dumps(report(args.database, args.days), indent=2, ensure_ascii=False))
        return
    initialize(args.database)
    prune(args.database)
    class Server(HTTPServer):
        last_prune = time.monotonic()

        def service_actions(self):
            if time.monotonic() - self.last_prune >= 3600:
                prune(args.database)
                self.last_prune = time.monotonic()
    Server(("127.0.0.1", args.port), make_handler(args.database, args.origin)).serve_forever()


if __name__ == "__main__":
    main()
