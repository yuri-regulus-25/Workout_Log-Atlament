# Android Application Framework 現行仕様と設計方針

## Architecture

Android AF は `src/application/android/` 配下に実装する。

現行主要 component:

- `app/src/main/java/jp/yuri_regulus_25/atlament/MainActivity.kt`
- `app/src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt`
- Gradle project files under `src/application/android/`

`MainActivity` は Android WebView を作成し、localhost server を起動して Frontend を読み込む。

## Platform Boundary

Android 固有実装は OS / Native runtime に依存する責務へ限定する。

Android 固有でよい例:

- WebView / Activity lifecycle
- `ServerSocket` host wiring
- Android `filesDir` 等の physical root 解決
- Android Keystore credential protection
- Android filesystem primitive
- APK / signing / packaging

Resource Inspection、Runtime 採用規則、Recovery state transition、Validation、API DTO / error semantics、Git write policy 等は Android 独自仕様にしない。

## WebView

現行 setup:

- JavaScript enabled
- DOM storage enabled
- user agent suffix `AtlamentAndroidWebView`
- external `http` / `https` URL は app 外で開く
- local file、localhost、`127.0.0.1` URL は WebView 内
- back button は可能なら WebView history を戻る

## Localhost Server

Android は `127.0.0.1` に bind した in-app HTTP server を使用する。

```text
14108
45194
```

現行 server は Kotlin `ServerSocket` の直接実装。

## Storage

現行 Android は app internal storage を使用する。

```text
files/
├─ configuration/af-settings.json
├─ runtime/current/runtime-workouts.json
├─ recovery/drafts/
└─ log/atlament-log.sqlite
```

Credential data は Android Keystore-backed encryption と SharedPreferences を使用する。

Recovery Draft の共通論理パス:

```text
recovery/drafts/{resourceKey}.json
```

`files/` は Android physical root であり、共通ロジックへ Platform 固有 prefix として漏らさない。

## Frontend Hosting

Frontend artifact は APK assets 配下へ package する。

```text
assets/frontend/
```

Known app:

```text
dashboard
workouts
machines
analytics
settings
maintenance
```

Portal は `frontend/index.html`。Error page と Android logo asset も package する。

Dynamic route fallback:

- `workouts/YYYY-MM-DD`
- `machines/<id>`

## API

Android は `/api/v1/common/*` を公開し、[AF API Contract](../api-contract.md) を正とする。

現行 implementation は unknown API route に JSON 501 を返すが、これは **404 へ統一する修正対象**である。

`GITHUB_RATE_LIMIT` を共通 stable error code とし、Android 固有の `GITHUB_RATE_LIMITED` は共通契約へ統一する。

## Runtime Data

Android は GitHub Resource を取得し、Master / Workout を parse・normalize して Runtime Data を app internal storage へ保存する。

v2.1.0 以降の共通契約:

- Broken Workout Resource は Resource 単位で隔離する。
- 他の Workout Resource は継続採用できる。
- Broken Master Resource は新 Runtime adoption を停止する。
- whole-runtime LKG があれば fallback、なければ unavailable。
- unresolved Master reference 単独では fallback を発火しない。
- Workout Resource 0 件を正常な初期状態として扱う変更は v2.2.0 で反映する。

共通意味論は [Runtime Contract Matrix](../runtime-contract-matrix.md) を正とする。

## Resource Management API

Android は Windows と同じ `/master-write/*` contract を公開する。

GET は Local Master snapshot を使用する。Write は revision、whole-master validation、Remote revision を確認し、用途限定 Git write を行う。

Raw Workout / Generic Git write endpoint は公開しない。

## Recovery

Android Recovery も Windows と同じ論理責務へ分離する。

Android は Windows / Node / frontend-common と同じ `/api/v1/common/recovery/*` public endpoint set を公開する。Recovery inventory/detail/source/draft/validate は Workout Resource の current remote data と AF-local draft store を使う。Raw JSON write、arbitrary path write、generic Git write、bulk recovery は公開しない。

Android の Recovery Git commit は eligible な Broken Workout Resource に対して利用可能であり、`RecoveryCapabilities.commit` は eligibility に従って `true` になる。`POST /recovery/resources/{resourceKey}/commit` は source revision、draft revision、whole Resource validation を再確認した後に write を実行する。同一 path の replacement は GitHub Contents API、path relocation は追加と削除を 1 commit にまとめる GitHub GraphQL API を使用し、成功後に re-inspection、Runtime rebuild、local reflection を試行する。

`RECOVERY_UNAVAILABLE` は Recovery write boundary を安全に提供できない runtime で使用する共通 error codeであり、現行 Android実装の Recovery commit を一律 unavailable とするものではない。FrontendへRaw replacement content、任意path、任意commit message、force update、automatic mergeは公開しない。

Status は `runtimeData.quarantinedWorkoutResourceCount` と `recovery.*` facts を公開する。Workout quarantine は Runtime usable + readiness degraded であり、whole-runtime LKG fallback の `fallbackActive` とは別事象である。

```text
ResourceInspector
RecoveryService
RecoveryDraftStore
RecoveryValidator
RecoveryReplacementBuilder
RecoveryGitWriter
Sync / RuntimeBuilder
```

Kotlin で実装することは Platform 固有の理由ではあるが、Recovery の意味論を独自化する理由にはしない。共通 fixture / test vector / contract test により Windows と同じ結果を保証する。

### Same-path replacement

Same-path replacement は Contents API PUT を使用できる。

### Path relocation

Recovery contract は old path delete + new path create を **1 atomic Git commit** で要求する。

v2.1.0 UT では Android implementation が path relocation commit に対して 503 `RECOVERY_WRITE_FAILED` / `Android Recovery relocation commit is unavailable in this build.` を返すことを確認した。

これは許容する Platform 差ではなく、Release 前 correctness blocker である。Sequential delete/create で代替してはならず、Git Data API 等の atomic commit primitive を Android `RecoveryGitWriter` に実装する。

### Reflection

Git success 後は re-inspection / Runtime rebuild を試行する。Reflection failure で Git を rollback せず、`RECOVERY_REFLECTION_FAILED` と「保存済み・反映失敗」の状態を返せるようにする。

## Configuration / Credential

`required` / `emptyAllowed` を利用者設定から廃止する方針は [AF API Contract](../api-contract.md) に従う。

Credential は Android Keystore-backed encryption を使用する。Token value は API response へ返さない。

## Version / Packaging

Android version metadata:

- `versionName`
- `versionCode`

`tools/build/copy-android-frontend.mjs` は `dist/` を Android Frontend assets へ copy する。`tools/build/build-android.mjs` は debug APK、`tools/build/build-android-release.mjs` は signing credential を使用して release APK を build する。

現行 source は AAB generation / Play Store distribution を実装していない。
