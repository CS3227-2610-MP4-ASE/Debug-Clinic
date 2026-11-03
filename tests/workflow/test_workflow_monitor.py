"""Deterministic structural grader: synthetic allowlisted records only."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "workflow_monitor.py"
SPEC = importlib.util.spec_from_file_location("workflow_monitor", SCRIPT)
monitor = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(monitor)


def usage(response="r1", thread="thread-a", total=120, **values):
    tokens = {"input_tokens": 100, "cached_input_tokens": 60, "cache_write_input_tokens": 0,
              "output_tokens": 20, "reasoning_output_tokens": 5, "total_tokens": total}
    tokens.update(values)
    return {"timestamp": "2026-01-01T00:00:01Z", "type": "token_usage_record", "payload": {
        "thread_id": thread, "response_id": response, "turn_id": "turn-a", "usage": tokens,
        "turn_token_usage": {"total_tokens": 100000}, "thread_token_usage": {"total_tokens": 999999},
        "secret": "SECRET_SENTINEL"}}


def event(kind, seconds, **fields):
    return {"type": kind, "timestamp": f"2026-01-01T00:00:{seconds:02d}Z", "feature": "feature-a",
            "task": "task-a", "agent": "agent-a", "run": "run-a", **fields}


class MonitorTests(unittest.TestCase):
    def setUp(self):
        # Windows sandbox temp ACLs can deny descendants; use a disposable fixture
        # directory beside this suite, removed by TemporaryDirectory after each case.
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.repository = self.base / "repository"
        self.repository.mkdir()
        self.private = self.base / "private"
        self.session = self.base / "session.jsonl"
        self.session.write_bytes(b"")
        self.manifest = {"schema_version": 1, "feature": "feature-a", "repository": str(self.repository),
                         "tasks": [{"id": "task-a", "requirements": ["req-a"]}],
                         "agents": [{"id": "agent-a", "thread_id": "thread-a", "task": "task-a", "session_path": str(self.session)}]}
        self.state = monitor.empty_state()

    def append(self, *records, path=None):
        with (path or self.session).open("ab") as stream:
            for record in records:
                stream.write((json.dumps(record, ensure_ascii=False) + "\n").encode("utf-8"))

    def collect(self):
        monitor.collect(self.private, self.manifest, self.state)

    def derived(self, seconds=30):
        return monitor.report(self.manifest, self.state, f"2026-01-01T00:00:{seconds:02d}Z")

    def cli(self, *args):
        output, errors = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            result = monitor.main(list(args))
        return result, output.getvalue(), errors.getvalue()

    def initialize(self):
        source = self.base / "manifest-source.json"
        monitor.write_json(source, self.manifest)
        result = self.cli("init", "--manifest", str(source), "--state-dir", str(self.private))
        self.assertEqual(result[0], 0, result)

    def test_primary_response_only_and_subset_ratios(self):
        self.append(usage(), usage("r2", total=240, input_tokens=200, cached_input_tokens=100, output_tokens=40, reasoning_output_tokens=10))
        self.collect()
        actual = self.derived()["overall"]
        self.assertEqual(actual["tokens"], {"input": 300, "cached_input": 160, "cache_write": 0, "output": 60, "reasoning_output": 15, "total": 360})
        self.assertAlmostEqual(actual["cache_hit_ratio"], 160 / 300)
        self.assertEqual(actual["reasoning_output_ratio"], .25)
        self.assertEqual(actual["reasoning_total_ratio"], 15 / 360)

    def test_inherited_records_deduplicate_by_actual_thread_and_response(self):
        child = self.base / "child.jsonl"
        self.manifest["agents"].append({"id": "child", "thread_id": "thread-child", "task": "task-a", "session_path": str(child)})
        self.append(usage())
        self.append(usage(), usage("r1", "thread-child", total=10), path=child)
        self.collect()
        self.collect()
        actual = self.derived()
        self.assertEqual(actual["overall"]["tokens"]["total"], 130)
        self.assertEqual(actual["agents"]["agent-a"]["tokens"]["total"], 120)
        self.assertEqual(actual["agents"]["child"]["tokens"]["total"], 10)
        self.assertEqual(len(self.state["responses"]), 2)

    def test_resumption_persists_dedup(self):
        self.append(usage())
        self.collect()
        self.state = monitor.read_json(self.private / "state.json")
        self.append(usage(), usage("r2"))
        self.collect()
        self.assertEqual(self.derived()["overall"]["tokens"]["total"], 240)

    def test_legacy_cumulative_fallback_is_explicitly_unsupported(self):
        legacy = {"type": "event_msg", "payload": {"type": "token_count", "info": {"total_token_usage": {"total_tokens": 1000}, "last_token_usage": {"total_tokens": 120}}}}
        self.append(legacy, usage(), legacy)
        self.collect()
        self.assertEqual(self.derived()["overall"]["tokens"]["total"], 120)
        self.assertEqual(self.state["diagnostics"]["legacy_cumulative_tokens_unsupported_v1"], 2)

    def test_partial_utf8_and_json_never_advance_offset(self):
        row = usage()
        row["ignored"] = "秘密"
        encoded = (json.dumps(row, ensure_ascii=False) + "\n").encode()
        split = encoded.index("秘密".encode()) + 1
        self.session.write_bytes(encoded[:split])
        self.collect()
        self.assertEqual(self.state["files"]["agent-a"]["offset"], 0)
        self.assertEqual(len(self.state["responses"]), 0)
        with self.session.open("ab") as source:
            source.write(encoded[split:])
        self.collect()
        self.assertEqual(len(self.state["responses"]), 1)
        self.assertEqual(self.state["files"]["agent-a"]["offset"], len(encoded))

    def test_malformed_complete_lines_diagnosed_and_skipped(self):
        self.session.write_bytes(b"{broken}\n\xff\n")
        self.append(usage())
        self.collect()
        self.collect()
        self.assertEqual(self.state["diagnostics"]["malformed_complete_line"], 2)
        self.assertEqual(len(self.state["responses"]), 1)

    def test_truncation_replacement_and_same_inode_rewrite(self):
        self.append(usage(), usage("long-response"))
        self.collect()
        self.session.write_bytes(b"")
        self.append(usage("r2"))
        self.collect()
        replacement = self.base / "replacement"
        self.append(usage("r3"), path=replacement)
        replacement.replace(self.session)
        self.collect()
        self.session.write_bytes(b"")
        self.append(usage("r4"))  # Same length, same inode; prefix/boundary detect rewrite.
        self.collect()
        self.assertEqual(len(self.state["responses"]), 5)
        self.assertEqual(self.state["diagnostics"]["session_restarted"], 3)

    def test_missing_components_stay_null_and_bad_usage_diagnosed(self):
        row = usage()
        del row["payload"]["usage"]["cached_input_tokens"]
        self.append(row, usage("bad", total=-1), {"type": "future_schema", "secret": "SECRET_SENTINEL"})
        self.collect()
        actual = self.derived()
        self.assertIsNone(actual["overall"]["tokens"]["cached_input"])
        self.assertIsNone(actual["overall"]["cache_hit_ratio"])
        self.assertEqual(actual["diagnostics"]["response_usage_unavailable"], 1)
        self.assertEqual(actual["diagnostics"]["unknown_record_schema"], 1)

    def test_unmapped_owner_or_missing_identity_is_not_charged(self):
        row = usage()
        del row["payload"]["response_id"]
        self.append(row, usage(thread="unknown"))
        self.collect()
        self.assertIsNone(self.derived()["overall"]["tokens"]["total"])
        self.assertEqual(self.state["diagnostics"]["unmapped_token_owner"], 1)

    def test_conflicting_duplicates_keep_first_and_diagnose(self):
        self.append(usage(), usage(total=121))
        self.collect()
        self.assertEqual(self.derived()["overall"]["tokens"]["total"], 120)
        self.assertEqual(self.state["diagnostics"]["conflicting_response_duplicate"], 1)

    def test_context_matches_turn_owner_not_inherited_file(self):
        context = {"type": "turn_context", "payload": {"turn_id": "turn-a", "model": "example-model", "effort": "high", "developer_instructions": "SECRET_SENTINEL"}}
        self.append(context, usage())
        self.collect()
        self.assertEqual(self.derived()["agents"]["agent-a"]["model_context"], {"model": "example-model", "effort": "high"})
        self.assertNotIn("SECRET_SENTINEL", json.dumps(self.state))

    def test_explicit_wait_intervals_and_end_time(self):
        self.state["events"] = [event("start", 0), event("dependency_wait", 4), event("owner_wait", 8), event("start", 10), event("completion", 15)]
        actual = self.derived()
        run = actual["runs"][0]
        self.assertEqual(run["active_seconds"], 9)
        self.assertEqual(run["dependency_wait_seconds"], 4)
        self.assertEqual(run["owner_wait_seconds"], 2)
        self.assertEqual(run["wall_seconds"], 15)
        self.assertEqual(actual["overall"]["wall_seconds"], 15)
        self.assertIsNone(run["tokens"])

    def test_silence_does_not_imply_wait_and_open_run_uses_as_of(self):
        self.state["events"] = [event("assignment", 0), event("start", 2)]
        run = self.derived()["runs"][0]
        self.assertEqual(run["active_seconds"], 28)
        self.assertIsNone(run["dependency_wait_seconds"])
        self.assertIsNone(run["owner_wait_seconds"])

    def test_concurrent_agents_sum_active_separately_from_wall(self):
        other = {"id": "agent-b", "thread_id": "thread-b", "task": "task-a", "session_path": str(self.base / "other.jsonl")}
        self.manifest["agents"].append(other)
        self.state["events"] = [event("start", 0), event("completion", 10), event("start", 5, agent="agent-b"), event("completion", 15, agent="agent-b")]
        actual = self.derived()
        self.assertEqual(actual["tasks"]["task-a"]["summed_agent_active_seconds"], 20)
        self.assertEqual(actual["overall"]["wall_seconds"], 15)

    def test_future_events_do_not_change_historical_report(self):
        self.state["events"] = [event("start", 0), event("completion", 40)]
        actual = self.derived(30)
        self.assertEqual(actual["runs"][0]["active_seconds"], 30)
        self.assertEqual(actual["tasks"]["task-a"]["event_counts"], {"start": 1})

    def test_repair_and_review_limits_clear_on_exact_limit_success(self):
        self.state["events"] = [event("test_result", 0, check="check-a", retry_group="failure-a", result="fail")]
        for attempt in range(1, 4):
            self.state["events"] += [event("retry", attempt * 2, check="check-a", retry_group="failure-a", attempt=attempt),
                                     event("test_result", attempt * 2 + 1, check="check-a", retry_group="failure-a", attempt=attempt, result="fail")]
        quality = self.derived()["overall"]["quality"]
        self.assertTrue(quality["repair_limit_reached"])
        self.assertFalse(quality["retry_evidence_missing"])
        self.state["events"].append(event("test_result", 9, check="check-a", retry_group="failure-a", attempt=3, result="pass", requirement="req-a"))
        self.state["events"].append(event("review_finding", 10, check="review-a", attempt=2, result="open"))
        quality = self.derived()["overall"]["quality"]
        self.assertFalse(quality["repair_limit_reached"])
        self.assertTrue(quality["review_limit_reached"])
        self.assertEqual(quality["missing_requirement_evidence"], [])
        self.state["events"].append(event("review_finding", 11, check="review-a", attempt=2, result="resolved"))
        self.assertFalse(self.derived()["overall"]["quality"]["review_limit_reached"])

    def test_retry_without_failure_evidence_is_visible(self):
        self.state["events"] = [event("retry", 0, check="check-a", retry_group="group-a", attempt=3)]
        self.assertTrue(self.derived()["overall"]["quality"]["retry_evidence_missing"])

    def test_budgets_scope_and_quality_missing(self):
        self.manifest["budgets"] = {"tokens": 100, "elapsed_seconds": 5}
        self.append(usage())
        self.collect()
        self.state["events"] = [event("start", 0), event("integration", 2, scope_violation=True)]
        actual = self.derived()
        self.assertEqual(set(actual["budget_warnings"]), {"tokens_soft_budget_reached", "elapsed_seconds_soft_budget_reached"})
        self.assertEqual(actual["tasks"]["task-a"]["scope_violations"], 1)
        self.assertIsNone(actual["overall"]["quality"]["failed_checks"])
        self.assertEqual(actual["overall"]["quality"]["missing_requirement_evidence"], ["req-a"])

    def test_verified_commands_and_spawn_activities_no_raw_content(self):
        command = {"type": "event_msg", "payload": {"type": "item_completed", "thread_id": "thread-a", "item": {
            "type": "CommandExecution", "id": "command-a", "command": "SECRET_SENTINEL", "aggregated_output": "SECRET_SENTINEL",
            "duration": {"secs": 1, "nanos": 500000000}}}}
        spawn = {"type": "event_msg", "payload": {"type": "item_completed", "thread_id": "thread-a", "item": {"type": "SubAgentActivity", "id": "spawn-a", "agent_path": "/SECRET_SENTINEL"}}}
        self.append(command, command, spawn)
        self.collect()
        actual = self.derived()
        self.assertEqual(actual["agents"]["agent-a"]["observed_command_count"], 1)
        self.assertEqual(actual["agents"]["agent-a"]["observed_command_duration_seconds"], 1.5)
        self.assertEqual(actual["agents"]["agent-a"]["observed_subagent_activity_count"], 1)
        self.assertNotIn("SECRET_SENTINEL", json.dumps(self.state))
        self.assertIsNone(actual["tool_count"])

    def test_manifest_and_events_fail_closed(self):
        monitor.validate_manifest(self.manifest, self.private)
        with self.assertRaises(monitor.Invalid):
            monitor.validate_manifest(self.manifest, self.repository / "private")
        self.manifest["unexpected"] = "SECRET_SENTINEL"
        with self.assertRaises(monitor.Invalid):
            monitor.validate_manifest(self.manifest, self.private)
        del self.manifest["unexpected"]
        for invalid in [event("made_up", 0), event("start", 0, run="../secret"), event("start", 0, prompt="SECRET_SENTINEL"), event("start", 0, timestamp="2026-01-01"), event("test_result", 0, check="a"), event("retry", 0, retry_group="a", attempt=0)]:
            with self.subTest(invalid=invalid), self.assertRaises(monitor.Invalid):
                monitor.validate_event(invalid, self.manifest)

    def test_cli_roundtrip_and_derived_reports_do_not_contain_paths(self):
        self.initialize()
        self.append(usage())
        args = ("--state-dir", str(self.private))
        for command in [("collect", *args), ("event", *args, "--type", "start", "--task", "task-a", "--agent", "agent-a", "--run", "run-a", "--timestamp", "2026-01-01T00:00:00Z"), ("validate", *args), ("report", *args, "--output-dir", str(self.repository / "derived"), "--as-of", "2026-01-01T00:00:30Z")]:
            actual = self.cli(*command)
            self.assertEqual(actual[0], 0, actual)
        text = (self.repository / "derived" / "report.json").read_text()
        for secret in (str(self.session), str(self.repository), str(self.private), "SECRET_SENTINEL", "session_path", "thread_token_usage"):
            self.assertNotIn(secret, text)
        self.assertTrue((self.repository / "derived" / "report.md").exists())

    def test_cli_validate_returns_nonzero_for_tampered_event(self):
        self.initialize()
        state = monitor.read_json(self.private / "state.json")
        state["events"].append(event("start", 0, prompt="SECRET_SENTINEL"))
        monitor.write_json(self.private / "state.json", state)
        actual = self.cli("validate", "--state-dir", str(self.private))
        self.assertEqual(actual[0], 2)
        self.assertNotIn("SECRET_SENTINEL", actual[2])

    def test_incremental_collector_reads_only_appended_lines(self):
        self.append(usage())
        self.collect()
        read = self.state["collector"]["bytes_read"]
        self.collect()
        self.assertEqual(self.state["collector"]["bytes_read"], read)
        self.append(usage("r2"))
        self.collect()
        self.assertGreater(self.state["collector"]["bytes_read"], read)
        self.assertEqual(self.state["collector"]["calls"], 3)
        self.assertGreaterEqual(self.state["collector"]["seconds"], 0)


if __name__ == "__main__":
    unittest.main()
