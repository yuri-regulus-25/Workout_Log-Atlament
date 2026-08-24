# データ Validation 方針

## 1. 目的

GitHub SoTのRaw Workout / Masterと、AFが生成するNormalized Runtime Dataの技術的Validation方針を定義する。

不明値は推測・自動補完しない。

## 2. Model境界

- Raw Model: GitHub上のJSON / JSONL。`gym_id` / `exercise_id`でMaster参照。
- Normalized Model: AFがMaster Resolve後に生成し、Common JS / workout-core / Frontendが利用。

## 3. Required

required欠落・型不正はRuntimeとして復元不能なTechnical Invalidとする。

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

- `complete` + `exercises: []` → Technical Invalid
- `partial` + `exercises: []` → Valid
- `sets: []` → 常にTechnical Invalid
- Resource Configurationで`emptyAllowed:false`のResourceが空 → Sync Set Technical Invalid

## 6. Master参照

### Master未登録

Raw側の`gym_id` / `exercise_id`自体が有効でも、対応Master Entryが存在しない場合はTechnical Invalidではなく Master Resolve Failure とする。

Master Resolve FailureとなったWorkoutSessionはSession Rejectとし、AFはそのWorkoutSessionのNormalized Modelを生成しない。`name:null` / `body_part:null`等の未解決属性を持つWorkoutSessionを生成してはならない。

Master Resolve Failureのみを理由としてSync Set全体をRejectしない。他の正常なWorkoutSessionは処理を継続し、Runtime Dataへ載せる。

### Master自体の破損

以下はTechnical Invalid:
- duplicate gym_id
- duplicate exercise_id
- Master schema不正
- required Master field欠落
- invalid body_part

この場合Sync Set全体をRejectする。

`active:false`を過去Workoutが参照することはValid。

## 7. Normalized Model

Normalized ModelはMaster Resolve成立後にのみ生成する。

Master参照が解決できないRaw Workoutから、`name:null` / `body_part:null`等を持つ擬似Normalized Modelを生成してはならない。該当WorkoutSessionはSession RejectとしてRuntime Dataから除外する。

`short_name`等、仕様上Nullable / Optionalと定義された属性はその定義に従う。

## 8. Sync Set判定

```text
VALID
→ Local更新可能

TECHNICAL INVALID
→ Sync Set全体Reject
→ current更新禁止
```

Partial Updateは禁止。

Technical InvalidはSync Set全体Rejectとし、current更新を禁止する。

Master Resolve Failure / Session Rejectは、明示的に非Fatalかつ通知対象として定義された異常とする。Runtime APIでは、利用可能なSessionを`data.sessions`へ返し、Master未登録情報を`errors`へ格納する。

Optional field欠落はValidであり、Error通知対象にしない。

## 9. Local Fallback

Local Runtime DataのValidationは、既に生成・保存済みの`runtime/current`に対するValidationとする。`current`はMaster Resolve済みかつSession Reject適用済みのRuntime Dataであり、Local ValidationでMaster Resolveを再実行してSession Rejectを再判定しない。

LocalだからTechnical Invalid判定を緩和しない。

## 10. workout-core

workout-coreはAFからNormalized Runtime Dataを受け取るが、防御的に空配列等でも破綻しない実装を維持する。

## 11. 詳細参照

- `03_data_design.md`
- `06_json_creation_rules.md`
- `07_af_detailed_design.md`
