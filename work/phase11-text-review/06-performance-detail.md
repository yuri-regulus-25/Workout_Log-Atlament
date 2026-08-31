# Phase 11 User-facing Text Inventory - Performance Detail

対象範囲: Performance Detail Angular Appの固定表示文言、検索UI、chart label、parameter error、empty/error text、単位suffix。

| ID | Current Text | Location | Usage / Meaning |
|---|---|---|---|
| PER-001 | `Atlament Machines` | `src/frontend/machines-angular/src/app/app.html:4` | Brand rowのaccessibility label。 |
| PER-002 | `Atlament / Performance Detail` | `src/frontend/machines-angular/src/app/app.html:5` | 上部eyebrow / Easter Egg trigger。 |
| PER-003 | `Performance Detail` | `src/frontend/machines-angular/src/app/app.html:8` | Page heading。 |
| PER-004 | Lead text block | `src/frontend/machines-angular/src/app/app.html:9` | Performance Detail上部説明文。 |
| PER-005 | `Search Target` / `検索対象` | `src/frontend/machines-angular/src/app/app.html:20-21` | Machine検索panel heading。 |
| PER-006 | `Machine selector filters` | `src/frontend/machines-angular/src/app/app.html:25` | selector panel accessibility label。 |
| PER-007 | `Machine Search` / `Machine name` | `src/frontend/machines-angular/src/app/app.html:27-31` | Machine検索label / placeholder。 |
| PER-008 | Body Part filter options | `src/frontend/machines-angular/src/app/app.html:36-41`; `src/frontend/machines-angular/src/app/app.ts:292-293` | Body Part選択肢。表示名は`formatBodyPart()`共通定義。 |
| PER-009 | `Reset` | `src/frontend/machines-angular/src/app/app.html:65` | 検索条件reset button。 |
| PER-010 | `No Results` / `条件に一致するマシンがありません。` / `検索対象を確認してください` | `src/frontend/machines-angular/src/app/app.html:72-74` | Machine検索結果0件empty state。 |
| PER-011 | `Data Load Warning` / `データ取得異常` / `データ取得APIでエラーが発生しました。設定情報を確認し、再度同期を行ってください` | `src/frontend/machines-angular/src/app/app.html:80-82` | Runtime load warning panel。 |
| PER-012 | `Parameter Error` / `パラメータ不正` | `src/frontend/machines-angular/src/app/app.html:88-89` | URL指定Machine IDが不正な場合のalert heading。 |
| PER-013 | `指定ID: ${invalidMachineId}` | `src/frontend/machines-angular/src/app/app.html:98` | 不正Machine ID表示。ID値はURL由来の動的値。 |
| PER-014 | `Machine summary` | `src/frontend/machines-angular/src/app/app.html:103` | summary metric gridのaccessibility label。 |
| PER-015 | `Total Sets` / `${count} Set(s)` | `src/frontend/machines-angular/src/app/app.html:117-118` | Machine履歴の総Set数カード。 |
| PER-016 | `Not configured` / `Unavailable` / `No workout data loaded.` | `src/frontend/machines-angular/src/app/app.ts:256-263` | Main Gym metric unavailable state display。 |
| PER-017 | `—` | `src/frontend/machines-angular/src/app/app.ts:141,146,163,197` | 未選択/値なしplaceholder。 |
| PER-018 | `${machine} progress - Main Gym Best Weight` / `${machine} 進捗 - 最大荷重` | `src/frontend/machines-angular/src/app/app.html:132-133` | chart section heading。Machine名は動的。 |
| PER-019 | `Summary` / `詳細` | `src/frontend/machines-angular/src/app/app.html:157-158` | Machine詳細summary section。 |
| PER-020 | `Parts` / `Session` / `Best Volume` / `Max reps` | `src/frontend/machines-angular/src/app/app.html:162-169` | Machine詳細summary labels。 |
| PER-021 | `${count} sessions` / `${count} Reps` | `src/frontend/machines-angular/src/app/app.html:165,169` | session数/reps表示suffix。 |
| PER-022 | `Workout History` / `ワークアウト履歴` | `src/frontend/machines-angular/src/app/app.html:178-179` | history table section。 |
| PER-023 | `Sets` / `Best Weight` / `Best WT.` / `Best Reps` / `Reps` | `src/frontend/machines-angular/src/app/app.html:188-190` | history table headers。 |
| PER-024 | `${weight} kg` / `${volume} kg` | `src/frontend/machines-angular/src/app/app.html:199,201`; `src/frontend/machines-angular/src/app/app.ts:177,183,197` | weight/volume表示suffix。 |
| PER-025 | `データがありません` | `src/frontend/machines-angular/src/app/app.html:204` | history table empty state。 |
| PER-026 | `Main Gym Total Weight` | `src/frontend/machines-angular/src/app/app.ts` chart options/series | Main Gym chart series name。該当定義はchart生成処理内。 |
| PER-027 | `Workout data could not be loaded.` | `src/frontend/machines-angular/src/app/app.ts:118` | Runtime loader catch時のfallback error。 |

