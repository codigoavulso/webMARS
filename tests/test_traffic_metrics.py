import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from contextlib import closing

ROOT = Path(__file__).resolve().parents[1]
def module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / "ops/raspberry-pi" / file)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded

metrics = module("traffic_metrics", "webmars-metrics.py")
audience = module("audience", "webmars-audience.py")

def event(sid="a", **changes):
    data = dict(v=2, session=sid*32, event="page_view", surface="app", detail="none", seconds=0,
                returning="new", source="direct", device="pointer", language="pt", context="public",
                automation="none", interaction="not_seen", visit="c"*32)
    data.update(changes)
    return data

class TrafficMetricsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.database = str(Path(self.tmp.name)/"metrics.sqlite3")
        metrics.initialize(self.database)

    def tearDown(self):
        self.tmp.cleanup()

    def test_v2_and_legacy_have_distinct_schemas_and_bounded_values(self):
        self.assertTrue(metrics.validate_event(event()))
        for changes in [dict(context="owner@example.com"), dict(visit="a"*200), dict(automation="Chrome"),
                        dict(interaction=True), dict(v=1), dict(event="account_created", detail="user@gmail.com")]:
            self.assertFalse(metrics.validate_event(event(**changes)))
        self.assertTrue(metrics.validate_event(event(event="account_created", detail="google")))

    def test_conservative_session_classification_and_filters_preserve_uncertainty(self):
        now = 1788600000
        for data, ua in [(event(), ""), (event("b", interaction="trusted"), ""),
                         (event("d", interaction="trusted", automation="webdriver"), ""),
                         (event("e", context="internal", interaction="trusted"), ""),
                         (event("f", context="test"), ""), (event("a", event="heartbeat", seconds=60), ""),
                         (event("9", interaction="trusted"), "ExampleBot/1.0")]:
            metrics.record(self.database, data, now=now, user_agent=ua)
        public = metrics.public_statistics(self.database, now=now+10, audience="public")
        self.assertEqual(public["totals"]["sessions"], 2)
        self.assertEqual(public["classification"]["sessions_by_class"], {"unknown":1,"human":1,"automated":2,"internal":1,"test":1})
        self.assertEqual(metrics.public_statistics(self.database, now=now+10, audience="human")["totals"]["sessions"], 1)
        raw = json.dumps(public)
        for token in ["a"*32,"b"*32,"c"*32]: self.assertNotIn(token, raw)
        report = metrics.report(self.database, now=now+10, audience="internal")
        self.assertEqual(report["measured_tab_sessions"], 1)
        with self.assertRaises(ValueError): metrics.public_statistics(self.database, audience="people")

    def test_additive_migration_keeps_old_rows_unclassified(self):
        path = str(Path(self.tmp.name)/"old.sqlite3")
        with closing(sqlite3.connect(path)) as db, db:
            db.execute("CREATE TABLE events(received INTEGER,session TEXT,event TEXT,surface TEXT,detail TEXT,seconds INTEGER,return_bucket TEXT,source TEXT,device TEXT,language TEXT)")
            db.execute("INSERT INTO events VALUES(1788600000,?,'app_ready','app','none',0,'new','direct','pointer','pt')", ("a"*32,))
        metrics.initialize(path)
        metrics.initialize(path)
        result = metrics.public_statistics(path, now=1788600010)
        self.assertEqual(result["totals"]["sessions"], 1)
        self.assertEqual(result["classification"]["sessions_by_class"], {"unknown":1})

    def test_web_correlation_separates_bots_internal_humans_and_unknown_without_identifiers(self):
        now = 1788600000
        from datetime import datetime, timezone
        rows = []
        for index, (visit, context, ua) in enumerate([("c"*32,"public","Browser"), ("d"*32,"internal","Browser"), ("e"*32,"public","CrawlerBot"), ("f"*32,"public","Browser")]):
            rows.append(dict(timestamp=datetime.fromtimestamp(now,timezone.utc).isoformat(), visit=visit,
                             usage_context=context, user_agent=ua, remote_addr="192.0.2.1", method="GET",
                             status=200, uri="/index.html", browser_navigation=1, content_type="text/html"))
        Path(self.tmp.name,"access.json").write_text("\n".join(json.dumps(r) for r in rows), encoding="utf-8")
        metrics.record(self.database, event(interaction="trusted"), now=now)
        result = audience.analyze(self.tmp.name, self.database, now=now+10)
        self.assertEqual(result["web_visits_by_class"], {"human":1,"internal":1,"automated":1,"unknown":1})
        self.assertEqual(result["linked_app_sessions"], 1)
        for forbidden in ["192.0.2.1", "Browser", "c"*32, "a"*32]: self.assertNotIn(forbidden, json.dumps(result))

if __name__ == "__main__": unittest.main()
