# v2.0.0 Phase 6-E — Main Gym-aware Derived Metrics

## 日本語

### 前提
Phase 0〜Phase 5およびPhase 6-A〜6-Dが正常に完了し、Main Gym Contextが共通Domainとして利用可能であることを前提とする。

### 目的
Phase 5で意図的に保留したWeight / Volume系の派生Metricについて、Main Gym Contextを適用して比較可能性を限定し、安全にCoreへ導入・既存Applicationへ接続する。

### 対象候補
実装前に既存DRAFT/実装を再確認し、v2.0.0既存Applicationで必要なものを確定する。

- Main Gym Volume
- Previous Period / Previous Month Volume
- Volume Trend
- Volume Moving Average
- Max Volume Session
- Max Weight系Metric
- Performance DetailのWeight Metric
- AnalyticsのWeight / Volume Metric
- DashboardのVolume比較

### Domain Rule
- Weight / Volume比較はMain Gym Contextを適用する。
- Main Gym未設定の初期状態では、Main Gym依存Metricを比較可能な値として捏造しない。Unavailable/Not configuredとして扱えるDomain Stateを返す。
- Main Gym以外のGym DataをWeight/Volume比較へ暗黙混入させない。
- PR / Best / Winner / Improved / Declined等の評価概念は、別途明示的に採用されていない限り導入しない。
- 新規Application（Compare / Report等）への接続は後続Phaseで行い、本PhaseではCoreを再利用可能にしておく。

### 制約
- Main Gym変更によってWorkout LogをRewriteしない。
- Machine comparability対応表等の新Masterを作らない。
- API/Data Schemaを追加変更する必要が生じた場合は、先行Phaseの設計との整合を再確認し、無断でScope拡張しない。
- UI文言・視覚デザインは製造時のCodex案と人間の実画面レビューで調整する。

### 完了条件
Main Gym Contextを必要とするWeight/Volume系Metricが、他Gymを混入させず共通Coreから安全に算出可能となり、既存Applicationの必要箇所へ接続されていること。

---

## English

### Prerequisite
Phase 0 through Phase 5 and Phase 6-A through 6-D must be completed, with Main Gym available as a shared domain context.

### Objective
Safely introduce and integrate Weight/Volume-derived metrics intentionally deferred from Phase 5 by restricting comparability through Main Gym context.

### Candidate Scope
Main Gym volume, previous-period/month volume, volume trend/moving average, max-volume session, max-weight metrics, Performance Detail weight metrics, Analytics weight/volume metrics, and Dashboard volume comparison. Re-check actual implementation/drafts before finalizing each item.

### Domain Rules
Apply Main Gym context to Weight/Volume comparisons. When Main Gym is not configured, return an explicit unavailable/not-configured domain state rather than fabricating comparable values. Never implicitly mix non-main-gym data. Do not introduce PR/Best/Winner/Improved/Declined judgments unless separately approved. New applications such as Compare/Report consume this core later.

### Constraints
Do not rewrite workout logs when Main Gym changes or create a machine-comparability master. Do not silently expand API/data schema scope. UI wording/design is refined during implementation and human visual review.

### Completion Criteria
Main-Gym-dependent Weight/Volume metrics are safely reusable from shared core and integrated into required existing applications without mixing incompatible gym contexts.