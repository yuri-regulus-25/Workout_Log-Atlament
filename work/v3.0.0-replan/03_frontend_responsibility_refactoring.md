# 画面実装の責務整理

## 1. 基礎方針

既存 `work/v3.0.0-aditional/XX_ui-component-responsibility-draft.md` の考え方を継承する。

画面はユーザーから見て意味のある領域から分解し、実装都合だけで境界を決めない。React、Vue.js、Angular、Svelte、SolidJSの実装方法を無理に統一しない。

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

## 5. 完了条件

- Pageを読めば画面構成を把握できる
- 個別Card/Dialogの修正箇所を局所的に特定できる
- Framework固有の自然な状態管理を維持している
- 同じ処理を複数Frameworkへ複製していない
- 既存Navigation、操作、Responsive挙動、API連携が維持されている
