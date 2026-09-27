# Vesria v4.0.0 — Human Review用Preview

現在までのVesria実装を、開発サーバーではなくビルド済みの状態で確認する手順。
正式リリース・Windows / Android配布用ビルドではない。
Logo Playgroundを含む現在の作業ツリーの内容が対象となる。未commitの変更もビルドに含まれる。

## 最短の起動手順（npm）

依存パッケージが導入済みの現在の作業環境で、PowerShellから実行する。

```powershell
cd C:\Users\guxtu\Documents\repos\Workout_Log-Atlament
npm run review:vesria
```

型チェック・ビルドが成功した後にPreviewサーバーが起動する。ブラウザーで以下を開く。

- Entry: http://127.0.0.1:5185/
- Overview: http://127.0.0.1:5185/overview
- Logo Playground: http://127.0.0.1:5185/logo-playground

Logo PlaygroundはVesria内のメニューからも開ける。現在は5パターンを140 / 115 / 45 / 34pxで比較できる。
停止するには、起動したターミナルで `Ctrl+C` を押す。

## ビルドと起動を別々に行う

```powershell
npm run build:vesria
npm run preview:vesria
```

- 出力先: `src/frontend/vesria/dist/`
- Previewは出力済みファイルを配信する。ソース変更の自動反映はない。
- 修正後はPreviewを停止し、再度 `npm run review:vesria` を実行する。
- 通常の開発サーバーは5184、今回のPreviewは5185。既存の開発サーバーと共存できる。
- 5185が使用中の場合は、別ポートへ自動移動せずエラーで停止する。
- ローカルPC限定の配信。Android実機からの接続や公開サーバーへの配置はこの手順の対象外。

## Reviewデータについて

起動直後は架空のReviewデータを使用するため、Backendの起動やGitHub接続は不要。
Reviewデータへの変更はメモリー内だけで、ページを再読込すると失われる。
実データへの永続保存を確認する手順ではない。今回のVisual確認ではLive接続へ切り替える必要はない。

## 開発中の確認・Logo単体の比較

変更を即時反映する開発サーバー:

```powershell
npm run dev:vesria
```

http://127.0.0.1:5184/

Vesriaの背景やナビを含めない、独立Logo Playground:

```powershell
npm run dev:logo -w @workout-lab/vesria
```

http://127.0.0.1:5188/

独立Logo Playgroundだけをビルドする場合:

```powershell
npm run build:logo -w @workout-lab/vesria
```

出力先は `src/frontend/vesria/logo-playground/dist/`。Vesria本体のPreviewとは別の成果物。
通常のHuman Reviewでは、最初の `npm run review:vesria` だけでよい。

## パッケージ管理と確認コマンド

上記のユーザー用コマンドはnpmで実行でき、内部でpnpmを呼ばない。
Repositoryの管理用packageManager指定とpnpm lockfileは変更していない。
既存環境のnode_modulesを削除したり、Previewのためだけに依存を入れ直したりする必要はない。
新規cloneでの依存導入手順・npm専用lockfileの整備は今回の対象外。

```powershell
npm run check:vesria
npm run test -- src/frontend/vesria
```

Agentの検証ではRepository方針に従いpnpmから同じscriptを呼び出す。
