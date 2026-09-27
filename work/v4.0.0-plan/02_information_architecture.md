# Atlament v4.0.0 — Information Architecture Draft

> Status: IA first-pass snapshot  
> Scope: v4 major screen/domain restructuring  
> Detailed UI, charts, filters, animations, and mutation implementation are intentionally deferred.

## 1. Core direction

Atlament v4 is treated as one SPA runtime composed of clearly separated workspaces/domains.

v3 screen boundaries are not preserved merely because they already exist. Screen boundaries are reconsidered from:

- **Data** — what data is used
- **Scope** — what range/entity is observed
- **Presentation** — how that data is presented and interacted with

If Data / Scope / Presentation are substantially the same, views are strong merge candidates. If the interaction model or responsibility differs materially, the view remains separate.

> The same Workout Log is observed and operated on through different axes within one SPA.

## 2. Current top-level IA

```text
Atlament v4 SPA
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

**Responsibility:** Application **Runtime / Connection Configuration** required to operate Atlament.

Settings survives because Atlament has genuine operational configuration, not merely cosmetic preferences.

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
- **Fatal failure:** dedicated fallback only when Shell/application cannot remain functional

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
→ v4 Analysis Workspace

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
Atlament v4 SPA
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

## 15. Deliberately unresolved

The following are intentionally **not fixed by this document**:

- Final route map
- Final navigation labels
- Final name for the Machine-oriented view
- Detailed Overview contents
- Exact Analysis filters/views
- Exact charts and chart types
- Detailed Workout editor structure
- Recovery implementation
- Credential persistence mechanism
- Resource delete/lifecycle behavior
- Navigation/Shell layout
- Animation/motion details
- Exact Glass/Plasma usage per component
- Exact System Information trigger/location
- Production visual tuning controls (VeryVeryVeryLOW priority)

Resolve these in subsequent design passes without reopening the high-level responsibility boundaries unless new requirements justify it.
