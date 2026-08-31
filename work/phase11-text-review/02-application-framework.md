# Phase 11 User-facing Text Inventory - Application Framework

対象範囲: Windows / Android AFからAPI responseとしてFrontendへ渡され、最終的に画面へ表示される可能性がある固定文言。内部ログ専用文言は対象外。ただし同一文言がAPI error/warningに入る場合は対象。

| ID | Current Text | Location | Usage / Meaning |
|---|---|---|---|
| AF-001 | `Configuration is required.` | `src/application/windows/Core/AfServices.cs:139,2121`; `src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt:562` | 設定未登録時のAF error message。 |
| AF-002 | `Configuration is invalid.` | `src/application/windows/Core/AfServices.cs:147`; Android `AndroidLocalhostServer.kt:1352,1390` fallback | 設定JSON/内容が不正な場合のAF error message。 |
| AF-003 | `Configuration could not be parsed.` | `src/application/windows/Core/AfServices.cs:155` | Windows AF設定読込時のparse失敗。 |
| AF-004 | `Configuration could not be saved.` | `src/application/windows/Core/AfServices.cs:177`; Android `AndroidLocalhostServer.kt:935` | 設定保存失敗。 |
| AF-005 | `Unsupported configuration schemaVersion.` | `src/application/windows/Core/AfServices.cs:186`; Android `AndroidLocalhostServer.kt:875` | 設定schemaVersion不正。 |
| AF-006 | `Repository configuration is invalid.` | `src/application/windows/Core/AfServices.cs:193`; Android `AndroidLocalhostServer.kt:884` | Repository設定不正。 |
| AF-007 | `Repository configuration is required.` | `src/application/windows/Core/AfServices.cs:986` | GitHub access前のRepository設定不足。 |
| AF-008 | `Resource configuration is invalid.` | `src/application/windows/Core/AfServices.cs:200`; Android `AndroidLocalhostServer.kt:900` | Resource設定不正。 |
| AF-009 | `Resource configuration is required.` | `src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt:889` | Android AFでResource設定自体がない場合。 |
| AF-010 | `Timeout configuration is required.` | `src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt:908` | Android AFでtimeouts設定がない場合。 |
| AF-011 | `${name} is out of range.` | `src/application/windows/Core/AfServices.cs:216`; Android `AndroidLocalhostServer.kt:919` | timeout値が許容範囲外の場合。 |
| AF-012 | `Credential is required.` | `src/application/windows/Core/AfServices.cs:2126`; Android `AndroidLocalhostServer.kt:565` | GitHub Token未登録時のAF error message。 |
| AF-013 | `Credential is invalid.` | `src/application/windows/Core/AfServices.cs:2259`; Android `AndroidLocalhostServer.kt:1044` | Credential更新/検証時の不正。 |
| AF-014 | `Credential could not be saved.` | `src/application/windows/Core/AfServices.cs:2265`; Android `AndroidLocalhostServer.kt:1047` | Credential保存失敗。 |
| AF-015 | `OperationAlreadyRunning` messages: `Configuration update is already running.` / `Credential update is already running.` / `Sync is already running.` | `src/application/windows/Core/AfServices.cs:1968,2249,2273`; Android `AndroidLocalhostServer.kt:839,1033,1139` | 操作中に同種/排他操作を開始した場合。 |
| AF-016 | `Configuration update failed.` | `src/application/windows/Core/AfServices.cs:1999`; Android `AndroidLocalhostServer.kt:866` | 設定更新処理の内部失敗。 |
| AF-017 | `Sync failed.` | `src/application/windows/Core/AfServices.cs:2285`; Android `AndroidLocalhostServer.kt:1149` | 手動Sync処理の内部失敗。 |
| AF-018 | `Runtime Data is unavailable.` | `src/application/windows/Core/AfServices.cs:339`; Android `AndroidLocalhostServer.kt:1125` | Runtime Data未生成/読込不可。 |
| AF-019 | `Runtime Data contract is invalid.` | `src/application/windows/Core/AfServices.cs:345` | 保存済みRuntime Dataのcontract不正。 |
| AF-020 | `Runtime Data could not be read.` | `src/application/windows/Core/AfServices.cs:352` | 保存済みRuntime Data読込失敗。 |
| AF-021 | `Runtime Data could not be updated.` | `src/application/windows/Core/AfServices.cs:329` | Runtime Data atomic更新失敗。 |
| AF-022 | `Runtime Data could not be saved.` | `src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt:1231` | Android AF Runtime Data保存失敗。 |
| AF-023 | `Workout resource is empty.` / `${resource.Path} is empty.` | `src/application/windows/Core/AfServices.cs:379,1013`; Android `AndroidLocalhostServer.kt:1321,1378,1421` | Workout resourceが空の場合。 |
| AF-024 | Runtime build validation messages | `src/application/windows/Core/AfServices.cs:434-643`; Android `AndroidLocalhostServer.kt:1441-1612` | Runtime生成時のMaster/Workout validation error。例: `Machine master contract is invalid.`, `Workout required fields are invalid.`, `Set in machine ${id} is invalid.`。 |
| AF-025 | Master reference warning template: `${subject} master reference is ${resolutionState}: ${originalId}.` | `src/application/windows/Core/AfServices.cs:694-714`; Android `AndroidLocalhostServer.kt:1654-1665` | missing/deleted Master Reference warning。FrontendでData Load WarningやMaintenance unresolved detailに露出可能。 |
| AF-026 | `Master write target is not allowed.` | `src/application/windows/Core/AfServices.cs:1085,1125,1161,2047,2138`; Android `AndroidLocalhostServer.kt:450,471,581` | Master write/read対象typeがallowlist外の場合。 |
| AF-027 | `Master data must be synchronized before maintenance.` | `src/application/windows/Core/AfServices.cs:2042,2108,2132`; Android `AndroidLocalhostServer.kt:453,455,460,491,493,548,556` | MaintenanceがLocal Master snapshotなしでread/writeしようとした場合。 |
| AF-028 | `Master document must be synchronized before saving.` | `src/application/windows/Core/AfServices.cs:1177,1214,1268,1285,2143`; Android `AndroidLocalhostServer.kt:495,508,670` | write時のrevision不一致/未同期。 |
| AF-029 | `Master document write request is invalid.` | `src/application/windows/Core/AfServices.cs:1156,1247,2149`; Android `AndroidLocalhostServer.kt:475,480` | Master write request body不正。 |
| AF-030 | `Master data was saved remotely. Synchronize application data before continuing.` | `src/application/windows/Core/AfServices.cs:2181,2187,2193`; Android `AndroidLocalhostServer.kt:515,517,520,524` | Remote保存後のLocal Runtime再構築/同期継続に失敗した場合。 |
| AF-031 | `Configured Main Gym cannot be cleared.` | `src/application/windows/Core/AfServices.cs:1476,2086`; Android `AndroidLocalhostServer.kt:703` | Gym Master write validation。Main Gym解除不許可。 |
| AF-032 | `Main gym must be active and not logically deleted.` | `src/application/windows/Core/AfServices.cs:896`; Android `AndroidLocalhostServer.kt:775` | Main Gymがactiveかつ未削除でない場合。 |
| AF-033 | `Gym master must have at most one main gym.` | `src/application/windows/Core/AfServices.cs:903`; Android `AndroidLocalhostServer.kt:782` | Main Gym重複。 |
| AF-034 | GitHub error messages: `GitHub token is unauthorized.` / `GitHub access is forbidden.` / `GitHub resource not found: ${path}.` / `GitHub rate limit reached.` / `GitHub server error.` / `GitHub server error: HTTP ${status}.` | `src/application/windows/Core/AfServices.cs:1519-1523`; Android `AndroidLocalhostServer.kt:1764-1768` | GitHub API失敗時のAF error message。 |
| AF-035 | `GitHub access timed out.` / `GitHub connection failed.` | `src/application/windows/Core/AfServices.cs:1027,1031,1069,1073,1109,1113,1229,1233,1300,1304`; Android `AndroidLocalhostServer.kt:536,946,1207` | GitHub通信timeout/connection失敗。 |
| AF-036 | `Frontend artifact is unavailable.` | `src/application/windows/Host/AfHttpHost.cs:155-156` | Windows AFでFrontend artifact未配置時にAPI responseへ入る可能性がある文言。 |
| AF-037 | `Atlament is already running.` / `Atlament` | `src/application/windows/Program.cs:17` | Windows二重起動時のMessageBox本文/タイトル。 |

