# 現行構造調査

## 1. 目的

製造前に現行実装を逆向きに調査し、実際の責務、依存、契約、Platform差異を把握する。

本資料に記載する責務候補は分割先の確定仕様ではない。現行ソース確認前にファイル構成を固定しない。

## 2. 調査対象

### Frontend

- Portal
- Application Shell相当
- Dashboard / React
- Workout Domain / Vue.js
- Performance Detail / Angular
- Analytics / Svelte
- Settings等 / SolidJS
- 共通スタイル、設計トークン、共通データ処理

### Windows / C#

特に `AfServices.cs` を中心に、次の責務がどこに存在し、どこから呼ばれているかを調査する。

- Application起動・調停
- HTTP要求処理との接続
- Runtime構築
- Master読込・解決
- Workout読込・集約
- Recovery
- GitHub読込・書込
- 永続化
- 検証
- エラー・警告分類
- JSON変換
- 設定

`AfHttpHost.cs`、Contracts、Models、Tests等も含めて境界を確認する。

### Android / Kotlin

特に `AndroidLocalhostServer.kt` を中心に、Windowsと同じ意味論を担う処理とAndroid固有処理を識別する。

- HTTP受入口
- Runtime構築
- Master / Workout処理
- Recovery
- GitHub連携
- ローカル永続化
- Platform固有処理
- エラー・警告分類

## 3. 調査成果物

実装開始前に少なくとも次を説明できる状態にする。

1. 現行責務一覧
2. 各責務の主な入口
3. 主要な依存先
4. 共有契約
5. Windows / Androidの差異
6. 既存試験が固定している挙動
7. 分割時に破壊しやすい境界
8. 循環依存または暗黙依存
9. リファクタリングでは変更してはいけない意味論

## 4. 衝突確認

既存計画や設計文書と現行実装が一致しない場合、文書どおりに強行しない。

次を記録してから判断する。

- 文書上の想定
- 現行実装
- 既存試験
- Runtimeへの影響
- 採用する境界と理由

不明な挙動を推測して補完しない。
