# データ設計

## 1. SoT

Workout / Master Dataの正本はGitHub上のJSON / JSONLとする。

```text
master/
├─ exercises.json
└─ gyms.json

workouts/
└─ YYYY/MM/YYYY-MM-DD.json | .jsonl
```

1日1sessionはJSON、同日複数sessionはJSONL。JSONLは1行=1WorkoutSession。

## 2. Runtime Data Flow

```text
GitHub Raw JSON / JSONL + Master
        ↓
Application Framework
├─ Fetch
├─ Parse
├─ Technical Validation
├─ Master Resolve
└─ Normalize
        ↓
Local Runtime Data / current
        ↓
AF HTTP API
        ↓
Common JavaScript
        ↓
WorkoutSession[]
        ↓
workout-core
        ↓
Frontend
```

JSON / JSONLの形式差異、Master Resolve、RawからNormalizedへの変換はAFより上へ漏らさない。

## 3. Raw Workout

Raw Workoutは表示属性を重複保持せず、Master IDを参照する。

```json
{
  "schema_version": 1,
  "session_id": "2026-08-14-01",
  "date": "2026-08-14",
  "status": "complete",
  "gym_id": "af-shioiri",
  "exercises": [
    {
      "exercise_id": "hip-abduction",
      "sets": [
        { "set": 1, "weight_kg": 65, "reps": 10, "rir": null }
      ]
    }
  ]
}
```

## 4. Normalized Runtime Model

AFはRawとMasterから、Frontend / workout-coreが利用可能な`WorkoutSession`を生成する。

```text
gym_id        → gym.id / gym.name / gym.short_name
exercise_id   → exercise_id / name / body_part
```

Raw側で参照された`gym_id` / `exercise_id`に対応するMaster Entryが存在しない場合は、Technical Invalid ではなく Master Resolve Failure とする。

Master Resolve Failureを1件でも検出したRemote Sync Setは全体を不採用とし、今回取得したデータからNormalized Runtime Modelを確定しない。Master Resolve可能なWorkoutSessionのみを部分採用してRuntime Dataへ載せることも禁止する。

Master由来属性を推測・捏造してRuntimeを生成してはならない。

## 5. Validationと更新

Remote Sync Setは全体単位で検証する。

```text
Fetch
↓
Parse
↓
Validate
↓
Master Resolve
↓
Runtime生成
↓
Temporary
↓
全体成立
↓
currentを安全に置換
```

Technical Invalidが1件でも存在する、required Resource取得に失敗した、Master自体が破損している、またはMaster Resolve Failureを1件でも検出した場合はSync Set全体をRejectし、currentを更新しない。

Master Resolve Failure時は今回Remote Dataを部分採用せず、既存のValidな`runtime/current`が存在する場合はそれをLocal Runtimeとして継続利用する。既存`current`がInvalidまたは存在しない場合はRuntime unavailableとする。

## 6. Local Runtime Data

```text
runtime/
├─ current/
└─ temporary/
```

- `current`: 最後に成立したRuntime Data
- `temporary`: 同期作業領域
- 恒久Backupなし
- Rollback機能なし
- Partial Update禁止
- 起動時にtemporaryを無条件Clear

Local Fallback時のValidationは、既に生成・保存済みの`runtime/current`に対するValidationとする。`current`は過去にMaster Resolveを含むSync Set全体の検証を完了して確定済みのRuntime Dataであり、Local ValidationでMaster Resolveを再実行しない。

## 7. Required / Nullable / Optional

詳細は`05_data_validation_policy.md`を正とする。

Raw required:

- schema_version
- session_id
- date
- status
- gym_id
- exercises
- exercise_id
- sets
- set
- weight_kg
- reps

不明なRaw値を推測・自動補完しない。

## 8. 派生値

以下はSoTへ保存せず`workout-core`で算出する。

- total volume
- estimated 1RM
- monthly count
- body part summary
- frequency
- average interval
- machine variety
- Personal Record等の派生判定

AFは画面向け集計値を生成しない。

## 9. Date / Unit

- Date: `YYYY-MM-DD`
- DateTime: ISO 8601
- Weight: kg
- Timeout / Duration: seconds

## 10. 詳細仕様

- Validation: `05_data_validation_policy.md`
- Raw作成: `06_json_creation_rules.md`
- AF Runtime: `07_af_detailed_design.md`
- Common JS: `08_common_js_detailed_design.md`