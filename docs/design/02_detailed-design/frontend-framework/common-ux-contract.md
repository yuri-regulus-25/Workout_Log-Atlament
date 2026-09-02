# 共通 UX 契約

本書は Frontend Framework に依存しない Atlament 共通の UX 契約を定義する。React / Vue / Angular / Svelte / Solid / Vanilla 等の実装方式は異なっても、利用者に見える意味・状態・操作規則は可能な限り統一する。

## Theme と Semantic Color

- Light / Dark の双方で同じ意味が成立すること。
- `primary`、`info`、`success`、`warning`、`error` 等の semantic token を使用し、Application が独自の固定色で意味を再定義しない。
- 色だけで状態や重要度を伝えない。label、icon、text 等を併用する。
- Theme の意味論と Theme の保存実装を分離する。`localStorage` や `data-theme` 等は実装方式であり、製品契約そのものではない。

## Responsive Layout

- 画面幅に応じて自然に再配置し、狭い画面へ Desktop layout を無理に押し込まない。
- 同種の filter / form / toolbar は Application 間で論理順序を揃える。
- Wide / Medium / Narrow の具体 breakpoint 値は共通 token または共通定義から参照し、各 Application が独立に意味の異なる breakpoint を発明しない。

## Dialog

標準 Dialog は、原則として以下の情報構造を持つ。

- 上部 toolbar / header
- 左側 close action
- title
- 右側 primary action（必要な場合）
- divider
- dense な content

Dialog 表示中は、背景の scroll、pointer interaction、意図しない focus 移動を抑止する。

破壊的 action は primary action と視覚的に混同しない。破棄・削除等は必要に応じ confirmation を設ける。

## Loading Overlay

- Loading 中であることを明確に表示する。
- spinner / progress indicator は Theme 上で十分な contrast を持ち、原則として `primary` semantic token を使用する。
- modal な Loading 中は背景操作と背景 scroll を抑止する。
- Loading 表示だけを行い、実際には背面 control が操作可能という状態を作らない。

## Primary Action

画面または Dialog の主要 action は `primary` semantic token を基準とする。

同じ重要度の action が複数並ぶ場合を除き、何を実行すれば処理が進むのかを視覚的に一意に理解できること。

## Reset

Search / Filter の Reset は、対象領域の header / toolbar 右側を基本配置とする。

Responsive layout で filter が複数段へ変化しても、Reset の意味と対象範囲を変えない。

## Pagination

件数表示 label は共通表現を使用する。現行レビューでは `Show Items` を共通候補として扱う。

0 件時に pager 自体を表示するかは別途確定するまで、Application ごとに独自仕様を増やさない。

## Hover / Touch / Accessibility

- Hover のみで重要情報や操作方法を提供しない。
- Touch 環境でも同等の情報へ到達できること。
- icon-only action は tooltip / accessible label 等で意味を説明可能にする。
- focus、keyboard operation、screen reader 向け label を Framework の標準機能に従って提供する。

## Navigation

Global Navigation の Application 順序・表示 metadata は Application Registry の単一 Source of Truth を参照する。

Desktop / Mobile で UI 実装が異なっても、Application の名称、順序、遷移先、利用可否の意味を独立定義しない。

## Error / Empty / Warning

以下を視覚的・意味的に混同しない。

- 正常な Empty / Initial state
- 未選択状態
- Warning を伴うが利用可能な状態
- Action が必要な状態
- 利用不能な Error state

内部 error code や path より、人間が理解できる具体的な説明と次の action を優先する。内部情報は必要に応じて secondary information として表示する。

## Framework 固有 Component

共通 UX 契約は Framework component の完全共有を要求しない。

各 Framework は標準的な component / accessibility mechanism を利用してよい。ただし、意味・状態・操作規則は本契約へ合わせる。再利用だけを目的とした過剰な抽象化は行わない。
