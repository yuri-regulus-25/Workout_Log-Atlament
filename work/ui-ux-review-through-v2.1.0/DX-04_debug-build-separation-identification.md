# DX-04 Debugビルド分離とBuild識別

## 概要

Windows / Android双方で開発用BuildをRelease Buildから明確に分離し、現在起動しているものが開発用Buildであることをアプリ自身から確認できるようにする。

要求の中心は `npm run build:debug` による2 Platformの開発用Artifact生成と、Settings画面からのBuild識別である。

## 現在確認されている問題

Windowsでは現在 `dist-windows` に出力される成果物を開発・UTでも利用しているが、会話上ではこれはRelease Build相当であると認識されている。

そのため、Release成果物と開発用成果物の境界が曖昧であり、Git branchや成果物の置き場所等を確認しないと「今起動しているものが何版か」を判別しづらい。

DX-01〜DX-04に共通する問題は、Build種別・Platform・接続先・設定の境界が曖昧なため、人間が状態を頭の中で管理していることである。

## 確定している要求

### Debug Build Command

`npm run build:debug` を用意する。

このCommandからWindows / Android双方の開発用Artifactを生成できるようにする。

概念:

```text
npm run build:debug
├─ Windows Debug Artifact
└─ Android Debug Artifact
```

### Windows

- Release相当のWindows成果物を開発用Buildとして流用する状態をやめる。
- Windows Debug Buildを明示的に生成する。

### Android

- Android Debug Buildを生成する。
- DX-01の要求と連携し、通常利用版と開発・UT版を同一端末で共存可能にする。

### Build Identity

Windows / Android双方で、現在のBuildが開発用かRelease用かを識別できる状態にする。

Settings画面からBuild種別を確認可能にする。

ユーザーが提示した表示例:

```text
2.1.0-debug build
```

目的は、Git branch名や成果物の保存場所を確認しなくても、起動中アプリから開発Buildであることを判別できるようにすること。

### Release Build

Release Buildへ開発用Identityを混入させない。

## 会話中に提示された設計案

次は会話中に提示された設計案であり、内部表現として確定した仕様ではない。

```text
version = 2.1.0
buildVariant = debug
```

表示時のみ:

```text
2.1.0-debug build
```

とする。

この案ではProduct VersionとBuild Variantを別の情報として保持し、Debug BuildのためにVersion文字列そのものを書き換える処理をBuild Scriptへ埋め込まない。

将来Commit SHA等のBuild Metadataを追加できる余地も示されている。

### 注意

`2.1.0-debug build` をSemVerそのものとして扱うことは、会話上で決定されていない。

表示要求と内部Version Modelを混同しないこと。

## DX-01との関係

DX-01ではAndroid通常利用版と開発・UT版の共存が要求されている。

DX-04はその開発用Artifactを正式なDebug Buildとして生成し、Build Identityを可視化する要求に相当する。

両者を合わせた到達状態は次のとおり。

```text
Release Build
├─ Windows Release
└─ Android Release

Debug Build
├─ Windows Debug
└─ Android Debug
```

AndroidではRelease / Debugを同一端末で共存可能にする。

## 受入条件

少なくとも次を満たすこと。

1. `npm run build:debug` が存在する。
2. 1つのDebug Build CommandからWindows / Android双方の開発用Artifactを生成できる。
3. WindowsでRelease相当成果物を開発用Artifactとして流用しなくてよい。
4. Android Debug ArtifactがDX-01の共存要件を満たせる。
5. Windows / Android双方で現在のBuild種別を識別できる。
6. Settings画面から開発Buildであることを確認できる。
7. Release BuildにはDebug用Identityを混入させない。

## v2.1.0への適用判断

`008.md` では、Build Identity系は追跡対象コードに触れるため、Local Dev Scriptだけの改善とは分けて扱う方向が提示された。

さらに `009.md` では、開発UX改善全体について **v2.1.0ではOperationでCoverする** 方針がユーザーから示されている。

したがってDX-04は要求として保持するが、現時点でv2.1.0へ実装する確定事項とはしない。

## 未確定事項

- Product Version / Build Variantの内部データ構造。
- `2.1.0-debug build` の正確な表示形式。
- Build MetadataとしてCommit SHA等を表示するか。
- Windows / Androidの具体的なArtifact出力先。
- DX-01を含めた具体的なBuild設定。
- 対応Release。

これらは実装時のRepository調査・後続決定により確定する。
