import type { CSSProperties } from "react";

/** Human Review済みのPre-Fix。色相と描画予算は別管理し、基準値を性能設定で上書きしない。 */
export const preFix = {
  ambient: {
    backgroundBrightness: 0,
    greenIntensity: 0,
    ambientGlow: 33,
    density: 100,
    spawnRate: 100,
    riseSpeed: 29,
    drift: 120,
    particleSize: 1,
    particleGlow: 44,
    particleOpacity: 100,
    lifetime: 48,
    fadeTiming: 95,
  },
  glass: {
    opacity: 20,
    blur: 2,
    saturation: 106,
    borderOpacity: 2,
    borderBrightness: 49,
    radius: 16,
    reflection: 65,
    glow: 39,
    shadow: 34,
  },
} as const;

export const materialVariables = {
  "--glass-opacity": preFix.glass.opacity / 100,
  "--glass-blur": `${preFix.glass.blur}px`,
  "--glass-saturation": `${preFix.glass.saturation}%`,
  "--glass-border-opacity": preFix.glass.borderOpacity / 100,
  "--glass-radius": `${preFix.glass.radius}px`,
  "--glass-reflection": preFix.glass.reflection / 100,
  "--glass-glow": preFix.glass.glow / 100,
  "--glass-shadow": preFix.glass.shadow / 100,
  "--ambient-glow": preFix.ambient.ambientGlow / 100,
} as CSSProperties;

export const particleCharacter = {
  speed: Math.max(0.2, preFix.ambient.riseSpeed / 72) * 60,
  angle: (Math.min(35, preFix.ambient.drift / 3.4) * Math.PI) / 180,
  minSize: Math.max(0.8, preFix.ambient.particleSize * 0.45),
  maxSize: preFix.ambient.particleSize * 1.35,
  glow: 4 + preFix.ambient.particleGlow / 4,
  fadeStart: (preFix.ambient.lifetime * preFix.ambient.fadeTiming) / 100,
  emissionDelay: Math.max(0.08, 1.15 - preFix.ambient.spawnRate / 100),
  emissionQuantity: Math.max(1, Math.round(preFix.ambient.density / 22)),
};

/** 不透明なまま寿命切れにしない。Playground同様、最後の2.4秒を連続的なフェードに使う。 */
export function particleAlpha(age: number) {
  return (
    (Math.max(
      0,
      Math.min(
        1,
        (preFix.ambient.lifetime - age) /
          (preFix.ambient.lifetime - particleCharacter.fadeStart),
      ),
    ) *
      preFix.ambient.particleOpacity) /
    100
  );
}

/** 元の33個/秒を上限とし、画面面積に比例した定常密度へ間引く。狭い画面でも最低160個を保持する。 */
export function ambientBudget(
  width: number,
  height: number,
  constrained: boolean,
) {
  const count = Math.round(
    Math.min(constrained ? 220 : 540, Math.max(160, (width * height) / 2400)),
  );
  return {
    count,
    fps: constrained ? 24 : 30,
    dpr: constrained ? 1 : 1.5,
    spawnPerSecond: Math.min(
      particleCharacter.emissionQuantity / particleCharacter.emissionDelay,
      count / preFix.ambient.lifetime,
    ),
  };
}
