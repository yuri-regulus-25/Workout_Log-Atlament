# DX-02 Windows / Android同時開発時のAF接続先自動解決

## 概要

Windows AFとAndroid AFを同時稼働させる開発・UT環境で、人間がPort Forwardを付け外しして設定投入先を切り替える現在の運用を廃止する。

既存の1-port Auto Targetは維持したまま、2-target運用時にはWindows AFのProcessとListen Portを基準にWindows / Android双方の接続先を自動解決する。

## 現在の手作業

会話で確認された手順は次のとおり。

1. Android AppをInstallして起動する。
2. Android向けPort Forwardを設定する。
3. Windows AFを起動する。Primary Portが使用中であることを利用し、Windows側にSecondary Portを採用させる。
4. Androidへ設定を投入する。
5. Port Forwardを解除する。
6. Windowsへ設定を投入する。
7. Port Forwardを再設定する。

## 問題の本質

設定投入ツールが、同時に動いている複数AFを識別して明示的にTarget指定できない。

その結果、Port Forwardの有無を人間が変更し、既存のPrimary → Secondary fallbackを利用して投入先を切り替えている。

設定を1つ投入するために接続経路そのものを変更する必要があり、Windows / Androidの比較UTを繰り返す際の負担・操作ミス要因になっている。

## 既存機能に対する要求

**既存の1-port Auto Targetは残す。**

今回必要なのは既存方式の置換ではなく、Windows / Androidを同時利用する場合の2-target対応を追加すること。

## 2-target時の接続先解決要求

### Windows AFの識別

1. Windows AFのProcessを検索する。
2. 対象PIDが実際にLISTENしているAF候補Portを特定する。
3. Windows AFがPrimary / Secondaryのどちらを使用しているか判定する。

単に「Portが使用中か」だけで判断してはならない。

### Android側Portの決定

Windows AFが使用していないAF候補PortをAndroidのadb forward先として使用する。

概念:

```text
Windows AF Processを検出
        ↓
PIDがLISTENするAF候補Portを特定
        ↓
WindowsがPrimaryを使用？
   ├─ Yes → Windows = Primary / Android = Secondary
   └─ No  → Windows = Secondary / Android = Primary
```

### 不明Processによる競合

候補Portが使用中でも、そのProcessがWindows AFであると確認できない場合は自動推測しない。

**不明なProcessによるPort競合として停止する。**

別ProcessのPort占有をWindows AFと誤認し、消去法でAndroidへ誤ったPortを割り当てないこと。

## 共通Resolver

Port Forward、解除、設定投入で個別に異なる判定を実装せず、同一のAF Target解決ロジックを利用する。

対象として会話上明示されているもの:

- `portforward.ps1`
- Port Forward解除処理（会話中では `unlock` と呼称）
- Windows / Android 2-target設定投入

概念的な責務:

```text
AF Target Resolver
  ├─ Windows AF Process検出
  ├─ PID / Listen Port確認
  ├─ Windows Target決定
  ├─ Android Target決定
  └─ 不明競合時の停止
```

## Port Forward要求

### 設定

1. Windows AFを検出する。
2. Windows AFが使用している候補Portを特定する。
3. Androidに使用可能なもう一方の候補Portを決定する。
4. そのPortへadb forwardする。

### 解除

設定時と同じ解決規則を使用し、Androidへ割り当てたForwardを解除する。

Port Forward設定時と解除時でTarget解決規則を別実装にしない。

## 設定投入要求

Windows / Androidそれぞれに独立した設定JSONを持てるようにする。

同じJSONを2環境へ複製投入する要求ではない。

必要な状態:

```text
Windows用設定JSON
        ↓
解決されたWindows AFへ投入

Android用設定JSON
        ↓
解決されたAndroid AFへ投入
```

Windows / Androidで異なるbranchを利用するUTを扱えること。

個別Targetへの投入に加え、双方へ一括投入する経路を設ける場合も、それぞれのTargetに対応する独立JSONを使用する。

## 廃止したい手作業

2-target運用では、次のようなTarget切替を不要にする。

```text
Androidへ設定投入
↓
forward解除
↓
Windowsへ設定投入
↓
forward再設定
```

## 受入条件

少なくとも次を満たすこと。

1. 既存の1-port Auto Targetが引き続き利用できる。
2. Windows AF Processを特定できる。
3. Windows AFのPIDから実際のListen Portを判定できる。
4. WindowsがPrimary / Secondaryのどちらを使用しているか判定できる。
5. Androidへ残った候補Portを自動割当できる。
6. Windows / Androidそれぞれ別の設定JSONを使用できる。
7. Windows / Android双方へ設定するためにPort Forwardを手動解除・再設定する必要がない。
8. `portforward.ps1`、解除処理、設定投入が同じTarget解決規則を利用する。
9. 候補Portを不明Processが使用している場合、推測せず安全に停止する。
10. Windows / Androidで異なるGit branch設定を使用できる。

## 未確定・実装時確認事項

### Secondary Port番号

元会話ではSecondary Port番号をユーザー自身も記憶していないことが明示されている。

**番号を推測して資料へ固定しない。**

実装時にRepository上の現在の定義を確認して使用する。

### 具体的なScript構成

`AF Target Resolver` は会話中に提示された実装方向であり、具体的なファイル分割・関数名・CLI仕様までは確定していない。

既存Toolingを調査したうえで、上記の要求・受入条件を満たす最小構成を決定する。
