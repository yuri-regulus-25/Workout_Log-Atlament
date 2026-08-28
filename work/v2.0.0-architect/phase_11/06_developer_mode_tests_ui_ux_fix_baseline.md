# v2.0.0 Phase 11-I/J — Developer Mode Tests & UI/UX FIX Baseline

## 日本語

### Developer Mode Safety Test
最低限以下を確認する。
- OFF時にMock Layerが介入しない。
- Scenario適用時に対象実APIを発行しない。
- Write SimulationがGitHub/Master/Workout Dataを変更しない。
- Scenario解除で通常API Flowへ戻る。
- Mode Exitで全Scenario/Interceptが解除される。
- Runtime再起動後に原則OFFとなる。
- 通常Portal/Drawer NavigationにDeveloper Modeが露出しない。
- Windows / Android / Development Runtimeで必要な安全性が成立する。

### UI/UX FIX Baseline
Human Review、Cross-App Fix、Responsive/Platform Review、Developer Mode Safety Testが完了した時点を **v2.0.0 UI/UX FIX** とする。

FIX後はRelease Blocking Issueを除き、UI/UXを無制限に再設計しない。後続工程ではこのBaselineを基準にFinal As-Is DocumentationとRelease Hardeningを行う。

### Documentation Decision
Phase 11でも最終 `docs/design` As-Is同期そのものは実施しない。UI/UX FIXを確定させることが本Phaseの終点であり、最終As-Is Documentationは後続工程でこのBaselineを参照して一度だけ実施する。

### Phase 11 Exit Condition
- Developer Modeが安全に利用可能
- 主要UI Stateを再現可能
- 全Application Human Review完了
- Cross-App / Responsive / Platform調整完了
- UI/UX FIX宣言可能
- Final As-Is Documentationは未実施

---

## English
Test Developer Mode safety: no interception while off, no real API request for mocked scenarios, no remote writes from write simulations, complete restoration after scenario/mode exit, default-off after restart, no exposure in normal Portal/Drawer navigation, and equivalent safety across runtimes.

After human review, cross-app fixes, responsive/platform review, and Developer Mode safety tests, declare the resulting state the **v2.0.0 UI/UX FIX baseline**. Avoid unlimited redesign afterward except release-blocking issues. Do not perform final `docs/design` As-Is synchronization in Phase 11; the next stage uses this fixed baseline for one final documentation synchronization and release hardening.