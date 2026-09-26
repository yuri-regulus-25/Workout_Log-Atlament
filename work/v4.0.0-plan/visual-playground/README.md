# v4 Visual Playground

## 目的

Atlament v4.0 の Visual Language を決める前に、Glass、Plasma、Ambient Particle を実物で比較するための検証用 Frontend である。製品画面、製品データ、Backend とは接続しない。

実装は `src/frontend/v4-visual-playground/` に隔離しており、既存 MPA の route、build、Frontend Application には組み込んでいない。

## 起動方法

Repository root で以下を実行する。

```powershell
pnpm --filter @workout-lab/v4-visual-playground dev
```

Production build:

```powershell
pnpm --filter @workout-lab/v4-visual-playground build
```

## 構成と Version

| 項目 | Version / 方式 |
|---|---|
| React | 19.3.0 |
| React DOM | 19.3.0 |
| TypeScript | 6.0.3 |
| Vite | 8.2.2 |
| `@cruxgarden/plasma-ui` | 0.7.0 |
| Node.js requirement | Plasma UI の requirement により 22 以上 |
| Package manager | pnpm 11.19.0 |

## Playground

### Glass

CSS の半透明 gradient、`backdrop-filter`、border、inset highlight、shadow を組み合わせる。Large / Medium / Small Card、navigation、button、chip の異なる形状で、背後を通過する Particle の blur と diffusion を比較できる。

### Plasma

`PlasmaProvider`、`PlasmaCanvas`、`Plasma` を直接利用する。複数の draggable surface を近づけ、接触、merge、stretch、引き離し、detach を確認できる。`onJoinChange` の状態も画面左下へ表示する。

### Composition

Glass、Plasma、Particle を同時に配置する。個別の効果が良くても全部載せで騒がしくならないか、情報用の Glass と操作用の Plasma の役割が区別できるかを確認する。

## Plasma UI 調査結果

- Package: `@cruxgarden/plasma-ui@0.7.0`
- License: MIT
- Peer dependency: React / React DOM 18 以上
- Node.js: 22 以上
- Renderer: WebGL2 の full-viewport canvas
- Browser: Chrome、Edge、Firefox、Safari 16.4 以上
- WebGL2 非対応時: CSS frosted panel fallback。layout、drag、snap は維持される。
- Motion: `prefers-reduced-motion` では lean、pulse、pointer drop、spring、form-in が無効になる。
- Performance: desktop 向け。全画面 pass のため viewport と `maxSurfaces` に応じて GPU cost が増える。mobile は推奨対象ではない。
- Surface budget: default 16。この Playground は mode ごとに必要な数へ抑えている。

公式資料:

- <https://cruxgarden.github.io/plasma-ui/>
- <https://github.com/CruxGarden/plasma-ui>
- <https://www.npmjs.com/package/@cruxgarden/plasma-ui>

### 使用した公開 API

Provider では `blend`、`viscosity`、`stretch`、`flow`、`tint`、`opacity`、`frost`、`refraction`、`dispersion`、`rim`、`glow`、`shimmerSpeed` を使用する。Surface では `draggable`、`fuse`、`radius`、`padding`、`onJoinChange` を使用する。

「Elasticity」は単独の公開 property ではない。Playground では主に `viscosity` と `stretch` の組み合わせとして評価する。

### Known constraints

- Plasma renderer は DOM を読み取れないため、DOM Particle や Glass Card を Plasma の refraction source として直接 sampling できない。Plasma 自体の背景は `background` property へ渡した色を屈折する。
- `PlasmaCanvas` は container 内へ描画を限定する API ではなく、常に viewport 全体を描画する。この Playground では canvas を viewport origin に固定し、header と control panel を上位 layer で覆う。
- 同一 canvas 内で surface を重ねる layer 機能と resize は roadmap 段階である。
- Drag handle は未実装である。button、link、input、`data-plasma-nodrag` 内の操作は drag 対象外になる。
- `flow` を上げると edge が波打つため、flush edge の評価時は 0 を推奨する。

## Ambient Particle

`tsParticles` 4.4.0 も候補として確認したが、今回は採用していない。評価に必要な Particle は最大 72 個の単純な上昇光点であり、DOM element と CSS animation の方が以下の点で適するためである。

- Glass の背後へ通常の stacking context で確実に配置できる。
- Plasma UI の WebGL canvas と renderer lifecycle が競合しない。
- density、speed、drift、size、opacity、glow、lifetime を React state から直接変更できる。
- library 初期化や preset serialization の変換 layer が不要である。

Particle は deterministic な初期配置を使い、preset 復元時も同じ分布を比較できる。画面下部から上昇し、横 drift と fade out を行う。`prefers-reduced-motion` 時は animation を停止する。

## Parameter

### Ambient

- Background brightness
- Background green intensity
- Ambient glow
- Particle density
- Spawn rate
- Rise speed
- Horizontal drift
- Particle size
- Particle glow
- Particle opacity
- Lifetime
- Fade timing

### Glass

- Surface opacity
- Blur
- Saturation
- Border opacity
- Border brightness
- Radius
- Reflection
- Glow
- Shadow / depth

### Plasma

- Surface size
- Viscosity
- Stretch
- Merge distance
- Edge flow
- Visual intensity
- Frost
- Refraction
- Dispersion
- Rim
- Glow
- Motion speed

## Preset

Control Panel 下部で current parameter を JSON として表示する。

- `Copy JSON`: Clipboard へコピーする。
- `Restore JSON`: textarea の JSON を検証して復元する。
- `Reset default`: 初期値へ戻す。
- `Save locally`: 名前付き preset を LocalStorage に保存する。同名保存は上書きする。

保存 key は `atlament-v4-visual-presets` である。Preset はこの Prototype の parameter shape のみを扱い、将来の Production Design Token との互換性は保証しない。

## Fallback と limitation

- Glass は `backdrop-filter` 対応 browser を前提とする。非対応時も半透明 surface と border は残るが、背後の Particle blur は確認できない。
- Plasma UI の CSS fallback では WebGL refraction、liquid shading、merge の視覚表現を評価できない。
- Particle の `Spawn rate` は Prototype 上の分布間隔として扱い、物理的な emitter event 数ではない。
- Glass A/B の同時比較は第一段階では実装していない。Preset JSON を切り替えて比較する。
- Product route、Production Design Token、native Application への統合は対象外である。

## 検証

2026-09-26 に以下を確認した。

- `pnpm --filter @workout-lab/v4-visual-playground build`: PASS
- Chromium 系 browser で Glass / Plasma / Composition の表示: PASS
- WebGL canvas 生成: PASS
- Plasma の drag → merge → detach と `onJoinChange`: PASS
- Control slider の即時反映: PASS
- Browser console warning / error: なし
