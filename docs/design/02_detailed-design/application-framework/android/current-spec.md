# Android Application Framework 現行仕様

## Architecture

Android AF は `src/application/android/` 配下に実装される。

現行の主要 component:

- `app/src/main/java/jp/yuri_regulus_25/atlament/MainActivity.kt`
- `app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt`
- Gradle project files under `src/application/android/`

`MainActivity` は Android WebView を作成し、localhost server を起動し、server base URL を load する。

## WebView

現行 WebView setup:

- JavaScript enabled
- DOM storage enabled
- user agent suffix `AtlamentAndroidWebView`
- external `http` / `https` URL は app 外で開く
- local file、localhost、`127.0.0.1` URL は WebView 内に留まる
- Android back button は可能な場合 WebView history を戻る

## Localhost Server

Android は `127.0.0.1` に bind された in-app HTTP server を使用する。

Port order:

```text
14108
45194
```

現行 server は Kotlin で `ServerSocket` を直接使用して実装される。

## Storage

Android は runtime data と configuration を app-owned internal storage 配下に保存する。

```text
files/
├─ configuration/af-settings.json
├─ runtime/current/runtime-workouts.json
└─ log/atlament-log.sqlite
```

Credential data は Android Keystore backed encryption を使用して Android `SharedPreferences` に保存される。

## Frontend Hosting

Frontend artifact は APK assets 配下に package される。

```text
assets/frontend/
```

Current known app name:

```text
dashboard
workouts
machines
analytics
settings
maintenance
```

Portal は `frontend/index.html` から serve される。

Android は以下も serve する。

- `frontend/404.html`
- `frontend/500.html`
- `frontend/503.html`
- `frontend/error.css`
- `android/logo_svg_primary.svg`

Dynamic frontend route fallback は以下にのみ存在する。

- `workouts/YYYY-MM-DD`
- `machines/<id>`

## API

Android は以下を map する。

- `/api/v1/common/*`

[AF API Contract](../api-contract.md) を参照。

Unknown API route は現行 Android implementation では JSON 501 response を返す。

## Runtime Data

Android は GitHub resource を fetch し、Master file と Workout file を parse し、normalized runtime data を app internal storage へ write する。

現行 implementation は required raw field を validate し、Master direct reference と Master `source_ids` reference を `resolved` / `missing` / `deleted` に分類する。`source_ids` で解決できた場合、normalized runtime ID は canonical Master ID になり、`resolution.originalId` は raw Workout reference ID を保持する。Invalid runtime build は reject するが、missing/deleted Master reference は Runtime warning として報告し、session は Runtime Data として accept する。Normalized session は `/api/v1/common/runtime/workouts` 経由で公開する。

Runtime readiness、fallback、required actions、unresolved Master reference の共通意味論は [Runtime Contract Matrix](../runtime-contract-matrix.md) を正とする。

## Resource Management API

Android は Windows と同じ Resource Management endpoint を公開する。`/master-write/boundary` は fixed target と write security state を返す。`/master-write/documents/{type}` の GET は Runtime Data 内の Local Master snapshot を返し、Remote Master body を表示用に独自 read しない。Local Master snapshot がない場合は `MASTER_SYNC_REQUIRED` を返す。

Write は Local Master snapshot revision と request `expectedRevision` の一致、candidate whole-master validation、Remote revision metadata の一致、fixed human commit message、GitHub Contents API PUT、Local Runtime Data rebuild を適用する。Runtime Data が参照中の Gym/Machine logical delete は許可し、Workout/raw/general Git write endpoint は公開しない。

`/master-write/unresolved` は Local Runtime Data の Runtime warning から unresolved references を生成する。Raw Workout JSON は更新しない。

## Recovery API

Android は Windows / Node / frontend-common と同じ `/api/v1/common/recovery/*` public endpoint set を公開する。Recovery inventory/detail/source/draft/validate は Workout Resource の current remote data と AF-local draft store を使う。Raw JSON write、arbitrary path write、generic Git write、bulk recovery は公開しない。

Android の Recovery Git commit は eligible な Broken Workout Resource に対して利用可能であり、`RecoveryCapabilities.commit` は eligibility に従って `true` になる。`POST /recovery/resources/{resourceKey}/commit` は source revision、draft revision、whole Resource validation を再確認した後に write を実行する。同一 path の replacement は GitHub Contents API、path relocation は追加と削除を 1 commit にまとめる GitHub GraphQL API を使用し、成功後に re-inspection、Runtime rebuild、local reflection を試行する。

`RECOVERY_UNAVAILABLE` は Recovery write boundary を安全に提供できない runtime で使用する共通 error codeであり、現行 Android実装の Recovery commit を一律 unavailable とするものではない。FrontendへRaw replacement content、任意path、任意commit message、force update、automatic mergeは公開しない。

Status は `runtimeData.quarantinedWorkoutResourceCount` と `recovery.*` facts を公開する。Workout quarantine は Runtime usable + readiness degraded であり、whole-runtime LKG fallback の `fallbackActive` とは別事象である。

## Version and Packaging

Android version metadata は `src/application/android/app/build.gradle.kts` にある。

- `versionName`
- `versionCode`

`tools/build/copy-android-frontend.mjs` は `dist/` を Android frontend assets へ copy する。`tools/build/build-android.mjs` は debug APK を build する。`tools/build/build-android-release.mjs` は environment variable または local properties から供給される signing credential を使用して release APK を build する。

現行 source は AAB generation または Play Store distribution を実装していない。
