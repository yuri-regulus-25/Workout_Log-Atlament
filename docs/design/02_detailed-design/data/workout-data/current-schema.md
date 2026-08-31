# Workout Data 現行 Schema

Workout Log file は `data/workouts/` 配下にある。

```text
data/workouts/
└─ YYYY/MM/YYYY-MM-DD.json | YYYY-MM-DD.jsonl
```

1 つの JSON file は 1 session を保存する。JSONL file は 1 行ごとに 1 session を保存し、1 日が複数 session を持つ場合に使用される。

## Raw Session

Raw session の required field:

| Field | Type | Required | Notes |
|---|---|---|---|
| `schema_version` | number | yes | 現行 data は `1` を使用する。 |
| `session_id` | string | yes | Date からの auto-generation はない。 |
| `date` | string | yes | `YYYY-MM-DD`. |
| `status` | string | yes | `complete` or `partial`. |
| `gym_id` | string | yes | Gym Master reference。Runtime では `resolved` / `missing` / `deleted` として resolution を保持する。 |
| `machines` | array | yes | Machine list。 |
| `condition` | object | no | Optional session condition。 |
| `notes` | string[] | no | Optional session notes。 |

`complete` session は少なくとも 1 つの valid machine を必要とする。`partial` session は empty machine list を持てる。

## Raw Machine

| Field | Type | Required | Notes |
|---|---|---|---|
| `machine_id` | string | yes | Machine Master reference。Runtime では `resolved` / `missing` / `deleted` として resolution を保持する。 |
| `sets` | array | yes | Valid machine には少なくとも 1 つの valid set が必要。 |
| `notes` | string[] | no | Optional machine notes。 |

Workout file は machine display name または body part を保存しない。これらの field は Master Data から取得される。

## Raw Set

| Field | Type | Required | Notes |
|---|---|---|---|
| `set` | number | yes | Explicit set number。 |
| `weight_kg` | number | yes | kg 単位の weight value。 |
| `reps` | number | yes | Repetition count。 |
| `rir` | number or null | no | Optional。 |
| `failure` | boolean | no | Optional。 |
| `warmup` | boolean | no | Optional。 |
| `note` | string | no | Optional。 |

## Runtime Normalization

Normalized runtime session は `workout-types` の TypeScript `WorkoutSession` shape、および同等の Windows/Android AF payload を使用する。

主な normalized change:

- raw `gym_id` は resolved `gym` object に置き換えられる。
- `gym` / machine は `resolution.state`, `resolution.originalId`, `resolution.resolvedId` を持つ。
- resolved Gym は Master 由来の `name` / `short_name` を持つ。missing/deleted Gym は Master 由来表示値を持たず、表示 helper が `?` を返す。
- resolved Machine は Master 由来の `name` / `body_part` を持つ。missing/deleted Machine は Master 由来表示値を持たず、表示 helper が `?` を返す。
- raw set data、notes は保持される。source ID で解決できた場合の runtime ID は canonical Master ID になる。missing Machine の runtime ID は original ID を保持する。
- unresolved Master reference は Runtime warning として top-level `warnings` に報告される。warning は original ID、resolved ID、reference kind、resolution state、session/file location を持つ。

## Validation and Compatibility

現行 parser は以下を reject する。

- invalid JSON / JSONL line
- missing required field
- invalid date format
- invalid status
- missing `gym_id`
- missing `machine_id`
- missing set field
- duplicate Master ID
- invalid Master body part

Unknown/deleted `gym_id` または `machine_id` は reject せず、Runtime warning として扱う。Unresolved Master reference だけを理由に Runtime Error、degraded、fallback を発火しない。sets/reps/weight/count aggregate は unresolved Machine を含め、body part 別分類は `body_part` を持つ Machine のみ対象にする。

Historical Workout Log compatibility は、old record を current Master ID で resolve することで維持される。現行 schema は machine identity、main gym context、workout duration、structured PR field を含まない。
