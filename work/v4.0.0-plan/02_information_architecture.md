# Vesria — Information Architecture Draft

> Status: IA first-pass snapshot  
> Scope: successor architecture / major screen-domain restructuring  
> Detailed UI, charts, filters, animations, and mutation implementation are intentionally deferred.

## 0. System identity

**System name: Vesria（ヴェスリア） — FIX**

Vesria is the successor system to Atlament. It is not treated as an Atlament v4 product identity.

Atlament remains the predecessor/current completed system. Vesria may inherit validated Data / Domain Contracts and mature design decisions, but its presentation architecture, UI/UX, application composition, and system identity are reconstructed.

Version numbering for Vesria is a separate decision and is not fixed by this document.

> Naming note: use **Vesria** in new design context. Do not use `Atlament v4` or `New System` as the product name.

## 1. Core direction

Vesria is treated as one responsive SPA runtime composed of clearly separated workspaces/domains.

v3 screen boundaries are not preserved merely because they already exist. Screen boundaries are reconsidered from:

- **Data** — what data is used
- **Scope** — what range/entity is observed
- **Presentation** — how that data is presented and interacted with

If Data / Scope / Presentation are substantially the same, views are strong merge candidates. If the interaction model or responsibility differs materially, the view remains separate.

> The same Workout Log is observed and operated on through different axes within one SPA.

## 2. Current top-level IA

```text
Vesria SPA
│
├─ Entry
├─ Overview
├─ Workout
├─ Machine-oriented View
├─ Analysis
├─ Explore
├─ Resources
└─ Settings
```

System Information and Error/System States exist, but are not independent product applications.

---

## 3. Entry

**Responsibility:** System Entry Experience.

`/` is no longer a Portal/application launcher. It provides product identity, boot/entry experience, entry animation, and handoff into the primary application experience.

It does **not** own Workout summaries, Dashboard business logic, CRUD, Settings, or launcher functionality.

The normal landing destination is expected to be Overview. Direct navigation to an application route should not require replaying Entry.

**Decision:** old Portal is retired and redefined as Entry Experience.

---

## 4. Overview

**Responsibility:** a broad, curated view of the accumulated Workout Log.

Mental model:

> 「全体的なログの情報から、どうなってるだポン？」

Overview is not primarily a recent-workout status screen and should not invent judgments such as whether training is sufficient, effective, improving, or falling behind.

Direction:

- Broad and glanceable
- Visually rich
- Chart-heavy presentation is welcome
- Multiple chart types are desirable
- Facts and deterministic aggregates only
- Exact cards/charts/content are **not yet decided**

Version/build information may be exposed through a lightweight System Information dialog rather than an About page.

---

## 5. Workout Workspace

**Responsibility:** Workout Log browsing and mutation using the **Session axis**.

```text
Workout Workspace
├─ Read
│  ├─ Workout History
│  └─ Session Detail
└─ Mutation
   ├─ Create
   ├─ Update
   └─ Delete
```

Individual sessions are identified by `session_id`. Date is an attribute for display/filtering/grouping, not the session identity.

Candidate routing:

```text
/workouts
/workouts/:sessionId
```

Read and CUD live in the same full Workspace while internal responsibilities remain separated.

```text
Edit / Create / Delete
        ↓
Validation
        ↓
Confirmation Dialog
        ↓
Execute
        ↓
Result
```

Rules:

- No immediate persistent/destructive operation from the initial action button
- CUD execution requires explicit confirmation
- Successful mutation produces a Snackbar
- Mutation failure should not unnecessarily discard editing state
- Unsaved-change handling is separate from persistence
- A user-facing Draft domain concept is not required

Recovery is not an independent user-facing domain by default. The previous repair/recovery workflow is reconsidered during detailed mutation design. If Recovery is effectively Edit, a separate Recovery UI may be unnecessary.

---

## 6. Machine-oriented Workout View

**Responsibility:** observe Workout Log through the **Machine axis**.

The primary subject is **Workout Log associated with a Machine**, not Machine Master itself.

```text
Machine Master ─────┐
                    │ reference
                    ▼
Workout Log ─────→ Machine-oriented View
```

Conceptual capabilities:

- Browse/select Machine
- Machine-specific Workout history
- Visualization
- Execution comparison

Candidate routing:

```text
/machines
/machines/:machineId
```

The previously planned standalone Compare feature is absorbed here. Existing comparison constraints remain important, including avoiding misleading cross-machine or incompatible Gym/Machine comparisons.

**Machine Master CUD does not belong here.** Master data is referenced to resolve metadata/relationships; mutation belongs to Resources.

---

## 7. Analysis Workspace

**Responsibility:** structured, query-driven investigation of Workout Log data.

```text
Overview
→ “What does my log broadly look like?”

Analysis
→ “What does the log look like under these conditions?”
```

Candidate conditions include Period, Gym, Machine, Body Part, and other explicitly supported dimensions.

### Monthly Report

A calendar month is a **period condition/preset** within Analysis.

**Decision:** Monthly Report → absorbed into Analysis.

### Training Map / Body Map

Training Map remains useful because its presentation and interaction model are distinct.

```text
Body Part
   ↓
Machine classification
   ↓
Workout facts
```

It remains grounded in explicit data relationships and must not infer stimulus, hypertrophy, effectiveness, or similar unsupported conclusions.

**Decision:** Training Map → absorbed into Analysis as a distinct Body Map view.

### Analytics Rework

The old Analytics screen is not preserved merely because it existed. v4 Analysis replaces/redefines the analytics concept.

Exact charts, filters, and internal views remain undecided.

---

## 8. Explore

**Responsibility:** a read-only, discovery-driven Workout Data Playground.

Explore remains independent because its interaction and presentation model differ materially from Analysis despite sharing underlying data.

```text
Analysis
→ Query-driven investigation

Explore
→ Discovery-driven exploration
```

Core interaction semantics:

- **Focus** — select the current exploration focus
- **Merge** — add a condition
- **Detach** — remove a condition
- **Result** — show data matching accumulated conditions

Spatial operations may correspond internally to ordinary deterministic query conditions.

Explore is the primary area where Plasma-centric spatial interaction may become the UI itself.

Explore must not invent unsupported semantic entities. Exploration is grounded in recorded data and explicit relationships such as Machine, Session/`session_id`, Gym, Date/Period, Weight, Reps, Notes, Body Part where explicitly defined, and deterministic results.

**Mutation: none. Explore is read-only.**

Merge/Detach/Focus modify query/view state, not persisted Workout or Master data. Results may navigate to their authoritative domain.

---

## 9. Resources

**Responsibility:** manage Master Resources referenced by Workout Log.

The former Resources Maintenance application is reduced to its actual Master-data responsibility.

```text
Resources
├─ Machine Master
│  ├─ Browse
│  ├─ Create
│  ├─ Update
│  └─ Delete / lifecycle operation
└─ Gym Master
   ├─ Browse
   ├─ Create
   ├─ Update
   └─ Delete / lifecycle operation
```

Candidate route: `/resources`

Resources owns Master data. It does **not** own Workout Session/Set mutation. Workout history management moves to Workout.

Generic write recovery is not a Resource-domain responsibility merely because the old UI placed it there. Write-result ambiguity/recovery is a mutation/infrastructure concern.

Resource CUD follows the same operation principles: Validation → Confirmation Dialog → Execute → Snackbar on success / appropriate failure handling.

Detailed logical-delete/reference-integrity behavior is deferred.

---

## 10. Settings

**Responsibility:** Application **Runtime / Connection Configuration** required to operate Vesria.

Settings survives because Vesria has genuine operational configuration, not merely cosmetic preferences.

Examples:

- GitHub credential/token
- Repository configuration
- Active data branch
- Other required connection/runtime configuration

```text
Settings
└─ Runtime / Connection Configuration
   ├─ Credential
   ├─ Repository
   └─ Branch
```

These values affect the application as a whole and do not belong to Workout, Analysis, Resources, or another data workspace.

Credential handling requires dedicated security consideration. Detailed credential storage design is deferred.

Not Settings:

- Machine/Gym Master → Resources
- Main Gym, if represented as Gym Master data → Resources
- Version/build/license → System Information
- Development/debug controls → development tooling

Production Visual Playground-style tuning may remain as a personal-interest backlog item.

**Priority: VeryVeryVeryLOW. 握り寿司。**

---

## 11. System Information / About

A standalone About application is not required.

Useful information is small: Version, Build/revision, possibly Environment, and License/copyright where useful.

Expose it through a lightweight System Information dialog or similar interaction.

**Decision:** standalone `/about` is removed. The information survives; the page does not.

---

## 12. Error and System States

v4 does not preserve separate static 404/500/503 pages merely because v3 had them.

Error presentation is based on the **scope and nature of failure**, not only an HTTP status code.

```text
System State
├─ Route Not Found
├─ Feature/Application Error
├─ Data Error
├─ Mutation Error
└─ Fatal Application State
```

- **Route Not Found:** SPA router Not Found view
- **Feature failure:** local Error Boundary / Error Surface where possible
- **Data failure:** missing/invalid required data must not be silently represented as valid empty data
- **Mutation failure:** handled within the relevant mutation workflow
- **Fatal failure:** dedicated fallback only when the Application Root cannot remain functional

```text
Missing Machine Master
≠
Zero Machines
```

**Decision:** standalone static 404/500/503 pages are dismantled in favor of shared SPA System State architecture.

---

## 13. Absorbed / retired concepts

```text
Portal
→ Entry Experience

Dashboard
→ Overview

Workout History Manager
→ Workout Workspace

Standalone Compare
→ Machine-oriented View

Monthly Report
→ Analysis period capability

Training Map
→ Analysis Body Map view

Analytics / Analytics Rework
→ Vesria Analysis Workspace

Resources Maintenance
→ Resources

Recovery / Draft UI
→ no guaranteed standalone user-facing concept; reconsider in mutation design

About page
→ lightweight System Information interaction

Static 404 / 500 / 503 pages
→ shared SPA System States
```

---

## 14. IA snapshot

```text
Vesria SPA
│
├─ Entry
│  └─ System Entry Experience
├─ Overview
│  └─ Broad Workout Log overview
├─ Workout
│  └─ Session-axis Read + CUD
├─ Machine-oriented View
│  └─ Machine-axis History + Visualization + Compare
├─ Analysis
│  └─ Structured conditions + Monthly + Body Map
├─ Explore
│  └─ Spatial / discovery-driven read-only exploration
├─ Resources
│  └─ Machine / Gym Master Management
└─ Settings
   └─ Runtime / Connection Configuration

Shared / non-application concerns
├─ System Information Dialog
├─ Error / System State architecture
├─ Design System
└─ Mutation / write infrastructure
```

---

## 15. Application Structure

Vesria is a **responsive SPA**. Responsive behavior is an application-wide architectural premise, not a later desktop-layout adaptation.

```text
Vesria Application Root
│
├─ Global Runtime                         [persistent]
│  ├─ Runtime Configuration
│  ├─ Data Access / Repository
│  ├─ Routing
│  └─ Global Error Handling
│
├─ Persistent Presentation
│  ├─ Ambient Visual Layer
│  ├─ Global Navigation responsibility
│  └─ Global UI Hosts
│     ├─ Dialog
│     ├─ Snackbar
│     └─ Error / System State
│
└─ Route Presentation
   ├─ Entry Experience
   └─ Main Application Workspaces
```

The old Atlament Shell is **not** the architectural starting point. Persistent/global concerns are identified independently first. A future layout component may use a Shell pattern if useful, but Vesria architecture does not require a monolithic `<Shell>` abstraction.

Runtime Configuration is application state consumed by data access and other global concerns. Settings is the UI used to configure it; Settings does not own the runtime state itself.

The Ambient Visual Layer is persistent across normal route transitions so that the Vesria visual space does not reset with each workspace. Route-specific semantic/interactive visual layers may be added without redefining the global ambient layer.

Global Navigation is a responsibility with a responsive presentation model.

### Global Navigation Architecture — FIX

Global Navigation identifies the current top-level Workspace and navigates between top-level Workspaces.

- Identity: Vesria Symbol
- Primary: Overview, Workout, Machine-oriented View, Analysis, Explore
- Management: Resources, Settings
- Wide / Medium: persistent lightweight Rail.
- Narrow: upper-left Floating Glass Symbol Trigger opens an on-demand Floating Navigation Overlay.
- Bottom Navigation/Menu is not used.
- Entry and System Information are not Global Navigation destinations.
- Workspace-local selection, filters, internal views, and actions remain Workspace Navigation.
- Data-driven cross-workspace transitions are Contextual Navigation.
- Active state follows the owning top-level Workspace, not the exact child route.
- The Rail identity symbol may host a non-functional local sparkle delight interaction. The Narrow symbol is a navigation control and does not use that interaction.
- Icon-only navigation must retain accessible labels and semantics.

### Responsive principles — FIX

- Vesria is responsive across the application.
- Application structure must not assume one desktop resolution.
- Workspace responsibility/data capability must not disappear merely because the viewport becomes narrow.
- Composition, layout, density, and interaction presentation may change responsively.
- Responsive design adapts **presentation**, not the underlying domain capability.

---

## 16. Entry in the Application Structure

Entry is an application boundary/experience, not a business-data Workspace.

The Vesria Application Root already exists while Entry is presented. Entry does not bootstrap a separate application runtime.

```text
Direct /
Application Root
└─ Entry Experience
   └─ Handoff → /overview

Direct /overview
Application Root
└─ Overview
```

Consequences:

- Direct application routes do not require replaying Entry.
- Global Runtime persists through Entry → Main Application handoff.
- Ambient Visual Layer may already exist during Entry and remain continuous after handoff.
- Global UI hosts may exist structurally during Entry even when not actively presented.
- Global Navigation capability exists, but its presentation is hidden during Entry and presented responsively in the Main Application.
- Exact Entry exit trigger, animation sequence, timing, reduced-motion behavior, and transition choreography are deferred to UX/motion design.

Entry → Overview should be treated as a continuous SPA presentation-state transition rather than destruction and recreation of the Vesria visual environment.

---

## 17. Route Architecture — FIX

Routes identify the current Workspace and, where useful, an addressable Domain Entity. Filters, dialogs, visual modes, and other presentation state are not promoted into path segments by default.

```text
/
├─ /overview
├─ /workouts
│  └─ /workouts/:sessionId
├─ /machines                  [segment name TBD]
│  └─ /machines/:machineId
├─ /analysis
├─ /explore
├─ /resources
├─ /settings
└─ * → Route Not Found
```

Principles:

- Root is Entry and is not a normal Global Navigation destination.
- Workout session routes remain owned by the Workout Workspace.
- The Machine-oriented route structure is fixed, while its final segment/name remains deferred.
- Analysis and Explore internal state remains Workspace State unless a later deep-link/share requirement justifies serialization.
- Workout Create/Edit routes and Resource entity child routes are added only if detailed interaction design requires addressability.
- System Information, dialogs, and local/fatal error presentation are not normal product routes.
- Route = Workspace/addressable Domain Entity; Workspace State = filter/selection/view; Presentation State = dialog/animation/expanded visual state.

---

## 18. Motion / Interaction Language — FIX

Vesria intentionally uses motion as part of its UX identity: pleasant, playful, and responsive without allowing animation to obscure state, delay operation, or become visually noisy.

### Material model

- **Glass:** stable / formed / informational.
- **Liquid:** transition / expansion / collapse / material transformation.
- **Plasma:** interactive / dynamic / expressive.
- **Particle / Constellation:** persistent spatial / ambient language.

Governing model: **Glass is stable; Liquid is transitioning; Plasma is interactive.**

### Motion families

- **Ambient Motion:** slow persistent particle/constellation motion, visually subordinate to content.
- **Material Motion:** Glass/Liquid expansion, collapse, formation, and related transformations.
- **Content Formation:** Glass surfaces and important uncontained content such as Workspace titles, section headings, and supporting text may enter with restrained fade/cut-in/offset motion. Plasma is not mechanically subject to this entrance rule.
- **Interaction Feedback:** restrained local response to taps, selection changes, Snackbar formation, active indicators, and similar actions.
- **Route Transition:** when navigating between top-level Workspaces, the current Route Presentation exits toward the left, the new Workspace starts from its initial scroll position, and its content forms into the persistent Vesria visual environment.
- Browser history navigation, including Back/Forward, uses the same restrained leftward Route Presentation transition rather than bypassing the motion language.

The persistent Application Root, Ambient Visual Layer, and Global Navigation are not destroyed with each Route Presentation transition. The intended perception is that the Workspace changes inside the same Vesria space.

Dialogs and other transient surfaces should use restrained formation/dismissal animation where practical. Exact Dialog visual design and choreography remain subject to later iterative review.

### Motion guardrails

- Motion communicates state change and pleasant interaction; it must not become a prerequisite for understanding or completing an action.
- Avoid meaningless continuous movement of normal Glass content, excessive full-screen choreography, text motion without purpose, and animation that interferes with scrolling or input.
- Repeated viewport entrance behavior must not become distracting; exact replay/stagger policy is deferred.
- Reduced-motion support is required. Large movement, morphing, stagger, and ambient motion must be reducible or replaceable with simpler transitions.
- Exact durations, easing curves, Motion Tokens/Primitives, and per-component choreography are deferred to detailed Motion Design.

---

## 19. System Symbol / Identity Asset

**Vesria Full Symbol — FIX.**

The selected symbol direction is a constellation/node abstraction derived primarily from the higher-information-density orbital concept, with Node/Edge relationships incorporated into the star-map composition.

Identity principles:

- abstract constellation / orbital composition
- Node / Edge / Particle coexistence
- asymmetric visual balance
- sufficiently rich information density rather than an extremely minimal corporate mark
- no direct fitness/dumbbell/muscle motif
- SVG is the canonical vector asset format
- symbol must remain usable without glow/filter effects and support external color control

The Full Symbol is the canonical rich form. Compact and Micro variants are deferred as LOD reductions for smaller contexts such as navigation, app icons, and favicon usage. Motion treatment is deferred until Entry design.

---

## 20. Deliberately unresolved

The following are intentionally **not fixed by this document**:

- Final navigation labels
- Final name for the Machine-oriented view
- Detailed Overview contents
- Exact Analysis filters/views
- Exact charts and chart types
- Detailed Workout editor structure
- Recovery implementation
- Credential persistence mechanism
- Resource delete/lifecycle behavior
- Detailed implementation shape of the Application Root / layout components; the legacy Shell is retired and a new Shell abstraction is not assumed
- Exact motion timing/easing, replay/stagger policy, and per-component choreography
- Exact Glass/Liquid/Plasma usage per component
- Explore node/edge / data-constellation presentation concept
- Final color direction (including the newly considered colder cyan/ice-blue direction)
- Exact System Information trigger/location
- Production visual tuning controls (VeryVeryVeryLOW priority)

Resolve these in subsequent design passes without reopening the high-level responsibility boundaries unless new requirements justify it.
