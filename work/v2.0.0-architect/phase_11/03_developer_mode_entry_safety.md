# v2.0.0 Phase 11-E — Developer Mode Entry / Exit & Safety

## 日本語

### 目的
Developer Modeが通常利用者の操作やProduction-like Data Flowへ誤って混入しないためのEntry/Exit/Safety Ruleを確定・実装する。

### Entry Requirement
具体的なEaster Egg操作は製造時に決定する。候補例としてVersion/Build表示への複数回操作、長押し、特定sequence等があるがPlanning時点では固定しない。

必須条件:
- 通常Navigationに表示しない。
- 偶発的に発火しにくい。
- 有効化時にDeveloper Modeであることを明示する。
- 明示的なExitを提供する。
- Runtime再起動後は原則OFF。

### Safety
- Developer Mode OFF時にMock intercept/stateが残存しない。
- Developer Mode中のWrite SimulationはRemote Writeしない。
- Mode stateとScenario stateを明確にReset可能にする。
- 通常Applicationへ戻った際にもDeveloper Mode有効中であることを必要に応じ視認可能にし、Mock状態を忘れたまま通常結果と誤認しにくくする。

### 完了条件
Developer Modeの誤起動・解除忘れ・Mock残存・Remote Writeを防止できるSafety Boundaryが成立すること。

---

## English
Finalize and implement safe Developer Mode entry/exit behavior. The exact easter-egg gesture is chosen during implementation review, but it must be absent from normal navigation, hard to trigger accidentally, visibly indicate activation, provide explicit exit, and normally reset off after runtime restart. Ensure no mock interception survives when off, simulated writes never reach remote persistence, and mode/scenario state can be fully reset.