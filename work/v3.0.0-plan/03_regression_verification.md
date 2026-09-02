# UI Refactoring Regression Verification

Related Issue: #137

## Goal
純粋UI Refactoring後も既存Applicationの機能意味論が変化していないことを確認する。

## Verification
- 主要画面の表示・操作・Navigation
- Validation/error semantics
- Runtime/API連携
- Responsive behavior
- Windows / Android parity
- Build / existing tests

新規機能追加でテストを通すのではなく、既存契約を維持してFix/Retestする。
