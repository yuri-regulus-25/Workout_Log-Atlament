# v3.1.0 — Workout CRUD

Planning branch: `release-3.1.0-plan`

## 1. Purpose

Workout LogをRaw JSONではなくDomain Modelとして安全にCreate / Update / Physical Deleteする、独立したWorkout CRUD Applicationを追加する。

Frontend Frameworkは以下とする。

- Vue 3
- TypeScript
- Vite
- Vue Router
- Vuetify

既存Workout Domainは閲覧用途として維持し、存在しないDateへのアクセス等を含む既存ルーティング仕様をCRUD都合で変更しない。

Workout CRUDは既存Workout Domainとは独立したApplication / Navigation導線として提供する。

Portal上の表示名、Navigation文言、画面名、Stepタイトル・説明文、各Vuetify ComponentのLabel等のUI Copyは別途決定する。

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
- Portal / Navigation文言確定
- Stepタイトル / Step説明文確定
- 各ComponentのLabel / Placeholder等のUI Copy確定

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

Workout CRUD ApplicationはVertical Stepperを使用する。

```text
Step 1
Date Selection
    ↓
Step 2
Create / Edit
    ↓
Step 3
Confirmation
    ↓
API Write
 ├─ Success → Step 1
 └─ Failure → Step 2
```

Stepperは縦型を固定仕様とする。

StepタイトルおよびStep説明文は別途決定する。

## 5. Step Summary

### Step 1

Dateを `v-date-picker` で選択する。

選択可能範囲は過去から画面アクセス時点の当日までとし、未来日は選択不可とする。

既存Workoutが存在するDateはDatePicker上で視覚的に識別可能とする。

Session数等の詳細情報はDatePicker上では表示しない。

### Step 2

選択Dateに存在するSessionを読み込み、CreateまたはEditを行う。

Session選択は `v-select` とする。

選択肢：

- Session1
- Session2
- ...
- + 新規Session

既存Sessionが存在する場合の初期値はSession1とする。

Create / Editは同一Form Componentを使用する。

既存Session選択時のみDelete Actionを表示する。

### Step 3

Create / Update時はStep 2と同一情報構造をRead Onlyで表示する。

Delete時は固定確認文言を表示する。

Write実行後：

- Success → Snackbar表示後、Step 1へ戻る
- Failure → Snackbar表示後、Step 2へ戻る

## 6. Save Contract

保存単位はDateではない。

**1回のユーザー保存操作 = 1 Domain Mutation = 1 Atomic Git Commit**

Create / Update / Deleteによって複数Resource変更が必要な場合も、1回のユーザー操作に含まれる変更は1 commitへまとめる。

Raw JSON、任意Path、任意Branch、任意Commit MessageをFrontendへ公開しない。

Workout CRUD専用Domain Write APIのみを公開する。

## 7. Validation Authority

Validationは二層とする。

1. Client Validation
   - UX目的
   - Realtime
2. Server Validation
   - 最終権威
   - Persistence直前に必須

Client Validation成功のみをWrite条件としない。

Server側で必ずDomain / Resource / Reference / Revisionを再検証する。

## 8. State Policy

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

## 9. Design System

Workout CRUD独自のVisual Ruleは原則追加しない。

以下はMaintenance画面と共通とする。

- Button Design
- dense
- Dialog Design
- Spacing感
- Destructive Action
- Theme
- Primary Action
- Snackbar
- Form Component Design

Primary Actionは `--wl-primary-strong` を使用する。

詳細は `01_interaction_model.md` を参照する。

## 10. Implementation Rule

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

## 11. Work Units

1. `01_interaction_model.md`
   - UI / UX
   - Stepper
   - Form
   - Component
   - State Transition

2. `02_write_contract.md`
   - Domain Mutation
   - Persistence
   - API
   - Atomic Git Write
   - Revision

3. `03_validation_conflict_verification.md`
   - Validation
   - Conflict
   - Error
   - Test / Verification
