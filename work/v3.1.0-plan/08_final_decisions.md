# v3.1.0 Final Decisions / Documentation Authority

## 1. Purpose

Workout Manager v3.1.0の製造開始前に、会話上確定した最終判断と既存Planning Document間の優先関係を固定する。

本書は新しい機能仕様を広げるための資料ではなく、`01`〜`07`に残る旧TBD・旧案・表現差を解消するための最終整理資料とする。

---

## 2. Documentation Authority

同一事項について記述が衝突する場合、以下を優先する。

1. `08_final_decisions.md`
2. `04_ui_copy_and_component_contract.md`
3. `05_schema_reconciliation.md`
4. `03_validation_conflict_verification.md`
5. `02_write_contract.md`
6. `01_interaction_model.md`

Component分割は `06_frontend_component_structure.md`、Backend責務分割は `07_backend_implementation_structure.md` を参照する。

`01` / `03` に残るUI CopyのTBD、旧Validation表現、旧Visual Detailは製造時の未決事項として扱わない。

---

## 3. Git Commit Message Contract

Workout ManagerからGitHubへWorkout LogをMutationする場合、Commit MessageはApplication側で固定生成する。

FrontendからCommit Messageは指定できない。

形式：

```text
Create: Workout Log - YYYY/MM/DD
Update: Workout Log - YYYY/MM/DD
Delete: Workout Log - YYYY/MM/DD
```

Identifierは`session_id`ではなくWorkout Dateとする。

Session単位の変更内容はGit diffで確認可能であるため、Commit一覧では人間可読性を優先してDateのみを表示する。

同一方針をMaster Maintenance等のDomain Mutationにも適用可能とし、共通形式は以下とする。

```text
Create: <Target> - <Identifier>
Update: <Target> - <Identifier>
Delete: <Target> - <Identifier>
```

`Delete`はPhysical Deleteを意味する。Logical Deleteは`Update`として扱う。

---

## 4. Existing Invalid Master Reference Policy

Historical Workoutには、現在のMaster状態では以下となる参照が存在し得る。

- `active: false`
- `deleted: true`
- Missing Master Entry

これらはRuntime上Warningとなり得るが、既存履歴そのものを必ずしもBrokenとは扱わない。

Workout Managerではgrandfather policyを採用する。

### Existing Session

既存のinvalid referenceを変更していない場合：

- Load可能
- Warning表示対象としてよい
- Save可能
- 当該Fieldを強制置換しない

当該Fieldをユーザーが変更した場合：

- 新しい値は`active: true && deleted: false`のValid Master Entryのみ選択可能
- invalid referenceへの変更・再選択は不可

### Create

新規Sessionではinvalid referenceを許可しない。

Gym / Machineともに`active: true && deleted: false`のみ選択可能とし、Serverでも同一条件を再検証する。

### Principle

Workout Managerは「歴史データを編集しただけで無関係なMaster参照修復まで強制する」画面にしない。

Master Referenceの修復が必要な場合はRecovery側の責務として分離可能とする。

---

## 5. Existing Notes > 400 Characters

既存Session Notes等が400文字を超えている場合、Loadしただけで編集不能にはしない。

- 未変更のlegacy value：保持してSave可能
- Notesを変更した場合：400文字以内を要求
- Frontend / Serverで同一のdirty-aware ruleを適用

通常入力ではVuetify Frontend Validationにより400文字超過をFailとする。

---

## 6. Machine / Set Number Display

`mdi-numeric-*-box-outline`による番号表示を確定仕様とするのは**Set Numberのみ**とする。

Machine Numberの独立表示は行わない。

Machine ExpansionPanelは日本語Machine名を主表示とする。

`01_interaction_model.md` / `04_ui_copy_and_component_contract.md` 内のMachine Number表示を示唆する記述は本項で上書きする。

---

## 7. Weight Validation Message

Weight Contractは以下で固定する。

- Required
- Numeric
- `0 <= x <= 999.99`
- Decimal scale max 2

確定Message：

- Required：`必須項目です`
- Upper Bound：`999.99以下の数値を入力してください`
- Decimal overflow：`少数は2桁までです`
- Non numeric：`数字を入力してください`

Negative専用文言 `0以上の数字を入力してください` は確定仕様としない。

負数Validationは上記Contractを満たす形でFrontend / Server双方に実装し、既存共通Validation表現へ合わせる。

---

## 8. Production Readiness

製造開始前に追加のProduct Decisionを必須とする事項はない。

以下は実装裁量とする。

- helper / mapper / composableの具体名
- private method分割
- Vuetify version差によるproperty調整
- Warningの細かなVisual表現
- internal DTO / serializer / repository adapterのファイル分割

既存Application Framework / Maintenance / Runtime実装を横断調査し、設計とのCollision / Impactを確認した後に製造へ進む。
