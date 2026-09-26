# v4 Visual Playground Pre-Fix Specification

## 1. Status

この文書は、2026-09-27 時点で人間が Playground 上で選択した Visual Parameter を、次の修正・比較の基準となる **Pre-Fix** として固定する。

Pre-Fix は v4.0.0 の Production Design System、Design Token、製品画面仕様ではない。`src/frontend/v4-visual-playground/` 内だけで有効な、再現可能な評価用 snapshot である。

## 2. Visual Direction

- Dark Only と Primary Green `#10b981` を維持する。
- Scene background の brightness / green gradient は加算せず、green light は ambient field、Particle、Material の反射・発光へ限定する。
- Particle は多数の微小な光点として、画面下端から長時間かけて上昇させる。
- Particle の横方向 drift は大きく取り、直線的な starfield 表現を避ける。
- Glass は強い blur や border ではなく、低 blur、極薄 border、reflection を中心に構成する。
- Glass は情報を保持する安定 Material、Plasma は移動・接触できる Interactive Material とする。
- Composition では Background、Particle、Glass、Plasma の同居時の騒がしさを評価する。

## 3. Pre-Fix Preset

`defaultParameters`、`Reset default`、比較時の基準値は次の JSON と一致させる。

```json
{
  "ambient": {
    "backgroundBrightness": 0,
    "greenIntensity": 0,
    "ambientGlow": 33,
    "density": 100,
    "spawnRate": 100,
    "riseSpeed": 29,
    "drift": 120,
    "particleSize": 1,
    "particleGlow": 44,
    "particleOpacity": 100,
    "lifetime": 48,
    "fadeTiming": 95
  },
  "glass": {
    "opacity": 20,
    "blur": 2,
    "saturation": 106,
    "borderOpacity": 2,
    "borderBrightness": 49,
    "radius": 16,
    "reflection": 65,
    "glow": 39,
    "shadow": 34
  },
  "plasma": {
    "size": 100,
    "viscosity": 0.42,
    "stretch": 1.25,
    "blend": 48,
    "flow": 0.43,
    "tintOpacity": 0,
    "frost": 0.33,
    "refraction": 1.2,
    "dispersion": 0.65,
    "rim": 0.75,
    "glow": 0.6,
    "shimmerSpeed": 0.7
  }
}
```

## 4. Parameter Semantics

### 4.1 Ambient / Particle

| Parameter | Pre-Fix | 実装上の意味 |
|---|---:|---|
| `backgroundBrightness` | 0 | Near-black gradient の RGB 加算なし |
| `greenIntensity` | 0 | Scene 下部の green radial gradient なし |
| `ambientGlow` | 33 | 下部 ambient field の alpha 係数 |
| `density` | 100 | Emitter 起動時の Particle 数へ変換 |
| `spawnRate` | 100 | Emitter の発生間隔へ反比例で変換 |
| `riseSpeed` | 29 | tsParticles の上方向 move speed へ変換 |
| `drift` | 120 px | 上昇角度のばらつきへ変換。実装上は最大 35 度で clamp |
| `particleSize` | 1 px | 0.8–1.35 px の size range へ変換 |
| `particleGlow` | 44 | Green shadow blur へ変換 |
| `particleOpacity` | 100 | Particle の最大 opacity |
| `lifetime` | 48 s | Fade 完了までの全期間 |
| `fadeTiming` | 95% | Lifetime に対して fade out を開始する位置 |

Pre-Fix では 45.6 秒経過時に fade out を開始し、残り 2.4 秒で opacity を 1 から 0 へ連続的に減衰させる。独立した random lifetime は使用せず、opacity が 0 に到達した時点で Particle を破棄する。

Emitter の派生値は、初期 Particle 65 個、1 回あたり 5 個、発生間隔 0.15 秒である。これらは公開 preset field ではなく、現在の変換式から得られる実装値である。

### 4.2 Glass

| Parameter | Pre-Fix | 実装上の意味 |
|---|---:|---|
| `opacity` | 20% | Glass gradient の基準 alpha |
| `blur` | 2 px | `backdrop-filter` の blur |
| `saturation` | 106% | `backdrop-filter` の saturation |
| `borderOpacity` | 2% | Glass border の alpha |
| `borderBrightness` | 49% | 現行 preset field。CSS 変数へ渡すが、現時点の Glass rule では未参照 |
| `radius` | 16 px | Glass surface の border radius |
| `reflection` | 65% | Inset highlight と surface reflection overlay の強度 |
| `glow` | 39% | Green outer glow の強度 |
| `shadow` | 34% | Black depth shadow の強度 |

`borderBrightness` は Control / preset contract に存在するが、現行 CSS では視覚結果へ反映されない。Fix 時に接続するか、parameter から廃止するかを判断する。

### 4.3 Plasma

| Parameter | Pre-Fix | `@cruxgarden/plasma-ui` への対応 |
|---|---:|---|
| `size` | 100% | DOM surface 寸法の scale |
| `viscosity` | 0.42 | `viscosity` |
| `stretch` | 1.25 | `stretch` |
| `blend` | 48 px | `blend` |
| `flow` | 0.43 | `flow` |
| `tintOpacity` | 0 | `opacity` |
| `frost` | 0.33 | `frost` |
| `refraction` | 1.2 | `refraction` |
| `dispersion` | 0.65 | `dispersion` |
| `rim` | 0.75 | `rim` |
| `glow` | 0.6 | `glow` |
| `shimmerSpeed` | 0.7 | `shimmerSpeed` |

## 5. Scene Specification

### Glass

- Large Card、Medium Card、Navigation、Small Status、Button、Chip を配置する。
- Particle Canvas は Glass surface より後方へ置く。
- `backdrop-filter` により、Glass 越しの Particle の blur、diffusion、contrast を評価する。

### Plasma

- Primary、Secondary、Orb の draggable surface を用意する。
- Surface の接触、merge、stretch、detach を評価する。
- Fixed Dock は `fuse={false}` とし、操作要素には `data-plasma-nodrag` を設定する。
- Join state を画面左下へ表示する。

### Composition

- Glass Card 1 枚と draggable Plasma surface 2 個を配置する。
- Ambient Particle と同時描画し、Material 間の視覚的な競合を確認する。
- 製品画面、Navigation、実データは再現しない。

## 6. Acceptance Baseline

- Playground 起動時と `Reset default` 後の JSON が Pre-Fix Preset と一致する。
- Particle は UI より前面へ出ず、画面下端から上昇する。
- Particle は可視 opacity のまま寿命破棄されず、fade 完了時に消える。
- Glass、Plasma、Composition の各 mode で同じ Ambient preset を共有する。
- Plasma の drag、merge、detach を維持する。
- Preset JSON の copy、restore、LocalStorage 保存を維持する。

## 7. Non-goals

- Production Design Token への昇格
- 既存 MPA route や製品 Frontend への統合
- Windows / Android native UI への適用
- Backend、Workout Data、GitHub I/O との接続
- Pre-Fix 値を最終デザインとして確定すること
