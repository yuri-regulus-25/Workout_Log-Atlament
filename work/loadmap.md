# MVP 完了までのロードマップ

## 目的

筋力トレーニングログを閲覧・分析する個人用 Web アプリの MVP 完了までに必要な作業を、人間が進捗確認しやすい形で整理する。

本プロジェクトは同時に Frontend Framework 比較 PoC でもある。

MPA 構成で、機能ドメインごとに異なる Framework を利用する。

```text
Dashboard              React
Workout History/Detail Vue 3
Machine Detail         Angular
Analytics              Svelte
```

共通原則:

- GitHub 上の JSON / JSONL を workout log の正本とする
- DB / Backend API / Auth は MVP 対象外
- UI Framework にビジネスロジックを持たせない
- `workout-types` / `workout-data` / `workout-core` / `design-tokens` を共通層とする
- 不明値は推測・自動補完しない

---

## 現在地

完了済み:

- 設計ドラフト作成
  - `00_overview.md`
  - `01_screens.md`
  - `02_technology.md`
  - `03_data_design.md`
  - `04_development_plan.md`
  - `05_data_validation_policy.md`
- Frontend Framework Spike / Foundation
  - React
  - Vue
  - Angular
  - Svelte
- MPA 統合の土台
- npm workspace 構成
- `workout-types`
- `workout-data`
- `workout-core`
- `design-tokens`
- JSON / JSONL loader
- core 集計関数
- unit test
- data validation 方針の初期反映
- `work/03_data_design.md` と `work/05_data_validation_policy.md` の整合
- Master データ導入
- `master/exercises.json`
- `master/gyms.json`
- Master 参照型 Raw Workout schema
- 実 Workout データ投入
- 実データ validation test
- 実データを各画面へ接続
- bundle 用 generated data module
- MPA production build 確認

これからの主作業:

- MVP 画面の完成度調整
- MPA 統合 / UX
- テスト仕様書
  - `work/work/UTS.md`
  - `work/work/ITS.md`
  - `work/work/STS.md`
- UT フェーズでの指摘反映

---

## Phase 1: Master データ方針の確定 — DONE

目的:

Workout 実データ migration 前に、Machine / Gym の参照元を固定する。

### 作業

1. DONE: Master 導入方針を確定する
   - `master/exercises.json`
   - `master/gyms.json`
   - Body Part Master は作らない

2. DONE: Raw / Normalized Model を確定する
   - Raw Workout は `gym_id` / `exercise_id` 参照型
   - `workout-data` が Master lookup して `WorkoutSession` へ normalize

3. DONE: `exercise_id` 命名規則を確定する
   - 推奨: 英語 kebab-case
   - 例: `pec-deck`, `lat-pulldown`, `hip-abduction`

4. DONE: `gym_id` 命名規則を確定する
   - 推奨: kebab-case
   - 例: `af-shioiri`, `af-akihabara`

5. DONE: `body_part` コード値を確定する
   - `chest`
   - `back`
   - `legs`
   - `shoulders`
   - `arms`
   - `glutes`
   - `core`
   - `cardio`
   - `other`

6. DONE: `aliases` の扱いを確定する
   - 初期は Machine Master 相当の `master/exercises.json` に保持
   - runtime 表示用ではなく migration / search / 表記揺れ解決用

### 完了条件

- Master 導入方針が決まっている
- `exercise_id` / `gym_id` / `body_part` のルールが決まっている
- `03_data_design.md` / `05_data_validation_policy.md` の更新方針が決まっている

---

## Phase 2: Master データ作成 — DONE

目的:

別チャットで作成した CSV をもとに、正式 Master JSON を作成する。

入力候補:

- `body_part.csv`
- `gym_data.csv`
- `workoutlog_exercise_names.csv`

### 作業

1. DONE: `workoutlog_exercise_names.csv` に `exercise_id` を割り当てる
2. DONE: `body_part` を日本語名からコード値へ変換する
3. DONE: `gym_data.csv` の `gym_id` を kebab-case に変換する
4. DONE: `master/exercises.json` を作成する
5. DONE: `master/gyms.json` を作成する
6. DONE: Master validation test を追加する
   - duplicate ID
   - required 欠落
   - invalid body_part
   - aliases の形式

### 完了条件

- `master/exercises.json` が存在する
- `master/gyms.json` が存在する
- Master を validation できる
- duplicate ID を検出できる
- Master を使って lookup できる

---

## Phase 3: Raw Workout schema への移行 — DONE

目的:

Workout 正本データを Master 参照型へ切り替える。

### 作業

1. DONE: `RawWorkoutSession` type を追加する
2. DONE: `RawWorkoutExercise` type を追加する
3. DONE: 既存 `WorkoutSession` は Normalized Model として維持する
4. DONE: loader を以下の流れに変更する

```text
Raw Workout JSON / JSONL
      ↓
Raw validation
      ↓
Master lookup
      ↓
WorkoutSession[]
```

5. DONE: 既存 sample data を Raw schema へ変更する
6. DONE: test を Raw / Normalized 前提へ更新する

### 完了条件

- Raw Workout が `gym_id` / `exercise_id` のみで記述できる
- `workout-data` が Master lookup 済みの `WorkoutSession[]` を返す
- `workout-core` と各 UI は Master 導入を意識しない
- test が通る

---

## Phase 4: 実データ migration 試験 — DONE

目的:

過去 Workout スクリーンショットから、実際に Workout JSON / JSONL を作れるか検証する。

### 作業

1. DONE: スクリーンショット由来の実データを投入する
   - まず 2〜3 日分
   - 可能なら同日複数 session を 1 例含める

2. DONE: スクリーンショットから読み取る
   - date
   - gym
   - machine
   - weight
   - reps
   - sets

3. DONE: 不明値は補完しない
   - RIR 不明なら `null` または省略
   - condition 不明なら省略
   - session 分割は人間が判断

4. DONE: `workouts/YYYY/MM/` に JSON / JSONL を作成する
5. DONE: validation test で読み込み確認する
6. DONE: 実データで core 集計結果を確認する

### 完了条件

- 実スクリーンショット由来の Workout JSON / JSONL が少量存在する
- validation issue なしで読み込める
- 同日複数 session の JSONL が扱える
- core 集計が壊れない

---

## Phase 5: 実データを UI へ接続 — DONE

目的:

各画面が sample data ではなく、実 Workout データを表示できるようにする。

### 作業

1. DONE: `loadSampleWorkoutSessions()` 依存を見直す
2. DONE: app 側から `workouts/` と `master/` を読み込む方式を決める
   - `scripts/generate-data-module.mjs` で browser bundle 用 module を生成する
   - `pretest` / `prebuild` で自動生成する
3. DONE: 各画面へ実データを接続する
   - Dashboard / React
   - Workout History / Vue
   - Workout Detail / Vue
   - Machine Detail / Angular
   - Analytics / Svelte
4. TODO: parse / validation issue の表示方針を決める
   - 製造中は test で検出する
   - UI 表示は Phase 7 / UT フェーズで扱う

### 完了条件

- 全画面が実 Workout データを参照している
- Master lookup 後の Normalized Model を使っている
- UI Framework 側に data normalization logic が漏れていない
- MPA build が通る

---

## Phase 6: MVP 画面調整

Status: NEXT

目的:

機能として最低限使える画面品質へ整える。

### Dashboard / React

必要要素:

- Monthly Summary
- Latest Workout
- Recent PR
- Recent Workouts
- Frequency visualization

完了条件:

- 今月の概要が分かる
- 直近の workout が分かる
- 最近の更新・記録候補が分かる

### Workout History / Vue

必要要素:

- Workout 一覧
- filter
- sort
- session detail への導線

完了条件:

- 日付軸で workout を探せる
- session の概要を一覧で確認できる
- 詳細画面へ遷移できる

### Workout Detail / Vue

必要要素:

- session 基本情報
- gym
- machines
- sets
- notes

完了条件:

- 1 session の内容を正確に読める
- machine detail へ移動できる

### Machine Detail / Angular

必要要素:

- Machine 基本情報
- Progress chart
- Machine history
- Workout detail への導線

完了条件:

- マシン単位で履歴と進捗を確認できる
- Dashboard / Workout Detail から直接到達できる

### Analytics / Svelte

必要要素:

- Monthly sessions
- Sets / volume trends
- Body Part summary
- Machine frequency
- PR trend

完了条件:

- 長期傾向をざっくり確認できる
- body part 別の偏りが見える
- volume / frequency の推移が見える

---

## Phase 7: MPA 統合 / UX

Status: IN PROGRESS

目的:

別 Framework で作られた各画面を、1つのアプリとして最低限自然に使える状態にする。

### 作業

1. Global Navigation を整える
   - DONE: Dashboard / Workouts / Analytics の横断ナビを各画面に追加
2. Framework 間の遷移を確認する
   - DONE: MPA smoke check で主要 path の HTML / asset 返却を確認
3. base path / deep link を確認する
   - DONE: Vue Router の `/workouts/` base path 配下の内部遷移を修正
   - DONE: `/workouts/:date` / `/exercises/:id` の preview fallback を確認
4. 404 を整える
   - DONE: MPA preview で戻り導線付き 404 page を返す
5. Loading / Error 表示を揃える
   - DONE: MVP 時点では静的生成データ前提のため、Loading は明示対象外
   - DONE: Not found / data validation は test / check / 404 で扱う
6. validation issue 表示を用意する
   - DONE: MVP 時点では UI 表示ではなく `npm test` / `npm run check:data` で検出する
7. responsive 表示を軽く確認する
   - DONE: 主要 layout の narrow width fallback を維持
   - TODO: 人間 UT で実機/ブラウザ幅確認
8. design token の最低限の統一感を確認する
   - DONE: 各 app の横断ナビを design token ベースの見た目に寄せる

### 完了条件

- `/dashboard/`
- `/workouts/`
- `/workouts/:date`
- `/exercises/:id`
- `/analytics/`

上記の主要導線が破綻なく使える。

---

## Phase 8: MVP 完了判定

Status: TODO

MVP 完了条件:

- 実 Workout データが JSON / JSONL として管理されている
- Master データで Gym / Machine を解決している
- `workout-data` が Raw data と Master を読み込み、`WorkoutSession[]` を返す
- `workout-core` が主要集計を提供している
- 全 Frontend Framework の画面が実データで動いている
- MPA として主要パスにアクセスできる
- validation issue を検出できる
- test / build が通る

最低限実行する確認:

```text
npm test
npm run check:data
npm run build
npm run preview:mpa
npm run check:all
```

ブラウザ確認:

```text
/
/dashboard/
/workouts/
/workouts/<date>
/exercises/<exercise_id>
/analytics/
```

---

## MVP ではやらないこと

以下は MVP 対象外。

- Authentication
- Database
- Backend API
- 複数ユーザー対応
- 商用利用対応
- Enterprise 要件
- 本格的な JSON Schema 導入
- Body Part Master
- Machine Type Master
- Gym Chain Master
- Calendar
- Body Measurements
- Personal Records 専用画面
- PWA
- Deployment platform 固定

必要性が実データ運用から見えた段階で追加検討する。

---

## 直近のおすすめ順

次にやるなら、この順番がよい。

1. Phase 6 の MVP 画面調整を進める
2. Phase 7 の MPA 統合 / UX を進める
3. UT フェーズで画面確認時の指摘をまとめて反映する
4. MVP 完了判定を行う

直近の山場は、実データ量に耐える最低限の画面品質と MPA 導線。

細かい見た目や操作感の違和感は UT フェーズでまとめて扱う。
