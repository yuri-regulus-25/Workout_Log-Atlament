# Data Overview

Atlament は 2 種類の data category を使用する。

- Master Data: gym と machine の reference data。
- Workout Data: JSON または JSONL として保存される raw workout session。

現行 data は `data/` 配下に保存される。

```text
data/
├─ master/
│  ├─ machines.json
│  └─ gyms.json
└─ workouts/
   └─ <year>/<month>/<date>.json | .jsonl
```

## Master Data

現行 Master Data は 2 つの file を持つ。

- `data/master/gyms.json`
- `data/master/machines.json`

現行には Machine entity file、Body Part entity file、Main Gym setting は存在しない。Gym/Machine record は `active` と logical delete field `deleted` を使用する。

## Workout Data

Workout file は `gym_id` と `machine_id` reference を持つ raw session を含む。Display name と body part は Workout Log file には保存されず、Master Data から resolve される。

1 つの JSON file は 1 session を表現できる。JSONL file は 1 行ごとに 1 session を表現し、1 日に複数 session を持てる。

## Runtime Data

AF と Node development runtime は raw data を `WorkoutSession[]` へ normalize する。Normalized model は resolved `gym` と machine display field を埋め込むため、frontend application は Master JSON を直接読む必要がない。

Frontend 視点では Runtime Data は read-only である。
