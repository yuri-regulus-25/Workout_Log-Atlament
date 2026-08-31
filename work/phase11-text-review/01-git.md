# Phase 11 User-facing Text Inventory - Git Write

対象範囲: ユーザー操作によってGitHub Repositoryへ書き込まれ、Repository上で確認可能な固定文言。特にMaster Maintenanceのcommit message生成。

| ID | Current Text | Location | Usage / Meaning |
|---|---|---|---|
| GIT-001 | `Update machine master` | `src/application/windows/Core/AfServices.cs:960-965` / `GithubAccessService.MasterWriteTargets["MACHINE_MASTER"].CommitMessage` | Windows AFでMachine Master保存時にGitHub Contents API payloadの`message`へ設定されるcommit message。 |
| GIT-002 | `Update gym master` | `src/application/windows/Core/AfServices.cs:960-965` / `GithubAccessService.MasterWriteTargets["GYM_MASTER"].CommitMessage` | Windows AFでGym Master保存時にGitHub Contents API payloadの`message`へ設定されるcommit message。 |
| GIT-003 | `Update machine master` | `src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt:570-571` / `masterWriteTarget("MACHINE_MASTER")` | Android AFでMachine Master保存時にGitHub Contents API payloadの`message`へ設定されるcommit message。 |
| GIT-004 | `Update gym master` | `src/application/android/app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt:570-572` / `masterWriteTarget("GYM_MASTER")` | Android AFでGym Master保存時にGitHub Contents API payloadの`message`へ設定されるcommit message。 |

## Notes

- Frontend側からcommit messageを入力・上書きする実装は確認されなかった。
- Commit messageはAF側固定値で、Master typeごとに分岐する。
