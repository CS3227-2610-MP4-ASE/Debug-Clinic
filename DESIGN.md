---
schema: debugclinic-design/v1
surface: application-shell
sourceOfTruth: apps/frontend/src/theme.tsx
directionSeed: 7f6c67df
directionCandidate: 3
---

# DebugClinic application shell direction

This contract governs the authenticated application shell delivered by the
basic-infrastructure milestone. It keeps the interface deliberate while the
exercise, coaching, and review features are still future work.

## 1. World

The visual world is an annotated clinic case sheet: calm, precise, and made for
careful reasoning. It lends the interface its warm paper-like background,
compact evidence-oriented language, blue for primary action, and green for
verified state. It does not turn standard controls into novelty objects.

## 2. Form

- Direction seed: `7f6c67df`, assigned grounded candidate 3.
- Form: a restrained case-workbook shell with direct hierarchy, generous
  reading space, and conventional MUI controls.
- Typography: self-hosted variable Manrope for an intentional display and body
  voice, with system fallbacks.
- Surfaces: warm `#f5f3ed` canvas, white working surfaces, dark ink, blue
  actions, and green authority cues.
- Shape: modest 10-12px radii; cards are used only for bounded working areas.

The direction roll ran in degraded offline mode, so no remote challenger set
was available. The selected direction remains constrained by the user's brief
for a simple, task-oriented MUI foundation.

## 3. First viewport

The public first viewport states the product model, labels this release as an
infrastructure foundation, and offers only account creation or sign-in. It must
not imply that exercise practice or instructor review is already available.
Authenticated workspaces lead with the role-specific purpose and an honest
empty state rather than fabricated activity.

## 4. Interaction

The signature interaction is an evidence handoff: future flows will move from
learner reasoning, to staged coaching, to green instructor verification without
changing who owns the decision. For this shell, the pattern appears only in
copy and semantic color. Navigation, forms, errors, loading, and retry actions
remain familiar and keyboard operable.

## 5. Motion

Motion is functional and quiet. State changes may use a 160ms standard easing;
route changes do not animate by default. Loading indicators communicate real
work, and reduced-motion preferences disable nonessential transitions. No
decorative looping motion is permitted.

## 6. Responsive behavior

Desktop navigation becomes a drawer on narrow screens. Hero actions stack,
workflow columns collapse to one column, and bounded work surfaces reflow
without horizontal scrolling down to 320px. Buttons and header controls are at
least 44px; inline text links retain their semantic line-height targets. The
two-layer focus treatment remains visible on light and primary-colored surfaces.

## Quality bar

- Use the warm, low-noise canvas and blue/green authority model consistently.
- Load every declared non-system font locally; do not depend on a remote font
  request.
- Keep claims aligned with verified implementation status.
- Provide visible keyboard focus, semantic headings, recovery actions, and
  responsive stacking.
- Prefer one clear hierarchy over badges, ornamental cards, or placeholder
  metrics.
- Preserve standard MUI interaction behavior and accessible names.
- Validate desktop and mobile screenshots plus keyboard/error recovery before
  accepting a visual change.

## Canonical tokens

| Token       | Value     | Use                                             |
| ----------- | --------- | ----------------------------------------------- |
| Canvas      | `#f5f3ed` | Page background                                 |
| Surface     | `#ffffff` | Forms and bounded work areas                    |
| Ink         | `#171b25` | Primary text                                    |
| Muted ink   | `#565f70` | Supporting copy                                 |
| Primary     | `#2457c5` | Actions, learner work, and advisory coaching    |
| Verified    | `#237a57` | Instructor verification and approved state only |
| Error       | `#b42318` | Errors and destructive state                    |
| Divider     | `#d9d7d0` | Low-noise boundaries                            |
| Focus inner | `#ffffff` | Separation from filled controls                 |
| Focus outer | `#17213a` | Visible focus against light surfaces            |
| Radius      | `10-12px` | Controls and bounded surfaces                   |
| Motion      | `160ms`   | Standard state transition                       |

Typography uses self-hosted `Manrope Variable`. H1 is 750 weight with
`-0.03em` tracking; H2 is 720 with `-0.025em`; H3 and buttons use 700. Body
copy uses the theme default and should stay readable rather than compressed.

Spacing follows MUI's 8px base unit. The main content uses responsive 40/64px
vertical padding; buttons and interactive header targets are at least 44px.
The established bounded-surface shadow is
`0 14px 40px rgba(33, 39, 55, 0.08)`.

## Component and state rules

- `AppShell`: 72px header, role-aware navigation, mobile drawer below the `sm`
  breakpoint, and a quiet divider instead of elevation.
- Buttons: contained blue for the primary next action, outlined for the
  secondary action, and disabled when a future feature is not implemented.
- Forms: one-column MUI text fields, explicit labels, inline validation, and a
  clear submit action.
- Empty workspaces: one bounded white surface with a role-relevant explanation;
  do not invent activity, counts, or status badges.
- Loading: label progress semantically. Errors must explain recovery and expose
  a retry when the operation is repeatable.
- Focus: retain the white inner and deep-ink outer ring. Do not remove the
  browser-visible focus state.
- Responsive: stack hero actions and workflow columns on small screens; prevent
  horizontal overflow at 320px.
- Reduced motion: the global media query collapses nonessential animation and
  transition duration when the user requests it.
