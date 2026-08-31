# Phase 11 User-facing Text Inventory - Application Settings

対象範囲: Application Settings Solid Appの固定表示文言、Setup/Required Actions、Status、Repository/Resource/Timeout/Credential/Sync操作、Credential期限表示。

| ID | Current Text | Location | Usage / Meaning |
|---|---|---|---|
| SET-001 | `Application Settings — Atlament` | `src/frontend/settings-solid/index.html:7` | Browser/WebView title。 |
| SET-002 | `利用可能` / `一部利用不可` / `期限切れ` / `未設定` / `初期設定未完了` / `利用不可` | `src/frontend/settings-solid/src/App.tsx:37-52` / `statusLabels` | AF status / credential stateの表示変換。未定義値は原文を表示。 |
| SET-003 | `設定を読み込めませんでした。` | `src/frontend/settings-solid/src/App.tsx:137,144` | 初期読込失敗message fallback。 |
| SET-004 | `設定を読み込みました。確認が必要です。` | `src/frontend/settings-solid/src/App.tsx:139` | 初期読込は成功したがAF errorsありの場合。 |
| SET-005 | `リポジトリ設定を保存し、接続を確認しました。` | `src/frontend/settings-solid/src/App.tsx:156` | Repository保存成功かつremote check済み。 |
| SET-006 | `リポジトリ設定を保存しました。` | `src/frontend/settings-solid/src/App.tsx:156` | Repository保存成功だがremote checkなし。 |
| SET-007 | `リポジトリ設定を保存できませんでした。` | `src/frontend/settings-solid/src/App.tsx:158` | Repository保存失敗。 |
| SET-008 | `リソース設定を保存しました。` / `リソース設定を保存できませんでした。` | `src/frontend/settings-solid/src/App.tsx:168-169` | Resource設定保存結果message。 |
| SET-009 | `タイムアウト設定を保存しました。` / `タイムアウト設定を保存できませんでした。` | `src/frontend/settings-solid/src/App.tsx:178-179` | Timeout設定保存結果message。 |
| SET-010 | `資格情報を更新しました。` / `資格情報を更新できませんでした。` | `src/frontend/settings-solid/src/App.tsx:196-197` | Credential更新結果message。 |
| SET-011 | `同期が完了しました。確認が必要です。` / `同期が完了しました。` / `同期に失敗しました。` | `src/frontend/settings-solid/src/App.tsx:206-207` | manual sync結果message。 |
| SET-012 | `操作に失敗しました。` | `src/frontend/settings-solid/src/App.tsx:221` | 操作catch時のfallback error。 |
| SET-013 | `処理中` | `src/frontend/settings-solid/src/App.tsx:284` | operation overlayのaccessibility label。 |
| SET-014 | `Atlament Settings` | `src/frontend/settings-solid/src/App.tsx:292` | Brand rowのaccessibility label。 |
| SET-015 | `Atlament / Application Settings` | `src/frontend/settings-solid/src/App.tsx:293` | 上部eyebrow / Easter Egg trigger。 |
| SET-016 | `Application Settings` | `src/frontend/settings-solid/src/App.tsx:296` | Page heading。 |
| SET-017 | `外の世界との繋がりを定める` / `この世界も、様々な世界と繋がっている` | `src/frontend/settings-solid/src/App.tsx:297` | Page lead text。 |
| SET-018 | `GitHub Repository Source` / `リポジトリ接続情報` | `src/frontend/settings-solid/src/App.tsx:317-318` | Repository設定section heading。 |
| SET-019 | `Save` | `src/frontend/settings-solid/src/App.tsx:321,352,398` | Repository / Resources / Timeouts保存button。 |
| SET-020 | `Owner` / `Repository` / `Branch` / `Data Root` | `src/frontend/settings-solid/src/App.tsx:326-335` | Repository設定field labels。 |
| SET-021 | `Resource Data` / `リソース情報` | `src/frontend/settings-solid/src/App.tsx:346-347` | Resource設定section heading。 |
| SET-022 | `Add` | `src/frontend/settings-solid/src/App.tsx:351` | Resource追加button。 |
| SET-023 | `Resource Type` / `Path` / `Data Type` | `src/frontend/settings-solid/src/App.tsx:359-367` | Resource設定field labels。 |
| SET-024 | `Required` | `src/frontend/settings-solid/src/App.tsx:374` | Resource required checkbox label。 |
| SET-025 | `Remove resource` | `src/frontend/settings-solid/src/App.tsx:380` | Resource削除buttonのaria-label/title。 |
| SET-026 | `Timeout Limits` / `タイムアウト設定` | `src/frontend/settings-solid/src/App.tsx:394-395` | Timeout設定section heading。 |
| SET-027 | `${label} (${min}-${max} sec) / ${description}` | `src/frontend/settings-solid/src/App.tsx:561` / `NumberField` | Timeout field label template。 |
| SET-028 | `GitHub Request` / `GitHub通信` | `src/frontend/settings-solid/src/App.tsx:401` | GitHub request timeout field label/description。 |
| SET-029 | `Sync Operation` / `同期処理` | `src/frontend/settings-solid/src/App.tsx:402` | Sync timeout field label/description。 |
| SET-030 | `General API` / `API通信` | `src/frontend/settings-solid/src/App.tsx:403` | General API timeout field label/description。 |
| SET-031 | `Shutdown` / `終了処理` | `src/frontend/settings-solid/src/App.tsx:404` | Shutdown timeout field label/description。 |
| SET-032 | `Credential - GitHub Token` / `資格情報 - GitHub Token` | `src/frontend/settings-solid/src/App.tsx:413-414` | Credential section heading。 |
| SET-033 | `設定済み` / `未設定` | `src/frontend/settings-solid/src/App.tsx:421` | Credential設定有無表示。 |
| SET-034 | `登録された情報は、システム内に保存されます。` | `src/frontend/settings-solid/src/App.tsx:422` | Credential保存に関するhelper text。 |
| SET-035 | `GitHub Token` / `Token Limit` / `Custom Limit Date` | `src/frontend/settings-solid/src/App.tsx:430-441` | Credential field labels。 |
| SET-036 | `Update` | `src/frontend/settings-solid/src/App.tsx:446` | Credential更新button。 |
| SET-037 | `Operations - Remote Data Sync` / `リモートデータ同期` | `src/frontend/settings-solid/src/App.tsx:454-455` | Sync操作section heading。 |
| SET-038 | `GitHubから最新データを取得します。` | `src/frontend/settings-solid/src/App.tsx:462` | Sync操作説明。 |
| SET-039 | `Initial Setup` / `セットアップ` | `src/frontend/settings-solid/src/App.tsx:482-483` | Setup assistant heading。 |
| SET-040 | `Status: Finish` / `Status: Not Finish` | `src/frontend/settings-solid/src/App.tsx:489` | Setup進捗summary。 |
| SET-041 | `Required Actions` | `src/frontend/settings-solid/src/App.tsx:508` | AF readiness requiredActions表示section。 |
| SET-042 | `設定情報の登録が必要です` / `GitHub Tokenの登録が必要です` / `データ同期が必要です` | `src/frontend/settings-solid/src/App.tsx:585-588` / `requiredActionLabel()` | AF requiredActionsの表示変換。 |
| SET-043 | `Application Framework Status` / `アプリケーション状況` | `src/frontend/settings-solid/src/App.tsx:525-526` | AF status section heading。 |
| SET-044 | `Application Framework Version` / `Frontend Framework Version` / `Readiness` / `Runtime Data` / `GitHub` | `src/frontend/settings-solid/src/App.tsx:531-535` | AF status item labels。 |
| SET-045 | `7 days` / `30 days` / `60 days` / `90 days` / `366 days` / `Custom` | `src/frontend/settings-solid/src/credential-expiry.ts:5-11` | Credential期限preset option labels。 |
| SET-046 | `期限未設定` | `src/frontend/settings-solid/src/credential-expiry.ts:33` | Credential期限なし/未設定表示label。 |
| SET-047 | `期限不明` / `既存Credentialに期限日が保存されていません。` | `src/frontend/settings-solid/src/credential-expiry.ts:41-42` | 既存CredentialにlimitDateがない場合。 |
| SET-048 | `期限切れ` / `${YYYY/MM/DD} に期限切れです。` | `src/frontend/settings-solid/src/credential-expiry.ts:49-50` | Credential期限切れ表示。 |
| SET-049 | `有効期限内` | `src/frontend/settings-solid/src/credential-expiry.ts:56` | Credential有効期限内表示label。detailは日付差分を含む。 |
| SET-050 | `トークン情報を登録してください` / `各種リソースは設定されています` / `各種リソースを設定してください` / `データ同期` / `GitHubからデータ取得しました` / `GitHubからデータを取得してください` | `src/frontend/settings-solid/src/setup-assistant.ts:62-111` | Setup assistant step label/detail。 |

