# v2.0.0 Phase 6-C — Master Referential Integrity & Validation

## 日本語

### 前提
Phase 0〜Phase 5および先行Phase 6作業が現在の作業Branchへ反映済みであることを前提とする。

### 目的
Phase 7でWriteを許可する前に、Master DataのDomain/Referential Validationを共通Coreへ実装する。

### 対象
Phase 0後の実Master SchemaをSoTとして必要なValidationを確定する。

- Required Validation
- Type / Format Validation
- Unique Validation
- Referential Integrity
- Active Relation Validation
- Logical Delete Dependency Validation
- Main Gym Constraint Validation
- Whole Master Validation
- Pre-write / Pre-commitで再利用可能なValidation contract

### Domain Rule
- Inactive Relationを新規Relationとして選択・保存できない。
- Referential Integrityを壊すLogical Deleteを拒否可能にする。
- Main Gym Constraint違反を拒否する。
- ValidationはFrontend専用実装にしない。Phase 7のWrite側からも同じDomain Ruleを利用可能にする。

### 制約
- 実Schemaに存在しないRelationを想像してValidation対象にしない。
- Circular Reference等は実Relation上必要な場合のみ導入する。
- Write API/GitHub Writeそのものは本Phaseでは実装しない。

### 完了条件
Master DataのDomain/Referential Ruleが共通Validationとして利用でき、Phase 7のFrontend/Write処理双方が同じRuleを利用可能な状態であること。

---

## English

### Prerequisite
Phase 0 through Phase 5 and preceding Phase 6 work must be present on the current working branch.

### Objective
Implement shared domain/referential validation for master data before Phase 7 introduces writes.

### Scope
Required, type/format, uniqueness, referential integrity, active-relation, logical-delete dependency, Main Gym constraints, whole-master validation, and reusable pre-write/pre-commit validation contracts, based strictly on the actual post-Phase-0 schema.

### Domain Rules
Inactive relations cannot be newly selected/saved. Reject logical deletes that break referential integrity and reject Main Gym violations. Validation must be shared domain logic usable by both frontend and future write processing.

### Constraints
Do not invent relations absent from the actual schema. Add circular-reference checks only if real relations require them. Do not implement write APIs/GitHub writes yet.

### Completion Criteria
Shared validation is ready for reuse by both Maintenance frontend and Phase 7 write processing.