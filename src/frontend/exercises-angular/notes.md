# Angular Machine Detail Notes

## Scope

- Framework: Angular + TypeScript
- Screen: Machine Detail
- Purpose: Validate Angular standalone component, Signals, shared package usage, and ApexCharts integration.

## Implemented

- Machine selector
- Latest / Best Weight / Estimated 1RM / Total Sets summary
- Progress chart via `ng-apexcharts`
- Machine history table
- Links back to `/workouts/`
- Shared data/core/types/design-token usage

## Deliberate shortcuts

- Uses runtime master/workout data loaded through `@workout-lab/workout-data`.
- Parses `/exercises/:id` from `window.location.pathname` for this first domain slice instead of adding full Angular routing.
- Machine List remains intentionally absent, per design.

## First impressions

- Signals make derived summary values explicit and readable.
- Angular has more ceremony than React/Vue, but the screen structure is stable once set up.
- `ng-apexcharts` integration is straightforward in a standalone component.
