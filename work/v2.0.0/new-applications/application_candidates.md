# v2.0.0 新規Application Discovery — Reviewed DRAFT

## 採用判定

| ID | Application | 判定 | Framework |
|---|---|---|---|
| A | Progress | Skip | - |
| B | Records / Personal Bests | Skip | - |
| C | Calendar | Skip / Workout Domainへ統合 | Vue（既存） |
| D | Compare | Pass | **Preact** |
| E | Timeline / Activity | Skip | - |
| F | Training Map / Body Map | Pass | **Lit** |
| G | Gym Explorer | Skip / Analyticsへ統合 | Svelte（既存） |
| H | Data Explorer | Pass | **Alpine.js** |
| I | System / Diagnostics | Skip / Settingsへ統合 | SolidJS（既存） |
| J | About / Technology Gallery | Pass | **Astro** |
| K | Milestones | Skip | - |
| L | Search / Command Center | Skip | - |
| M | Report | Pass | **Mithril.js** |
| N | Data Quality | Skip / 必要要素はMaster Data Maintenanceへ統合 | Vue + Vuetify |
| O | Master Data Maintenance | Pass | **Vue + Vuetify** |

---

# D. Compare — Preact

## 責務
同一Gym Context内でWorkoutまたはPeriodをA/B比較する。比較は事実値を示し、Improved / Declined / Winner等の評価を行わない。

## 比較対象
- Gym Context必須。同一Gym内のみ比較可能
- Compare TypeはWorkout vs Workout / Period vs Period
- ExerciseはCompare TypeではなくFilter / Scope
- Workout vs Workout: Pass
- Period vs Period: Pass
- Exercise Filter: Pass
- Body Part Filter: Pass
- Exercise単位の数値比較は同一Exercise同士のみ

## Metrics
- Total Sets: Pass
- Total Volume: Pass（Gym / Machine Contextを考慮）
- Exercise Count: Skip
- Workout Duration: Skip
- Max Weight: Pass
- Reps: Skip
- Exercise Volume: Pass
- RIR: Skip
- e1RM: Skip

## Exercise構成
- Common Exercises: Pass
- Added Exercises: Pass
- Removed Exercises: Pass
- Exercise Order比較: Skip
- Set-by-Set比較: Pass

## Delta / Evaluation
- Absolute Delta: Pass
- Percentage Delta: Pass
- Improved / Declined判定: Skip
- Winner表示: Skip

## UI
- Summary Cards: Pass
- Side-by-side Exercise Table: Pass
- Period比較Chart Overlay: Pass
- Added / Removed表示: Pass
- Workout / Performance Detail Drill-down: Pass
- Swap A / B: Pass
- URL共有: Skip
- Comparison保存: Skip

## Domain Rule
- A選択後、B候補は同一Gymへ限定
- Machine / Body Part ContextはMaster DataをSoTとして利用
- Compare専用の比較可能Machine対応表は新設しない
- Delta / Period Aggregate等はCore責務
- Empty State等はCommon準拠

## Framework選定理由
Preactを採用する。比較対象・Filter・A/B Swap等の状態管理を持ちながら、既存React Applicationとの実装・Bundle・互換性の差を比較できる題材とする。

---

# F. Training Map / Body Map — Lit

## 責務
Master DataのMachine → Body Part情報をSoTとして、どの部位をいつ・どれくらいTrainingしたかを身体図から探索する。身体バランスや回復状態の評価は行わない。

## Body Map
- Front / Back Body Map: Pass
- Body Part Mapping: Master Data準拠
- Period Selector: Pass
- Gym Filter: Pass
- Body Part Tap / Click: Pass
- Front / Back切替: Pass

## Metrics
- Sets Intensity: Pass
- Frequency Intensity: Pass
- Last Trained: Pass
- Volume Intensity: Skip
- Balance Score: Skip
- Radar Chart: Skip
- Metric切替: Sets / Frequency / Last Trained
- Legend: Pass
- Hover Tooltip: Body Part名 + Metric値
- Untrained表示: Pass

## Drill-down
- Machine / Exercise List: Pass
- Performance Detail: Pass
- Workout History: Pass

## Boundary
- 医学的な筋肉細分化: Skip
- Training Recommendation: Skip
- Recovery判定: Skip
- Sets / Frequency / Last Trained集計はCore責務
- Mobile Tap等はCommon準拠

## Framework選定理由
Litを採用する。SVG Body Map / Custom Elements / Reactive Propertiesを題材にWeb Components中心の設計思想を既存Frontendと比較する。

---

# H. Data Explorer — Alpine.js

## 責務
Runtime Dataを自由に探索するPower User向けRead Only Application。

## Requirements
- Read Only厳守
- Raw Data / Normalized Dataの両方を閲覧可能
- Session / Exercise / Gym / Machineその他Runtime上のFieldを探索可能
- Filter / Sort / Search等を提供
- Raw ↔ Normalizedの関係を確認可能
- Workout / Performance Detail等へのDrill-downは可能
- Workout / Runtime / Master Dataの編集・修正導線は持たない
- Master Data変更はMaster Data Maintenanceの責務
- Domain変換をData Explorer専用Frontendへ再実装しない

## UI
Table / Detail Pane / Layout等の具体的な見せ方は実装時Discovery / Codex裁量とする。

## Framework選定理由
Alpine.jsを採用する。Read OnlyのData Table / Filter / Detail UIをHTML Enhancement中心の軽量な設計で実装し、Component Framework主体の既存Applicationとの差を比較する。

---

# J. About / Technology Gallery — Astro

## 責務
Atlament自身のApplication / Framework / Architectureを可視化する静的寄りShowcase Application。

## Features
- Application Gallery: Pass
- Framework情報: Pass
- Architecture Overview: Pass
- Version Matrix: Pass
- Build Target: Pass
- Shared Packages: Pass
- Architecture Diagram: Pass
- Application → Framework Map: Pass
- Framework比較説明: Skip
- LOC / Bundle Size比較: Skip
- Performance Benchmark: Skip
- Repository Link: Pass
- License / Credits: Skip
- Changelog: Skip
- Runtime Status: Skip（Settings責務）
- Credential / Config: Skip
- 過剰な動的管理機能: Skip

## Framework選定理由
Astroを採用する。静的中心 / Islands Architectureという既存Applicationと異なる設計思想をShowcase自体の実装で比較する。

---

# M. Report — Mithril.js

## 責務
期間単位のTraining Summaryを固定形式で「読む」Application。探索主体のAnalyticsとは分離する。

## Period
- Weekly: Pass
- Monthly: Pass
- Yearly: Skip

## Summary
- Sessions: Pass
- Training Days: Pass
- Total Sets: Pass
- Total Volume: Pass（Main Gym Context）
- Previous Period Comparison: Pass
- Most Performed Exercises: Pass
- Body Part Distribution: Pass
- Gym Distribution: Pass
- Max Weight Highlights: Pass
- PR / Best判定: Skip
- RIR Summary: Skip
- e1RM: Skip
- Notes Highlights: Skip
- Automated Evaluation: Skip

## Navigation / UX
- Previous / Next Report: Pass
- Current Periodへ戻る: Pass
- Weekly / Monthly切替: Pass
- Gym Filter: Pass
- Exercise → Performance Detail: Pass
- Workout → Workout Detail: Pass
- Export PDF: Skip
- Share: Skip
- Print Layout: Skip
- Report保存: Skip

## Visualization
- Sessions Trend: Pass
- Sets Trend: Pass
- Volume Trend: Pass（Main Gym限定）
- Body Part Chart: Pass
- Gym Chart: Pass
- Max Weight Chart: Skip
- Previous Period Overlay: Pass
- Calendar / Heatmap: Skip
- Radar Chart: Skip

## Domain / Layout
- Fixed Report Structure: Pass
- Period Aggregate: Core責務
- Previous Period算出: Core責務
- Main Gym Context: Weight / Volume系へ適用
- Responsive / Empty / Partial Period: Common準拠

## Framework選定理由
Mithril.jsを採用する。Read Only中心の固定Reportに小型Virtual DOM / State → View構成を適用し、既存Framework群とは異なる軽量実装を比較する。Framework採用そのものを目的に機能を増やさない。

---

# O. Master Data Maintenance — Vue + Vuetify

## 責務
Master Dataの内容を保守するRead / Write Application。Master Dataのファイル名 / Path等の参照設定はSettings責務。

Raw JSON EditorではなくMaster Data Domain Modelを編集するUIとする。

## 管理対象
- Gym: Create / Update / Logical Delete
- Machine: Create / Update / Logical Delete
- Exercise: Create / Update / Logical Delete
- Body Part: Master Schema上のEntity構造を確認して決定
- Machine → Gym: Pass
- Machine → Exercise: Pass
- Machine → Body Part: Pass
- Main Gym: Pass
- Alias / Normalize Rule: Master Schemaに存在する場合Pass
- Raw JSON直接編集: Skip
- Master File / Path変更: Skip / Settings責務

## Delete Policy
- 削除は原則Logical Delete
- Physical Deleteは原則Skip
- 削除前Confirmation必須
- Master Data内のDependencyを削除前に検証
- Referential Integrityを壊す場合は削除を拒否し、原因となるRelation / Recordを表示
- Dependencyの詳細ルールは実Master Schema確認後に設計
- Logical Delete済みRecordのRestore: Pass
- Inactive Record表示切替: Pass

## Editing UX
- Master Type Selector: Pass
- Record List: Pass
- Search: Pass
- Active / Inactive / All Filter: Pass
- Detail Editor: Pass
- New Record: Pass
- Inline Table Edit: Skip
- Bulk Edit: Skip
- Bulk Delete: Skip
- Dirty State: Pass
- Leave Warning: Pass
- Reset Changes: Pass
- Field Validation: Pass
- Relation Selector: Pass
- Inactive Relationを新規候補から除外: Pass
- Save Operation State: Pass
- Section-local Error: Common準拠

## Save / GitHub SoT
- Record単位Save: Pass
- Save前Validation: Pass
- GitHub Master Data SoTへ反映: Pass
- Commit Message自動生成: Pass
- Commit Message手動入力: Skip
- Diff Preview: Pass
- GitHub反映後Status: Pass
- Save成功後Auto Sync: Pass
- Git Conflict検出: Pass / 詳細設計確認
- Force Overwrite: Skip
- Commit SHA表示: Skip
- Git History: Skip

## Main Gym Constraint
- Main GymはActive Gymから最大1件
- 初期状態のみMain Gym 0件を許容
- 一度設定後、Main Gymの解除は禁止
- Main Gym変更（Gym A → Gym B）は可能
- Inactive GymをMain指定不可
- Main指定中GymのLogical Deleteは禁止
- Main GymはGym一覧で視認可能
- Main Gym変更時の追加Confirmation: Skip
- Save + Sync後にAnalytics / Report等へ新Contextを反映

## Unresolved / Data Quality
- Unresolved一覧: Pass
- Affected Workout: Pass
- 既存MasterへのResolve: Pass
- Unresolvedから新規Master作成: Pass
- Bulk Resolve: Pass
- Ignore: Skip
- Malformed JSON修正: Skip
- Missing RIR / Notes等のCoverage: Skip
- Auto Resolve: Skip
- Suggested Match: Skip

未解決Masterは人間が明示的にResolveする。同一未解決値が複数Workoutに存在する場合はBulk Resolve可能。

## Validation / Safety
- Required Validation: Pass
- Type / Format Validation: Pass
- Unique Validation: Pass
- Referential Integrity: Pass
- Active Relation Validation: Pass
- Circular Reference: 実Master Schema確認後に要否決定
- Validation Error時Save Blocking: Pass
- Error Location明示: Pass
- Whole Master Validation: Pass
- Pre-commit Validation: Pass
- Delete Dependency Validation: Pass
- Main Gym Constraint Validation: Pass
- 通常UpdateへのConfirmation乱発: Skip
- Destructive Confirmation: Pass
- Frontend Only Validation: Skip
- Domain / Referential ValidationはCore側へ集約

## Status / Navigation
- Master Status Summary（Active / Inactive / Unresolved件数）: Pass
- Last Updated: 自然に取得可能ならPass。表示目的の永続化は行わない
- Last Updated By: Skip
- Git Commit SHA: Skip
- SettingsへのMaster File / Path導線: Pass
- Unresolved Badge: Pass
- Maintenance Home: Pass
- Recent Changes: Skip
- Audit History: Skip
- Import / Export: Skip

## Framework選定理由
**Vue + Vuetifyを採用する。** Write / Validation / Dependency Check / GitHub反映等を持つ保守上重要なApplicationのため、既知で保守しやすいVueを採用する。Vuetifyを追加し、Data Table / Form / Dialog等のComponent Frameworkを利用した構成を既存Workout DomainのVue実装と比較する。

---

# Framework横断選定 — Fix

| Application | Framework | 主な比較テーマ |
|---|---|---|
| Compare | **Preact** | React系軽量実装 / State管理 |
| Training Map / Body Map | **Lit** | Web Components / SVG Interaction |
| Data Explorer | **Alpine.js** | HTML Enhancement / 軽量Interaction |
| About / Technology Gallery | **Astro** | Static-first / Islands Architecture |
| Report | **Mithril.js** | 小型Virtual DOM / State → View |
| Master Data Maintenance | **Vue + Vuetify** | 保守性 / Component Framework / CRUD |

既存Frontend:
- Portal: Vanilla
- Dashboard: React
- Workout Domain: Vue
- Performance Detail: Angular
- Analytics: Svelte
- Application Settings: SolidJS

v2.0.0追加後は、同一Repository内で複数のFrontend設計思想を比較できる構成とする。ただしFrameworkを増やすためにApplication責務や機能を捏造しない。

---

# Architecture共通前提
- Workout DataはGitHub SoT Read Onlyを維持
- Master Data MaintenanceのみMaster Dataへの明示的Write責務を持つ
- AF HTTP API ContractをOS共通とする
- Platform差異をFrontendへ持ち込まない
- Domain calculation / Validationは可能な限り`workout-core`
- Runtime loadingは`workout-data`
- UI ComponentをFramework間共有しない
- design tokens / frontend-common等の既存Shared境界を維持
