# v2.0.0 Phase 1-C — Workout Detail Presentation Improvements

## 日本語

### 目的
Workout Detail の「その日に何をしたか確認する」責務を維持したまま、既存Dataから導出可能なSummaryとSet表示を読みやすくする。

### 前提
Phase 0 完了後の Machine terminology を使用する。

### 対象
- Summaryに Total Reps を追加
- Machine Count表記・内部名称をPhase 0後のDomainに整合
- 既存Session/Gym表示を維持しつつSummaryの情報階層を整理
- Machine Card内のSet表示をTable化
- RIRの視覚優先度を下げる
- Performance Detailへの既存Navigationを分かりやすくする
- Machine Cardを折りたたみ可能にする（初期状態は展開）

### 対象外
- Previous / Next Workout Navigation
- Filter / Scroll状態復元
- Session Compare
- Previous Performance
- Weight / Reps / Volume Delta
- Calendar
- Main Gym
- 新規API Contract
- Workout Data schema変更

### 実装方針
Total Reps等は既存WorkoutSessionから単純導出可能な事実値のみ扱う。新しい比較・評価概念を追加しない。

Set Tableは Weight / Reps を主要情報とし、RIRは存在する場合のみ補助情報として扱う。既存Notesは維持する。

### Validation
- 1 / 複数Session
- 1 / 複数Gym
- Total Reps
- RIRあり / なし
- Machine Card展開 / 折りたたみ
- Performance Detail Navigation
- Notes維持
- 記録なし日付
- Desktop / mobile基本表示
- Vue build / test

### 完了条件
Workout Detailの事実確認が容易になり、比較・分析・新規Domain Logicへ責務を拡張していないこと。

---

## English

### Objective
Improve Workout Detail readability while preserving its responsibility: showing what was performed on the selected day.

### Prerequisite
Use post-Phase-0 Machine terminology.

### Scope
- Add Total Reps to the summary
- Align Machine Count labels/internal naming with the post-Phase-0 domain
- Improve summary information hierarchy while preserving session/gym presentation
- Convert set display inside Machine Cards to a table
- Reduce visual priority of RIR
- Clarify existing navigation to Performance Detail
- Allow Machine Cards to collapse, expanded by default

### Out of Scope
Previous/Next Workout navigation, filter/scroll restoration, Session Compare, previous performance, Weight/Reps/Volume deltas, Calendar, Main Gym, new API contracts, and Workout Data schema changes.

### Implementation Policy
Use only factual values directly derivable from existing WorkoutSession data. Do not introduce comparison or evaluation semantics.

Weight and Reps are primary Set Table information. Show RIR only when present and at lower visual priority. Preserve existing Notes.

### Validation
Cover single/multiple sessions, single/multiple gyms, Total Reps, RIR present/absent, card expand/collapse, Performance navigation, Notes, invalid/no-record dates, basic desktop/mobile rendering, and Vue build/tests.

### Completion Criteria
Workout Detail is easier to scan without expanding its responsibility into comparison, analysis, or new domain logic.