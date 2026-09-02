# FX-02 PortalのHover説明をTouch環境でも欠落させない

## 概要

Portal CardでHover時だけ表示される説明情報を、HoverできないTouch環境でも欠落させない。

同時に、Desktopで既に存在するHover Animationは残す。

## 確認した現状

確認画像:

`Codex 画像 2026年9月2日 00_56_43.png`

Analytics CardへHoverすると、通常表示に加えて次の説明が表示されている。

```text
分析 - 全体
```

この情報がHoverにのみ依存している場合、Android等のHoverできない環境では説明情報へ到達できない。

## ユーザーが明示した方針

Hover Animationは残す。

会話ではこれを「Roman」と表現し、UX改善を理由にDesktopのHover Animation自体を削除しない方針が確認された。

したがって要求は、

> **Hover Animationを殺すのではなく、Hover依存による情報欠落だけをなくす。**

である。

## 要求

### Hover可能な入力環境

- 現在のHover Animationを維持する。
- Hoverにより説明が表示される現在の体験を残す。

### Hoverできない入力環境

- 説明情報を操作前から参照可能にする。
- Hover相当のために「1回目のTapでは情報表示だけ、2回目でNavigation」のような二段階Tapを強制しない。

## 実装方向として会話で採用された案

Platform名ではなく入力Capabilityで分ける。

概念:

```text
Hover可能
→ Hover Animation維持
→ Hover時にdescription表示

Hover不可能
→ descriptionを常時表示
```

CSS Capability Queryの例として次が提示されている。

```css
@media (hover: hover) and (pointer: fine) {
  /* Hover Animation */
}

@media (hover: none), (pointer: coarse) {
  /* descriptionを常時表示 */
}
```

具体的なMedia Query条件は実装時に現在のCSS / Browser対応を確認すること。上記コードをそのまま確定実装とみなさない。

## Shared UI制約

- Portal Component自体をWindows / Androidで分割しない。
- `PortalWindows` / `PortalAndroid` のような専用画面を新設しない。
- 同じCard構造・情報モデルを使用する。
- 入力Capabilityに応じた表示差だけを許容する。

## 受入条件

1. Desktop等のHover可能環境で既存Hover Animationが維持される。
2. Hover可能環境では説明がHoverに連動して表示される。
3. Android等のHover不可環境でも同じ説明情報を常時確認できる。
4. Touch環境で説明を見るためだけの追加Tapを要求しない。
5. CardのNavigation能力はPlatform間で同じまま維持される。
6. Android専用Portalを新設しない。

## 位置づけ

Correctness blockerではなくShared UIの情報欠落改善。

実装Releaseはこの資料では確定しない。
