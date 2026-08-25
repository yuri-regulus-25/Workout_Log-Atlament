# Android Application Load Map

## 目的

Workout Log Atlament の Android Application 着手にあたり、Android MVPからリリースまでの手順、現時点でユーザーが決めるべき仕様不足点、ユーザー側で生成・準備するものを整理する。

作業ブランチ:

```text
feature-android-application
```

## 現時点の前提

既存設計上、AndroidはMVP対象である。

確定済みの上位方針:

- Windows / AndroidでAF外部仕様を共通化する。
- Common JS / FrontendはOS差異を理由に変更しない。
- Android固有差異はAndroid Host / Android Platform Adapterへ閉じ込める。
- HTTP API Contract、Runtime Data Contract、Frontend ArtifactはWindows AFと同一にする。
- Frontend ArtifactはAPK / AABのpackage assetsへ同梱する。
- AndroidではWindowsの「exe横data」を模倣しない。
- Configuration / Runtime DataはAndroid Application Internal Storageへ保存する。
- CredentialはAndroid Secure Storageを使う。
- LogはAndroid Application-owned SQLiteを使う。
- MVPではFrontend ArtifactをInternal Storageへ展開する仕組みは作らない。

現在の実装状態:

- Windows AFはDevelop Done扱い。
- Frontend Common / Branding / Character Easter Eggは対象Frontendへ展開済み。
- Windows x64単体exe配布Buildは完了済み。
- Android Application SourceはPhase Bで骨格作成済み。
- `src/application/android/` は作成済み。
- Phase AのAndroid仕様確定は完了。
- Phase Bの実機起動確認は完了。
- Android Studio日本語化は任意。IntelliJ IDEA依存の案内が出たため、現時点では保留。
- Phase C localhost HTTP Server / status API / packaged frontend hosting の実機疎通確認は完了。
- Settings画面の実機表示確認は完了。
- Repository情報の保存・読込の実機確認は完了。
- Credential保存・状態読込の実機確認は完了。
- Manual SyncのGitHub取得・Runtime保存の最小実装はビルド確認済み。

## リリースまでの推奨手順

### Phase A: Android仕様確定

目的:

- 実装開始前に、Architectureを左右する未確定事項を人間判断で確定する。

作業:

1. Android実装技術を確定する。
2. Android minSdk / targetSdkを確定する。
3. package name / applicationIdを確定する。
4. app表示名を確定する。
5. Android icon / adaptive icon方針を確定する。
6. 配布形式を確定する。
7. localhost HTTP Server方式を確定する。
8. WebView実装方針を確定する。
9. Secure Storage方式を確定する。
10. GitHub token入力 / 保存 / 削除のAndroid UXを確認する。

完了条件:

- `src/application/android/` のProject構成を作れる程度に仕様が確定している。
- 設計書と矛盾する判断がない。

### Phase B: Android Project骨格作成

目的:

- Android Applicationの最小起動Projectを作成する。

作業:

1. `src/application/android/` を作成する。
2. Android build systemを導入する。
3. Android Application entry pointを作成する。
4. WebViewを表示する最小Activityを作成する。
5. package assetsからFrontend Artifactを読み出す準備を行う。
6. Android用READMEを作成する。

完了条件:

- Android Project単体でDebug Buildできる。
- 空または最小PortalをWebViewへ表示できる。

### Phase C: Android AF Host / Platform Adapter実装

目的:

- Windows AFと同じAF外部仕様をAndroid上で提供する。

作業:

1. Android Hostを実装する。（localhost HTTP Server骨格は着手済み）
2. localhost HTTP Serverを起動する。（Primary 14108 / Secondary 45194 の起動処理は着手済み）
3. `/api/v1/common/` API routeを実装する。（status / configuration / credential status / sync / runtime workouts の最小スタブは着手済み）
4. packaged frontend assetsのHostingを実装する。（dist同期とassets配信は着手済み）
5. Android Internal Storage Providerを実装する。（configuration保存/読込の最小実装は着手済み）
6. Android Secure Storage Adapterを実装する。（GitHub token保存/状態読込の最小実装は着手済み）
7. Android SQLite Loggingを実装する。
8. Startup / Shutdown / LifecycleをAndroid Activity lifecycleへ接続する。

完了条件:

- Android上でPortalがWebView表示される。
- `/dashboard/`、`/workouts/`、`/exercises/`、`/analytics/`、`/settings/` がHostingされる。
- Runtime API / Settings APIの基本疎通が成立する。

### Phase D: Configuration / Credential / GitHub Sync移植

目的:

- SettingsからAndroid AFの設定・Credential・Syncを操作できる状態にする。

作業:

1. ConfigurationをInternal Storageへ保存・読込する。
2. GitHub tokenをSecure Storageへ保存・読込する。
3. GitHub AccessをAndroidから実行する。（Contents / Raw APIによる最小取得は着手済み）
4. Root Path + Resource Path解決をWindows AFと同一規則にする。
5. Manual Syncを実装する。（取得データをRuntime JSONとしてInternal Storageへ保存する最小実装は着手済み）
6. Startup Syncを起動時1回実行する。
7. Runtime DataをInternal Storageへ保存する。（files + masterData形式の保存は着手済み）
8. Local Fallbackを実装する。

完了条件:

- SettingsでRepository / Resources / Timeout / Credentialを保存できる。
- Manual SyncでRuntime Dataを生成できる。
- 再起動後も設定とCredentialが維持される。

### Phase E: Frontend統合確認

目的:

- 既存Frontendを変更せず、Android AF上で同一API Contractにより動作させる。

確認対象:

- Portal
- Dashboard
- Workouts
- Exercises
- Analytics
- Settings
- Error Pages
- frontend-common assets
- Branding
- Character Easter Egg

完了条件:

- Android WebView上で各画面が表示できる。
- JS / CSS / favicon / font / frontend-common assetsが取得できる。
- Manual Sync後にDashboard / Workouts / Exercises / Analyticsが最新Runtime Dataを表示する。
- Settingsから設定保存、Credential保存、Manual Syncができる。

### Phase F: Android ST

目的:

- Windows AFで実施したST相当をAndroidで確認する。

確認項目:

1. 完全初期起動。
2. 初期設定不足通知。
3. Settings直接表示。
4. Repository / Resources / Timeout保存。
5. GitHub token保存。
6. Manual Sync。
7. Startup Sync。
8. Dashboard / Workouts / Exercises / Analytics表示。
9. Master Resolve Failure / Session Reject表示。
10. Network failure時のLocal Fallback。
11. アプリ終了 / 再起動。
12. CredentialがUI / Log / Frontend Storageへ露出しないこと。

完了条件:

- STで重大NGがない。
- 残Warningと制約事項が整理済み。

### Phase G: Android Release Build

目的:

- 配布可能なAndroid Artifactを生成する。

作業:

1. release signing設定を行う。
2. versionCode / versionNameを設定する。
3. Release Buildを実行する。
4. APKまたはAABを生成する。
5. 実機へinstallして動作確認する。
6. READMEにAndroid製造・署名・配布手順を追記する。

完了条件:

- Release APK / AABが生成できる。
- 署名済みArtifactを実機で起動できる。
- GitHub Syncから各Frontend表示まで通る。

### Phase H: Release前最終Validation

実行・確認候補:

```sh
npm ci
npm test
npm run build
npm run check:mpa
npm run build:windows
dotnet build src/application/windows/Atlament.sln
dotnet test src/application/windows/Atlament.sln
# Android build commandはProject作成後に確定
```

Android確認:

- Debug Build
- Release Build
- 実機install
- 初回起動
- Settings
- GitHub Manual Sync
- Startup Sync
- Dashboard
- Workouts
- Exercises
- Analytics
- app終了 / 再起動

完了条件:

- Windows既存機能にRegressionがない。
- Android MVPが設計上の完了条件を満たす。
- READMEと実装手順が一致している。

## Phase A 確定仕様

### 1. Android実装技術

採用:

- Native Android Kotlin

理由:

- Android Application固有Storage、Keystore、SQLite、WebView、LifecycleをPlatform標準で扱いやすい。
- Windows AFと同じ外部HTTP Contractを保ちながら、内部実装はAndroid Platform Adapterへ閉じ込めやすい。

Core実装方針:

- WindowsはC# Coreを継続する。
- AndroidはKotlinで実装する。
- AF外部仕様、HTTP API Contract、Runtime Data Contract、Error ContractはWindows / Androidで共通化する。

### 2. Android build system

採用:

- Gradle Kotlin DSLを使用する。
- root `package.json` には後続Phaseで `build:android` などの入口を追加する。

### 3. package name / applicationId

採用:

- `jp.yuri_regulus_25.atlament`

### 4. app表示名

採用:

- Launcher / Android設定画面上の表示名は `Atlament`。

### 5. minSdk / targetSdk

採用:

- 実機対象はAndroid 13。
- minSdkはAndroid 10 (API 29)。
- targetSdkは現在のAndroid Studio推奨値に合わせる。

### 6. 配布形式

採用:

- MVP/STはDebug APKまたは署名済みRelease APKで確認する。
- 公開配布を考える段階でAABを追加する。
- 配布順序は Debug APK -> Release APK -> 将来的にAAB。

### 7. Android localhost HTTP Server方式

採用:

- Android Application内 localhost HTTP Server方式を使う。
- Androidも `127.0.0.1:14108` をPrimary、`127.0.0.1:45194` をSecondaryとして開始する。
- Port競合時の挙動はWindows AFと同等にする。

### 8. Android WebView UX

採用:

- BackボタンはWebView履歴があればWebView back、履歴がなければ通常終了する。
- RotationはPortrait固定とする。
- 外部URLはGitHub token作成など必要最小限のみ外部ブラウザへ委譲する。

### 9. Credential削除 / 再設定UX

採用:

- 初回MVPではWindows AFの正式API Contractに合わせる。
- Token削除APIが設計上未定義なら追加しない。

### 10. Frontend Artifact

採用:

- 既存Frontendは変更しない。
- `npm run build` 成果物を利用する。
- Android package assetsへ同梱する。
- Runtimeで外部dist参照しない。

### 11. Android Icon

採用:

- Primary Logo SVGをAndroid用Assetとして複製する。
- Adaptive Icon生成はAndroid Studio Image Assetを利用する。
- 詳細調整はPreview確認後に行う。

### 12. Error Pages

採用:

- Android固有導線は追加しない。

## Phase A 保留事項

### Android Release署名情報の管理

未確定:

- keystoreをRepository外管理にするか。
- CIで署名するか、ローカル手動署名にするか。
- key alias / password管理方法。

管理方針:

- keystoreはRepository外に置く。
- パスワードは環境変数またはローカル未追跡設定で扱う。
- Repositoryへ秘密情報を含めない。
- Debug APK作成には影響させない。

## 現時点でユーザー側で生成・準備するもの

### 1. Android開発環境

必要なもの:

- Android Studio
- Android SDK
- Android Platform Tools
- JDK
- 実機またはEmulator

手順:

1. Android Studioをinstallする。
2. Android SDK Managerで対象SDKをinstallする。
3. `adb` が使えることを確認する。
4. 実機の場合はDeveloper OptionsとUSB Debuggingを有効化する。
5. RepositoryでAndroid build commandが確定した後、Debug Buildを実行する。

確認コマンド例:

```sh
adb devices
```

### 2. Android Application Icon素材

必要なもの:

- adaptive icon foreground
- adaptive icon background
- launcher icon用素材

元にするもの:

- 既存のAtlament Primary Logo

ユーザー作業:

1. Primary Logo SVGをAndroid用Assetとして複製する。
2. Android StudioのImage Asset機能でadaptive iconを生成する。
3. Preview確認後に必要な詳細調整を行う。

Android Studioでの生成手順候補:

1. Android Project作成後、`app` moduleを右クリック。
2. `New` → `Image Asset` を選択。
3. Icon Typeに `Launcher Icons (Adaptive and Legacy)` を選択。
4. Foreground LayerへLogo Assetを指定。
5. Background Layerの色を指定。
6. 生成される `mipmap-*` / `drawable-*` を確認する。

注意:

- まだAndroid正式Projectがないため、現時点では生成先が未確定。
- 生成AssetはProject作成後にRepositoryへ配置する。

### 3. Android release keystore

必要なもの:

- Release署名用keystore
- key alias
- store password
- key password

生成手順例:

```sh
keytool -genkeypair \
  -v \
  -keystore atlament-release.keystore \
  -alias atlament \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

管理方針:

- `atlament-release.keystore` はRepositoryへcommitしない。
- password類もRepositoryへcommitしない。
- ローカル環境変数、または未追跡のlocal propertiesで管理する。

注意:

- keytoolの実行場所と保存場所はユーザーが管理する。
- 紛失すると同じ署名で更新配布できなくなるため、バックアップ必須。

### 4. GitHub Fine-grained Personal Access Token

必要なもの:

- 対象RepositoryへのRead access
- Contents: Read-only
- Metadata: Read-only

手順:

1. GitHubのPersonal Access Token画面を開く。
2. Fine-grained tokenを作成する。
3. Repository accessで対象Repositoryを選択する。
4. Permissionsで `Contents: Read-only` を付与する。
5. `Metadata: Read-only` はGitHub側で必須付与される。
6. 生成したTokenをAndroid Settings画面から登録する。

注意:

- TokenはAndroid Secure Storageへ保存する。
- UI / Log / Frontend Storageへ平文表示しない。
- Windows用Tokenを流用するかAndroid用に分けるかはユーザー判断。

### 5. Android実機 / Emulator

必要なもの:

- 実機、またはEmulator
- ネットワーク接続
- WebViewが利用可能な環境

確認観点:

- localhost HTTP Server起動。
- Android WebViewでPortal表示。
- GitHubへHTTPS通信可能。
- Storage / Secure Storage / SQLiteが利用可能。

### 6. 配布先方針

決めるもの:

- 手動配布APKでよいか。
- Google Play Consoleへ登録するか。
- 内部テスト配布を使うか。

ユーザー作業:

1. MVP/STでは手動installでよいか決める。
2. Google Play配布する場合はDeveloper Accountを準備する。
3. AAB提出に必要なアプリ情報、スクリーンショット、プライバシー情報を準備する。

## Android実装で守る境界

Android Host:

- Android Application Lifecycle
- Activity / WebView
- Android localhost HTTP Server起動・終了制御
- Android固有Permission / Storage / Secure Storage接続

Android AF Core / Common相当:

- Configuration論理処理
- Credential論理処理
- GitHub Access
- Runtime Data生成
- Validation
- Master Resolve
- API Response Envelope
- Error Contract

Frontend:

- 既存Frontendを再生成しない。
- OS固有処理へ直接アクセスしない。
- AF API経由でRuntime Data / Settings / Syncを利用する。

Platform Adapter:

- Android Storage
- Android Secure Storage
- Android SQLite
- packaged assets read
- Network / lifecycle固有処理

## 最初にやるべき作業

1. ユーザーがAndroid実装技術を確定する。
2. ユーザーがpackage name / app表示名 / minSdk / targetSdk / 配布形式を確定する。
3. `src/application/android/` のProject骨格を作成する。
4. `npm run build` の `dist/` をAndroid package assetsへ取り込むBuild Flowを作る。
5. Android WebViewでPortalを表示する。
6. Android localhost HTTP Serverから埋め込みFrontendを配信する。
7. Windows AFと同じAPI Contractを順に移植する。

## 現時点の推奨判断

推奨案:

- 実装技術: Native Android Kotlin
- build system: Gradle Kotlin DSL
- app表示名: Atlament
- package name: ユーザー所有Namespaceで決定
- 配布形式: まずDebug APK / 署名済みRelease APK、公開段階でAAB
- Frontend Artifact: `npm run build` の `dist/` をAPK assetsへ同梱
- Runtime Storage: Android Internal Storage
- Credential: Android Keystoreを利用したSecure Storage
- Logging: Android Application-owned SQLite
- Port: Windows AFと同じ `14108` primary / `45194` secondary

## 残る人間判断事項

1. Android実装技術をNative Kotlinで進めてよいか。
2. Android package name / applicationId。
3. app表示名。
4. minSdk / targetSdk。
5. 配布形式をAPK MVPから始めるか、AABまで初回Release対象にするか。
6. Android launcher iconを既存Primary Logoから生成してよいか。
7. release keystoreの管理場所と署名方式。
8. Android Backボタン / 画面回転 / 外部URL遷移のMVP仕様。
9. Windows AFのC# Core実装をAndroidへどこまで移植するか、またはKotlinで同一Contract実装とするか。
10. Error PagesへAndroid固有の戻る導線を追加しない方針でよいか。

## 現時点の未着手項目

- `src/application/android/` 作成。
- Android Project / Gradle導入。
- Android WebView Shell。
- Android localhost HTTP Server。
- Android packaged frontend hosting。
- Android Configuration Store。
- Android Secure Credential Store。
- Android GitHub Access。
- Android Runtime Data Store。
- Android SQLite Logging。
- Android Unit / Instrumentation Test。
- Android Debug / Release Build command。
- Android README。

