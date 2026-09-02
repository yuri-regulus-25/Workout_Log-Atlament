# FX-05 Workoutカレンダー月送り

## 概要

Workout Domainのカレンダーで、デバイス現在年月を初期表示とし、前月・翌月へ単純に移動できるようにする。

## 確認した現状

確認画像:

- `Codex 画像 2026年9月2日 01_03_28.png`
- `Codex 画像 2026年9月2日 01_04_41.png`

現状のCalendar Headerには表示年月があるが、前月・翌月へ移動する操作がない。

## 確定仕様

Calendar Header右端に次の2つを配置する。

- `mdi-chevron-left`
- `mdi-chevron-right`

操作:

- 左Chevronをclick / tap → 前月へ移動
- 右Chevronをclick / tap → 翌月へ移動
- 表示月がデバイス現在年月の場合 → 右Chevronをdisabled
- 月を移動した場合 → Calendar内容をその年月へ切り替える
- 年跨ぎも通常の月移動として扱う
  - 例: `2026-01 → 2025-12`

## 初期表示

**初期表示は一律でデバイス現在年月とする。**

Workoutデータの最新月を初期表示基準にはしない。

例:

- デバイス日付が10月1日
- 10月のWorkoutがまだ0件

この場合も10月を初期表示する。

データが0件の場合も同じくデバイス現在年月を表示する。

## 未来月の扱い

未来月へは移動させない。

現在月を表示している場合、右Chevronをdisabledとする。

判断基準はRepositoryの最新Workout日付ではなく、**デバイス現在日時**。

## 空月の扱い

Workoutが存在しない月も通常のCalendarとして表示する。

ログの有無は月送り可否に関与しない。

## 既存挙動

日付選択等、既存Calendarの挙動は月送り追加によって変更しない。

FX-07として別途追加されるWorkout日付CellからDetailsへのNavigationとも責務を分ける。

## 不要な拡張

この対応では次を追加しない。

- Month Picker
- 年月選択Dialog
- 新規Filter
- Workoutデータが存在する月だけを判定する仕組み
- Workout存在月への自動Jump
- Android専用Calendar画面

## Shared UI要件

同一ComponentでWindows / Android双方に対応する。

- Desktop: click
- Touch: tap

Platform専用画面は作らない。

## 受入条件

1. 初期表示がデバイス現在年月になる。
2. 左Chevronから前月へ移動できる。
3. 過去月表示中は右Chevronから翌月へ移動できる。
4. デバイス現在年月では右Chevronがdisabledになる。
5. 月移動時にCalendar内容が対象年月へ切り替わる。
6. 年跨ぎが通常の月移動として動作する。
7. Workoutデータ0件でも現在月Calendarを表示できる。
8. 空月を通常表示できる。
9. 既存の日付表示・選択挙動を壊さない。
10. Windows / AndroidのShared UIで利用できる。

## 位置づけ

既存Workout Domainの小規模な機能UX改善。

`021.md`〜`022.md` により、以前未確定だった「最新参照可能月の基準」「空月」「初期表示」は解消済み。
