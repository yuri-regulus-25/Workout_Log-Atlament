# v2.0.0 Phase 7-E — Master Lifecycle & Main Gym Operations

## 日本語

### 前提
Phase 6のLifecycle/Main Gym Domain RuleおよびPhase 7-A〜7-Dが現在の作業Branchへ反映済みであることを前提とする。

### Logical Delete / Restore
- Gym / Machine双方へ適用する。
- Delete/Restore actionは各`v-data-table` row内に配置する。
- Bulk Delete / Bulk Restoreは禁止する。
- Delete/Restoreは1Record単位のみ許可する。
- Action押下だけでは更新せず、「切り替えますか？」に相当するConfirmation Dialogを表示し、明示的な確認後にWrite APIを呼ぶ。
- Active -> Deleted、Deleted -> Activeの双方で確認を行う。
- Restoreも現在のDomain/Relation状態でValidationする。
- Main Gym設定中のGymはDelete不可。
- Referential Integrityを破壊するDelete/Restoreは拒否する。

### Main Gym Operation
- `main` booleanを自由編集するだけの操作にはしない。
- Main Gym A -> BをDomain Operationとして扱う。
- 一度Main Gymが設定された後の0件化は禁止する。
- Inactive GymをMainに設定できない。
- 切替後のMaster全体をValidationしてからDocument単位でWriteする。
- Main Gym変更でWorkout Logを書き換えない。

### Record Editing Policy
- Editも1Record単位とする。
- Bulk Update / multi-record editは禁止する。
- Main Gym切替のように結果として複数Record属性が変化する操作は、単一のDomain OperationとしてMaster Document全体をAtomicに更新するためBulk Editとはみなさない。

### 完了条件
Gym/MachineのLifecycle変更とMain Gym変更が明示的な1Record/Domain Operationとして安全に実行され、誤操作・Bulk変更・Constraint違反が防止されること。

---

## English

### Prerequisite
Phase 6 lifecycle/Main Gym rules and Phase 7-A through 7-D must be present on the current working branch.

### Logical Delete / Restore
Apply to both Gym and Machine. Place Delete/Restore actions in each data-table row. No bulk operations. Every lifecycle toggle requires an explicit confirmation dialog before the write API is called. Revalidate restores against current domain/relations. The Main Gym cannot be deleted and referential-integrity-breaking operations are rejected.

### Main Gym
Do not expose `main` as an unrestricted boolean edit. Treat A-to-B replacement as a domain operation. Once configured, zero Main Gyms is forbidden; inactive gyms cannot become Main. Validate the complete resulting master and write it atomically. Do not rewrite workout logs.

### Editing Policy
All normal editing is record-by-record. Main Gym replacement may modify multiple record attributes internally but is a single atomic domain operation, not bulk editing.

### Completion Criteria
Lifecycle and Main Gym operations are explicit, safe, non-bulk operations protected by confirmation and domain constraints.