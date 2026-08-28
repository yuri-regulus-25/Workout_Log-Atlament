# v2.0.0 Phase 4 — Existing Application Read Information Extension

## 日本語

### 前提
本Phaseは Phase 0〜Phase 3 が正常に完了し、その変更が現在の作業Branchへ反映済みであることを前提とする。先行Phase未完了状態へのBackward Compatibilityは要求しない。

### 目的
既存Applicationのv2.0.0改善に必要であり、現在のAF Read API Responseには存在しない情報について、必要最小限のRead情報を追加する。

Phase 3が既存情報のContract Refinementを担当するのに対し、本Phaseは「現在存在しない意味情報を新しく供給する」変更を担当する。

### 主対象
#### 1. Native Package Version
- Windows Package Version
- Android Package Version

既存のFrontend / AF Version情報と混同せず、Platform固有Package Versionとして明確に扱う。

#### 2. Component Status Extension
Phase 0-B / Phase 3完了後のStatus Contractを確認し、既存Applicationが必要とするにもかかわらず現在供給されていないComponent Stateがある場合のみ追加する。

候補例:
- GitHub connection/component state
- Runtime state
- Hosting state

既に既存fieldから同じ意味を取得可能な場合は追加しない。

#### 3. Last Successful Sync / Data Freshness
既存AFのSync処理から自然に取得・保持でき、軽量に提供可能な場合のみ追加する。

表示のためだけに新しい大規模永続化構造、履歴管理機構、Data Schemaを導入しない。自然に提供できない場合は本項をSkipする。

### Required Actionsの扱い
`required_actions`等の新Responseを安易に追加しない。

既存StatusからFrontendが「Credential更新が必要」等の案内を安全かつ一意に導出できる場合、案内責務はFrontendに置き、API追加を行わない。

AF側を判定SoTとする必要性が明確に確認された場合のみ、別途設計判断を行う。単にUI実装を簡単にする目的では追加しない。

### 対象外
- Setup Completion State / Setup Assistant
- Portal / Drawer
- 新規Application
- Data Explorer用Raw / Master Data Read API
- Main Gym Context
- Master / Workout Data Schema変更
- GitHub Write
- Master Data Maintenance
- Write API

これらは専用の後続Phaseで扱う。

### 実施方針
各候補について、まずPhase 0〜3完了後の実装を再確認する。

1. 既存Responseで表現可能か
2. Frontendで既存情報から安全に導出可能か
3. AFが既に情報を保持しているか
4. 新しい取得・計算・永続化が必要か
5. Windows / Android / Development Runtimeで同じ意味を提供可能か

新field追加は必要性を確認した項目に限定する。

### Validation
- Windows / Android / Development RuntimeのResponse Contract整合
- Settings等、対象Consumerでの表示・制御確認
- Missing / unavailable状態の扱い確認
- 既存Contractへのregression確認
- Frontend build/testおよびNative側の実行可能なtest/build
- `docs/design`への最終As-Is Contract反映

### 完了条件
既存Applicationが必要とする新しいRead情報だけが最小限追加され、重複情報・Frontendで安全に導出可能な情報・将来Application専用情報が不必要にAPIへ追加されていないこと。Platform間で意味とContractが整合していること。

---

## English

### Prerequisite
Phase 0 through Phase 3 must be completed and present on the current working branch. Backward compatibility with states before preceding phases is not required.

### Objective
Add the minimum new read information required by existing v2.0.0 applications when that information does not currently exist in AF Read API responses.

Phase 3 refines contracts for existing information; Phase 4 introduces genuinely new semantic information.

### Primary Scope
1. Native Package Version: Windows and Android package versions, clearly distinguished from existing Frontend/AF versions.
2. Component Status Extension: add only component states required by existing applications and not already represented after Phase 0-B/3, such as GitHub, Runtime, or Hosting state where actually missing.
3. Last Successful Sync / Data Freshness: add only when it can be naturally and cheaply obtained/retained by existing AF sync processing. Skip it rather than introduce substantial persistence or history infrastructure solely for display.

### Required Actions
Do not add `required_actions` or equivalent responses by default. When Frontend can safely and uniquely derive user guidance from existing status, keep presentation guidance in Frontend. Introduce AF-owned action decisions only after an explicit design decision demonstrates that AF must be the source of truth.

### Out of Scope
Setup completion/assistant, Portal/Drawer, new applications, Data Explorer raw/master APIs, Main Gym context, Master/Workout schema changes, GitHub Write, Master Data Maintenance, and write APIs.

### Execution Policy
Re-check the implementation after Phases 0–3. For each candidate determine whether existing responses already represent it, Frontend can derive it safely, AF already holds it, new acquisition/calculation/persistence is required, and Windows/Android/Development Runtime can provide the same semantics. Add fields only when necessity is confirmed.

### Validation
Verify contract semantics across Windows, Android, and Development Runtime; verify target consumers and missing/unavailable states; regression-test existing contracts; run applicable frontend/native builds and tests; and update `docs/design` with the final As-Is contract.

### Completion Criteria
Only genuinely required new read information for existing applications has been added. The API contains no unnecessary duplicate, safely frontend-derivable, or future-application-specific information, and contract semantics are aligned across platforms.