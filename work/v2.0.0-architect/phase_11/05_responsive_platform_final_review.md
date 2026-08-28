# v2.0.0 Phase 11-H — Responsive / Platform Final Review

## 日本語

### 目的
UI/UX修正後の全ApplicationをWindows / Android / Development Runtimeおよび主要Viewportで最終確認する。

### 対象
- Desktop / narrow width / mobile
- Android safe area / system back
- Windows window resize
- Drawer / Dialog / Data Table / Form
- scroll / overflow
- touch target / keyboard/focus
- Portal / Error Pages / Developer Console
- Framework間でのShared Navigation/CSS整合

### 原則
Platform固有の必要差分は許容するが、同じDomain Stateの意味や基本操作をPlatformごとに変えない。

### 完了条件
主要Runtime/Viewportで致命的なLayout/Navigation/Interaction差異がなく、UI/UX FIX候補としてHuman Reviewを通過していること。

---

## English
Perform final responsive/platform review after UI/UX fixes across Windows, Android, Development Runtime, desktop/narrow/mobile viewports, safe areas, resize/back behavior, drawers/dialogs/tables/forms, scrolling, touch/focus, Portal/error/developer pages, and shared navigation/CSS. Platform-specific presentation differences are allowed but must not change domain semantics or core operations.