# v2.0.0 Phase 8-F — Lifecycle Integration Tests & Documentation

## 日本語

### 前提
Phase 8-A〜8-Eが正常に完了していることを前提とする。

### 目的
Setup / Readiness / Runtime Failure / Recovery / Platform Parityを横断試験し、Phase 8完了後のAs-Isを設計書へ反映する。

### 必須Test観点
- 完全未設定
- Repository設定不足
- Branch設定不足
- Credential未設定
- Credential expired
- Credential permission/capability不足
- GitHub unreachable
- Repository/Branch unavailable
- Master missing / invalid
- Workout Data missing / invalid
- Workout Data empty（invalidと混同しない）
- Main Gym未設定でも基本ApplicationがSetup完了/利用可能であること
- Main Gym依存Metricだけが未設定状態を適切に扱うこと
- READY正常系
- READY後のCredential expiry
- READY後のGitHub failure
- DEGRADED相当状態で影響外機能を不必要にBlockしないこと
- Failure後のRetry/Recovery
- Windows / Android / Development Runtime contract/semantics一致
- FrontendにPlatform固有Lifecycle分岐が不要であること

### Documentation
Phase 8完了時点のAs-Isとして `docs/design` を更新する。

最低限、以下を反映する。
- Runtime State / Readiness Model
- Setup completion criteria
- Main Gym optional decision
- Setup Assistant behavior
- Access Gate / Degradation / Recovery
- Unified Status / Credential Contract
- Platform parity / known supported-unavailable differences

UI文言・視覚仕様は実装後の人間レビュー結果をAs-Isとして反映する。

### 完了条件
主要Setup/Failure/Recovery Pathが試験され、Main Gym未設定が誤ってSetup Failureにならず、Windows/Android/Development Runtimeで共通Lifecycle semanticsが成立し、`docs/design`と実装が一致していること。

---

## English

### Prerequisite
Phase 8-A through 8-E must be completed.

### Objective
Test setup/readiness/runtime-failure/recovery/platform parity end-to-end and update design documentation to the final Phase 8 As-Is.

### Required Coverage
Fully unconfigured state; missing repository/branch/credential; expired or insufficient credential; GitHub/repository/branch failure; missing/invalid master or workout data; empty workout data distinguished from invalid; Main Gym absent while basic apps remain ready; only Main-Gym-dependent metrics unavailable; normal READY; failures after READY; degraded behavior; retry/recovery; and equivalent Windows/Android/Development Runtime contracts without frontend platform branching.

### Documentation
Update `docs/design` with runtime/readiness model, setup criteria, Main Gym optional decision, Setup Assistant, access/degradation/recovery, unified status/credential contract, and platform parity/known unsupported states. Final UI wording/visual behavior is documented from the human-reviewed implementation.

### Completion Criteria
Major lifecycle paths are tested, Main Gym absence is not misclassified as setup failure, platform semantics align, and design documentation matches implementation.