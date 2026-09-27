import { describe, expect, it } from "vitest";
import {
  ambientBudget,
  particleAlpha,
  particleCharacter,
  preFix,
} from "./materials";

describe("Human Review済みのVisual baseline", () => {
  it("背景の明度・色面を加算せず、光源だけに色を置く", () => {
    expect(preFix.ambient.backgroundBrightness).toBe(0);
    expect(preFix.ambient.greenIntensity).toBe(0);
    expect(preFix.glass.blur).toBe(2);
  });
  it("45.6秒までは保持し、最後の2.4秒で連続的に消す", () => {
    expect(particleCharacter.fadeStart).toBeCloseTo(45.6);
    expect(particleAlpha(0)).toBe(1);
    expect(particleAlpha(45.6)).toBeCloseTo(1);
    expect(particleAlpha(46.8)).toBeCloseTo(0.5);
    expect(particleAlpha(47.99)).toBeGreaterThan(0);
    expect(particleAlpha(48)).toBe(0);
    expect(particleAlpha(60)).toBe(0);
  });
  it("元の粒径・角度・発生式を維持する", () => {
    expect(particleCharacter.minSize).toBe(0.8);
    expect(particleCharacter.maxSize).toBe(1.35);
    expect((particleCharacter.angle * 180) / Math.PI).toBeCloseTo(35);
    expect(particleCharacter.glow).toBe(15);
    expect(particleCharacter.emissionDelay).toBeCloseTo(0.15);
    expect(particleCharacter.emissionQuantity).toBe(5);
  });
  it("狭い画面でもAmbientを残し、定常粒子数・解像度・描画頻度を制限する", () => {
    const narrow = ambientBudget(390, 844, true);
    const wide = ambientBudget(1440, 1000, false);
    expect(narrow.count).toBe(160);
    expect(narrow.fps).toBe(24);
    expect(narrow.dpr).toBe(1);
    expect(wide.count).toBe(540);
    expect(wide.fps).toBe(30);
    expect(wide.spawnPerSecond * preFix.ambient.lifetime).toBe(wide.count);
    expect(ambientBudget(4000, 3000, true).count).toBe(220);
  });
});
