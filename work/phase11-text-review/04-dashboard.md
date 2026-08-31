# Phase 11 User-facing Text Inventory - Dashboard

対象範囲: Dashboard React Appの固定表示文言、chart label、loading/error/empty text、単位suffix。

| ID | Current Text | Location | Usage / Meaning |
|---|---|---|---|
| DAS-001 | `Atlament Dashboard` | `src/frontend/dashboard-react/src/App.tsx:256` | Brand rowのaccessibility label。 |
| DAS-002 | `Atlament / Dashboard` | `src/frontend/dashboard-react/src/App.tsx:257` | 上部eyebrow / Easter Egg trigger。 |
| DAS-003 | `Dashboard` | `src/frontend/dashboard-react/src/App.tsx:260` | Page heading。 |
| DAS-004 | Lead text block | `src/frontend/dashboard-react/src/App.tsx:261` | Dashboard上部説明文。コード上で複数行JSXとして定義。 |
| DAS-005 | `Monthly summary` | `src/frontend/dashboard-react/src/App.tsx:267` | 月次summary metric gridのaccessibility label。 |
| DAS-006 | `Monthly workouts` / `${count} Sessions` | `src/frontend/dashboard-react/src/App.tsx:268` | 月内Workout件数カード。 |
| DAS-007 | `Monthly sets` / `${count} Sets` | `src/frontend/dashboard-react/src/App.tsx:269` | 月内Set数カード。 |
| DAS-008 | `Main Gym volume` | `src/frontend/dashboard-react/src/App.tsx:270` | Main Gym volumeカードlabel。値は`${value} kg`または状態文言。 |
| DAS-009 | `Latest workout` | `src/frontend/dashboard-react/src/App.tsx:271` | 最新Workoutカードlabel。 |
| DAS-010 | `Previous month comparison` | `src/frontend/dashboard-react/src/App.tsx:274` | 前月比較metric gridのaccessibility label。 |
| DAS-011 | `Workout delta` / `Set delta` / `Previous month workouts` | `src/frontend/dashboard-react/src/App.tsx:275-277` | 前月比較カードlabel。 |
| DAS-012 | `Data Load Warning` / `データ取得異常` / `データ取得APIでエラーが発生しました。設定情報を確認し、再度同期を行ってください` | `src/frontend/dashboard-react/src/App.tsx:283-285` | Runtime load warning panel。 |
| DAS-013 | `Main Gym Volume Trends` / `ボリューム推移(メインジム)` | `src/frontend/dashboard-react/src/App.tsx:295-296` | Main Gym volume chart section。 |
| DAS-014 | `Main Gym Total Weight` | `src/frontend/dashboard-react/src/App.tsx:146` | Main Gym volume chart series name。 |
| DAS-015 | `データがありません` | `src/frontend/dashboard-react/src/App.tsx:309,344` | Chart/latest workout empty state。 |
| DAS-016 | `Latest Workout` / `No workout` | `src/frontend/dashboard-react/src/App.tsx:319-340` | Latest Workout panel heading/empty heading。 |
| DAS-017 | `${value} kg` / `${count} sets` / `${count} machines` | `src/frontend/dashboard-react/src/App.tsx:325-329,414` | 最新Workout/Recent Workoutsの単位suffix。 |
| DAS-018 | `Set Count Trends` / `セット数推移` | `src/frontend/dashboard-react/src/App.tsx:355-356` | Set count chart section。 |
| DAS-019 | `Sets` | `src/frontend/dashboard-react/src/App.tsx:199,247,405` | Chart series name / table header。 |
| DAS-020 | `Training Balance` / `トレーニングバランス` | `src/frontend/dashboard-react/src/App.tsx:373-374` | Body balance chart section。 |
| DAS-021 | `Recent Workouts` / `最近のワークアウト` | `src/frontend/dashboard-react/src/App.tsx:392-393` | Recent Workouts table section。 |
| DAS-022 | `Workout List` | `src/frontend/dashboard-react/src/App.tsx:397` | Workout Domain一覧へのlink label。 |
| DAS-023 | `Volume` | `src/frontend/dashboard-react/src/App.tsx:406` | Recent Workouts table header。 |
| DAS-024 | `Not configured` / `Unavailable` / `No workout data loaded.` | `src/frontend/dashboard-react/src/App.tsx:443-450` | Main Gym metric unavailable state display。 |

