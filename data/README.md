# data

Workout Log Atlamentで扱うGitHub SoTデータ例を管理します。

このDirectoryはProduction Build Artifactではありません。Windows AFのProduction Runtimeでは、GitHub上のRepositoryから同期したRuntime Dataを実行Directory配下の `data/runtime/` に保存します。

## master

マスタデータを管理します。

```text
data/master/
├─ machines.json
└─ gyms.json
```

## workouts

ワークアウトログデータを管理します。

```text
data/workouts/
└─ <任意の階層>/<ファイル>.json
```

Windows AFのSettingsで `Root Path` に `data`、WORKOUT Resource Pathに `workouts/` を設定した場合、GitHub上では `data/workouts/` を取得します。

## Runtimeとの関係

- Repository上の `data/` はRaw Dataの例です。
- Windows AFはGitHubからRaw Dataを取得し、ValidationとMaster Resolveを行ったうえでRuntime Dataを生成します。
- 生成済みRuntime DataはWindows AF実行Directoryの `data/runtime/current/` に保存されます。
- Credentialや設定値はRepository上の `data/` では管理しません。

## 注意点

- STや実装作業で、設計外に実データを変更しません。
- Raw DataのValidation、Master Resolve、Runtime Data生成はWindows AF側で行います。
