# Atlament v3.0.0 UI / Component Responsibility Draft

## 1. 目的

v3.0.0ではUI刷新だけでなく、Frontendのリファクタリングと人間可読性の改善を行う。

本資料は、現行画面をユーザーから見える責務単位で分解した初期設計案である。
実装都合から先にコンポーネント境界を決めず、まず視覚上・UX上の責務を基準に分割する。

本資料のファイル構成・名称は確定仕様ではない。現行実装を確認した結果、責務がさらに複雑である場合は追加分割し、逆に実質的な責務を持たない薄いラッパーになる場合は統合を検討する。

## 2. 共通方針

### 2.1 分割原則

基本的な考え方は以下とする。

```text
Screen
└─ 画面上で意味のある責務領域
   └─ 独立して変更・修正されるUI単位
      └─ 必要な場合のみ内部責務を追加分割
```

全画面を同一のテンプレートへ押し込まない。
Headline / Search / Details等の名称や階層を共通化すること自体を目的とせず、各画面にとって自然な責務境界を採用する。

### 2.2 コンポーネント分割

- Cardは原則として1 Card = 1 Component = 1 Fileとする。
- 領域ComponentとCard Componentは分離する。領域内にCardが1枚しか存在しない場合も、意味上の責務が異なるなら省略しない。
- Dialogは原則として1 Dialog = 1 Component = 1 Fileとする。
- Dialog内の入力項目は、業務上・画面上の意味単位でComponent化する。
- Table、Calendar、Chart等は内部責務や実装量を確認し、必要に応じて追加分割する。
- ファイル数削減よりも、不具合箇所・変更箇所を人間が自然に特定できることを優先する。
- Atomic Designを機械的に適用しない。分割可能であること自体を分割理由にしない。

### 2.3 Framework

責務境界とUX上の意味は共通化するが、Framework固有の実装方法は統一しない。

対象にはReact、Vue.js、Angular、Svelte、SolidJSが存在する。
props、hooks、signals、stores等は各Frameworkで自然な方法を採用する。

### 2.4 Chart

ApexCharts等を使用するCardでは、以下のどちらを採用するかは実装量を確認して判断する。

```text
Card
└─ Card内にChart実装を含む
```

または

```text
Card
└─ Chart Component
```

Chartライブラリを使用しているという理由だけで分割しない。
Card本来の責務理解を妨げる程度にChart設定・描画処理が肥大化している場合は分離する。

## 3. Application Shellとの境界

各画面上部に存在する画面名、パンくず相当情報、説明文等は、新Application ShellのHeaderへ責務を移管する候補とする。

Shell適用後の情報量・利用可能領域を確認して最終判断する。
画面固有コンテンツの分割は、原則としてShell内部のMain Surfaceに配置されるScreen Contentを対象とする。

## 4. Dashboard

Framework: React

基本構造:

```text
Dashboard
├─ Headline
│  └─ Metric Card × N
└─ Details
   └─ Details Card × N
```

構成案:

```text
Dashboard/
├─ Dashboard.tsx
├─ headline/
│  ├─ DashboardHeadline.tsx
│  └─ card/
│     └─ DashboardMetricCard.tsx
└─ details/
   ├─ DashboardDetails.tsx
   └─ card/
      ├─ VolumeTrendCard.tsx
      ├─ LatestWorkoutCard.tsx
      ├─ SetCountTrendCard.tsx
      ├─ TrainingBalanceCard.tsx
      └─ RecentWorkoutsCard.tsx
```

### Headline

Metric Cardは現状すべて同型であるため、タイトルと表示値を受け取る単一Componentとして扱う。
各指標ごとに別ファイルは作成しない。

Headline側がCard群の並び・配置・レスポンシブを担当し、Metric Cardは1件の表示責務のみを持つ。

### Details

DetailsはCardごとに内容・変更理由が異なるため、1 Card単位で1ファイルとする。

ApexChartsを使用するCardについては、ChartをCard内に含めるかChart Componentへ分割するかを現行実装確認後に判断する。

## 5. Analytics

Framework: Svelte

基本構造:

```text
Analytics
├─ Headline
│  └─ Metric Card × N
├─ Search
│  └─ Global Period Card
└─ Details
   └─ Details Card × N
```

SearchはCardが1枚のみであっても、Search領域とGlobal Period Cardを分離する。
Searchは検索・期間指定領域としての配置責務、Global Period Cardは実際の期間表示・条件入力UIを担当する。

Detailsは分析内容ごとに1 Card = 1 Component = 1 Fileとする。
Chart系Componentの内部構造はDashboardと同じ基準で判断する。

## 6. Performance Detail

Framework: Angular

基本構造:

```text
Performance Detail
├─ Search
│  └─ Search Target Card
├─ Headline
│  └─ Metric Card × N
└─ Details
   ├─ Best Weight Progress Card
   ├─ Summary Card
   └─ Workout History Card
```

Search、Headline、Detailsを意味領域として分割し、それぞれのCard実装と領域Componentを分離する。

Best Weight Progress等のChartについては、Card内包またはChart Component分離を実装量に応じて判断する。

## 7. Workout Domain

Framework: Vue.js

この画面ではHeadline / Details型へ寄せず、画面機能そのものを以下の3領域として扱う。

```text
Workout Domain
├─ Search
├─ Calendar
└─ List
```

構成案:

```text
workout-domain/
├─ WorkoutDomain.vue
├─ search/
│  ├─ WorkoutSearch.vue
│  └─ card/
│     └─ WorkoutSearchCard.vue
├─ calendar/
│  ├─ WorkoutCalendar.vue
│  └─ card/
│     └─ WorkoutCalendarCard.vue
└─ list/
   ├─ WorkoutList.vue
   └─ card/
      └─ WorkoutListCard.vue
```

Calendar内部の日セル、月操作等は現行実装の複雑性を確認して追加分割を判断する。

List内部のTable、Pagination等も同様に、操作責務・実装量が十分に独立している場合は追加分割する。

## 8. Workout Domain - Details

Framework: Vue.js

この画面は他画面のHeadline / Details等の名称へ無理に合わせない。
画面固有の責務境界を優先する。

初期的には以下のような責務が存在する。

```text
Workout Domain Details
├─ Session Overview相当
│  ├─ Session識別情報
│  ├─ Previous / Next
│  └─ Metric Card × N
├─ Session Compare相当
│  └─ Compare Card
└─ Workout Detail相当
   └─ Machine Detail × N
```

名称は仮とする。

Workout Detail内部では、マシン1件ごとの表示ブロックが明確な反復・責務単位となるため、Machine Detailを独立Component候補とする。
Machine Detail内のSet Table等をさらに分割するかは現行実装確認後に判断する。

## 9. Application Settings

Framework: SolidJS

この画面は、各設定カテゴリのCardそのものが意味領域になっているため、中間的なHeadline / Details等の領域Componentを無理に設けない。

```text
Application Settings
├─ Initial Setup Card
├─ Application Framework Status Card
├─ GitHub Repository Source Card
├─ Resource Data Card
├─ Timeout Limits Card
├─ GitHub Token Card
└─ Remote Data Sync Card
```

基本方針は設定カテゴリ1つ = Card 1つ = Component 1つ = File 1つ。

Resource Data等、Card内部に明確な反復単位や独立責務があり、実装が肥大化している場合のみ追加分割する。

## 10. Resource Management

Framework: Vue.js + Vuetify

見た目上は大きな管理Panel 1枚だが、内部に複数の操作責務が存在するため、責務単位で分割する。

初期案:

```text
ResourceManagement
├─ Management Panel
│  ├─ Filters
│  ├─ Table
│  │  └─ Row
│  └─ Pagination
└─ Dialog
   ├─ Create Dialog
   ├─ Edit Dialog
   └─ その他必要なDialog
```

構成案:

```text
resource-management/
├─ ResourceManagement.vue
├─ panel/
│  ├─ ResourceManagementPanel.vue
│  ├─ ResourceFilters.vue
│  ├─ table/
│  │  ├─ ResourceTable.vue
│  │  └─ ResourceTableRow.vue
│  └─ ResourcePagination.vue
└─ dialog/
   ├─ ResourceCreateDialog.vue
   ├─ ResourceEditDialog.vue
   └─ fields/
      └─ 各入力責務Component
```

Vuetify DataTable等の機能と強く一体化しており、分離することで不自然な薄いラッパーになる場合は、現行実装を確認した上で境界を調整する。

### Dialog内部の入力Component

Dialog本体だけでなく、VSelect / VTextField等で構成される入力についても意味単位でComponent化する。

目的は再利用性ではなく、以下を優先するためである。

- 不具合修正時の探索範囲を狭める。
- 入力項目単位で異常を局所化し、異常検知を容易にする。
- validation、disabled条件、表示条件、値変更処理等を意味のある入力責務へ閉じ込める。

ただし、`VTextField.vue` や `VSelect.vue` のようなVuetify Componentそのものを包む汎用ラッパーを作ることは目的としない。

例:

```text
ResourceNameField.vue
ResourceTypeSelect.vue
BodyPartSelect.vue
```

のように、業務・画面上の意味をComponent名へ反映する。

## 11. 実装フェーズでの確認手順

本資料の境界案をそのまま機械的に実装しない。

実装時は以下の順序で確認する。

1. 本資料の視覚・UX責務ベースの境界案を確認する。
2. 現行ソースをリバースエンジニアリングする。
3. 現行実装の状態管理、データ取得、イベント、Chart、Table、Dialog等の責務を確認する。
4. 視覚上の責務境界と現行実装上の責務を比較する。
5. Componentが肥大化する場合は追加分割する。
6. 実質的な責務を持たない薄いComponentになる場合は統合を検討する。
7. Framework固有の自然な実装方法へ落とし込む。

Codex等による実装提案で分割粒度に迷う場合は、ファイル数の少なさではなく「不具合・変更箇所を人間が自然に追跡できるか」を優先して判断する。

## 12. 現時点の位置付け

本資料はv3.0.0の画面コンポーネント再設計における初期素案であり、Production品質の最終設計ではない。

Application Shell適用後の利用可能領域、現行実装の依存関係、各Frameworkの実装特性を確認しながら最終的なComponent境界を決定する。
