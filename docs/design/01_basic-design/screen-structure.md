# Screen Structure

Atlament は、独立した screen application を組み合わせた multi-page frontend application である。

| Route | Application | Framework | Responsibility |
|---|---|---|---|
| `/` | Portal | Vanilla JavaScript | Entry surface と application launcher |
| `/dashboard/` | Dashboard | React | 現在の workout summary と recent overview |
| `/workouts/` | Workout Domain | Vue 3 | Workout history list |
| `/workouts/:date` | Workout Domain Detail | Vue 3 | 指定日の session |
| `/machines/` / `/machines/:id` | Performance Detail | Angular | Machine-specific performance history |
| `/analytics/` | Analytics | Svelte | Long-term aggregate analytics |
| `/settings/` | Application Settings | SolidJS | AF status、configuration、credential、sync operation |
| `/maintenance/` | Master Maintenance | Vue 3 + Vuetify | Gym/Machine Master maintenance and unresolved reference resolution |
| `/404.html` | Error Page | Static HTML | Not found |
| `/500.html` | Error Page | Static HTML | Internal server error |
| `/503.html` | Error Page | Static HTML | Service unavailable |

## Navigation

Portal は独自 header を持ち、shared navigation drawer は付与されない。

Dashboard、Workout Domain、Performance Detail、Analytics、Application Settings、Master Maintenance は `frontend-common` から shared navigation を受け取る。Shared navigation は desktop drawer と mobile header/drawer を生成する。Route metadata は現時点で 7 つの application ID、`portal`、`dashboard`、`workouts`、`machines`、`analytics`、`settings`、`maintenance` を含む。

## Routing

現行 hosted MPA contract で dynamic frontend route を持つのは Workout Domain と Performance Detail のみである。

- `/workouts/:date`: `:date` は `YYYY-MM-DD` に一致する。
- `/machines/:id`: `:id` は alphanumeric ID に `_` または `-` を含めた形式に一致する。

Dashboard、Analytics、Settings 配下のその他 nested path は、preview および AF hosting では not found として扱われる。

## Error Pages

404、500、503 page は個別の static source である。保存済み theme と branding state は initialize するが、shared navigation drawer と Character Easter Egg は使用しない。
