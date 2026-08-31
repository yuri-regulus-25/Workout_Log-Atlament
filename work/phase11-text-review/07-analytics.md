# Phase 11 User-facing Text Inventory - Analytics

対象範囲: Analytics Svelte Appの固定表示文言、period selector、chart/table labels、empty/error text、単位suffix。

| ID | Current Text | Location | Usage / Meaning |
|---|---|---|---|
| ANA-001 | `Atlament Analytics` | `src/frontend/analytics-svelte/src/App.svelte:268` | Brand rowのaccessibility label。 |
| ANA-002 | `Atlament / Analytics` | `src/frontend/analytics-svelte/src/App.svelte:269` | 上部eyebrow / Easter Egg trigger。 |
| ANA-003 | `Analytics` | `src/frontend/analytics-svelte/src/App.svelte:272` | Page heading。 |
| ANA-004 | Lead text block | `src/frontend/analytics-svelte/src/App.svelte:273` | Analytics上部説明文。 |
| ANA-005 | `Analytics summary` | `src/frontend/analytics-svelte/src/App.svelte:279` | summary metric grid accessibility label。 |
| ANA-006 | `Period workouts` | `src/frontend/analytics-svelte/src/App.svelte:281` | 期間内Workout数metric label。 |
| ANA-007 | `Total sets` / `${count} Set(s)` | `src/frontend/analytics-svelte/src/App.svelte:285-286` | 期間内Set数metric label/value suffix。 |
| ANA-008 | `Main Gym weight` | `src/frontend/analytics-svelte/src/App.svelte:289` | Main Gym weight metric label。 |
| ANA-009 | `Data Load Warning` / `データ取得異常` / `データ取得APIでエラーが発生しました。設定情報を確認し、再度同期を行ってください` | `src/frontend/analytics-svelte/src/App.svelte:300-302` | Runtime load warning panel。 |
| ANA-010 | `Global Period` | `src/frontend/analytics-svelte/src/App.svelte:311` | period selector section eyebrow。 |
| ANA-011 | `${startDate} - ${endDate}` | `src/frontend/analytics-svelte/src/App.svelte:312` | period range heading。日付は`formatDisplayDate()`経由。 |
| ANA-012 | `Month` | `src/frontend/analytics-svelte/src/App.svelte:320` | period preset option。 |
| ANA-013 | Other period option labels | `src/frontend/analytics-svelte/src/App.svelte:315-325` | 期間選択のoption群。実際の全optionは該当`select` DOMを参照。 |
| ANA-014 | `Main Gym Workout Trend` / `ボリューム推移` | `src/frontend/analytics-svelte/src/App.svelte:335-336` | Main Gym trend chart section。 |
| ANA-015 | `Main Gym Total Weight` | `src/frontend/analytics-svelte/src/App.svelte:171` | Main Gym trend chart series name。 |
| ANA-016 | `データがありません` | `src/frontend/analytics-svelte/src/App.svelte:345,400,428,460,486,514,540` | 各chart/table empty state。 |
| ANA-017 | `Body Part Balance` / `部位別セット数` | `src/frontend/analytics-svelte/src/App.svelte:354-355` | Body Part chart section。 |
| ANA-018 | `Sets` | `src/frontend/analytics-svelte/src/App.svelte:212,418,448,532` | Chart series/table header。 |
| ANA-019 | `Training Frequency` / `トレーニング頻度` | `src/frontend/analytics-svelte/src/App.svelte:369-370` | frequency section。 |
| ANA-020 | `${value} / week` | `src/frontend/analytics-svelte/src/App.svelte:374` | frequency表示suffix。 |
| ANA-021 | `Machine Variety` / `部位別実施マシン数` | `src/frontend/analytics-svelte/src/App.svelte:384-385` | Machine variety table section。 |
| ANA-022 | `Body Part` | `src/frontend/analytics-svelte/src/App.svelte:391,417,447,531` | table header。 |
| ANA-023 | `Main Gym Body Part Volume` / `部位別ボリューム` | `src/frontend/analytics-svelte/src/App.svelte:410-411` | Main Gym body part volume table section。 |
| ANA-024 | `${value} kg` | `src/frontend/analytics-svelte/src/App.svelte:184,248,425` | Weight/volume表示suffix。 |
| ANA-025 | `Body Part Share` / `部位別シェア` | `src/frontend/analytics-svelte/src/App.svelte:440-441` | Body Part share table section。 |
| ANA-026 | `${value}%` | `src/frontend/analytics-svelte/src/App.svelte:243` | share表示suffix。 |
| ANA-027 | `Machine Ranking` / `実施マシン頻度` | `src/frontend/analytics-svelte/src/App.svelte:470-471` | Machine frequency ranking section。 |
| ANA-028 | `Gym Sessions` / `ジム` | `src/frontend/analytics-svelte/src/App.svelte:498-499` | Gym session distribution section。 |
| ANA-029 | `Body Part Sets` / `部位別セット分布` | `src/frontend/analytics-svelte/src/App.svelte:524-525` | Body Part set distribution section。 |
| ANA-030 | `Not configured` / `Unavailable` / `No workout data loaded.` | `src/frontend/analytics-svelte/src/App.svelte:254-261` | Main Gym metric unavailable state display。 |
| ANA-031 | `Workout data could not be loaded.` | `src/frontend/analytics-svelte/src/App.svelte:100` | Runtime loader catch時のfallback error。 |

