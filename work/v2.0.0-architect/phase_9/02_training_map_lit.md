# v2.0.0 Phase 9-B — Training Map / Lit

## 日本語

### 前提
Phase 9-Aまでが現在の作業Branchへ反映済みであることを前提とし、Phase 9共通Temporary Navigation Ruleを適用する。

### 目的
Phase 0以降の実Machine/Body Part Domainを利用してTraining Map ApplicationをLitで実装する。

### Domain Rule
- Phase 0完了後の実Master Schema / workout-core / docs/designをSoTとする。
- 旧DRAFTの `Machine -> Exercise -> Body Part` 等を根拠にExercise Entity/Relationを復活させない。
- 実Schemaに存在しないMachine Physical EntityやRelationを勝手に追加しない。
- Body Part集計はPhase 5/6までに確立したCoreを優先利用し、FrontendへDomain計算を重複実装しない。

### 対象
- Training Map Application本体
- Body Part単位のTraining Distribution/状態表示
- Lit package/build integration
- Direct Route
- Windows / Android / Development Runtime hosting

### UI
Body Mapの具体表現、色、Tooltip、Interaction、Label等はPlanningで過度に固定しない。既存Dataで表現可能な事実を基準に製造し、人間が実画面レビューして調整する。

### 完了条件
Training MapがPhase 0以降のDomain Modelだけを使用して動作し、旧Exercise概念を再導入せず、全RuntimeでDirect Routeから利用可能であること。

---

## English

Use the actual post-Phase-0 Machine/Body Part domain and shared core to implement Training Map with Lit. Do not resurrect the removed Exercise entity/relation or invent physical-machine relations from obsolete drafts. Reuse shared aggregation logic rather than duplicating domain calculations in the frontend. Integrate Lit into build/hosting and verify direct-route operation across Windows, Android, and Development Runtime. Fine visual treatment is refined during implementation/human review. Phase 9 temporary-navigation rules apply.