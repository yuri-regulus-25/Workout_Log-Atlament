export type ThemeName = "plasma" | "abyss" | "night";
export type SurfaceName = "glass" | "liquid";
export type ViewportName = "wide" | "medium" | "narrow";

export type ThemeProfile = {
  label: string;
  feeling: string;
  description: string;
  surface: SurfaceName;
  particleLabel: string;
  particleCount: number | string;
  flowerCount: number;
};

/** Themeは世界と材質だけを定義し、Playgroundの構造や情報は所有しない。 */
export const THEME_PROFILES: Record<ThemeName, ThemeProfile> = {
  plasma: {
    label: "Plasma",
    feeling: "静けさ",
    description: "Ice cyanの光点が、ゆっくりと余白を通り抜ける。",
    surface: "glass",
    particleLabel: "Particles",
    particleCount: "160–540",
    flowerCount: 0,
  },
  abyss: {
    label: "Abyss",
    feeling: "艶やか",
    description: "深度のある水中で、透明な生命だけが光を拾う。",
    surface: "liquid",
    particleLabel: "Bubbles",
    particleCount: 32,
    flowerCount: 2,
  },
  night: {
    label: "Night",
    feeling: "瞬き",
    description: "動かない星が、それぞれの時間で小さく呼吸する。",
    surface: "glass",
    particleLabel: "Stars",
    particleCount: 96,
    flowerCount: 0,
  },
};

export function resolveSurface(
  theme: ThemeName,
  override: "theme" | SurfaceName,
): SurfaceName {
  return override === "theme" ? THEME_PROFILES[theme].surface : override;
}

export const VIEWPORT_WIDTHS: Record<ViewportName, string> = {
  wide: "100%",
  medium: "900px",
  narrow: "390px",
};
