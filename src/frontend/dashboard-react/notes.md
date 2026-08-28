# React Dashboard Notes

## Scope

- Framework: React + TypeScript + Vite
- Screen: Dashboard
- Purpose: Validate React integration with shared workout packages and ApexCharts.

## Implemented

- Monthly Summary cards
- Latest Workout card
- Recent Workouts links
- Machine shortcuts
- Recent PR candidates from `workout-core`
- Training Frequency chart
- Volume trend chart
- Shared data/core/types/design-token usage

## Deliberate shortcuts

- Uses runtime master/workout data loaded through `@workout-lab/workout-data`.
- Links to `/workouts/`, `/workouts/:date`, `/machines/:id`, and `/analytics/` assume future MPA integration.
- Dashboard remains read-only.

## First impressions

- React + ApexCharts is straightforward, but the chart dependency dominates the bundle.
- Keeping calculations in `workout-core` makes the component mostly presentation-focused.
