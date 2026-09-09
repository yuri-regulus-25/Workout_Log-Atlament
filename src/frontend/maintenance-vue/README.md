# Resource Management

Vue 3、TypeScript、VuetifyでResource Management画面を実装します。

## 責務

- ジム / マシンマスターの一覧、登録、更新、別名保存、論理削除
- ワークアウトデータに残る未解決マスター参照の確認と解決
- 壊れたリソースの一覧、Recovery用下書き、検証、GitHubへの反映操作
- AFのマスター書き込み / Recovery API結果に対応する読み込み中表示、ダイアログ、スナックバー表示

ワークアウト記録自体の編集、任意パスへの書き込み、汎用Git操作は行いません。マスター書き込みとRecoveryの正当性、リビジョン、競合、永続化はAFが所有し、このフロントエンドは公開契約を利用します。

## 開発起動

Repository直下で実行します。

```sh
pnpm run dev:maintenance
```

Gateway経由で確認する場合は `pnpm run watch` を実行し、`http://127.0.0.1:5173/maintenance/` を開きます。Resource Managementの開発Server固定Portは `127.0.0.1:5181` です。

## ビルド

```sh
pnpm run build
```

統合ビルドにより、本番成果物は `dist/maintenance/` に配置されます。
