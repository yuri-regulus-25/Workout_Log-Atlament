# Workout Domain 現行仕様

## Responsibility

Workout Domain は workout history と date-specific workout detail を表示する。Workout Log data は edit しない。

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

```text
/workouts/
/workouts/:date
```

Hosted MPA contract は `YYYY-MM-DD` format の `:date` を認識する。

## Data Access

Workout Domain は `@workout-lab/workout-data` の `loadRuntimeWorkoutSessions()` を call する。

Load issue は Data Load Warning として表示される。

## Workout List

現行 list view:

- すべての runtime session を load する
- loaded session 内の machine display name から machine option を build する
- `all` または 1 つの selected machine name filter を support する
- `WorkoutGrid` を render する
- selected session date の detail route を開く

現行 source は body part filter、gym filter、date range filter、full text search、URL query filter state、calendar view を実装していない。

## Workout Detail

現行 detail view:

- route date で session を filter する
- 同一日の multiple session を support する
- date と session count を表示する
- summary card として Machines、Sets、Volume、Sessions を表示する
- content を session と gym で group 化する
- 各 machine の name、body part、machine volume、sets を表示する
- RIR が存在する場合は表示する
- session notes が存在する場合は表示する
- 各 machine を Performance Detail へ link する
- date に session がない場合、simple back link を表示する

## Core Use

Workout Domain は `workout-core` を以下に使用する。

- display date formatting
- body part display formatting
- machine/session volume
- set count
- total weight label formatting

## Navigation

Workout Domain は current route ID `workouts` で shared navigation を受け取る。
