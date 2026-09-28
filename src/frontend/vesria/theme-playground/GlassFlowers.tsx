import { GlassLily, type GlassLilyPlacement } from "./GlassLily";

type AbyssPlant = {
  key: string;
  variant: "lily";
  placement: GlassLilyPlacement;
};

/** 中央の主役株と、同じ造形を左右反転・縮小した左奥株だけを配置する。 */
export const ABYSS_PLANTS: readonly AbyssPlant[] = [
  { key: "left-background-lily", variant: "lily", placement: "background" },
  { key: "center-lily", variant: "lily", placement: "hero" },
] as const;

export function GlassFlowers() {
  return (
    <div className="glass-flowers" aria-hidden="true">
      {ABYSS_PLANTS.map((plant) => (
        <GlassLily key={plant.key} placement={plant.placement} />
      ))}
    </div>
  );
}
