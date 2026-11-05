"""Preparation/receipt helper. No command implements the generate-question feature."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[3]
PRIVATE = ROOT.parent / ".workflow-runs" / "MP4-D2-F01-comparison"
ARM_NAMES = ("multi", "single")
KINDS = ("upfront", "retrieve", "handoff")
NOTES = ("clarification-request", "clarification-answer", "context-gap", "handoff-gap", "rework", "compaction", "search", "deviation")


def now():
    return datetime.now(timezone.utc).isoformat()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,95}", value):
        raise ValueError("Use a short safe actor/evidence identifier")
    return value


@contextmanager
def locked(directory):
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / ".receipt.lock"
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        os.close(fd)
        yield
    finally:
        path.unlink()


def append(directory, actor, event):
    identifier(actor)
    with locked(directory):
        with (directory / f"context-{actor}.jsonl").open("a", encoding="utf-8") as stream:
            stream.write(json.dumps({"timestamp": now(), "actor": actor, **event}) + "\n")


def source_receipt(root, name, first=None, last=None):
    root = root.resolve()
    relative = Path(name)
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("Read only explicit worktree-relative paths")
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError("File must stay inside the assigned worktree")
    if any(part.lower().startswith(".env") or part.lower() in {".git", "node_modules", ".workflow-state"} for part in relative.parts):
        raise ValueError("Credential, Git, dependency and raw-state files are excluded")
    allowed_top = {"AGENTS.md", "README.md", "PRODUCT.md", "DESIGN.md", "package.json", ".agents", ".codex", "apps", "packages", "prisma", "tests", "scripts", "workflow", "docs"}
    if not relative.parts or relative.parts[0] not in allowed_top:
        raise ValueError("Path is outside the project source/index allowlist")
    if relative.parts[0] == ".codex" and relative.parts[1:2] != ("agents",):
        raise ValueError("Only project role instructions are allowed under .codex")
    raw = path.read_bytes()
    if len(raw) > 200_000 or b"\0" in raw:
        raise ValueError("Read a focused textual artifact, at most 200 KB")
    lines = raw.decode("utf-8").splitlines(keepends=True)
    begin, end = first if first is not None else 1, last if last is not None else len(lines)
    if begin < 1 or end < begin or end > len(lines):
        raise ValueError("Invalid line range; no silent truncation")
    text = "".join(lines[begin - 1:end])
    return text, {"path": relative.as_posix(), "file_sha256": digest(raw),
                  "excerpt_sha256": digest(text.encode("utf-8")), "first_line": begin,
                  "last_line": end, "emitted_utf8_bytes": len(text.encode("utf-8")),
                  "exposure": "emitted-not-confirmed"}


def database_url(value):
    u = urlparse(value)
    if u.scheme not in {"postgres", "postgresql"} or u.hostname != "127.0.0.1" or not u.path.endswith("_test") or u.query or u.fragment or not u.port:
        raise ValueError("Experiment database must be explicit loopback _test target")
    return value


def environment(config):
    env = dict(os.environ)
    for key in list(env):
        if key.startswith(("SOC_LLM_", "SMTP_", "GOOGLE_", "OAUTH_PROXY_")) or key in {"DATABASE_URL", "DATABASE_URL_POOLED", "TEST_DATABASE_URL", "E2E_TEST_DATABASE_URL", "EMAIL_FROM"}:
            env.pop(key, None)
    url = database_url(config["database_url"])
    env.update({"PATH": str(Path(config["node"]).parent) + os.pathsep + env.get("PATH", ""),
                "DATABASE_URL": url, "DATABASE_URL_POOLED": url,
                "TEST_DATABASE_URL": url, "E2E_TEST_DATABASE_URL": url,
                "AI_PROVIDER": "fake", "NODE_ENV": "test", "APP_ORIGIN": "http://127.0.0.1:5173",
                "CORS_ORIGINS": "http://127.0.0.1:5173", "BETTER_AUTH_URL": "http://127.0.0.1:5173",
                "BETTER_AUTH_SECRET": "f01-comparison-synthetic-only-secret-over-32-chars",
                "GOOGLE_CLIENT_ID": "", "GOOGLE_CLIENT_SECRET": "", "OAUTH_PROXY_URL": "",
                "OAUTH_PROXY_SECRET": "", "SMTP_USER": "", "SMTP_PASSWORD": "", "EMAIL_FROM": "",
                "LOG_LEVEL": "silent", "E2E_AUTH_COMPLETION": "1", "VITE_API_BASE_URL": ""})
    return env


def command(config, args):
    if not args:
        raise ValueError("Supply node or npm and arguments after --")
    if args[0] == "npm":
        return [config["node"], config["npm_cli"], *args[1:]]
    if args[0] == "node":
        return [config["node"], *args[1:]]
    raise ValueError("Wrapper supports explicit node/npm argument arrays only")


def verify(registry):
    result = {}
    for arm, config in registry["arms"].items():
        root = Path(config["worktree"])
        head = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
        subprocess.run(["git", "-C", str(root), "merge-base", "--is-ancestor", registry["preparation_commit"], head], check=True, capture_output=True)
        for relative, expected in registry["approved_sha256"].items():
            if digest((root / relative).read_bytes()) != expected:
                raise ValueError("Approved artifact differs; preserve exact package")
        if digest((root / "package-lock.json").read_bytes()) != registry["lockfile_sha256"]:
            raise ValueError("Dependency lock differs from the frozen baseline")
        if not (PRIVATE / arm / "start.json").exists() and head != registry["preparation_commit"]:
            raise ValueError("Unstarted arm must remain at the exact common preparation commit")
        result[arm] = {"head": head, "approved_artifacts_verified": len(registry["approved_sha256"])}
    return result


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="action", required=True)
    sub.add_parser("verify")
    for name in ("read", "note", "summary", "exec", "mark"):
        c = sub.add_parser(name)
        c.add_argument("--arm", choices=ARM_NAMES, required=True)
        if name in {"read", "note"}:
            c.add_argument("--actor", required=True)
        if name == "read":
            c.add_argument("--path", required=True)
            c.add_argument("--kind", choices=KINDS, default="retrieve")
            c.add_argument("--reason", choices=("baseline", "requirements", "interface", "test", "diagnostic", "review", "handoff"), required=True)
            c.add_argument("--first-line", type=int)
            c.add_argument("--last-line", type=int)
        elif name == "note":
            c.add_argument("--kind", choices=NOTES, required=True)
            c.add_argument("--evidence-id", required=True)
        elif name == "exec":
            c.add_argument("argv", nargs=argparse.REMAINDER)
        elif name == "mark":
            c.add_argument("--phase", choices=("start", "candidate", "reviewed", "final_acceptance", "abort"), required=True)
    a = p.parse_args()
    try:
        registry = read_json(PRIVATE / "registry.json")
        if a.action == "verify":
            print(json.dumps(verify(registry), indent=2)); return 0
        config = registry["arms"][a.arm]
        allowed = [Path(config["worktree"]).resolve()]
        if a.arm == "multi":
            allowed += [Path(writer["worktree"]).resolve() for writer in config.get("writers", [])]
        if ROOT not in allowed:
            raise ValueError("Invoke the helper from the selected arm's own worktree")
        directory = PRIVATE / a.arm
        if a.action == "read":
            text, receipt = source_receipt(ROOT, a.path, a.first_line, a.last_line)
            append(directory, a.actor, {"kind": a.kind, "reason": a.reason, **receipt})
            print(text, end="" if text.endswith("\n") else "\n")
        elif a.action == "note":
            append(directory, a.actor, {"kind": a.kind, "evidence_id": identifier(a.evidence_id)})
        elif a.action == "summary":
            entries = [json.loads(line) for f in directory.glob("context-*.jsonl") for line in f.read_text(encoding="utf-8").splitlines()]
            reads = [e for e in entries if "file_sha256" in e]
            keys = [(e["path"], e["file_sha256"], e["first_line"], e["last_line"]) for e in reads]
            actor_keys = [(e["actor"], *key) for e, key in zip(reads, keys)]
            print(json.dumps({"read_events": len(reads), "distinct_ranges": len(set(keys)), "repeated_identical_ranges": len(keys) - len(set(keys)),
                              "within_actor_repeats": len(keys) - len(set(actor_keys)),
                              "cross_actor_reuse": len(set(actor_keys)) - len(set(keys)),
                              "emitted_utf8_bytes": sum(e["emitted_utf8_bytes"] for e in reads),
                              "notes": {kind: sum(e["kind"] == kind for e in entries) for kind in NOTES}}, indent=2))
        elif a.action == "exec":
            args = a.argv[1:] if a.argv[:1] == ["--"] else a.argv
            return subprocess.run(command(config, args), cwd=ROOT, env=environment(config)).returncode
        elif a.action == "mark":
            # Markers are evidence, not implementation or live-call permission.
            if a.phase == "start":
                verify(registry)
                readiness = read_json(PRIVATE / "readiness.json")
                if not all(readiness["arms"][arm]["ready"] for arm in ARM_NAMES):
                    raise ValueError("Both environments must be ready before either start")
                common = read_json(PRIVATE / "model-profile.json")
                own = read_json(directory / "profile.json")
                if any(common[field] != own[field] for field in ("model", "effort", "tools")):
                    raise ValueError("Current observed profile must match the common lock")
            previous = {"candidate": "start", "reviewed": "candidate", "final_acceptance": "reviewed"}
            if a.phase in previous and not (directory / f"{previous[a.phase]}.json").exists():
                raise ValueError("Record phase boundaries in order")
            directory.mkdir(parents=True, exist_ok=True)
            with (directory / f"{a.phase}.json").open("x", encoding="utf-8") as f:
                json.dump({"phase": a.phase, "timestamp": now(), "authorization": "supplied in separate owner start conversation"}, f)
        return 0
    except (ValueError, OSError, KeyError, subprocess.SubprocessError) as exc:
        print(f"Experiment command failed: {type(exc).__name__}; inspect explicit paths/configuration and protocol.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
