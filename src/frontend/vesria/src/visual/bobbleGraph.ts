import {
  forceSimulation,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";

export function bobbleSeed(value: string) {
  let hash = 2166136261;
  for (const char of value)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967296;
}
type Node = SimulationNodeDatum & {
  key: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
};
/** SVGとHTMLが共有する静的配置。timerを即停止し、有限tickだけ計算する。入力順によらず同じ配置を返す。 */
export function layoutBobbleGraph(keys: string[], compact: boolean) {
  const width = compact ? 112 : 144,
    height = compact ? 92 : 116;
  const clearance = Math.hypot(width, height) / 2 + 14;
  const sorted = [...new Set(keys)].sort();
  const nodes: Node[] = sorted.map((key, index) => {
    const angle =
      (sorted.length <= 6
        ? (index * Math.PI * 2) / sorted.length
        : index * 2.399963229728653) +
      bobbleSeed(key) * 0.23;
    const radius =
      sorted.length <= 6
        ? clearance * Math.max(1.4, sorted.length / Math.PI) +
          bobbleSeed(key + "r") * 10
        : clearance * (1.75 + Math.sqrt(index) * 1.48) +
          bobbleSeed(key + "r") * 24;
    const x = Math.cos(angle) * radius,
      y = Math.sin(angle) * radius;
    return { key, x, y, tx: x, ty: y };
  });
  // 大量条件でも常時動作させない。64件超は広い静的配置を使い、同じ衝突検査を通す。
  if (nodes.length <= 64) {
    const simulation = forceSimulation(nodes)
      .stop()
      .force("x", forceX<Node>((n) => n.tx).strength(0.12))
      .force("y", forceY<Node>((n) => n.ty).strength(0.12))
      .force("collide", forceCollide<Node>(clearance).iterations(3));
    simulation.tick(100);
  }
  // finite tickの残差を含め、外殻の変形・focus ring分まで非重複を保証する。
  let scale = 1;
  for (let i = 0; i < nodes.length; i++) {
    scale = Math.max(
      scale,
      (clearance + 30) / Math.max(1, Math.hypot(nodes[i].x, nodes[i].y)),
    );
    for (let j = 0; j < i; j++)
      scale = Math.max(
        scale,
        (clearance * 2) /
          Math.max(
            1,
            Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y),
          ),
      );
  }
  const halfX = Math.max(
    compact ? 170 : 300,
    ...nodes.map((n) => Math.abs(n.x * scale) + width / 2 + 20),
  );
  const halfY = Math.max(
    170,
    ...nodes.map((n) => Math.abs(n.y * scale) + height / 2 + 20),
  );
  return {
    width: halfX * 2,
    height: halfY * 2,
    core: { x: halfX, y: halfY },
    nodeWidth: width,
    nodeHeight: height,
    nodes: nodes.map((n) => ({
      key: n.key,
      x: n.x * scale + halfX,
      y: n.y * scale + halfY,
    })),
  };
}
