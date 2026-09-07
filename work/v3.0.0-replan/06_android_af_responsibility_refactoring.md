# Android Application Framework責務分離

## 1. 目的

Android / Kotlin側を、Windowsと同じRuntime意味論を維持しつつ、Android固有実装とApplication責務が追跡可能な構造へ再構成する。

`AndroidLocalhostServer.kt` は重点調査対象とする。

## 2. 責務候補

- localhost HTTP受入口
- Application処理の調停
- Runtime構築
- Master / Workout処理
- Recovery
- GitHub読込・書込
- ローカル永続化
- 設定
- エラー・警告分類
- Android固有処理

候補をそのまま一対一でファイル化しない。現行依存と変更理由を確認して境界を決める。

## 3. Windowsとの関係

WindowsとAndroidで実装技術やPlatform APIが異なることは許容する。

一方、同じ契約として定義されている以下の意味論は一致させる。

- Runtime解決
- Master Record Isolation / Partial Acceptance
- 未解決参照
- Recoveryの結果分類
- GitHub競合時の意味
- Runtime警告
- 共有API契約

Windowsのファイル構成をKotlinへ機械的に複製しない。責務境界は揃え、実装構造はKotlin / Androidとして自然な形を採用する。

## 4. Platform固有処理

Androidのローカル保存、端末上のServer動作、その他Platform固有処理は共通契約と分離する。

Platform固有事情を共有層の契約へ逆流させない。

## 5. 完了条件

- `AndroidLocalhostServer.kt` がHTTP、Runtime、Recovery、GitHub、永続化等の詳細を一体で抱え続けていない
- Android固有責務を説明できる
- Windowsとの意味論上の一致点と実装上の差異を説明できる
- Android単体試験、整合性試験、Build、実機確認に必要な経路が維持される
