# Workout Write Contract & Persistence

Related Issue: #139

- Workout CRUD専用Domain Write API。
- 1 Day Save = 1 Commit。
- Whole-day server validationを通過したtransactionのみwrite。
- Create: target date absent。Update/Delete: expected revision一致。Date move: old revision一致 + new target absent。
- fixed repository/branch/path/write boundary。commit messageはApplication生成。
- arbitrary JSON/path/branch/commit manipulation禁止。
- healthy remote SoTへ到達できる場合のみwrite開始/Save可能。
- Raw Workoutの通常read-only原則に対する、このApplication専用のcontrolled mutation pathとする。
