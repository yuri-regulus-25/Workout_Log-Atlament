# Master Data 現行 Schema

現行 Master Data は `data/master/` 配下にある。

```text
data/master/
├─ machines.json
└─ gyms.json
```

現行には machine、body part entity、separate record としての alias、main gym configuration の Master file は存在しない。

## Machine Master

File: `data/master/machines.json`

Top-level structure:

```json
{
  "schema_version": 1,
  "machines": []
}
```

各 machine record は以下を持つ。

| Field | Type | Required | Notes |
|---|---|---|---|
| `machine_id` | string | yes | Unique machine ID。Workout Log から reference される。 |
| `name` | string | yes | Display name。 |
| `body_part` | string | yes | Supported body part value のいずれかである必要がある。 |
| `aliases` | string[] | no、JS parser では `[]` default | 現行 data に存在する。 |
| `active` | boolean | yes | Parser/validator で必須。 |
| `deleted` | boolean | yes、JS parser では missing を `false` に normalize | Logical delete flag。Historical reference の存在解決には使用しない。 |

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
| `deleted` | boolean | yes、JS parser では missing を `false` に normalize | Logical delete flag。Historical reference の存在解決には使用しない。 |
| `main` | boolean | yes、JS parser では missing を `false` に normalize | Main Gym flag。初期状態では 0 件を許容する。 |

## Validation

現行 validation は以下を check する。

- top-level object shape
- `schema_version`
- required array
- required record field
- duplicate `machine_id`
- duplicate `gym_id`
- valid machine `body_part`
- required `active`

Shared domain validation は `@workout-lab/workout-core` の `validateWorkoutMasterData` と `validateWorkoutMasterReferences` を使用する。

`validateWorkoutMasterData` は typed Master Data に対して schema version、required domain fields、unique ID、Machine `body_part`、Main Gym constraint を validation する。

`validateWorkoutMasterReferences` は Workout Log の actual references だけを扱う。

- `historical` mode: referenced Gym/Machine が存在すれば valid。Inactive/logically deleted record も historical resolution では valid。
- `new-write` mode: referenced Gym/Machine は `active:true` かつ `deleted:false` でなければ invalid。
- Missing Gym/Machine reference は mode に関係なく invalid。

Historical display/resolution では `resolveHistoricalWorkoutReferences` / `resolveHistoricalWorkoutReferenceReport` を使用し、reference を `active`、`inactive`、`deleted`、`missing` に分類する。`inactive` と `deleted` は historical reference として解決済みであり、`missing` だけが unresolved reference である。Workout Log SoT はこの分類のために rewrite しない。

Main Gym dependent weight/volume metrics は `getMainGym*Metric` family を使用する。Main Gym context が configured の場合だけ `available` state として Main Gym sessions に限定した値を返す。Main Gym が未設定の場合は `unconfigured`、constraint 違反の場合は `invalid` を返し、比較可能な kg 値を作らない。

`active:false` および `deleted:true` は historical Workout reference として valid である。現行 code は ID により record を resolve し、既存 log で使用される inactive/deleted record を missing として reject しない。

新規利用候補として扱える record は `active:true` かつ `deleted:false` の record である。Physical delete は導入しない。

Main Gym は Gym Master record の `main:true` で表す。全 Gym 中最大 1 件であり、初期未設定状態として 0 件を許容する。`main:true` の Gym が inactive または deleted の場合は invalid な Main Gym context である。

## Runtime Use

Master Data は Workout Data の normalize に使用される。

- raw `gym_id` は normalized `gym.id`、`gym.name`、optional `gym.short_name` になる。
- raw `machine_id` は normalized `machine_id`、`name`、`body_part` になる。

Reference された gym または machine を resolve できない場合、その sync/load operation の Runtime Data は accept されない。
