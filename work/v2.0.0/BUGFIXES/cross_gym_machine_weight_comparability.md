# 既知問題 / BUGFIX候補: ジム・マシン差による重量比較可能性

## 重要度

**High / データ正確性・Architecture横断精査が必要**

## 状態

DashboardのPersonal Best候補をレビュー中に発見した既知問題。

すでにアブドミナルの実データで具体的な事象が発生している。同じ論理上のExerciseでも、利用するジムによって物理的なMachineが異なり、Machine上のWeight値をそのまま直接比較できるとは限らない。

本書では問題を記録することを目的とし、具体的な実装方式はv2.0.0の画面単位Discovery / Planningが一通り完了した後に決定する。

---

## 問題

Atlamentでは、論理上同一のExerciseとして記録されたWorkoutについて、実際には異なるMachineを使用していてもPerformance履歴として比較される可能性がある。

例:

```text
Gym A / Abdominal Machine A
40 kg x 10

Gym B / Abdominal Machine B
70 kg x 10
```

Machineに表示されるWeightが大きいことは、必ずしも実際のPerformanceが高いことを意味しない。

Machine間では例えば以下が異なり得る。

- Manufacturer / Model
- Pulley / Lever ratio
- Cam profile
- Range of motion
- Starting resistance
- Weight stackの校正・表示方式
- Seat / Pad / Movement geometry

したがって、`exercise + weight`だけでは常に正しい比較キーになるとは限らない。

---

## ユーザー影響

Application Errorを発生させず、もっともらしいが意味的には誤った結果を生成する可能性がある。

例:

- 誤ったPersonal Best / Personal Record判定
- 見かけ上の急激な重量Progression
- Previous Workout比較の誤判定
- Performance Chartの誤解を招く表示
- Volume比較の誤解を招く表示
- 将来Estimated Strength等を導入した場合の誤計算

Workout Recordそのものの値は正しいため、単純なParse ErrorではなくSilent Semantic / Data Correctness Problemとして扱う。

---

## 確認済みの具体例

異なるジムのMachineを利用したアブドミナルのWorkout Dataで、すでに本問題が発生している。

したがって、将来Featureを追加した場合だけ発生する仮説上の問題ではない。

---

## 全画面 / Coreへの影響

少なくとも以下を横断的に精査する必要がある。

- Workout Data Model
- Workout入力 / 記録Model
- Coreの集計・比較Logic
- Dashboard
- Performance Detail
- Analytics
- Workout Detail / 履歴比較
- 将来のPersonal Best / Achievement機能
- 将来のEstimated Strength系指標

Frontend Framework側でMachine比較可能性を独自判定しない。

比較可能性の判定および関連するDomain LogicはCoreの責務とする。

---

## 後続精査で決めること

現在のDashboardレビュー中には決定せず、画面単位Planning完了後に改めて検討する。

主な論点:

- Gym識別だけで十分か、Machine / Equipmentの明示的な識別が必要か
- Workout Data内でMachine identityをどう表現するか
- 異なるジムに存在する同一Machine Modelは比較可能とするか
- Free Weight ExerciseとMachine Exerciseをどう区別するか
- Cable / Plate-loaded / Selectorized Machine等の比較キーをどう扱うか
- Machine metadataを持たない既存履歴をどう扱うか
- Equipment不明のRecordは表示を維持しつつ、断定的な比較から除外するか
- Migration時に既存Workout Logをどう保持するか
- 現在のCore計算のうち、Weightの直接比較を前提としている箇所はどこか

---

## 暫定的なProduct制約

比較Semanticsが定義・実装されるまでは、Machineのraw Weightだけを根拠として複数Record間のAchievementを断定する機能を導入しない。

特にDashboardのPersonal Best / Personal Record機能を`exercise + weight`だけで実装しない。

---

## 次の対応

まず現在進行中のv2.0.0画面単位Planningを継続する。

その完了後に以下を行う。

1. 現在のData ModelとCore比較Logicを精査する
2. Machine比較可能性の影響を受ける画面・計算を洗い出す
3. 比較SemanticsとEquipment identity要件を定義する
4. Historical DataのMigration / Backward Compatibility方針を決定する
5. 必須Bugfixと将来のFeature / Data Model拡張を切り分ける
