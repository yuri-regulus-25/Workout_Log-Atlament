# FX-09 Machine Notesラベル明示

## 概要

Workout DetailでMachine単位のNotesが存在する場合、その文章がMachine Notesであることを明確にするため `NOTES` ラベルを表示する。

## 確認した現状

確認画像:

`Codex 画像 2026年9月2日 01_07_18.png`

ペクトラルフライCardではSet Tableの下にMachine単位の文章が表示されているが、ラベルがなく文章だけが置かれている。

一方、Workout全体のNotesには既に `NOTES` ラベルが表示されている。

そのため、Machine Card末尾の文章が次のどれなのかを構造だけでは即座に判別しにくい。

- Machine単位Notes
- Workout全体Notes
- 警告・補足文

## 確定仕様

MachineにNotesが存在する場合のみ、Machine Card内で `NOTES` ラベルを表示する。

概念:

```text
Machine Name
Machine Summary

[Set Table]

NOTES
Machine Note Text
```

Machine Notesが存在しない場合は、`NOTES` ラベル自体を表示しない。

## Visual Language

Workout全体Notesで既に使用している `NOTES` 表現をMachine単位でも利用する。

新しいLabel表現・新しい概念名は作らない。

## 目的

次の階層を視覚的に明確化する。

1. Set Data
2. Machine単位Notes
3. Workout全体Notes

Machine Card内に文章だけを置かず、意味を明示する。

## 受入条件

1. Machine Notesが存在するMachine Cardに `NOTES` ラベルが表示される。
2. Machine Notesが存在しないMachine Cardではラベルを表示しない。
3. `NOTES` のVisual LanguageがWorkout-level Notesと整合する。
4. Machine Notesの内容自体は変更しない。
5. Workout全体Notesとの階層が視覚的に区別できる。
6. Windows / AndroidのShared UIで同じ意味を維持する。

## 変更しないもの

- Notes Data Model
- Notesの保存仕様
- Set Table
- Machine Summary
- Workout全体Notesの内容

## 位置づけ

既存Workout Detailの小規模なUI・情報構造改善。
