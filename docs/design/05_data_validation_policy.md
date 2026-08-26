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

Master Resolve Failureを1件でも検出した場合、今回のRemote Sync Set全体をRejectし、Normalized Runtime Dataを確定しない。Master Resolve可能なWorkoutSessionのみを部分採用してRuntime Dataへ載せてはならない。

`name:null` / `body_part:null`等の未解決属性を持つWorkoutSessionを生成してはならず、Master由来属性を推測・捏造して補完してはならない。

Master Resolve FailureはTechnical Invalidとは区別するが、Remote Sync Operationとしては失敗とする。既存のValidなLocal Runtime Dataが存在する場合は、その`current`へFallbackして表示継続可能とする。

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

Master参照が解決できないRaw Workoutから、`name:null` / `body_part:null`等を持つ擬似Normalized Modelを生成してはならない。

Remote Sync Set内でMaster Resolve Failureを検出した場合は、そのSessionだけでなく今回Sync Setから生成中のNormalized Runtime Data全体を確定しない。

`short_name`等、仕様上Nullable / Optionalと定義された属性はその定義に従う。

## 8. Sync Set判定

```text
VALID
→ Local更新可能

TECHNICAL INVALID
→ Sync Set全体Reject
→ current更新禁止

MASTER RESOLVE FAILURE
→ Sync Set全体Reject
→ current更新禁止
→ Validな既存currentがあればLocal fallback
```

Partial Updateは禁止。

Technical InvalidはSync Set全体Rejectとし、current更新を禁止する。

Master Resolve Failureは非Fatalかつ通知対象の異常とするが、Remote Sync Operationは失敗とする。今回Remote Dataの正常Sessionだけを`data.sessions`へ部分採用して成功扱いしてはならない。

Local fallback成立時は、既存`current`由来のRuntime Dataを返し、Master Resolve FailureのError情報を併せて返す。既存`current`が利用不能な場合はRuntime unavailableとする。

Optional field欠落はValidであり、Error通知対象にしない。

## 9. Local Fallback

Local Runtime DataのValidationは、既に生成・保存済みの`runtime/current`に対するValidationとする。`current`は過去にMaster Resolveを含むSync Set全体の検証を完了して確定済みのRuntime Dataであり、Local ValidationでMaster Resolveを再実行しない。

LocalだからTechnical Invalid判定を緩和しない。

## 10. workout-core

workout-coreはAFからNormalized Runtime Dataを受け取るが、防御的に空配列等でも破綻しない実装を維持する。

## 11. 詳細参照

- `03_data_design.md`
- `06_json_creation_rules.md`
- `07_af_detailed_design.md`