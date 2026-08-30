# Phase 9-D — Existing Application Integration Tests

**Related Issue:** #75

## Objective
Registry → Navigation → Hosting → AF → Frontend のv2.0.0 Integrationを横断試験する。

## Verify
- Windows / Android / Development Runtimeから既存Appsへ到達可能
- Master Maintenanceが正式経路で動作
- ready/degraded/unavailable/fallback各状態でNavigation/Status/Recoveryが整合
- Direct Route / hosting / build artifactsが整合

Failureは修正後にretestする。
