# 共通表示文言

対象source: `src/frontend/vesria/src/App.tsx`、`src/frontend/vesria/src/ui/common.tsx`、`ReviewStatePreview.tsx`、`useEditorGuard.tsx`、`validationFeedback.tsx`

## Navigation / Shell

- `本文へ移動`
- `Overview`
- `Workout`
- `Machines`
- `Analysis`
- `Explore`
- `Resources`
- `Settings`
- `Review environment`
- `Connected workspace`
- `システム情報`
- `ナビゲーションを開く`
- `メニュー`
- `Global navigation` / `Mobile navigation`（accessible name）
- `VESRIA / {CURRENT WORKSPACE}`
- `● REVIEW DATA · 未保存の架空データ`
- `● LIVE`
- `● LIVE · FALLBACK / 読取のみ`
- `OBSERVED = CALM. CHANGING = FLUID. DISCOVERY = PLAYFUL.`
- `VESRIA / INITIAL STUDY`

Logo PlaygroundのNavigation文言は本一覧の対象外。

## System information

- `システム情報`
- `Vesria symbol`（画像alt）
- `記録を眺め、関係を見つけ、自分のリズムをつくる。`
- `Initial Human Review · 全体のVisual / UX / Motionを検討するための初回実装です。`
- `Review dataは架空・メモリー内のみ。医療判断や運動効果の診断は行いません。`

## Loading / Empty / Not Found

- `記録を読み込んでいます`
- `まだ記録がありません`
- `条件を変えるか、Workoutから最初の記録を追加してください。`
- `このページは見つかりません`
- `メニューから別の画面を開いてください。`
- `Overviewへ戻る`

## Data状態

- `再読込`
- `Settingsへ`
- `{count}件のデータ問題があります。一部の記録は除外されています。Settingsで同期状態を確認してください。`
- `参照不明・削除済みのマスターがあります。推測で補完せず「?」として表示します。`
- Repository / APIから返されたerror message

## Review Preview

- `REVIEW PREVIEW · 意図的な状態表示です。実データの異常ではありません。`
- `通常表示に戻る`
- `必須データを読み込めません。空の記録とは異なります。接続と同期状態を確認してください。`
- `LOCAL ERROR`
- `この表示を更新できません`
- `メニューと他の画面は引き続き利用できます。`

## Fatal / Error Boundary

- `LOCAL ERROR`
- `FATAL STATE`
- `表示を続けられません`
- `保存処理は再送されません。再読み込みして状態を確認してください。`
- `再読み込み`

## Dialog / Snackbar

- `閉じる`（Dialog close accessible name）
- `通知を閉じる`（Snackbar close accessible name）
- Snackbar本文は各操作またはRepositoryから渡されたmessage。

## 編集離脱保護

- `処理が終わるまでお待ちください`
- `変更を破棄しますか？`
- `変更を破棄`
- `結果を確認するまで、この画面を離れないでください。`
- `保存していない変更は失われます。編集を続ける場合は閉じてください。`
- `戻る`
- `編集を続ける`

## Validation共通

- `次の入力を確認してください。`
- Field label: `日付`、`Gym`、`マシン`、`重量（kg）`、`回数`、`メモ`、`マシン一覧`、`セット一覧`、`ID`、`名前`、`略称`、`旧ID`、`別名`、`利用状態`、`削除状態`、`Main Gym`、`部位`、`入力内容`
- Validation message本文は画面固有validationまたはRepository応答から渡される。
