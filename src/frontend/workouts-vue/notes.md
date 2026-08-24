# Vue Spike Notes

## Scope

- Framework: Vue 3 + TypeScript + Vite
- Screen: Workout History
- Purpose: Verify component syntax, reactivity, state updates, ApexCharts integration, and simple table integration.

## Implemented

- Workout History
- Workout Detail
- Fixed workout data display
- Component split
- Machine filter with `v-model`
- Summary cards driven by computed values
- Vue table
- table sort / pagination
- Row selection reflected in `/workouts/:date` navigation

## Deliberate shortcuts

- Uses runtime master/workout data loaded through `@workout-lab/workout-data`.
- Real JSON / JSONL is fetched at screen load time instead of being converted into a browser bundle.
- Uses shared types from `@workout-lab/workout-types`.
- Uses derived calculations from `@workout-lab/workout-core`.
- Uses CSS tokens from `@workout-lab/design-tokens`.
- Uses `vue-router` for `/workouts/` and `/workouts/:date`.
- Keeps Vue scoped to the Workout History / Detail domain in line with the design draft.
- Project-root `index.html` is a Vite entry file and is not meant for `file://` direct opening.

## First impressions to validate later

- Vue `computed` and `v-model` are a good fit for filter-driven UI.
- `vue-router` expresses the intended `/workouts/` and `/workouts/:date` split cleanly.
- A plain Vue table is easier to keep stable for this MVP than AG Grid.
- The selected-row-to-detail navigation is a useful comparison baseline for the real Workout History screen.
