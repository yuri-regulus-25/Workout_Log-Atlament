# v3.1.0 — Workout CRUD

Planning branch: `release-3.1.0-plan`

## Purpose
Workout LogをRaw JSONではなくDomain Modelとして安全にCreate/Edit/Physical DeleteするVue + Vuetify Applicationを追加する。

## Core Contract
- Workout Domain Identity は `session_id` とする。
- Date は grouping / search / navigation のための属性であり、Session Identity としない。
- Resource は persistence / validation / Git / Recovery の単位であり、Session と同一視しない。
- 同一日に複数 Session が存在できる。
- 日付選択時、Session 0件なら新規Session作成へ進める。既存Sessionがある場合は対象Sessionを明示的に選択し、同日に新規Sessionを追加することも可能とする。
- Session/Machine/Record CRUD。Gym/MachineはSelectでvalid IDを選択し内部IDを直接編集しない。
- Raw JSON直接編集禁止。
- Session の date 変更によって path / Resource 変更が必要な場合、必要な old delete + new create 等を1回の atomic Git commitで行う。
- 保存単位は「1 Day」ではなく「1回のユーザー保存操作」。1保存操作 = 1 atomic Git commit とする。
- Session と Resource の対応を1:1と仮定しない。JSONL等の複数Session Resourceを persistence 層で処理する。
- Client validation + server final validation。
- expected revisionによる楽観的同時実行制御。auto merge/overwrite/mode transitionなし。
- writeはhealthy remote SoT接続必須。fallback/LKGに対してwriteしない。
- Workout Write APIは本Application専用Domain境界。固定repo/branch/path。

## Out of Scope
Raw editor、Master同時追加、汎用Git write、Workout Recovery。

## Implementation Rule
Implementation前に関連既存実装を横断調査する。`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`

## Work Units / Issues
1. `01_interaction_model.md` — Issue #138
2. `02_write_contract.md` — Issue #139
3. `03_validation_conflict_verification.md` — Issue #140
