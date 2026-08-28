# v2.0.0 Phase 5-C — Training Distribution Analytics Core

## 日本語

### 前提
Phase 0〜Phase 4および先行するPhase 5作業が現在の作業Branchへ反映済みであることを前提とする。

### 目的
既存Workout DataとMachine/Gym Masterから、Weight/Volumeの比較可能性に依存しないTraining Distribution系の派生集計を共通Coreへ実装する。

### 対象
#### Frequency / Consistency
- Sessions per Week
- Average Training Interval
- Weekday Distribution
- Monthly Training Days

#### Body Part
- Sets by Body Part
- Frequency by Body Part
- Body Part Share
- Body Part Trend
- Last Trained Date by Body Part

#### Machine / Gym
- Machine Performance Frequency Ranking（実施回数による事実Ranking）
- Sessions by Gym

### 制約
- Volume by Body Part/Gym/Machineを追加しない。
- Weight/Volume Improvementを評価しない。
- Streakや「良い/悪い」等の価値判断を導入しない。
- Main Gym Contextを導入しない。
- Moving Average / Max Volume SessionはMain Gym/Volume設計確定後へ送る。
- API/Data Schemaを変更しない。
- UI文言・視覚デザインは製造時および人間の画面レビューで調整する。

### 完了条件
既存Workout履歴から確定できるTraining Frequency、Body Part Distribution、Machine Frequency、Gym Session Distributionが共通Coreから再利用可能であり、重量比較に依存する評価が混入していないこと。

---

## English

### Prerequisite
Phase 0 through Phase 4 and preceding Phase 5 work must be present on the current working branch.

### Objective
Implement reusable training-distribution aggregates derived from existing Workout Data and Machine/Gym masters without depending on Weight/Volume comparability.

### Scope
Sessions/week, average interval, weekday distribution, monthly training days; body-part sets/frequency/share/trend/last-trained date; machine frequency ranking; sessions by gym.

### Constraints
Do not add volume-by-dimension, weight/volume improvement, streak/value judgments, or Main Gym context. Defer moving average and max-volume session until Main Gym/Volume semantics are defined. Do not change API/data schemas. UI wording/design is refined during implementation and human visual review.

### Completion Criteria
Reusable factual training-frequency and distribution analytics are available from shared core without introducing weight-comparison semantics.