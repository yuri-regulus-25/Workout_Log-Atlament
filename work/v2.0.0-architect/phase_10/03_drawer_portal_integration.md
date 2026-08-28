# v2.0.0 Phase 10-C/D — Drawer & Portal Integration

## 日本語

### 目的
全Applicationが出揃った状態で正式DrawerとPortalを実装し、一貫した製品Navigationを構築する。

### Drawer
- 全Applicationから利用可能な正式Navigationを実装する。
- Group / order / current application / active state等は共通Registry/Metadataを利用する。
- Portal/Home、Settings等の必要導線を統一する。
- Phase 9 Temporary Navigationの残骸を再利用しない。

### Portal
- 全Applicationへの正式入口としてCard/Layoutを再構成する。
- Card metadata、grouping、description、availability等を共通Registryから利用する。
- 旧「既存5 App固定」構造を残さない。
- 新Application追加時にPortal個別ハードコードが必須となる構造へ戻さない。

### UI
具体的なCard layout、Drawer width、Label、spacing等はPhase 11のHuman Reviewで変更され得るため、このPhaseでは機能的統合を優先する。

### 完了条件
Portal/Drawerから全Applicationへ正式に遷移でき、共通Registryに基づくNavigationが成立すること。

---

## English
Implement the formal Drawer and Portal after all applications exist. Both consume shared registry/metadata for grouping, ordering, labels, availability, and identity. Remove the old fixed-five-app assumptions and avoid per-app Portal hard-coding. Exact visual details remain subject to Phase 11 UI/UX review.