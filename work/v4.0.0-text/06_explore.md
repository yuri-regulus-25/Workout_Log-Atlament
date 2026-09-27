# Explore表示文言

対象source: `src/frontend/vesria/src/workspaces/Explore.tsx`、`src/frontend/vesria/src/workspaces/explore/`

## Discovery

- `05 / EXPLORE`
- `A little curiosity.`
- `これと、それ。まぜたら、どんな記録に出会える？`
- `Bobbleを見つける`（accessible name）
- `Bobble Type`（accessible name）
- Bobble type label: `Period`、`Machine`、`Gym`、`Body Part`
- `入れ替える`
- `A CHANCE ENCOUNTER`
- `気になるBobbleを選んでみて。`
- `{type}の候補`（accessible name）
- `このTypeのBobbleは、すべて選ばれています。別のTypeも見てみよう。`
- `このTypeにつながる記録はまだありません。`
- `YOUR MIXTURE`
- `{count}個のBobbleを組み合わせています`
- `まだ、なにも混ざっていません`
- `選んだBobbleをみる ({count})`
- `同じTypeは「どれか」、違うTypeは「どちらも」。組み合わせはいつでも解除できます。`

Status announcement:

- `{type}: {value}を選びました。`
- `Bobbleを解除しました。`
- `候補を入れ替えました。`

## Results

- `探索結果`（accessible name）
- `THE RECORDS YOU FOUND`
- `{count}件のセッション`
- `どんな記録に出会えるかな。`
- `{start}–{end} / {total}` / `0件`
- `{count}件のセッション。{page}ページ目。`
- `Bobble未選択。`
- `Bobbleを選んでみてね`
- `気になるデータを組み合わせると、セッションがここに現れます。`
- `一致するセッションがありません`
- `Bobbleの組み合わせを変えてみてください。`
- `{date} {gymName} のセッションを読む`（accessible name）
- `一部記録` / `記録`
- `{machineCount} machines · {setCount} sets`
- `読む ↗`
- `結果のページ`（accessible name）
- `前へ` / `次へ`
- `{current} / {pages}`

## Selected Bobble Graph

- `選んだBobble`
- `1回選ぶと説明。同じBobbleをもう一度選ぶと解除します。Bobbleは個別にドラッグ、余白をつかむとGraph全体を動かせます。`
- `選択条件のGraph`（accessible name）
- `このBobbleを解除`
- `どれが気になる？`
- `まだ選ばれていません`
- `Bobbleを選ぶと、その条件の意味を確認できます。`
- `閉じて、新しいBobbleに出会ってみましょう。`

## Session Detail

- `セッションの記録`
- `PARTIAL RECORD` / `SESSION`
- `{machineCount} machines · {setCount} sets`
- `セッションメモ`
- `参照情報が不明です（記録ID: {id}）。記録値はそのまま表示します。`
- Table: `Set`、`kg`、`Reps`、`RIR`
- `{machineName}のセット記録`（caption）
- `ウォームアップ`
- `限界まで実施`
- `Set {number}: {facts}`
- `Session ID: {sessionId}`

Bobble label、説明、候補値はworkout dataから動的に生成される。
