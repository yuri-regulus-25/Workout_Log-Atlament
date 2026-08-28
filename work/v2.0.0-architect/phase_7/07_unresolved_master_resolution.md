# v2.0.0 Phase 7-G — Unresolved Master Resolution

## 日本語

### 前提
Phase 7-A〜7-FのMaster Data Write / Validation / Maintenance基盤が現在の作業Branchへ反映済みであることを前提とする。

### 目的
Workout Data上でMaster Dataへ正常に解決できない値を、人間が明示的に確認・解決できるMaintenance機能を実装する。

Workout DataそのものはGitHub SoT Read Onlyを維持し、本機能からWorkout Dataを直接編集・書換しない。

### Unresolved一覧
- Master Dataへ解決できない値を一覧表示する。
- Unresolved値ごとにAffected Workoutを確認可能とする。
- 対象Workout / Session等、解決判断に必要なContextへDrill-down可能とする。
- 自動Resolve / Suggested Matchによる自動確定は行わない。
- Ignore機能は実装しない。

### Resolve
人間がUnresolved値について以下を明示的に選択できること。

1. 既存Master RecordへResolveする。
2. Unresolved値を起点として新規Master Recordを作成し、そのRecordへResolveする。

新規Master作成はPhase 7の通常Create Flowを再利用し、Unique / Required / Referential Integrity / Lifecycle等すべてのValidationを通す。

### Bulk Resolve
Master Data Maintenanceの通常編集におけるBulk Edit / Bulk Deleteは禁止を維持する。

ただし、**同一Unresolved値が複数Workoutに存在する場合に限り、その同一値を一つのMaster RecordへまとめてResolveする操作を許可する。**

これはMaster Recordの一括編集ではなく、同一Unresolved identityに対するResolution mappingの一括適用として扱う。

異なるUnresolved値を複数選択して一括Resolveする機能は実装しない。

### Safety / Validation
- Resolve前に対象Unresolved値とAffected Workout件数/Contextを確認可能にする。
- Resolve先Master Recordの存在・Lifecycle・Relation整合性を検証する。
- ResolveによってWorkout DataのRaw JSONを書換しない。
- Master/Data normalizationまたは既存Runtime resolution architectureに沿って解決する。
- Malformed JSON修正は本機能の責務外とする。
- Missing RIR / Notes等のCoverage/Data Quality補正は責務外とする。

### UI
Maintenance Application内の専用Section/Viewとして実装する。具体的なTable、Dialog、Badge、Label、Icon等は既存Vuetify UIとの整合を基準に実装時に初期案を作成し、Human Reviewで調整する。

### 完了条件
- Unresolved値を一覧確認できる。
- Affected Workoutを確認できる。
- 既存Masterへ明示的にResolveできる。
- Unresolvedから新規Masterを作成してResolveできる。
- 同一Unresolved値についてのみBulk Resolveできる。
- Workout Data SoTを直接変更しない。
- 通常Master CRUDのBulk Edit / Bulk Delete禁止を破らない。

---

## English

### Prerequisite
Phase 7-A through 7-F Master Data write, validation, and maintenance foundations must already be present on the working branch.

### Objective
Provide an explicit human-controlled workflow for values in Workout Data that cannot be resolved against Master Data. Workout Data remains read-only GitHub SoT and must never be directly rewritten by this feature.

### Unresolved List
Display unresolved values and allow inspection/drill-down of affected workouts and the context required for a human resolution decision. Do not auto-resolve, auto-confirm suggested matches, or provide Ignore behavior.

### Resolve
Allow a human to explicitly resolve an unresolved value either to an existing Master record or by creating a new Master record and resolving to it. New-record creation must reuse the normal Phase 7 create flow and all unique/required/referential/lifecycle validation.

### Bulk Resolve
The prohibition on normal Master bulk edit/delete remains unchanged. However, when the **same unresolved value occurs in multiple workouts**, allow that single unresolved identity to be resolved to one Master record across all affected occurrences. Treat this as bulk application of one resolution mapping, not bulk editing of Master records. Do not allow selecting different unresolved values and resolving them together.

### Safety / Validation
Show affected-workout context before resolution, validate the target Master record and its lifecycle/relations, never rewrite raw Workout JSON, and follow the existing runtime/master resolution architecture. Malformed JSON repair and unrelated data-quality coverage such as missing RIR/notes are out of scope.

### UI
Implement this as a dedicated section/view inside the Maintenance application. Exact Vuetify tables, dialogs, badges, labels, and icons are refined during implementation and human review.

### Completion Criteria
Users can inspect unresolved values and affected workouts, explicitly resolve to existing or newly created Master records, bulk-apply resolution only for identical unresolved values, and do so without modifying Workout Data SoT or weakening the normal prohibition on Master bulk edit/delete.