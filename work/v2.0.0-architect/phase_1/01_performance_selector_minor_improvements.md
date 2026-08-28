# v2.0.0 Phase 1-A — Performance Detail Selector Minor Improvements

## 日本語

### 目的
Performance Detail の単一画面内で完結する軽微改善として、Machine Name Search と Body Part Filter を追加する。

### 前提
Phase 0 完了後の `Machine` terminology / schema を基準とする。Planning 内の `Exercise` 表記は旧名称として読み替える。

### 対象
- Performance Detail の Machine selector
- Machine Name Search
- Body Part Filter
- Search / Filter 結果と選択状態の整合
- Invalid Machine ID fallback の既存挙動維持

### 対象外
- Main Gym
- Weight / Volume 集計変更
- Chart 再設計
- Period selector / Moving Average
- History Table 再設計
- Set-level History
- Core の新規横断集計基盤
- API / Master / Workout Data schema 変更

### 実装方針
既存 Runtime Data と Machine Master から得られる Machine name / body_part のみを利用する。新規 API Contract や Data Model を追加しない。

Search と Body Part Filter は組み合わせて利用可能とし、選択中 Machine が Filter 条件から外れた場合の挙動を明確かつ予測可能にする。URL route による Machine selection と invalid ID fallback は壊さない。

### Validation
- Machine name 部分検索
- Body Part 単独 filter
- Search + Body Part 複合条件
- 0件時表示
- Filter変更時の選択状態
- 有効 / 無効 route parameter
- Desktop / mobile 基本表示
- Angular build / test

### 完了条件
Performance Detail 単一画面内で Machine を名称・Body Partから容易に絞り込め、既存 Navigation / Route / Data Contract に regression がないこと。

---

## English

### Objective
Add Machine Name Search and Body Part Filter as localized, low-impact improvements to the Performance Detail screen.

### Prerequisite
Use the post-Phase-0 `Machine` terminology and schema. Treat `Exercise` wording in older planning documents as legacy terminology.

### Scope
- Performance Detail Machine selector
- Machine Name Search
- Body Part Filter
- Selection consistency after search/filter changes
- Preserve existing invalid Machine ID fallback behavior

### Out of Scope
- Main Gym
- Weight / Volume aggregation changes
- Chart redesign
- Period selector / Moving Average
- History Table redesign
- Set-level History
- New cross-application Core aggregation infrastructure
- API / Master / Workout Data schema changes

### Implementation Policy
Use only Machine name and body_part already available from current Runtime Data / Machine Master. Do not add API contracts or data-model concepts.

Search and Body Part filters must work together. Define predictable behavior when the selected Machine is excluded by the active filters. Preserve route-based Machine selection and invalid-ID fallback.

### Validation
Test name search, Body Part filtering, combined conditions, zero-result state, selection changes, valid/invalid route parameters, basic desktop/mobile rendering, and Angular build/tests.

### Completion Criteria
Users can quickly narrow Machines by name and Body Part within Performance Detail without regressions to navigation, routing, or data contracts.