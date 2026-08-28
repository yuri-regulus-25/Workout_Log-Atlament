# v2.0.0 Phase 6-A — Master Lifecycle Schema

## 日本語

### 前提
Phase 0〜Phase 5が正常に完了し、現在の作業Branchへ反映済みであることを前提とする。

### 目的
Master Data MaintenanceによるWrite導入前に、既存Master DataへLogical Delete / Active-Inactive Lifecycleを導入し、Domain上の扱いを確定する。

### 対象
- Phase 0完了後の実Master Schemaを再確認して対象Entityを確定する。
- GymおよびMachineには本PhaseでLogical Deleteを導入する。
- その他EntityについてはPhase 0後の実SchemaとMaintenance要件から必要性を判断する。
- Logical Delete属性名・具体Schemaは既存Dataとの整合を確認して決定する。
- Active Recordは通常の新規利用・Relation候補となる。
- Inactive/Logical Deleted Recordは新規利用候補から除外する。
- Physical Deleteは原則導入しない。

### 重要原則
Inactiveは「存在しない」を意味しない。Historical Workoutからの参照解決に必要なRecordは保持する。

### 制約
- Maintenance UI / Write API / GitHub Writeはまだ実装しない。
- Maintenance DRAFTだけを根拠として新Entity/Relationを作らない。
- Phase 0でMachineへ統一したExercise概念を再導入しない。
- Workout Logを書き換えてLogical Deleteへ対応しない。

### 完了条件
Gym/Machineを含む必要MasterにLogical Delete Lifecycleが導入され、新規利用とHistorical Referenceで異なるActive/Inactive Policyを適用可能であること。

---

## English

### Prerequisite
Phase 0 through Phase 5 must be completed and present on the current working branch.

### Objective
Introduce logical-delete / active-inactive lifecycle semantics into existing master data before write-capable maintenance is implemented.

### Scope
Re-check the actual post-Phase-0 schema. Gym and Machine must receive logical-delete support in this phase. Determine other entities from the actual schema and requirements. Choose concrete field naming/schema based on compatibility. Active records are available for new use/relations; inactive records are excluded from new selection. Physical deletion is not introduced by default.

### Key Principle
Inactive does not mean nonexistent. Records required to resolve historical workouts remain available.

### Constraints
Do not implement Maintenance UI, write APIs, or GitHub writes yet. Do not invent entities/relations solely from old drafts. Do not resurrect the Exercise concept replaced by Machine in Phase 0. Do not rewrite workout logs for logical deletion.

### Completion Criteria
Required masters including Gym/Machine support lifecycle semantics while preserving historical references.