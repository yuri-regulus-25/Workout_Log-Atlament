# v2.0.0 Phase 8-D — Unified Status & Credential Lifecycle

## 日本語

### 前提
Phase 8-A〜8-Cが現在の作業Branchへ反映済みであることを前提とする。

### 目的
既存Status情報とCredential LifecycleをReadiness/Recoveryで再利用可能な共通Contractへ統合する。

### Status候補
Phase 3/4完了後の実Contractを再確認し、既存情報を重複追加せず必要な状態を統合する。
- AF reachability / runtime state
- Platform
- Version / Package Version
- Credential presence / expiry / validity
- GitHub connectivity / required capability
- Master availability / validation
- Workout Data availability / validation
- Application readiness
- Latest remote retrieval result / fallback active state / fallback source freshness等、Fallback利用中であることを判別するために必要な最小Fact

Fallback中は「最新Remote取得は失敗したが、以前の正常Runtime DataでApplicationを継続提供している」ことをStatus Contractから判別可能にする。Fallbackを単なるREADYとして隠蔽せず、同時にFallback中であることだけを理由に利用可能機能をUNAVAILABLEへ昇格させない。

### Credential Lifecycle
- Credential未設定、設定済み、有効期限切れ等を区別可能にする。
- Expired CredentialをREADY判定しない。
- Connection Test / capability確認とReadinessを整合させる。
- 「期限間近」等のUX閾値や具体文言は製造時に調整してよい。

### Responsibility
AF/DomainはState/Factを返し、Frontendは表示・案内を担当する。Frontendで安全に導出可能なユーザー向けRequired ActionsをAPIへ重複追加しない。

### 制約
- Portal Status Drawer/Portal表示は対象外。
- Phase 3/4で整理済みのContractを理由なく再拡張しない。

### 完了条件
Readiness/Recoveryに必要なStatus、Credential State、Fallback利用状態が共通Contractから取得でき、既存情報の重複やPlatform固有分岐をFrontendへ要求しないこと。

---

## English

### Prerequisite
Phase 8-A through 8-C must be present on the current working branch.

### Objective
Unify existing status information and credential lifecycle into a shared contract reusable by readiness and recovery.

### Status Candidates
Re-check the post-Phase-3/4 contract and integrate only required states: AF/runtime reachability, platform, versions/package versions, credential presence/expiry/validity, GitHub connectivity/capability, master/workout availability/validation, application readiness, and the minimum facts needed to identify that the latest remote retrieval failed while previously successful runtime data is being served as fallback. Fallback must not be hidden as ordinary READY, nor should fallback alone make otherwise usable functionality UNAVAILABLE.

### Credential Lifecycle
Distinguish missing/configured/expired credentials; expired credentials cannot produce READY. Align connection/capability tests with readiness. Fine UX thresholds such as 'expires soon' remain implementation-review details.

### Responsibility
AF/domain returns facts/state; frontend owns presentation/guidance. Do not duplicate frontend-derivable required actions in the API.

### Constraints
No Portal status UI and no unjustified re-expansion of Phase 3/4 contracts.

### Completion Criteria
Readiness/recovery status, credential state, and fallback usage are available through a shared contract without duplicate information or frontend platform branching.