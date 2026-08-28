# v2.0.0 Phase 9-E — Data Explorer / Alpine

## 日本語

### 前提
Phase 9-Dまでが現在の作業Branchへ反映済みであることを前提とし、Phase 9共通Temporary Navigation Ruleを適用する。

### 目的
Workout/Master Dataを調査・確認するRead OnlyのData Explorer ApplicationをAlpineで実装する。

### Responsibility Boundary
- Data ExplorerはRead Onlyとする。
- Maintenance Write APIへ接続しない。
- Raw/Normalized Dataを表示対象にできるが、Raw JSON Editorにはしない。
- 任意JSON/File/Path Write capabilityを持たせない。
- Master変更はPhase 7のMaintenance Applicationだけが担当する。

### Data Contract
Phase 0〜8完了後の実API/Data Contractを再確認する。Raw表示要件に既存Contractで不足がある場合、勝手にGeneric Raw APIを追加せず、必要性・Security/Responsibility Boundaryを再評価して最小Contractを設計する。

### UI
Search/Filter/Expand/Presentation等は最新DRAFTを確認して実装する。表示用の整形とDomain Interpretationを混同しない。

### Integration
Alpine package/build、Direct Route、Windows/Android/Development Runtime hostingを追加する。

### 完了条件
Data ExplorerがRead Only Boundaryを維持してDataを確認でき、Maintenance/Write責務を侵食せず、全RuntimeでDirect Routeから利用可能であること。

---

## English

Implement Data Explorer with Alpine as a strictly read-only inspection application. It may display raw/normalized data but must not become a raw JSON editor, connect to Maintenance writes, or expose arbitrary file/path writes. Re-check the actual post-Phase-8 API/data contracts; if raw inspection needs missing data, design only the minimum safe read contract rather than a generic raw API. Integrate build/hosting/direct routes across all runtimes. Phase 9 temporary-navigation rules apply.