# 共通契約と依存方向

## 1. 目的

Windows、Android、Frontend、Shared間で「同じ意味」と「同じ実装」を混同しない。

共通化すべきものは契約と意味論であり、Platform固有実装まで一つに寄せることを目的としない。

## 2. 共通契約

調査時に次を棚卸しする。

- API要求・応答
- Runtime Model
- Master参照解決状態
- Runtime Warning
- Recovery状態・結果
- エラー分類
- Workout / Masterの共有型
- Version情報

同じ概念が複数箇所に定義されている場合、単純に一つへ統合する前に生成・配布・Platform制約を確認する。

## 3. 依存方向

上位の意味論がGitHub SDK、HTTP Server、Android API、特定Frontend Framework等へ直接依存しすぎない構造を目指す。

外部I/O実装は契約を利用し、契約側が外部I/Oの詳細を知る構造を避ける。

## 4. 整合性

Windows / Android間で同一契約を別実装する場合は、整合性試験で意味論を固定する。

単に同じ名称の型が存在することを整合性とはみなさない。入力に対する解決結果、警告、失敗分類まで確認する。

## 5. Sharedの肥大化防止

複数箇所から使われることだけを理由にSharedへ移動しない。

Sharedへ置く条件は、少なくとも次のいずれかを満たすこととする。

- 複数Platformで同一意味を持つ契約
- 複数画面で同一意味を持つDomain処理
- 製品全体の設計トークン等、明確に共有される資産

Platform固有の都合や単なる便利関数は原則として所有する領域へ残す。
