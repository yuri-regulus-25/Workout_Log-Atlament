# v2.0.0 Phase 10-G/H/I — Navigation State, Responsive & Error Integration

## 日本語

### Navigation State
全FrameworkでCurrent Application、Active Drawer Item、Portal/Home、Settings、Direct URL entry、Reload、Browser/Android Back等のNavigation semanticsを可能な限り統一する。Query/Route stateを必要以上に破棄しない。

### Responsive / Accessibility
共通Shell / Navigation / Portalを中心にDesktop/Mobile/Narrow width/Android safe area、keyboard navigation、focus、semantic structure、contrast、reduced motion、shared tokens/styles等を横断確認する。各Application固有UIの全面再設計はPhase 11 Human Reviewで扱う。

### Error Pages
404 / 500 / 503を正式Navigation/Phase 8 Lifecycleと統合する。
- 404とRuntime failureの意味を同一視しない。
- 状態に応じPortal/Home、Settings/Recovery等へ適切に戻れること。
- Drawer表示可否はError semanticsと安全性から決定する。
- 最終visual/wordingはPhase 11で調整可能とする。

### 完了条件
Navigation semantics、基本Responsive/Accessibility、Error/Recovery導線が全体として機能的に統合されていること。

---

## English
Unify navigation semantics across frameworks, including current/active state, Portal/Home, Settings, direct URLs, reload, browser back, and Android back. Verify cross-cutting responsive/accessibility behavior around the shared shell/navigation/Portal. Integrate 404/500/503 with formal navigation and Phase 8 lifecycle while preserving their distinct meanings. Final visual/wording polish remains Phase 11 work.