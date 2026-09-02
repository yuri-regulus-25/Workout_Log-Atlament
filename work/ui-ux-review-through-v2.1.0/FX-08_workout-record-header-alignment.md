# FX-08 Workout RecordヘッダーY軸整列

## 概要

Workout DomainのWorkout Record Tableで、`MACHINE NAMES` HeaderだけY軸方向にずれて見える状態を解消し、他Headerと同一基準へ揃える。

## 確認した現状

確認画像:

`Codex 画像 2026年9月2日 01_06_55.png`

Table Headerは次の列を持つ。

- DATE
- GYM
- MACHINES
- SETS
- VOLUME
- MACHINE NAMES

画像では `MACHINE NAMES` だけ他Headerより上側へ浮いて見える。

## 確定している要求

**HeaderのY軸位置を揃える。**

対象は見た目の整列のみ。

- 全Header Cellのvertical alignmentを統一する。
- padding / line-height等に差がある場合は、同一基準へ揃える。
- `MACHINE NAMES` のみ別Styleが適用されている場合は、その差異を解消する。

## 変更しないもの

この対応では次を変更しない。

- 列幅
- Columnの意味・順序
- Text省略仕様
- Table Data
- Sort仕様
- Pagination仕様

## Responsive要件

Desktop / Responsive表示の双方で、Header間のVertical Alignmentを同一基準とする。

ただしResponsive Tableそのものの再設計は本件の対象外。

## 受入条件

1. `MACHINE NAMES` Headerが他Headerと同じY軸基準へ揃う。
2. DATE / GYM / MACHINES / SETS / VOLUMEの既存位置を不必要に崩さない。
3. Headerのpadding / line-height / vertical alignmentが視覚的に統一される。
4. Table Dataや列幅等、無関係な仕様を変更しない。

## 位置づけ

純粋なUI整列修正。Correctness変更ではない。
