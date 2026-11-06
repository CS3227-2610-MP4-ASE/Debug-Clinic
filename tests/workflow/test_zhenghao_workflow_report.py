"""Tests for the Zhenghao-only workflow reflection add-on."""

import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"


def load(name):
    specification = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


monitor = load("workflow_monitor")
sys.modules["workflow_monitor"] = monitor
reporter = load("zhenghao_workflow_report")


def usage(total=120, include_components=True):
    tokens = {"total_tokens": total}
    if include_components:
        tokens.update({"input_tokens": 100, "cached_input_tokens": 60, "cache_write_input_tokens": 0,
                       "output_tokens": 20, "reasoning_output_tokens": 5})
    return {"timestamp": "2026-01-01T00:00:01Z", "type": "token_usage_record", "payload": {
        "thread_id": "thread-a", "response_id": "response-a", "turn_id": "turn-a", "usage": tokens,
        "secret": "SECRET_SENTINEL"}}


class ZhenghaoReportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.repository = self.base / "repository"
        self.repository.mkdir()
        self.private = self.base / "private"
        self.session = self.base / "session.jsonl"
        self.session.write_bytes(b"")
        self.manifest = {"schema_version": 1, "feature": "feature-a", "repository": str(self.repository),
                         "tasks": [{"id": "implementation", "requirements": []}],
                         "agents": [{"id": "builder", "thread_id": "thread-a", "task": "implementation",
                                     "session_path": str(self.session)}]}
        source = self.base / "manifest.json"
        monitor.write_json(source, self.manifest)
        self.assertEqual(monitor.main(["init", "--manifest", str(source), "--state-dir", str(self.private)]), 0)

    def append(self, record):
        with self.session.open("a", encoding="utf-8") as output:
            output.write(json.dumps(record) + "\n")

    def run_reporter(self):
        output, errors = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            status = reporter.main(["--state-dir", str(self.private), "--output-dir", str(self.repository / "output"),
                                    "--as-of", "2026-01-01T00:00:30Z"])
        return status, output.getvalue(), errors.getvalue()

    def test_generates_separate_zhenghao_reflection_without_changing_canonical_report(self):
        self.append(usage())
        self.assertEqual(monitor.main(["collect", "--state-dir", str(self.private)]), 0)
        status, _, errors = self.run_reporter()
        self.assertEqual(status, 0, errors)
        output = self.repository / "output"
        canonical = json.loads((output / "report.json").read_text())
        reflection = json.loads((output / "reflection.json").read_text())
        self.assertNotIn("contributor", canonical)
        self.assertEqual(reflection["contributor"], "zhenghao")
        self.assertEqual(reflection["overall"]["cache_miss_tokens"], 40)
        self.assertAlmostEqual(reflection["overall"]["reasoning_total_ratio"], 5 / 120)
        self.assertEqual(reflection["highest_token_task"]["id"], "implementation")
        self.assertNotIn("Zhenghao", (output / "report.md").read_text())
        self.assertIn("Zhenghao workflow reflection", (output / "reflection.md").read_text())

    def test_missing_components_remain_unavailable(self):
        self.append(usage(include_components=False))
        self.assertEqual(monitor.main(["collect", "--state-dir", str(self.private)]), 0)
        status, _, errors = self.run_reporter()
        self.assertEqual(status, 0, errors)
        reflection = json.loads((self.repository / "output" / "reflection.json").read_text())
        self.assertIsNone(reflection["overall"]["cache_miss_ratio"])
        self.assertIsNone(reflection["overall"]["reasoning_total_ratio"])
        self.assertIn("unavailable", (self.repository / "output" / "reflection.md").read_text())

    def test_outputs_exclude_private_paths_and_session_content(self):
        self.append(usage())
        self.assertEqual(monitor.main(["collect", "--state-dir", str(self.private)]), 0)
        status, _, errors = self.run_reporter()
        self.assertEqual(status, 0, errors)
        combined = "".join(path.read_text() for path in (self.repository / "output").iterdir())
        for private in (str(self.private), str(self.session), "SECRET_SENTINEL", "session_path"):
            self.assertNotIn(private, combined)


if __name__ == "__main__":
    unittest.main()
