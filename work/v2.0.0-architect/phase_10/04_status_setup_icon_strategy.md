# v2.0.0 Phase 10-E/F — Portal Status / Setup & Icon Strategy

## 日本語

### Status / Setup Integration
Phase 8のRuntime State / Readiness / RecoveryをPortalへ接続する。Portalは巨大なSettings画面にせず、状態把握と適切なSettings/Setup/Recovery導線を提供する責務に限定する。過去DRAFTで除外されたManual Sync等を無断で復活させない。

### Icon Strategy
全Applicationが出揃った状態でIcon体系を確定する。
- Primary Navigation Iconは原則Applicationの機能・意味を表すものを優先する。
- Framework/package iconは実装情報として分離し、必要ならsecondary badge/metadataとして扱う。
- MDI、利用可能なBrand Icon、既存Asset等を実装時に調査し、ライセンス/配布形態を含め安全な方式を選択する。
- Iconが存在しないFrameworkのためにNavigation semanticsを崩さない。

### UI
最終的なIcon選択・配置・サイズ等はPhase 11 Human Reviewで調整可能とする。

### 完了条件
PortalからRuntime状態とRecovery導線が理解でき、全Applicationで一貫したIcon方針が適用可能であること。

---

## English
Connect Phase 8 runtime/readiness/recovery state to Portal without turning Portal into Settings. Provide concise status and recovery/setup routes only; do not resurrect excluded responsibilities such as Manual Sync. Finalize an icon strategy after all apps exist: primary navigation icons should communicate application function, while framework/package branding is secondary metadata when useful. Investigate available icon sources/assets and licensing during implementation. Final visual choices remain reviewable in Phase 11.