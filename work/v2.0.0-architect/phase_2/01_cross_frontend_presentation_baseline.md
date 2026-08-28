# v2.0.0 Phase 2-A — Cross-Frontend Presentation Baseline

## 日本語

### 前提
本Phaseは Phase 0 および Phase 1 が正常に完了し、その変更が現在の作業Branchへ反映済みであることを前提とする。先行Phase未完了状態へのBackward Compatibilityは要求しない。

### 目的
既存Frontend群へ横断的な表示・操作品質基準を適用する。Framework間で同一UI Componentを共有することは目的とせず、各ApplicationのFramework特性を維持しながら共通基準へ揃える。

### 対象
- Accessibility: document language、focus visible、keyboard operation、accessible name/description、form/table/list semantics、dynamic status announcement、color-only expression回避、`prefers-reduced-motion`
- Responsive / Mobile / Android WebView: safe area、touch target、font scaling、long text、horizontal overflow、tablet/landscape、WebView focus/scroll
- UI State / Presentation: loading、empty、invalid、warning/degraded、unit、decimal rule、tooltip、information hierarchy、layout density
- Hero / Page Layout: title/subtitle hierarchy、主要情報量、viewport別余白、shared navigationとの視覚的整合
- Motion: transitionの極端なばらつき回避、操作完了やnavigationを遅延させない

### 制約
- localhost API Contractを変更しない。
- Master / Workout Data Schemaを変更しない。
- 新規Application、Portal、Drawerは対象外。
- Common化のためだけにFramework固有Componentを横断共有しない。
- Domain calculationや新しいbusiness ruleを導入しない。
- 個別画面で大規模な再設計が必要になった場合は本Phaseで実施せず、後続Phaseへ送る。

### Validation
各Frontendについてbuild/testを実施し、desktop/mobile相当viewport、keyboard operation、focus、overflow、loading/empty/error stateを確認する。Android WebViewで影響する項目は実行可能な範囲で確認する。

### 完了条件
既存Frontend群に共通のpresentation/accessibility/responsive基準が適用され、API/Data/Domain Contractを変更せず横断的な品質差が縮小していること。

---

## English

### Prerequisite
Phase 0 and Phase 1 must be completed and present on the current working branch. Backward compatibility with states before preceding phases is not required.

### Objective
Apply consistent presentation and interaction quality standards across existing frontends without forcing shared UI components across different frameworks.

### Scope
Accessibility; responsive/mobile/Android WebView behavior; loading/empty/invalid/warning states; units and decimal rules; information hierarchy and density; hero/page layout; motion and reduced-motion behavior.

### Constraints
Do not change localhost API contracts or Master/Workout schemas. New applications, Portal, and Drawer are out of scope. Do not introduce new domain calculations or business rules. Do not share framework-specific components merely for uniformity. Defer any screen requiring substantial redesign.

### Validation
Build/test each frontend and verify representative desktop/mobile viewports, keyboard/focus behavior, overflow, and loading/empty/error states. Verify relevant Android WebView behavior where practical.

### Completion Criteria
Existing frontends follow a consistent presentation/accessibility/responsive baseline without changing API, data, or domain contracts.