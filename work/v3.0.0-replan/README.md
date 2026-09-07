# v3.0.0 — Atlament包括的リファクタリング再計画

## 目的

v3.1.0以降の機能追加に先立ち、Atlament全体の責務境界、依存方向、実装配置、人間可読性を再構成する。

本版では、従来のv3.0.0計画で対象としていた画面構成の整理に加え、Windows側Application Framework、Android側Application Framework、共通契約、ソース保守方針まで対象を拡張する。

リファクタリングの目的はファイル数やクラス数を増やすことではない。変更理由の異なる責務を分離し、障害調査・機能修正・試験時に人間が追跡できる構造へ移行することである。

## 参照資料

以下は既存の設計資産として参照する。

- `work/v3.0.0-plan/`
- `work/v3.0.0-aditional/`
- `work/v3.0.0-aditional/XX_ui-component-responsibility-draft.md`
- `work/v3.0.0-aditional/XX_application-shell-design.md`
- `work/v3.0.0-aditional/XX_portal_design_baseline.md`

MHTML等の画面資料は別途配置される。再計画文書ではファイル名や配置を固定しない。

## 対象範囲

- PortalおよびApplication Shellの再構成
- React / Vue.js / Angular / Svelte / SolidJS各画面の責務分離
- Pageを配置・構成中心の責務へ移行
- Windows / C# Application Frameworkの責務分離
- Android / Kotlin Application Frameworkの責務分離
- Runtime、Recovery、GitHub連携、永続化、検証等の境界整理
- Windows / Android / Shared間の契約と依存方向整理
- 命名、コメント、試験、保守規約の明文化
- 既存機能、Runtime契約、API意味論、Platform間整合性の維持

## 対象外

- v3.0.0を理由とした新規業務機能の追加
- 既存Runtime契約の意図的変更
- データ形式の意図的変更
- 再利用性のみを目的とした抽象化
- 将来利用するかもしれないことだけを理由とした共通化
- ファイル行数削減だけを目的とした分割

## 最上位原則

1. 既存ファイルに関連コードが存在することは、そのファイルへ新しい責務を追加する根拠にならない。
2. 分割単位は変更理由、責務、依存関係、試験可能性から決める。
3. 既存挙動を推測で再実装しない。現行実装と試験から契約を確認する。
4. WindowsとAndroidで同じ意味を持つ契約は、実装方法が異なっても意味論を一致させる。
5. 既存コメントは保守対象とし、実装変更で不正確になる場合は削除ではなく更新する。
6. リファクタリング中に機能変更の必要性を発見した場合は混ぜず、別課題として記録する。

## 実施順序

`現状調査 → 契約確認 → 責務境界設計 → 衝突確認 → 影響範囲確認 → 実装 → 試験 → 修正 → 再試験`

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
