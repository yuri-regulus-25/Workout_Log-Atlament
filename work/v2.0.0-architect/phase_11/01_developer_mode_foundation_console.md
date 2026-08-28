# v2.0.0 Phase 11-A/B — Developer Mode Foundation & Console

## 日本語

### 前提
Phase 10 Product Integrationが完了していること。

### 目的
UI/UX Human Reviewと将来Regression確認のため、通常利用から隔離されたDeveloper Modeと専用Developer Console/Test Pageを実装する。

### Technology
Developer専用画面はPure HTML / TypeScriptで実装する。Developer Modeのためだけに新Frontend Frameworkを追加しない。

### Safety Boundary
- Developer Modeは通常Navigation、Portal Card、Drawer Itemへ常設表示しない。
- 偶発的操作で容易に到達できない隠し/Easter Egg的Entryとする。
- 具体的なEntry操作は製造時に人間レビューで決定する。
- Developer Mode中であることを専用画面および必要な表示領域で明示する。
- 明示的に解除可能とする。
- 原則としてRuntime session中のみ有効とし、Application再起動後はOFFへ戻す。既存Runtime architecture上より安全な方式がある場合は実装時に再評価する。
- Developer ModeがOFFの場合、通常Application behaviorへ一切介入しない。

### Console
Developer ConsoleからMock Scenarioの選択・適用・解除・Response Preview等を行えるようにする。具体的Layout/LabelはHuman Review対象とする。

### 完了条件
通常利用から隔離されたDeveloper ModeとPure HTML/TS Consoleが存在し、明示的に有効化/解除でき、OFF時の通常挙動へ影響しないこと。

---

## English
Implement an isolated Developer Mode and Pure HTML/TypeScript developer console for UI/UX review and future regression testing. Do not add another frontend framework. Developer Mode must not appear in normal Portal/Drawer navigation, must require a deliberately hidden/easter-egg-style entry decided during implementation review, clearly indicate when active, support explicit exit, and preferably reset off after runtime restart. When off, it must not affect normal behavior. The console provides scenario selection/application/removal and response preview.