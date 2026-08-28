# v2.0.0 Performance Detail 改修 DRAFT

## 状態

Performance Detailの一次候補をレビューし、v2.0.0での採用・統合・見送りを整理したDRAFT。

## 基本方針

Performance Detailは、選択したExerciseの履歴・推移・客観的な実績を分析する画面とする。

「Best」「PR」等、判定基準を一意に説明できない評価語は原則として使用しない。重量については客観的に定義可能な `Max Weight` を使用する。

また、GymごとにMachineが異なり同一Weight値を直接比較できない問題があるため、Weight / Volumeを用いる横断的な比較・集計は原則として**メインジムのデータに限定**する。

メインジム設定はSystem / Device側で管理する前提とし、Data Model・Core・Master Data更新機能との連携を別途設計する。

---

# 1. Exercise Selection

**状態: 採用 / 最小限**

追加する機能:

- Exercise Name Search
- Body Part Filter

以下は追加しない。

- Recently Viewed
- Recently Trained
- Sort
- Favorite

URL RouteによるExercise SelectionとInvalid ID Fallbackは現行実装を確認し、既に存在する場合は現状維持とする。

---

# 2. Performance Metrics

## 採用

- Total Sessions
- Total Reps
- Days Since Last Performed
- Max Session Volume
  - メインジム限定
- Total Volume
  - メインジム限定

Latest Weight / Reps、Previous Weight / Repsは採用しない。

代替候補として、最新Sessionの `Total Sets / Total Volume` を表示する案は実装時に再確認する。

## 見送り

- Best Set
- Average Reps / Set
- Average RIR
- Training Frequency
- First / Latest Record
- PR Count

`Best`という主観的・複合的な評価概念は導入しない。

---

# 3. Progress Comparison

**状態: 見送り**

Latest vs Previous、Period-over-period、Plateau判定等の比較機能はv2.0.0では実装しない。

---

# 4. Charts

**状態: 採用 / 再設計**

## 採用Metric

- Max Weight Trend
  - 現行Best Weight表記はMax Weightへ変更
  - メインジム限定
- Average Weight Trend
  - メインジム限定
- Session Volume Trend
  - メインジム限定

## 表示方式

Chartは `Merge / Single` の2モードを持つ。

### Merge

比較して意味のあるMetricを同一Chart上へ重ねて表示する。

第一候補:

- Max Weight
- Average Weight

滑らかなLine表現を候補とするが、実測点間に過度な意味を持たせないよう補間表現を調整する。

### Single

1 Metricを単独表示する。

Session VolumeはSingle表示を基本とする。

## 操作

- Metric Selector
- 固定Period Selector
- Moving Average
- Data Point Click / Tap → 元Workout Detailへ遷移

X軸ラベルは表示しない。日付・Metric名・値・UnitはTooltipで確認できるようにする。

## 見送り

- Max Reps Chart
- Estimated 1RM Chart
- Sets Chart
- RIR Chart
- PR Marker
- Zoom

---

# 5. History Table

**状態: 採用**

ExerciseごとのSession履歴をTable表示する。

表示項目:

- Date
- Gym
- Sets
- Max Weight
- Volume

`Best Weight`という名称は使用せず、Session内最大重量を示す `Max Weight` とする。

Max Weight / Volumeは各Sessionの事実値として表示する。異なるGym / Machine間の大小を評価する用途には使用しない。

## Sort

- Date
- Max Weight
- Volume

Sets Sortは追加しない。

## Period

Chartの固定Period Selectorと連動し、期間指定UIを重複させない。

## Navigation

Row Click / Tapで元Workout Detailへ遷移する。

## 見送り

- Max Reps
- RIR
- PR Indicator
- Pagination

Mobile Card Representation等のResponsive対応はCommon課題へ統合する。

---

# 6. Set-level History

**状態: 採用 / 軽量化**

独立した分析機能として肥大化させず、History Tableから必要なSessionの生Set記録を一時的に確認する補助機能とする。

- Session Row等から必要時のみ展開
- Weight
- Reps
- RIRは値が存在する場合のみ低い視覚優先度で表示

以下は追加しない。

- Best Set強調
- Previous SessionとのSet構成比較
- Set Volume等の追加分析

Workout DetailのSet Tableと同一機能に見えないよう、Performance側では「履歴の詳細確認」という役割を明確にする。

---

# 7. Personal Records

**状態: 大幅縮小**

## 採用

- Max Weight
  - メインジム限定
- Max Weight記録日

Session Volume Recordは#2のMax Session Volumeへ統合する。

## 見送り

- Max Reps at Weight
- Estimated 1RM
- Total Reps / Session Record
- PR History Timeline

Performance Detailでは `Best` / `PR` を汎用的な評価概念として使用しない。

---

# 8. Exercise Metadata

**状態: 画面表示は見送り**

以下をPerformance Detail上の追加Metadataとして表示しない。

- Body Part
- Exercise Nameの重複表示
- Machine / Category Metadata
- Aliases

Machine等の情報をData Model / Core内部で比較判定に利用することと、UI上へ表示することは分離する。

Aliases導入のためだけにData Modelを拡張しない。

---

# 9. UI / UX

## 採用

- Metric CardのInformation Hierarchy整理
- ChartとHistory間の視線移動・導線改善
- Empty Exercise State
  - `mdi-info` + 「ワークアウトデータがありません。」程度の簡潔な情報帯
- Tooltip改善
  - Date
  - Metric Name
  - Value
  - Unit
  - Merge時の各系列値

## 見送り

- Performance DetailだけHeroをCompact化
- Sticky Exercise Selector
- Sparse Data専用Chart表現

画面固有の特殊制御を増やさず、他画面との統一感を優先する。

Mobile Selector、Units / Decimal Rules、Skeleton Loading等はCommonへ統合する。

---

# 10. Accessibility

**状態: Commonへ統合**

Performance Detail固有Featureとして分離せず、全画面Accessibility改善の一部として扱う。

Performance Detail由来の観点:

- Chart Summary
- History Table Semantics
- Exercise Selector Keyboard Operation
- 状態・差分を色だけで表現しない
- Chart Tooltip / Data Pointの操作性

---

# 11. Core Domain Logic

**状態: 採用機能から逆算して追加**

必要候補:

- Total Sessions
- Total Reps
- Total Volume
- Days Since Last Performed
- Max Session Volume
- Max Weight
- Max Weight Record Date
- Average Weight Series
- Max Weight Series
- Session Volume Series
- Moving Average
- History Table用集計
- 固定PeriodによるFiltering
- メインジム制約を適用したPerformance集計

以下は追加しない。

- Exercise Previous Performance
- PR Resolver
- Best Set Resolver
- Estimated 1RM History
- Average RIR
- Period Comparison

Frontendは表示・UI State・Navigationを担当し、集計・系列生成・比較対象制約等はCoreへ配置する。

---

# 横断課題: メインジム / Machine比較

今回のPerformance Detail精査により、Weight / Volumeを正しく扱うために「メインジム」の概念が必要になった。

## 方針

- メインジム設定はSystem / Device側で管理する
- Weight / VolumeのPerformance比較・集計は原則メインジムに限定する
- 他Gymの履歴データ自体は失わない
- History TableではGymと生のWeight / Volumeを事実値として表示可能
- 異なるMachine間の値を単純に優劣比較しない

## 追加で必要となる検討

- System / Device側のメインジム設定
- Data Model見直し
- Machine / Gym識別情報の扱い
- Core APIへのメインジムContext受け渡し
- Master Data更新画面

Master Data更新画面は単なるSetting画面ではなく、Master Dataを整備・更新する独立機能として検討する。
