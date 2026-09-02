# FX-10 Performance Detail KPIラベル改行整理

## 概要

Performance DetailのKPI Card群で、`Main Gym Estimated 1RM` だけタイトルが2行になり、他Cardと縦方向のリズムが崩れて見える状態を整理する。

## 確認した現状

確認画像:

`Codex 画像 2026年9月2日 01_07_38.png`

KPI Cardは概ね次の並び。

```text
Latest
Main Gym Best Weight
Main Gym Estimated
1RM
Total Sets
Avg. Set Weight
```

`Main Gym Estimated 1RM` のみ2行表示となっている。

値 `53 kg` の表示位置や計算値に関するCorrectness問題は、この会話では指摘されていない。

問題はKPI Labelの改行による視覚的な不揃い。

## 確定している要求

- KPI Card群の中で `Main Gym Estimated 1RM` だけ不自然に2行になる状態を解消する。
- 他KPI Cardとの縦方向のリズムを揃える。
- 値や1RM計算仕様は変更しない。

## 会話中の修正候補

次の短縮案が提示されている。

```text
Main Gym Est. 1RM
```

ただし、これはAssistantが提示した**候補**であり、ユーザーが最終文言として確定した記録は `029.md` にはない。

そのため、この文言を確定仕様として固定しない。

## 修正方針の優先順位

会話上では、Card幅だけを変える、または当該Cardだけfont-sizeを小さくするより、KPI Label自体を簡潔にする方向が候補として提示されている。

ただし、具体的な最終文言は未決定。

## 受入条件

現時点で確定できる受入条件は次のとおり。

1. `Main Gym Estimated 1RM` 相当のKPI Labelだけが不自然な2行表示にならない。
2. KPI Card群のLabel / Valueの縦リズムが視覚的に揃う。
3. 1RM値および計算仕様を変更しない。
4. 他KPI Cardへ不要なLayout崩れを発生させない。
5. Windows / AndroidのShared UIで成立する。

## 未確定事項

**最終的なKPI Label文言。**

`Main Gym Est. 1RM` は候補の一つであり、確定ではない。

製造時に文言変更を伴う場合は、後続会話で確定した表記があればそれを優先する。後続でも確定していない場合は、勝手に文言を確定せず判断を上げる。

## 位置づけ

既存Performance DetailのUI整列・文言整理候補。Correctness問題ではない。
