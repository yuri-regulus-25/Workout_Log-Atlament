# Resources表示文言

対象source: `src/frontend/vesria/src/workspaces/Resources.tsx`

## List

- `06 / RESOURCES`
- `The things behind the records.`
- `マスターを整える。過去のワークアウト記録は書き換えません。`
- `＋ Machine追加` / `＋ Gym追加`
- `リソース種類`（accessible name）
- `Machines {count}` / `Gyms {count}`
- `M` / `G`
- `MAIN GYM` / `GYM`
- `削除済み` / `有効` / `無効`
- `{name}を編集`（accessible name）
- `編集 ↗`
- `削除は論理削除です。履歴の参照を保持し、新規利用の対象から外します。Main Gymは常に1件以下で、設定済みの場合は別のGymへ切り替えます。`

## Editor / confirmation

- `Machine 追加` / `Machine 編集`
- `Gym 追加` / `Gym 編集`
- `処理中…` / `内容を確認` / `保存する`
- `「{name}」の変更を保存しますか？`
- `ID: {id}`
- `有効` / `無効`
- `削除済み` / `未削除`
- `部位: {bodyPart}`
- `Main Gym: はい` / `Main Gym: いいえ`
- `旧ID: {ids}` / `旧ID: なし`
- `論理削除します。過去の記録自体は削除しません。`
- `マスターの検証が完了しました。`
- `接続先Repositoryへ書き込みます。`
- `レビュー用メモリー内だけを変更します。`
- `戻る`

## Input labels

- `ID`
- `名前`
- `部位`
- `略称`
- `Main Gym（他のGymから切り替え）`
- `旧ID / 参照の対応付け（カンマ区切り）`
- `別名（カンマ区切り）`
- `新しい記録で利用可能`
- `論理削除（解除で復元）`

## 固定validation / error

- `マスターがありません`
- `対象は最新マスターにありません`
- `IDを入力してください`
- `名前を入力してください`
- `同じIDまたは旧IDが他の項目で使われています`
- `部位を選択してください`
- `Main Gymは有効かつ未削除のGymにしてください`
- `Main Gymは1件だけ指定してください`
- `既存マスターに不正な項目があります。対象の項目を確認してください`
- `Main Gymは解除ではなく別のGymへ切り替えてください`

保存完了文言と追加errorはRepositoryから渡される。
