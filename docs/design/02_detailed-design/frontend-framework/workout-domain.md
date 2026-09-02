# Workout Domain 現行仕様とIdentity方針

## 責務

Workout Domain は Workout history と日付別 Workout detail を表示する。現行 v2.x は Workout Log Data を編集しない。

## Source and Framework

Source:

```text
src/frontend/workouts-vue/
```

Framework:

- Vue 3
- TypeScript
- Vite
- Vue Router

## Routes

現行 route:

```text
/workouts/
/workouts/:date
```

Hosted MPA contract は `YYYY-MM-DD` format の `:date` を認識する。

この `:date` route は **日付による grouping / navigation policy** であり、Workout Domain Identity を Date とする契約ではない。

Workout Domain Identity は `session_id`。同一日に複数 Session が存在できる。

将来 Session を直接表示・編集する route は Session を明示的に識別できる形へ拡張する。例:

```text
/workouts/session/:sessionId
/workouts/:date/:sessionId
```

具体 route syntax は実装時に決定するが、存在しない/曖昧な Session を別 Session へ silent redirect しない。

## Data Access

Workout Domain は `@workout-lab/workout-data` の `loadRuntimeWorkoutSessions()` を使用する。

Load issue は Data Load Warning として表示する。

## Workout List

現行 list view:

- すべての Runtime Session を load
- loaded Session 内の Machine display name から Machine option を構築
- `all` または selected Machine name filter
- `WorkoutGrid`
- latest data month の calendar view
- selected Session Date の detail route
- body part filter
- Gym filter
- date range filter
- full text search

URL query filter state は現行未実装。

Calendar の Date click から日付詳細を開くことは Navigation policy であり、Date を Session Identity とみなさない。

## Workout Detail

現行 detail view:

- route Date で Session を filter
- 同一日の multiple Session を表示可能
- Date と Session count
- Machines / Sets / Volume / Sessions summary
- Session / Gym grouping
- Machine name / body part / volume / sets
- RIR
- Session notes
- Performance Detail link
- Date が単一 Session に解決できる場合のみ previous / next navigation
- previous Workout が一意に解決できる場合のみ Session compare
- Date に Session がない場合 simple back link

「Dateに既存Sessionがある = そのSessionを編集」という規則は採用しない。同日複数Sessionで曖昧になるためである。

## Core Use

Workout Domain は `workout-core` の決定論的処理を使用する。

- display date formatting
- body part display formatting
- Machine / Session volume
- set count
- total weight label formatting
- calendar month aggregation
- previous / next Workout resolution
- Session compare
- inclusive period filtering
- Session / daily aggregation
- calendar month range / daily marker

Previous / next resolution の Domain Identity は `session_id`。Date-based resolution は Date がちょうど1 Sessionへ解決できる場合の convenience navigation に限定する。

## v3.1.0 Workout CRUDとの接続

将来の Workout CRUD では:

- Session 0件の日付: 新規 Session を作成可能。
- Session 1件の日付: その Session を選択可能。別 Session の追加も可能。
- Session 2件以上の日付: 対象 Session を明示選択、または追加。
- Session の日付変更: Domain 上は `date` 属性変更。
- Resource relocation が必要なら Persistence 層が atomic Git mutation を構築。
- 1回の利用者保存操作 = 1 atomic Git commit。

Session と Resource を1:1と仮定しない。

## Navigation

Workout Domain は current route ID `workouts` で shared navigation を受け取る。Application metadata は Application Registry を正とする。
