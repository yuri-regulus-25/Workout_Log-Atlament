# Workout表示文言

対象source: `src/frontend/vesria/src/workspaces/Workout.tsx`

## Heading / filters

- `02 / WORKOUT`
- `One session at a time.`
- `同じ日でも、セッションはそれぞれの記録。`
- `表示月`
- `全期間`
- `新しいセッションの日付`
- `セッション追加`

## List / detail

- `セッションが見つかりません`
- `一覧へ戻る`
- `PARTIAL RECORD` / `SESSION`
- `{machineCount} machines · {setCount} sets`
- `セッション詳細`（accessible name）
- `← 記録一覧へ`
- `SESSION DETAIL`
- `セッションを編集` / `セッションを削除`（accessible name）
- Table: `SET`、`kg`、`reps`
- `EVERY SESSION HAS A STORY`
- `記録をひとつ、開いてみる。`
- `一覧から記録を選択してください。`

## Editor Dialog

- Title: `セッション追加` / `セッション編集` / `セッション削除`
- `処理中…`
- `内容を確認`
- `保存する`
- `削除する`
- `記録の入力 · REVIEW DATA` / `記録の入力 · LIVE DATA`
- `内容の確認 · REVIEW DATA` / `内容の確認 · LIVE DATA`
- `{date} の記録を保存しますか？`
- `{date} の記録を削除しますか？`
- `{machineCount} machines / {setCount} sets`
- `{weight} kg × {reps} reps ({notes})`
- `このセッションの削除を実行します。`
- `入力内容の検証が完了しました。`
- `変更はレビュー用メモリー内のみです。`
- `接続先Repositoryへ書き込みます。`
- `編集へ戻る`

## Input labels / actions

- `日付`
- `Gym`
- `選択してください`
- `? {id}（既存参照を保持）`
- `Machine {number}`
- `除去`
- `Machineメモ`
- `kg`
- `reps`
- `メモ`
- `マシン{number} セット{number} 重量 kg`（accessible name）
- `マシン{number} セット{number} 回数`（accessible name）
- `セット{number}を除去`（accessible name）
- `＋ セット`
- `＋ Machine`
- `セッションメモ`

## 固定validation

- `最新の記録に対象セッションがありません`
- `日付を指定してください`

その他のerror、warning、保存完了文言はRepositoryまたは共通validationから渡される。
