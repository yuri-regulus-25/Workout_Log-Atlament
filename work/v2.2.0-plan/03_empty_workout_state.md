# Empty Workout State

Related Issue: #93

## Scope

- Workout Log 0 entries
- Workout JSON / JSONL Resource 0件
- valid-schema Empty Workout Resource

## Contract

- Workoutが0件であることは正常状態であり、Validation Error / Recovery対象ではない。
- Workout Resourceが0件である状態を正常なInitial Stateとして扱う。
- Resourceが存在しschema-validだがWorkout entryが0件の場合も正常とする。
- 0件の一覧・集計・期間・履歴・Analyticsは正常なempty resultを返す。0件を例外や疑似データで埋めない。
- UIはRecovery/ErrorではなくEmpty Stateを表示する。
- valid Empty Resourceとmalformed/invalid Resourceを区別する。後者はv2.1.0 Recovery責務。
- Empty Workoutだけを理由にfallback / degraded / unavailableを発生させない。

## Implementation Rule

Implementation前にWorkout discovery/load、normalization、aggregation、Runtime builder、各Applicationの0件処理を横断調査する。

## Tests

- Workout Log 0 entries。
- Workout Resource 0件。
- valid Empty Workout Resource。
- Empty aggregation/history/analytics。
- Windows / Android parity。
