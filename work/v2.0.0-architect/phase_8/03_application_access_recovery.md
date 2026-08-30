# v2.0.0 Phase 8-C — Application Access & Recovery

## 日本語

### 前提
Phase 8-A/Bが現在の作業Branchへ反映済みであることを前提とする。

### 目的
初期設定不足とRuntime Failureを区別し、ApplicationへのAccess GateとRecovery導線を共通化する。

### Access Policy
- UNCONFIGURED: Setup/Settings等、設定復旧に必要な領域のみ利用可能とする。
- READY: 通常Applicationを利用可能とする。
- DEGRADED: 利用可能なApplication/機能は継続利用可能とし、影響範囲だけを制限する。
- UNAVAILABLE: 安全に利用できない通常機能を制限し、Recovery可能な導線を提供する。

最終State名称・MappingはPhase 8-Aで確定したDomain Modelに従う。

### Runtime Failure / Fallback
設定済み環境でCredential expiry、GitHub unavailable、Repository/Branch unavailable、Master invalid/unavailable、Workout Data invalid/unavailable等が発生した場合、単純に「Setup未完了」へ戻さずRuntime Failureとして扱う。

Remote取得失敗時に既存の正常Runtime DataへFallback可能な場合は、そのFallbackを維持する。Fallback中であること自体を通常Application全体の利用不能へ昇格させず、利用可能な機能は継続利用可能とする。Fallback機構をDeveloper ModeやRecovery都合で無効化するProduction分岐は追加しない。

### Recovery
- 原因に応じてSettings / Setup / Retry / Reload等の適切なRecovery actionへ接続可能にする。
- 一部機能だけ利用不能な場合、Application全体を不必要にBlockしない。
- Main Gym未設定はAccess Gate条件にしない。Main Gym依存機能だけをUnavailableとして扱う。
- Fallback中は、最新Remote取得に失敗している事実と既存正常Dataで継続利用中である事実を後続Status統合で識別可能にする。

### 制約
- Portal最終統合は対象外。
- Frontendごとに独自のGate判定を複製しない。
- UI文言・Error visualは製造時/人間レビューで調整する。

### 完了条件
Setup不足とRuntime Failureが明確に区別され、Fallbackを含む状態に応じて安全かつ過剰でないApplication Access制御とRecoveryが可能であること。

---

## English

### Prerequisite
Phase 8-A/B must be present on the current working branch.

### Objective
Unify application access gating and recovery while distinguishing missing initial setup from runtime failures.

### Policy
UNCONFIGURED allows only configuration/recovery areas; READY allows normal apps; DEGRADED keeps unaffected functionality available; UNAVAILABLE restricts unsafe functionality and exposes recovery. Final names/mapping follow Phase 8-A.

After setup, credential expiry, GitHub/repository/branch failures, invalid/unavailable masters, or workout-data failures are runtime failures rather than simply reverting to 'setup incomplete'. When a remote retrieval failure can fall back to previously successful runtime data, preserve that production fallback and keep unaffected functionality usable. Do not add a Developer-Mode or recovery-only branch that disables production fallback. Recovery may route to Settings/Setup/Retry/Reload as appropriate. Main Gym absence never gates the whole application; only Main-Gym-dependent features are unavailable. Downstream status integration must be able to distinguish a failed latest remote retrieval from continued service using fallback data.

### Constraints
No final Portal integration. Do not duplicate gate logic per frontend. UI wording/error visuals are refined during implementation/human review.

### Completion Criteria
Setup absence and runtime failure are distinct and application access/recovery, including fallback operation, is safe without unnecessarily blocking unaffected functionality.