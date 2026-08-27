# Atlament 実装指示書 — Frontend Common / Portal / Error Pages

## 目的

Repository再編およびBuild Runtime整備後、Frontend共通機能とFramework非依存画面を実装する。

## 参照

- `docs/design/02_detailed-design/frontend-framework/application-settings.md`
- `docs/design/02_detailed-design/frontend-framework/common-js.md`
- `docs/design/02_detailed-design/repository/build-runtime.md`

Easter Eggを含む現行仕様は `docs/design/02_detailed-design/frontend-framework/common-js.md` を正とする。

## 実装対象

- Portal正式Source化（Vanilla TypeScript / CSS）
- Error Pages正式Source化（Vanilla HTML / CSS / TypeScript）
- Error Page初期セット `common / 404 / 500 / 503`
- 全画面Page Entry Transition
- Easter Egg共通Trigger / Asset → Category → Voice Random Selection
- Easter Egg Card
- 各FrontendへのEaster Egg表示Hook

## Error Pages

```text
src/frontend/errors/
├─ common/
├─ 404/
├─ 500/
└─ 503/
```

専用画面がないStatusは `common` へ振り分ける。MVPでは403専用画面を作成しない。

ファイル分割時は現在実装されているError表示をそのままコピーして配置する。新規デザインは行わず、Status / 文言等の必要最低限のみ変更する。

## Page Transition

```text
Right → Left
32px
240ms
cubic-bezier(0.22, 1, 0.36, 1)
Opacity 0 → 1
```

Entryのみ。Back / Exit専用Animationは禁止。

`prefers-reduced-motion` を尊重する。

## Easter Egg

物理配置:

```text
src/shared/frontend-common/easter-egg/
├─ index.ts
├─ manifest.json
├─ asset/
│  └─ PNG / SVG等
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

`manifest.json` をAsset → 許可Category MappingのSoTとする。各EntryはAsset ID / Asset Path / 許可Category[]を保持する。

仕様:

- 各画面の `Atlament / <Page>` 相当を5回クリック。
- 画面表示中の累積。時間制限なし。
- 発動後Count Reset。
- Navigation / Reloadで破棄。
- AF非依存。
- `manifest.json` のAsset候補からAssetを先に選択する。
- 選択Assetの許可Category PoolからCategoryを選択する。
- Category内Voiceから1件選択する。
- AssetとVoiceを独立Random抽選しない。
- `voice/pages/` は将来拡張用とし、MVPでは空または未作成を許容する。
- viewport左下fixedのEaster Egg Cardとして表示する。
- Card内にAssetと可変長Voice Textを表示する。
- `pointer-events: none`。
- Scroll中も左下固定。
- 5秒表示。
- 非Modal。
- 通常Contentより上、Modal / Dialogより下のz-index帯とする。
- Repositoryへ格納された完成AssetをRuntimeで再加工・再生成・内容改変しない。
- CSS配置時にAssetのアスペクト比を崩さない。

セリフ内容とAssetは別途確定済みデータを実装へ取り込み、Asset → 許可Category対応は`manifest.json`へ格納する。実装工程で過剰な創作・追加を行わない。

## 禁止

- PortalへFrontend Framework導入
- Error PageへFrontend Framework導入
- Build Script内でPortal / Error UI生成
- Error Pageの新規デザイン
- Easter EggのAF実装
- Easter Egg State永続化
- AssetとVoiceの独立Random抽選
- RuntimeでのAsset再加工・再生成・内容改変
- 通常UIのおっさん調への変更

## Commit

Repository再編、Build Runtime整備とは分離したFrontend Common工程として実施すること。
