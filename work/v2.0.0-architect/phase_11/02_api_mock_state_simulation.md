# v2.0.0 Phase 11-C/D — API Mock & Application State Simulation

## 日本語

### 目的
実APIや実Dataを破壊せず、Frontendが通常遭遇しにくいResponse/Stateを確実に再現できるDeveloper Mock Layerを実装する。

### Mock Architecture
Developer Modeでは対象Scenarioに対して実localhost API Requestを発行せず、Frontend側Developer Mock Layerから疑似Response/Stateを返す。AFへ「必ず失敗するDeveloper API」を追加する方式を原則採用しない。

### Scenario候補
実API ContractとPhase 8/10 UIを再確認し、必要なものを実装する。
- Success
- Empty Data
- Partial Data
- Loading / delayed response
- Validation Error
- Authentication / Permission Error
- 404
- Conflict / Revision mismatch
- Rate Limit
- 500
- 503
- Timeout / Offline相当
- Credential Expired
- Setup Required
- DEGRADED / UNAVAILABLE
- Long text / large data等UI stress state

### 原則
- Mock Responseは実Contractのshape/semanticsに従う。
- Mock中に実Write APIを発行しない。
- Maintenance Write scenarioでもGitHub/Data SoTを変更しない。
- Scenario解除後は通常API Flowへ完全復帰する。
- API ErrorだけでなくEmpty/Loading/Partial等の描画状態も再現可能にする。

### 完了条件
主要Application Stateを安全かつ再現可能にSimulationでき、実API/GitHub/Master/Workout Dataへ副作用を発生させないこと。

---

## English
Implement a frontend-side Developer Mock Layer that reproduces hard-to-trigger API/application states without issuing the real localhost request for the selected scenario. Do not add intentionally failing developer endpoints to AF by default. Support representative success, empty, partial, loading/delay, validation/auth/permission, 404/conflict/rate-limit/500/503/timeout, credential/setup/lifecycle, and UI stress states based on actual contracts. Mock writes must never alter GitHub or data SoT. Removing a scenario must fully restore normal API flow.