# v3.1.0 — Workout Manager

Planning branch: `release-3.1.0-plan`

## 1. Purpose

Workout LogをRaw JSONではなくDomain Modelとして安全にCreate / Update / Physical Deleteする、独立したWorkout CRUD Application `Workout Manager` を追加する。

Frontend Framework：

- Vue 3
- TypeScript
- Vite
- Vue Router
- Vuetify

既存Workout Domainは閲覧用途として維持し、存在しないDateへのアクセス等を含む既存ルーティング仕様をCRUD都合で変更しない。

Workout Managerは既存Workout Domainとは独立したApplication / Navigation導線として提供する。

Portal：

- Application名：`Workout Manager`
- Icon：`mdi-square-edit-outline`
- Pointer：`管理 - 履歴`
- Description：`ワークアウト記録を操作します`
- Framework表示：`Vue.js + Vuetify`

## 2. Scope

### In Scope

- Workout Session新規登録
- Workout Session更新
- Workout Session物理削除
- Date選択
- 同一Date内の複数Session管理
- Gym選択
- Machine追加 / 削除 / 編集
- Set追加 / 削除 / 編集
- Set Notes
- Session Notes
- Client Validation
- Server Validation
- Optimistic Concurrency Control
- Atomic Git Write
- Application生成Commit Message
- API Status Snackbar
- Windows / Android Application Framework共通Write Contract

### Out of Scope

- Raw JSON直接編集
- Generic Git Write
- Master同時追加
- Workout Recovery
- Draft保存
- Auto Save
- Session間での未保存入力引継ぎ
- 既存Workout DomainのRoute仕様変更

## 3. Domain Identity

Workout Domain Identityは `session_id` とする。

Date、Session、Resourceを明確に分離する。

| Concept | Identity / Role |
| --- | --- |
| Date | grouping / search / navigation |
| Session | `session_id` |
| Resource | persistence / validation / Git / Recovery |
| Save | 1回のユーザー保存操作 |

DateはSession Identityではない。

同一Dateに複数Sessionが存在できる。

SessionとResourceの対応を1:1と仮定しない。

## 4. Application Flow

Workout ManagerはVertical Stepperを使用する。

```text
Step 1
操作するワークアウトの日付選択
    ↓
Step 2
操作内容
    ↓
Step 3
操作内容確認
    ↓
API Write
 ├─ Success → Step 1
 └─ Failure → Step 2
```

Stepperは縦型を固定仕様とする。

## 5. Save Contract

保存単位はDateではない。

**1回のユーザー保存操作 = 1 Domain Mutation = 1 Atomic Git Commit**

Create / Update / Deleteによって複数Resource変更が必要な場合も、1回のユーザー操作に含まれる変更は1 commitへまとめる。

Raw JSON、任意Path、任意Branch、任意Commit MessageをFrontendへ公開しない。

Workout CRUD専用Domain Write APIのみを公開する。

Workout LogのCommit Message：

```text
Create: Workout Log - YYYY/MM/DD
Update: Workout Log - YYYY/MM/DD
Delete: Workout Log - YYYY/MM/DD
```

## 6. Validation Authority

Validationは二層とする。

1. Client Validation
   - UX目的
   - Realtime
2. Server Validation
   - 最終権威
   - Persistence直前に必須

Client Validation成功のみをWrite条件としない。

Server側で必ずDomain / Resource / Reference / Revisionを再検証する。

Historical invalid Master Referenceは未変更であればgrandfatherして保存可能とし、変更する場合のみValid Masterへの置換を要求する。詳細は `08_final_decisions.md` を参照する。

## 7. State Policy

Draft / Auto Saveは提供しない。

Step 2のWorking ModelはPersistence済みSessionから完全に分離する。

Step 2 → Step 1：

- 確認なし
- Working Model完全破棄
- Dirty State破棄
- Validation State破棄
- Session Selection破棄
- 再度Step 2へ進む際は再ロード

Step 3 → Step 2：

- Working Model保持
- Validation State保持
- 修正継続可能

Session切替時にDirtyの場合のみ確認Dialogを表示する。

## 8. Design System

Workout Manager独自のVisual Ruleは原則追加しない。

以下はMaintenance画面と共通とする。

- Button Design
- dense
- Dialog Design
- Spacing
- Destructive Action
- Theme
- Primary Action
- Snackbar
- Loading Overlay
- Form Component Design

Primary Actionは `--wl-primary-strong` を使用する。

## 9. Documentation Index

1. `01_interaction_model.md`
   - Base UI / UX interaction model
   - Stepper / Form / State Transition
2. `02_write_contract.md`
   - Domain Mutation / Persistence / API / Atomic Git Write / Revision
3. `03_validation_conflict_verification.md`
   - Validation / Conflict / Error / Test / Verification
4. `04_ui_copy_and_component_contract.md`
   - 確定UI Copy / Component behavior / Maintenance common design
5. `05_schema_reconciliation.md`
   - Current Workout Schemaとの整合 / hidden field preservation / compatibility
6. `06_frontend_component_structure.md`
   - Vue frontend component / state ownership structure
7. `07_backend_implementation_structure.md`
   - Application Framework / Write Service / Resource / Repository / Reflection structure
8. `08_final_decisions.md`
   - 製造直前の最終判断 / documentation precedence / Commit Message / grandfather policy

## 10. Documentation Authority

同一事項の記述が衝突する場合は、`08_final_decisions.md` の優先順位に従う。

`01` / `03` に残る旧TBD・旧案は未決事項ではなく、後続資料で確定済みの内容として扱う。

## 11. Implementation Rule

Implementation前に関連実装を横断調査する。

```text
Investigation
→ Contract
→ Collision
→ Impact
→ Implementation
→ Test
→ Fix
→ Retest
```

設計書と実装が乖離している場合、既存実装を無条件に正とせず、Domain Contractとの衝突を確認する。

製造開始前に追加のProduct Decisionを必須とする事項はない。
