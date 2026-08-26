# Atlament Android Application

このディレクトリには、Atlament Android版のNative Android Kotlinプロジェクトを配置する。

## 現在の実装範囲

- Native Android Kotlinアプリケーション。
- Gradle Kotlin DSL構成。
- `applicationId`: `jp.yuri_regulus_25.atlament`。
- `minSdk`: Android 10 (API 29)。
- `targetSdk`: 35。
- 端末回転を許容する `MainActivity` とWebView shell。
- アプリ内localhost HTTP Server。
  - Primary: `127.0.0.1:14108`
  - Secondary: `127.0.0.1:45194`
- packaged frontend assetsの配信。
- Status APIでpackaged frontend assetsのHosting状態を返す。
- AF common APIの最小実装。
  - `/api/v1/common/status`
  - `/api/v1/common/configuration`
  - `/api/v1/common/credential/status`
  - `/api/v1/common/credential`
  - `/api/v1/common/sync`
  - `/api/v1/common/runtime/workouts`
- ConfigurationのAndroid Internal Storage保存・読込。
- GitHub tokenのAndroid Keystore暗号化保存・状態読込。
- Manual Syncの最小実装。
  - 設定済みGitHub repositoryからresourcesを取得する。
  - Runtime workout dataをAndroid Internal Storageへ保存する。
- Startup Syncの最小実装。
  - 起動時にConfiguration / Credentialが利用可能な場合、GitHub同期をバックグラウンドで実行する。
  - Startup Sync中はStatus APIの `operations.startup` が `running` になる。
- Local Fallbackの最小実装。
  - Remote同期に失敗しても保存済みRuntime Dataがある場合は `source: local` として継続する。
  - PortalではGitHub degraded + Runtime Data available時にLocal Fallback警告を表示する。
- Android Application-owned SQLite Logの最小実装。
  - `filesDir/log/atlament-log.sqlite` にAF operation logを保存する。
- Primary Logo SVGのAndroid用Asset複製。
- Release APK Build Flow。
  - `npm run build:android:release` で署名済みRelease APKを生成する。
  - Release keystoreは `app/signing/atlament-release.jks` を使用する。
  - 署名passwordは環境変数または未追跡 `local.properties` から読み込む。

## Android Studioで開く

Android Studioでは、Repository rootではなく次のディレクトリをAndroid projectとして開く。

```text
src/application/android
```

開いた後にGradle Syncを実行し、通常のDebug実行で端末へインストールする。

## コマンドラインビルド

Repository rootからfrontend assetsを再生成してAndroidへ同期し、Debug APKを生成する。

```powershell
npm run build:android
```

Android project directoryで直接Gradleを実行する場合は次を使う。

```powershell
cd src\application\android
.\gradlew.bat :app:assembleDebug
```

## Release APK

MVP配布形式はAPKで確定。AABとGoogle Play配布は今回対象外とする。

Release署名は次の優先順で読み込む。

1. 環境変数
2. `src/application/android/local.properties`

利用する環境変数:

```powershell
$env:ATLAMENT_RELEASE_STORE_FILE = "app/signing/atlament-release.jks"
$env:ATLAMENT_RELEASE_STORE_PASSWORD = "<store password>"
$env:ATLAMENT_RELEASE_KEY_ALIAS = "atlament"
$env:ATLAMENT_RELEASE_KEY_PASSWORD = "<key password>"
```

`local.properties` を使う場合のキー:

```properties
atlament.release.storeFile=app/signing/atlament-release.jks
atlament.release.storePassword=<store password>
atlament.release.keyAlias=atlament
atlament.release.keyPassword=<key password>
```

`local.properties` はRepositoryへcommitしない。Release APKはRepository rootから次で生成する。

```powershell
npm run build:android:release
```

生成先:

```text
src/application/android/app/build/outputs/apk/release/app-release.apk
```

署名確認例:

```powershell
apksigner verify --verbose --print-certs src/application/android/app/build/outputs/apk/release/app-release.apk
```

## Frontend assets

Android APKへ同梱するfrontend assetsは次に配置する。

```text
src/application/android/app/src/main/assets/frontend
```

このディレクトリは `npm run build:android` 実行時にRepository rootの `dist/` から同期される。`build:android` は同期前に `npm run build` を実行し、frontend source変更を反映する。

## 実機スモーク確認

アプリ起動後、WebViewまたは端末ブラウザから次のURLを確認する。

```text
http://127.0.0.1:14108/api/v1/common/status
```

Primary portが利用できない場合はSecondary portへfallbackする。

```text
http://127.0.0.1:45194/api/v1/common/status
```

Settings画面では次を確認する。

- Repository設定を保存できる。
- GitHub tokenを保存できる。
- `Sync immediately` でRuntime Dataを取得できる。
- Remote同期失敗時、保存済みRuntime DataがあればLocal Fallbackで継続する。
- 再起動後、Startup Syncが実行される。
- status上でConfiguration / Credential / Runtime Dataが利用可能になる。
- status上でPortal / Dashboard / Workouts / Exercises / Analytics / SettingsのHostingが利用可能になる。

## 未完了事項

- GitHub accessのエラー表示・再試行制御の強化。
- Windows AFと同等のRuntime Data validation / build parity。
- SQLite Logの閲覧・export・rotation。
- Android Unit / Instrumentation Test。


