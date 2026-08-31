# Phase 11 User-facing Text Inventory - Common / Shared

対象範囲: 複数Applicationから共有利用されるFrontend共通定義、Workout表示ヘルパー、Runtime Workout loader、Easter Egg音声文言。動的Workout/Masterデータ本体は対象外。

| ID | Current Text | Location | Usage / Meaning |
|---|---|---|---|
| COM-001 | `Portal` | `src/shared/frontend-common/src/navigation/application-registry.js:5` / `applications[portal].displayName` | Portalのアプリ名。 |
| COM-002 | `Dashboard` | `src/shared/frontend-common/src/navigation/application-registry.js:13` / `applications[dashboard].displayName` | Navigation / Portal Cardで使うDashboard名。 |
| COM-003 | `Overview` | `src/shared/frontend-common/src/navigation/application-registry.js:16` / `portalCategory` | Portal CardのDashboardカテゴリ。 |
| COM-004 | `今のトレーニングを知る` | `src/shared/frontend-common/src/navigation/application-registry.js:17` / `portalPointer` | Portal CardのDashboard説明。 |
| COM-005 | `Workout Domain` | `src/shared/frontend-common/src/navigation/application-registry.js:24` / `applications[workouts].displayName` | Navigation / Portal Cardで使うWorkout Domain名。 |
| COM-006 | `History` / `これまでの記録を辿る` | `src/shared/frontend-common/src/navigation/application-registry.js:27-28` | Portal CardのWorkout Domainカテゴリ/説明。 |
| COM-007 | `Performance Detail` | `src/shared/frontend-common/src/navigation/application-registry.js:35` / `applications[machines].displayName` | Navigation / Portal Cardで使うPerformance Detail名。 |
| COM-008 | `Movement` / `種目ごとの変化を追う` | `src/shared/frontend-common/src/navigation/application-registry.js:38-39` | Portal CardのPerformance Detailカテゴリ/説明。 |
| COM-009 | `Analytics` | `src/shared/frontend-common/src/navigation/application-registry.js:46` / `applications[analytics].displayName` | Navigation / Portal Cardで使うAnalytics名。 |
| COM-010 | `Insights` / `データから傾向を見つける` | `src/shared/frontend-common/src/navigation/application-registry.js:49-50` | Portal CardのAnalyticsカテゴリ/説明。 |
| COM-011 | `Application Settings` | `src/shared/frontend-common/src/navigation/application-registry.js:57` / `applications[settings].displayName` | Navigation / Portal Cardで使うApplication Settings名。 |
| COM-012 | `Configuration` / `外の世界との繋がりを定める` | `src/shared/frontend-common/src/navigation/application-registry.js:60-61` | Portal CardのApplication Settingsカテゴリ/説明。 |
| COM-013 | `Master Maintenance` | `src/shared/frontend-common/src/navigation/application-registry.js:68` / `applications[maintenance].displayName` | Navigation / Portal Cardで使うMaster Maintenance名。 |
| COM-014 | `Master Data` / `GymとMachineを整える` | `src/shared/frontend-common/src/navigation/application-registry.js:71-72` | Portal CardのMaster Maintenanceカテゴリ/説明。 |
| COM-015 | `Close navigation` | `src/shared/frontend-common/src/navigation/navigation-ui.ts:29` | モバイルNavigation overlayのaccessibility label。 |
| COM-016 | `Open navigation` | `src/shared/frontend-common/src/navigation/navigation-ui.ts:107` | モバイルNavigation buttonのaccessibility label。 |
| COM-017 | `Toggle Atlament logo variant` | `src/shared/frontend-common/src/navigation/navigation-ui.ts:110,127` | Navigation内ロゴ切替buttonのaccessibility label。Portalでも同文言を使用。 |
| COM-018 | `Application navigation` | `src/shared/frontend-common/src/navigation/navigation-ui.ts:132` | Navigation menuのaccessibility label。 |
| COM-019 | `Switch to light theme` / `Switch to dark theme` | `src/shared/frontend-common/src/theme/index.js:80` | Theme toggleのaccessibility label。現在Themeに応じて切替。 |
| COM-020 | `胸` / `背中` / `脚` / `肩` / `腕` / `臀部` / `体幹` / `有酸素` / `その他` | `src/shared/workout-core/src/index.ts:1318-1335` / `formatBodyPart()` | body_partコードから画面表示名への共通変換。Dashboard / Workout Domain / Performance Detail / Analytics / Master Maintenanceで使用。 |
| COM-021 | `?` | `src/shared/workout-core/src/index.ts:1309,1313,1337` / `getMachineBodyPartDisplay()` / `getDisplayText()` / `formatBodyPart()` | Master由来表示値が空、または未解決/削除で表示名を持たない場合の共通表示。 |
| COM-022 | `YYYY/MM/DD` form | `src/shared/workout-core/src/index.ts:1255-1256` / `formatDisplayDate()` | `YYYY-MM-DD`を画面表示向けに`YYYY/MM/DD`へ置換。各分析/一覧画面で使用。 |
| COM-023 | `最高重量` / `最大回数` / `推定1RM` | `src/shared/workout-core/src/index.ts:1270-1274` / Personal Record display | Personal Record種別の表示名。使用箇所は現行主要画面では限定的。 |
| COM-024 | `${value} kg` / `${value} reps` / `合計重量: ${value} kg` | `src/shared/workout-core/src/index.ts:1282-1293` | 共通重量/回数/合計重量表示。 |
| COM-025 | `記録完了` / `一部記録` | `src/shared/workout-core/src/index.ts:1344-1346` / `formatWorkoutStatus()` | Workout status表示変換。 |
| COM-026 | `AF status request failed: HTTP ${status}` | `src/shared/frontend-common/src/af-client.js:8` | AF status取得失敗時にthrowされるエラー文言。Frontendでcatchして表示される可能性あり。 |
| COM-027 | Runtime loader validation messages | `src/shared/workout-data/src/index.ts:207-251,371-956` | Runtime Workout loaderのparse/validation issue文言。例: `Failed to load runtime workout data. ...`, `Invalid date format: expected YYYY-MM-DD.`, `Unknown parse error.`。FrontendのData Load Warningで露出可能。 |
| COM-028 | Master reference warning template: `${subject} master reference is ${resolutionState}: ${originalId}.` | `src/shared/workout-data/src/index.ts:577-605` | missing/deleted Master Reference warning文言。 |
| COM-029 | Easter Egg voice category files, all `text` fields | `src/shared/frontend-common/src/easter-egg/voice/categories/*.json` | Portal / Dashboard / Workout Domain / Performance Detail / Analytics / Application Settings / Master Maintenanceが共有利用するEaster Egg表示文言。確認時点で`text`フィールド303件。 |
| COM-030 | `Built with` | `src/frontend/portal/src/main.js:156` | Portal Card内で共通metadataのframework名の前に表示。Portal固有DOMだがmetadata共有と一体で利用。 |

