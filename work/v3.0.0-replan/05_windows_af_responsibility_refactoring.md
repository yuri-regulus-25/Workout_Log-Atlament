# Windows Application Framework責務分離

## 1. 目的

Windows / C#側の巨大な実装単位を、意味のある責務境界へ再構成する。

特に `AfServices.cs` は重点調査対象とするが、「巨大だから分割する」のではなく、現在集約されている変更理由を識別して分離する。

## 2. 責務候補

現行実装確認時に少なくとも次を識別する。

- Applicationの調停
- Runtime構築
- Master Resource読込・Record解決
- Workout読込・集約
- Recovery Draft / Validation / Candidate生成 / Reflection
- GitHub読込
- GitHub書込
- 競合検出
- ローカル永続化
- JSON変換
- 設定読込
- エラー・警告分類

これはクラス一覧ではない。一つの責務を複数クラスへ割ることも、複数候補を一つのまとまりとして扱うことも、調査結果に基づき判断する。

## 3. HTTP境界

`AfHttpHost.cs` 等のHTTP受入口は、要求の受理、契約型への変換、Application処理の呼出、HTTP応答への変換を中心とする。

Runtime構築、GitHub書込、Recovery詳細等をHTTP層へ移さない。

## 4. 外部I/O

GitHub APIやファイルI/Oの技術詳細と、何を読み書きするかというApplication上の判断を可能な範囲で分離する。

ただし抽象化のための抽象化は行わない。試験差替え、依存方向、変更理由の分離に実益がある境界を採用する。

## 5. Recovery

Recoveryは既存の状態遷移、検証順序、競合分類、Reflection意味論を維持する。

Draft、Validation、Candidate生成、Repository書込等を分離する場合も、処理順序や失敗時の結果を変更しない。

## 6. Runtime

Master Record Isolation、Partial Acceptance、未解決参照、警告等を含む既存Runtime意味論を維持する。

v3.0.0の構造整理を理由に、Resource全体の失敗境界やRecord単位の除外規則を変更しない。

## 7. 完了条件

- `AfServices.cs` が複数の独立した変更理由を抱え続けていない
- HTTP、Runtime、Recovery、外部I/Oの境界を説明できる
- 依存方向を説明できる
- 既存Windows試験が維持される
- Platform共通契約をWindows固有実装へ閉じ込めていない
