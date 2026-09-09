# Architecture

Atlament は source data、runtime synchronization、shared domain logic、frontend rendering を分離する。

```text
GitHub repository
  ├─ data/master/*.json
  └─ data/workouts/**/*.json | *.jsonl
        ↓
Application Framework
  ├─ GitHub sync
  ├─ validation and Master Resolve
  ├─ local Runtime Data
  ├─ configuration and credential storage
  ├─ localhost HTTP API
  └─ frontend artifact hosting
        ↓
Frontend shared packages
        ↓
Frontend MPA applications
```

## Responsibility Boundaries

GitHub は external data source of truth である。

Application Framework の責務:

- GitHub access
- configuration
- credential storage
- runtime data build and storage
- Local Master snapshot storage as part of Runtime Data
- localhost API
- static frontend hosting
- native shell lifecycle

Shared package の責務:

- common TypeScript type
- pure workout calculation
- runtime data loading client
- frontend navigation metadata と UI injection
- theme、branding、page transition、easter egg behavior
- design token と shared CSS

Frontend application の責務:

- screen-specific rendering
- UI state
- 各 application 内の route handling
- visual composition と chart configuration

## Explicit Non-Goals In Current Source

現行 source は以下を実装していない。

- Workout Log registration or editing
- arbitrary Master Data editing outside Resource Management fixed allowlist
- GitHub write APIs outside Machine/Gym Master write
- multi-user server APIs
- public web hosting
- installer generation
- Android AAB / Google Play packaging
- Planning段階にのみ存在する未実装Application

## Data Correctness Boundary

Raw JSON / JSONL parsing と technical validation は Runtime Data を accept する前に実行される。Master reference resolution は Runtime Data build 中に `resolved` / `missing` / `deleted` として記録される。`missing` / `deleted` Master reference は Runtime warning として報告し、Workout session 自体は正常な Runtime Data として accept する。Technical validation failure は引き続き current runtime data へ accept されない。

Remote GitHub から Local Runtime / Local Master snapshot への同期は Wake Up / Settings Sync の責務である。Resource Management の Master read は Local Master snapshot を使用し、表示用 data source として Remote Master body を独自に読み込まない。Resource Management write は Local revision/candidate validation 後に remote revision metadata を確認し、GitHub PUT 成功後に Local Runtime と Local Master snapshot を rebuild する。

Workout 由来の aggregate value は AF 外、主に `workout-core` で計算される。
