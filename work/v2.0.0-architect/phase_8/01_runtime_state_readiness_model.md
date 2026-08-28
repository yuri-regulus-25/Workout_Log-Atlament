# v2.0.0 Phase 8-A — Runtime State & Readiness Model

## 日本語

### 前提
Phase 0〜Phase 7が正常に完了し、現在の作業Branchへ反映済みであることを前提とする。

### 目的
Applicationの初期設定状態・利用可能状態・障害状態を各Frontendが個別判断せず、共通Domainとして判定可能にする。

### State Model
実装前に既存Status/Settings/AF実装を再確認し、必要最小限のRuntime Stateを定義する。概念候補は以下とする。
- UNCONFIGURED: 必須初期設定が不足している。
- READY: 通常利用に必要な条件を満たす。
- DEGRADED: 一部機能/情報が利用不能だが利用可能領域が残る。
- UNAVAILABLE: 通常Applicationを安全に利用できない。

名称・細分化は既存Contractとの整合を踏まえて決定し、不要に複雑なState Machineを作らない。

### Setup Readiness候補
- Repository設定
- Branch設定
- Credential設定
- Credential有効性
- 必要なGitHub Read capability / connectivity
- 必須Master取得・Validation
- Workout Data取得・Validation

実装前に現行仕様を確認し、本当に通常利用に必須な条件だけをReadinessへ含める。

### Main Gym Decision
**Main Gym未設定はSetup未完了/NGとして扱わない。**

Phase 6でMain Gym 0件の初期状態を許容しているため、Main Gymが未設定でも基本Applicationは利用可能とする。Main Gymを必要とするWeight/Volume等の機能だけをUnavailable / Not Configuredとして扱う。

### 原則
- Frontendごとに独自のReadiness判定を実装しない。
- 初期設定不足と、設定済み環境のRuntime Failureを区別する。
- Main Gym等のOptional Domain Context不足をApplication全体の利用不能へ昇格させない。
- 状態からユーザー向け文言を直接Domainに埋め込まない。UI文言は製造時と人間レビューで調整する。

### 完了条件
Application Readinessが共通Domainとして一意に判定可能であり、Main Gym未設定を含むOptional Context不足が誤ってSetup Failureとして扱われないこと。

---

## English

### Prerequisite
Phase 0 through Phase 7 must be completed and present on the current working branch.

### Objective
Define shared domain-level application setup/readiness/runtime states instead of allowing each frontend to make independent decisions.

### State Model
Re-check current Status/Settings/AF implementation and define only the minimum required states. Conceptual candidates are UNCONFIGURED, READY, DEGRADED, and UNAVAILABLE; final naming/granularity must fit the actual contract without overbuilding a state machine.

### Setup Readiness Candidates
Repository/branch configuration, credential presence/validity, required GitHub read capability/connectivity, required master retrieval/validation, and workout-data retrieval/validation. Include only conditions actually required for normal application use.

### Main Gym Decision
**An unconfigured Main Gym is not a setup failure.** Basic applications remain usable without Main Gym. Only features that specifically require Main Gym context, such as applicable Weight/Volume metrics, become unavailable/not-configured.

### Principles
Do not duplicate readiness logic across frontends. Distinguish missing initial configuration from runtime failure after setup. Do not elevate optional domain-context absence to total application unavailability. User-facing wording remains a frontend/implementation review concern.

### Completion Criteria
Readiness is consistently derivable from shared domain logic and optional contexts such as Main Gym are not incorrectly treated as setup failures.