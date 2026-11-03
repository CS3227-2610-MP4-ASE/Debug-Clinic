"""Freeze synthetic pilot fixtures in a NEW external directory; stdlib only."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess


SPEC = """# Synthetic publication guard

Implement publicationEligibility in publication-guard.ts using its supplied types.
This synthetic task is authorized for local implementation and commits only.
Input shapes satisfy the TypeScript interfaces; transport parsing is out of scope.
Return errors in this precedence:
1. null actor -> UNAUTHENTICATED
2. non-INSTRUCTOR actor, or exercise owned by another instructor -> FORBIDDEN
3. exercise status other than DRAFT -> CONFLICT
4. hints not exactly three in array order with stages 1,2,3, each approved === true
   and content.trim() nonempty -> INVALID_HINTS
Otherwise return exactly {ok:true}. Errors are exactly {ok:false,code:<code>}.
Preserve inputs, perform no I/O, and expose only this public function and types.
Do not sort invalid input into validity. No Python execution or real provider use.
Use Node 24: node --test public.test.mjs [your additional .test.mjs files].
Write focused tests and a handoff with commands, results, limitations and commits.
Only your assigned fixture directory is in scope. No competing worktrees, product
repository, evaluator, hidden checks or private fixture data may be read.
"""

STUB = """export type Actor = { id: string; role: 'LEARNER' | 'INSTRUCTOR' } | null;
export type Hint = { stage: number; approved: boolean; content: string };
export type Exercise = { ownerId: string; status: 'DRAFT' | 'PUBLISHED'; hints: readonly Hint[] };
export type Decision = { ok: true } | { ok: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'CONFLICT' | 'INVALID_HINTS' };

export function publicationEligibility(actor: Actor, exercise: Exercise): Decision {
  throw new Error('Implement the synthetic task');
}
"""

PUBLIC_TEST = """import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationEligibility} from './publication-guard.ts';
const exercise = {ownerId:'i',status:'DRAFT',hints:[1,2,3].map(stage=>({stage,approved:true,content:'hint'}))};
test('owner can publish a valid draft',()=>assert.deepEqual(publicationEligibility({id:'i',role:'INSTRUCTOR'},exercise),{ok:true}));
test('anonymous users cannot publish',()=>assert.deepEqual(publicationEligibility(null,exercise),{ok:false,code:'UNAUTHENTICATED'}));
"""

HELDOUT = """import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {publicationEligibility: guard} = await import(pathToFileURL(process.env.PUBLICATION_MODULE).href);
const actor = {id:'owner',role:'INSTRUCTOR'};
const draft = ()=>({ownerId:'owner',status:'DRAFT',hints:[1,2,3].map(stage=>({stage,approved:true,content:'safe hint'}))});
test('valid owner draft',()=>assert.deepEqual(guard(actor,draft()),{ok:true}));
test('anonymous precedence',()=>assert.deepEqual(guard(null,{...draft(),status:'PUBLISHED',hints:[]}),{ok:false,code:'UNAUTHENTICATED'}));
test('learner denied even when owner',()=>assert.deepEqual(guard({...actor,role:'LEARNER'},draft()),{ok:false,code:'FORBIDDEN'}));
test('foreign instructor denied',()=>assert.deepEqual(guard({...actor,id:'foreign'},draft()),{ok:false,code:'FORBIDDEN'}));
test('ownership before status and hints',()=>assert.deepEqual(guard({...actor,id:'foreign'},{...draft(),status:'PUBLISHED',hints:[]}),{ok:false,code:'FORBIDDEN'}));
test('published before invalid hints',()=>assert.deepEqual(guard(actor,{...draft(),status:'PUBLISHED',hints:[]}),{ok:false,code:'CONFLICT'}));
test('reject missing and extra hints',()=>{for(const stages of [[],[1,2],[1,2,3,4]])assert.deepEqual(guard(actor,{...draft(),hints:stages.map(stage=>({stage,approved:true,content:'h'}))}),{ok:false,code:'INVALID_HINTS'});});
test('reject reordered duplicate and invalid stages',()=>{for(const stages of [[2,1,3],[1,1,3],[0,2,3]])assert.deepEqual(guard(actor,{...draft(),hints:stages.map(stage=>({stage,approved:true,content:'h'}))}),{ok:false,code:'INVALID_HINTS'});});
test('reject every unapproved position',()=>{for(let i=0;i<3;i++){const e=draft();e.hints[i].approved=false;assert.deepEqual(guard(actor,e),{ok:false,code:'INVALID_HINTS'});}});
test('reject whitespace content',()=>{for(const content of ['', '  ', '\\t\\n']){const e=draft();e.hints[1].content=content;assert.deepEqual(guard(actor,e),{ok:false,code:'INVALID_HINTS'});}});
test('accept meaningful multiline hints',()=>{const e=draft();e.hints[0].content=' \\n trace a value \\n ';assert.deepEqual(guard(actor,e),{ok:true});});
test('frozen inputs remain intact',()=>{const e=draft();e.hints.forEach(Object.freeze);Object.freeze(e.hints);Object.freeze(e);assert.deepEqual(guard(Object.freeze(actor),e),{ok:true});const bad={...draft(),hints:[3,2,1].map(stage=>Object.freeze({stage,approved:true,content:'h'}))};Object.freeze(bad.hints);Object.freeze(bad);assert.deepEqual(guard(actor,bad),{ok:false,code:'INVALID_HINTS'});});
"""

BRIEF = """# Synthetic learner-coaching feature

Plan attempt-aware progressive AI coaching for saved Python debugging attempts in
DebugClinic. Keep the UI simple, preserve instructor authority, and account for
context and resource use. Produce PRD.md, TDD.md (technical design), and
RequirementsToTests.md. They are experimental drafts, not human-approved SDD.
Do not implement application code or call external services.

Baseline: React/MUI browser -> Express API -> Better Auth database session;
PostgreSQL/Prisma persistence; shared Zod contracts; backend AiProvider with an
offline fake; Vitest/Supertest/Playwright; Node24. Exactly LEARNER and INSTRUCTOR.
Arbitrary Python execution is absent. Product input shapes are not yet decided.

Clarify normally using the deterministic synthetic owner. Run:
python ask_owner.py --list
python ask_owner.py --topic <topic> [--topic <another>]
Only answers returned by that interface are owner evidence. You may retrieve more
than one round. Record questions/decisions and a concise HANDOFF.md with checks and
limitations, then make meaningful local commits. Never label an artifact approved.
Read/write only your assigned worktree and the explicitly supplied skill files.
Do not inspect ask_owner.py internals, other worktrees or private oracle data.
"""

ORACLE = {
    "access": "COACH-01: Only the learner owning the attempt may request coaching. Instructors cannot use this learner endpoint. Check session, ownership, and attempt state before retrieving private content or calling AI.",
    "eligibility": "COACH-02: Attempts are pinned to a published exercise version. Requests require a saved code proposal and nonblank reasoning. Instructor private solutions and other learners' work are never context.",
    "progression": "COACH-03: Exactly three ordered stages. The server chooses the next stage, never the browser. A successful persisted response advances progression; failed calls do not. After stage 3, return STAGES_EXHAUSTED without calling AI.",
    "revision": "COACH-04: Every saved code/reasoning edit creates a new attempt revision and resets hint progression. An in-flight response for an old revision must not become current or advance the new revision.",
    "submission": "COACH-05: A final submission is terminal for this attempt. No later edits or coaching. Serialize the coaching persistence decision against submission so a late response cannot advance a submitted attempt.",
    "retry": "COACH-06: Request identity includes learner, attempt, revision and idempotency key. Reusing a key for the same request returns its saved outcome; conflicting reuse fails. Concurrent requests must not double-advance or double-charge application usage. An upstream outcome that is unknown needs an explicit retry/recovery policy.",
    "context": "COACH-07: Context contains the published exercise statement, approved hints appropriate to the server-selected stage, the current saved code/reasoning, and only bounded relevant prior feedback. Learner text is untrusted data, not instructions. Complete solutions and unrelated records are excluded.",
    "output": "COACH-08: AI output is advisory, plain inert text with a bounded validated structure. It cannot publish exercises, grade, submit, execute code, change roles, or overwrite an instructor decision. Reject malformed output safely.",
    "limits": "COACH-09: Use configured validated input/context/output and request/deadline/retry limits. Verify live provider numeric limits before production acceptance; do not invent them. Fake provider tests remain deterministic and offline.",
    "accounting": "COACH-10: Record request identity, prompt/model version, stage/revision, latency, provider outcome and reported usage when available; unavailable usage stays null. Distinguish provider calls from application stages and idempotent replay. Never claim free or exactly-once upstream billing after an uncertain network outcome.",
    "failure": "COACH-11: Timeouts, rate limits, quota exhaustion, invalid AI output and provider failures produce stable recoverable errors with request IDs. No advancement on failure. Disable duplicate UI actions while pending, preserve user work, show actionable retry/state recovery.",
    "privacy": "COACH-12: Logs/metrics omit raw learner code, reasoning, full prompts, AI response bodies, cookies and credentials. Store necessary learner-visible feedback under attempt ownership; define retention/deletion as an explicit follow-up decision before real users.",
    "ui": "COACH-13: One learner attempt workspace shows saved revision, stage and request status; save before coaching; review/final submission remains explicit. Support keyboard use, mobile layout, empty/error/pending states and clear advisory copy.",
    "testing": "COACH-14: Cover owner/wrong-role denial, no-call-before-auth, stage order/exhaustion, saved revision/context exclusion, stale responses, concurrent/idempotent requests, final-submission races, failures, invalid output, inert display and missing usage with fake transport plus real local database tests.",
    "scope": "COACH-15: This feature does not implement authoring, instructor review, Python execution, a new identity provider or production deployment. Reuse the existing contracts, auth and AI boundary; propose precise shared-interface requests.",
}

ORACLE_SERVICE = '''import argparse, json
from datetime import datetime, timezone
from pathlib import Path
p=argparse.ArgumentParser(); p.add_argument('--list',action='store_true'); p.add_argument('--topic',action='append',default=[]); p.add_argument('--caller',required=True); a=p.parse_args()
root=Path(__file__).parent
data=json.loads((root/'oracle.json').read_text())
if a.list: print(json.dumps(list(data)))
for topic in a.topic:
 if topic not in data: p.error('Unknown topic; use --list')
 with (root/'queries.jsonl').open('a',encoding='utf-8') as f: f.write(json.dumps({'caller':a.caller,'topic':topic,'timestamp':datetime.now(timezone.utc).isoformat()})+'\\n')
 print(data[topic])
'''


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def git(root, *args):
    subprocess.run(["git", "-C", str(root), *args], check=True, capture_output=True)


def prepare(root):
    if root.exists():
        raise ValueError("Choose a new root: fixtures are never overwritten")
    root.mkdir(parents=True)
    private = root / "private"
    write(private / "heldout.test.mjs", HELDOUT)
    write(private / "oracle.json", json.dumps(ORACLE, indent=2) + "\n")
    write(private / "oracle_service.py", ORACLE_SERVICE)
    delivery = root / "delivery-base"
    for name, content in {"TASK.md": SPEC, "publication-guard.ts": STUB, "public.test.mjs": PUBLIC_TEST}.items():
        write(delivery / name, content)
    planning = root / "planning-base"
    write(planning / "TASK.md", BRIEF)
    wrapper = "import pathlib, subprocess, sys\nsubprocess.run([sys.executable, " + repr(str(private / "oracle_service.py")) + ", '--caller', pathlib.Path.cwd().name, *sys.argv[1:]], check=True)\n"
    write(planning / "ask_owner.py", wrapper)
    baselines = {}
    for name, base, branches in [
        ("delivery", delivery, ["candidate-a", "candidate-b-code", "candidate-b-tests"]),
        ("planning", planning, ["candidate-c", "candidate-d"]),
    ]:
        git(base, "init", "--initial-branch=fixture")
        git(base, "add", *[p.name for p in base.iterdir() if p.is_file()])
        git(base, "commit", "-m", "test: freeze synthetic workflow fixture")
        baselines[name] = subprocess.check_output(["git", "-C", str(base), "rev-parse", "HEAD"], text=True).strip()
        for branch in branches:
            git(base, "worktree", "add", "-b", branch, str(root / branch), "HEAD")
    hashes = {str(p.relative_to(root)).replace("\\", "/"): hashlib.sha256(p.read_bytes()).hexdigest()
              for p in [delivery / "TASK.md", delivery / "publication-guard.ts", delivery / "public.test.mjs", planning / "TASK.md", private / "oracle.json", private / "heldout.test.mjs", private / "oracle_service.py"]}
    write(root / "freeze.json", json.dumps({"schema_version": 1, "baselines": baselines, "sha256": hashes}, indent=2) + "\n")
    print(json.dumps({"root": str(root), "baselines": baselines, "files_frozen": len(hashes)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    prepare(args.root.resolve())
