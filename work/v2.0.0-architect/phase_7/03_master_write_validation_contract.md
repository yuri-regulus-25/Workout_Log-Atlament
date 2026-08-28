# v2.0.0 Phase 7-C — Master Write Validation & Contract

## 日本語

### 前提
Phase 6 ValidationおよびPhase 7-A/Bが現在の作業Branchへ反映済みであることを前提とする。

### 目的
Phase 6で確立したMaster Domain ValidationをWrite Pipelineへ接続し、Maintenance向けRead/Write ContractとDomain Errorを確立する。

### Validation Pipeline
`Request -> Shape Validation -> Domain Validation -> Referential Validation -> Whole Master Validation -> GitHub Write`

- Frontend ValidationはUX目的として実施してよいが、AF側Validationを最終防衛線とする。
- `xxx_id`に相当する各Master IDはMaster全体でUniqueであることを必須とする。
- Logical Deleted RecordもID Unique判定対象に含める。Deleted IDの再利用は禁止する。
- Create / Update / Restore / Main Gym変更等、最終Master状態をWhole Master Validationする。
- Restore (`delete_flag: true -> false`相当) も現在のRelation/Domain状態に対して再Validationする。

### Maintenance Contract
Maintenanceが必要とするCurrent Master、Active/Deleted state、relation、Main Gym、revision/SHA、validation state等を安全なContractとして提供する。Raw GitHub file writerを提供しない。

### Error Contract
少なくともValidation Error、Conflict/Revision Mismatch、Authentication/Permission、Rate Limit、Master Not Found、Write Failure等をDomain ErrorとしてFrontendが判別可能にする。GitHub HTTP detailをそのままUI Contractにしない。

### 完了条件
すべてのMaster Writeが共通Domain Validationを通り、ID uniquenessを含む整合性がAF側で保証され、Frontendが安全なMaintenance Contract/Errorを利用できること。

---

## English

### Prerequisite
Phase 6 validation and Phase 7-A/B must be present on the current working branch.

### Objective
Connect Phase 6 domain validation to the write pipeline and establish safe Maintenance read/write and error contracts.

### Validation
Use shape, domain, referential, whole-master validation before GitHub writes. Frontend validation is UX only; AF validation is authoritative. Every `xxx_id`-style master identifier must be unique across the entire master including logically deleted records; deleted IDs cannot be reused. Revalidate create/update/restore/Main-Gym changes against the complete resulting master.

### Maintenance Contract
Expose only the safe master/read metadata needed by Maintenance, including lifecycle state, relations, Main Gym, revision/SHA, and validation state. Do not expose a raw arbitrary GitHub writer.

### Errors
Provide domain-level validation, conflict/revision mismatch, auth/permission, rate-limit, not-found, and write-failure errors rather than leaking GitHub HTTP details as the UI contract.

### Completion Criteria
All writes use shared authoritative validation, including identifier uniqueness, and Maintenance has stable safe contracts.