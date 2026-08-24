# Workout JSON / JSONL 作成ルール

## 1. 目的

Workout Raw JSON / JSONLをLLM / 人間が同じ方針で作成するための作業ルール。

正とする資料:
- `03_data_design.md`
- `05_data_validation_policy.md`
- `07_af_detailed_design.md`
- `master/exercises.json`
- `master/gyms.json`

## 2. 保存形式

1日1session:
```text
workouts/YYYY/MM/YYYY-MM-DD.json
```

同日複数session:
```text
workouts/YYYY/MM/YYYY-MM-DD.jsonl
```

JSONLは1行=1WorkoutSession。

## 3. Master参照型

Workout Raw側には表示属性を重複保持しない。

書くもの:
- gym_id
- exercise_id
- set
- weight_kg
- reps
- 必要に応じrir / condition / notes

書かないもの:
- gym.name
- gym.short_name
- exercise.name
- exercise.body_part
- Masterから解決できる属性

## 4. 不明値

推測・自動補完禁止。

禁止例:
- session_idを`${date}-01`で自動生成
- unknown-gymを生成
- unknown-exerciseを生成
- set番号を配列indexから生成
- body_partをWorkout側へ書く
- MasterにないIDを勝手に作る

## 5. Required

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

## 6. status / Empty

`status`: `complete` または `partial`。

- complete + exercises: [] → invalid
- partial + exercises: [] → allowed
- sets: [] → 常にinvalid

## 7. Master参照ルール

新規Rawデータ作成時は、原則として既存Masterに存在する`gym_id` / `exercise_id`を利用する。

元資料に新しいGym / Machineが存在しMaster未登録の場合は、勝手にIDを作らずMaster追加候補として報告する。

なお、既にSoTへ存在するMaster未登録参照をAFが読み込む場合のRuntime挙動は`05_data_validation_policy.md` / `07_af_detailed_design.md`を正とし、AFはMaster由来属性をnullとして通知付きで継続可能とする。

## 8. session_id / date

- session_idは明示する
- 推奨: `YYYY-MM-DD-01`
- dateは`YYYY-MM-DD`
- 不明な日付を推測しない

## 9. Weight / Reps / RIR

- weight_kg: kg
- reps: 回数
- set: 明示
- rir: 不明ならnullまたは省略
- condition: 情報がなければ省略可

## 10. 作成後確認

- JSON parse可能
- JSONLは1行1session
- required field存在
- complete sessionに有効exerciseあり
- sets: []なし
- session_id明示
- 不明値を捏造していない
- Master未登録候補を報告している

アプリRuntime側の最終Technical ValidationはAFが担当する。

## 11. LLM依頼時の必須指示

```text
03_data_design.md / 05_data_validation_policy.md / 06_json_creation_rules.md とMasterを正としてWorkout Raw JSON / JSONLを作成すること。
不明値を推測しないこと。
Masterに存在しないGym / Exerciseを発見した場合は勝手にIDを作らず、Master追加候補として報告すること。
```
