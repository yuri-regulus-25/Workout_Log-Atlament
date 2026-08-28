# v2.0.0 Phase 7-A — Master Write Architecture & Security

## 日本語

### 前提
Phase 0〜Phase 6が正常に完了し、現在の作業Branchへ反映済みであることを前提とする。

### 目的
Master Dataに限定したWrite capabilityをApplication Framework(AF)へ導入し、安全なWrite境界を確立する。

### Architecture
`Maintenance Frontend -> localhost AF -> Domain Validation -> GitHub Write -> data/master/*.json`

- FrontendからGitHubへ直接Writeしない。
- Workout LogはRead Only SoTを維持し、Write対象にしない。
- 任意Repository / 任意Branch / 任意Pathへ書けるGeneric GitHub APIをFrontendへ公開しない。
- Write対象は許可されたMaster Dataに限定する。
- Repository / BranchはApp Settingsで管理されている設定を利用し、Maintenance画面から自由選択させない。
- Master PathはApplication側で許可対象を固定する。

### Security
- CredentialのWrite capability / expiry / authenticationを確認する。
- Repository / Branch permissionを確認し、不足時はWriteしない。
- Target Repository / Branch / PathのallowlistをAF側で保証する。
- Frontend入力だけをSecurity Boundaryとして信用しない。

### 制約
- Workout Log Writeは禁止。
- Raw JSON自由編集は禁止。
- Generic Git Client / arbitrary file writeは禁止。
- 新Master種類を本Phase都合で追加しない。

### 完了条件
Master Dataだけを対象とする明確なWrite BoundaryがAFに存在し、FrontendからGitHubや任意Fileへ直接Writeできないこと。

---

## English

### Prerequisite
Phase 0 through Phase 6 must be completed and present on the current working branch.

### Objective
Introduce AF-owned write capability limited to Master Data and establish a secure write boundary.

### Architecture
`Maintenance Frontend -> localhost AF -> Domain Validation -> GitHub Write -> data/master/*.json`.
Frontend never writes directly to GitHub. Workout Log remains read-only. Do not expose a generic arbitrary repository/branch/path GitHub writer. Repository and branch come from App Settings; allowed master paths are application-controlled.

### Security
Validate write capability, credential expiry/authentication, repository/branch permissions, and enforce repository/branch/path allowlists in AF.

### Constraints
No Workout Log writes, raw JSON editing, generic Git client/arbitrary file writes, or new master types introduced merely for this phase.

### Completion Criteria
AF provides a secure write boundary limited to approved Master Data.