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
| `gym_id` | string | yes | Gym Master で resolve できる必要がある。 |
| `machines` | array | yes | Machine list。 |
| `condition` | object | no | Optional session condition。 |
| `notes` | string[] | no | Optional session notes。 |

`complete` session は少なくとも 1 つの valid machine を必要とする。`partial` session は empty machine list を持てる。

## Raw Machine

| Field | Type | Required | Notes |
|---|---|---|---|
| `machine_id` | string | yes | Machine Master で resolve できる必要がある。 |
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
- raw machine は `name` と `body_part` で拡張される。
- raw `machine_id`、set data、notes は保持される。

## Validation and Compatibility

現行 parser は以下を reject する。

- invalid JSON / JSONL line
- missing required field
- invalid date format
- invalid status
- missing or unknown `gym_id`
- missing or unknown `machine_id`
- missing set field
- duplicate Master ID
- invalid Master body part

Native AF の sync-set level behavior では、Master Resolve failure は remote sync set 全体を reject し、current runtime data を部分更新しない。

Historical Workout Log compatibility は、old record を current Master ID で resolve することで維持される。現行 schema は machine identity、main gym context、workout duration、structured PR field を含まない。
