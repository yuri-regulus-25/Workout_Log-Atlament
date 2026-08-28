# v2.0.0 Phase 8-E — Windows / Android Runtime Parity

## 日本語

### 前提
Phase 8-A〜8-Dが現在の作業Branchへ反映済みであることを前提とする。

### 目的
Windows AF / Android AF / Development Runtimeで、Readiness・Status・Credential・Access判断に同じ意味とContractを提供する。

### 対象
- Runtime State / Readiness判定
- Unified Status Contract
- Credential State
- GitHub connectivity/capability state
- Master/Workout availability state
- Access/Recoveryに必要なDomain State

### 原則
- Frontendに `if Windows` / `if Android` のLifecycle分岐を要求しない。
- Platform固有実装差はAF内部へ閉じ込める。
- Platformで取得不能な情報がある場合、意味を捏造せず明示的なUnavailable/Unsupported表現をContractとして設計する。
- Development Runtimeも可能な限り同じContract/semanticsへ合わせる。

### 完了条件
同一のFrontend Domain LogicがWindows/Android/Development Runtimeで利用でき、Platform固有差分がLifecycle/Readinessの意味を変えないこと。

---

## English

### Prerequisite
Phase 8-A through 8-D must be present on the current working branch.

### Objective
Provide equivalent readiness/status/credential/access semantics and contracts across Windows AF, Android AF, and Development Runtime.

### Principles
Frontend must not require lifecycle branches for Windows vs Android. Keep platform-specific implementation inside AF. If a platform cannot provide a value, represent it explicitly as unavailable/unsupported rather than fabricating semantics. Align Development Runtime as far as practical.

### Completion Criteria
The same frontend domain logic works across platforms without platform-specific lifecycle semantics.