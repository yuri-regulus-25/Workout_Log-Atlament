# Empty Master State

Related Issue: #92

## Scope

- Gym Master 0 records
- Machine Master 0 records

## Contract

- Master Resourceが存在し、schema-validかつrecordsが0件なら正常なEmpty Master State。
- Master file missingとは区別する。missing Master fileを正常Emptyとして扱う機能は実装しない。
- Empty Master自体はValidation Error / Recovery対象ではない。
- Main Gymは当然未設定となるが、初期未設定は正常状態とする。
- Master由来情報が存在しないことをUIでError扱いせず、初期/空状態として表現する。
- Workoutが存在しMaster参照を解決できない場合はv2.0.0で定義したunresolved Master semanticsに従い、Workout自体を失わない。
- Gym / Machineの共通挙動は共通実装・共通Contractを優先する。

## Implementation Rule

Implementation前に既存Master validation、Runtime builder、Main Gym、Maintenance、Frontend Empty Stateを横断調査する。

## Tests

- Gym 0 records。
- Machine 0 records。
- 両Master 0 records。
- Empty Master + Workout references。
- Main Gym initial-unconfigured。
- Windows / Android parity。
