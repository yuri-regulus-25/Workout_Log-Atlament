# FX-04 Dashboard最近のワークアウト導線整理

## 概要

Dashboardの「最近のワークアウト」Card内に存在する `Workout List` 導線について、個別Workoutへの直接導線およびGlobal Navigationとの役割重複を整理する。

## 確認した現状

確認画像:

`Codex 画像 2026年9月2日 00_57_38.png`

同画像で、「最近のワークアウト」Card右上に `Workout List` が表示されていることを確認できる。

会話では次の現在挙動が記録されている。

```text
最近のワークアウト
├─ 各Row → 対象WorkoutのDetails
└─ Workout List → Workout Domain
```

Global Sidebarにも `Workout Domain` が存在する。

## 問題

同じCard内に、性質の異なるNavigationが混在している。

- Row Click: 今見えている特定Workoutを詳しく見る。
- `Workout List`: 別Domainへ移動する。

`Workout List` という名称も、「最近のワークアウトの続きを見る」のか「Workout Domainへ移動する」のかが読み取りにくい。

## 現時点の第一候補

`Workout List` CTAを削除する。

その場合の導線責務を次のように整理する。

```text
最近の状況を把握する
→ Dashboard

特定Workoutを見る
→ 最近のワークアウトのRow Click

Workout全体を探索する
→ Global SidebarのWorkout Domain
```

## 注意

`018.md` での「削除」はAssistantが提示したFix候補であり、ユーザーが削除を明示承認した記録は `011.md`〜`020.md` には存在しない。

したがって、この資料では **削除候補** として保持し、確定仕様にはしない。

将来、最近5件等からさらに過去へ自然に遷移する実利用要件が確認された場合は、`すべてのワークアウトを見る` 等、遷移先の意味が明確なCTAとして再検討できる。

## 製造時に確認すること

1. `Workout List` の実際の遷移先をRepositoryで確認する。
2. 各Recent Workout RowからDetailsへ遷移する現行挙動を確認する。
3. Global SidebarからWorkout Domainへ遷移できることを確認する。
4. CTA削除により失われる固有能力がないか確認する。

## 受入条件候補

削除案を採用する場合:

1. `Workout List` CTAを削除する。
2. Recent Workout RowからDetailsへ入る既存導線は維持する。
3. Workout DomainへのGlobal Navigationは維持する。
4. Dashboard Card内のNavigation責務を個別Workout参照へ絞る。

## 位置づけ

既存DashboardのNavigation整理。Correctness blockerではなく、小規模Backlog候補。
