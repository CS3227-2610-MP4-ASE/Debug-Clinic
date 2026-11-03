"""Run frozen held-out Node checks and emit content-free outcome summaries."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile


REFERENCE = """export function publicationEligibility(a,e) {
 if(!a) return {ok:false,code:'UNAUTHENTICATED'};
 if(a.role!=='INSTRUCTOR'||a.id!==e.ownerId) return {ok:false,code:'FORBIDDEN'};
 if(e.status!=='DRAFT') return {ok:false,code:'CONFLICT'};
 if(e.hints.length!==3||e.hints.some((h,i)=>h.stage!==i+1||h.approved!==true||!h.content.trim())) return {ok:false,code:'INVALID_HINTS'};
 return {ok:true};
}
"""


def verify_freeze(root):
    freeze = json.loads((root / "freeze.json").read_text(encoding="utf-8"))
    for relative, expected in freeze["sha256"].items():
        candidate = (root / relative).resolve()
        if not candidate.is_relative_to(root):
            raise ValueError("Frozen path escapes pilot root")
        if hashlib.sha256(candidate.read_bytes()).hexdigest() != expected:
            raise ValueError(f"Frozen fixture changed: {relative}")
    return freeze


def evaluate(root, module):
    result = subprocess.run(
        ["node", "--test", "--test-reporter=tap", str(root / "private" / "heldout.test.mjs")],
        env={**os.environ, "PUBLICATION_MODULE": str(module)},
        text=True, capture_output=True, timeout=60,
    )
    def count(label):
        match = re.search(rf"^# {label} (\d+)$", result.stdout, re.MULTILINE)
        return int(match[1]) if match else None
    return {"exit_code": result.returncode, "tests": count("tests"),
            "passed": count("pass"), "failed": count("fail")}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--candidate", choices=["candidate-a", "candidate-b-code"])
    parser.add_argument("--output", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    freeze = verify_freeze(root)
    if args.self_test:
        with tempfile.TemporaryDirectory(prefix="pilot-grader-", dir=root / "private") as temporary:
            if not Path(temporary).resolve().is_relative_to(root / "private"):
                raise ValueError("Grader scratch path escapes private fixture directory")
            reference = Path(temporary) / "reference.mjs"
            reference.write_text(REFERENCE, encoding="utf-8")
            passing = evaluate(root, reference)
            failing = evaluate(root, root / "delivery-base" / "publication-guard.ts")
        ok = passing["passed"] == 12 and passing["failed"] == 0 and failing["exit_code"] != 0 and failing["failed"] == 12
        print(json.dumps({"self_test_passed": ok, "passing_fixture": passing, "failing_fixture": failing}))
        return 0 if ok else 1
    if not args.candidate:
        parser.error("--candidate is required without --self-test")
    outcome = evaluate(root, root / args.candidate / "publication-guard.ts")
    report = {"schema_version": 1, "candidate": args.candidate,
              "checked_at": datetime.now(timezone.utc).isoformat(),
              "evaluator_sha256": freeze["sha256"]["private/heldout.test.mjs"], **outcome}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))
    return outcome["exit_code"]


if __name__ == "__main__":
    raise SystemExit(main())
