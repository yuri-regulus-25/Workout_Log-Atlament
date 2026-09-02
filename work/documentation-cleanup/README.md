# Documentation Cleanup

## Purpose

設計文書の本文を日本語中心に統一し、コード上の英語と説明文の不要な日英混在を分離する。

この作業では以下を区別する。

- **残す英語**: 型名、class/function名、API endpoint、error code、route、path、Git/GitHub固有語、Framework/Library/Product名、正式なDomain identifier。
- **日本語へ直す英語**: 一般説明文の `current behavior`、`user-facing`、`state`、`issue`、`boundary`、`behavior` 等。
- **初出で定義して併記する用語**: Source of Truth、Application Framework、Resource、Session、Recovery等。

用語の意味は `docs/design/glossary.md` を参照する。

## Writing Rules

1. 日本語の文中で一般名詞だけ英語に置換しない。
2. 1文の中で日本語と英語を頻繁に切り替えない。
3. コード上の識別子は改名せず、backtickで明示する。
4. 内部状態名を利用者向け資料へそのまま持ち込まない。
5. `Broken` / `Degraded` / `LKG` 等を利用者向けに説明する場合は機能的な日本語へ変換する。
6. 設計契約を日本語化するときに意味を変えない。
7. 過去のUT・調査・レビュー証跡は当時の記録なので、一括置換で改変しない。
8. File / directory pathはGitHub Mobile互換性のためASCII英語を原則とする。

## Preferred Vocabulary

| Mixed wording | Preferred prose |
|---|---|
| current / current behavior | 現行 / 現行挙動 |
| target | 目標仕様 / 対象 |
| user-facing | 利用者向け |
| state | 状態 |
| issue | 問題 / 警告事項 |
| boundary | 境界 |
| behavior | 挙動 |
| write | 書き込み / 保存 |
| read | 読み取り |
| validation | 検証 |
| persistence | 永続化 / 保存 |
| navigation | 画面遷移 / ナビゲーション |
| fallback | 代替利用 / フォールバック |
| available / unavailable | 利用可能 / 利用不可 |
| source | 元データ / 情報源（文脈依存） |
| display | 表示 |
| warning | 警告 / 注意事項 |
| error | エラー |

## User Documentation Boundary

利用者向け機能資料は `docs/user-guide/` に置く。

設計資料と利用者向け資料の責務を分ける。

```text
docs/design/      developer / design contract
docs/user-guide/  user-visible function and behavior guide
work/              planning / audit / evidence / temporary cleanup work
```

利用者向け資料では、実装方式より以下を優先する。

- その画面で何ができるか。
- 何が表示されるか。
- どの状態なら操作できるか。
- 問題が起きた場合に利用者がどう理解できるか。

## Initial Deliverables

- `docs/design/glossary.md`: 設計用語集。
- `docs/user-guide/application-guide.md`: 画面・機能ガイド。
- この文書: 本文日本語化の編集規則。

## Follow-up Cleanup

既存 `docs/design/` は一括機械置換しない。

今後ファイルを変更するとき、または文書単位のcleanupを行うときにこの規則へ寄せる。理由は、`Resource`、`Runtime`、`Recovery`、`Session`等にはAtlament固有の意味があり、単純な英日置換で設計契約を壊す可能性があるためである。
