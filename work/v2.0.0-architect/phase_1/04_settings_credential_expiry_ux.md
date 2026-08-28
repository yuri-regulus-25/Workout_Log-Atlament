# v2.0.0 Phase 1-D — Settings Credential Expiry UX

## 日本語

### 目的
既存Settings画面のCredential期限入力を、既存 `limitDate` Contractを維持したまま分かりやすくする。

### 現状と前提
現行Settingsは既にCredential statusを取得し、`limitDate`を保持・更新している。Impact AnalysisではCredential expiry UXはS判定であり、Preset追加を中心とする低Risk変更と評価されている。

### 対象
- Token LimitのPreset選択
- Custom選択時のみLimit Date入力を表示
- Preset選択時は期間と日付を二重入力させない
- 現在の期限 / Expired状態を既存Credential statusから明確に表示
- 既存Save処理との整合

Presetの具体値はGitHub側で実際に選択可能な期間・現行要件を確認して確定する。推測で値を追加しない。

### 対象外
- Setup Assistantへの同UI適用（Setup実装Phaseで同仕様を再利用する）
- Settings全体IA再編
- Advanced section再編
- Credential Delete等の他Credential改修
- Status / Version拡張
- Sync UI改修
- localhost API Contract拡張
- Native Credential Store変更

### 実装方針
AFへ送信する最終Contractは既存 `limitDate` を維持する。PresetはFrontend側で具体的なLimit Dateへ解決できる場合はFrontend内で完結させ、新しい永続化fieldを追加しない。

もし現行Contractだけでは正しく実現できないことが判明した場合、Phase 1の境界を越えてAPIを拡張せず、作業を停止して後続PhaseのDesign Decisionとして報告する。

### Validation
- 各Preset
- Custom
- Preset ↔ Custom切替
- 既存limitDate読込
- Expired / valid / missing
- Save後再読込
- 日付境界
- Solid build / test

### 完了条件
既存API/Native Contractを変更せず、Credential期限設定が直感的になり、既存 `limitDate` の保存・読込・期限判定を壊さないこと。

---

## English

### Objective
Improve Credential expiry input on the existing Settings screen while preserving the current `limitDate` contract.

### Current State / Prerequisite
Settings already loads Credential status and reads/writes `limitDate`. The Impact Analysis grades Credential expiry UX as S and identifies preset-based UX as a low-risk change.

### Scope
- Token Limit preset selector
- Show Limit Date input only for Custom
- Do not require both duration and date for presets
- Clearly present current expiry / Expired state from existing Credential status
- Preserve existing Save behavior

Confirm actual supported GitHub durations/current requirements before fixing preset values. Do not invent values.

### Out of Scope
Setup Assistant UI reuse (apply the same specification when Setup is implemented), Settings IA redesign, Advanced restructuring, other Credential features such as delete, Status/Version expansion, Sync UI changes, localhost API expansion, and Native Credential Store changes.

### Implementation Policy
Keep the final AF contract as existing `limitDate`. Resolve presets to a concrete Limit Date in the frontend when possible; do not add persisted fields solely for preset selection.

If the existing contract cannot support correct behavior, do not expand the API within Phase 1. Stop and report the issue as a design decision for a later phase.

### Validation
Cover every preset, Custom, switching between modes, loading an existing limitDate, expired/valid/missing states, save/reload, date boundaries, and Solid build/tests.

### Completion Criteria
Credential expiry configuration is easier to understand without changing API/native contracts or breaking existing `limitDate` persistence and expiry behavior.