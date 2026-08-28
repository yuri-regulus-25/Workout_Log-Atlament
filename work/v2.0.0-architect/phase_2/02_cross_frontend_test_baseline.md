# v2.0.0 Phase 2-B — Cross-Frontend Test Baseline

## 日本語

### 前提
Phase 0、Phase 1、および Phase 2-A の変更が現在の作業Branchへ反映済みであることを前提とする。

### 目的
既存Frontend群に対して、v2.0.0で継続利用できる必要最小限の横断Test Baselineを整備する。

### 対象
- Loading / Empty / Warning / Error State
- Navigation Smoke Test
- Responsive Smoke Test
- Accessibility Smoke Test
- Framework別に必要なComponent / Integration Test
- Phase 2-Aで導入・調整したpresentation ruleのregression確認

### 制約
- localhost API Contractを変更しない。
- TestのためだけにProduction Contractを増やさない。
- Frameworkを跨ぐ単一Test Frameworkへの統一を目的としない。
- 新規Application、Portal、Drawer、Master Data Maintenance固有Write Test等は対象外。

### 完了条件
既存Frontendに対して、主要な表示状態・navigation・responsive・accessibilityのregressionを検知できるBaselineが存在し、後続Phaseで再利用可能であること。

---

## English

### Prerequisite
Phase 0, Phase 1, and Phase 2-A changes must be present on the current working branch.

### Objective
Establish a minimal reusable cross-frontend test baseline for existing v2.0.0 applications.

### Scope
Loading/empty/warning/error states, navigation smoke tests, responsive smoke tests, accessibility smoke tests, framework-appropriate component/integration tests, and regression coverage for Phase 2-A presentation rules.

### Constraints
Do not change localhost API contracts or add production contracts solely for tests. Do not force all frameworks onto one test framework. New applications, Portal, Drawer, and Maintenance-specific write tests are out of scope.

### Completion Criteria
A reusable baseline exists that can detect regressions in major presentation states, navigation, responsive behavior, and accessibility across existing frontends.