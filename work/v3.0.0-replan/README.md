# v3.0.0 — Atlament包括的リファクタリング再計画

## 目的

v3.1.0以降の機能追加に先立ち、Atlament全体の責務境界、依存方向、実装配置、人間可読性を再構成する。

本版では、従来のv3.0.0計画で対象としていた画面構成の整理に加え、Windows側Application Framework、Android側Application Framework、共通契約、ソース保守方針、v2.1.0までに蓄積したUI・UX・開発UX・運用UXの改善要求まで対象を拡張する。

リファクタリングの目的はファイル数やクラス数を増やすことではない。変更理由の異なる責務を分離し、障害調査・機能修正・試験時に人間が追跡できる構造へ移行することである。同時に、既に確認済みのUI・UX上の問題を新構造へ持ち越さない。

## 参照資料

以下をv3.0.0の設計・要求資産として参照する。

- `work/v3.0.0-plan/`
- `work/v3.0.0-aditional/`
- `work/ui-ux-review-through-v2.1.0/`

UI・UXレビュー資料では、確定要求と改善候補・未確定事項を区別する。改善候補をv3.0.0へ含めることは、未確定の具体仕様まで自動的に確定することを意味しない。未確定事項は現行実装調査と人間判断を経て確定する。

MHTML等の画面資料は別途配置される。再計画文書ではファイル名や配置を固定しない。

## 対象範囲

- PortalおよびApplication Shellの再構成
- React / Vue.js / Angular / Svelte / SolidJS各画面の責務分離
- Pageを配置・構成中心の責務へ移行
- UI・UXレビューで確認済みの表示、導線、状態理解、操作性、レスポンシブ、テーマ対応の改善
- Recoveryを含む既存画面の情報設計改善。ただし既存の機能契約は維持する
- Windows / C# Application Frameworkの責務分離
- Android / Kotlin Application Frameworkの責務分離
- Runtime、Recovery、GitHub連携、永続化、検証等の境界整理
- Windows / Android / Shared間の契約と依存方向整理
- Android通常版と開発版の共存、開発用ビルド識別、実機起動、AF接続先解決等の開発UX改善
- 命名、コメント、試験、保守規約の明文化
- 既存機能、Runtime契約、API意味論、Platform間整合性の維持

## 対象外

- UI・UXレビューに根拠のない新規業務機能の追加
- 既存Runtime契約の意図的変更
- データ形式の意図的変更
- 再利用性のみを目的とした抽象化
- 将来利用するかもしれないことだけを理由とした共通化
- ファイル行数削減だけを目的とした分割
- UI・UXレビューで未確定の具体文言・表示方式・内部方式を推測で確定すること

## 最上位原則

1. 既存ファイルに関連コードが存在することは、そのファイルへ新しい責務を追加する根拠にならない。
2. 分割単位は変更理由、責務、依存関係、試験可能性から決める。
3. 既存挙動を推測で再実装しない。現行実装と試験から契約を確認する。
4. WindowsとAndroidで同じ意味を持つ契約は、実装方法が異なっても意味論を一致させる。
5. 既存コメントは保守対象とし、実装変更で不正確になる場合は削除ではなく更新する。
6. UI・UXレビューの確定要求はv3.0.0の製造要求として扱う。
7. UI・UXレビューの改善候補・未確定事項は勝手に確定せず、調査または人間判断を経る。
8. UI・UX改善を理由としてRuntime、Recovery、保存、検証等の既存契約を変更しない。
9. リファクタリング中にレビュー資料にない機能変更の必要性を発見した場合は混ぜず、別課題として記録する。

## 実施順序

`現状調査 → 契約・要求確認 → 責務境界設計 → 衝突確認 → 影響範囲確認 → 実装 → 試験 → 修正 → 再試験`

詳細は `10_implementation_sequence.md` を参照する。

## 文書構成

1. `01_refactoring_principles.md` — 全領域共通の原則
2. `02_current_architecture_investigation.md` — 現状調査と責務棚卸し
3. `03_frontend_responsibility_refactoring.md` — 画面実装の責務整理
4. `04_application_shell_and_portal.md` — Shell / Portal境界
5. `05_windows_af_responsibility_refactoring.md` — Windows / C#側
6. `06_android_af_responsibility_refactoring.md` — Android / Kotlin側
7. `07_shared_contract_and_dependency_direction.md` — 共通契約と依存方向
8. `08_comment_and_source_maintenance_policy.md` — コメント・ソース保守
9. `09_testing_and_regression_strategy.md` — 試験と回帰確認
10. `10_implementation_sequence.md` — 製造順序と停止条件
11. `11_ui_ux_review_integration.md` — UI・UXレビュー要求の統合
12. `12_development_ux_improvements.md` — 開発UX要求の統合
