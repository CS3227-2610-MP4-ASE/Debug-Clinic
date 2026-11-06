---
version: 1
slug: "apps-frontend-src-pages-publishedquestionpage-tsx"
primary_target: "apps/frontend/src/pages/PublishedQuestionPage.tsx"
related_targets:
  [
    "apps/frontend/src/components/LearnerWorkspace.tsx",
    "apps/frontend/src/python/sandboxed-runner.ts",
  ]
---

# Learner published-question workspace

## Direction contract

THESIS: Help a learner investigate a published Python bug with a real local run, while keeping the problem and their working code visible together. Keep the compact 40/60 arrangement; avoid tutorial chrome, invented exercise metadata, and decorative IDE scaffolding.

OWN-WORLD: Continue the authenticated clinic’s light MUI language: warm paper canvas, white content surfaces, ink text, blue action, restrained green success, clear error red, Manrope UI, and monospace only for Python and output. Keep familiar controls, visible focus, and quiet dividers.

STORY: The learner reads verified problem details, edits the published starting code or saved attempt, optionally runs it or tests their own assertions with temporary stdin, explains the fix, then saves or submits. Local run output is advisory and never an official grade.

FIRST VIEWPORT: At desktop widths, show a bounded white problem pane in the left 40% and the compact editor workspace in the right 60%. Keep a fixed context header with Description, the published title, and topic while Problem, Starting code, and Expected behavior scroll independently below it. Put Python 3 and Run/Test/Stop above the editor; keep scratch tests, stdin, reasoning, output, Save draft, and Submit final attempt reachable without a floating overlay. Stack panes on narrow screens.

FORM: Extend the existing published-question workspace using the selected compact MUI direction, position 3 in the incumbent shell, seed key 7f6c67df.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
