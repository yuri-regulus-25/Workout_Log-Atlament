# v2.0.0 Phase 10-B — Application Registry / Metadata Finalization

## 日本語

### 目的
Phase 10-AのIAを共通Application Registry/Metadataへ反映し、Portal/Drawerで二重管理しない構造を完成させる。

### Metadata候補
実装済みRegistryを再確認し、必要最小限として `id`, `route`, `label`, `description`, `group`, `icon`, `order`, `availability` 等を検討する。既存Fieldを重複追加しない。

### 原則
- PortalとDrawerは同じApplication identity/metadataを参照する。
- Build/Hosting Registryとの統合可能性を確認し、Application名一覧の個別ハードコードを再導入しない。
- Framework情報を保持する場合もNavigation primary identityとは分離する。

### 完了条件
Application情報のSoTが明確で、Portal/Drawer/関連基盤が同一identityを利用できること。

---

## English
Finalize shared application registry/metadata from the approved IA. Portal and Drawer must consume the same application identity rather than duplicate lists. Reuse existing metadata fields where possible and avoid reintroducing hard-coded app-name lists across build/hosting/navigation.