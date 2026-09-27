# Vesria — Initial Implementation Brief

> Status: implementation baseline
> Target branch: `feature-vesria-full-redesign`
> Source baseline: `develop`
> Design reference: `Chat_GPT_Context`

## Goal

Build the complete Vesria frontend once as one responsive SPA so that architecture, navigation, material semantics, motion, and cross-workspace UX can be reviewed together. This is not a wireframe pass, but individual workspaces do not need final-polish completeness before the first full-system review.

## Build scope

- Application Root / global runtime integration
- persistent Ambient Visual Layer
- responsive Global Navigation
- Entry
- Overview
- Workout
- Machine-oriented View
- Analysis
- Explore
- Resources
- Settings
- Dialog / Snackbar / loading / empty / data error / local error / Route Not Found / fatal state
- responsive layouts and reduced-motion behavior

## Material contract

Classification is based on interaction semantics, not on whether an element happens to animate.

- **Glass = display/read.** Stable informational surfaces, cards, charts, details, headings and similar formed content.
- **Liquid = something changes.** Controls that change route, view, application state, or persisted data.
- **Plasma = direct manipulation.** Spatial/direct manipulation such as Explore node interaction, Merge/Detach, drag-like behavior, and interactive spatial visualization.

Do not use Plasma merely as a visually elaborate button.

## Motion contract

- Ambient motion remains slow and subordinate.
- Vesria targets Android as well as desktop. Motion and visual effects must remain practical on Android-class devices; do not build the experience around continuously heavy rendering, excessive blur, large particle counts, or gratuitous GPU-intensive effects.
- Prefer lightweight transforms/opacity and scoped effects where they achieve the intended experience. Expensive graphics should be isolated and degrade gracefully when appropriate.
- The goal is expressive, pleasant motion — not maximum animation density.
- Top-level Workspace transition: current Route Presentation exits to the left, the destination starts at its initial scroll position, then new Glass/uncontained content forms with restrained fade/cut-in/offset motion.
- Browser Back/Forward uses the same leftward transition language.
- Application Root, Ambient Visual Layer, and Global Navigation persist through normal route transitions.
- Workspace titles, section headings, supporting text, and other important uncontained content may use the same restrained formation language as Glass.
- Plasma does not mechanically inherit Glass entrance behavior.
- Dialogs and Snackbars should animate where practical, without making the UI noisy or forcing users to wait for animation.
- Reduced Motion must have a simplified alternative.
- Exact durations/easing/stagger remain implementation/detail-design decisions.

## Responsive navigation

- Wide/Medium: persistent lightweight Rail.
- Narrow: upper-left Floating Glass Vesria Symbol Trigger opens an on-demand Floating Navigation Overlay.
- No Bottom Navigation/Menu.
- The Narrow visible symbol may be visually small, but the interactive hit target must remain accessible.
- Rail symbol may later host a non-functional local sparkle delight interaction; Narrow symbol remains a navigation control.

## Workspace briefs

### Entry
System identity and handoff experience. Use the Vesria symbol and persistent visual space. It is not a separate launcher/runtime.

### Overview
Broad, glanceable, visually rich Workout Log overview. Chart-rich presentation is encouraged. Recorded facts and deterministic aggregates only; do not invent growth/effectiveness/insufficiency judgments.

### Workout
Session-axis browse/read + Create/Update/Delete in one Workspace. Session identity is `session_id`. Mutation follows Validation → Confirmation → Execute → Result. Preserve useful edit state on failure.

### Machine-oriented View
Machine-axis Workout history, visualization, and compatible execution comparison. Machine Master is reference data only. Master CUD must not appear here.

### Analysis
Structured condition-driven investigation. Monthly is a period capability; Body Map is an Analysis view. Exact chart/filter composition remains implementation discretion within supported data semantics.

### Explore
Read-only discovery-driven data playground. Focus / Merge / Detach / Result. This is the primary Plasma/spatial-interaction area. No persisted Workout or Master mutation.

### Resources
Machine/Gym Master management. Keep Workout mutation out. Use Vesria material language rather than reproducing the legacy Maintenance presentation.

### Settings
Runtime / connection configuration required to operate the application. Do not turn Settings into a generic preference drawer.

## Existing Application Framework compatibility

The first Vesria implementation continues to use the existing Windows/Android localhost Application Framework contract. This is a **temporary compatibility constraint**, not the authoritative long-term Vesria interface design.

Current common prefix: `/api/v1/common`.

The existing Windows and Android AFs intentionally expose the same product API shape; platform differences are limited to native concerns such as credential protection, local storage, hosting, and packaging.

Use a replaceable compatibility boundary:

```text
Vesria UI / Workspace
        ↓
Vesria application-facing repository/service contract
        ↓
Legacy AF compatibility adapter
        ↓
Existing Windows / Android localhost I/F
```

Rules:

- UI components must not encode Windows/Android implementation details.
- Do not let legacy endpoint naming become Workspace/domain architecture.
- Preserve current stable response/error semantics while the compatibility layer exists.
- Keep the boundary replaceable so the AF/I/F can be redesigned later without rewriting presentation components.
- Existing recovery/draft APIs are legacy capabilities; do not resurrect a Vesria Recovery Workspace merely because endpoints exist.

Known useful existing capabilities include Status/readiness, Runtime Workout data, Configuration/Credential, Master write, and Workout write contracts. The exact legacy API inventory remains defined by the current AF contract on `develop`.

## Technology / library policy

- **Icons:** Material Design Icons (`@mdi`) is the standard icon vocabulary.
- **Charts:** ApexCharts is the established chart library.
- Additional well-maintained libraries may be installed when they materially improve visualization, graphics, motion, interaction, spatial presentation, accessibility, or UX.
- Motion, particles, SVG, Canvas, WebGL, D3-family visualization, gesture, and floating-positioning libraries are valid options when they have a clear responsibility.
- Do not optimize for minimum dependency count at the expense of the Vesria experience.
- Conversely, do not add a dependency merely because it is visually interesting. Every dependency must have an identifiable responsibility.
- Do not collapse Vesria into a conventional CRUD dashboard merely to avoid richer frontend techniques.
- Richness must remain compatible with the Android performance constraint in the Motion contract.

## Existing source reuse

Reuse validated shared domain/data packages where their semantics remain valid:

- `workout-types`
- `workout-core`
- `workout-data`

Existing `frontend-common`, design tokens, shared styles, MPA navigation, and per-framework presentation are not automatically authoritative for Vesria. Reuse only when compatible with the new SPA architecture and visual language.

The current frontend is an MPA/framework mix. Vesria should not preserve those screen/application boundaries merely to minimize migration work.

Existing presentation code is reference material, not a migration target. Do not copy a legacy screen and merely apply Glass styling. Reuse code only when its responsibility and semantics genuinely fit Vesria.

## Real data, fixtures, and mocks

- Use validated real domain/data contracts wherever the existing runtime supports them.
- Fixtures/mocks are allowed when required to make the complete first-pass UI and interaction reviewable before every runtime path is available.
- Mock/fixture data must be clearly isolated behind replaceable data boundaries and must not masquerade as authoritative persisted data.
- Do not leave a Workspace visually unimplemented merely because one backend path is unavailable.
- Do not invent unsupported analytics semantics in mock data; the same domain rules apply.

## Vesria identity asset

Canonical Full Symbol design source:

`work/v4.0.0-plan/logo/vesria-full-symbol.svg` on `Chat_GPT_Context`.

The production branch should receive an application-owned copy in an appropriate frontend asset location rather than runtime-importing from `work/`.

## MUST

- Preserve fixed IA / Workspace responsibilities.
- Preserve current validated data/domain semantics unless a deliberate contract change is approved.
- Responsive presentation without capability loss.
- Respect Glass / Liquid / Plasma semantics.
- Maintain the Vesria motion language and persistent ambient space.
- Keep Master CUD in Resources.
- Keep Explore read-only.
- Use `session_id` as Workout Session identity.
- Distinguish missing/invalid required data from a legitimate empty state.
- Support accessibility and Reduced Motion.
- Keep persistent/destructive mutation behind explicit confirmation.

## MUST NOT

- Invent analytics judgments unsupported by the data model.
- Put Machine/Gym Master CUD in the Machine-oriented Workout Workspace.
- Mutate persisted data from Explore.
- Remove domain capability merely because the viewport is narrow.
- Recreate the legacy Portal/Shell/Maintenance boundaries by inertia.
- Add user-facing Draft/Recovery concepts merely because legacy APIs contain them.
- Scatter direct AF calls through visual components.
- Treat Glass/Liquid/Plasma as arbitrary skins.
- Make every interactive control Plasma.
- Make animation completion a prerequisite for ordinary operation.
- Encode transient dialogs, animations, or arbitrary visual modes as routes without an addressability requirement.

## FREE

Implementation has discretion over:

- layout and component composition
- grid/flex structure
- spacing and typography details
- responsive rearrangement
- component decomposition
- chart choice where semantically valid
- information hierarchy
- Glass geometry
- Liquid interaction details
- detailed motion choreography
- exact Workspace presentation

## First-pass definition of done

The first pass is complete when:

- every planned Workspace is reachable and has a meaningful Vesria presentation;
- Wide/Medium and Narrow navigation/presentation are both usable without capability loss;
- representative interaction is implemented for each Workspace rather than static placeholder pages;
- Loading, legitimate Empty, Data Error, local Error, Route Not Found, and fatal-state presentation can be reviewed;
- the Vesria motion/material language can be experienced in normal navigation and interaction;
- Explore provides enough spatial/Plasma interaction to evaluate its interaction direction;
- production build/type checking succeeds using the repository's chosen frontend workflow;
- the implementation is ready for human visual/UX review.

Pixel-perfect polish is explicitly **not** required for this first pass.

## Accessibility and performance guardrails

- Keyboard navigation, visible focus, semantic HTML, and accessible names are required for actionable controls.
- Icon-only MDI controls must expose an accessible name.
- Glass/transparency must not reduce text/control contrast below practical readability.
- Primary functionality must not become pointer-only merely because Plasma/Canvas/spatial presentation is used.
- Reduced Motion must preserve functionality while simplifying/removing nonessential movement.
- Persistent ambient effects must not continuously force expensive application-wide rendering.
- Expensive visual effects must be scoped and should degrade gracefully on constrained devices.
- Android usability is a first-class constraint: visual richness is welcome, sustained heavy rendering is not.

## Visual composition guardrail

Vesria is one visual system, not one repeated layout. Workspaces should express their different responsibilities through appropriate composition and information hierarchy. Do not reduce every Workspace to the same title + uniform card-grid template.

## First-pass review criteria

Review the complete SPA before attempting pixel-level perfection.

1. Are Workspace responsibilities still separated?
2. Does Narrow retain the same underlying capabilities?
3. Is the legacy AF isolated behind a replaceable boundary?
4. Does the product visually read as Vesria rather than a reskinned Atlament MPA?
5. Are Glass/Liquid/Plasma semantics understandable in use?
6. Are route/content transitions pleasant but restrained?
7. Is the user always able to understand current location and actionable controls?
8. Are mutations deliberate and safe?
9. Does the application remain usable with Reduced Motion?
10. Most importantly: is Vesria pleasant and playful to touch without becoming noisy?
