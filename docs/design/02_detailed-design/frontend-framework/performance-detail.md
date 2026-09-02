# Performance Detail 現行仕様と設計方針

## 責務

Performance Detail は Machine ごとの Workout 履歴と単純な Performance 指標を表示する。

Workout Data または Master Data は編集しない。

## Source / Framework

```text
src/frontend/machines-angular/
```

- Angular
- TypeScript
- ng-apexcharts / ApexCharts

## Routes

```text
/machines/
/machines/:id
```

Hosted MPA contract は英数字、`_`、`-` で構成される Machine ID を認識する。

## Data Access

Performance Detail は `@workout-lab/workout-data` の `loadRuntimeWorkoutSessions()` を使用する。

読み込み時の問題は Data Load Warning として表示する。

## Machine 選択

Machine 選択は URL と同期する。利用者が Machine を選択した場合は、その Machine ID を URL に反映する。

### 現行実装

現行実装は、URL の Machine ID が不正または不足している場合、最初の利用可能 Machine または `abdominal` へ自動 fallback し、`history.replaceState` で URL を書き換える。

### 修正する設計

この自動 fallback は [共通設計原則](../../01_basic-design/design-principles.md) の「Hidden Magic を避ける」に反するため廃止する。

- `/machines/` のように Machine が未指定の場合は異常扱いにせず、「表示するマシンを選択してください」等の未選択状態を表示する。
- `/machines/:id` の ID が有効な場合のみ、その Machine を表示する。
- ID の形式が不正、または該当 Machine が存在しない場合は、指定された Machine を表示できないことを明示し、Machine 選択へ戻る導線を提供する。
- 利用者が指定していない別 Machine を自動選択しない。
- `abdominal` 固定 fallback を使用しない。
- 不正 ID を理由に別 Machine の ID へ URL を自動書き換えしない。

この節は実装変更予定を含む。Release 反映前は「現行実装」と「修正する設計」を区別して読む。

## 表示内容

現行 Performance Detail は以下を表示する。

- Machine selector
- Machine parameter に関する feedback
- latest date
- Best Weight
- Estimated 1RM
- Total Sets
- recent 28-day average set weight
- Best Weight line chart
- body part
- session count
- Best Weight / Best Reps summary
- Date / Gym / Sets / Best Weight / Best Reps / Volume を持つ Workout history table
- Workout Domain への導線

`Best Weight`、`Best Reps`、`Estimated 1RM` は現行 UI 用語である。

## Core Use

Performance Detail は `workout-core` を以下に使用する。

- Machine options
- Machine history
- max weight
- max reps
- estimated 1RM
- recent sessions
- average set weight
- date / body part / weight formatting

Weight / Volume を Performance として比較する場合は、同一 Gym・同一 Machine の比較可能性を維持する共通原則に従う。

## Navigation

Performance Detail は current route ID `machines` で shared navigation を受け取る。
