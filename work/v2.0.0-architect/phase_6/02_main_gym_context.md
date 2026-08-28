# v2.0.0 Phase 6-B — Main Gym Context

## 日本語

### 前提
Phase 0〜Phase 5およびPhase 6-Aが現在の作業Branchへ反映済みであることを前提とする。

### 目的
Main GymをDevice/AF固有設定ではなくGym Master自身の属性として管理し、全Platform/Core/Frontendから共通利用可能なDomain Contextとする。

### Data Decision
- Main Gym専用Masterは新設しない。
- Gym RecordへMain Gymを表すboolean属性を追加する。概念上は `main: true/false` とするが、最終的なfield namingは既存Schemaとの整合を確認して決定する。
- Main Gym変更によってWorkout Logを書き換えない。

### Constraint
- Main Gymは全Gym中最大1件。
- 初期状態のみ0件を許容する。
- 一度Main Gymが設定された後、0件への解除は禁止する。
- Main Gym AからBへの変更は許可する。
- Inactive GymをMain Gymへ設定できない。
- Main Gym設定中のGymはLogical Deleteできない。
- Main Gym変更はDomain上、一貫した切替としてValidation可能にする。

### Migration
既存Gym Masterへ属性を導入する。既存利用環境でMain Gymを決定できる場合はMigration時に設定する。決定根拠が存在しない場合、初期状態0件を許容するRuleに従い推測で設定しない。

### 制約
- 本PhaseではMain Gymを変更するWrite UI/APIを実装しない。
- DeviceごとのMain Gym設定を作らない。
- 新しいSettings Masterを作らない。

### 完了条件
Main GymがGym MasterをSoTとする共通Domain Contextとして読み取り・Validation可能であり、Platformごとに異なるMain Gym状態を持たないこと。

---

## English

### Prerequisite
Phase 0 through Phase 5 and Phase 6-A must be present on the current working branch.

### Objective
Represent Main Gym as an attribute of the Gym master rather than device/AF-local configuration, making it a shared domain context across platforms, core, and frontends.

### Data Decision
Do not create a separate Main Gym master. Add a boolean attribute to Gym records (conceptually `main`). Do not rewrite workout logs when Main Gym changes.

### Constraints
At most one Gym may be Main. Zero is allowed only in the initial unconfigured state. Once configured, clearing Main Gym to zero is forbidden, while A-to-B replacement is allowed. Inactive gyms cannot be Main and the current Main Gym cannot be logically deleted.

### Migration
Add the attribute to existing Gym masters. Set a Main Gym during migration only when an existing authoritative basis exists; otherwise retain the permitted initial zero state rather than guessing.

### Out of Scope
No write UI/API, device-specific Main Gym setting, or new Settings master.

### Completion Criteria
Main Gym is a shared, validated Gym-master domain context with no platform-specific divergence.