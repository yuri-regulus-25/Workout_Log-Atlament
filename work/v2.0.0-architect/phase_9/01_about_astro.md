# v2.0.0 Phase 9-A — About / Astro

## 日本語

### 前提
Phase 0〜Phase 8が正常に完了し、現在の作業Branchへ反映済みであることを前提とする。

### Phase 9共通Navigation Rule
Phase 9では新規Applicationの開発・試験を目的としたTemporary Navigation（Portal仮Card、Drawer仮Item、Dev Link等）の追加を許可する。ただし正式なPortal/Drawer設計はPhase 10で行うため、Phase 9完了時にはPhase 9で追加したTemporary Navigationをすべて撤去する。Application本体、Route Registration、Build/Hosting Registrationは撤去対象ではない。

### 目的
About ApplicationをAstroで実装し、新規Frontend Framework/ApplicationをMPA Build・Windows/Android Hosting・Development Runtimeへ追加する低リスクな基準実装とする。

### 対象
- About Application本体
- Repository/Application/Framework等、既存要件で定義された静的情報表示
- Astro package/build integration
- Direct Route
- Windows / Android / Development Runtime hosting

### 原則
- 静的情報中心とし、不要なDomain/API依存を追加しない。
- About固有要件は最新DRAFTとPhase 0以降のAs-Is設計を再確認して確定する。
- UI文言・Icon・Layout等は製造時の初期案と人間の実画面レビューで調整する。

### 完了条件
AboutがAstro Applicationとして単独Routeから正常起動し、新規Application追加のBuild/Hosting Patternが実証されていること。

---

## English

### Prerequisite
Phase 0 through Phase 8 must be completed and present on the current working branch.

### Phase 9 Temporary Navigation Rule
Temporary navigation may be added solely for development/testing during Phase 9. All such temporary Portal cards, Drawer items, dev links, labels, and icons must be removed before Phase 9 completes. Application code, route registration, and build/hosting registration remain. Final Portal/Drawer design belongs to Phase 10.

### Objective
Implement About using Astro as the low-risk reference for integrating a new framework/application into MPA build, Windows/Android hosting, and Development Runtime.

### Scope
About application, approved static information, Astro package/build integration, direct route, and all runtime hosting targets.

### Completion Criteria
About launches correctly by direct route and demonstrates the new-application build/hosting pattern.