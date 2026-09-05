# Atlament v3.0.0 — UIコンポーネント責務 実装指示書

## 1. 目的

v3.0.0ではUI刷新と同時に、Frontend実装の責務整理と人間可読性の改善を行う。

本資料は、各画面を「ユーザーから見て意味のあるUI責務」で分解し、実装時にどの単位でComponent / Fileを分けるかを判断するための指示書である。

実装都合から先に境界を決めてはならない。まず画面上の責務を確認し、その後に現行ソースの状態管理・イベント・データ取得・Chart・Table・Dialog等の実装責務と照合する。

本資料に記載したFile名は基本案である。現行ソース確認の結果、記載通りに分けると責務が不自然になる場合のみ調整してよい。

---

## 2. 共通原則

### 2.1 分割の優先順位

以下の順序で責務を考える。

```text
Screen
└─ 画面上で意味のある大きな領域
   └─ 独立して変更・修正されるUI単位
      └─ 必要な場合のみ内部責務を追加分割
```

全画面を同じ階層・同じ名称へ無理に揃えない。

`Headline` / `Search` / `Details` などの名称は、画面の意味に合う場合のみ使用する。

Atomic Designを機械的に適用しない。

### 2.2 Card

原則として **1 Card = 1 Component = 1 File** とする。

ただし、同型Cardを値・表示文言だけ変えて反復する場合は、CardごとにFileを複製せず共通Component 1つを反復利用する。

親Componentは以下を担当する。

- Cardの並び順
- Cardの個数
- Layout
- responsive時の並び替え

Card Componentは以下を担当する。

- Card 1件の表示
- Card 1件に閉じた表示ロジック

`v-for`、`map`等で反復していることを理由に、Card Componentを作らず親へ表示責務を詰め込んではならない。

### 2.3 領域ComponentとCard

領域ComponentとCard Componentは責務が異なる場合は分離する。

Cardが1枚しかないことだけを理由に領域Componentを省略しない。

一方、Cardそのものが最上位の意味領域であり、中間Componentに責務がない場合は無意味なWrapperを作らない。

### 2.4 Dialog

原則として **1 Dialog = 1 Component = 1 File** とする。

Dialog内の入力項目も、意味のある入力責務ごとにComponent化する。

目的は再利用性より、不具合修正時の探索範囲を狭めることにある。

入力Componentへ閉じ込めてよい責務は以下。

- 値の表示
- validation
- disabled条件
- 表示条件
- 入力変更処理
- 入力項目固有の補助表示

ただし、`VTextField.vue`、`VSelect.vue`のようなUI部品そのものを包むだけの汎用Wrapperを作らない。

Component名には入力項目の意味を反映する。

例:

```text
ResourceNameField.vue
ResourceTypeSelect.vue
BodyPartSelect.vue
```

### 2.5 Table / Calendar / Chart

Table / Calendar / Chartは、存在するだけで自動的に追加分割しない。

以下のいずれかに該当する場合に追加分割する。

- 親Componentの責務理解を妨げるほど実装量が大きい。
- 単独で変更される可能性が高い。
- 独立した状態・イベント・描画責務を持つ。
- 不具合発生時に独立して切り分けたい。

ApexCharts等のChartも同様とする。

```text
Card
└─ Chart実装を内包
```

または

```text
Card
└─ Chart Component
```

のどちらかを、現行実装量を確認して判断する。

### 2.6 Framework

責務境界は共通の考え方を使うが、Framework固有の実装方法を統一しない。

対象Framework:

- React
- Vue.js
- Angular
- Svelte
- SolidJS

props / hooks / signals / stores等は各Frameworkで自然な方法を採用する。

共通化するのは責務の考え方であり、Framework固有APIではない。

---

## 3. Application Shellとの境界

画面名と説明文はApplication Shell Headerへ移す。

各Screen Component内で旧Headerを残して二重表示しない。

Main Surface内には画面固有UIのみを置く。

以下はScreen側に残す。

- Search
- Filter
- Period Selector
- Session Navigation
- 作成 / 編集操作
- 画面固有データ

Shell責務の詳細は `XX_application-shell-design.md` を参照する。

---

## 4. Dashboard

Framework: React

### 4.1 基本構造

```text
Dashboard
├─ Headline
│  └─ Metric Card × N
└─ Details
   └─ Details Card × N
```

基本File構成:

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

### 4.2 実装責務

`Dashboard.tsx`
- Dashboard画面全体を構成する。
- HeadlineとDetailsを配置する。
- 個別Cardの内部表示ロジックを持たない。

`DashboardHeadline.tsx`
- Metric Card群の並び・配置を担当する。
- 指標データを `DashboardMetricCard.tsx` へ渡す。

`DashboardMetricCard.tsx`
- Metric Card 1件を表示する。
- 同型CardごとにFileを増やさない。

`DashboardDetails.tsx`
- Details Card群の配置を担当する。

各Details Card
- Cardごとの固有表示・Chart・データ表現を担当する。
- 別Cardの表示責務を持たない。

ApexCharts部分は、設定量がCard理解を妨げる場合のみChart Componentへ分離する。

### 4.3 完了確認

- Metric Cardが1つの共通Componentで反復されている。
- Details CardがCard単位で分離されている。
- Dashboard親Componentへ個別Card描画が集中していない。

---

## 5. Analytics

Framework: Svelte

### 5.1 基本構造

```text
Analytics
├─ Headline
│  └─ Metric Card × N
├─ Search
│  └─ Global Period Card
└─ Details
   └─ Details Card × N
```

### 5.2 実装責務

`Search`
- 検索・期間指定領域の配置を担当する。

`Global Period Card`
- 実際の期間表示と条件入力UIを担当する。

Cardが1枚しかなくても、Search領域とGlobal Period Cardは分離する。

`Details`
- 分析Card群の配置を担当する。

各Details Card
- 分析内容ごとの表示責務を持つ。

Chart分割判断はDashboardと同じ基準を使用する。

### 5.3 完了確認

- SearchとGlobal Period Cardが別責務として分かれている。
- Details Cardが分析内容ごとに分離されている。
- Svelte固有の自然な状態管理を維持している。

---

## 6. Performance Detail

Framework: Angular

### 6.1 基本構造

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

### 6.2 実装責務

- Searchは検索対象選択領域を担当する。
- Search Target Cardは検索条件UIを担当する。
- HeadlineはMetric Card群の配置を担当する。
- Metric Cardは1件表示の共通Componentとする。
- Detailsは詳細Card群の配置を担当する。
- 3種のDetails Cardは個別Fileへ分ける。

Best Weight ProgressのChartは、Card実装量を確認して内包 / 分離を判断する。

### 6.3 完了確認

- Search / Headline / Detailsが意味領域として分かれている。
- 3種のDetails Cardが個別責務として追跡できる。
- AngularのComponent分割が責務境界と一致している。

---

## 7. Workout Domain

Framework: Vue.js

### 7.1 基本構造

この画面はHeadline / Details形式へ寄せず、機能単位で分ける。

```text
Workout Domain
├─ Search
├─ Calendar
└─ List
```

基本File構成:

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

### 7.2 実装責務

`WorkoutDomain.vue`
- Search / Calendar / Listを配置する。

`WorkoutSearch.vue`
- 検索領域の配置を担当する。

`WorkoutCalendar.vue`
- Calendar領域の配置を担当する。

`WorkoutList.vue`
- 一覧領域の配置を担当する。

各Card
- 各領域の実表示を担当する。

CalendarHeader / Grid / Day Cell等は、現行Calendar実装の複雑性を確認して必要な場合のみ追加分割する。

Table / Paginationも、Vuetify等との結合度と独立責務を確認して判断する。

### 7.3 完了確認

- Search / Calendar / Listの3責務が親で混在していない。
- Calendar内部を機械的に細分化していない。
- List内部のTable / Pagination分割が実装責務と一致している。

---

## 8. Workout Domain Details

Framework: Vue.js

### 8.1 基本構造

他画面の名称へ無理に揃えない。

```text
Workout Domain Details
├─ Session Overview 相当
│  ├─ Session識別情報
│  ├─ Previous / Next
│  └─ Metric Card × N
├─ Session Compare 相当
│  └─ Compare Card
└─ Workout Detail 相当
   └─ Machine Detail × N
```

領域名は仮称であり、実装時に既存命名との整合を確認して決定してよい。

### 8.2 実装責務

Session Overview相当
- 日付
- Gym
- Session識別
- Previous / Next
- Metric Card群

Session Compare相当
- 比較値
- 差分
- 追加 / 削除されたMachine情報

Workout Detail相当
- Machine Detail群の配置

Machine Detail
- Machine 1件の名称・要約・Performance導線・Set一覧を担当する。
- Machineごとの反復単位として独立Component化する。

Set Tableは実装量・イベント量が大きい場合のみ追加分割する。

### 8.3 完了確認

- Session識別 / Compare / Machine Detailの責務が混在していない。
- Machine Detailが1件単位で独立している。
- Set Tableを必要以上に分割していない。

---

## 9. Application Settings

Framework: SolidJS

### 9.1 基本構造

各設定Cardそのものを最上位の意味領域として扱う。

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

### 9.2 実装責務

設定カテゴリごとに **1 Card = 1 Component = 1 File** とする。

Headline / Details等の中間Wrapperは、独立した配置責務を持たない限り作らない。

Card内部に明確な反復単位があり、実装が肥大化している場合のみ内部Componentを追加する。

### 9.3 完了確認

- 設定カテゴリごとにFileを追跡できる。
- 無意味な中間Wrapperが増えていない。
- SolidJSの自然な状態管理を維持している。

---

## 10. Resource Management

Framework: Vue.js + Vuetify

### 10.1 基本構造

見た目上は大きなPanel 1枚だが、操作責務が複数存在するため内部を分ける。

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

基本File構成:

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

### 10.2 Filters

`ResourceFilters.vue` は以下の絞り込みUIを一つの表示条件責務として扱う。

- Master / unresolved reference
- Machine / Gym
- Active / Deleted / All

Button 1つごとにComponentを作らない。

### 10.3 Table / Row

`ResourceTable.vue`
- Table全体の列・一覧表示・行反復を担当する。

`ResourceTableRow.vue`
- Resource 1件の表示と行単位Actionを担当する。

行ごとに編集・削除等のActionが存在するため、Rowは独立Component候補とする。

Vuetify DataTableへ強く統合されており、Row分離が不自然になる場合は現行実装を確認して境界調整してよい。

### 10.4 Pagination

Paginationは独立した責務を持つ場合に `ResourcePagination.vue` とする。

Vuetify DataTable内蔵機能と不可分で、別Fileが薄いWrapperになるだけの場合はTableへ残してよい。

### 10.5 Dialog

DialogはDialog単位でFileを分ける。

例:

```text
ResourceCreateDialog.vue
ResourceEditDialog.vue
```

「+ New」Buttonだけを独立Componentにしない。意味のある責務単位はCreate Dialogである。

### 10.6 Dialog内入力

入力項目は意味単位でComponent化する。

例:

```text
fields/
├─ ResourceTypeSelect.vue
├─ ResourceIdField.vue
├─ ResourceNameField.vue
└─ BodyPartSelect.vue
```

入力Componentへvalidation / disabled / 表示条件 / 値変更処理を閉じ込めてよい。

目的は不具合の局所化と探索性向上である。

### 10.7 完了確認

- Filters / Table / Dialogの責務をFile名から追跡できる。
- Row Actionが巨大なTable Componentへ埋もれていない。
- Dialog入力の不具合箇所を入力項目単位で特定できる。
- 汎用VTextField Wrapper等が増えていない。

---

## 11. 実装時の確認手順

各画面のリファクタリングは以下の順序で行う。

1. 本資料に記載した画面上の責務境界を確認する。
2. 対象画面の現行ソースを読み、状態管理・データ取得・イベント・Chart・Table・Dialog等を整理する。
3. 現行Component / FileがどのUI責務を担当しているか対応付ける。
4. 1 Componentに複数の独立責務が混在している箇所を抽出する。
5. 本資料の基本構造へ寄せる。
6. 実装量が大きい箇所のみ追加分割する。
7. 薄いWrapperしか残らない場合は統合を検討する。
8. Framework固有の自然な方法で状態・イベントを接続する。
9. 既存機能が失われていないことを確認する。
10. UI上の変更箇所から対象Fileを自然に探せるか確認する。

本資料と現行ソースが大きく矛盾する場合は、機械的に本資料へ合わせず作業を止め、差異と影響範囲を整理する。

---

## 12. 共通の禁止事項

以下を行わない。

- 全画面を同じComponent階層へ無理に揃える。
- Cardごとの責務差を無視して巨大Componentへまとめる。
- File数を減らすこと自体を目的にする。
- Atomic Designを理由にLabel / Button / Iconまで機械的に細分化する。
- 同一見た目という理由だけでFrameworkを跨いだ共通Componentを作る。
- Dialog入力を1つの巨大Componentへ詰め込む。
- Vuetify等のUI部品を包むだけの意味のないWrapperを量産する。
- 現行仕様を確認せず機能を削除する。

---

## 13. 全体完了条件

対象画面のリファクタリング完了時に、以下を確認する。

- UI責務とFile構造が対応している。
- 変更したいUI領域から対象Fileを推測できる。
- 1 Card = 1責務の原則が守られている。
- 同型反復Cardは共通Component化されている。
- 意味のないWrapperが増えていない。
- Framework固有実装が不自然に共通化されていない。
- 既存機能・遷移・入力・Chart・Table・Dialogが維持されている。
- Application Shellへ移管したHeader責務が各画面へ残っていない。

これらを満たさない場合は、File数の多少ではなく責務境界を再確認すること。