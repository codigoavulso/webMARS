import contextlib
import http.client
import importlib.util
import io
import json
from pathlib import Path
import sqlite3
import tempfile
import threading
import unittest
from http.server import HTTPServer

spec = importlib.util.spec_from_file_location("metrics", Path(__file__).resolve().parents[1] / "ops/raspberry-pi/webmars-metrics.py")
metrics = importlib.util.module_from_spec(spec)
spec.loader.exec_module(metrics)


def event(**changes):
    data = dict(v=1, session="a" * 32, event="app_ready", surface="app", detail="none", seconds=0,
                returning="new", source="direct", device="pointer", language="pt")
    data.update(changes)
    return data


class MetricsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.database = str(Path(self.temporary.name) / "events.sqlite3")
        metrics.initialize(self.database)

    def tearDown(self):
        self.temporary.cleanup()

    def test_rejects_unbounded_or_private_data(self):
        for changes in [dict(code="private"), dict(event="raw_code"), dict(detail="secret-file.asm"),
                        dict(session="account@example.com"), dict(source="https://example.com/private"),
                        dict(seconds=-1), dict(seconds=True), dict(seconds=90000), dict(language=[]),
                        dict(surface="/p/private-project"), dict(v=True)]:
            self.assertFalse(metrics.validate_event(event(**changes)), changes)
        self.assertTrue(metrics.validate_event(event(event="example_open", detail="lesson15")))
        self.assertFalse(metrics.validate_event(event(event="example_open", detail="lesson99")))

    def test_report_deduplicates_sessions_time_and_lessons(self):
        now = 1788600000
        rows = [event(), event(event="run_success", seconds=30), event(event="run_success", seconds=35),
                event(event="active_time", seconds=60), event(event="active_time", seconds=60),
                event(event="example_open", detail="lesson01"), event(event="example_open", detail="lesson01"),
                event(event="example_open", detail="lesson02"),
                event(session="b" * 32, event="app_ready", returning="days_7_30")]
        for i, row in enumerate(rows):
            metrics.record(self.database, row, now=now + i)
        result = metrics.report(self.database, now=now + 100)
        self.assertEqual(result["measured_tab_sessions"], 2)
        self.assertEqual(result["sessions_by_event"]["run_success"], 1)
        self.assertEqual(result["activation"]["percent"], 50)
        self.assertEqual(result["approx_active_seconds"]["total"], 60)
        self.assertEqual(result["sessions_opening_two_distinct_lessons"], 1)
        self.assertNotIn("a" * 32, json.dumps(result))

    def test_public_statistics_separate_interaction_from_presence_and_hide_sessions(self):
        now = 1788600000
        start = now - 3600
        metrics.record(self.database, event(event="active_time", seconds=20), now=start - 10)
        metrics.record(self.database, event(event="heartbeat", seconds=60), now=start - 5)
        metrics.record(self.database, event(event="heartbeat", seconds=120), now=start + 10)
        metrics.record(self.database, event(event="active_time", seconds=30), now=start + 20)
        metrics.record(self.database, event(event="tool_open", detail="tty-ansi-terminal", seconds=35), now=start + 25)
        metrics.record(self.database, event(session="b" * 32, event="page_view"), now=start + 40)
        metrics.record(self.database, event(session="b" * 32, event="app_ready"), now=start + 41)
        metrics.record(self.database, event(session="b" * 32, event="heartbeat", seconds=60), now=start + 120)
        metrics.record(self.database, event(session="b" * 32, event="run_success", seconds=90), now=start + 130)
        result = metrics.public_statistics(self.database, "60m", now=now)
        self.assertEqual(result["totals"]["sessions"], 2)
        self.assertEqual(result["totals"]["new_sessions"], 1)
        self.assertEqual(result["totals"]["interaction_seconds"], 105)
        self.assertEqual(result["totals"]["presence_seconds"], 120)
        self.assertEqual(result["totals"]["ready_with_successful_run"], 1)
        self.assertEqual(len(result["timeline"]), 12)
        self.assertEqual(sum(row["interaction_seconds"] for row in result["timeline"]), 105)
        self.assertEqual(result["breakdowns"]["resources"][0]["key"], "tty-ansi-terminal")
        self.assertNotIn("a" * 32, json.dumps(result))
        self.assertNotIn("b" * 32, json.dumps(result))
        self.assertEqual(len(metrics.public_statistics(self.database, "24h", now=now)["timeline"]), 24)
        self.assertEqual(len(metrics.public_statistics(self.database, "30d", now=now)["timeline"]), 30)
        with self.assertRaises(ValueError):
            metrics.public_statistics(self.database, "all", now=now)

    def test_cli_report_keeps_event_heartbeat_out_of_interaction_time(self):
        now = 1788600000
        metrics.record(self.database, event(event="app_ready", seconds=0), now=now - 90)
        metrics.record(self.database, event(event="active_time", seconds=25), now=now - 80)
        metrics.record(self.database, event(event="heartbeat", seconds=60), now=now - 60)
        metrics.record(self.database, event(event="heartbeat", seconds=120), now=now - 10)
        result = metrics.report(self.database, days=1, now=now)
        self.assertEqual(result["approx_active_seconds"]["total"], 25)
        self.assertEqual(sum(day["active_seconds_observed"] for day in result["daily_usage"]), 25)
        self.assertEqual(result["event_heartbeat_visits"]["sessions"], 1)
        self.assertEqual(result["event_heartbeat_visits"]["pings"], 2)
        self.assertEqual(result["live_presence"]["active_sessions_estimated"], 1)
        self.assertEqual(result["live_presence"]["unclassified_sessions_estimated"], 1)

    def test_public_http_endpoint_returns_only_fixed_aggregate_windows(self):
        now = 1788600000
        metrics.record(self.database, event(), now=now)
        server = HTTPServer(("127.0.0.1", 0), metrics.make_handler(self.database, "https://webmars.test"))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            for path, expected in [("/public?window=60m", 200), ("/public?window=24h", 200),
                                   ("/public?window=30d", 200), ("/public?window=all", 400),
                                   ("/public?window=60m&session=private", 400), ("/private", 404)]:
                connection = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
                connection.request("GET", path)
                response = connection.getresponse()
                body = response.read()
                self.assertEqual(response.status, expected, path)
                if expected == 200:
                    self.assertEqual(response.getheader("Content-Type"), "application/json; charset=utf-8")
                    self.assertNotIn(b"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", body)
                connection.close()
        finally:
            server.shutdown()
            thread.join(timeout=2)
            server.server_close()

    def test_empty_and_expired_data(self):
        now = 1788600000
        metrics.record(self.database, event(), now=now - 36 * 86400)
        metrics.record(self.database, event(session="b" * 32), now=now - 2)
        metrics.prune(self.database, now=now)
        with contextlib.closing(sqlite3.connect(self.database)) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM events").fetchone()[0], 1)
        empty = str(Path(self.temporary.name) / "empty.sqlite3")
        metrics.initialize(empty)
        self.assertIsNone(metrics.report(empty, now=now)["activation"]["percent"])
        with self.assertRaises(sqlite3.OperationalError):
            metrics.report(str(Path(self.temporary.name) / "missing.sqlite3"))

    def test_duration_only_heartbeats_reject_identifiers_and_aggregate_without_sessions(self):
        for data in [{"active_seconds": 60}, {"active_seconds": 60, "session": "secret"}, {"active_seconds": True},
                     {"active_seconds": -1}, {"active_seconds": 0}, {"active_seconds": 1.5},
                     {"active_seconds": "60"}, {"active_seconds": 31536001}]:
            self.assertFalse(metrics.validate_heartbeat(data))
        now = 1788600000
        for seconds, at in [(60, now), (31536000, now + 60), (1, now + 120)]:
            metrics.record_heartbeat(self.database, {"active_seconds": seconds, "session": "a" * 32, "registered": False}, now=at)
        metrics.record_heartbeat(self.database, {"active_seconds": 180, "session": "b" * 32, "registered": True}, now=now - 36 * 86400)
        metrics.prune(self.database, now=now)
        result = metrics.report(self.database, now=now + 120)
        heartbeat = result["duration_only_heartbeats"]
        self.assertEqual(heartbeat["pings"], 3)
        self.assertEqual([row["pings"] for row in heartbeat["daily_minute_buckets"]], [1, 1, 1])
        self.assertEqual(result["measured_tab_sessions"], 0)
        self.assertEqual(result["live_presence"]["active_sessions_estimated"], 1)
        self.assertEqual(result["live_presence"]["registered_sessions_estimated"], 0)
        with contextlib.closing(sqlite3.connect(self.database)) as db:
            self.assertEqual(db.execute("SELECT active_seconds FROM heartbeat_sessions WHERE registered = 0").fetchone()[0], 120)
        self.assertEqual(result["approx_active_seconds"]["total"], 0)
        with contextlib.closing(sqlite3.connect(self.database)) as db:
            self.assertEqual([row[1] for row in db.execute("PRAGMA table_info(heartbeats)")], ["day", "active_minutes", "pings"])

    def test_resource_schema_matches_shipped_tools_and_rejects_private_details(self):
        manifest = json.loads((Path(__file__).resolve().parents[1] / "tools/tools.json").read_text(encoding="utf-8"))
        self.assertEqual(metrics.TOOLS, {tool["id"] for tool in manifest["tools"]})
        for tool in metrics.TOOLS:
            self.assertTrue(metrics.validate_event(event(event="tool_open", detail=tool)))
        for name in metrics.FEATURES:
            self.assertTrue(metrics.validate_event(event(event="feature_use", detail=name)))
        for kind in ["tool_open", "feature_use", "compile_success", "compile_error"]:
            self.assertFalse(metrics.validate_event(event(event=kind, detail="private-project-name")))

    def test_daily_growth_resources_and_duration_summaries_preserve_history(self):
        # A session crosses the window boundary; previously observed cumulative
        # seconds must not be counted again as time during this window.
        now = 1788652800  # UTC midnight
        metrics.record(self.database, event(seconds=60), now=now - 86401)
        metrics.record(self.database, event(event="tool_open", detail="pipeline-lab", seconds=90), now=now - 86399)
        metrics.record(self.database, event(event="tool_open", detail="pipeline-lab", seconds=120), now=now - 86398)
        metrics.record(self.database, event(event="compile_success", seconds=180), now=now - 86397)
        metrics.record(self.database, event(session="b" * 32, event="tool_open", detail="pipeline-lab"), now=now - 1)
        metrics.record(self.database, event(session="c" * 32, event="tool_open", detail="stack-visualizer"), now=now)
        result = metrics.report(self.database, days=1, now=now)
        self.assertNotIn("consenting_tab_sessions", result)
        self.assertEqual(result["measured_tab_sessions"], 3)
        self.assertEqual(sum(day["active_seconds_observed"] for day in result["daily_usage"]), 120)
        self.assertEqual(result["resource_usage"][0], {"kind": "tool_open", "resource": "pipeline-lab", "sessions": 2, "events": 3})
        self.assertEqual(result["session_durations"]["buckets"]["under_1m"], 2)
        self.assertEqual(result["session_durations"]["max_seconds"], 120)
        self.assertEqual(result["approx_active_seconds"]["total"], 120)
        self.assertEqual(result["sessions_by_event"]["compile_success"], 1)
        self.assertEqual(result["event_counts"]["tool_open"], 4)
        self.assertNotIn("a" * 32, json.dumps(result))
        readable = metrics.summary(result)
        self.assertIn("Measured tab visits: 3", readable)
        self.assertIn("pipeline-lab", readable)
        self.assertIn("Visits are not unique people", readable)
        self.assertNotIn("a" * 32, readable)

    def test_heartbeat_visit_distribution_is_per_session_not_per_ping(self):
        now = 1788600000
        for offset in [0, 60, 120]:
            metrics.record_heartbeat(self.database, {"active_seconds": 31536000, "session": "a" * 32, "registered": False}, now=now + offset)
        metrics.record_heartbeat(self.database, {"active_seconds": 60, "session": "b" * 32, "registered": False}, now=now + 120)
        result = metrics.report(self.database, now=now + 150)
        self.assertEqual(result["heartbeat_visits"]["sessions"], 2)
        self.assertEqual(result["heartbeat_visits"]["pings"], 4)
        self.assertEqual(result["heartbeat_visits"]["median_seconds"], 60)
        self.assertEqual(result["heartbeat_visits"]["max_seconds"], 120)
        self.assertEqual(result["heartbeat_visits"]["buckets"]["under_1m"], 1)
        self.assertEqual(result["heartbeat_visits"]["buckets"]["1m_to_5m"], 1)

    def test_http_endpoint_validates_origin_schema_and_size_without_logging(self):
        server = HTTPServer(("127.0.0.1", 0), metrics.make_handler(self.database, "https://webmars.test"))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        stderr = io.StringIO()
        def post(body, origin="https://webmars.test", content_type="application/json", path="/events"):
            connection = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
            try:
                connection.request("POST", path, body, {"Origin": origin, "Content-Type": content_type})
                response = connection.getresponse()
                response.read()
                return response.status
            finally:
                connection.close()
        try:
            with contextlib.redirect_stderr(stderr):
                self.assertEqual(post(json.dumps(event())), 204)
                self.assertEqual(post(json.dumps(event(event="tool_open", detail="pipeline-lab"))), 204)
                self.assertEqual(post(json.dumps(event(event="tool_open", detail="private-filename.asm"))), 400)
                self.assertEqual(post(json.dumps(event()), origin="https://other.test"), 403)
                self.assertEqual(post(json.dumps(event()), content_type="text/plain"), 415)
                self.assertEqual(post('{"code":"secret"}'), 400)
                self.assertEqual(post("{"), 400)
                self.assertEqual(post("x" * 3000), 413)
                self.assertEqual(post(json.dumps({"active_seconds":60,"session":"a" * 32,"registered":False}), path="/heartbeat"), 204)
                self.assertEqual(post('{"active_seconds":60,"session":"secret","registered":false}', path="/heartbeat"), 400)
                self.assertEqual(post('{"active_seconds":60,"session":"' + 'a' * 32 + '","registered":false}', origin="https://other.test", path="/heartbeat"), 403)
            self.assertEqual(stderr.getvalue(), "")
            with contextlib.closing(sqlite3.connect(self.database)) as db:
                self.assertEqual(db.execute("SELECT COUNT(*) FROM events").fetchone()[0], 2)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
