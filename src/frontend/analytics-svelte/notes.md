# Svelte Analytics Notes

## Scope

- Framework: Svelte + TypeScript + Vite
- Screen: Analytics
- Purpose: Validate Svelte component syntax, shared package usage, and vanilla ApexCharts lifecycle integration.

## Implemented

- Monthly workout summary
- Sets / volume trend
- Body Part summary
- Machine frequency shortcuts
- PR trend candidate count from `workout-core`
- ApexCharts via vanilla API with `onMount` / `onDestroy`
- Shared data/core/types/design-token usage

## Deliberate shortcuts

- Uses runtime master/workout data loaded through `@workout-lab/workout-data`.
- PR rules are intentionally simple until real training data clarifies stricter record semantics.
- Links to `/dashboard/` and `/exercises/:id` assume future MPA integration.

## First impressions

- Svelte keeps the page compact for derived display values.
- Vanilla ApexCharts integration is explicit: mount, render, destroy.
- The absence of a wrapper means lifecycle ownership is clearer but slightly more manual.
