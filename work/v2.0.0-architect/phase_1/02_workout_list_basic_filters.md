# v2.0.0 Phase 1-B — Workout List Basic Search / Filter / Sort

## 日本語

### 目的
Workout一覧の探索性を、単一画面・既存Runtime Dataの範囲で軽微に改善する。

### 前提
Phase 0 完了後の Machine terminology を使用する。現行一覧には既に Machine Filter が存在するため、これを基底として拡張する。

### 対象
- Search Text
- Machine Filter
- Body Part Filter
- Gym Filter
- Date Range Filter
- Filter Reset
- Newest / Oldest Sort
- Filter結果件数表示
- Empty Result表示

### 対象外
Phase 1 の Small Impact 境界を維持するため、以下は後続Phaseへ送る。

- URL QueryへのFilter状態反映
- 年/月Grouping
- Sticky Filter
- Pagination / Virtualized List
- Volume / Sets Sort
- Calendar View
- Detailとの状態復元 / Scroll復元
- Core横断Aggregate追加
- API / Data schema変更

### 実装方針
既存の読み込み済み WorkoutSession と Phase 0 後の Machine / body_part / gym / date 情報のみを使用する。検索・Filter・Sortのためだけにlocalhost APIを追加・拡張しない。

複数FilterはAND条件を基本とし、Resetで初期一覧へ確実に戻ること。Sortは事実値である日付のみをPhase 1対象とする。

### Validation
- 各Filter単独
- 複数Filter組合せ
- Search Textとの複合
- Date Range境界
- Newest / Oldest
- Reset
- 0件
- 同日複数Session
- Desktop / mobile基本表示
- Vue build / test

### 完了条件
Workout一覧で基本的な検索・絞り込み・日付Sortが単一画面内で完結し、API/Core/Data Modelへの新規依存を発生させないこと。

---

## English

### Objective
Improve Workout list discoverability with localized search, filtering, and sorting using existing Runtime Data only.

### Prerequisite
Use post-Phase-0 Machine terminology. Extend the existing Machine filter rather than replacing the list architecture.

### Scope
- Search Text
- Machine Filter
- Body Part Filter
- Gym Filter
- Date Range Filter
- Filter Reset
- Newest / Oldest Sort
- Filtered result count
- Empty Result state

### Out of Scope
To preserve the Phase 1 Small Impact boundary, defer URL query persistence, year/month grouping, sticky filters, pagination/virtualization, Volume/Sets sorting, Calendar View, detail/scroll restoration, cross-application Core aggregates, and API/data-schema changes.

### Implementation Policy
Use only loaded WorkoutSession data and post-Phase-0 Machine/body_part/gym/date fields. Do not extend localhost APIs solely for filtering.

Combine filters using AND semantics by default. Reset must reliably restore the initial list. Limit Phase 1 sorting to factual date ordering.

### Validation
Cover each filter, combined filters, text search combinations, date boundaries, Newest/Oldest sorting, reset, zero results, multiple sessions on one date, basic desktop/mobile rendering, and Vue build/tests.

### Completion Criteria
Basic Workout search/filter/date sorting works entirely within the list screen without introducing new API, Core aggregate, or Data Model dependencies.