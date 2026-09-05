# Atlament v3.0.0 — Portal Design Baseline

## 1. Positioning

Portal is the entry point to Atlament.

It is not one of the screens contained inside the Application Shell.  
When the user moves from Portal to an application, the Application Shell is applied.  
When the user returns to Portal from the Shell, the Shell itself is removed.

```text
Portal
  ↓
Application Shell
  ├─ Dashboard
  ├─ Workout
  ├─ Performance
  ├─ Analytics
  ├─ Resource Management
  └─ Settings
```

The Portal mock is adopted as the v3.0.0 visual and layout baseline.

The mock is not a pixel-perfect final specification.  
Its role is to define the intended visual direction, layout hierarchy, and overall interaction model.

---

## 2. Portal Responsibility

The main responsibility of Portal is to act as an application entry point.

Portal should not become a second Dashboard.

Its primary role is:

```text
Portal
└─ Select where to go
```

Application-level data visualization, operational controls, analytics details, resource management operations, and similar domain-specific functionality remain inside each application screen.

---

## 3. Layout Structure

The Portal baseline structure is:

```text
Portal
├─ Hero / Brand Area
└─ Application Launcher
   └─ Application Card × N
```

### Hero / Brand Area

The upper area of the Portal is responsible for Atlament brand expression and entry-page identity.

It may use stronger visual expression than the Application Shell because Portal is the product entry surface rather than an operational workspace.

### Application Launcher

The launcher provides direct access to the main Atlament applications.

```text
Application Launcher
├─ Dashboard
├─ Workout
├─ Performance
├─ Analytics
├─ Resource Management
└─ Settings
```

The launcher is the primary functional content of Portal.

Application Cards should remain focused on navigation and lightweight context rather than becoming miniature versions of each application.

---

## 4. Relationship with Application Shell

Portal and Application Shell use separate layouts.

```text
Portal Layout
    ↓ application selected
Application Shell Layout
    ↓ Portal selected from Navigation
Portal Layout
```

Portal is therefore not rendered inside the Shell Main Surface.

The Portal route in the Shell Navigation means:

> Return to Portal

It does not mean:

> Open another Shell screen

---

## 5. Visual Direction

The existing Portal mock is the baseline for v3.0.0.

The following principles apply:

- Portal may have stronger visual expression than the Application Shell.
- Atlament branding should be visually clear.
- Green remains the primary brand direction.
- Rounded surfaces, typography, spacing language, and motion may align with the Application Shell.
- Portal and Shell may share visual language without sharing the same layout.
- Portal should remain visually soft and approachable.
- Decorative expression is acceptable where it supports the entry-point role.
- Visual decoration should not reduce launcher clarity or usability.

Conceptually:

```text
Application Shell
Brand Expression: moderate

Portal
Brand Expression: stronger
```

---

## 6. Mock Handling

The Portal MHTML mock should be treated as:

- Visual reference
- Layout reference
- Interaction-direction reference
- Responsive baseline

It should not be treated as:

- Final DOM structure
- Final CSS architecture
- Fixed spacing specification
- Fixed breakpoint specification
- Exact typography specification
- Pixel-perfect implementation contract

Detailed values may be adjusted during implementation.

---

## 7. Responsive Policy

Responsive behavior shown in the mock is used as the initial baseline.

At this design stage, exact card widths, column counts, breakpoints, spacing values, and font scaling do not need to be fixed.

The implementation must preserve the following structural behavior:

- Portal remains usable on Desktop, Tablet, and Mobile.
- Hero and Launcher hierarchy remains clear.
- Application access remains obvious.
- Cards may reflow according to available width.
- Responsive adjustment must not introduce unnecessary information loss.

Exact layout tuning is an implementation concern.

---

## 8. Application Cards

Application Cards represent application entry points.

Each card should primarily communicate:

- Application identity
- Lightweight purpose / description
- Navigation affordance

Cards should not accumulate domain-specific controls or data-heavy content.

The exact card text, icon treatment, hover behavior, and motion may be adjusted during implementation.

---

## 9. Shared Visual Language with Shell

Portal and Application Shell are separate layouts but should feel like the same product.

Shared visual language may include:

- Primary Green
- Atlament Logo usage
- Typography
- Rounded surface treatment
- Elevation / shadow language
- Motion style
- Icon language
- General spacing rhythm

Shared visual language does not imply shared layout components.

---

## 10. Implementation Principles

1. Keep Portal independent from the Application Shell layout.
2. Preserve Portal's responsibility as an entry point.
3. Do not turn Portal into another Dashboard.
4. Treat the Portal mock as the design baseline rather than a final implementation specification.
5. Preserve clear access to all main applications.
6. Allow stronger brand expression than operational application screens.
7. Keep responsive details adjustable during implementation.
8. Prefer clarity of navigation over decorative complexity.
9. Keep Portal and Shell visually related without forcing shared structural components.
10. Refine implementation details only where actual source structure or runtime behavior requires it.

---

## 11. Current Decision Status

| Item | Status |
|---|---|
| Portal role | Decided: Atlament entry point |
| Relationship to Shell | Decided: outside Application Shell |
| Portal layout | Portal-specific layout |
| Visual baseline | Existing Portal mock |
| Primary structure | Hero + Application Launcher |
| Application access | Launcher Cards |
| Dashboard-like content | Not added by default |
| Visual expression | Stronger than Shell allowed |
| Shared visual language with Shell | Yes |
| Responsive baseline | Mock behavior |
| Exact spacing / breakpoints | Implementation-time adjustment |
| Exact card text / motion | Implementation-time adjustment |
| Portal mock | Reference, not pixel-perfect final spec |
