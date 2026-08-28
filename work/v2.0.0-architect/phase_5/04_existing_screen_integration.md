# v2.0.0 Phase 5-D — Existing Screen Integration

## 日本語

### 前提
Phase 0〜Phase 4およびPhase 5-A〜5-Cが正常に完了し、現在の作業Branchへ反映済みであることを前提とする。

### 目的
Phase 5で共通Coreへ追加した派生Domain Logicを既存Frontendへ接続し、既存Data/API Contractの範囲内で機能として利用可能にする。

### 対象候補
- Dashboard Previous Month Comparison
  - Workouts / Sessions
  - Sets
  - VolumeはMain Gym Context確定まで新規比較対象にしない
- Workout Calendar
- Workout Previous / Next Navigation
- Workout Session Compare
- Analytics Global Period適用
- Analytics Frequency / Consistency表示
- Analytics Body Part Distribution / Trend
- Analytics Machine Frequency Ranking
- Analytics Sessions by Gym

### 実装原則
- FrontendはCore計算結果の表示・操作責務を担い、同じDomain計算をFrontendへ再実装しない。
- Weight / Volume comparabilityが必要になった機能はPhase 6以降へ送る。
- 既存Dataだけで対象を一意に解決できないNavigation/Compareは実装しない。
- API/Data Schemaを変更しない。
- UI文言、Label、細かなLayout、視覚的表現は本指示書で固定しない。Codexは製造時に既存Source/UIとの整合を踏まえて妥当な初期案を作成し、その後人間が実画面をレビューして指摘・調整する。

### Validation
- CoreとFrontendで集計結果が二重定義されていないこと
- Period境界、月跨ぎ、年跨ぎ、empty/sparse data
- Calendar同日複数Session
- Previous/Next境界
- Compare対象不存在
- Mobile/Desktopでの基本操作
- 既存Frontend build/test

### 完了条件
Phase 5で追加した事実ベースの派生Domain Logicが既存画面から利用可能となり、Frontend固有の重複計算やMain Gym未確定状態でのWeight/Volume比較が導入されていないこと。

---

## English

### Prerequisite
Phase 0 through Phase 4 and Phase 5-A through 5-C must be completed and present on the current working branch.

### Objective
Integrate the derived domain logic added in Phase 5 into existing frontends while remaining within existing data/API contracts.

### Candidate Scope
Dashboard previous-month comparison for workouts/sessions and sets (not new Volume comparison before Main Gym); Workout Calendar; previous/next navigation; session compare; Analytics global period, frequency/consistency, body-part distribution/trend, machine frequency ranking, and sessions by gym.

### Implementation Principles
Frontend owns presentation/interaction and must not duplicate core domain calculations. Defer any feature requiring Weight/Volume comparability to Phase 6 or later. Do not guess navigation/comparison targets. Do not change API/data schemas. Exact wording, labels, layout, and visual treatment are intentionally not frozen: Codex should propose an implementation consistent with existing source/UI, followed by human visual review and adjustment.

### Validation
Verify no duplicate domain calculations, period/month/year boundaries, empty/sparse data, multiple sessions on one calendar day, previous/next boundaries, missing comparison targets, basic mobile/desktop operation, and existing frontend builds/tests.

### Completion Criteria
Existing screens consume the factual derived logic from Phase 5 without duplicating calculations or introducing Weight/Volume comparisons before Main Gym semantics are defined.