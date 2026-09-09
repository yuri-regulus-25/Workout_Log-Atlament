# Frontend Component Structure

Related Issue: #138

## 1. 方針

Workout Manager の Frontend は Vue 3 + TypeScript + Vite + Vue Router + Vuetify で実装する。

Component 構造は原則 **3 Layer** とする。

```text
App.vue
  ↓
stepN/Step.vue
  ↓
stepN/form/*.vue または stepN/view/*.vue
```

命名は人間が見て即座に用途を判断できる、短く単純な名前を優先する。

以下のような冗長な prefix は使用しない。

```text
WorkoutDatePicker.vue
WorkoutMachineSelect.vue
WorkoutSessionNotes.vue
```

代わりに、配置 Directory を Context として利用する。

```text
step1/form/Date.vue
step2/form/Machine.vue
step2/form/Notes.vue
```

`Workout*` prefix は使用しない。

## 2. App.vue

`App.vue` は Screen 全体の Composition Root とする。

責務は以下に限定する。

- Vertical Stepper
- Current Step 管理
- Step 間 Transition
- Step 間で共有する最低限の State / Event 接続
- 共通 Loading Overlay / Snackbar との接続

各 Step 内の具体的な UI、Validation、Field Rendering は `App.vue` に直接記述しない。

概念構造：

```text
App.vue
  Step 1 -> step1/Step.vue
  Step 2 -> step2/Step.vue
  Step 3 -> step3/Step.vue
```

## 3. Step Layer

各 Step は `stepN/Step.vue` とする。

```text
src/
├─ App.vue
├─ step1/
│  └─ Step.vue
├─ step2/
│  └─ Step.vue
└─ step3/
   └─ Step.vue
```

`Step.vue` はその Step の Layout / Orchestration を担当する。

### step1/Step.vue

主な責務：

- `v-date-picker` を含む Date Selection Layout
- Date Selection State
- `次へ` Action
- Marker API Result の受け渡し

### step2/Step.vue

主な責務：

- Session Selector
- Gym
- Machine ExpansionPanel List
- Set List
- Session Notes
- Add / Delete Action
- Form Validation 集約
- `次へ` / `削除` / `戻る`

Field Component の詳細実装は持たない。

### step3/Step.vue

主な責務：

- Confirmation Alert
- Read Only Confirmation Layout
- Create / Update / Delete Final Action
- `戻る`

## 4. Field / Leaf Component Layer

入力を受け付ける Vuetify Component は原則として Field 単位で分割する。

例：

```text
step1/form/Date.vue
step2/form/Session.vue
step2/form/Gym.vue
step2/form/Machine.vue
step2/form/Reps.vue
step2/form/Weight.vue
step2/form/Notes.vue
```

1 File が 1つの入力責務を持つことを基本とする。

### Date.vue

- `v-date-picker`
- Selectable Range
- Initial Month
- `YYYY/MM/DD` 表示
- Date Marker 表示

### Session.vue

- Session Selector
- `編集するセッション`
- `セッション1`, `セッション2`, ...
- `セッションを追加する`
- Search なし

### Gym.vue

- Gym Select
- Search / Partial Match
- Valid Master Entry のみ表示
- `active: true && deleted: false`
- clearable なし
- placeholder なし

### Machine.vue

- Machine Select
- Search / Partial Match
- 同一 Session 内選択済み Machine を disabled
- `[選択済]` Chip 表示
- Valid Master Entry のみ表示
- clearable なし
- placeholder なし

### Reps.vue

- Integer Input
- `1 <= x <= 100`
- suffix `reps`
- Frontend / Server 共通 Validation Message

### Weight.vue

- Decimal Input
- `0 <= x <= 999.99`
- 小数点以下最大2桁
- suffix `kg`
- Frontend / Server 共通 Validation Message

### Notes.vue

- `v-textarea`
- `rows=2`
- `counter=400`
- nullable
- Set Notes / Session Notes の双方で再利用可能

## 5. Structural Component

Field ではないが Step 内で繰り返される構造は、必要に応じて同一 Step 配下へ分割してよい。

命名は短く、構造が即座に分かる名前とする。

推奨：

```text
step2/block/MachinePanel.vue
step2/block/SetCard.vue
step3/view/Row.vue
step3/view/MachinePanel.vue
step3/view/SetCard.vue
```

ただし、単純な Wrapper まで無条件に Component 化しない。

分割基準：

- Repeated Structure
- 独立した State / Event Boundary
- 100行を大きく超えて責務が読み取りにくくなる場合
- Template の視認性を明確に改善する場合

## 6. 推奨 Directory

```text
src/
├─ App.vue
├─ step1/
│  ├─ Step.vue
│  └─ form/
│     └─ Date.vue
├─ step2/
│  ├─ Step.vue
│  ├─ form/
│  │  ├─ Session.vue
│  │  ├─ Gym.vue
│  │  ├─ Machine.vue
│  │  ├─ Reps.vue
│  │  ├─ Weight.vue
│  │  └─ Notes.vue
│  └─ block/
│     ├─ MachinePanel.vue
│     └─ SetCard.vue
└─ step3/
   ├─ Step.vue
   └─ view/
      ├─ Row.vue
      ├─ MachinePanel.vue
      └─ SetCard.vue
```

`form` は入力 Component、`block` は Step 2 の構造 Component、`view` は Step 3 の Read Only Component として区別する。

## 7. State Ownership

State は可能な限り上位 Component が所有し、Leaf Field は `props` / `emit` または `v-model` Contract で値を受け渡す。

### App.vue が所有するもの

- Current Step
- Selected Date
- Current Mode (`create` / `edit` / `delete`)
- Step 間で必要な Working Model Reference
- API Result Transition に必要な State

### step2/Step.vue が所有するもの

- Session Selection
- Dirty State
- Validation Aggregate
- Machine / Set Collection Operation

### Field Component が所有しないもの

- Git / Persistence Context
- API Endpoint Knowledge
- Session 全体の Mutation Logic
- 他 Field の Validation State
- Step Transition

Leaf Component は Field 表示・入力・Field 単位 Validation に集中する。

## 8. Naming Rule

File 名は原則以下を使用する。

- `Step.vue`
- `Date.vue`
- `Session.vue`
- `Gym.vue`
- `Machine.vue`
- `Reps.vue`
- `Weight.vue`
- `Notes.vue`
- `MachinePanel.vue`
- `SetCard.vue`
- `Row.vue`

以下は避ける。

- `Workout*`
- `WorkoutManager*`
- `WorkoutCrud*`
- Directory Context と重複する長い名称

Directory を見れば意味が分かるため、File 名に Domain 名を重複させない。

## 9. 実装裁量

以下は製造時に調整可能とする。

- `block` / `view` の細かな分割数
- composable 抽出
- Validation helper の配置
- API Client / DTO / Mapper の配置
- Type file の配置
- Vuetify Version に応じた Property 名

ただし、以下は維持する。

1. `App.vue` は Stepper 中心。
2. 各 Step は `stepN/Step.vue` に分離。
3. 入力 Field は Field 単位で Leaf Component 化。
4. 人間が見て用途が即座に分かる簡単な命名。
5. `Workout*` prefix は使用しない。
