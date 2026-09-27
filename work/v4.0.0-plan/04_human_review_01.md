# Vesria — Human Review #1

> Status: accepted review input for the second implementation iteration
> Implementation branch: `feature-vesria-full-redesign`
> Design/reference branch: `Chat_GPT_Context`
> Scope: first full-system human review plus independent GPT-5.6 Sol UX review
> Principle: preserve the successful architecture and visual identity; rework defects, interaction semantics, and comprehension issues. This is not a request for another wholesale redesign.

## Review outcome

Overall UX verdict: **REWORK**.

The first implementation successfully established Vesria as a complete, reviewable SPA. The second iteration should keep the successful structure and visual direction while correcting defects and places where interaction semantics were weakened or over-compressed.

## P0 — Defect / safety

### Browser Back fatal state

Normal browser history navigation must not enter Fatal State.

Observed after Entry → Overview handoff and Back navigation:
- `Invalid hook call`
- error around `RuntimeProvider` / `useState`

Investigate the actual cause rather than masking the Fatal surface. Re-test ordinary Back/Forward navigation after the fix.

### Wide persistent blur / interaction obstruction

On Wide presentation, a vertical blur region near the Rail boundary persisted after transitions and obscured headings, labels, list content, and controls. In Settings it also obstructed the Reduced Motion control.

Transition effects must fully settle and must never leave an invisible/blurred interaction-blocking layer over completed content.

### Dirty-state protection

Workout and Resources can currently discard unsaved edits without warning.

For dirty editors, closing, changing relevant context, or otherwise abandoning the edit must provide an appropriate discard confirmation. Treat this as a reusable mutation/editor responsibility rather than isolated per-screen patches.

### Validation presentation

Do not expose internal validation paths such as:

`machines[0].sets[0].weightKg`

Map domain validation to user-facing messages and the relevant input/control. Error summaries may exist, but field-level guidance should make the required correction clear.

## P1 — Motion and local context

### Workspace transition is not workspace-local transition

Large route transition choreography belongs to top-level Workspace changes.

Example:
- Overview → Workout: Workspace transition
- Workout Session A → Session B: local context transition

When changing a Workout Session, keep the stable Workspace/list/layout stable and animate only the Detail region or other content that actually changed.

General rule:

> Stable content stays calm. Animate the region whose state actually changed.

### Narrow Workout selection

On Narrow, selecting a Session changes URL/selection but the resulting Detail is below the list and not immediately visible. Nested page/list scrolling further weakens feedback.

Redesign the Narrow List → Detail presentation so the result of selection is immediately apparent. Do not remove capability; change the presentation.

### Motion pacing

Reduced Motion currently provides a clear usable alternative and should be preserved.

Normal motion should not create a prolonged period where the user is unsure whether the previous surface is still actionable. Favor pleasant continuity over visible waiting.

## P1 — Shared Dialog anatomy

Use one Vesria dialog interaction anatomy for Workout, Resources, and other comparable mutation dialogs.

```text
┌──────────────────────────────────────────────┐
│ [ × ]  Dialog Title          [ Primary Action ] │
├──────────────────────────────────────────────┤
│                                              │
│               Scrollable Body                │
│                                              │
└──────────────────────────────────────────────┘
```

Requirements:
- left edge: Close action
- title immediately after Close
- right edge: primary action such as Create / Update / Save
- header remains fixed/sticky and is not part of body scrolling
- body is independently scrollable when required
- opening a modal dialog locks background/document scrolling
- preserve focus/accessibility behavior
- retain the same interaction anatomy on Narrow
- reference the v3.x Vuetify dialog **button placement/layout pattern only**
- do not copy the v3.x color/material styling; keep Vesria visual language

Deletion confirmation should not render a long disabled edit form. Present the target, relevant impact/context, and destructive action in a compact confirmation surface.

## P1 — Explore / Plasma resurrection

Preserve:
- Explore Workspace concept
- current spatial visual direction
- pleasant node feedback/tactility
- Focus / Merge / Detach / Result domain model
- read-only semantics
- accessible equivalent controls

Rework the interaction semantics.

Current drag behavior is too close to a draggable selection control: moving a node selects a condition, while the same condition can be selected through conventional controls. Spatial position itself has insufficient domain meaning.

Plasma means **Direct Manipulation**, not merely a draggable Plasma-looking object.

The spatial manipulation itself should carry exploration/query meaning. A valid direction to investigate is:
- tap/select node → Focus
- bring a node toward a meaningful core/cluster → visible attraction/material response
- commit the spatial relationship → Merge / add condition
- pull a merged condition away → Detach
- condition changes update Result

This exact choreography is not mandatory if a better direct-manipulation model is found. The requirement is:

> Do not reduce Plasma to draggable decoration. Manipulating the spatial object must itself be a meaningful domain interaction.

Buttons/checkboxes may remain as keyboard/accessibility/precision alternatives rather than replacing the primary spatial interaction.

## P1 — Comprehensibility

Add a review guardrail:

> Avoid unnecessary “What is this?” moments.

Architecture and implementation terminology must not automatically become user vocabulary.

Re-evaluate terms such as:
- WORKSPACES / YOUR WORKSPACES
- Lens / Body Lens
- Merge / Detach where the spatial interaction itself can communicate the meaning

A non-conventional UI is welcome; incomprehensible terminology is not required to make it distinctive.

Prefer:
1. visual structure and placement communicate approximate meaning;
2. label/feedback confirms the meaning;
3. tooltip/supporting copy is available when needed.

## P2 — Overview

Explore is reachable through Global Navigation, but its purpose is not discoverable from Overview.

Add or redesign an Overview surface that naturally communicates why Explore exists — e.g. discovering relationships within accumulated Workout data — and provides a contextual entry point.

Do not merely add another generic navigation button/card with no semantic preview.

## P2 — Analysis / Body-oriented view

Re-evaluate the current Body Lens.

The human-body illustration is not a requirement by itself. Preserve a body-oriented visualization only if it materially improves understanding or exploration of the intended relationship:

Body Part → Machine → Workout facts

If the illustration adds no meaningful advantage over a clearer selector/visualization, it may be simplified, replaced, or removed.

The term `Body Lens` is also subject to the comprehensibility review.

## P2 — Entry

Entry visual direction is strong and should be preserved.

The explicit “Workspaceへ” action currently competes with an approximately four-second automatic handoff. Reconsider the exit interaction so the user is not invited to choose when to continue and then moved automatically before making that choice.

## P2 — Machines Narrow

Capability is preserved, which is correct. However, horizontal continuation is weakly discoverable when only one machine is initially visible.

Improve Narrow composition or affordance without removing machine-axis capability.

## Navigation

### Wide Rail logo

Do not use the Wide Vesria identity symbol as an implicit System Information trigger. The relationship is not discoverable and gives the identity mark an unrelated responsibility.

For this iteration, the Wide logo may remain identity-only. The previously discussed optional local sparkle/easter-egg interaction is **deferred** and does not need to be implemented now.

Place System Information behind a semantically understandable information/settings/contextual affordance if it remains needed.

### WORKSPACES terminology

Re-evaluate/remove labels such as `WORKSPACES` / `YOUR WORKSPACES`. Workspace is useful architecture terminology but does not need to be exposed to users.

### Narrow navigation overlay lifecycle

If the Narrow navigation overlay is open and the viewport crosses into a size where the persistent Wide/Medium Rail is available, automatically close the obsolete Narrow overlay.

Responsive presentation mode changes should not preserve transient UI belonging to the previous mode.

## Nested scrolling

Review nested scrolling in:
- Wide Workout Detail
- long mutation dialogs
- Narrow Workout list

Avoid competing inner/outer scroll regions unless the interaction clearly benefits from them, especially for touch environments.

Dialogs follow the fixed-header + scrollable-body rule above.

## Performance observation

A single brief freeze was observed during review, but the implementation/build environment was active and the issue was not reproducible enough to classify as a product defect.

Do not remove visual effects speculatively.

If freezing reproduces in a stable production build:
1. capture/inspect performance behavior;
2. identify whether the cause is JS/main-thread work, React rendering, layout/paint/compositing, charts, ambient effects, or another source;
3. optimize the measured cause.

Android remains a first-class performance constraint.

## Preserve / PASS

Do not treat this review as permission for another indiscriminate full redesign.

Preserve unless a concrete fix requires change:
- overall Vesria visual identity
- Playground-derived Ambient / Glass direction
- Cyan / Ice adaptation
- Wide Rail structure
- Narrow Symbol trigger and navigation overlay
- Overview information hierarchy
- Analysis immediate selection → metric/chart feedback
- Explore spatial visual direction and tactile node response
- Resources Machine/Gym responsibility separation
- Data Error distinct from valid Empty state
- Fatal recovery affordance
- accessibility groundwork, including accessible names and equivalent controls
- Reduced Motion
- responsive capability preservation
- validated Domain/Data semantics
- replaceable legacy AF compatibility boundary

## Route/screen-count guardrail

Do not increase route or screen count merely to make Vesria appear larger.

However, audit whether distinct Workspace states have been over-compressed into one presentation. Introduce clear local presentation states where they materially improve comprehension, feedback, or interaction, without turning transient/local UI state into unnecessary routes.

## Second-iteration review target

The second iteration should answer:
- Are the P0 defects actually eliminated?
- Can edits be abandoned safely?
- Does a user see the result of an action immediately, especially on Narrow?
- Do dialogs behave as one coherent Vesria system?
- Does Plasma again have domain-level direct-manipulation meaning?
- Are there fewer unexplained terms and “What is this?” moments?
- Is motion localized to what changed?
- Does responsive presentation cleanly transition between Narrow and Wide modes?
- Were successful visual and architectural qualities preserved?
