# v2.0.0 Phase 9-F — Master Data Maintenance Integration

## 日本語

### 前提
Phase 7でMaster Data Maintenance/Write基盤が完成し、Phase 8 Lifecycleが利用可能であることを前提とする。Phase 9共通Temporary Navigation Ruleを適用する。

### 目的
Phase 7で実装したVue + Vuetify Master Data Maintenanceを正式なFrontend ApplicationとしてBuild/Hosting対象へ統合し、各Runtimeから利用可能にする。

### 対象
- Maintenance Application registration
- package/build integration
- Direct Route
- Windows AF hosting
- Android AF hosting
- Development Runtime
- Phase 8 Readiness/Access/Statusとの整合
- Phase 7 Write/Validation/Conflict/Error ContractとのEnd-to-End接続

### 原則
- Phase 7で確定したRaw JSON禁止、1Record Edit、Copy、Logical Delete/Restore、Main Gym、Unique ID、Confirmation等の仕様を維持する。
- Phase 9都合でMaintenance Domain/Write仕様を作り直さない。
- 正式Portal/Drawer NavigationはPhase 10へ送る。

### 完了条件
Maintenance ApplicationがWindows/Android/Development RuntimeからDirect Routeで利用でき、Phase 7 Write FlowがEnd-to-Endで成立していること。

---

## English

Integrate the Phase 7 Vue + Vuetify Master Data Maintenance application into formal build/hosting/runtime registration. Preserve all Phase 7 safety and interaction rules rather than redesigning the write domain. Verify end-to-end write/validation/conflict/error behavior and Phase 8 lifecycle compatibility across Windows, Android, and Development Runtime. Final Portal/Drawer navigation belongs to Phase 10; Phase 9 temporary-navigation rules apply.