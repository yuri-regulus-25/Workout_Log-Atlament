# FX-07 Workoutカレンダー日付から当日1st Sessionへ直接遷移

## 概要

Workout DomainのCalendarで、Workoutデータが存在する日付Cellをclick / tapすると、その日の **1st Session** のDetailsへ直接遷移できるようにする。

## 確認した現状

確認画像:

`Codex 画像 2026年9月2日 01_06_12.png`

CalendarではWorkoutが存在する日付が視覚的に区別されている。

しかし、Calendar Cell自体からDetailsへ直接移動する導線はなく、詳細を見たい場合は下のWorkout Recordから対象行を探す必要がある。

## 確定仕様

Workoutデータが存在する日付Cellをclick / tapした場合、その日の1st SessionのDetailsへ直接遷移する。

```text
Workout Calendar
    ↓ 日付Cell click / tap
当日の1st Session
    ↓
Details
```

同日に複数Sessionが存在する場合も、Calendar側では選択UIを出さず **必ず1st Session固定** とする。

2nd Session以降を確認したい場合は、Workout Recordから対象Sessionを選択する。

## 責務分離

Calendarの役割:

- 日付起点でWorkoutへ素早くアクセスする。
- 当日分への簡易入口として1st Sessionへ遷移する。

Workout Recordの役割:

- 同日複数Sessionを含む個々のSessionを一覧から選択する。

CalendarへSession Selectorを持ち込まない。

## Interaction

- Desktop: click
- Touch: tap
- WorkoutありCell: interactive
- WorkoutなしCell: 非interactive
- Hoverは必須にしない

WindowsでHover Feedbackを追加すること自体は可能だが、操作成立条件にHoverを使用しない。

## 受入条件

1. Workoutありの日付Cellをclick / tapできる。
2. click / tapすると当日の1st Session Detailsへ遷移する。
3. 同日に複数SessionがあってもCalendar側では常に1st Sessionへ遷移する。
4. 2nd Session以降はWorkout Recordから選択できる既存導線を維持する。
5. WorkoutなしCellはDetails遷移を行わない。
6. Touch環境でもHoverなしで操作できる。
7. Android専用Calendar画面を追加しない。

## 不要な拡張

- Calendar上のSession Selector
- 同日Session選択Dialog
- 2nd Session以降をCalendarから直接選ぶUI

## 位置づけ

既存Workout Calendarを可視化だけでなくNavigationとして利用する機能UX改善。

`025.md` では複数Session時の扱いが未確定だったが、`026.md` で **必ず1st Session固定** と明示されて解消済み。
