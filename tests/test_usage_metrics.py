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
        self.assertEqual(result["consenting_tab_sessions"], 2)
        self.assertEqual(result["sessions_by_event"]["run_success"], 1)
        self.assertEqual(result["activation"]["percent"], 50)
        self.assertEqual(result["approx_active_seconds"]["total"], 60)
        self.assertEqual(result["sessions_opening_two_distinct_lessons"], 1)
        self.assertNotIn("a" * 32, json.dumps(result))

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
        result = metrics.report(self.database, now=now)
        heartbeat = result["duration_only_heartbeats"]
        self.assertEqual(heartbeat["pings"], 3)
        self.assertEqual([row["pings"] for row in heartbeat["daily_minute_buckets"]], [1, 1, 1])
        self.assertEqual(result["consenting_tab_sessions"], 0)
        self.assertEqual(result["live_presence"]["active_sessions_estimated"], 1)
        self.assertEqual(result["live_presence"]["registered_sessions_estimated"], 0)
        with contextlib.closing(sqlite3.connect(self.database)) as db:
            self.assertEqual(db.execute("SELECT active_seconds FROM heartbeat_sessions WHERE registered = 0").fetchone()[0], 120)
        self.assertEqual(result["approx_active_seconds"]["total"], 0)
        with contextlib.closing(sqlite3.connect(self.database)) as db:
            self.assertEqual([row[1] for row in db.execute("PRAGMA table_info(heartbeats)")], ["day", "active_minutes", "pings"])

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
                self.assertEqual(db.execute("SELECT COUNT(*) FROM events").fetchone()[0], 1)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
