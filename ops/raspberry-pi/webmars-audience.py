#!/usr/bin/env python3
"""Read-only web/app cross-check. Never outputs IP, UA, visit or session tokens."""
import argparse
from collections import Counter, defaultdict
from contextlib import closing
from datetime import datetime, timezone
import gzip
import json
from pathlib import Path
import re
import sqlite3
import time

BOT = re.compile(r"bot|crawler|spider|headless|curl|wget|python|playwright|puppeteer|selenium|scanner|monitor", re.I)
SCANNER = re.compile(r"^/(?:\.env|\.git|wp-|wordpress|xmlrpc\.php|phpmyadmin|cgi-bin|actuator|server-status)", re.I)


def analyze(log_root, database, hours=24, now=None):
    now = int(now or time.time())
    start = now - hours * 3600
    groups = defaultdict(list)
    malformed = 0
    for path in Path(log_root).glob("access.json*"):
        if path.stat().st_mtime < start:
            continue
        opener = gzip.open if path.suffix == ".gz" else open
        with opener(path, "rt", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                try:
                    row = json.loads(line)
                    stamp = datetime.fromisoformat(row["timestamp"]).timestamp()
                    if not start <= stamp <= now:
                        continue
                    row["_stamp"] = stamp
                except (ValueError, TypeError, KeyError):
                    malformed += 1
                    continue
                visit = row.get("visit", "")
                if re.fullmatch(r"[a-f0-9]{32}", visit):
                    key = ("visit", visit)
                else:
                    # Legacy fallback groups by address/UA only in memory.
                    key = ("legacy", row.get("remote_addr", ""), row.get("user_agent", ""))
                groups[key].append(row)
    # A long-lived cookie is split after 30 minutes without HTTP activity.
    visits = []
    for key, rows in groups.items():
        batch = []
        for row in sorted(rows, key=lambda r: r["_stamp"]):
            if batch and row["_stamp"] - batch[-1]["_stamp"] > 1800:
                visits.append((key, batch))
                batch = []
            batch.append(row)
        if batch:
            visits.append((key, batch))
    with closing(sqlite3.connect(Path(database).resolve().as_uri()+"?mode=ro", uri=True)) as db:
        db.row_factory = sqlite3.Row
        columns = {r[1] for r in db.execute("PRAGMA table_info(events)")}
        events = db.execute("SELECT * FROM events WHERE received BETWEEN ? AND ?", (start, now)).fetchall()
    correlated = defaultdict(list)
    if "visit" in columns:
        for row in events:
            if row["visit"] != "none":
                correlated[row["visit"]].append(row)
    counts = Counter()
    app_counts = Counter()
    sources = defaultdict(Counter)
    linked_sessions = set()
    for key, rows in visits:
        documents = [r for r in rows if r.get("method") in {"GET", "HEAD"} and 200 <= int(r.get("status", 0)) < 400
                     and (r.get("browser_navigation") or str(r.get("content_type", "")).startswith("text/html"))]
        bot = any(r.get("is_bot") or BOT.search(str(r.get("user_agent", ""))) or SCANNER.search(str(r.get("uri", ""))) for r in rows)
        if not documents and not bot:
            continue  # asset-only requests are not visits
        matched = [e for e in correlated.get(key[1], []) if rows[0]["_stamp"]-60 <= e["received"] <= rows[-1]["_stamp"]+1800] if key[0] == "visit" else []
        contexts = {r.get("usage_context") for r in rows} | {e["context"] for e in matched}
        if "internal" in contexts:
            kind = "internal"
        elif "test" in contexts:
            kind = "test"
        elif bot or any(e["automation"] in {"webdriver", "detected_bot"} for e in matched):
            kind = "automated"
        elif any(e["interaction"] == "trusted" for e in matched):
            kind = "human"
        else:
            kind = "unknown"
        counts[kind] += 1
        if matched:
            app_counts[kind] += 1
            linked_sessions.update(e["session"] for e in matched)
        first = documents[0] if documents else rows[0]
        # Only broad categories; no raw referrer/domain is returned.
        from urllib.parse import urlsplit
        try:
            host = urlsplit(str(first.get("referer", ""))).hostname or ""
        except ValueError:
            host = ""
        category = "search" if re.search(r"(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com)$", host) else "direct_or_other"
        sources[kind][category] += 1
    return {"from": datetime.fromtimestamp(start, timezone.utc).isoformat(),
            "through": datetime.fromtimestamp(now, timezone.utc).isoformat(),
            "web_visits_by_class": dict(counts), "web_visits_linked_to_app_by_class": dict(app_counts),
            "linked_app_sessions": len(linked_sessions),
            "unlinked_app_sessions": len({e["session"] for e in events} - linked_sessions),
            "sources_by_class": dict(sources), "malformed_log_lines": malformed,
            "note": "Probable classes, not proof of humanity. Unknown includes legacy/cached/blocked traffic and unmarked operator use. Web visits and app sessions have different boundaries and must not be added."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--log-root", default="/var/log/nginx/webmars")
    parser.add_argument("--database", default="/var/lib/webmars-metrics/events.sqlite3")
    parser.add_argument("--hours", type=int, choices=range(1, 24*35+1), default=24)
    args = parser.parse_args()
    print(json.dumps(analyze(args.log_root, args.database, args.hours), indent=2))
