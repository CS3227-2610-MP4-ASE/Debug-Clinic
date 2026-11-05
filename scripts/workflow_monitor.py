#!/usr/bin/env python3
"""Private, explicitly mapped local workflow telemetry. Python standard library only.

Session files are read only from manifest mappings. Derived reports contain only
allowlisted identifiers, numbers and fixed diagnostics, never session paths or text.
"""
from __future__ import annotations

import argparse
import collections
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import time

VERSION = 1
ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}\Z")
TAG = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.:/-]{0,79}\Z")
COMPONENTS = ("input", "cached_input", "cache_write", "output", "reasoning_output", "total")
EVENT_TYPES = {"assignment", "start", "dependency_wait", "owner_wait", "completion", "abort", "retry", "test_result", "review_finding", "integration", "commit", "handoff", "disagreement"}
EVENT_KEYS = {"type", "timestamp", "feature", "task", "agent", "run", "result", "requirement", "check", "retry_group", "attempt", "scope_violation", "elapsed_estimate_seconds", "token_estimate", "token_budget", "elapsed_budget_seconds"}
RESULTS = {"pass", "fail", "open", "resolved", "success", "failure"}


class Invalid(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise Invalid(message)


def safe_id(value):
    require(isinstance(value, str) and ID.fullmatch(value), "invalid identifier")
    return value


def number(value, integer=False):
    require(isinstance(value, (int, float)) and not isinstance(value, bool)
            and math.isfinite(value) and value >= 0, "invalid nonnegative number")
    require(not integer or isinstance(value, int), "integer required")
    return value


def timestamp(value):
    require(isinstance(value, str), "timestamp required")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, OverflowError) as exc:
        raise Invalid("invalid timestamp") from exc
    require(parsed.tzinfo is not None, "timestamp must include timezone")
    return parsed.timestamp()


def now():
    return datetime.now(timezone.utc).isoformat()


def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise Invalid("cannot read JSON input") from exc


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def validate_manifest(manifest, state_dir):
    require(isinstance(manifest, dict), "manifest must be an object")
    require(set(manifest) <= {"schema_version", "feature", "repository", "tasks", "agents", "budgets"}, "unknown manifest field")
    require(manifest.get("schema_version") == VERSION, "unsupported manifest version")
    safe_id(manifest.get("feature"))
    repository = Path(manifest.get("repository", ""))
    require(repository.is_absolute() and repository.is_dir(), "repository must be an existing absolute directory")
    require(not state_dir.resolve().is_relative_to(repository.resolve()), "state directory must be outside repository")
    require(isinstance(manifest.get("tasks"), list) and manifest["tasks"], "tasks required")
    tasks = set()
    for task in manifest["tasks"]:
        require(isinstance(task, dict) and set(task) <= {"id", "requirements", "budgets"}, "invalid task schema")
        task_id = safe_id(task.get("id"))
        require(task_id not in tasks, "duplicate task")
        tasks.add(task_id)
        require(isinstance(task.get("requirements", []), list), "invalid requirements")
        for requirement in task.get("requirements", []):
            safe_id(requirement)
        validate_budgets(task.get("budgets", {}))
    require(isinstance(manifest.get("agents"), list) and manifest["agents"], "agents required")
    agents, threads, paths = set(), set(), set()
    for agent in manifest["agents"]:
        require(isinstance(agent, dict) and {"id", "thread_id", "task", "session_path"} <= set(agent)
                and set(agent) <= {"id", "thread_id", "task", "session_path", "since"}, "invalid agent schema")
        agent_id, thread_id = safe_id(agent.get("id")), safe_id(agent.get("thread_id"))
        require(agent_id not in agents and thread_id not in threads, "duplicate agent or thread")
        require(agent.get("task") in tasks, "agent references unknown task")
        path = Path(agent.get("session_path", ""))
        require(path.is_absolute(), "session path must be absolute")
        require(str(path.resolve()) not in paths, "duplicate session path")
        if "since" in agent:
            timestamp(agent["since"])
        agents.add(agent_id)
        threads.add(thread_id)
        paths.add(str(path.resolve()))
    validate_budgets(manifest.get("budgets", {}))
    return manifest


def validate_budgets(budgets):
    require(isinstance(budgets, dict) and set(budgets) <= {"elapsed_seconds", "tokens"}, "invalid budgets")
    for value in budgets.values():
        number(value)


def validate_event(event, manifest):
    require(isinstance(event, dict) and set(event) <= EVENT_KEYS, "unknown event field")
    require(event.get("type") in EVENT_TYPES, "invalid event type")
    timestamp(event.get("timestamp"))
    require(event.get("feature") == manifest["feature"], "unknown feature")
    tasks = {task["id"]: task for task in manifest["tasks"]}
    agents = {agent["id"]: agent for agent in manifest["agents"]}
    require(event.get("task") in tasks and event.get("agent") in agents, "unknown task or agent")
    require(agents[event["agent"]]["task"] == event["task"], "agent task mismatch")
    safe_id(event.get("run"))
    for key in ("check", "retry_group"):
        if key in event:
            safe_id(event[key])
    if "requirement" in event:
        require(event["requirement"] in tasks[event["task"]].get("requirements", []), "unknown requirement")
    if "result" in event:
        require(event["result"] in RESULTS, "invalid result")
    if event["type"] in {"test_result", "review_finding"}:
        require("result" in event and "check" in event, "quality event requires check and result")
    if event["type"] == "retry":
        require("retry_group" in event and "attempt" in event and "check" in event, "retry requires group, check and attempt")
    for key in ("attempt", "token_estimate", "token_budget"):
        if key in event:
            number(event[key], integer=True)
    if "attempt" in event:
        require(event["attempt"] >= 1, "attempt starts at one")
    for key in ("elapsed_estimate_seconds", "elapsed_budget_seconds"):
        if key in event:
            number(event[key])
    if "scope_violation" in event:
        require(isinstance(event["scope_violation"], bool), "invalid scope violation")
    return event


def load_state(directory):
    directory = Path(directory).resolve()
    manifest = validate_manifest(read_json(directory / "manifest.json"), directory)
    state = read_json(directory / "state.json")
    validate_state(state, manifest)
    return directory, manifest, state


def empty_state():
    return {"schema_version": VERSION, "files": {}, "responses": {}, "events": [], "diagnostics": {},
            "models": {}, "contexts": {}, "lineage": {}, "items": {}, "collector": {"calls": 0, "bytes_read": 0, "session_bytes_processed": 0, "seconds": 0.0}}


DIAGNOSTICS = {"non_object_record", "legacy_cumulative_tokens_unsupported_v1", "token_identity_missing", "unmapped_token_owner",
               "response_usage_unavailable", "conflicting_response_duplicate", "item_identity_missing", "item_duration_unavailable",
               "unknown_record_schema", "session_restarted", "malformed_complete_line", "session_unavailable", "timestamp_required_for_bound"}


def validate_state(state, manifest):
    required = {"schema_version", "files", "responses", "events", "diagnostics", "models", "contexts", "lineage", "items", "collector"}
    require(isinstance(state, dict) and required <= set(state) and set(state) <= required | {"collected_at"}
            and state.get("schema_version") == VERSION, "invalid state schema")
    agents = {agent["id"]: agent for agent in manifest["agents"]}
    threads = {agent["thread_id"] for agent in manifest["agents"]}
    for field in required - {"schema_version", "events"}:
        require(isinstance(state[field], dict), "invalid state field")
    require(isinstance(state["events"], list), "invalid event list")
    for event in state["events"]:
        validate_event(event, manifest)
    require(set(state["diagnostics"]) <= DIAGNOSTICS, "invalid diagnostic")
    for count in state["diagnostics"].values():
        number(count, integer=True)
    require(set(state["collector"]) == {"calls", "bytes_read", "session_bytes_processed", "seconds"}, "invalid collector schema")
    for key, value in state["collector"].items():
        number(value, integer=key != "seconds")
    if "collected_at" in state:
        timestamp(state["collected_at"])
    for key, row in state["responses"].items():
        require(isinstance(key, str) and len(key.split("/")) == 2, "invalid response key")
        thread, response = key.split("/")
        safe_id(response)
        require(thread in threads, "unknown response owner")
        require(isinstance(row, dict) and set(row) == {"agent", "task", "timestamp", "tokens"}, "invalid response schema")
        require(row["agent"] in agents and agents[row["agent"]]["thread_id"] == thread and agents[row["agent"]]["task"] == row["task"], "response owner mismatch")
        if row["timestamp"] is not None:
            number(row["timestamp"])
        require(isinstance(row["tokens"], dict) and set(row["tokens"]) == set(COMPONENTS), "invalid token schema")
        for value in row["tokens"].values():
            if value is not None:
                number(value, integer=True)
    for field in ("models", "contexts"):
        for key, context in state[field].items():
            safe_id(key)
            require(field != "models" or key in agents, "unknown model owner")
            require(isinstance(context, dict) and set(context) <= {"model", "effort"}, "invalid model schema")
            require(all(isinstance(value, str) and TAG.fullmatch(value) for value in context.values()), "invalid model tag")
    for agent, parent in state["lineage"].items():
        require(agent in agents and parent in threads, "invalid lineage")
    for key, item in state["items"].items():
        require(isinstance(key, str) and len(key.split("/")) == 2, "invalid item key")
        thread, identity = key.split("/")
        safe_id(identity)
        require(thread in threads and isinstance(item, dict) and {"agent", "task", "type", "duration_seconds"} <= set(item)
                and set(item) <= {"agent", "task", "type", "duration_seconds", "timestamp"}, "invalid item schema")
        require(item["agent"] in agents and agents[item["agent"]]["thread_id"] == thread and item["task"] == agents[item["agent"]]["task"], "item owner mismatch")
        require(item["type"] in {"CommandExecution", "SubAgentActivity"}, "invalid item type")
        if item["duration_seconds"] is not None:
            number(item["duration_seconds"])
        if item.get("timestamp") is not None:
            number(item["timestamp"])
    for agent, cursor in state["files"].items():
        require(agent in agents and isinstance(cursor, dict) and set(cursor) == {"offset", "identity", "prefix_size", "prefix", "boundary", "pending_bytes"}, "invalid cursor schema")
        for field in ("offset", "identity", "prefix_size", "pending_bytes"):
            number(cursor[field], integer=True)
        require(cursor["prefix_size"] <= min(cursor["offset"], 4096), "invalid cursor prefix")
        require(all(isinstance(cursor[field], str) and re.fullmatch(r"[0-9a-f]{64}", cursor[field]) for field in ("prefix", "boundary")), "invalid cursor digest")


@contextmanager
def exclusive_state(directory):
    """Fail safely on concurrent writers instead of losing another event/update.

    A crash can leave .monitor.lock; after verifying no collector is running, the
    coordinator may remove that empty private lock file and retry.
    """
    lock = directory / ".monitor.lock"
    try:
        descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise Invalid("monitor state busy; check for active writer or stale private lock") from exc
    try:
        os.close(descriptor)
        yield
    finally:
        lock.unlink()


def diagnostic(state, code):
    state["diagnostics"][code] = state["diagnostics"].get(code, 0) + 1


def token_components(usage):
    if not isinstance(usage, dict):
        return None
    aliases = {"input": "input_tokens", "cached_input": "cached_input_tokens", "cache_write": "cache_write_input_tokens",
               "output": "output_tokens", "reasoning_output": "reasoning_output_tokens", "total": "total_tokens"}
    result = {component: None for component in COMPONENTS}
    for component, field in aliases.items():
        value = usage.get(field)
        if value is not None:
            try:
                result[component] = number(value, integer=True)
            except Invalid:
                return None
    return result if any(value is not None for value in result.values()) else None


def consume(record, mapped_agent, manifest, state):
    if not isinstance(record, dict):
        diagnostic(state, "non_object_record")
        return
    kind = record.get("type")
    if not isinstance(kind, str):
        diagnostic(state, "unknown_record_schema")
        return
    payload = record.get("payload") if isinstance(record.get("payload"), dict) else record
    # Even unknown schemas can carry malformed, unhashable identifiers. Validate
    # before any dictionary lookup so one complete bad line cannot stall a cursor.
    for field in ("thread_id", "turn_id", "parent_thread_id"):
        value = payload.get(field)
        if value is not None:
            try:
                safe_id(value)
            except Invalid:
                diagnostic(state, "invalid_record_identifier")
                return
    owners = {agent["thread_id"]: agent for agent in manifest["agents"]}
    owner = owners.get(payload.get("thread_id"))
    if kind == "token_usage_record" or (kind == "event_msg" and payload.get("type") == "item_completed"):
        if owner and "since" in owner:
            try:
                if timestamp(record.get("timestamp")) < timestamp(owner["since"]):
                    return
            except Invalid:
                diagnostic(state, "timestamp_required_for_bound")
                if kind == "token_usage_record":
                    return
    if kind == "event_msg" and payload.get("type") == "token_count":
        diagnostic(state, "legacy_cumulative_tokens_unsupported_v1")
        return
    if kind == "token_usage_record":
        thread_id, response_id = payload.get("thread_id"), payload.get("response_id")
        try:
            safe_id(thread_id)
            safe_id(response_id)
        except Invalid:
            diagnostic(state, "token_identity_missing")
            return
        if thread_id not in owners:
            diagnostic(state, "unmapped_token_owner")
            return
        components = token_components(payload.get("usage"))
        if components is None:
            diagnostic(state, "response_usage_unavailable")
            return
        key = thread_id + "/" + response_id
        if key in state["responses"]:
            if state["responses"][key]["tokens"] != components:
                diagnostic(state, "conflicting_response_duplicate")
            return
        owner = owners[thread_id]
        context = state["contexts"].get(payload.get("turn_id"), {})
        if context:
            state["models"][owner["id"]] = context
        observed = record.get("timestamp")
        try:
            observed = timestamp(observed)
        except Invalid:
            observed = None
        state["responses"][key] = {"agent": owner["id"], "task": owner["task"], "timestamp": observed, "tokens": components}
    elif kind == "session_meta":
        # Retain lineage only when both IDs are in the coordinator's explicit map.
        parent = payload.get("parent_thread_id")
        if payload.get("id") == mapped_agent["thread_id"] and parent in {agent["thread_id"] for agent in manifest["agents"]}:
            state["lineage"][mapped_agent["id"]] = parent
    elif kind == "turn_context":
        selected = {}
        for key in ("model", "effort"):
            value = payload.get(key)
            if isinstance(value, str) and TAG.fullmatch(value):
                selected[key] = value
        turn = payload.get("turn_id")
        if selected and isinstance(turn, str) and ID.fullmatch(turn):
            state["contexts"][turn] = selected
    elif kind == "event_msg" and payload.get("type") == "item_completed":
        item = payload.get("item", {})
        owner = owners.get(payload.get("thread_id"))
        if not owner or not isinstance(item, dict):
            return
        if not isinstance(item.get("type"), str):
            diagnostic(state, "invalid_item_type")
            return
        if item.get("type") not in {"CommandExecution", "SubAgentActivity"}:
            return
        identity = item.get("id")
        if not isinstance(identity, str) or not ID.fullmatch(identity):
            diagnostic(state, "item_identity_missing")
            return
        key = owner["thread_id"] + "/" + identity
        duration = None
        raw = item.get("duration")
        if isinstance(raw, dict):
            try:
                seconds, nanos = number(raw.get("secs")), number(raw.get("nanos"), integer=True)
                require(nanos < 1_000_000_000, "invalid duration")
                duration = seconds + nanos / 1_000_000_000
            except Invalid:
                diagnostic(state, "item_duration_unavailable")
        try:
            observed = timestamp(record.get("timestamp"))
        except Invalid:
            observed = None
        state["items"].setdefault(key, {"agent": owner["id"], "task": owner["task"], "type": item["type"],
                                       "duration_seconds": duration, "timestamp": observed})
    elif kind not in {"event_msg", "response_item", "compacted"}:
        diagnostic(state, "unknown_record_schema")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def collect(directory, manifest, state):
    started = time.perf_counter()
    for agent in manifest["agents"]:
        path = Path(agent["session_path"])
        previous = state["files"].get(agent["id"], {})
        try:
            with path.open("rb") as source:
                stat = path.stat()
                offset = previous.get("offset", 0)
                prefix_size = previous.get("prefix_size", 0)
                prefix = source.read(prefix_size)
                source.seek(max(0, offset - 128))
                boundary = source.read(min(offset, 128))
                state["collector"]["bytes_read"] += len(prefix) + len(boundary)
                changed = (stat.st_size < offset or previous.get("identity", stat.st_ino) != stat.st_ino
                           or (prefix_size and digest(prefix) != previous.get("prefix"))
                           or (offset and digest(boundary) != previous.get("boundary")))
                if changed:
                    offset = 0
                    diagnostic(state, "session_restarted")
                source.seek(offset)
                while True:
                    line = source.readline()
                    state["collector"]["bytes_read"] += len(line)
                    if not line or not line.endswith(b"\n"):
                        break  # Keep offset before any incomplete JSON or UTF-8 line.
                    offset += len(line)
                    state["collector"]["session_bytes_processed"] += len(line)
                    try:
                        record = json.loads(line.decode("utf-8"))
                    except (UnicodeDecodeError, ValueError):
                        diagnostic(state, "malformed_complete_line")
                        continue
                    consume(record, agent, manifest, state)
                source.seek(0)
                prefix_size = min(offset, 4096)
                prefix = source.read(prefix_size)
                source.seek(max(0, offset - 128))
                boundary = source.read(min(offset, 128))
                state["collector"]["bytes_read"] += len(prefix) + len(boundary)
                state["files"][agent["id"]] = {"offset": offset, "identity": stat.st_ino, "prefix_size": prefix_size,
                    "prefix": digest(prefix), "boundary": digest(boundary), "pending_bytes": max(0, stat.st_size - offset)}
        except OSError:
            diagnostic(state, "session_unavailable")
    state["collector"]["calls"] += 1
    state["collector"]["seconds"] += time.perf_counter() - started
    state["collected_at"] = now()
    write_json(directory / "state.json", state)


def totals(responses):
    rows = list(responses)
    return {component: (sum(row["tokens"][component] for row in rows)
                        if rows and all(row["tokens"][component] is not None for row in rows) else None)
            for component in COMPONENTS}


def ratio(numerator, denominator):
    return numerator / denominator if numerator is not None and denominator is not None and denominator > 0 else None


def measurements(responses):
    result = totals(responses)
    return {"tokens": result, "cache_hit_ratio": ratio(result["cached_input"], result["input"]),
            "reasoning_output_ratio": ratio(result["reasoning_output"], result["output"]),
            "reasoning_total_ratio": ratio(result["reasoning_output"], result["total"])}


def intervals(events, as_of):
    """Only explicit transitions supply time; silence never means idle or wait."""
    ordered = sorted(enumerate(events), key=lambda pair: (timestamp(pair[1]["timestamp"]), pair[0]))
    current, since = None, None
    durations = {"active_seconds": None, "dependency_wait_seconds": None, "owner_wait_seconds": None}
    transition = {"start": "active_seconds", "dependency_wait": "dependency_wait_seconds", "owner_wait": "owner_wait_seconds"}
    first, end = None, None
    warnings = []
    for _, event in ordered:
        kind, at = event["type"], timestamp(event["timestamp"])
        if at > as_of:
            warnings.append("future_event")
            continue
        if kind not in transition and kind not in {"completion", "abort"}:
            continue
        if kind in {"completion", "abort"} and current is None:
            warnings.append("terminal_without_start")
            continue
        if current is not None:
            durations[current] = (durations[current] or 0) + at - since
        if kind in transition:
            current, since = transition[kind], at
            if first is None:
                first = at
        else:
            current, since, end = None, None, at
    if current is not None:
        durations[current] = (durations[current] or 0) + as_of - since
    return {**durations, "wall_seconds": ((end if current is None and end is not None else as_of) - first if first is not None else None),
            "open_interval": current, "warnings": sorted(set(warnings))}


def quality(events, requirements):
    checks, findings, retries = {}, {}, {}
    requirement_evidence = {}
    review_attempts = {}
    evidence_missing = False
    for event in sorted(events, key=lambda e: timestamp(e["timestamp"])):
        check_key = (event["task"], event["run"], event.get("check"))
        if event["type"] == "test_result":
            checks[check_key] = event
            evidence = requirement_evidence.setdefault(check_key, set())
            # A later failure invalidates all earlier requirement passes for
            # this task/run/check. Subsequent passes rebuild evidence separately.
            if event["result"] in {"fail", "failure"}:
                evidence.clear()
            elif event["result"] == "pass" and "requirement" in event:
                evidence.add(event["requirement"])
        elif event["type"] == "review_finding":
            findings[check_key] = event
            review_attempts[check_key] = max(review_attempts.get(check_key, 0), event.get("attempt", 0))
        if "retry_group" in event:
            key = (event["task"], event["run"], event["retry_group"])
            group = retries.setdefault(key, {"attempt": 0, "result": None})
            if event["type"] == "retry" and group["result"] not in {"fail", "failure", "open"}:
                evidence_missing = True
            group["attempt"] = max(group["attempt"], event.get("attempt", 0))
            if event["type"] == "retry":
                group["result"] = None
            if event.get("result") in {"pass", "success", "resolved", "fail", "failure", "open"}:
                group["result"] = event["result"]
    covered = set().union(*requirement_evidence.values()) if requirement_evidence else set()
    return {"failed_checks": sum(event["result"] in {"fail", "failure"} for event in checks.values()) if checks else None,
            "open_review_findings": sum(event["result"] == "open" for event in findings.values()) if findings else None,
            "repair_limit_reached": any(group["attempt"] >= 3 and group["result"] not in {"pass", "success", "resolved"} for group in retries.values()),
            "review_limit_reached": any(review_attempts[key] >= 2 and event["result"] == "open" for key, event in findings.items()),
            "repair_limit_violation": any(group["attempt"] > 3 for group in retries.values()),
            "review_limit_violation": any(attempt > 2 for attempt in review_attempts.values()),
            "requirement_evidence_policy": "a failure clears all passes for the same task/run/check; later requirement passes accumulate independently",
            "retry_evidence_missing": evidence_missing,
            "missing_requirement_evidence": sorted(set(requirements) - covered),
            "quality_evidence_available": bool(checks or findings)}


def wall_time(events, as_of):
    runs = {(event["agent"], event["run"]) for event in events}
    timings = [intervals([event for event in events if (event["agent"], event["run"]) == run], as_of) for run in runs]
    starts = [timestamp(event["timestamp"]) for event in events if event["type"] == "start"]
    if not starts:
        return None
    closed = bool(timings) and all(item["open_interval"] is None and item["wall_seconds"] is not None for item in timings)
    terminal = [timestamp(event["timestamp"]) for event in events if event["type"] in {"completion", "abort"}]
    return (max(terminal) if closed else as_of) - min(starts)


def budget_warnings(budgets, events, responses, elapsed, include_assignments=True):
    budgets = dict(budgets)
    for event in sorted(events, key=lambda item: timestamp(item["timestamp"])):
        for field, key in (("token_budget", "tokens"), ("elapsed_budget_seconds", "elapsed_seconds")):
            if include_assignments and field in event:
                budgets[key] = event[field]
    warnings = []
    rows = list(responses)
    known_total = sum(row["tokens"]["total"] for row in rows if row["tokens"]["total"] is not None) if rows else None
    for key, measured in (("tokens", known_total), ("elapsed_seconds", elapsed)):
        budget = budgets.get(key)
        estimates = [event.get("token_estimate" if key == "tokens" else "elapsed_estimate_seconds") for event in events]
        estimate = max((value for value in estimates if value is not None), default=None)
        if budget is not None and any(value is not None and value >= budget for value in (measured, estimate)):
            warnings.append(key + "_soft_budget_reached")
    return warnings


def report(manifest, state, as_of=None):
    as_of = timestamp(as_of) if as_of else time.time()
    for event in state["events"]:
        validate_event(event, manifest)
    events = [event for event in state["events"] if timestamp(event["timestamp"]) <= as_of]
    bounds = {agent["id"]: timestamp(agent["since"]) for agent in manifest["agents"] if "since" in agent}
    responses = [row for row in state["responses"].values()
                 if (row["timestamp"] is None or row["timestamp"] <= as_of)
                 and (row["agent"] not in bounds or (row["timestamp"] is not None and row["timestamp"] >= bounds[row["agent"]]))]
    result = {"schema_version": VERSION, "feature": manifest["feature"], "generated_at": datetime.fromtimestamp(as_of, timezone.utc).isoformat(),
              "measurement_policy": "response_usage_v1; cached_input and reasoning_output are subsets; legacy cumulative unsupported",
              "diagnostics": state["diagnostics"], "collector": state["collector"], "overall": measurements(responses),
              "tasks": {}, "agents": {}, "runs": [], "tool_count": None, "tool_duration_seconds": None,
              "tool_metrics_status": "unavailable: no verified tool lifecycle correlation", "budget_warnings": []}
    requirements = {task["id"]: task.get("requirements", []) for task in manifest["tasks"]}
    task_budgets = {task["id"]: task.get("budgets", {}) for task in manifest["tasks"]}
    for dimension in ("task", "agent"):
        keys = requirements if dimension == "task" else {agent["id"]: [] for agent in manifest["agents"]}
        for key in keys:
            selected = [event for event in events if event[dimension] == key]
            runs = sorted({(event["agent"], event["run"]) for event in selected})
            timings = [intervals([event for event in selected if (event["agent"], event["run"]) == run], as_of) for run in runs]
            metrics = measurements(row for row in responses if row[dimension] == key)
            metrics.update({"event_counts": dict(collections.Counter(event["type"] for event in selected)),
                            "scope_violations": sum(event.get("scope_violation", False) for event in selected) if selected else None,
                            "quality": quality(selected, keys[key]),
                            "summed_agent_active_seconds": sum(item["active_seconds"] or 0 for item in timings) if any(item["active_seconds"] is not None for item in timings) else None,
                            "summed_dependency_wait_seconds": sum(item["dependency_wait_seconds"] or 0 for item in timings) if any(item["dependency_wait_seconds"] is not None for item in timings) else None,
                            "summed_owner_wait_seconds": sum(item["owner_wait_seconds"] or 0 for item in timings) if any(item["owner_wait_seconds"] is not None for item in timings) else None})
            metrics["wall_seconds"] = wall_time(selected, as_of)
            metrics["budget_warnings"] = budget_warnings(task_budgets.get(key, {}), selected, [row for row in responses if row[dimension] == key], metrics["wall_seconds"])
            result[dimension + "s"][key] = metrics
            all_items = [item for item in state["items"].values() if item[dimension] == key]
            unknown_item_time = any(item.get("timestamp") is None for item in all_items)
            items = [item for item in all_items if item.get("timestamp") is not None and item["timestamp"] <= as_of
                     and (item["agent"] not in bounds or item["timestamp"] >= bounds[item["agent"]])]
            commands = [item for item in items if item["type"] == "CommandExecution"]
            metrics["observed_command_count"] = len(commands) if commands else None
            metrics["observed_command_duration_seconds"] = sum(item["duration_seconds"] for item in commands) if commands and all(item["duration_seconds"] is not None for item in commands) else None
            metrics["observed_subagent_activity_count"] = sum(item["type"] == "SubAgentActivity" for item in items) if items else None
            metrics["item_metrics_status"] = "observed within collection bounds" if items else "unavailable: no timestamped items within collection bounds"
            if unknown_item_time:
                for field in ("observed_command_count", "observed_command_duration_seconds", "observed_subagent_activity_count"):
                    metrics[field] = None
                metrics["item_metrics_status"] = "unavailable: observed items missing timestamps"
            if dimension == "agent":
                metrics["model_context"] = state["models"].get(key)
                metrics["collection_since"] = next(agent.get("since") for agent in manifest["agents"] if agent["id"] == key)
    for agent, run in sorted({(event["agent"], event["run"]) for event in events}):
        selected = [event for event in events if event["agent"] == agent and event["run"] == run]
        result["runs"].append({"agent": agent, "run": run, "task": selected[0]["task"], **intervals(selected, as_of),
                               "tokens": None, "token_status": "unavailable: no explicit response-to-run mapping",
                               "quality": quality(selected, [])})
    elapsed = wall_time(events, as_of)
    result["overall"]["wall_seconds"] = elapsed
    result["overall"]["observed_responses"] = len(responses)
    result["overall"]["known_total_token_lower_bound"] = sum(row["tokens"]["total"] for row in responses if row["tokens"]["total"] is not None) if responses else None
    result["overall"]["pending_session_bytes"] = sum(file.get("pending_bytes", 0) for file in state["files"].values())
    result["overall"]["quality"] = quality(events, [requirement for values in requirements.values() for requirement in values])
    result["overall"]["quality"]["missing_requirement_evidence"] = [task + ":" + requirement for task, value in result["tasks"].items() for requirement in value["quality"]["missing_requirement_evidence"]]
    result["budget_warnings"] = budget_warnings(manifest.get("budgets", {}), events, responses, elapsed, include_assignments=False)
    return result


def markdown(result):
    def display(value):
        return "unavailable" if value is None else str(round(value, 3) if isinstance(value, float) else value)
    lines = ["# Workflow telemetry", "", "Feature: " + result["feature"], "",
             "Counts describe observed response usage only. Missing values remain unavailable.",
             "Cached input is included in input; reasoning output is included in output.", "",
             "| Task | Total tokens | Active agent seconds | Dependency wait seconds | Owner wait seconds |", "| --- | ---: | ---: | ---: | ---: |"]
    for key, task in result["tasks"].items():
        lines.append("| " + " | ".join([key, display(task["tokens"]["total"]), display(task["summed_agent_active_seconds"]), display(task["summed_dependency_wait_seconds"]), display(task["summed_owner_wait_seconds"])]) + " |")
    lines += ["", "Wall seconds: " + display(result["overall"]["wall_seconds"]),
              "", "Tool count and duration: unavailable (no verified lifecycle correlation).",
              "", "Budget warnings: " + (", ".join(result["budget_warnings"]) or "none observed"),
              "", "Diagnostics: " + (", ".join(f"{key}={value}" for key, value in sorted(result["diagnostics"].items())) or "none observed"),
              "", "Full component, agent, run, quality and collector measurements are in report.json."]
    task_warnings = [key + ": " + ", ".join(task["budget_warnings"]) for key, task in result["tasks"].items() if task["budget_warnings"]]
    lines += ["", "Task budget warnings: " + ("; ".join(task_warnings) or "none observed")]
    return "\n".join(lines) + "\n"


def parser():
    root = argparse.ArgumentParser(description=__doc__)
    commands = root.add_subparsers(dest="command", required=True)
    init = commands.add_parser("init")
    init.add_argument("--manifest", type=Path, required=True)
    init.add_argument("--state-dir", type=Path, required=True)
    for command in ("collect", "event", "report", "validate"):
        sub = commands.add_parser(command)
        sub.add_argument("--state-dir", type=Path, required=True)
        if command == "report":
            sub.add_argument("--output-dir", type=Path, required=True)
            sub.add_argument("--as-of")
        elif command == "event":
            sub.add_argument("--type", choices=sorted(EVENT_TYPES), required=True)
            for key in ("task", "agent", "run"):
                sub.add_argument("--" + key, required=True)
            sub.add_argument("--timestamp")
            sub.add_argument("--result", choices=sorted(RESULTS))
            for key in ("requirement", "check", "retry-group"):
                sub.add_argument("--" + key)
            for key in ("attempt", "token-estimate", "token-budget"):
                sub.add_argument("--" + key, type=int)
            sub.add_argument("--elapsed-estimate-seconds", type=float)
            sub.add_argument("--elapsed-budget-seconds", type=float)
            sub.add_argument("--scope-violation", action="store_true", default=None)
    return root


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        if args.command == "init":
            directory = args.state_dir.resolve()
            manifest = validate_manifest(read_json(args.manifest), directory)
            directory.mkdir(parents=True, exist_ok=True)
            with exclusive_state(directory):
                require(not (directory / "state.json").exists(), "state already initialized")
                write_json(directory / "manifest.json", manifest)
                write_json(directory / "state.json", empty_state())
                print(json.dumps({"status": "initialized", "schema_version": VERSION}))
                return 0
        with exclusive_state(args.state_dir.resolve()):
            directory, manifest, state = load_state(args.state_dir)
            if args.command == "collect":
                collect(directory, manifest, state)
            elif args.command == "event":
                event = {key: value for key, value in vars(args).items() if key in EVENT_KEYS and value is not None}
                event["feature"], event["timestamp"] = manifest["feature"], args.timestamp or now()
                validate_event(event, manifest)
                state["events"].append(event)
                write_json(directory / "state.json", state)
            derived = report(manifest, state, args.as_of if args.command == "report" else None)
            status = "valid" if args.command == "validate" else "recorded"
            if args.command == "report":
                write_json(args.output_dir / "report.json", derived)
                (args.output_dir / "report.md").write_text(markdown(derived), encoding="utf-8")
                status = "reported"
            print(json.dumps({"status": status, "budget_warnings": derived["budget_warnings"],
                              "task_budget_warnings": {key: value["budget_warnings"] for key, value in derived["tasks"].items() if value["budget_warnings"]}}))
            return 0
    except (Invalid, OSError, KeyError, TypeError) as exc:
        # Do not echo paths, arbitrary JSON values, tool arguments, or OS errors.
        message = str(exc) if isinstance(exc, Invalid) else "invalid or inaccessible monitor state"
        print(json.dumps({"status": "error", "message": message}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
