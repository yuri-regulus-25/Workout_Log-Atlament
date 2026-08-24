# Atlament Repository / Build / Development Runtime 詳細設計

## 0. 文書目的

本書は Atlament の Repository 構成、Production Artifact、Frontend 開発 Runtime、Build / Preview / Watch、Packaging、Frontend共通機能の責務を定義する。

AF内部仕様は `07_af_detailed_design.md`、Common JSは `08_common_js_detailed_design.md`、Frontend / Settingsは `09_frontend_settings_detailed_design.md` を正とする。

---

## 1. Repository基本原則

Repository直下で Source / SoT Data / Design Documents / Tooling / Production Artifact を混在させない。

```text
/
├─ src/
├─ data/
├─ docs/
├─ tools/
├─ atlament/      # generated / gitignore
├─ .tmp/          # generated / gitignore
├─ package.json
├─ package-lock.json
├─ README.md
└─ .gitignore
```

ディレクトリ名は原則 lowercase とする。

---

## 2. Source構成

```text
src/
├─ application/
│  ├─ common/
│  ├─ windows/
│  └─ android/
├─ frontend/
│  ├─ portal/
│  ├─ errors/
│  ├─ dashboard-react/
│  ├─ workouts-vue/
│  ├─ exercises-angular/
│  ├─ analytics-svelte/
│  └─ settings-solid/
└─ shared/
   ├─ workout-types/
   ├─ workout-core/
   ├─ workout-data/
   ├─ frontend-common/
   ├─ design-tokens/
   └─ shared-styles/
```

`application` はAF採用OSを明示し、Windows / Androidを単一AF Directoryへ混在させない。

`frontend` は画面単位Application Sourceを保持する。

`shared` はFramework / OSに依存しない共通資材を保持する。

---

## 3. SoT Data

```text
data/
├─ workouts/
└─ master/
   ├─ exercises.json
   └─ gyms.json
```

Repositoryの `data/` はGitHub SoTでありProduction Build Artifactではない。

---

## 4. Documents / README

設計書と実装指示書を分離する。

```text
docs/
├─ design/
└─ instructions/
```

主要Directoryには簡易 `README.md` を配置する。

READMEの目的は、初めてDirectoryを見た人が「ここでは何を管理しているか」を理解することのみとする。詳細仕様、責務境界、依存関係設計、実装規約等は記載しない。

全階層へ機械的にREADMEを配置する必要はない。未実装Directoryは実装工程で作成し、その際にREADMEを追加する。

---

## 5. Tooling

```text
tools/
├─ build/
├─ dev-runtime/
└─ validation/
```

ToolingはUI SourceやAF Production Sourceを所有しない。

Build ScriptがPortal / Error Page等のUIそのものを文字列生成する構成は禁止する。

---

## 6. Production Frontend Artifact

Production Frontend Artifact RootはRepository直下の以下とする。

```text
./atlament/
```

```text
atlament/
├─ portal/
├─ errors/
├─ dashboard/
├─ workouts/
├─ exercises/
├─ analytics/
└─ settings/
```

`atlament/` は生成物専用・Git管理対象外とする。

AFはFrontend Source、npm、各Frameworkの存在を認識せず、完成済みArtifactのみをHosting対象として扱う。

---

## 7. Production Build / Check

統合Entry Point:

```text
npm run prod
```

```text
lint
↓
typecheck
↓
test
↓
Production Build
↓
Artifact Assemble
↓
Artifact Validation
↓
./atlament 完成
```

途中の不完全Artifactを完成品として残さない。

```text
.tmp/prod/
↓ Validation OK
./atlament/
```

個別Command:

```text
npm run lint
npm run typecheck
npm run test
npm run check
npm run build
npm run validate:artifact
npm run prod
```

```text
check = lint + typecheck + test
build = Production Build + Artifact Assemble
prod  = check + build + validate:artifact
```

`npm run prod` がexit 0の場合、Frontend側はAFへ渡せる状態とする。

Frontend CIも `npm ci` → `npm run prod` を基本とし、CI専用の別Validation経路を作らない。

Windows / Android ApplicationのBuild / Testは各Platform Build Systemで実施する。

---

## 8. preview:mpa

```text
npm run preview:mpa
```

Build済み `./atlament/` のStatic Serveのみを行う。

以下は行わない。

- Build
- HMR
- AF起動
- GitHub Access

Artifactが存在しない、または必須資材が不足する場合は明示Errorで終了する。

---

## 9. watch

```text
npm run watch
```

全FrontendをDevelopment Modeで起動し、単一Gatewayから利用可能にする。

```text
Development Gateway :5173
├─ /             → Portal
├─ /dashboard/   → Dashboard / React
├─ /workouts/    → Workouts / Vue
├─ /exercises/   → Exercises / Angular
├─ /analytics/   → Analytics / Svelte
├─ /settings/    → Settings / SolidJS
└─ /api/         → Node Development Runtime
```

`watch` は `atlament/` を使用しない。

個別Command:

```text
npm run watch:portal
npm run watch:dashboard
npm run watch:workouts
npm run watch:exercises
npm run watch:analytics
npm run watch:settings
```

Framework固有Command差異はroot `package.json` で吸収し、Command名はDomain名を使用する。

---

## 10. Development Port

固定Portとする。

```text
Development Gateway       5173
Portal                     5174
Dashboard / React          5175
Workouts / Vue             5176
Exercises / Angular        5177
Analytics / Svelte         5178
Settings / SolidJS         5179
Node Development Runtime   5180
```

Port競合時は別Portを自動探索せずError終了する。

Production AF Port (`14108` / `45194`) とは分離する。

---

## 11. Node Development Runtime

Node Development RuntimeはAFの開発版ではなく、Frontend開発時にHTTP境界を代行する薄いAdapterとする。

```text
Repository data/
↓
src/shared/workout-data 等の既存共通処理
↓
Node Development Runtime
↓
AF互換HTTP Response
↓
Frontend
```

Node Development Runtime自身にData加工・Validationロジックを重複実装しない。既存shared packageを利用し、結果をAF互換Response Envelopeへ包む。

Response Envelopeは本番AFと同一Contractを使用する。

```json
{
  "success": true,
  "errors": [],
  "data": {}
}
```

Master不整合等も本番AFと同じContractで返し、勝手に補完しない。

Node Development RuntimeはRepository内 `data/` を直接利用し、以下を行わない。

- GitHub API Access
- Token / Credential処理
- Clone / Pull
- AF Configuration管理
- SQLite
- Runtime Cache
- Dev専用Data加工
- Dev専用API Contract

MVPで提供するAPI subset:

```text
GET /api/v1/common/status
GET /api/v1/common/runtime/workouts
```

Version省略Alias:

```text
GET /api/common/status
GET /api/common/runtime/workouts
```

Version省略時のVersion解決規則はAF API設計に従う。

Settings / Credential / Sync等のAPIはFrontend開発で必要になった工程で追加し、MVPでは実装しない。

---

## 12. Runtimeによる障害切り分け

```text
npm run watch
→ Source / Development Runtime確認

npm run preview:mpa
→ Production Artifact確認

Windows / Android AF
→ Production相当Runtime確認
```

```text
watchでも異常
→ Frontend / Common JS / Development Runtime / Data

watch正常 + preview異常
→ Production Build / Artifact Assemble

preview正常 + AF異常
→ AF / Platform / Runtime Data / Hosting
```

---

## 13. Portal

Portalは正式Source Applicationとする。

```text
src/frontend/portal/
```

Vanilla TypeScript / CSSを基本とし、Frontend Framework Packageを採用しない。

PortalにSettings、AF Status、Workout Data等の責務を追加しない。

Build ToolがPortal UIを生成する構成は禁止する。

---

## 14. Error Pages

Error PagesはPortalとは分離する。

MVP初期セット:

```text
src/frontend/errors/
├─ common/
├─ 404/
├─ 500/
└─ 503/
```

すべてVanilla HTML / CSS / TypeScriptを基本とし、Frontend Framework Packageを利用しない。

Routing:

```text
404 → 404
500 → 500
503 → 503
その他の専用画面なしStatus → common
```

例として571等、専用画面を作成していないStatusは `common` へ振り分ける。

MVPでは403専用画面を作成しない。

Error Page分割時は、現在実装されているError表示をそのままコピーして配置する。新規デザイン・リニューアルを行わず、Status / 文言等の必要最低限のみ変更する。

---

## 15. frontend-common

```text
src/shared/frontend-common/
├─ af-client/
├─ page-transition/
├─ easter-egg/
├─ navigation/
└─ errors/
```

Framework非依存機能のみ配置する。

共通化対象:

- AF API Call / Response処理
- Page Transition CSS / 定数
- Easter Egg Trigger / Asset-aware Random Selection
- Route URL定数
- Framework非依存Error整形

Framework固有Component / Routerは配置しない。描画Componentは各Frontend Applicationが所有する。

---

## 16. Page Transition

全Frontend画面へ共通適用する。

```text
Direction   Right → Left
Distance    32px
Duration    240ms
Easing      cubic-bezier(0.22, 1, 0.36, 1)
Opacity     0 → 1
```

Entry Animationのみ実装する。

Back専用Animation、Exit Animationは実装しない。NavigationをAnimation完了待ちにしない。

`prefers-reduced-motion: reduce` の場合はAnimationを無効化する。

---

## 17. Easter Egg

Easter Egg「謎のおっさん」は全Frontend Applicationで利用可能な共通Frontend機能とする。AFは関与しない。

セリフ本文、Asset、Assetごとの発話可能Category対応表は別途確定済みデータを正とし、本設計では選択・表示Contractのみ定義する。

物理配置:

```text
src/shared/frontend-common/easter-egg/
├─ index.ts
├─ asset/
│  ├─ *.png
│  ├─ *.svg
│  └─ ...
└─ voice/
   ├─ categories/
   │  ├─ basic.json
   │  ├─ workout.json
   │  ├─ annoyed.json
   │  ├─ meaningless.json
   │  ├─ close.json
   │  ├─ rare.json
   │  ├─ protein.json
   │  ├─ smoking.json
   │  ├─ salaryman.json
   │  ├─ gay.json
   │  ├─ swim.json
   │  ├─ fundoshi.json
   │  ├─ jockstrap.json
   │  ├─ dirty.json
   │  └─ dirty-heavy.json
   └─ pages/
      ├─ portal.json
      ├─ dashboard.json
      ├─ workouts.json
      ├─ exercises.json
      ├─ analytics.json
      ├─ settings.json
      └─ errors.json
```

`asset/` は完成済み表示Assetを管理する。PNG / SVG等を許容する。

`voice/categories/` はセリフを意味Category単位で管理する。Category名とAssetの許可Categoryは確定済み対応表へ従う。

`voice/pages/` は将来の画面固有セリフ用拡張領域とする。MVPでは空または未作成を許容し、画面固有セリフを必須としない。

Selection Contract:

```text
Asset候補からAssetを選択
↓
選択Assetに紐づく許可Category Poolを取得
↓
許可CategoryからCategoryを選択
↓
Category内Voiceから1件選択
```

AssetとVoiceを独立にRandom選択してはならない。これにより衣装・ポーズと不整合なセリフを発話させない。

Trigger:

```text
各画面の Atlament / <Page> 相当要素
↓
画面表示中の累積5クリック
↓
発動
↓
Count Reset
```

時間制限なし。Navigation / ReloadでCountを破棄し永続化しない。

表示仕様:

- viewport左下へfixed配置するEaster Egg Cardとして表示
- Card内にAssetと可変長Voice Textを表示
- 非Modal
- `pointer-events: none`
- Scrollしても左下に固定
- 通常操作を妨害しない
- 5秒表示
- 再発動可能
- 通常Contentより上、Modal / Dialogより下のz-index帯
- Repositoryへ格納された完成AssetをRuntimeで再加工・再生成・内容改変しない
- CSS配置時にAssetのアスペクト比を崩さない

通常UIをEaster Eggに合わせて変更しない。

---

## 18. Windows Production Packaging

Production配布Root名は以下とする。

```text
atlament/
```

Windowsでは `.exe` のあるDirectoryをRuntime Rootとし、同階層に `data/` を配置する。

```text
atlament/
├─ Atlament.exe
└─ data/
   ├─ configuration/
   ├─ runtime/
   ├─ logs/
   └─ frontend/
      ├─ portal/
      ├─ errors/
      ├─ dashboard/
      ├─ workouts/
      ├─ exercises/
      ├─ analytics/
      └─ settings/
```

Repository Production Frontend Artifact `./atlament/` はWindows Packaging工程で `<exe directory>/data/frontend/` へ配置する。

Common AFは物理Pathを直接固定せず、論理RootをPlatform Adapterから受け取る。

Windows Adapter例:

```text
FrontendArtifactRoot → <exe>/data/frontend
ConfigurationRoot    → <exe>/data/configuration
RuntimeRoot          → <exe>/data/runtime
LogRoot              → <exe>/data/logs
```

MVPではInstaller、User Directoryへの自動配置、Shortcut、Uninstaller等を作成しない。Production配布物はFolder単位で成立させる。

Debug Buildの出力DirectoryはPlatform Build Systemへ委ね、本節のProduction Packaging規則の対象外とする。

---

## 19. Android Production Packaging

AndroidではWindowsの「exe横data」を模倣せず、Platform標準Storageを利用する。

MVP:

```text
Frontend Artifact → Application package assets
Configuration     → Application Internal Storage
Runtime Data      → Application Internal Storage
Log               → Application-owned SQLite
```

Frontend ArtifactはAPK / AABへ同梱し、AF Hosting層がpackage assetsから利用する。

MVPではFrontend ArtifactをApplication Internal Storageへ展開する機構を作成しない。

将来必要になった場合、初回起動 / Version更新時に `assets/frontend/` からApplication専用Storageへ展開する方式を検討可能とするが、MVP対象外とする。

Common AFは物理Storage方式を認識せず、Platform Adapterから論理Root / Resource Accessを受け取る。

---

## 20. 禁止事項

- Source / Data / Docs / Tooling / Production Artifactを再混在させない。
- Windows / Android Applicationを単一OSディレクトリへ混在させない。
- `atlament/` をSource管理領域として使用しない。
- `preview:mpa` でBuildを実行しない。
- `watch` でProduction Artifactを利用しない。
- AF起動をFrontend Development Runtimeの前提にしない。
- Node Development RuntimeへGitHub / Credential / SQLite等のAF責務を持たせない。
- Development専用API ContractをFrontendへ公開しない。
- Build ToolにPortal / Error Page UIを埋め込まない。
- Port競合時に自動で別Portへ逃がさない。
- Framework固有Componentをfrontend-commonへ配置しない。
- Page TransitionにBack / Exit専用Animationを追加しない。
- Easter Egg Stateを永続化しない。
- Easter Egg AssetとVoiceを独立Random選択しない。
- Easter Egg AssetをRuntimeで再加工・再生成・内容改変しない。
- MVPでInstaller / Android Frontend展開機構を追加しない。

---

## 21. 完了条件

- Repositoryの責務別Directory Standardが成立している。
- `npm run watch` で1 Portから全Development Frontendを利用できる。
- `watch:<domain>` で画面単位Developmentが可能。
- Node Development RuntimeがRepository `data/` を利用する薄いAF互換Adapterとして成立している。
- `npm run prod` で `./atlament/` が生成される。
- `npm run preview:mpa` は `./atlament/` のみを配信する。
- Production / Preview / Development Runtimeが相互に責務混在していない。
- Portal / Error PagesがBuild Script生成から独立Source化されている。
- Error Pages初期セットが `common / 404 / 500 / 503` で成立している。
- Page Transitionが全画面共通仕様として成立している。
- Easter EggでAsset → 許可Category → Voiceの選択Contractが成立している。
- Easter Egg Card表示仕様が成立している。
- Windows Production Folder Packagingが成立している。
- Android MVP PackagingがPlatform標準Storage / packaged assetsで成立している。
