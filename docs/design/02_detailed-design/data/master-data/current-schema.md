# Master Data 現行 Schema

現行 Master Data は `data/master/` 配下にある。

```text
data/master/
├─ exercises.json
└─ gyms.json
```

現行には machine、body part entity、separate record としての alias、main gym configuration の Master file は存在しない。

## Exercise Master

File: `data/master/exercises.json`

Top-level structure:

```json
{
  "schema_version": 1,
  "exercises": []
}
```

各 exercise record は以下を持つ。

| Field | Type | Required | Notes |
|---|---|---|---|
| `exercise_id` | string | yes | Unique exercise ID。Workout Log から reference される。 |
| `name` | string | yes | Display name。 |
| `body_part` | string | yes | Supported body part value のいずれかである必要がある。 |
| `aliases` | string[] | no、JS parser では `[]` default | 現行 data に存在する。 |
| `active` | boolean | yes | Parser/validator で必須。 |

Supported body part:

```text
chest, back, legs, shoulders, arms, glutes, core, cardio, other
```

## Gym Master

File: `data/master/gyms.json`

Top-level structure:

```json
{
  "schema_version": 1,
  "gyms": []
}
```

各 gym record は以下を持つ。

| Field | Type | Required | Notes |
|---|---|---|---|
| `gym_id` | string | yes | Unique gym ID。Workout Log から reference される。 |
| `name` | string | yes | Display name。 |
| `short_name` | string | no | Short display name。 |
| `active` | boolean | yes | Parser/validator で必須。 |

## Validation

現行 validation は以下を check する。

- top-level object shape
- `schema_version`
- required array
- required record field
- duplicate `exercise_id`
- duplicate `gym_id`
- valid exercise `body_part`
- required `active`

`active:false` は historical Workout reference として valid である。現行 code は ID により record を resolve し、既存 log で使用される inactive record を reject しない。

## Runtime Use

Master Data は Workout Data の normalize に使用される。

- raw `gym_id` は normalized `gym.id`、`gym.name`、optional `gym.short_name` になる。
- raw `exercise_id` は normalized `exercise_id`、`name`、`body_part` になる。

Reference された gym または exercise を resolve できない場合、その sync/load operation の Runtime Data は accept されない。
