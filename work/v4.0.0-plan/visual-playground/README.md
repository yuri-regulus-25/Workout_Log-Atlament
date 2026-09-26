# v4 Visual Playground

## 目的

Atlament v4.0 の Visual Language を決める前に、Glass、Plasma、Ambient Particle を実物で比較するための検証用 Frontend である。製品画面、製品データ、Backend とは接続しない。

実装は `src/frontend/v4-visual-playground/` に隔離しており、既存 MPA の route、build、Frontend Application には組み込んでいない。

## 起動方法

Node.js 22 以上を用意する。Repository root で npm workspace command を使用する。

```powershell
npm ci
npm run dev -w @workout-lab/v4-visual-playground
```

Production build:

```powershell
npm run build -w @workout-lab/v4-visual-playground
```

## 構成と Version

| 項目 | Version / 方式 |
|---|---|
| React | 19.2.8 |
| React DOM | 19.2.8 |
| TypeScript | 6.0.3 |
| Vite | 8.2.1 |
| `@cruxgarden/plasma-ui` | 0.7.0 |
| `@tsparticles/react` | 4.4.0 |
| `@tsparticles/engine` | 4.4.0 |
| `tsparticles` | 4.4.0 Full bundle |
| Node.js requirement | Plasma UI の requirement により 22 以上 |
| User-facing command | npm workspace command |

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

- Plasma renderer は別 Canvas や Glass Card を refraction source として直接 sampling できない。Plasma 自体の背景は `background` property へ渡した色を屈折する。
- `PlasmaCanvas` は container 内へ描画を限定する API ではなく、常に viewport 全体を描画する。この Playground では canvas を viewport origin に固定し、header と control panel を上位 layer で覆う。
- 同一 canvas 内で surface を重ねる layer 機能と resize は roadmap 段階である。
- Drag handle は未実装である。button、link、input、`data-plasma-nodrag` 内の操作は drag 対象外になる。
- `flow` を上げると edge が波打つため、flush edge の評価時は 0 を推奨する。

## Ambient Particle

`@tsparticles/react` と `tsparticles` 4.4.0 Full bundle を採用した。画面下端を幅 100% の emitter とし、上昇、横 drift、fade out、particle glow を Canvas へ描画する。

- React wrapper の `ParticlesProvider` で Full engine を一度初期化する。
- `density` は emitter 起動時の個数、`spawnRate` は emission 間隔へ反映する。
- rise speed、drift、size、opacity、glow、lifetime、fade timing は `ISourceOptions` へ変換する。`fade timing` は lifetime に対して fade out を開始する位置を表し、残り時間で opacity を 0 まで連続的に下げる。
- Full bundle を選んだ理由は、下端から発生させる emitter plugin を含むためである。

`prefers-reduced-motion` 時は emitter の再生と移動を停止する。Particle layer は Glass の背後に配置し、Plasma UI の WebGL canvas とは独立して lifecycle を管理する。

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
- tsParticles Full bundle の追加により、DOM / CSS の単純実装より JavaScript bundle と初期化 cost は増える。
- Particle と Plasma は別 Canvas で描画するため、Particle を Plasma surface 内へ直接屈折させる評価はできない。
- Glass A/B の同時比較は第一段階では実装していない。Preset JSON を切り替えて比較する。
- Product route、Production Design Token、native Application への統合は対象外である。

## 検証

2026-09-27 に以下を確認した。

- `pnpm --filter @workout-lab/v4-visual-playground build`: PASS
- Chromium 系 browser で Glass / Plasma / Composition の表示: PASS
- tsParticles の下端 emitter、上昇、fade out、slider 即時反映: PASS
- 8 秒の短寿命設定で fade 開始から opacity 0 まで段階的に減衰し、中途で寿命破棄されないこと: PASS
- Composition で tsParticles Canvas と Plasma WebGL Canvas の同時生成: PASS
- WebGL canvas 生成: PASS
- Plasma の drag → merge → detach と `onJoinChange`: PASS
- Control slider の即時反映: PASS
- Browser console warning / error: なし
