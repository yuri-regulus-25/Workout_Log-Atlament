# v2.0.0 Phase 9-G — New Application Build & Hosting Integration

## 日本語

### 前提
Phase 9-A〜9-Fの各Application実装を対象とする。

### 目的
新規Application群を既存MPA Build / Application Registration / Windows / Android / Development Runtimeへ一貫して統合する。

### 対象
- Application registration/metadata
- package dependency/build command
- MPA build aggregation
- output path/asset handling
- Direct Route
- Windows hosting
- Android hosting
- Development Runtime
- Version/Statusとの必要な整合

### Architecture Rule
Phase 0以降で確立したApplication Registration/MetadataのAs-Isを利用し、Portal、Shared Navigation、Build、Windows、Androidへ同じApplication名一覧を個別ハードコードする構造へ戻さない。実装上まだ固定箇所が残っている場合は共通Registry/Metadataへ寄せる。

### Framework Isolation
各Framework固有BuildはApplication内部/Build Adapter境界へ閉じ込め、他ApplicationへFramework固有依存を漏らさない。

### 完了条件
全新規Applicationが同一のRegistration/Build/Hosting方針で扱われ、Windows/Android/Development RuntimeからDirect Routeで起動可能であること。

---

## English

Integrate all Phase 9 applications consistently into application registration, MPA build, Windows/Android hosting, Development Runtime, and required version/status metadata. Reuse the post-Phase-0 registration/metadata architecture and do not reintroduce duplicated hard-coded app-name lists across Portal/navigation/build/platform hosts. Keep framework-specific build behavior isolated behind each app/build-adapter boundary. All new apps must launch by direct route on every supported runtime.