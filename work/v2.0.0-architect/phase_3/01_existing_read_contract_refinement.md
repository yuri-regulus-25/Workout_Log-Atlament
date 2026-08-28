# v2.0.0 Phase 3 — Existing Read Contract Refinement

## 日本語

### 前提
本Phaseは Phase 0、Phase 1、Phase 2 が正常に完了し、その変更が現在の作業Branchへ反映済みであることを前提とする。先行Phase未完了状態へのBackward Compatibilityは要求しない。

### 目的
Phase 0-Bで不要Contractおよび意図しないPlatform Driftを整理した後の localhost Read API を基準として、v2.0.0 の既存機能改善に必要な範囲で、既にAFが保持・返却している情報のResponse Contractを整理・変更する。

本Phaseは「新しい情報を供給するPhase」ではない。現在存在する情報の名称、構造、意味、表現をv2.0.0仕様へ整合させることを目的とする。

### 主対象
Settings の Status / Version 周辺を主対象とし、Phase 0-B後の実装を再調査した上で対象を確定する。

候補:
- 既存Status Responseの名称・構造・意味の正規化
- 既存Version Responseの名称・構造・意味の正規化
- 既存Hosting Status Contractの整理
- 既存Error Contractの整理
- Settings等の既存Consumerの新Contractへの追従
- Windows / Android / Development Runtime間のContract整合

### Phase 0-Bとの責務境界
Phase 0-BはAs-Is Cleanupとして、未使用Response fieldの削除、不要EndpointのClose、意図しないPlatform Driftの解消を行う。

Phase 3では、そのCleanup後に残った既存情報を対象として、v2.0.0 Requirementに基づくContract Refinementを行う。同じCleanupを再実施することを目的としない。

### Phase 4への送付条件
以下が必要になった項目は本Phaseで実装せずPhase 4以降へ送る。

- 現在AFが保持・返却していない新しい情報
- 新規Response fieldとして新しい意味情報を供給する必要があるもの
- 新しい情報源へのアクセスが必要なもの
- 新規Endpoint
- Write API
- Master / Workout Data Schema変更

既存fieldの単純なrename/restructureと、新しい情報の追加を混同しないこと。

### 制約
- 新規Application、Portal、Drawerは対象外。
- Setup Assistantは対象外。
- GitHub Write / Master Data Maintenanceは対象外。
- Main Gym等の新しいDomain Contextを導入しない。
- Phase 0-B後の最小Contractを不必要に再拡張しない。

### Validation
- Windows / Android / Development Runtimeで対象Contractが一致することを確認する。
- 全Consumerが変更後Contractへ追従していることを確認する。
- 旧Contract参照が残存していないことを確認する。
- Frontend build/test、Native側の実行可能なtest/buildを実施する。
- `docs/design`へ最終As-Is Contractを反映する。

### 完了条件
Phase 0-B後の既存Read API Contractがv2.0.0の既存機能要件に合わせて整理され、ConsumerとPlatform間で整合していること。新しい情報の供給を必要とする項目が混入せず、必要なものはPhase 4以降へ明確に送付されていること。

---

## English

### Prerequisite
Phase 0, Phase 1, and Phase 2 must be completed and present on the current working branch. Backward compatibility with states before preceding phases is not required.

### Objective
Using the localhost Read API remaining after Phase 0-B cleanup as the baseline, refine existing response contracts where required by v2.0.0 improvements, limited to information already held or returned by AF.

This phase does not introduce new information. It aligns the naming, structure, semantics, and representation of existing information with the v2.0.0 specification.

### Primary Scope
Re-investigate the post-Phase-0-B implementation and primarily evaluate Settings Status / Version related contracts.

Candidates include normalization of existing Status, Version, Hosting Status, and Error contracts; consumer migration; and alignment across Windows, Android, and Development Runtime.

### Boundary with Phase 0-B
Phase 0-B performs As-Is cleanup: removing unused response fields, closing unused endpoints, and resolving unintended platform drift.

Phase 3 refines the existing information that remains after that cleanup according to v2.0.0 requirements. It must not repeat Phase 0-B cleanup work.

### Send to Phase 4 or Later When
Defer an item when it requires information not currently held/returned by AF, a response field carrying new semantic information, access to a new information source, a new endpoint, a write API, or Master/Workout schema changes.

Do not confuse a rename/restructure of an existing field with addition of new information.

### Constraints
New applications, Portal, Drawer, Setup Assistant, GitHub Write, Master Data Maintenance, and new domain contexts such as Main Gym are out of scope. Do not unnecessarily re-expand the minimal contract produced by Phase 0-B.

### Validation
Verify contract alignment across Windows, Android, and Development Runtime; migrate all consumers; verify no legacy contract references remain; run applicable frontend/native builds and tests; and update `docs/design` with the final As-Is contract.

### Completion Criteria
Existing Read API contracts are aligned with v2.0.0 requirements and consumers/platforms agree on the resulting contract. No item requiring genuinely new information is implemented here; such items are explicitly deferred to Phase 4 or later.