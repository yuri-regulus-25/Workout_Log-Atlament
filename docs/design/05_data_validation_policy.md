# データ Validation 方針

## 1. 目的

GitHub SoTのRaw Workout / Masterと、AFが生成するNormalized Runtime Dataの技術的Validation方針を定義する。

不明値は推測・自動補完しない。

## 2. Model境界

- Raw Model: GitHub上のJSON / JSONL。`gym_id` / `exercise_id`でMaster参照。
- Normalized Model: AFがMaster Resolve後に生成し、Common JS / workout-core / Frontendが利用。

## 3. Required

required欠落・型不正はRuntimeとして復元不能なInvalidとする。

RawWorkoutSession:
- schema_version
- session_id
- date
- status
- gym_id
- exercises

RawWorkoutExercise:
- exercise_id
- sets

ExerciseSet:
- set
- weight_kg
- reps

Master:
- schema_version
- collection
- id
- name
- active
- Exerciseはbody_part必須

自動生成禁止例:
- session_idをdateから生成
- unknown-gym / unknown-exerciseを生成
- set番号を配列indexから生成

## 4. Nullable / Optional

Nullable候補:
- rir
- fatigue
- motivation
- sleep
- soreness
- performance

Optional候補:
- condition
- notes
- failure
- warmup
- note
- aliases
- short_name

Optional fieldが存在しないこと自体はValidとし、Error通知対象にしない。

## 5. Empty Data

- `complete` + `exercises: []` → Invalid
- `partial` + `exercises: []` → Valid
- `sets: []` → 常にInvalid
- Resource Configurationで`emptyAllowed:false`のResourceが空 → Sync Set Invalid

## 6. Master参照

### Master未登録

Raw側の`gym_id` / `exercise_id`自体が有効でも、対応Master Entryが存在しない場合はMaster Resolve失敗としてInvalidとする。

AFは値を捏造・補完せず、Sync Set全体をRejectする。

### Master自体の破損

以下はInvalid:
- duplicate gym_id
- duplicate exercise_id
- Master schema不正
- required Master field欠落
- invalid body_part

この場合Sync Set全体をRejectする。

`active:false`を過去Workoutが参照することはValid。

## 7. Normalized Model

Normalized ModelはMaster Resolve成立後にのみ生成する。

Master参照が解決できないRaw Workoutから、`name:null` / `body_part:null`等を持つ擬似Normalized Modelを生成してはならない。

`short_name`等、仕様上Nullable / Optionalと定義された属性はその定義に従う。

## 8. Sync Set判定

```text
VALID
→ Local更新可能

INVALID
→ Sync Set全体Reject
→ current更新禁止
```

Partial Updateは禁止。

`success:true + errors`は、明示的に非Fatalかつ通知対象として定義された異常にのみ使用する。Optional field欠落やMaster未登録をこの区分へ自動分類しない。

## 9. Local Fallback

Local Runtime DataにもRemoteと同一Validation Pipelineを適用する。Localだから判定を緩和しない。

## 10. workout-core

workout-coreはAFからNormalized Runtime Dataを受け取るが、防御的に空配列等でも破綻しない実装を維持する。

## 11. 詳細参照

- `03_data_design.md`
- `06_json_creation_rules.md`
- `07_af_detailed_design.md`
