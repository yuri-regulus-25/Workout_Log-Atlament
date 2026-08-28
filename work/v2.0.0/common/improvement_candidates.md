# v2.0.0 Common / 全画面共通 改修候補

## 目的
各画面Discoveryで特定ApplicationだけではなくAtlament全体へ適用すべきと判断した課題を集約する。本書はDiscovery資料であり、Framework間で同一UI Componentを共有することを目的としない。

## 進め方
1. 画面単位で要件・現状・Framework特性を確認
2. 各画面で改善案を検討・実装
3. 得られた知見をCommonへマージ
4. 横断基準を更新
5. 必要に応じて各画面へ再適用

---

# 1. Accessibility
**優先度: Medium**

全Applicationで評価する。

- Document LanguageとUI言語の整合
- Focus Visible
- Keyboard操作可能性
- Color Contrast
- 状態・差分・警告を色だけで表現しない
- `prefers-reduced-motion`
- Accessible Name / Description
- Dynamic Status / Loading / Error Announcement
- Chart Text Summary / Keyboard Interactionの必要性
- KPI / Comparison Deltaを色だけで表現しない
- Form Label / Error Association
- Table / List Semantics
- Filter Label
- Calendar / Selector Keyboard Operation
- Navigation時Focus Restoration
- Chart Tooltip / Data Point Accessibility
- Dynamic Resource Add / Remove Announcement
- Destructive Confirmation Keyboard Operation
- Form Group Semantics
- Body MapはHover依存にせずKeyboard / Touch / Screen Reader操作を検討

---

# 2. Mobile / Android WebView / Responsive
**優先度: Low**

- Safe Area
- Touch Target Size
- Android BackとApplication Navigationの整合
- Landscape
- OS Font Scaling
- Long Text / Status / Table折返し
- Horizontal Overflow抑制
- Tablet Breakpoint
- WebView Focus / Scroll / Dialog
- Desktop Table → Mobile Card / List
- Mobile Selector
- 複合入力Row最適化
- Body MapのTouch操作

---

# 3. 全画面UI / UX
**優先度: Medium**

- Loading / Skeleton
- Empty State
- Invalid State
- Warning / Degraded State
- Responsive Table / Card
- Tooltip表記
- Unit表記
- Decimal Rules
- Information Hierarchy
- Layout Density
- Long Text Handling
- Interactive Element Affordance
- Desktop / Tablet / Mobileの情報優先順位
- Horizontal Overflow
- Destructive Actionの視覚表現 / Confirmation統一
- Operation State / Section-local Errorの一貫性

---

# 4. Hero / Page Layout
**優先度: Medium候補**

- Hero高さ
- Page Title / Subtitle階層
- Above-the-fold主要情報量
- Desktop / Tablet / Mobile余白
- Shared Navigationとの視覚的整合

個別調整で済む場合は各Application側で扱う。

---

# 5. Motion
**優先度: Low**

- Transition Durationの極端なばらつきを避ける
- Loading / Dialog / Drawer / CardのMotion方針
- `prefers-reduced-motion`
- Motionで操作完了やNavigationを遅延させない

---

# 6. Frontend / Core 責務
**優先度: Medium / 実装候補確定後に精査**

Frontendは原則、表示 / UI State / Navigation / Framework固有Interactionを担当する。Workout Dataに対する集計・変換・比較・判定・Domain Validationは可能な限りCoreへ置く。

精査対象:
- Frontend内のDomain計算
- 複数Frontendでの重複計算
- Filter / Sort / Aggregate / Compare責務
- View Model生成
- UI State / Domain State混在
- Performance系列生成
- Gym / Machine比較制約
- Report Period Aggregate / Previous Period算出
- Body Map用Sets / Frequency / Last Trained集計
- Compare Delta
- Master Data Referential / Domain Validation

Master Data MaintenanceではFrontend Validationだけに依存せず、GitHub SoT反映経路でもDomain Validationを実施する。

---

# 7. Frontend Test Strategy
**優先度: Engineering観点で再評価**

- Loading / Empty / Warning State
- Navigation Smoke Test
- Responsive Smoke Test
- Accessibility Smoke Test
- Framework別Component / Integration Test
- Setup / Settings Validation・Save・Sync
- Compare同一Gym制約
- Report Period Aggregate
- Master Data Create / Update / Logical Delete / Restore
- Referential Integrity / Main Gym Constraint
- Git Conflict / Save Failure経路

---

# 8. Shared Metadata / Application Registration
**優先度: 新規Application増加により再評価**

候補Metadata:
- Route
- Display Name
- Framework
- Category
- Navigation Order

v2.0.0で新規Applicationが複数追加されるため、登録箇所の重複削減価値を再確認する。Application固有の表現まで共通Contractへ含めない。

---

# 9. Gym / Machine Context & Master Data
**優先度: High**

## 基本方針
- Gym / Machine / Exercise / Body Partの関係はMaster DataをSoTとする
- Machine → Body Part MappingをTraining Map等で再利用する
- Compareは同一Gym Context内のみ
- Weight / Volume等Machine差の影響を受ける値はGym / Machine Contextを考慮
- Main GymはMaster Data Maintenanceで管理
- Main Gym未設定は初期状態のみ許容し、一度設定後の解除は禁止
- Main指定中GymはInactive化 / Logical Delete不可
- SettingsはMaster DataのFile / Path等の参照設定を担当
- MaintenanceはMaster Data内容を担当
- 他GymのWorkout履歴は事実値として保持・表示可能

## 横断検討
- Data Model
- Gym / Machine識別情報
- Core APIへのGym / Main Gym Context
- Existing Workout Data Compatibility / Migration
- Alias / Normalize Ruleの実Schema確認
- Body Part Entity構造確認

---

# 10. Master Data Write Safety
**優先度: High**

Master Data Maintenanceはv2.0.0で例外的にGitHub SoTへのWrite責務を持つ。

- 原則Logical Delete
- Physical Deleteは原則行わない
- Destructive Action前Confirmation
- Delete前Dependency Check
- Referential Integrityを壊す場合はDelete Blocking + 原因表示
- Inactive Record Restore
- Dirty State / Leave Warning / Reset Changes
- Save前 / Pre-commit / Whole Master Validation
- Git Conflict検出
- Force Overwrite禁止
- Save成功後Runtime Auto Sync
- Unresolved Masterは人間が明示Resolve
- Auto Resolve / Suggested Match / Ignoreは行わない

Dependency / Circular Reference等の詳細ルールは実Master Schema確認後に確定する。

---

# 11. New Application Boundary

採用Application:
- Compare
- Training Map / Body Map
- Data Explorer
- About / Technology Gallery
- Report
- Master Data Maintenance

統合 / Skip:
- Calendar → Workout Domain
- Gym Explorer → Analytics
- System / Diagnostics → Settings
- Data Quality → 必要要素をMaster Data Maintenance
- Progress / Records / Timeline / Milestones / Search Command Center → v2.0.0 Skip

About / Technology GalleryはAstro採用確定。他ApplicationのFrameworkは横断選定で決定する。
