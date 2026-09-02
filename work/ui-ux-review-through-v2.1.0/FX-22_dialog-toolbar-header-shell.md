# FX-22 Dialog共通ShellをToolbar Header型へ統一

## 概要

Maintenance系Dialogを、下端Footerに「キャンセル / 作成」等のActionを置く構造から、Header Toolbar内へClose / Title / Primary Actionを集約する構造へ整理する。

参照:

- `Codex 画像 2026年9月2日 01_13_38.png` — 現行Atlament Dialog
- `Codex 画像 2026年9月2日 01_13_46.png` — 構図サンプル
- `さんぷるさん.html` — 参照HTML
- `Codex 画像 2026年9月2日 01_19_09.png` — Recovery Commit確認Dialog

## 目標構造

```text
┌────────────────────────────────────┐
│ × │ Dialog Title          │ Primary │
│ ────────────────────────────────── │
│                                    │
│ Body / Form / Alert / Table        │
│                                    │
└────────────────────────────────────┘
```

### Header

- 左端: Close Action
- 左〜中央: Dialog Title
- 右端: Primary Action
- Header下: Divider

### Body

- 現行AtlamentのForm / Contentを利用する。
- 不要な縦余白を抑える。
- Dialog用途に応じて必要な情報量を確保する。

### Footer

- Primary / Cancel Actionを置くためだけのFooter領域は原則廃止する。
- CloseはHeader左側に集約する。

## Primary Action文言例

会話中に提示された例:

```text
新規作成   → 登録する
編集       → 保存する
未解決参照 → 解決する
```

最終文言は各機能の既存用語・後続決定に合わせる。

Validation等により実行不能な場合はPrimary Actionをdisabledにする。

Primary Actionの色はThemeの `primary` を使用し、画面固有の青色を直書きしない。

## Recoveryへの具体適用

Recovery固有の確認・Commit契約は維持したまま、Commit確認Dialogにも共通Shellを適用する。

### 本文

現在の単純な縦積み文章ではなく、確認対象を短時間で走査できる情報Gridにする。

```text
対象データ    workouts/2026/08/2026-08-07.json
保存先        data/workouts/2026/08/2026-08-07.json
確認結果      修復できます
```

実装時の基準:

- `v-row dense` 相当のCompactな行構造。
- Label領域は概ね3、Value領域は概ね9の比率を基準とする。
- Pathは長くなるため折返し可能にする。
- 行間・上下Paddingを詰める。
- Primary Actionは `修復を確定`。
- Overlay中は背面Scroll / Pointer / Focus等のInteractionを許可しない。

3/9比率はこの確認Dialogの具体例として扱い、すべてのDialogへ機械的に強制しない。

## Recoveryについての境界

Recoveryはv2.1.0で固有の確認・Commitフローが設計済みである。

**Maintenance Dialogを共通化するという理由だけでRecovery固有フローを勝手に変更しない。**

共通Visual Patternを適用する場合も、Recoveryの契約・確認要件を維持する。

## 参照HTMLから採用するもの

043〜045.mdで明示された方針。

- Close / Title / Primary ActionをHeaderへ置く構図。
- Header下のDivider。
- Footer Actionを置かない情報構造。
- FormをCompactにする思想。

## 参照HTMLから採用しないもの

`さんぷるさん.html` はVue.js v2 + Vuetify v2由来である。

次をそのまま移植しない。

- Vuetify v2固有のDOM / class。
- `v-toolbar__content` 等のv2内部構造。
- `max-width: 600px`。
- サンプル固有の色。
- Light Theme。
- 個別Field仕様。
- 必須Chip等、今回のDialog Shell要求に無関係な部分。

## Dialog幅

サンプルの固定widthを採用しない。

Atlament側でDialog内容に応じた現行幅・Responsive設計を基準にする。情報量が多いDialogまで600pxへ固定しない。

## 実装指示

> **サンプルのコードを移植するのではなく、構図・情報構造を現行AtlamentのVuetify/APIで再構成する。**

現行VersionのComponent API、Theme Token、既存Shared Stylesを使用すること。

## 受入条件

1. 対象Maintenance Dialogの左上からCloseできる。
2. TitleがHeader内に表示される。
3. Primary ActionがHeader右端に存在する。
4. HeaderとBodyの境界がDivider等で明確である。
5. FooterにCancel / Primary Action用の不要な空間が残らない。
6. Narrow / Androidでも同じDialog Shellが成立する。
7. サンプルのVuetify v2 DOM/classをコピーしない。
8. Dialog Widthをサンプルの600pxへ固定しない。
9. Recovery等の固有契約を共通化の都合で破壊しない。
10. Recovery Commit確認Dialogでは対象データ・保存先・確認結果を構造化して表示する。
11. Primary ActionはTheme `primary` を参照する。

## 関連

- FX-19の `v-alert` Compact + `mb-4` 規則。
- FX-21のDialog Title改善候補。
- Common Theme規則。
