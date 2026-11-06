# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Vite, MUI, React Router, Node.js, Express, PostgreSQL, Prisma, Zod, Better Auth, Vitest, Supertest, Playwright, Netlify, and GitHub Actions. This stack was explicitly supplied by the user; Better Auth is the selected production-oriented implementation for Google and email/password authentication.

## Users

- Instructors create, review, and publish Python debugging exercises, then decide and comment on final learner submissions. F02 publication is independent of hints; Developer 1 owns future functional hint integration.
- Learners propose code fixes, explain their reasoning, request progressive coaching, and submit a final attempt.

## Product Purpose

DebugClinic supports deliberate Python debugging practice with human-controlled exercise quality and attempt-aware AI coaching. Success means learners receive useful progressive guidance without the AI replacing their reasoning or the instructor's authority.

## Positioning

The product joins versioned, instructor-verified debugging exercises with three controlled coaching stages and a final human review loop.

## Operating Context

Instructors prepare exercises before learners can access them. Learners work through a current attempt, request advisory help, and make an explicit final submission. AI output remains advisory throughout.

## Capabilities and Constraints

- Exactly two roles: `LEARNER` and `INSTRUCTOR`.
- The intended coaching workflow has three approved, ordered hint stages. Under the approved MP4-D2-F02 exception, publication and learner browsing require no hint records or approval. F02 exposes only a disabled Get Hint placeholder with Coming soon; Developer 1 owns functional hints and their future contract.
- The NUS SoC LLM is accessed only through a backend adapter with validation, limits, retries, and usage accounting.
- Development, deploy-preview, and production environments remain separate.
- Arbitrary learner Python is not executed until a separately reviewed sandbox exists.
- External credentials, provider contracts, and live deployments remain human-owned.

## Brand Commitments

The confirmed product name is DebugClinic. The interface should be simple, task-oriented, and precise. No logo or visual identity assets were supplied.

## Evidence on Hand

The product workflow and assignment requirements were supplied in the project brief. There are no testimonials, production metrics, external validation claims, or brand assets; future work must not fabricate them.

## Product Principles

- Human verification precedes learner access.
- Coaching reveals progressively instead of supplying an answer immediately.
- Authorization is enforced by the API, never only by the interface.
- External AI failures remain explicit and recoverable.
- Product documentation describes only verified behavior.

## Accessibility & Inclusion

The web interface must support keyboard navigation, visible focus, semantic structure, responsive layouts, sufficient contrast, and clear recovery-oriented error messages.
