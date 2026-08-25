# Atlament Android Application

このディレクトリには、Atlament Android版のNative Android Kotlinプロジェクトを配置する。

## 現在の実装範囲

- Native Android Kotlinアプリケーション。
- Gradle Kotlin DSL構成。
- `applicationId`: `jp.yuri_regulus_25.atlament`。
- `minSdk`: Android 10 (API 29)。
- `targetSdk`: 35。
- Portrait固定の `MainActivity` とWebView shell。
- アプリ内localhost HTTP Server。
  - Primary: `127.0.0.1:14108`
  - Secondary: `127.0.0.1:45194`
- packaged frontend assetsの配信。
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
- Primary Logo SVGのAndroid用Asset複製。

## Android Studioで開く

Android Studioでは、Repository rootではなく次のディレクトリをAndroid projectとして開く。

```text
src/application/android
```

開いた後にGradle Syncを実行し、通常のDebug実行で端末へインストールする。

## コマンドラインビルド

Repository rootからAndroid用frontend assetsを同期し、Debug APKを生成する。

```powershell
npm run build:android
```

Android project directoryで直接Gradleを実行する場合は次を使う。

```powershell
cd src\application\android
.\gradlew.bat :app:assembleDebug
```

## Frontend assets

Android APKへ同梱するfrontend assetsは次に配置する。

```text
src/application/android/app/src/main/assets/frontend
```

このディレクトリは `npm run build:android` 実行時にRepository rootの `dist/` から同期される。
Frontend側を変更した場合は、先に `npm run build` で `dist/` を更新してから `npm run build:android` を実行する。

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
- status上でConfiguration / Credential / Runtime Dataが利用可能になる。

## 未完了事項

- GitHub accessのエラー表示・再試行制御の強化。
- Windows AFと同等のRuntime Data validation / build parity。
- Startup Sync。
- Android SQLite Logging。
- Release署名設定。
- Adaptive Iconの最終調整。
- Android Unit / Instrumentation Test。
