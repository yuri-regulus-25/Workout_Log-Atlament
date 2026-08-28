# v2.0.0 Phase 9-C — Compare / Preact

## 日本語

### 前提
Phase 9-Bまでが現在の作業Branchへ反映済みであることを前提とし、Phase 9共通Temporary Navigation Ruleを適用する。

### 目的
Phase 5/6で確立した比較・期間・Main Gym-aware Domain Logicを利用してCompare ApplicationをPreactで実装する。

### 対象候補
最新DRAFTとAs-Is Coreを再確認して確定する。
- Session Compare
- Period Compare
- Machine構成 / Sets / Reps等の事実比較
- Main Gym Contextで比較可能なWeight / Volume Metric
- Previous Period等の共通Period Core

### Domain Rule
- Frontendへ比較計算を重複実装しない。
- 比較対象を一意に解決できない場合は推測しない。
- Gym/Machine comparabilityが成立しないWeight/Volumeを比較しない。
- Main Gym未設定でもCompare Application全体を利用不能にしない。Main Gym依存部分だけUnavailable/Not Configuredとする。
- PR / Best / Winner / Improved / Declined等の価値判断は、明示的に採用済みの要件がない限り追加しない。

### Integration
Preact package/build、Direct Route、Windows/Android/Development Runtime hostingを追加する。

### 完了条件
Compareが共有Domain Logicを利用して安全な比較のみを表示し、比較不能値を捏造せず、全RuntimeでDirect Routeから利用可能であること。

---

## English

Implement Compare with Preact using the shared comparison/period/Main-Gym-aware domain logic from Phase 5/6. Compare only facts that are semantically comparable; never guess targets or mix incompatible gym/machine weight/volume data. Main Gym absence disables only dependent metrics, not the entire app. Do not add winner/improvement judgments without approved requirements. Integrate build/hosting/direct routes across all runtimes. Phase 9 temporary-navigation rules apply.