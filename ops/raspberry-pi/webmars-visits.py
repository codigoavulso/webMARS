#!/usr/bin/env python3
"""Summarize webMARS entry-page requests by day or hour."""

from __future__ import annotations

import argparse
import gzip
import json
import re
from collections import defaultdict
from datetime import datetime, timedelta
from itertools import chain
from pathlib import Path
from urllib.parse import urlsplit


LOG_ROOT = Path("/var/log/nginx/webmars")
BOT_PATTERN = re.compile(
    r"bot|crawler|spider|slurp|bingpreview|facebookexternalhit|facebookcatalog|"
    r"twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|googleother|curl|"
    r"wget|python-requests|go-http-client|headless|uptimerobot|statuscake|monitoring",
    re.IGNORECASE,
)
LEGACY_PATTERN = re.compile(
    r'^(?P<ip>\S+) \S+ \S+ \[(?P<time>[^]]+)] '
    r'"(?P<method>\S+) (?P<target>\S+) [^"]+" '
    r'(?P<status>\d{3}) \S+ "[^"]*" "(?P<agent>[^"]*)"'
)


def open_text(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8", errors="replace")
    return path.open("rt", encoding="utf-8", errors="replace")


def iter_json_visits():
    for path in sorted(LOG_ROOT.glob("visits.json*")):
        with open_text(path) as handle:
            for line in handle:
                try:
                    row = json.loads(line)
                    stamp = datetime.fromisoformat(row["timestamp"])
                except (json.JSONDecodeError, KeyError, TypeError, ValueError):
                    continue
                yield {
                    "timestamp": stamp,
                    "ip": str(row.get("remote_addr", "")),
                    "agent": str(row.get("user_agent", "")),
                    "bot": bool(row.get("is_bot", 0)),
                    "navigation": bool(row.get("browser_navigation", 0)),
                    "status": int(row.get("status", 0)),
                }


def iter_legacy_visits():
    legacy_root = LOG_ROOT / "legacy"
    for path in sorted(legacy_root.glob("webmars_access.log*")):
        with open_text(path) as handle:
            for line in handle:
                match = LEGACY_PATTERN.match(line)
                if not match:
                    continue
                method = match.group("method")
                path_only = urlsplit(match.group("target")).path
                if method not in {"GET", "HEAD"} or path_only not in {"/", "/index.html"}:
                    continue
                try:
                    stamp = datetime.strptime(match.group("time"), "%d/%b/%Y:%H:%M:%S %z")
                except ValueError:
                    continue
                agent = match.group("agent")
                yield {
                    "timestamp": stamp,
                    "ip": match.group("ip"),
                    "agent": agent,
                    "bot": bool(BOT_PATTERN.search(agent)),
                    "navigation": False,
                    "status": int(match.group("status")),
                }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Count webMARS entry-page requests from current JSON and preserved legacy logs."
    )
    parser.add_argument("--days", type=int, default=30, help="days to include (default: 30)")
    parser.add_argument("--hourly", action="store_true", help="group by local hour instead of day")
    args = parser.parse_args()

    now = datetime.now().astimezone()
    cutoff = now - timedelta(days=max(1, args.days))
    buckets = defaultdict(
        lambda: {"all": 0, "human": 0, "bots": 0, "nav": 0, "clients": set()}
    )

    for row in chain(iter_legacy_visits(), iter_json_visits()):
        stamp = row["timestamp"]
        if stamp < cutoff or stamp > now + timedelta(minutes=5):
            continue
        key = stamp.strftime("%Y-%m-%d %H:00") if args.hourly else stamp.strftime("%Y-%m-%d")
        bucket = buckets[key]
        bucket["all"] += 1
        if row["navigation"]:
            bucket["nav"] += 1
        if row["bot"]:
            bucket["bots"] += 1
        else:
            bucket["human"] += 1
            bucket["clients"].add((row["ip"], row["agent"]))

    label = "hour" if args.hourly else "date"
    print(
        f"{label:<16} {'all':>8} {'browser-nav':>12} {'human-like':>12} "
        f"{'bots':>8} {'approx-clients':>15}"
    )
    for key in sorted(buckets):
        bucket = buckets[key]
        print(
            f"{key:<16} {bucket['all']:>8} {bucket['nav']:>12} "
            f"{bucket['human']:>12} {bucket['bots']:>8} {len(bucket['clients']):>15}"
        )


if __name__ == "__main__":
    main()
