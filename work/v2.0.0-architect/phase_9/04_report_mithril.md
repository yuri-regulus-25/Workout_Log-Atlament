# v2.0.0 Phase 9-D — Report / Mithril

## 日本語

### 前提
Phase 9-Cまでが現在の作業Branchへ反映済みであることを前提とし、Phase 9共通Temporary Navigation Ruleを適用する。

### 目的
Phase 5/6のPeriod/Aggregate/Main Gym-aware Coreを利用してReport ApplicationをMithrilで実装する。

### 対象候補
最新DRAFTとAs-Isを再確認してWeekly / Monthly等のReport要件を確定する。
- Period Summary
- Training Frequency / Distribution
- Sets / Reps等の事実集計
- Main Gym Context適用済みのWeight/Volume系Metric

### 原則
- Report専用Domain計算をFrontendへ大量に再実装せず、workout-coreを利用する。
- Main Gym未設定時は依存MetricだけをUnavailableとして扱う。
- Report表示のためにWorkout Logを書き換えない。
- v2.0.0要件に存在しないExport/PDF/Share等を勝手に追加しない。

### Integration
Mithril package/build、Direct Route、Windows/Android/Development Runtime hostingを追加する。

### 完了条件
Reportが共通Coreの期間・集計結果を利用して動作し、Frontend独自の意味定義を増殖させず、全RuntimeでDirect Routeから利用可能であること。

---

## English

Implement Report with Mithril using shared period/aggregate/Main-Gym-aware core logic. Confirm the latest approved weekly/monthly report requirements before implementation. Avoid duplicating domain aggregation in the frontend, keep Main-Gym-dependent metrics locally unavailable when unconfigured, never rewrite workout logs, and do not invent export/PDF/share features outside v2.0.0 requirements. Integrate build/hosting/direct routes across all runtimes. Phase 9 temporary-navigation rules apply.