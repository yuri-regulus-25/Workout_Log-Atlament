# FX-06 Search Targetの共通Reset配置とレスポンシブ規則

## 概要

Workout Domain / Performance Detailで使用しているSearch Target Cardについて、Resetを入力Gridから分離し、Card Header右端の共通Utility Actionとして配置する。

あわせて、Bodyは検索条件だけのResponsive Gridとして整理する。

## 確認した現状

確認画像:

- `Codex 画像 2026年9月2日 01_05_26.png`
- `Codex 画像 2026年9月2日 01_07_38.png`
- `Codex 画像 2026年9月2日 01_08_01.png`

### Workout Domain

現状は概ね次の配置。

```text
Keyword | Machine | Body Part | Gym
From    | To      | Reset
```

Resetが入力項目と同じGrid内に存在している。

### Performance Detail

現状は概ね次の配置。

```text
Machine Search | Body Part | Machine | Reset
```

Resetのために検索条件側の横幅が均等利用されていない。

## 問題

Resetは検索条件そのものではなく、Search Target Card全体を初期状態へ戻すUtility Actionである。

入力Grid内に置くと、入力項目の一つのように見えるうえ、画面幅ごとのGrid再配置にも巻き込まれる。

Workout Domain / Performance Detailで同じ意味を持つ操作なのに、各画面の入力項目数へ配置が依存する状態も避ける。

## 確定仕様

### Header

`Reset` を検索条件Gridから除外し、`検索対象` Card Headerの右端へ配置する。

```text
SEARCH TARGET
検索対象                                      Reset
```

- Reset機能そのものは変更しない。
- Header全体に作用するUtility Actionとして扱う。
- Desktop / Touchの双方で同じ意味的位置を維持する。

### Body

Bodyには検索条件だけを配置する。

#### Workout Domain — 広い画面

```text
Keyword | Machine | Body Part
Gym     | From    | To
```

**3列 × 2段**。

#### Performance Detail — 広い画面

```text
Machine Search | Body Part | Machine
```

**3列均等**。

## レスポンシブ規則

固定3列ではない。

画面幅に応じて列数を動的変更する。

基本イメージ:

```text
広い画面   → 3列
中間幅     → 2列
狭い画面   → 1列
```

入力項目の論理順序は維持する。

ResetはGrid外のHeader Actionであるため、Bodyの列数変化へ巻き込まない。

## 共通UI規則

この要求はWorkout Domain固有ではなく、同じSearch Target Cardパターンを持つ画面に適用する共通規則として扱う。

少なくとも会話上で明示された対象:

- Workout Domain
- Performance Detail

原則:

> Header = Card全体へのUtility Action
>
> Body = Search CriteriaだけのResponsive Grid

## 受入条件

1. Workout DomainのResetが検索条件Gridから外れる。
2. Performance DetailのResetが検索条件Gridから外れる。
3. Resetが `検索対象` Header右端へ配置される。
4. Resetの機能自体は従来どおり検索条件を初期化する。
5. Workout Domainは広い画面で3列×2段になる。
6. Performance Detailは広い画面で3列均等になる。
7. 画面幅に応じてGrid列数が動的に変わる。
8. 画面幅が変わっても入力項目の論理順序を維持する。
9. Windows / Androidで同じSearch Target Component / Visual Languageを維持する。
10. Android専用画面を追加しない。

## 不要な変更

- Resetの機能仕様変更
- PlatformごとのSearch Target画面分離
- 固定的なAndroid専用配置

## 位置づけ

既存UIの共通レイアウト改善。

`023.md` の「Card右端」案は `024.md` で更新され、最終的に **Search Target Header右端** が要求となった。さらに `029.md`〜`030.md` でWorkout Domain / Performance Detail共通規則およびResponsive Gridまで拡張された。
