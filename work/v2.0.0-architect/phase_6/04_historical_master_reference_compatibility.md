# v2.0.0 Phase 6-D — Historical Master Reference Compatibility

## 日本語

### 前提
Phase 0〜Phase 5および先行Phase 6作業が現在の作業Branchへ反映済みであることを前提とする。

### 目的
Logical Delete導入後も既存Workout Logを変更せず、過去Workoutが当時参照したMaster Recordを正しく解決・表示できることを保証する。

### Policy
- Inactive / Logical Deleted Master RecordはHistorical Resolutionでは有効な参照先として扱う。
- Inactive Recordは新規Workout/Relation/選択候補から除外する。
- Inactive化しただけで過去WorkoutをUnknown/Unresolvedへ変換しない。
- Gym/Machineその他参照Masterについて、実Schema上必要な範囲で同じPolicyを適用する。
- Workout Log SoTをLogical Delete対応のためにMigration/Rewriteしない。

### Validation
- Active Recordを参照する履歴
- Inactive Recordを参照する履歴
- 本当にMaster Recordが存在しないUnresolved Reference
を区別できること。

### 完了条件
Master Lifecycle変更がHistorical Workoutの意味を破壊せず、InactiveとMissingを明確に区別できること。

---

## English

### Prerequisite
Phase 0 through Phase 5 and preceding Phase 6 work must be present on the current working branch.

### Objective
Preserve correct resolution/display of historical workouts after logical deletion without rewriting existing workout logs.

### Policy
Inactive/logically deleted master records remain valid targets for historical resolution but are excluded from new workout/relation selections. Do not convert historical references to Unknown/Unresolved merely because a record became inactive. Apply this to Gym/Machine and other actual referenced masters as required. Do not migrate/rewrite Workout Log SoT solely for logical deletion.

### Validation
Distinguish history referencing active records, history referencing inactive records, and genuinely missing/unresolved references.

### Completion Criteria
Master lifecycle changes do not destroy historical workout meaning and inactive records are clearly distinguished from missing records.