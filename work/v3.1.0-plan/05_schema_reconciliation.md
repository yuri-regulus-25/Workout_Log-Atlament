# Workout Manager / Workout Schema Reconciliation

## 1. Purpose

Workout Manager v3.1.0 の確定UI Contractと、現行Workout Raw Schema / Runtime Contractを突合し、Write時に必要な変換・保持ルールを定義する。

本書では、UIに露出しない既存Fieldを不用意に破壊しないことを最優先とする。

---

## 2. Current Raw Schema Summary

Session required:

- `schema_version`
- `session_id`
- `date`
- `status`
- `gym_id`
- `machines`

Session optional:

- `condition`
- `notes: string[]`

Machine:

- `machine_id`
- `sets`
- optional `notes: string[]`

Set:

- `set`
- `weight_kg`
- `reps`
- optional `rir`
- optional `failure`
- optional `warmup`
- optional `note`

Workout Manager UIが直接編集するFieldは以下のみ。

- Date（Step 1でSession作成対象を決定。v3.1.0ではStep 2から変更不可）
- Gym
- Machine
- Reps
- Weight
- Set Notes
- Session Notes

---

## 3. General Preservation Rule

### Create

UIに存在しないoptional fieldは生成しない。

Server / Domain側で必要なrequired fieldのみcanonical valueを生成する。

### Update

UIに存在しない既存fieldは**原則そのまま保持する**。

Workout ManagerのWorking ModelをRaw Session全置換DTOとして扱わず、Server側でSource Sessionへ編集対象fieldをpatchして再構築する。

これにより、UI非表示fieldのsilent data lossを防ぐ。

---

## 4. Required Hidden Fields

### `schema_version`

Create:

- 現行canonical versionをServer側で設定する。
- Frontendから入力させない。

Update:

- Source Sessionの値を保持する。
- Schema migrationをWorkout Manager保存処理に暗黙混入させない。

### `session_id`

Create:

- Server / Application Framework側で生成する。

Update:

- Source Sessionの値を不変Identityとして保持する。

### `status`

Create:

- `complete` を使用する。
- Workout ManagerはMachine 1件以上 / Set 1件以上 / required input validをSave条件とするため、CreateされたSessionはcomplete shapeを満たす。

Update:

- Source Sessionの`status`を保持する。
- UIにstatus操作を提供しない以上、編集だけを理由に`partial -> complete`へ暗黙変更しない。

---

## 5. Hidden Optional Fields

以下はv3.1.0 UIでは編集しない。

- Session `condition`
- Machine `notes`
- Set `rir`
- Set `failure`
- Set `warmup`

Create:

- omit

Update:

- 対応するSource Entityが維持される限り、その値を保持する。

Machine / Setをユーザーが削除した場合、そのEntityに属するhidden fieldもEntityと共に削除される。

新規Machine / Setにはhidden optional fieldを生成しない。

---

## 6. Set Note Mapping

Set Notes UIはRaw Setのoptional `note: string` と1:1対応する。

- 空欄 -> `note` omit
- 入力あり -> `note`へstring保存

400文字上限はFrontend / Server共通Validationとする。

---

## 7. Session Notes Mapping — Schema Collision

Raw Sessionは `notes: string[]`、Workout Manager UIは単一`v-textarea`である。

現行dataには複数要素のSession Notesが実在するため、単純な`notes[0]`のみの編集は不可。

### Recommended Adapter

Load:

- `notes[]` を改行でjoinしてTextareaへprojectionする。

Save:

- Textareaを単一stringとして`notes: [value]`へ保存するのではなく、改行単位でsplitして`string[]`へ戻す。
- 空行は除外する。
- 空欄なら`notes`をomitする。

これにより現行Schemaを変更せず、複数Noteを1Textareaで編集可能にする。

### Existing Data > 400 characters

既存Session Notesのjoin結果が400文字を超える場合、既存データをロードしただけで編集不能にしない。

Recommended compatibility rule:

- 未変更のlegacy valueはそのまま保持可能。
- Notesをユーザーが変更した場合のみ400文字上限を適用する。
- Server Validationも同じdirty-aware ruleを適用する。

これはv3.1.0 migration-free compatibility policyとする。

---

## 8. Machine Notes

Raw Machineにはoptional `notes: string[]` が存在するが、Workout Manager v3.1.0 UIにはMachine Notes Fieldを設けない。

したがって:

- Existing Machine update: preserve
- Existing Machine delete: delete with Machine
- New Machine: omit

Session NotesやSet Notesへ暗黙統合しない。

---

## 9. Partial Session / Empty Machines

現行Schemaでは`partial` SessionのみMachine 0件を許容する。

Workout Manager UIは常にMachine最低1件を要求する。

Policy:

- CreateではMachine 0件を許容しない。
- Existing partial SessionがMachine 0件の場合、Step 2 Working Modelには空のMachine 1件を生成する。
- これはUI Working Model初期化であり、ロードしただけではPersistenceを変更しない。
- Save時は通常Validationに従いMachine / Set requiredを満たす必要がある。
- Saveしても`status`はSource値を保持する。

Workout Managerのnew-write policyがRaw Schemaよりstrictであることを許容する。

---

## 10. Master Reference Collision

新規Writeで選択可能なGym / Machineは以下のみ。

- `active: true`
- `deleted: false`

UI候補からinactive / deleted entryは除外する。

一方、既存Workoutはmissing / deleted Master referenceを保持し得る。Runtime Contractではこれらはwarningであり、必ずしもResource Brokenではない。

### Recommended v3.1.0 Policy

Workout ManagerはRepository integrityを悪化させる保存を許可しない。

- Existing invalid referenceはロード可能とする。
- 当該FieldをValidation NGとして扱う。
- Userはvalid Masterへ置換しない限りStep 3へ進めない。
- Server側も`WORKOUT_REFERENCE_INVALID`で同一条件を保証する。
- invalid referenceをそのまま再保存する grandfather write は許可しない。

Master修復そのものをWorkout Manager内で新規登録・ID直接入力により行わない。

---

## 11. Machine Unique

Raw Schema自体の既存許容範囲とは別に、Workout Manager new/update write contractでは同一Session内MachineをUniqueとする。

- UI: already-selected option disabled
- Frontend Validation: duplicate reject
- Server Validation: duplicate reject

既存dataにduplicate Machineが存在する場合、そのSessionは修正されるまでSave不可とする。

---

## 12. Numeric Contract

### Reps

- integer
- `1 <= x <= 100`

### Weight

- decimal allowed
- `0 <= x <= 999.99`
- decimal scale max 2

Frontend input restrictionはUX補助であり、Server Validationを省略しない。

---

## 13. Mutation Reconstruction

Update処理は概念的に以下とする。

```text
Source Raw Session
  + editable fields from Workout Manager DTO
  + preserved hidden fields
  -> Reconstructed Raw Session
  -> Domain Validation
  -> Master Validation
  -> Whole Resource Reconstruction
  -> Whole Resource Validation
  -> optimistic concurrency check
  -> atomic Git commit
```

FrontendからRaw Session完全形を信用して直接Persistenceへ書き込まない。

---

## 14. Result

UI Contractとの衝突はSchema変更なしで吸収可能。

v3.1.0でSchema migrationを行う必要はない。

主なcompatibility strategyは以下。

1. UI非表示fieldはUpdate時preserve。
2. Createではoptional hidden fieldをomit。
3. Session Notes `string[]` はTextareaとのadapterで吸収。
4. legacy Notes上限超過は未変更時のみgrandfather。
5. Master invalid referenceは置換必須とし、新しいinvalid writeを許可しない。
6. ManagerはRaw Schemaよりstrictなnew/update write policyを持ってよい。

このContractにより、Workout Manager実装のために既存Workout Schema / read-side frontend / historical dataを作り替える必要はない。
