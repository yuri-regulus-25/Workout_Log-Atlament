# Workout Manager UI Copy / Component Contract

Related Issue: #138

本書はWorkout ManagerのUI表記・Component挙動・Maintenance共通Designとの接続を確定する。
`01_interaction_model.md` に残るUI Copy / Visual DetailのTBDは、本書の定義を優先する。

## 1. Application / Portal

- Application名 / 画面名：`Workout Manager`
- Navigation / Portal Icon：`mdi-square-edit-outline`
- Portal Pointer：`管理 - 履歴`
- Portal Description：`ワークアウト記録を操作します`
- Framework：`Vue.js + Vuetify`

## 2. Stepper

Vertical Stepperを使用する。
Subtitle / Step説明文は全Stepで表示しない。

| Step | Title |
| --- | --- |
| 1 | `操作するワークアウトの日付選択` |
| 2 | `操作内容` |
| 3 | `操作内容確認` |

Step 2に `ジム` / `セッション内容` 等の追加Section Headingは置かない。

## 3. Step 1 — Date

`v-date-picker`

- 項目名：`ワークアウト日`
- 初期表示月：画面アクセス時点の当月
- 初期選択：なし
- 選択後表示：`YYYY/MM/DD`
- placeholder：なし
- Date未選択時の `次へ`：disabled
- disabled時Tooltip：なし

Workout Marker取得失敗時：

- 画面操作は継続可能
- Snackbar：`ワークアウト情報の取得に失敗しました`
- Marker不在をWorkout不存在判定には使用しない

日付選択後のWorkout Session取得失敗時：

- Snackbar：`ワークアウトログの取得に失敗しました`

## 4. Step 2 — Session Selector

`v-select`

- label：`編集するセッション`
- 既存Session表示：`セッションx`（xは連番）
- Create option：`セッションを追加する`
- optionへのIcon付与なし
- 検索機能なし
- placeholderなし

Dirty状態でSessionを切り替える場合はMaintenance共通確認Dialogを使用する。

- title：`確認`
- body：`入力内容は破棄されます。<br />本当に切り替えますか？`
- Primary：`切り替える`
- Secondary：`戻る`

Dialog DesignはMaintenance共通とし、タイトルなしDialogは使用しない。

## 5. Gym Select

`v-select`

- label：`ジム`
- Required
- clearable：false
- placeholder：なし
- 検索 / 絞り込み：あり
- 検索対象：日本語名
- マッチ：部分一致
- 表示：日本語名のみ
- 候補順：日本語名昇順
- no-data-text：`マスターデータに存在しません`
- 画面からMaster Entryを新規登録する機能は提供しない
- `active: false` または `deleted: true` は候補から除外

## 6. Machine Select / Expansion Panel

### Machine Select

`v-select`

- label：`マシン`
- Required
- clearable：false
- placeholder：なし
- 検索 / 絞り込み：あり
- 検索対象：日本語名
- マッチ：部分一致
- 表示：日本語名のみ
- 候補順：日本語名昇順
- no-data-text：`マスターデータに存在しません`
- 画面からMaster Entryを新規登録する機能は提供しない
- `active: false` または `deleted: true` は候補から除外

同一Sessionで選択済みのMachineは候補には残すがdisabledとする。
選択済み候補は視覚的にも選択不可と分かる状態にし、次の表示を行う。

- `選択済`：`v-chip small mr-2`
- Chip Color：`red lighten-2` 相当
- Chip文字色：`red lighten-1` 相当
- 表示概念：`[選択済] (マシン名)`

Vuetify Version上 `lighten-*` を直接使用できない場合は、同等のTheme / Token表現へ読み替える。

### Expansion Panel Header

- Machine選択済み：日本語名のみ
- Machine未選択：`？`
- Validation IconのTooltip：なし
- Error件数表示：なし
- 未選択 / Not Validated / Pass時のHeader文字色：通常色
- Validation Fail時のみHeader文字色を赤系（Dark Themeでも視認可能な `red lighten-2` 相当）にする

Validation Iconは既存定義を維持する。

| State | Icon | Color |
| --- | --- | --- |
| Not Validated | `mdi-help-circle-outline` | Orange |
| Pass | `mdi-check-circle` | Green |
| Fail | `mdi-alert` | Red |

Machine追加直後は追加したExpansion Panelを自動展開する。自動スクロールは行わない。

## 7. Set Fields

### Reps

`v-text-field`

- label：`Reps`
- suffix：`reps`
- Required
- 整数のみ
- Range：`0 < x <= 100`
- counter：なし
- placeholder：なし

Validation Message：

- Required：`必須項目です`
- Range / Integer：`1以上の整数を入力してください`
- Upper Bound：`100以下の数値を入力してください`
- 数値として解釈不能な入力をValidationまで受け付ける場合：`数字を入力してください`

入力Component側でも可能な範囲で非数値入力を制限する。

### Weight

`v-text-field`

- label：`Weight`
- suffix：`kg`
- Required
- Range：`0 <= x <= 999.99`
- 小数点以下最大2桁
- counter：なし
- placeholder：なし

Validation Message：

- Required：`必須項目です`
- Negative：`0以上の数字を入力してください`
- Upper Bound：`999.99以下の数値を入力してください`
- 小数点以下3桁以上：`少数は2桁までです`
- 数値として解釈不能な入力をValidationまで受け付ける場合：`数字を入力してください`

`0 kg` は許容する。

### Set Notes

`v-textarea`

- label：`Notes`
- rows：2
- Nullable
- Maximum：400文字
- counter：400を表示
- placeholder：なし
- 400文字超過：`400字以内に入力してください`

## 8. Session Notes

`v-textarea`

- label：`Notes`
- rows：2
- Nullable
- Maximum：400文字
- counter：400を表示
- placeholder：なし
- 400文字超過：`400字以内に入力してください`

## 9. Common Input Rules

- 全Input Componentでplaceholderは使用しない
- Gym / Machine SelectはRequiredのためclearableにしない
- 数値Fieldにcounterは表示しない
- Notes系Textareaのみcounterを表示する
- Frontend / Server Validation Messageは同一文言を使用する
- Server Validation ErrorはFrontendで言い換えず、そのまま該当Componentへ表示する

## 10. Machine / Set Actions

Machine / Set Numberは `mdi-numeric-*-box-outline` のIconのみ表示し、`Set 1` 等のTextは付与しない。

Add：

- `mdi-plus-thick`
- Tooltipなし
- 上限到達時disabled
- disabled理由の補助表示なし
- 対象項目の直下に追加

Delete：

- `mdi-trash-can`
- Red
- Tooltipなし
- 最小件数到達時disabled
- disabled理由の補助表示なし
- 確認DialogなしでWorking Modelから即削除

Machine追加時の初期値：

- Machine：未選択
- Set：1件
- Reps：空
- Weight：空
- Notes：空

Set追加時の初期値：

- Reps：空
- Weight：空
- Notes：空

追加ModelはTemplateから `cloneDeep` 等で独立生成し、既存Machine / Setの値を引き継がない。

## 11. Step 2 Actions / Validation

`次へ` は全Validation Pass時のみenabledとする。

Validation NG時の `次へ` Tooltipは、Machine Expansion Panelが1つ以上展開されている場合のみ表示する。

- Panelが1つ以上Open + Validation NG：Tooltip表示
- Panelが1つ以上Open + Validation OK：Tooltipなし
- 全Panel Closed：Validation状態を問わずTooltipなし

Tooltip：

`入力された値に問題が1件以上あります。確認し、修正してください。`

これ以外の本画面固有Tooltipは原則使用しない。

既存Sessionの `削除` はExpansion Panelの開閉状態に依存せず表示する。
Step 2で `削除` を押しても確認Dialogは表示せず、Step 3へ遷移する。

Step 2 → Step 1の `戻る` にTooltip / Warningは付与しない。

## 12. Step 3 — Confirmation Display

Create / Update時はStep 2のlabel / suffixを確認表示でも共通利用する。

- Field Name：`cols=3` / Bold
- Value：`cols=9`
- suffixがある場合：Valueとsuffixの間に半角Spaceを1つ置く
  - `10 reps`
  - `25 kg`
- Select値：日本語表示名のみ
- Machine：日本語名のみ
- Set Number：Step 2と同一の `mdi-numeric-*-box-outline`
- Validation Icon：表示しない
- Nullable項目が未入力の場合：項目自体を非表示
- Session Notesも共通Confirmation Rowを使用する

## 13. Step 3 Alert

Alertは確認内容の最上部に配置する。

Common：

- `v-alert`
- dense相当
- `mb-4`

### Create / Update

- Color：Blue
- Icon：`mdi-information`
- Message：`編集内容を確認し、(ボタンlabel)を押してください`

結果：

- Create：`編集内容を確認し、登録するを押してください`
- Update：`編集内容を確認し、更新するを押してください`

### Delete

- Color：`Red Lighten-1` 相当
- Icon：`mdi-alert`
- Message：`このワークアウトログが削除されます<br />本当によろしいですか？`

`削除する` 押下後に追加確認Dialogは表示せず、そのままAPIを実行する。

## 14. API / Loading / Snackbar

API通信時は必ずMaintenance共通Loading Overlayを表示する。
Workout Manager独自のLoading UIは作成しない。

API完了時の共通順序：

1. Loading Overlay解除
2. Snackbar表示

Snackbarのtimeout / position / transition等はMaintenance共通仕様を使用する。

### Mutation Success

| Action | Message |
| --- | --- |
| Create | `ワークアウトログを登録しました` |
| Update | `ワークアウトログを更新しました` |
| Delete | `ワークアウトログを削除しました` |

### Mutation Failure

| Action | Message |
| --- | --- |
| Create | `ワークアウトログの登録に失敗しました` |
| Update | `ワークアウトログの更新に失敗しました` |
| Delete | `ワークアウトログの削除に失敗しました` |

Mutation Failure時はSnackbar以外の追加Alertを表示しない。
Step 2へ戻しWorking Modelを保持する。
項目単位のServer Validation Errorは該当Componentへそのまま反映する。

### Read Failure

| Target | Message |
| --- | --- |
| Workout Marker / Workout information | `ワークアウト情報の取得に失敗しました` |
| Date Session list | `ワークアウトログの取得に失敗しました` |

## 15. Maintenance Common Design

以下はMaintenanceの既存共通Design / Componentを再利用し、Workout Manager固有仕様を増やさない。

- Confirmation Dialog
- Loading Overlay
- Snackbar layout / timeout / transition
- Button Design
- Dense presentation
- Destructive Action
- Theme / Color Token
- Spacing

本書で明示した文言・Icon・Color・表示条件のみWorkout Manager固有Contractとする。
