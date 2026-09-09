# Workout CRUD Validation & Conflict Verification

Related Issue: #140

## 1. Validation Principle

Validation Authority：

```text
Client
  UX Authority

Server
  Final Domain Authority
```

Client PassはServer Passを保証しない。

Server Validationを通過していないMutationはWriteしない。

## 2. Client Validation

Client ValidationはRealtime実行する。

### 2.1 Gym

- `v-select`
- Required
- Master Value
- UI表示は日本語名
- Label等のUI CopyはTBD

Fail：

- 未選択
- Select対象外Value
- Write時点で無効なMaster Reference

### 2.2 Session Machine Count

Allowed：

```text
1 - 10
```

0 Machine不可。

11以上不可。

UI制御：

- 1件時 Delete disabled
- 10件時 Add disabled

Serverでも同一条件を再検証する。

### 2.3 Machine

- Required
- Master-based
- Session内Unique
- Label等のUI CopyはTBD

同一Session内の同一Machine複数選択は禁止。

UI：

- 他Machineですでに使用中のMachine Optionはdisabled

Server：

- `machine_id` Unique Validation必須

### 2.4 Set Count

Per Machine：

```text
1 - 10
```

0 Set不可。

11以上不可。

UI：

- 1件時 Delete disabled
- 10件時 Add disabled

Serverでも再検証する。

### 2.5 Reps

- Required
- Numeric
- Integer
- Minimum 1
- Suffix `reps`
- Label等のUI CopyはTBD

Invalid：

- null
- empty
- non-number
- decimal
- 0
- negative

### 2.6 Weight

- Required
- Numeric
- Minimum 0
- Suffix `kg`
- Label等のUI CopyはTBD

0kgはValid。

Invalid：

- null
- empty
- non-number
- negative

Decimal許容範囲 / Precisionは既存Workout Schemaと一致させる。

Frontend独自精度制約を追加しない。

### 2.7 Set Notes

- Nullable
- Maximum 400 characters
- Label等のUI CopyはTBD

### 2.8 Session Notes

- Nullable
- Maximum 400 characters
- Label等のUI CopyはTBD

## 3. Expansion Panel Validation State

Machine ExpansionPanel単位でValidation Summaryを持つ。

### Not Validated

```text
mdi-help-circle-outline
Orange
```

### Pass

```text
mdi-check-circle
Green
```

条件：

- Machine Field Valid
- Machine Unique
- Set Count Valid
- All Set Fields Valid

### Fail

```text
mdi-alert
Red
```

条件：

Machine配下のValidation Failが1件以上。

ValidationはInput変更ごとにRealtime更新する。

## 4. Step Transition Validation

Step 2 → Step 3時：

Client Validation All Passを要求する。

Failが存在する場合：

- Step 3へ進めない
- Invalid Fieldを表示
- Working Model保持

Realtime Validationとは別に、`次へ` 押下時にForm全体を再評価してよい。

## 5. Server Validation Failure

Step 3からWrite実行後、Server ValidationがFailした場合：

- Writeしない
- SnackbarでAPI Status表示
- Step 2へ戻す
- Working Model保持
- Server Field Errorを該当Fieldへ反映可能とする

Server Validation ResultはStable Error Code / Structured Factで扱う。

FrontendはError Message文字列をParseしない。

## 6. Success Transition

Write成功：

- Snackbar表示
- Step 1へ遷移
- Working Model破棄
- Dirty State破棄
- Validation State破棄
- Session Selection破棄
- Date dependent Session Cache破棄
- Workout Marker再取得

## 7. Standard API Failure

Network / Domain Failure等、Retry前にWorking Model修正または再実行可能な通常Failure：

- Snackbar表示
- Step 2へ戻る
- Working Model保持

二重送信は禁止。

## 8. Conflict Principle

Conflict時：

- Auto Merge禁止
- Auto Overwrite禁止
- Force禁止
- Silent Reload禁止
- Create ↔ Edit Auto Mode Transition禁止

現在のWorking Modelをそのまま新Revisionへ無条件適用しない。

## 9. Conflict Cases

最低限以下を検証する。

### Create / Create Race

同一DateへClient A / Bが同時Create。

A成功後、BのExpected ContextがStale。

Expected：

- B Conflict
- B Auto Mergeなし
- Duplicate / Lost Sessionなし

### Edit / Edit

同一SessionをA / Bが編集。

A成功後B保存。

Expected：

- B Conflict
- A変更保持
- B Auto Overwriteなし

### Edit / Delete

A編集中にBがDelete。

A Save：

- Conflict
- Session再生成なし

### Delete / Edit

A Delete確認中にB Update。

A Delete：

- Conflict
- New Revisionを削除しない

### Delete / Delete

A Delete成功後B Delete。

Expected：

- B Conflict / Already Removed相当
- Success扱いに偽装しない

## 10. Resource Conflict

SessionがJSONL等の共有Resource内に存在する場合、別SessionのMutationでもResource Revisionが変化し得る。

Expected Resource Revision不一致時：

- Auto Mergeしない
- Resourceを上書きしない
- Conflict返却

Session IdentityとResource Revisionを混同しない。

## 11. Repository HEAD Conflict

Atomic Commit作成後、Ref Update直前にRemote HEADが変わった場合：

- Fast-forward条件を再確認
- Non-fast-forwardならConflict
- Force禁止

## 12. Fallback / LKG

以下ではWrite不可。

- Remote SoT unreachable
- Fallback Source使用中
- LKG Source使用中
- Write Boundary unhealthy
- Authentication unavailable
- Repository Configuration invalid

FrontendはMessage文字列からWrite可否を推測しない。

Structured Boundary Stateに従う。

## 13. API Error Taxonomy

最低限以下のStable Error分類を提供する。

```text
WORKOUT_WRITE_UNAVAILABLE
WORKOUT_SESSION_NOT_FOUND
WORKOUT_SESSION_CONFLICT
WORKOUT_RESOURCE_CONFLICT
WORKOUT_REPOSITORY_CONFLICT
WORKOUT_VALIDATION_FAILED
WORKOUT_REFERENCE_INVALID
WORKOUT_WRITE_FAILED
WORKOUT_WRITE_RESULT_AMBIGUOUS
WORKOUT_REFLECTION_FAILED
```

内部原因は必要に応じてより細分化してよい。

Frontend表示文言とError Codeを1:1固定する必要はない。

## 14. Snackbar

全Final API ActionでStatusをSnackbar表示する。

対象：

- Create
- Update
- Delete

Status MappingはMaintenance / Common UX Contractへ合わせる。

詳細文言はTBD。

Message文字列ではなくAPI Result StateからSeverityを決定する。

## 15. Dirty State Verification

### Session Switch

Dirty Sessionから別Session選択：

Expected：

- Confirmation Dialog表示

文言：

```html
入力内容は破棄されます。<br />
本当に切り替えますか？
```

`切り替える`：

- Current Working Model破棄
- New Selection Load

`戻る`：

- Current Working Model保持
- Selection復元

### Step 2 → Step 1

Expected：

- Dialogなし
- Working Model完全破棄

### Step 3 → Step 2

Expected：

- Working Model保持

## 16. UI Boundary Tests

最低限以下を確認する。

- Future Date選択不可
- Today選択可
- Past Date選択可
- Workout Date Marker表示
- Date未選択でNext disabled
- 0 Session → New Session
- 1 Session → Session1
- Multiple Session → Session1初期選択
- + New Session選択可能
- Existing SessionのみDelete表示
- New SessionでDelete非表示
- Machine minimum 1
- Machine maximum 10
- Set minimum 1
- Set maximum 10
- Duplicate Machine不可
- Reps minimum 1
- Weight 0 valid
- Weight negative invalid
- Notes 400 valid
- Notes 401 invalid
- Panel Icon State更新
- Step 3 Read Only
- Step 3項目名はBold
- Delete Confirmation固定文言

## 17. Persistence Verification Matrix

以下の組み合わせを検証対象とする。

```text
Resource
  JSON
  JSONL

Operation
  Create
  Update
  Delete

Source Session Count
  1
  Multiple

Target
  Existing
  Absent

Remote
  Healthy
  Fallback
  Unavailable

Revision
  Match
  Mismatch

Git
  Success
  Failure
  Ambiguous Result
  HEAD Changed

Reflection
  Success
  Failure
```

## 18. JSONL Verification

特に以下を必須確認する。

- 1 Session更新で他Sessionが変更されない
- 1 Session削除で他Sessionが残る
- 最終Session削除でEmpty Resourceを残さない
- Invalid Line / Invalid Resourceを部分Writeしない
- Resource全体Validation後のみWriteする

## 19. Git Verification

確認項目：

- 1 User Save = 1 Commit
- Multi Resource Mutation = 1 Commit
- Sequential Delete/Createによる中間状態なし
- Expected Revision mismatchでWriteなし
- Remote HEAD changeでForceなし
- Ambiguous ResultでBlind Retryなし
- Commit MessageをFrontend指定不可
- Arbitrary Path Write不可
- Arbitrary Branch Write不可

## 20. Reflection Verification

Git成功 + Reflection失敗をGit失敗と混同しない。

Expected：

```text
Git Write Success
Runtime Reflection Failure
```

をStructured Resultとして返す。

Frontendが同一Mutationを自動再送しないことを確認する。

## 21. Cross Platform Verification

Windows / Androidで同一Fixtureを用いて、以下のSemantic Equivalenceを確認する。

- Request DTO
- Response DTO
- Validation
- Error Code
- Conflict
- Revision
- Write Eligibility
- Git Result
- Reflection Result

Platform差によってFrontend挙動が変わらないこと。
