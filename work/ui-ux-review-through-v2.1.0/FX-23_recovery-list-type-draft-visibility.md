# FX-23 Recovery一覧の種別表示とDraft状態視認性

## 概要

Recovery一覧で表示しているResource Type、件数、Draft状態のBadgeについて、情報量と視認性を整理する。

046〜047.mdで確認された指摘を基礎とする。

## Resource Type Badge

現状のRecovery対象がWorkoutのみである場合、各行に固定で `ワークアウト` と表示しても情報量はほぼ増えない。

ただし将来ほかのResource TypeもRecovery対象になる可能性があるため、Badge自体を削除するかどうかは046.mdだけでは確定していない。

### 確定している要求

BadgeをResource Type表示として残す場合、固定文字列にしない。

Resource Typeに応じて動的に表示する。

例:

```text
Workout → ワークアウト
Gym     → ジム
Machine → マシン
```

その他Typeが追加された場合も同じ責務で表示する。

### 未確定事項

v2.1.0でRecovery対象がWorkoutのみの場合に、一覧からResource Type Badgeそのものを非表示にするかは未決定。

実装時に「将来用途があるから」という理由だけで冗長表示を残すか、現行用途を優先して非表示にするかを勝手に決めない。

## Draft Status

`下書きあり` は、

> 修復作業が途中まで保存され、続きから再開できる

という重要状態を表す。

Light / Dark双方で背景へ沈み、視認性が弱いことが確認された。

### 要求

- `下書きあり` を一目で認識できるContrastへ改善する。
- Danger / Warningのような異常表現にはしない。
- Primary / Info系のSemantic Roleを基調とする方向が会話で示されている。
- 色だけでなく文言でも状態を識別できる状態を維持する。

## Count Badge

右上の `1件` 等の件数BadgeもLight / Dark双方で背景へ沈むことが確認された。

件数はRecovery対象数を把握するための主要情報なので、背景・文字色のContrastを確保する。

## 受入条件

1. Resource Type Badgeを表示する場合、固定 `ワークアウト` ではなくResource Typeから決定される。
2. `下書きあり` がLight / Dark双方で視認できる。
3. Draft状態をDanger / Warningとして誤認させない。
4. 件数BadgeがLight / Dark双方で認識できる。
5. Badgeの色だけに意味を依存しない。
6. v2.1.0でResource Type Badge自体を残すか消すかは、別途判断なしに勝手に確定しない。
