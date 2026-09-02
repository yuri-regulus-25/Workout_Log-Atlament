# FX-16〜FX-21 Resource Management UI整理

## この資料の位置づけ

039〜040.mdと参照画像群から整理したResource Management周辺の改善ポイントを記録する。

039.mdはユーザーが画像を提示し、Assistantが複数の改善候補へ分解したもの。040.mdの `v-alert` Compact化 + `mb-4` はユーザーから明示された要求である。

039.md内の各改善案は、後続で明示確定されていないものについては「改善候補」として扱い、実装時に勝手に仕様確定しない。

参照画像:

- `Codex 画像 2026年9月2日 01_11_53.png`
- `Codex 画像 2026年9月2日 01_12_02.png`
- `Codex 画像 2026年9月2日 01_12_10.png`
- `Codex 画像 2026年9月2日 01_12_20.png`
- `Codex 画像 2026年9月2日 01_12_28.png`

---

# FX-16 種別列の冗長表示

## 観測

画面上部でMaster種別を `ジム` / `マシン` 等から選択している状態でも、Table側に同じ種別情報が表示されている。

## 改善候補

上位UIですでに種別コンテキストが明確な場合、Tableの `種別` 列を削除して情報重複を減らす。

### 未確定

- 全表示モード等、種別列が必要なContextが存在するか。

Repository・現行画面状態を確認せず一律削除しないこと。

---

# FX-17 「影響」の数値が何を数えているか分からない

## 観測

`影響` の列・表示に数値だけが示され、単位や対象がUIから読み取りにくい。

例:

```text
影響
  1
```

## 要求の本体

**何を数えた数字なのかユーザーが理解できること。**

## 表示候補

- `影響するワークアウト`
- `影響件数`
- `参照数`
- 数値に `件` を付ける

どの名称が正しいかは、実際のCount定義をRepositoryで確認して決める。Countの意味を推測で命名しない。

---

# FX-18 Action Iconだけでは意味が伝わりにくい

## 観測

右端に `eye` / `link` / `plus` 等のIcon Actionが並ぶが、初見で各操作の正確な意味を判断しづらい。

## 要求の本体

- 各Actionの意味をユーザーが理解できること。
- Hoverだけを説明経路にしないこと。
- Windows / Android共通UIとして成立すること。
- accessible labelを持つこと。

## 改善候補

- DesktopではTooltipを補助として利用する。
- Touch環境でも意味が分かる表現を用意する。
- 必要なら短いText Actionへ置換する。

### 未確定

各Iconの正確なAction意味と、最終表示方式。

実装前に実Actionを確認する。

---

# FX-19 Resolve Dialog周辺の密度・Theme整合

## 1. `v-alert` の共通ルール

040.mdでユーザーから明示された要求。

### 確定要求

- `v-alert` は総じて縦幅をCompact化する。
- `v-alert` には原則 `class="mb-4"` を付与する。
- Alert内部の無駄な上下paddingを減らす。
- Alert後の次要素との意味的な余白は確保する。
- 1行Alertは特に低くする。
- 複数行の場合は内容量に応じて自然に伸びる。
- Windows / Android共通。

目的は「Alert自体は大きいのに、その直後のContentとは詰まって見える」状態を解消すること。

## 2. Select / Dropdown

039.mdの画像群では、Dark ThemeのDialog内でSelect Menuが白いSurfaceとして表示され、Themeが分断して見える。

### 改善候補

- Select Menuも現在Themeに従わせる。
- Dark ModeではDark Themeとして成立するSurface / Text / Hover / Selected表示にする。
- Select Field自体も必要以上に高くしない。

Theme Tokenの具体値は現行Design Systemを確認して使用する。

---

# FX-20 未解決参照Detail Tableの「行」列

## 観測

Detail Tableに `行` 列が存在するが、画像上では値が空の状態がある。

## 改善候補

- 表示対象すべてでline情報が存在しない場合、`行` 列自体を非表示にする。
- 一部にline情報が存在する場合の扱いは現行データを確認して決める。
- 不要な列を減らした分、Message等の主要情報へ幅を割り当てる。

Inspection上lineを安全に特定できる場合がある設計自体は否定しない。

---

# FX-21 新規作成Dialog Title

## 観測

例:

```text
新規作成 ジム
```

機械的な文字列連結に見え、Dialogの用途として読みづらい。

## 表示候補

```text
新規作成 - ジム情報
新規作成 - マシン情報
```

この候補はFX-22のDialog Header構造とも整合する。

### 未確定

最終Title文言は039〜045の範囲ではユーザーによる完全な文言Fixまではされていない。実装時は後続決定があればそれを優先する。

---

# 製造・UT時の確認

1. Master種別切替とTable列の情報重複を確認する。
2. `影響` Countの実定義をコード・APIから確認する。
3. Action Iconごとの正確なActionを確認する。
4. Touch環境でIcon Actionの意味確認・操作が成立することを確認する。
5. Dark ThemeでSelect MenuがThemeから浮かないことを確認する。
6. `v-alert` のCompact化と `mb-4` を対象Dialog群で確認する。
7. line情報なしケースで空列が無意味に残らないことを確認する。

## 重要な禁止事項

- Countの意味を推測してLabelを決めない。
- HoverだけをAction説明手段にしない。
- Dark Themeで固定白Surfaceを持ち込まない。
- `v-alert` をCompact化した結果、次要素との余白まで消さない。
