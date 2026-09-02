# DX-03 AndroidアプリのCLI起動

## 概要

Android AppのProcessが異常終了した場合などに、実機を手で操作せずPC側のCommand Lineからアプリを起動できるようにする。

## 現在確認されている問題

Android AppのProcessが落ちた場合、再起動のために実機を操作する必要がある。

現在の操作は概ね次のような人手を要求する。

```text
スマートフォンを手に取る
↓
必要ならロック解除
↓
アプリを探す
↓
起動する
```

Android実機を継続的なUT Targetとして使用する場合、この人手操作が繰り返し発生する。

## 確定している要求

- Android AppをCommand Lineから起動可能にする。
- Process異常終了後も、再起動のためだけに実機操作を要求しない。
- v2.1.0 Data Recovery本体の機能追加として扱う必要はない。

## 会話中に提示された拡張案

次は実装候補であり、確定したCLI仕様ではない。

```text
Build
↓
Install
↓
Launch
↓
Port Forward
↓
Health確認
```

また、次のようなDev Command案も提示された。

```text
atlament-dev android start
atlament-dev android restart
atlament-dev android reinstall
```

これらのCommand名・処理範囲は現時点では確定していない。

## 受入条件

最低限、次を満たすこと。

1. ADB等のPCから利用可能な経路を用いてAndroid Appを起動できる。
2. App Processが停止している状態から、実機画面を操作せず再起動できる。
3. 既存のAndroid App動作そのものへ不要な変更を加えない。

## 今後の統合候補

DX-02ではPort ForwardやWindows / Android AFの接続先解決も開発Toolingとして整理されている。

将来的にBuild / Install / Launch / Port Forward / Health確認までまとめる余地はあるが、001〜005の会話ではそこまでを確定要求とはしていない。

まずは「実機操作なしでAndroid Appを起動できる」という要求を失わないことを優先する。
