# Atlament v1.1.0 Current Source Specification

## 0. 文書目的

本書は `feature-release-1.1.0` の現行Source Codeを正として、v1.1.0時点で実装済みの横断仕様をリバースエンジニアリングした仕様スナップショットである。

既存の詳細設計書を置き換えるものではなく、Release前の実装状態と仕様書の差分を埋めるための参照資料とする。

## 1. 対象範囲

対象は以下の実装済み仕様である。

- Frontend Theme / Brand Variant
- Shared Navigation / Theme Trigger
- Portal同期ステータス表示
- Character Easter Egg Snackbar
- Settings Status / Version表示
- Version Primary Source / Version CLI
- Windows / Android Packaging
- v1.1.0時点の主要画面Route

Workout Data計算、GitHub同期の通信仕様、Windows / AndroidのPlatform固有保存領域そのものは既存設計書を正とし、本書ではv1.1.0で確認できる接続点のみ記載する。

## 2. Theme

Themeは `src/shared/frontend-common/src/theme/index.js` が共通制御を担当する。

Themeの状態は `document.documentElement` の `data-theme` 属性で表現する。

```text
Light: data-theme属性なし
Dark : data-theme="dark"
```

Lightは既存CSSの初期状態を維持するため、明示的な `data-theme="light"` は付与しない。

Theme永続化には以下のlocalStorage keyを使用する。

```text
atlament.system.theme
```

Theme切替は `toggleTheme()` が現在DOM状態から次状態を決定し、DOM属性とlocalStorageを更新する。`initializeStoredTheme()` は起動時に保存値をDOMへ反映し、外部から `data-theme` が変更された場合も保存値を同期する。

Dark Mode用の色は画面個別の固定色ではなく、`src/shared/design-tokens/src/tokens.css` のCSS Custom Propertiesを中心に定義する。

## 3. Brand Variant

Brand Variantは `src/shared/frontend-common/src/branding/index.js` が共通制御を担当する。

Brandの状態は `document.documentElement` の `data-brand` 属性で表現する。

```text
Green : data-brand="green"
Violet: data-brand="violet"
```

Brand VariantはLogo Variantと連動する。保存形式は既存互換性のためLogo Variantを維持し、以下のlocalStorage keyを使用する。

```text
atlament.system.branding.logoVariant
```

```text
primary   -> green
secondary -> violet
```

Brand Icon押下はLogo Variantを切り替え、同時に `data-brand` を更新する。複数Navigation shellが存在する狭幅表示では、`atlament:brand-variant-change` eventによりLogo画像とBrand tokenを同期する。

## 4. Shared Navigation

Portal以外のFrontend Applicationは `src/shared/frontend-common/src/navigation/navigation-ui.ts` の `initializeAppNavigation()` で共通Navigationを生成する。

Navigation対象は以下である。

```text
Dashboard
Workout Domain
Performance Detail
Analytics
Application Settings
```

PortalはEntry Surfaceとして独自Headerを持つため、共通Drawerは挿入しない。

Desktopでは `atl-navigation-drawer-desktop` をApp shellの左側へ配置する。狭幅表示では `atl-mobile-header` と `atl-navigation-drawer-mobile` を生成し、bodyの `atl-navigation-open` classとaria属性でDrawer開閉状態を表現する。

Theme TriggerはNavigation link一覧には含めず、Drawer最下部の独立操作として配置する。Iconは `mdi-theme-light-dark` を使用し、Theme切替以外のRoute遷移は行わない。

Brand IconはTheme切替ではなく、Logo / Brand Variant切替を担当する。

## 5. Portal同期ステータス

Portalの同期ステータス表示は `src/frontend/portal/src/main.js` が `GET /api/v1/common/status` を定期取得して制御する。

取得間隔は1500msである。

表示状態は以下である。

| 状態 | 判定概要 | 自動非表示 |
| --- | --- | --- |
| loading | startupまたはmanualSyncがrunning | なし |
| success | running状態から正常完了した後 | あり |
| warning | Runtime Data required、またはGitHub degraded + Runtime Data available | なし |
| error | startup/manualSync failed、またはStatus API取得失敗 | なし |

success表示は以下の2段階で非表示にする。

```text
完全表示: 3000ms
Fade out: 1500ms
Fade out完了後にhidden
```

success用timerは状態切替時にclearされるため、古いsuccess timerが後続のloading / warning / error表示を消さない。

## 6. Character Easter Egg

Character Easter Eggは `src/shared/frontend-common/src/easter-egg/` の共通機能である。

Triggerは各ApplicationのApplication name textを累積5回clickすることで発火する。Trigger countは永続化しない。

表示は `atl-easter-egg-snackbar` をrootとするSnackbar形式で、画像とdialog textを含む。表示中の再発火はqueueに積まれ、現在表示が完了した後に順次実行される。

Snackbarは固定Light表現を持ち、Theme / Brand tokenへ追従しない。これはEaster Eggが通常UIから独立した演出要素であるためである。

## 7. Settings Status / Version

Settingsは `GET /api/v1/common/status`、`GET /api/v1/common/configuration`、`GET /api/v1/common/credential/status` を利用して表示状態を構成する。

Status表示では以下のVersion値を表示する。

```text
data.version
data.versions.applicationFramework
data.versions.frontendFramework
```

表示上はApplication Framework Version、Frontend Framework Versionを個別項目として扱う。GitHub状態はStatus APIの `components.github` とCredential Statusを組み合わせて表示判定する。

## 8. Version Primary Source / CLI

Version Primary Sourceは `src/version.json` である。

v1.1.0時点の値は以下である。

```json
{
  "frontend": "1.1.0",
  "windows": "1.1.0",
  "android": {
    "versionName": "1.1.0",
    "versionCode": 3
  }
}
```

Version更新は `tools/version/atlament-version.mjs` を唯一の更新経路とする。

```text
npm run version:check
npm run version:set -- --target all --version 1.1.0 --bump-version-code
```

`version:check` は `src/version.json`、Windows project metadata、Android Gradle metadataの整合性をread-onlyで検証する。Status APIの実動作ContractはWindows / Android側のテストで検証する。

Androidは `versionName` と `versionCode` を分離する。Androidを含む更新では `--bump-version-code` または `--version-code <integer>` のいずれか一方を必須とし、現在値以下のversionCodeは拒否する。

## 9. Packaging

Frontend Production Artifactは `npm run build` によりRepository直下の `dist/` に生成される。

Windows配布物は `npm run build:windows` により以下へ生成される。

```text
dist-windows/Atlament-v<version>-win-x64/
```

Windows Runtimeはexe横の `data/frontend/` をHosting Rootとし、Repository上の `dist/` を直接参照しない。

Android Release APKは `npm run build:android:release` により以下へ生成される。

```text
src/application/android/app/build/outputs/apk/release/app-release.apk
```

AndroidではFrontend ArtifactをAPK assetsへ同梱し、Runtime Data / Configuration / CredentialはPlatform標準のApplication保存領域を使用する。

## 10. 主要Route

v1.1.0時点の主要Routeは以下である。

| Route | 画面 | Framework |
| --- | --- | --- |
| `/` | Portal | Vanilla |
| `/dashboard/` | Dashboard | React |
| `/workouts/` | Workout Domain | Vue |
| `/workouts/:date` | Workout Domain - Details | Vue |
| `/exercises/:id` | Performance Detail | Angular |
| `/analytics/` | Analytics | Svelte |
| `/settings/` | Application Settings | SolidJS |
| `/404.html` | 404 Error | Vanilla |
| `/500.html` | 500 Error | Vanilla |
| `/503.html` | 503 Error | Vanilla |

Error PagesはTheme / Brand保存値を初期化するが、共通Navigationは持たない。404 / 500 / 503はいずれもPortalへ戻る導線を持つ。

## 11. v1.1.0 Release確認観点

Release確認では以下を最低限確認する。

- `npm run version:check` が成功すること
- Frontend build / test / checkが成功すること
- Windows build / testが成功すること
- Android buildが成功すること
- Windows配布版のStatus APIが `ready` かつVersion `1.1.0` を返すこと
- Windows配布版で主要RouteのDOMが生成されること
- Androidインストール後、Package metadataが `versionName=1.1.0`、`versionCode=3` であること

## 12. 関連Source

- `src/shared/design-tokens/src/tokens.css`
- `src/shared/frontend-common/src/theme/index.js`
- `src/shared/frontend-common/src/branding/index.js`
- `src/shared/frontend-common/src/navigation/navigation-ui.ts`
- `src/shared/frontend-common/src/easter-egg/display-controller.js`
- `src/frontend/portal/src/main.js`
- `src/frontend/settings-solid/src/App.tsx`
- `src/version.json`
- `tools/version/atlament-version.mjs`
- `tools/build/build-windows.mjs`
- `tools/build/build-android.mjs`
- `src/application/windows/`
- `src/application/android/`
