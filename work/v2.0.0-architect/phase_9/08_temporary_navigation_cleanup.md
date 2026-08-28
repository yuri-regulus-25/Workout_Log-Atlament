# v2.0.0 Phase 9-H — Temporary Navigation Cleanup

## 日本語

### 前提
Phase 9-A〜9-GのApplication実装・試験が完了していることを前提とする。

### 目的
Phase 9中に開発・試験目的で追加したTemporary Navigationをすべて撤去し、Phase 10の正式Portal/Drawer設計開始前にNavigationを意図した中間状態へ戻す。

### 削除対象
Phase 9で追加した以下を棚卸しする。
- Temporary Portal Card
- Temporary Drawer Item
- Dev/Test Link
- Temporary Navigation Entry
- Temporary Label
- Temporary Icon / Placeholder
- Phase 9試験だけを目的としたNavigation-specific CSS/metadata

### 削除しないもの
- 新規Application本体
- Route Registration / Direct Route
- Application Registration/MetadataのうちBuild/Hostingに必要なもの
- package/build integration
- Windows/Android/Development Runtime hosting
- Domain/Core/API implementation

### Validation
Cleanup後に全新規ApplicationのDirect Route、Build、Windows/Android/Development Runtime hostingが引き続き正常であることを確認する。

### 完了条件
Phase 9由来の試験用人間導線が残っておらず、新規Application本体は利用可能なまま、正式NavigationのみPhase 10へ未実装として残っていること。

---

## English

After all Phase 9 app implementation/testing, remove every temporary human-facing navigation artifact introduced solely for Phase 9: temporary Portal cards, Drawer items, dev/test links, labels/icons/placeholders, and navigation-only styling/metadata. Do not remove application code, direct routes, required registration/build metadata, package/build integration, hosting, or domain/API implementation. Re-test direct routes/build/hosting after cleanup. Phase 9 completes with apps present and routable but without Phase-9 temporary navigation; final navigation is intentionally deferred to Phase 10.