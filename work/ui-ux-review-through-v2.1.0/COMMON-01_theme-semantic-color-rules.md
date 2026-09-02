# COMMON-01 ThemeとSemantic Color共通規則

## 概要

Light / Dark双方で同じ意味の情報が同じ強調度で認識できるよう、Primary Action、Loading、状態Badge、Alert、Icon等の色表現をTheme Tokenへ寄せる。

046〜057.mdで確認された共通指摘をまとめる。

## 基本原則

- 色を画面固有に直書きしない。
- Light / Darkで同じSemantic Roleを同じTheme Tokenから表現する。
- 状態識別を色だけへ依存しない。文言・Icon等も併用する。
- Darkで見えるからLightでも成立する、またはその逆、と判断しない。
- Light / Dark双方でContrastと意味の識別性を確認する。

## Primary Action

ユーザーが処理を進める主要ActionはThemeの `primary` を使用する。

対象として会話中に明示された例:

- `修復内容を確認`
- `修復を確定`
- Dialog Header上の `登録する`
- `作成`
- `解決する`

ただし、すべてのButtonを `primary` にする要求ではない。

次は役割に応じて別扱いとする。

- Navigation
- Cancel
- Reload
- Secondary Action
- Destructive Action
- `下書きを破棄`

## Loading / Progress

通常の「処理中」を表すLoadingはTheme `primary` を使用する。

対象:

- `v-progress-circular`
- `v-progress-linear`
- Button内Loading Indicator
- Page / Card単位のLoading Indicator

通常Loadingに独自の青色を持たせない。

Error / Warning / Success等、状態そのものを表す特殊Progressが将来存在する場合は、そのSemantic Roleに応じたTokenを使用する。

## Dark Themeで確認された問題

### Loading Indicator

Dark Overlay上でLoaderが背景へ沈み、処理中であることが判別しづらい。

Theme `primary` を使用するだけでなく、OverlayとのContrastが十分か確認する。

### Date Picker Icon

RecoveryのDate Inputで、Dark背景に対してCalendar Iconが黒く表示され、視認できない状態が確認された。

Icon ColorはTheme-awareにする。

### Alert

Warning / Success系 `v-alert` がDark背景と同化気味で、状態の識別が弱い。

FX-19のCompact化とは別に、Dark ThemeでBackground / Border / ForegroundのContrastを確保する。

### Select / Menu Surface

Dark DialogからSelectを開いた際、Menuが白く表示される問題が確認されている。

Menu Surface / Text / Selected / Hover / BorderをThemeへ追従させる。

## Light Themeで確認された問題

Recovery Field State Badgeで、`変更しました` と `復元できました` がほぼ同じ見た目になり、意味上の差が消える状態が確認された。

これはLight固有で顕著だが、Darkでも差が弱いためTheme共通問題として扱う。

## Recovery Field StateのSemantic Role

少なくとも次の意味は視覚的に区別する。

| 状態 | 意味 | 表現方向 |
|---|---|---|
| `変更しました` | Userが値を変更した | Warning系 |
| `復元できました` | Originalから安全に復元された | Info系 |
| `確認済み` | Userが確認した状態が存在する場合 | Success系 |
| `未解決` | Userの入力・判断が必要 | Error系 |

上表の具体的な色値を直書きしない。ThemeのSemantic Tokenを利用する。

文言を維持し、色だけで状態を識別させない。

## Badge / Count

Recovery一覧の件数Badgeや状態BadgeがLight / Dark双方で背景へ沈むことが確認された。

重要状態や件数は、背景とForeground双方で十分なContrastを持たせる。

## v-alertとの関係

`v-alert` は次の2軸を別々に満たす。

1. FX-19: 内部の縦幅をCompact化し、後続要素との間に `mb-4` を確保する。
2. COMMON-01: Light / Dark双方でSemantic ColorとContrastを成立させる。

Compact化のために視認性を犠牲にしない。

## 受入条件

1. Primary ActionがTheme `primary` を参照する。
2. 通常LoadingがTheme `primary` を参照する。
3. Dark Overlay上でLoaderを明確に認識できる。
4. Dark Date InputのCalendar Iconを認識できる。
5. Dark DialogのSelect MenuがLight Surfaceへ飛ばない。
6. `変更しました` と `復元できました` をLight / Dark双方で区別できる。
7. Stateの意味は文言でも判別できる。
8. 件数Badge・Draft Badge等が背景へ沈まない。
9. Semantic Colorを画面固有のHard-coded Colorへ依存させない。
