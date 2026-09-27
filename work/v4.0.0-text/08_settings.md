# Settings表示文言

対象source: `src/frontend/vesria/src/workspaces/Settings.tsx`

## Heading / environment

- `07 / SETTINGS`
- `Make this space yours.`
- `Runtimeと接続を整える。画面の外側の仕組みは、ここに。`
- `ENVIRONMENT`
- `Review ↔ Reality`
- `レビュー用データは架空で、再読み込み時にリセットされます。実接続では既存Application Frameworkを使います。障害時にレビュー用データへ自動切り替えしません。`
- `Review data`
- `Live connection`
- `RUNTIME STATUS`
- `確認中…` / `要確認` / `未取得`
- `IN-MEMORY / NO PERSISTENCE`
- `LOCALHOST AF / COMPATIBILITY ADAPTER`
- `Fallbackデータを表示中。書き込み制限はAFが判断します。`
- `接続状態とデータ状態は独立して確認します。`
- `同期・状態を再確認`

## State review / motion

- `表示状態のレビュー`
- `状態`
- `通常表示`
- `Loading`
- `Empty`
- `Data Error`
- `Local Error`
- `Route Not Found`
- `Fatal State`
- `選択後、Overviewなど別のWorkspaceを開いて確認できます。`
- `Motion preference`
- `動きを抑える`
- `OSのReduced Motionも自動で尊重します。操作・情報は失われません。`

## Connection

- `CONNECTION`
- `Repository`
- `Owner`
- `Repository`
- `Branch / Ref`
- `Root path`
- `接続設定を確認する`
- `Credential`
- `状態: {credentialStatus} · Tokenは表示・保存しません。`
- `GitHub token`
- `有効期限（任意）`
- `認証情報を確認する`

## Confirmation / notifications

- `設定変更の確認`
- `更新中…` / `変更する`
- `{owner}/{repository} · {ref} に設定を変更します。`
- `入力したTokenをApplication Frameworkへ送信します。Tokenはブラウザーの永続ストレージには保存しません。`
- `設定を更新しました。同期して接続を確認してください。`
- `同期処理が終了しました。接続状態を確認してください。`

接続状態、readiness、credential status、errorはRuntime / Repositoryから動的に渡される。
