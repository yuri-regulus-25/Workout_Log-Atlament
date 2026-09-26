# v4 Visual Playground Review

## ❤️ あぁんちゅき♡

- <!-- 記入 -->
- <!-- 記入 -->
- <!-- 記入 -->

## 🔧 あぁん直して♡

- <!-- 記入 -->
- <!-- 記入 -->
- <!-- 記入 -->

## ❌ いらん

- <!-- 記入 -->
- <!-- 記入 -->
- <!-- 記入 -->

## 🤔 保留

- <!-- 記入 -->
- <!-- 記入 -->
- <!-- 記入 -->

## Pre-Fix Preset

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

## Notes

- 2026-09-27: 初回 Selected Preset を記録。
- 2026-09-27: Selected Preset を初期値として採用し、Ambient Particle を tsParticles 4.4.0 の下端 emitter で再評価。
- 2026-09-27: Particle の random lifetime と可視 opacity での破棄を廃止。Fade timing から lifetime 終端まで連続的に opacity 0 へ減衰するよう修正。
- 2026-09-27: 再評価後の値を Pre-Fix Preset として固定。Background brightness / green intensity は最終差し替えにより 0 とした。
