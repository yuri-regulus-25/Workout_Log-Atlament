# v2.0.0 Phase 9-I — New Applications Integration Tests & Documentation

## 日本語

### 前提
Phase 9-A〜9-Hが完了していることを前提とする。

### 目的
新規Application群のFramework/Build/Hosting/Domain境界を横断試験し、Phase 9完了時点のAs-Isを設計書へ反映する。

### 必須Test観点
- About / Astro
- Training Map / Lit
- Compare / Preact
- Report / Mithril
- Data Explorer / Alpine
- Master Data Maintenance / Vue + Vuetify
- 各Application package/build成功
- MPA build aggregation
- Direct Route
- Windows hosting
- Android hosting
- Development Runtime
- shared registration/metadata整合
- Phase 8 Readiness/Accessとの整合
- Compare/Report等のMain Gym未設定時の部分Unavailable
- Data Explorer Read Only Boundary
- Maintenance Write Boundary
- Framework固有依存のLeakがないこと
- Phase 9 Temporary NavigationがCleanup済みであること
- Cleanup後もDirect Routeで全Applicationが起動可能であること

### Documentation
Phase 9完了時点のAs-Isとして `docs/design` を更新する。

最低限、以下を反映する。
- Application一覧 / Framework
- Application responsibility
- Application registration/metadata
- Build/Hosting architecture
- Direct Route
- Windows/Android/Development Runtime integration
- Domain/API dependencies
- Phase 9完了時点では正式Portal/Drawer Navigationが未実装であり、Phase 10対象であること

### Phase 9 Exit Condition
`Application exists + Build passes + Hosting works + Direct Route works + Temporary Navigation removed + Final Portal/Drawer not yet implemented` を満たすこと。

### 完了条件
新規Application群が各Runtimeで独立起動可能であり、Phase 9試験用Navigationが残存せず、設計書が実装As-Isと一致していること。

---

## English

Test all new Phase 9 applications across framework/package/build/MPA aggregation/direct routes/Windows/Android/Development Runtime/shared registration and domain boundaries. Verify Main-Gym-dependent partial unavailability, Data Explorer read-only behavior, Maintenance write boundaries, framework isolation, and removal of all temporary Phase 9 navigation while direct routes remain operational.

Update `docs/design` with the final application/framework inventory, responsibilities, registration metadata, build/hosting architecture, runtime integration, dependencies, and the explicit fact that final Portal/Drawer navigation is intentionally deferred to Phase 10.

Phase 9 exits only when: applications exist, builds pass, hosting works, direct routes work, temporary navigation is removed, and final Portal/Drawer navigation is not yet implemented.