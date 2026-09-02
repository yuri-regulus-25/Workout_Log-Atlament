# FX-24 Recovery Detailの情報設計とTheme対応

## 概要

Recovery Detailについて、問題説明、Field状態、Validation、Raw Source、Theme対応を整理する。

049〜055.mdで確認された指摘を基礎とする。

## 1. 問題説明を人間向けにする

現状、問題セクションに次のような抽象・内部寄り表示が出ることが確認された。

```text
このデータを確認できません
Workout required fields are invalid.
対象: このデータ
```

ユーザーが必要なのは、

1. 何に問題があるか
2. どこを確認・修正すべきか
3. 必要なら内部診断情報

の順である。

### 要求

- Human-readable messageをPrimaryにする。
- 例として、日付が原因なら「日付に問題があります」のように対象を具体化する。
- 内部英語MessageやCodeは必要ならSecondaryへ落とす。
- `対象: このデータ` のように情報量のない表現をPrimary情報として残さない。
- Resource Path、Issue Code、内部Messageは診断用途として必要な場合に補助情報として表示する。

### 禁止

内部Code / 英語診断文をそのままユーザー向け説明の代替にしない。

## 2. 修復Fieldの密度

日付、コンディション、ジムID、マシン、メモ、形式バージョン、記録ID、状態等がすべて縦積みになり、画面が長いことが確認された。

Recovery Field自体を削除する要求ではない。

### 要求

- ユーザーが確認・修正する必要のあるFieldを中心に見せる。
- 正常に復元済みのFieldと、入力・確認が必要なFieldで情報密度を分ける。
- `形式バージョン` や `記録ID` 等、通常ユーザー判断が不要な値を主要操作領域と同じ強さで並べない。
- Field Card / Inputの縦Paddingを見直し、必要以上に画面を長くしない。

どのFieldを折りたたむ・Secondary化するかは049〜055.mdだけでは完全確定していないため、勝手に削除しない。

## 3. Field State Badge

`変更しました` と `復元できました` は意味が異なるが、特にLight Themeでほぼ同じ見た目になっていた。

### 意味

- `変更しました`: Userが元値から変更した。
- `復元できました`: Originalから安全に復元できた。
- `未解決`: Userの入力・判断が必要。
- `確認済み`: その状態が存在する場合、User確認済み。

### 要求

- StateごとにSemantic Roleを分ける。
- `変更しました` はWarning系、`復元できました` はInfo系を基準とする方向が会話で示された。
- `確認済み` が存在する場合はSuccess系、`未解決` はError系の方向。
- Light / Dark双方で識別可能にする。
- 色だけに依存せず文言も維持する。

具体色はTheme Tokenを使用し、Hard-coded Colorへしない。

## 4. Date Picker Icon

Dark ThemeでDate InputのCalendar Iconが黒くなり、背景へ消える状態が確認された。

Icon ColorをTheme-awareにする。

## 5. `v-alert`

Recovery Validation周辺のAlertがDark Themeで背景と同化気味で、さらに縦幅も大きい。

共通規則を適用する。

- FX-19: Compact化 + `mb-4`
- COMMON-01: Semantic Color / ContrastをLight・Dark双方で確保

## 6. Validation Resultの情報階層

Validation後、次の異なる意味の情報が同じAlert表現で連続する状態が確認された。

```text
内容が変更されたため、もう一度確認してください。
修復できます
保存場所が変更されます
```

意味はそれぞれ異なる。

- Validation stale: Action Required
- Validation result Healthy / Degraded: Result
- Path relocation: Important Warning

### 要求

Action Required / Result / Warningを同じ強さのAlertとして縦に並べない。

利用者が、

1. 今やるべきこと
2. Validation結果
3. 注意事項

を区別できる情報階層にする。

具体Component構成はこの資料だけでは確定しない。

## 7. Raw Source「元データ」

Raw Sourceは直接編集するための機能ではなく、修復判断に迷った場合に元ResourceをRead-onlyで確認する補助導線として位置づける。

### 残す理由

- 復元された値を元データと照合する。
- Broken箇所周辺を確認する。
- 自動抽出できなかった情報を人間が確認する。

### 要求

- 通常フローのPrimary Contentにしない。
- `元データを確認` 等のSecondaryな折りたたみ導線にする方向。
- 可能なら全文を大きく表示するよりIssue周辺を優先する。
- Read-onlyを維持する。
- Light / Dark双方でTheme-awareなSurfaceを使用する。

Raw Source機能そのものを削除することは049〜055.mdでは確定していない。

## 8. Draft破棄

`下書きを破棄` が主要Action領域で強く見え、Reload等と同列に見えることが指摘された。

Draft破棄はDestructive Actionである。

### 要求方向

- Primary Actionとして見せない。
- 明示的なDestructive Actionとして区別する。
- 実行時Confirmationを設ける方向が会話で示された。

具体配置は未確定。

## 9. Primary Action

Recoveryの次のActionはTheme `primary` を使用する。

- `修復内容を確認`
- `修復を確定`

`修復を確定` の横幅100%については問題として確定していない。変更対象は主に色・Semantic Roleである。

## 受入条件

1. IssueのPrimary説明が人間向けで具体的である。
2. 内部英語Message / Codeが主要説明を乗っ取らない。
3. User Actionが必要なFieldを短時間で識別できる。
4. `変更しました` と `復元できました` をLight / Dark双方で識別できる。
5. Dark Date Picker Iconが視認できる。
6. Validation stale / Result / Path Warningの意味が区別できる。
7. Raw SourceはRead-onlyかつSecondaryな補助導線として扱われる。
8. Raw Source SurfaceがLight / Darkへ追従する。
9. Draft破棄がPrimary Actionに見えない。
10. Validate / CommitのPrimary ActionがTheme `primary` を使用する。
