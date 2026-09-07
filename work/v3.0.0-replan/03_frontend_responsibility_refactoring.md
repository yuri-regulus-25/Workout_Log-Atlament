# 画面実装の責務整理

## 1. 基礎方針

既存 `work/v3.0.0-aditional/XX_ui-component-responsibility-draft.md` の考え方を継承する。加えて `work/ui-ux-review-through-v2.1.0/` のUI・UX要求を製造時の受入条件として照合する。

画面はユーザーから見て意味のある領域から分解し、実装都合だけで境界を決めない。React、Vue.js、Angular、Svelte、SolidJSの実装方法を無理に統一しない。

v3.0.0では構造整理とUI・UX改善を同時に行うが、責務分離のついでに未確定仕様を推測で決定しない。詳細は `11_ui_ux_review_integration.md` を参照する。

## 2. Pageの責務

Pageは配置・構成・主要Component呼出を中心とする。

Pageから移動する候補:

- Card固有表示
- Dialog内部
- 入力項目固有の表示・局所検証
- 独立したTable / Calendar / Chartのうち、十分な責務を持つもの

Pageへ残す候補:

- 画面全体の構成
- 領域間の調停
- 画面固有の最上位状態
- 子Componentへ渡すデータの組立て

Domain計算、Runtime契約、永続化責務を画面分割の都合で複製しない。

## 3. Component分割

原則として意味のあるCardやDialogは独立Component候補とする。ただし、同型Cardを値だけ変えて反復する場合は共通Componentを利用する。

一度しか使わないComponentでも、責務分離と探索範囲縮小に価値があれば許容する。

逆に、UI部品を一枚包むだけの汎用Wrapperや、責務を持たない中間Componentは作らない。

## 4. 状態と検証

UI固有の状態・表示条件・入力補助は局所化してよい。

ただし、最終検証、Domain上の制約、Server側契約をUIへ移動しない。既存の検証順序やエラー意味論も維持する。

Application Settings等では保存済み状態と未保存Form状態を区別し、画面上の状態表示が実際の永続化状態と矛盾しないことを確認する。

## 5. 共通UI責務

以下は画面ごとの場当たり対応ではなく、共通の意味規則として扱う。

- Theme / Semantic Color
- Loading Overlayの視認性と操作抑止
- Pagination件数ラベル
- Maintenance DialogのHeader構造
- Search TargetのReset配置とResponsive Grid
- Hoverに依存しない情報到達性
- Light / Dark双方の視認性
- Windows / Androidで同じ情報・能力を維持すること

具体要求と未確定事項は `11_ui_ux_review_integration.md` および元レビュー資料を参照する。

## 6. 完了条件

- Pageを読めば画面構成を把握できる
- 個別Card/Dialogの修正箇所を局所的に特定できる
- Framework固有の自然な状態管理を維持している
- 同じ処理を複数Frameworkへ複製していない
- 既存Navigation、操作、API連携が不必要に破壊されていない
- v3.0.0で採用したUI・UX改善要求が反映されている
- Light / Dark、Desktop / Narrow、Windows / Androidで必要な表示・操作確認が行われている
- 未確定だったレビュー項目を推測で仕様化していない
