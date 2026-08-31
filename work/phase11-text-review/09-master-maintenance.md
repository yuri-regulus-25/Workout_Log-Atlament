# Phase 11 User-facing Text Inventory - Master Maintenance

対象範囲: Master Maintenance Vue/Vuetify Appの固定表示文言、Master編集/未解決参照UI、dialog/confirmation/snackbar相当alert、validation/error mapping。

| ID | Current Text | Location | Usage / Meaning |
|---|---|---|---|
| MNT-001 | `Atlament Master Maintenance` | `src/frontend/maintenance-vue/src/App.vue:6` | Brand rowのaccessibility label。 |
| MNT-002 | `Atlament / Master Maintenance` | `src/frontend/maintenance-vue/src/App.vue:7` | 上部eyebrow / Easter Egg trigger。 |
| MNT-003 | `Master Maintenance` | `src/frontend/maintenance-vue/src/App.vue:10` | Page heading。 |
| MNT-004 | `マスター情報と未解決参照を確認し、必要な変更を保存します。` | `src/frontend/maintenance-vue/src/App.vue:11` | Page lead text。 |
| MNT-005 | `マスター` / `未解決参照` | `src/frontend/maintenance-vue/src/App.vue:21-22` | view mode toggle labels。 |
| MNT-006 | `マシン` / `ジム` | `src/frontend/maintenance-vue/src/App.vue:25-26`; `masterTypeLabel()` at `src/frontend/maintenance-vue/src/App.vue:642` | Master type toggle / dialog title / unresolved type chip。 |
| MNT-007 | `有効` / `削除済み` / `すべて` | `src/frontend/maintenance-vue/src/App.vue:29-31` | Master display filter toggle labels。 |
| MNT-008 | `新規作成` | `src/frontend/maintenance-vue/src/App.vue:34,109,117` | Master新規作成button / unresolvedから新規作成action / dialog title。 |
| MNT-009 | `Workout内のMaster参照がmissing/deleted等で解決できない状態です。Raw Workoutは書き換えず、Master側の追加・復元・source_ids追加で解決します。` | `src/frontend/maintenance-vue/src/App.vue:37-38` | 未解決参照viewの説明文。 |
| MNT-010 | `削除済み` / `有効` / `無効` | `src/frontend/maintenance-vue/src/App.vue:54-55` | Master row status chip。 |
| MNT-011 | `メインジムに設定` | `src/frontend/maintenance-vue/src/App.vue:72` | Gym row main設定buttonのaria-label。 |
| MNT-012 | `コピーして作成` | `src/frontend/maintenance-vue/src/App.vue:75` | Master row copy buttonのaria-label。 |
| MNT-013 | `復元` / `削除` | `src/frontend/maintenance-vue/src/App.vue:80` | Master row delete/restore buttonのaria-label。 |
| MNT-014 | `確認` | `src/frontend/maintenance-vue/src/App.vue:107` | 未解決参照確認buttonのaria-label。 |
| MNT-015 | `既存マスターへ解決` | `src/frontend/maintenance-vue/src/App.vue:108` | 未解決参照を既存Master source_idsへ追加するbuttonのaria-label。 |
| MNT-016 | `編集` | `src/frontend/maintenance-vue/src/App.vue:117` | Master edit dialog title。 |
| MNT-017 | `ID` / `名前` / `部位` / `別名` / `短縮名` / `有効` | `src/frontend/maintenance-vue/src/App.vue:121-132` | Master edit/create dialog field labels。 |
| MNT-018 | `メインジム` | `src/frontend/maintenance-vue/src/App.vue:134` | Gym draftがmainの場合のchip表示。 |
| MNT-019 | `キャンセル` | `src/frontend/maintenance-vue/src/App.vue:140,153,165,196` | 各dialog cancel button。 |
| MNT-020 | `保存` | `src/frontend/maintenance-vue/src/App.vue:141` | Master edit/create dialog save button。 |
| MNT-021 | `変更を破棄しますか?` | `src/frontend/maintenance-vue/src/App.vue:150` | dirty draft close時のdiscard confirmation title。 |
| MNT-022 | `破棄` | `src/frontend/maintenance-vue/src/App.vue:154` | discard confirmation実行button。 |
| MNT-023 | `実行` | `src/frontend/maintenance-vue/src/App.vue:166` | delete/restore/main-gym confirmation実行button。 |
| MNT-024 | `未解決参照の解決` | `src/frontend/maintenance-vue/src/App.vue:173` | unresolved resolve dialog title。 |
| MNT-025 | `${referenceId} は ${count} 件のWorkoutに影響しています。` | `src/frontend/maintenance-vue/src/App.vue:176` | unresolved resolve dialog info alert。 |
| MNT-026 | `解決先マスター` | `src/frontend/maintenance-vue/src/App.vue:180` | unresolved resolve target select label。 |
| MNT-027 | `解決` | `src/frontend/maintenance-vue/src/App.vue:197` | unresolved resolve実行button。 |
| MNT-028 | `メインジムを変更しますか?` | `src/frontend/maintenance-vue/src/App.vue:298` | main gym変更confirmation title。 |
| MNT-029 | `復元しますか?` / `削除しますか?` | `src/frontend/maintenance-vue/src/App.vue:299` | restore/delete confirmation title。 |
| MNT-030 | `選択した有効なジムをメインジムにし、現在のメインジムを解除します。` | `src/frontend/maintenance-vue/src/App.vue:304` | main gym変更confirmation text。 |
| MNT-031 | `このレコードを復元し、検証後に保存します。` / `このレコードを論理削除し、検証後に保存します。` | `src/frontend/maintenance-vue/src/App.vue:305-307` | restore/delete confirmation text。 |
| MNT-032 | Master table headers: `ID` / `名前` / `部位` / `短縮名` / `メイン` / `状態` | `src/frontend/maintenance-vue/src/App.vue:324-336` | Machine/Gym Master一覧table headers。 |
| MNT-033 | Unresolved table headers: `種別` / `参照ID` / `影響` | `src/frontend/maintenance-vue/src/App.vue:340-343` | 未解決参照table headers。 |
| MNT-034 | Affected workout table headers: `Workout` / `行` / `メッセージ` | `src/frontend/maintenance-vue/src/App.vue:347-349` | unresolved detail/resolve dialog内table headers。 |
| MNT-035 | `IDは必須です。` | `src/frontend/maintenance-vue/src/App.vue:355` | Master dialog validation error。 |
| MNT-036 | `IDはすでに存在します。` | `src/frontend/maintenance-vue/src/App.vue:356` | Master dialog duplicate ID validation error。 |
| MNT-037 | `マスターデータを読み込めませんでした。設定情報と同期状態を確認してください。` | `src/frontend/maintenance-vue/src/App.vue:384` | Master/unresolved initial load失敗時alert。 |
| MNT-038 | `メインジムは削除できません。` | `src/frontend/maintenance-vue/src/App.vue:484` | main gym削除をUI側で止めるerror message。 |
| MNT-039 | `無効または削除済みのジムはメインジムにできません。` | `src/frontend/maintenance-vue/src/App.vue:500` | inactive/deleted gymをmainにしようとした場合。 |
| MNT-040 | `保存しました。` | `src/frontend/maintenance-vue/src/App.vue:562` | Master保存成功alert。 |
| MNT-041 | `メインジムを更新しました。` | `src/frontend/maintenance-vue/src/App.vue:600` | main gym更新成功alert。 |
| MNT-042 | `ほかの更新が先に反映されています。画面を再読み込みしてから再度操作してください。` | `src/frontend/maintenance-vue/src/App.vue:667` | `MASTER_WRITE_CONFLICT`用user-facing error。 |
| MNT-043 | `Application Settingsで同期してから再度操作してください。` | `src/frontend/maintenance-vue/src/App.vue:670` | `MASTER_SYNC_REQUIRED`用user-facing error。 |
| MNT-044 | `入力内容を保存できませんでした。マスター情報の内容を確認してください。` | `src/frontend/maintenance-vue/src/App.vue:672-673` | `MASTER_WRITE_INVALID` / `RUNTIME_DATA_INVALID`用user-facing error。 |
| MNT-045 | `設定情報が未完了です。Application Settingsを確認してください。` | `src/frontend/maintenance-vue/src/App.vue:675-676` | `CONFIGURATION_REQUIRED`用user-facing error。 |
| MNT-046 | `GitHub Tokenを確認してください。` | `src/frontend/maintenance-vue/src/App.vue:678-679` | credential/GitHub authorization系error mapping。 |
| MNT-047 | `必要なマスターリソースが見つかりません。設定情報と同期対象を確認してください。` | `src/frontend/maintenance-vue/src/App.vue:681-682` | `GITHUB_RESOURCE_NOT_FOUND`用user-facing error。 |
| MNT-048 | `GitHubとの通信に失敗しました。時間をおいて再度実行してください。` | `src/frontend/maintenance-vue/src/App.vue:684-685` | GitHub timeout/connection/rate/server系error mapping。 |
| MNT-049 | `マスターデータを保存できませんでした。設定情報と同期状態を確認してください。` | `src/frontend/maintenance-vue/src/App.vue:688` | Master write unknown error fallback。 |
| MNT-050 | `${recordId} - ${record.name}` | `src/frontend/maintenance-vue/src/App.vue:314` | unresolved resolve先selectのoption表示template。record.nameはMaster Data由来の動的値。 |
| MNT-051 | Body Part option labels | `src/frontend/maintenance-vue/src/App.vue:241-242` / `formatBodyPart()` | Machine body_part選択肢。表示名は共通`formatBodyPart()`。 |

