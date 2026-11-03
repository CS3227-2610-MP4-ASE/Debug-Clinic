# Synthetic learner-coaching feature

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
