# Vesria Explore / Bobble Interaction — Design Fix

Status: **Basic interaction model fixed**  
Scope: Explore Workspace / Bobble Material  
Implementation details and library selection remain provisional.

## 1. Explore identity

Explore remains a first-class Vesria workspace.

Its purpose is not to compete with Workout or Analysis as an efficient retrieval/query surface.

> **Explore = Workout Dataで遊ぶ場所。**

- Analysis: 知りたいことがある → 調べる
- Explore: 別に知りたいことはない → 触る → 偶発的に何かを見つける

Curiosity, encounter, and discovery are valid product value for this workspace.

## 2. Plasma decision

**Plasma is dropped from Vesria.**

Explore must not be designed around Plasma or any other implementation technique.  
The interaction is designed first; rendering technology is selected afterward.

Glass and Liquid remain part of the Vesria visual/material language.

## 3. Bobble concept

A **Bobble** is a selectable fragment of Workout Data presented inside Explore.

Bobble is not intended to model every searchable field. It represents structured dimensions that are recognizable and useful for playful combination.

Each Bobble displays its identity directly:

`Type: Value`

Examples:

- `Period: 2026/09`
- `Machine: Pec Fly`
- `Gym: 汐入`
- `Body Part: 肩`

Type may be visually quieter than Value, but the text itself must remain stable and readable.

## 4. Bobble Types

The initial set is fixed to four types.

### 4.1 Period

One candidate pool contains both relative periods and calendar months.

Relative candidates are based on the Explore launch date:

- 1 month
- 2 months
- 3 months
- half-year
- 1 year

Calendar-month candidates use `yyyy年M月` / equivalent presentation and include only months containing at least one Workout Session.

The exact boundary convention for relative periods is not yet fixed.

### 4.2 Machine

Candidate pool:

> Machines that have appeared in Workout Log at least once.

- active: eligible
- inactive: eligible
- deleted: eligible
- master-only / zero Workout Log usage: excluded

Historical data remains valid Explore material even when the current master state has changed.

### 4.3 Gym

Candidate pool:

> Gyms that have appeared in Workout Log at least once.

- active: eligible
- inactive: eligible
- deleted: eligible
- `main`: irrelevant to eligibility
- master-only / zero Workout Log usage: excluded

### 4.4 Body Part

Candidate pool:

> Body Parts resolvable from Machines that actually appear in Workout Log.

A Body Part defined by the domain but never represented by a used Machine is excluded.

Historical inactive/deleted Machines may still contribute when the Body Part can be resolved correctly.

## 5. Candidate Area

For the currently chosen Bobble Type:

- all eligible values form the candidate pool
- a subset is displayed randomly
- displayed candidates must not duplicate each other
- Refresh replaces the visible subset with another random subset
- initial selection logic does not need smart weighting

When a candidate Bobble is selected:

1. it leaves the Candidate Area
2. a new candidate may be replenished from the pool
3. the selected Bobble becomes part of the selected-condition state

The Candidate Area is the place for **encountering things not yet selected**.

## 6. Selection logic

Selection semantics are implicit in Bobble Type grouping.

> **Same Type = OR**  
> **Different Types = AND**

Example:

```text
(1 month OR 2026年8月)
AND
(Pec Fly OR Chest Press)
AND
(汐入 OR みなとみらい)
AND
(Chest)
```

The UI does not expose an AND/OR query-builder control.

Overlapping Period conditions are valid. Overlap does not cause duplicate Session counting; the result is based on unique matching Sessions.

## 7. Selected Graph

Selected Bobbles are visualized in a **Graph Dialog**.

The Graph is not a permanently visible workspace surface because it is primarily a way to inspect and manipulate the current mixture of selected conditions.

Responsibilities:

- visualize the Bobbles currently selected
- make their Type/value relationships legible
- provide condition inspection/removal interaction

The Graph may grow visually as Bobbles are selected, but it does not need to become a direct-manipulation editor.

### Bobble interaction inside the Graph

For a Bobble in the Graph:

1. first click → focus the Bobble and show Condition Detail
2. second click on the same focused Bobble → remove/deselect it

Selecting another Bobble transfers focus and shows that Bobble's Condition Detail.

### Condition Detail

Condition Detail explains the selected condition; it is not an analysis/result panel.

Keep it approximately to:

- Type
- Value
- short explanation of what the condition means

Example:

```text
BODY PART
肩

この部位に分類されたマシンを含む
セッションを探します。
```

Do not inflate it with result counts, last-used dates, machine lists, or other analysis facts unless the design is explicitly revisited.

## 8. Bobble Material

Bobble becomes a third Vesria visual/material model.

| Model | Semantic role |
| --- | --- |
| Glass | Stable Surface / Information |
| Liquid | Action / Change / Transition |
| Bobble | Selectable Data Fragment / Concept |

Bobble must not become merely a rounded Glass card or conventional filter chip.

### Visual behavior

Bobble should feel like a small object containing a fragment of data.

Desired qualities include:

- soft / slightly irregular body rather than strict geometric pill
- subtle surface-tension feeling
- Cyan/Ice emission or rim
- restrained internal glow
- moving surface highlight where appropriate
- slight deformation / restrained `ﾌﾟﾙﾝ`; motion is event-driven rather than continuously noisy
- playful generation motion such as a small `ﾎﾟﾖﾝｯ`
- focus/hover response
- continuity between Candidate Bobble and Graph Bobble

The important layer separation is:

```text
Bobble
├─ Effect / Shape Layer
│  ├─ deformation
│  ├─ glow
│  ├─ surface highlight
│  └─ generation / focus motion
└─ Content Layer
   └─ Type: Value
```

The **Effect / Shape Layer may move**.  
The **Content Layer must remain stable and readable**.

Do not distort, blur, or continuously shake the text for the sake of the effect.

## 9. Performance / implementation boundary

Graph and Bobble implementation technology is **not fixed** by this document.

Requirements:

- Android remains first-class
- Graph is mounted only when the Graph Dialog is needed where practical
- no sustained heavy rendering after the visual state has settled
- Reduced Motion must have an appropriate static/restrained representation
- library choice must follow the interaction, not define it
- verify behavior on Android before adopting a graph/effect package

Potential spike directions discussed, but **not approved dependencies**:

- lightweight 2D force/radial graph rendering
- SVG-based graph rendering
- lightweight gooey/metaball assistance for Bobble shape effects

If a package is heavier or less reliable than the value it provides, use a simpler CSS/SVG implementation instead.

## 10. Reactive Result

Explore has no explicit Search / Apply / Result button.

Selecting or removing a Bobble immediately updates the matching Session result.

- same-Type conditions remain OR
- different-Type groups remain AND
- changing the selected conditions resets Result pagination to Page 1
- matching Sessions are unique even when Period conditions overlap

### Initial state

When no Bobble is selected, do **not** display all Sessions.

Show a lightweight initial state such as:

> Bobbleを選んでみてね  
> 気になるデータを組み合わせると、Sessionがここに現れます。

### Result state

Matching Sessions appear as **Session Glass** near the Bobble interaction area.

- Glass represents the stable Workout Record produced by the current Bobble mixture
- maximum **20 Sessions per page**
- ordinary pagination is used; pagination itself does not become Bobble UI
- the Result updates reactively when selected conditions change
- Session Glass formation/removal may use restrained Vesria transition language

This creates the material flow:

```text
Bobble = selectable data fragment
  ↓ selection / condition change
Liquid = change / transition
  ↓
Glass = stable matching Session
```

### Empty state

When the current combination matches zero Sessions, show a normal Empty State.

Example:

> 一致するSessionがありません  
> Bobbleの組み合わせを変えてみてください。

Do not automatically relax conditions or introduce recommendation logic.

### Session Glass interaction

Clicking a Session Glass opens a **read-oriented Session Detail Dialog** inside Explore.

Do not navigate to Workout merely because the user wants to inspect a Session.

The Dialog may show the recorded Session facts needed to understand the record, including date/time, Gym, memo, Machines, Sets, Reps, and Weight as appropriate.

A deliberate `Workoutで開く` handoff may be considered later if editing or deeper Workout interaction is needed, but it is not required for the basic Explore flow.

The core interaction remains:

```text
Bobble Pick
  ↓ reactive
Session Glass
  ↓ click
Session Detail Dialog
  ↓ close
return to the same Explore context
```

## 11. Selected Graph layout

The Graph uses a **randomized radial / “ウニ” layout**.

A small empty Bobble acts as the visual Core. The Core does not carry text, counts, or application semantics; it simply binds the selected Bobbles visually.

Selected Bobbles radiate outward from the Core.

Layout qualities:

- radial rather than hierarchical
- angle and radius may vary slightly to avoid a rigid clock-like appearance
- Bobbles must not overlap
- thin Cyan/Ice connections extend from Core to each selected Bobble
- layout should feel organic but remain legible
- the same selected-condition state should remain visually stable where practical rather than reshuffling on every Dialog open

First implementation Spike:

> **SVG + d3-force**

The intended use is constrained: radial positioning, collision avoidance, restrained settling, then stop.

The graph must not run a perpetual force simulation merely for visual activity.

Graph Dialog lifecycle and condition changes are the natural times to perform layout work.

### Android performance gate

SVG + d3-force is a **Spike direction, not an unconditional dependency decision**.

Evaluate it on an actual Android device.

If the experience is visibly heavy, optimize or replace in roughly this order:

1. reduce Bobble visual/effect cost
2. reduce/stop unnecessary simulation and animation
3. use a simpler static radial/collision layout
4. replace the implementation/package if necessary

Do not pre-emptively remove the visual character before measuring the real implementation.

## 12. Bobble Motion

Bobble motion is intentionally restrained.

- appearance: small one-shot `ﾎﾟﾖﾝｯ`
- Pick: short `ﾌﾟﾙﾝ`
- focus/tap: subtle response
- idle: essentially still; slow highlight or extremely subtle shell motion is acceptable
- Graph: only the interacted/changed Bobble needs noticeable response
- text/content: stable

Bobble should feel alive without making a collection of Bobbles visually noisy.

## 13. Intentionally unresolved

The following remain open for later design:

- exact relative-period boundary semantics
- exact number of visible candidate Bobbles
- exact Condition Detail copy per Type
- final graph rendering implementation after Android Spike
- Bobble effect implementation/library
- exact Session Glass information density
- whether Session Detail exposes an explicit `Workoutで開く` handoff
- detailed motion timing and physics
- responsive Graph Dialog composition

These are implementation/detail-design questions and do not block the fixed basic interaction model above.
