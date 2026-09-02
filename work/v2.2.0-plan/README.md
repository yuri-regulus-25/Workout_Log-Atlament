# v2.2.0 — Empty / Initial State Support

Planning branch: `release-2.2.0-plan`

## Purpose

Empty / initial data statesを異常・破損・Recovery対象として扱わず、正常な製品状態として一貫して表現する。

## Scope

- Workout Log 0 entries
- Gym Master 0 records
- Machine Master 0 records
- Workout Resource 0件を正常な初期状態として扱う

## Out of Scope

- 空の Workout file を正常な空状態の表現として導入すること
- 0 byte / 0 line JSONL、`{}`、`[]` 等を Empty Workout Resource として新たに有効化すること
- Gym Master file missing
- Machine Master file missing
- Invalid / malformed Resource recovery (v2.1.0)
- Master record-level partial acceptance (v2.3.0)

## Common Contract

- EmptyはValidation Errorではない。
- Workout の canonical な空状態は Workout Resource 0件で表現する。
- 存在する Workout Resource は少なくとも1 Sessionを含む。JSONは1 Session、JSONLは1行1 Sessionという既存形式を維持する。
- Emptyだけを理由にfallback / degraded / unavailableへ遷移しない。
- Emptyだけを理由にBroken / Recovery対象へ遷移しない。
- UIはError/Recoveryではなく正常な初期状態として表現する。
- 集計・一覧・期間表示等は0件を正常入力として処理する。
- Windows / Androidで同一Contractとする。
- missing Resource、Workout Resource 0件、invalid / malformed Resourceを混同しない。
- Resource の存在要件や空状態の扱いは Domain Contract とし、利用者設定の `required` / `emptyAllowed` では変更しない。

## Work Units / Issues

1. `01_empty_runtime_contract.md` — Empty Runtime Contract — Issue #91
2. `02_empty_master_state.md` — Empty Master State — Issue #92
3. `03_empty_workout_state.md` — Empty Workout State — Issue #93
