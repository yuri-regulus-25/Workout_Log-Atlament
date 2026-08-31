# Technology Stack

## Repository

Repository は Node/npm workspace であり、frontend application を `src/frontend/*`、shared package を `src/shared/*` 配下に持つ。

Root script は build、test、preview、validate、package、version 管理を行う。

## Frontend

| Application | Technology |
|---|---|
| Portal | Vanilla JavaScript / HTML / CSS |
| Dashboard | React + TypeScript + Vite + ApexCharts |
| Workout Domain | Vue 3 + TypeScript + Vite + Vue Router |
| Performance Detail | Angular + TypeScript + ng-apexcharts |
| Analytics | Svelte + TypeScript + Vite + ApexCharts |
| Application Settings | SolidJS + TypeScript + Vite |
| Error Pages | Static HTML / CSS / JavaScript module imports |

Shared frontend technology:

- Material Design Icons via `@mdi/font`
- CSS custom properties from `@workout-lab/design-tokens`
- shared CSS from `@workout-lab/shared-styles`

## Native Application Framework

Windows:

- .NET 8
- Windows Forms
- WebView2
- ASP.NET Core / Kestrel
- SQLite logging
- DPAPI credential protection

Android:

- Kotlin
- Android WebView
- In-app localhost HTTP server
- Android Keystore-backed credential encryption
- SQLite logging
- APK assets for frontend artifacts

## Validation and Tests

現行 Test は以下を含む。

- `vitest` for `workout-core` and `workout-data`
- real data validation against `data/master` and `data/workouts`
- Windows AF unit tests
- MPA route smoke checks
- Svelte check for Analytics
- version consistency check
