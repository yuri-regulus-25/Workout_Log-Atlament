import { describe, expect, it } from "vitest";
import { ABYSS_PLANTS } from "./GlassFlowers";
import { THEME_PROFILES, VIEWPORT_WIDTHS, resolveSurface } from "./theme";

describe("Theme Playgroundの比較契約", () => {
  it("3 Themeが同じ比較構造へ必要な人格を提供する", () => {
    expect(Object.keys(THEME_PROFILES)).toEqual(["plasma", "abyss", "night"]);
    expect(new Set(Object.values(THEME_PROFILES).map((theme) => theme.feeling))).toEqual(
      new Set(["静けさ", "艶やか", "瞬き"]),
    );
  });

  it("Abyssだけを既定Liquidとし、比較用overrideを許可する", () => {
    expect(resolveSurface("plasma", "theme")).toBe("glass");
    expect(resolveSurface("abyss", "theme")).toBe("liquid");
    expect(resolveSurface("night", "theme")).toBe("glass");
    expect(resolveSurface("abyss", "glass")).toBe("glass");
  });

  it("Wide / Medium / Narrowの比較幅を持つ", () => {
    expect(VIEWPORT_WIDTHS).toEqual({ wide: "100%", medium: "900px", narrow: "390px" });
  });

  it("Abyssは中央の百合と左右反転する左奥の百合だけを配置する", () => {
    expect(ABYSS_PLANTS).toEqual([
      { key: "left-background-lily", variant: "lily", placement: "background" },
      { key: "center-lily", variant: "lily", placement: "hero" },
    ]);
    expect(THEME_PROFILES.abyss.flowerCount).toBe(2);
  });
});
