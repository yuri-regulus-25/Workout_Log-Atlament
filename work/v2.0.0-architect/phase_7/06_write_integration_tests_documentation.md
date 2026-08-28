# v2.0.0 Phase 7-F — Write Integration Tests & Documentation

## 日本語

### 前提
Phase 7-A〜7-Eが正常に完了していることを前提とする。

### 目的
Master Write機能の成功・失敗・競合・Domain Constraintを網羅的に試験し、実装後のAs-Isを設計書へ反映する。

### 必須Test観点
- Gym / Machine Create
- 1Record Update
- Copy -> Create
- Unique `xxx_id` validation（Active/Deleted双方を含む）
- Logical Delete
- Restore
- Main Gym切替
- Main Gym Delete拒否
- Main Gym 0件化拒否（設定済み状態）
- Inactive Relation拒否
- Historical Reference維持
- Referential Validation failure
- Whole Master Validation failure
- stale SHA / revision conflict
- authentication failure
- permission failure
- rate limit
- network/timeout
- GitHub 5xx/write failure
- Write成功後の再取得/表示反映
- Write失敗時に編集内容を失わないこと
- Raw JSON / arbitrary path writeが公開されていないこと
- Bulk Edit/Delete/Restoreが提供されていないこと

### Test Safety
- TestでProduction Master/Repositoryを破壊しない境界を設ける。
- GitHub Client境界をMock/Fake可能にする等、Failure Pathを安全に再現できる構成とする。
- 実GitHub疎通試験が必要な場合も、対象Repository/Branch/Pathを明示的に安全なものへ限定する。

### Documentation
Phase 7完了時点のAs-Isとして `docs/design` を更新する。

最低限、以下を反映する。
- Write Architecture / Security Boundary
- Master Read/Write API Contract
- GitHub Persistence / Revision Control
- Master Schema / Lifecycle / Main Gym
- Validation Rules
- Maintenance Application behavior
- Error / Failure behavior
- Windows / Android / Development Runtimeで差異がある場合の明示

UIの最終文言・細かな視覚仕様は実画面レビュー後の実装をAs-Isとして記録する。

### 完了条件
Master Writeの主要Success/Failure/Conflict/Constraint Pathが試験され、Phase 7完了後の実装と`docs/design`が一致していること。

---

## English

### Prerequisite
Phase 7-A through 7-E must be completed.

### Objective
Comprehensively test Master Write success/failure/conflict/domain constraints and update design documentation to the resulting As-Is implementation.

### Required Coverage
Gym/Machine create and single-record update; copy-to-create; unique IDs including deleted records; delete/restore; Main Gym replacement and prohibited deletion/zero state; inactive relations; historical references; referential/whole-master validation; stale revision conflicts; auth/permission/rate-limit/network/5xx failures; successful refresh; edit preservation on failure; absence of raw/arbitrary writes and bulk operations.

### Safety
Tests must not damage production masters/repositories. Provide mock/fake boundaries for GitHub failure paths and strictly isolate any real GitHub integration tests.

### Documentation
Update `docs/design` with the final write architecture, security boundary, API contracts, persistence/revision behavior, schemas/lifecycle/Main Gym, validation, Maintenance behavior, failure contracts, and platform differences. Record final UI wording/visual behavior from the human-reviewed implementation as As-Is.

### Completion Criteria
Major write paths are tested and `docs/design` accurately reflects the Phase 7 implementation.