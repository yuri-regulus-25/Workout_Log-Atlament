# v4 Visual Playground Architecture

## 1. Scope

この文書は `src/frontend/v4-visual-playground/` の現行構成と責務を記録する。Playground は React / TypeScript / Vite の独立 workspace であり、既存製品 Frontend、Backend、Native Application から隔離する。

## 2. Component Structure

```text
main.tsx
└─ App.tsx                         Composition Root
   ├─ Mode Tabs                    glass / plasma / composition
   ├─ GlassScene.tsx
   │  ├─ AmbientParticles.tsx
   │  └─ Glass sample surfaces
   ├─ PlasmaScene.tsx
   │  ├─ AmbientParticles.tsx
   │  └─ PlasmaProvider / Canvas / Surfaces
   ├─ CompositionScene.tsx
   │  ├─ AmbientParticles.tsx
   │  ├─ Glass surface
   │  └─ PlasmaProvider / Canvas / Surfaces
   └─ Control Panel
      ├─ ControlPanel.tsx          Parameter slider
      └─ PresetPanel.tsx           JSON / LocalStorage
```

## 3. Responsibility Map

| File | Responsibility |
|---|---|
| `main.tsx` | React root の作成と global style の読込 |
| `App.tsx` | Mode、current parameter、Control Panel 開閉の state と画面全体の composition |
| `parameters.ts` | Preset contract、Pre-Fix default、runtime shape validation |
| `ControlPanel.tsx` | Mode ごとの parameter group 選択と slider 更新 |
| `PresetPanel.tsx` | JSON 表示・復元・copy、default reset、LocalStorage preset |
| `AmbientParticles.tsx` | Playground parameter から tsParticles option への変換と lifecycle |
| `GlassScene.tsx` | Ambient / Glass parameter の CSS custom property 化と sample 配置 |
| `PlasmaScene.tsx` | Plasma UI option、surface、join state の構成 |
| `CompositionScene.tsx` | Ambient、Glass、Plasma の統合評価 |
| `styles.css` | Shell、scene、sample、Control Panel、responsive layout、layer order |

## 4. State and Data Flow

```text
defaultParameters
      │
      ▼
App.parameters ───────────────┬───────────────┐
      ▲                       │               │
      │                       ▼               ▼
ControlPanel             Active Scene    PresetPanel
slider update            render options  JSON / LocalStorage
      │                                       │
      └───────────────────────────────────────┘
                    setParameters
```

- `App` が `PlaygroundParameters` の唯一の current state owner である。
- 各 Scene は parameter を受け取り、CSS custom property または library option へ変換する。
- `ControlPanel` と `PresetPanel` は同じ `setParameters` を使用する。
- LocalStorage は保存済み preset だけを保持し、Pre-Fix default の source of truth にはしない。
- Pre-Fix default の source of truth は `parameters.ts` の `defaultParameters` とする。

## 5. Render Layers

Scene 内の概念的な背面から前面への順序:

| Layer | 主な要素 | 実装 |
|---:|---|---|
| 0 | Background gradient、grid、ambient field | `.scene`、`.scene::before`、`.ambient-field` |
| 1 | Ambient Particle | tsParticles Canvas、`.ambient-particles` |
| 1 | Plasma renderer | full-viewport WebGL `PlasmaCanvas` |
| 3 | Glass sample / Plasma DOM surface / Composition content | `.scene-grid`、`.plasma-stage`、`.composition-layout` |
| 5–8 | Join indicator、scene caption | `.join-indicator`、`.scene-caption` |
| 15 | Control Panel | `.control-panel` |
| 20 | Header / mode tabs | `.topbar` |

Particle Canvas と Plasma Canvas は別 renderer である。Plasma renderer は Particle Canvas や Glass DOM を refraction source として sampling しない。

## 6. Library Boundaries

### tsParticles

- `ParticlesProvider` で Full engine を初期化する。
- 下端 emitter、move、opacity animation、shadow、size を使用する。
- `prefers-reduced-motion` では autoplay と move を停止する。
- Parameter から library option への変換は `AmbientParticles.tsx` に閉じ込める。

### Plasma UI

- `PlasmaProvider` が renderer option を受け持つ。
- `PlasmaCanvas` は viewport 全体の WebGL Canvas を生成する。
- `Plasma` が draggable / fuse 対象の DOM surface を提供する。
- `onJoinChange` は評価表示用 state だけを更新し、Product domain state を持たない。

### CSS Glass

- Glass は独立 library を使用しない。
- CSS gradient、alpha、border、`backdrop-filter`、inset highlight、shadow を組み合わせる。
- Parameter は Scene component で CSS custom property へ変換する。

## 7. Runtime and Persistence

- User-facing package manager は npm とする。
- 開発起動は `npm run dev -w @workout-lab/v4-visual-playground` を使用する。
- LocalStorage key は `atlament-v4-visual-presets` である。
- JSON restore は全 group の既知 numeric field が存在することを検証する。
- Product API、filesystem、GitHub、Workout Data への I/O は行わない。

## 8. Responsive and Accessibility

- 1100 px 以下で Header と Control Panel の幅を縮小する。
- 820 px 以下で workspace を縦積みにする。
- Button、input、textarea に `:focus-visible` outline を設定する。
- Scene と mode navigation に accessible label を設定する。
- `prefers-reduced-motion` では CSS motion を最小化し、Particle move を停止する。

## 9. Known Constraints

- Plasma Canvas は viewport 全体に固定され、scene container 内だけへ限定できない。
- Glass の `backdrop-filter` 非対応時は Particle diffusion を評価できない。
- `borderBrightness` は preset contract に存在するが、現行 CSS では未接続である。
- tsParticles Full bundle により Prototype としては相応の JavaScript cost がある。
- Parameter validator は numeric field の存在を検証するが、min / max range までは検証しない。
- Production route、Design Token、Native Application との parity はこの Prototype の責務外である。
