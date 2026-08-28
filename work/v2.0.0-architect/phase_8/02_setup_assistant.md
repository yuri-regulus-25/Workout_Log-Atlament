# v2.0.0 Phase 8-B — Setup Assistant

## 日本語

### 前提
Phase 8-AのReadiness Modelが利用可能であることを前提とする。

### 目的
Settings領域に初期Setupを支援するFlowを実装し、通常利用に必要な設定・接続・Data Validationを安全に完了できるようにする。

### Setup対象
Phase 8-Aで確定した必須Readiness条件のみをSetup対象とする。概念的にはRepository、Branch、Credential、Connection Test、Master/Data Validation等を扱う。

### Flow原則
- Setup完了条件はUIのStep完了数ではなくDomain Readinessで判定する。
- Connection Test / Validation結果を利用して次に必要な設定を案内できるようにする。
- 既に有効な設定を不必要に再入力させない。
- Setup中の入力・保存は既存Settings/AFの責務と整合させる。
- Main Gym設定を必須Stepにしない。Main Gym未設定でもSetup完了可能とする。
- Main Gymを設定する任意導線を設ける場合も、Skip可能であること。

### UI
Stepper等の具体的Presentation、Label、説明文、順序の細かなUXはPlanningで過度に固定しない。製造時に既存Settings UIとの整合を踏まえてCodexが初期案を作成し、人間が実画面レビューして調整する。

### 制約
- Portal Setup UIは対象外。
- 新規Application登録は対象外。
- Main Gym未設定を理由に通常Application利用を禁止しない。

### 完了条件
初期利用者が必須設定をSetup Flowから完了でき、Domain ReadinessによりREADYへ到達できること。Main Gymは任意Contextとして扱われること。

---

## English

### Prerequisite
Phase 8-A readiness model must be available.

### Objective
Implement a Settings-based initial Setup flow that safely completes configuration, connectivity, and data validation required for normal use.

### Scope
Only mandatory readiness conditions defined by Phase 8-A. Conceptually this may include repository, branch, credential, connection test, and master/data validation.

### Principles
Setup completion is determined by domain readiness, not by UI step count. Use connection/validation results to guide required actions, avoid unnecessary re-entry of already valid settings, and align persistence with existing Settings/AF responsibilities. Main Gym is never mandatory: setup may complete without it, and any optional Main Gym step must be skippable.

### UI
Exact stepper/presentation, labels, wording, and fine UX ordering are refined during implementation and human visual review.

### Constraints
No Portal setup UI or new-application registration. Do not block normal applications merely because Main Gym is unconfigured.

### Completion Criteria
Users can complete mandatory initial configuration through Setup and reach READY according to shared domain readiness while Main Gym remains optional.