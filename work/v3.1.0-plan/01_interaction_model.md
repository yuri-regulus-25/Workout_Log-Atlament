# Workout CRUD Interaction Model

Related Issue: #138

## 1. Application

Workout CRUDは既存Workout Domainとは独立したApplicationとする。

Framework：

- Vue 3
- TypeScript
- Vite
- Vue Router
- Vuetify

既存Workout DomainからCRUDへの導線追加を必須としない。

既存Workout Domainの「存在しないDateへのアクセスはError」等の既存Route Contractは変更しない。

Workout CRUDはNavigation上独立Applicationとして扱う。

Application名、Portal文言、Navigation文言はTBD。

## 2. Stepper

`v-stepper` を使用する。

**Vertical Stepper固定。**

Stepは3段階とする。

1. Date Selection
2. Session Edit
3. Confirmation

Stepタイトル・Step説明文はTBD。

## 3. Step 1 — Date Selection

### 3.1 Component

`v-date-picker`

単一Date選択。

Label等のUI CopyはTBD。

### 3.2 Selectable Range

選択可能：

- 過去日
- 画面アクセス時点の当日

選択不可：

- 未来日

上限Dateは画面アクセス時に取得したLocal Dateを保持する。

画面表示中に日付境界を跨いでも自動的に上限Dateを変更しない。

### 3.3 Workout Marker

既存Workout Sessionが存在するDateはDatePicker上で視覚的に識別可能とする。

MarkerはWorkout存在有無のみを示す。

以下は表示しない。

- Session件数
- Session Name
- Machine
- Validation State

具体的なMarker表現はVuetify APIおよび既存Themeに合わせて実装時決定する。

### 3.4 Action

Date未選択時：

- `次へ` disabled

Date選択後：

- `次へ` enabled

`次へ` 押下で対象DateのSessionをロードしてStep 2へ進む。

Step 1へ戻った場合、以前のStep 2 Working Modelは再利用しない。

## 4. Step 2 — Session Edit

### 4.1 Session Selector

Sessionは `v-select` で選択する。

Label等のUI CopyはTBD。

例：

```text
Session1
Session2
Session3
+ 新規Session
```

既存Sessionが1件以上存在する場合：

- 初期値はSession1

既存Sessionが0件の場合：

- `+ 新規Session` を初期選択
- Create Working Modelを初期化

同一Dateに複数Sessionが存在することを正常状態として扱う。

Dateだけから編集対象SessionをDomain側で暗黙決定しない。

## 5. Create Working Model

新規Session選択時は以下を初期生成する。

```text
Gym
  null

Machines
  Machine 1
    machine
      null

    Sets
      Set 1
        reps
          null
        weight
          null
        notes
          null

Session Notes
  null
```

Minimum構造を初期生成することで、Machine / Setを0件とするUI状態を通常操作では発生させない。

## 6. Dirty Session Switch

Step 2でWorking Model変更後、Session Selectorから別Sessionまたは `+ 新規Session` を選択した場合、Maintenance共通Dialogを表示する。

表示文言：

```html
入力内容は破棄されます。<br />
本当に切り替えますか？
```

Primary Action：

```text
切り替える
```

Cancel Action：

```text
戻る
```

`切り替える`：

- Current Working Model完全破棄
- Selected Session変更
- Existing Sessionなら再ロード
- New SessionならCreate Working Model生成

`戻る`：

- Dialog Close
- Current Working Model保持
- Session Selectorを元Selectionへ戻す

Dirtyでない場合は確認せず即時切替可能。

Draft / Auto Save / Session間Carryは提供しない。

## 7. Step Back Policy

### Step 2 → Step 1

確認Dialogは表示しない。

以下を完全破棄する。

- Working Model
- Dirty State
- Validation State
- Session Selection
- Date依存Session Data
- Create/Edit Mode State

再度Step 2へ進む場合はAPI / Runtimeから再ロードする。

必要であれば `cloneDeep` 等を使用してPersistence SourceとWorking Modelの参照を完全分離する。

### Step 3 → Step 2

以下を保持する。

- Working Model
- Validation State
- Current Mode
- Session Selection

確認内容を修正する目的のBackward Navigationとして扱う。

## 8. Step 2 Form Layout

Formの大分類は以下とする。

1. Gym
2. Session Content

Outer Formは原則 `v-row / v-col` を使用する。

基本表示：

```text
cols=3
  Field Label

cols=9
  Field Content
```

細部のGrid Nestingは実装裁量とする。

## 9. Gym

Component：

```text
v-select
```

Properties：

- dense
- Required
- Master-based Select
- UI表示は日本語名
- 保存値はMaster Domain Value / ID
- Label等のUI CopyはTBD

新規Write時に選択可能なGymはValidなMaster Entryに限定する。

## 10. Session Content

1 Machine = 1 ExpansionPanelとする。

```text
Session Content

ExpansionPanel
  Machine 1
    Set 1
    Set 2
    ...

ExpansionPanel
  Machine 2
    ...
```

## 11. Expansion Panel Header

### Collapsed

```text
[Validation Icon] マシン日本語名
```

Validation Icon：

| State | Icon | Color |
| --- | --- | --- |
| Not Validated | `mdi-help-circle-outline` | Orange |
| All Pass | `mdi-check-circle` | Green |
| One or More Fail | `mdi-alert` | Red |

### Expanded

```text
マシン日本語名
```

Validation IconはExpanded Headerでは表示しない。

ValidationはRealtime実行する。

Input変更後に古いPass Stateを保持せず、変更内容に対して即時再評価する。

## 12. Machine Layout

Machine Block：

- `v-card`
- outlined
- dense
- `mb-4`

Outer Layout概念：

```text
v-row dense

cols=11
  Machine Card

cols=1
  Actions
    Add
    Delete
```

Machine Card内部の基本概念：

```text
Machine Number
Machine Select
Set List
```

詳細Gridは必要に応じて `1 / 10 / 1` 等を使用するが、Design Contractとして特定Grid値を強制しない。

### Machine Number Icon

`mdi-numeric-*-box-outline`

Themeに応じてBlack / White。

Machine最大件数が10のため、1～10を扱う。

### Machine Select

- `v-select`
- dense
- Master-based
- UI表示：日本語名
- Required
- Session内Unique
- Label等のUI CopyはTBD

同一Sessionですでに選択されているMachineは、他Machine Selectでは選択不可とする。

UI上でdisabledとし、ValidationでもUniqueを保証する。

## 13. Machine Actions

### Add

Icon：

```text
mdi-plus-thick
```

意味：

**対象Machineの直下に新しいMachineを挿入する。**

最大10 Machine。

10件到達時：

- Add disabled

### Delete

Icon：

```text
mdi-trash-can
```

Color：

```text
Red
```

意味：

**対象Machineを削除する。**

MachineはSession内最低1件必要。

1件のみの場合：

- Delete disabled

## 14. Set Layout

1 Set = 1 `v-card`

Properties：

- outlined
- dense
- `mb-2`

概念構造：

```text
Set Number

Reps      Weight
Notes

Actions
  Add
  Delete
```

Reps / Weight：

- 横並び
- 50:50
- 同幅
- 不要なGapなし

実装例としてFields内部のみ

```text
v-row no-gutters

v-col cols=6
  Reps

v-col cols=6
  Weight
```

としてよい。

NotesはReps + Weightの合計幅に揃える。

Outer Layoutを12-gridで厳密固定する必要はない。

## 15. Set Fields

### Reps

Component：

```text
v-text-field
```

Properties：

- dense
- Number
- Required
- Integer
- Minimum 1
- Suffix `reps`
- Label等のUI CopyはTBD

0以下は不可。

### Weight

Component：

```text
v-text-field
```

Properties：

- dense
- Number
- Required
- Minimum 0
- Suffix `kg`
- Label等のUI CopyはTBD

0kgは許容する。

負数は不可。

### Set Notes

Component：

```text
v-textarea
```

Properties：

- dense
- Nullable
- Maximum 400 characters
- Label等のUI CopyはTBD

## 16. Set Actions

### Add

Icon：

```text
mdi-plus-thick
```

意味：

**対象Setの直下に新しいSetを挿入する。**

Maximum：

```text
10 Sets / Machine
```

10件到達時：

- Add disabled

### Delete

Icon：

```text
mdi-trash-can
```

Color：

```text
Red
```

Minimum：

```text
1 Set / Machine
```

1件のみの場合：

- Delete disabled

## 17. Session Notes

Machine Listの最下部にSession全体Notesを配置する。

Component：

```text
v-textarea
```

Properties：

- dense
- Nullable
- Maximum 400 characters
- Label等のUI CopyはTBD

Set NotesとはDomain上別フィールドとして扱う。

## 18. Step 2 Actions

基本：

```text
[次へ] [戻る]
```

Existing Session：

```text
[次へ] [削除] [戻る]
```

`次へ`：

- dense
- `--wl-primary-strong`

`戻る`：

- text
- dense

`削除`：

- Existing Sessionのみ表示
- Destructive Action
- Maintenance共通Design

Create時はDelete Actionを表示しない。

## 19. Step 3 — Confirmation

Create / Update時はStep 2と同一の情報順・階層を維持する。

入力Componentは使用せずRead Only表示とする。

`v-text-field` / `v-textarea` 等を以下へ置換する。

```text
v-row
  v-col cols=3
    p (Field Name / Bold)

  v-col cols=9
    p (Value)
```

**項目名側の `p` は太字表示とする。**

値側のTypography等の詳細DesignはTBD。

例：

```text
Reps     10 reps
Weight   25 kg
Notes    ...
```

Machine / Setの視覚階層はStep 2に準拠する。

Set表示について `v-data-table` 採用を検討可能とする。

ただし以下を優先する。

- Step 2との構造的一貫性
- Notes可読性
- Small Screenでの可読性

そのため `v-data-table` は必須仕様としない。

## 20. Delete Confirmation

Delete Action選択時のStep 3は通常Confirmation Formを表示しない。

固定文言：

```html
このワークアウトログが削除されます<br />
本当によろしいですか？
```

Final Action：

```text
[削除する] [戻る]
```

## 21. Final Actions

Create：

```text
[登録する] [戻る]
```

Update：

```text
[更新する] [戻る]
```

Delete：

```text
[削除する] [戻る]
```

Primary Action：

```text
--wl-primary-strong
```

Button Design / dense / spacingはMaintenance画面と共通。

## 22. API Result Transition

Final Action実行中は二重送信を禁止する。

### Success

- SnackbarでAPI Status表示
- Step 1へ遷移
- Working Model破棄
- Validation State破棄
- Session Selection破棄
- 対象Date情報再取得
- DatePicker Workout Marker更新

### Failure

通常API Failure / Server Validation Failure：

- SnackbarでAPI Status表示
- Step 2へ遷移
- Working Model保持
- 修正可能状態へ戻す

Conflictは `03_validation_conflict_verification.md` のContractに従う。

## 23. Design System

以下はMaintenance画面準拠。

- Button Color
- dense
- Dialog
- Card
- Input
- Snackbar
- Destructive Action
- Theme
- Spacing

Workout CRUD独自のVisual Token追加は原則行わない。
