import {
  forceSimulation,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";
import type { layoutBobbleGraph } from "./bobbleGraph";

type Layout = ReturnType<typeof layoutBobbleGraph>;
type MovingNode = SimulationNodeDatum & {
  key: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
};
export const dragThreshold = (pointerType: string) =>
  pointerType === "touch" ? 8 : 6;

/** 選択条件とは独立した、Dialog内だけの座標。d3のtimerは起動せず、呼出側が必要な間だけstepする。 */
export function createBobbleDynamics(layout: Layout, reduced: boolean) {
  const nodes: MovingNode[] = layout.nodes.map((n) => ({
    ...n,
    tx: n.x,
    ty: n.y,
  }));
  const core: MovingNode = {
    key: "",
    ...layout.core,
    tx: layout.core.x,
    ty: layout.core.y,
    fx: layout.core.x,
    fy: layout.core.y,
  };
  const radius = Math.hypot(layout.nodeWidth, layout.nodeHeight) / 2 + 6;
  const simulation = forceSimulation([...nodes, core])
    .stop()
    .velocityDecay(0.48)
    .force("x", forceX<MovingNode>((n) => n.tx).strength(0.065))
    .force("y", forceY<MovingNode>((n) => n.ty).strength(0.065))
    .force(
      "collide",
      forceCollide<MovingNode>((n) => (n === core ? 24 : radius)).iterations(2),
    );
  let dragged: MovingNode | undefined;
  let phase: "idle" | "dragging" | "settling" = "idle",
    ticks = 0;
  const constrain = (n: MovingNode) => {
    n.x = Math.max(
      layout.nodeWidth / 2 + 10,
      Math.min(layout.width - layout.nodeWidth / 2 - 10, n.x),
    );
    n.y = Math.max(
      layout.nodeHeight / 2 + 10,
      Math.min(layout.height - layout.nodeHeight / 2 - 10, n.y),
    );
  };
  function stop() {
    simulation.stop();
    phase = "idle";
    dragged = undefined;
    for (const n of nodes) {
      n.fx = null;
      n.fy = null;
      n.vx = 0;
      n.vy = 0;
    }
  }
  function step() {
    if (phase === "idle") return false;
    simulation.tick();
    nodes.forEach(constrain);
    if (
      phase === "settling" &&
      (++ticks >= 27 ||
        (simulation.alpha() < 0.04 &&
          nodes.every((n) => Math.hypot(n.vx || 0, n.vy || 0) < 0.12)))
    ) {
      stop();
      return false;
    }
    return true;
  }
  return {
    nodes,
    get phase() {
      return phase;
    },
    start(key: string) {
      dragged = nodes.find((n) => n.key === key);
      if (!dragged) return;
      for (const n of nodes) {
        n.tx = n.x;
        n.ty = n.y;
      }
      // accessorのcached targetを更新し、以前のdrag地点へ引き戻さない。
      simulation.force("x", forceX<MovingNode>((n) => n.tx).strength(0.065));
      simulation.force("y", forceY<MovingNode>((n) => n.ty).strength(0.065));
      dragged.fx = dragged.x;
      dragged.fy = dragged.y;
      simulation.alpha(0.35);
      phase = "dragging";
    },
    move(x: number, y: number) {
      if (!dragged) return;
      dragged.x = x;
      dragged.y = y;
      constrain(dragged);
      dragged.fx = dragged.x;
      dragged.fy = dragged.y;
      simulation.alpha(0.35);
      if (reduced) {
        for (let i = 0; i < 4; i++) step();
      }
    },
    end() {
      if (!dragged) return;
      dragged.tx = dragged.x;
      dragged.ty = dragged.y;
      dragged.fx = null;
      dragged.fy = null;
      dragged = undefined;
      simulation.force("x", forceX<MovingNode>((n) => n.tx).strength(0.065));
      simulation.force("y", forceY<MovingNode>((n) => n.ty).strength(0.065));
      phase = "settling";
      ticks = 0;
      simulation.alpha(0.3);
      // Reduced Motionでは残留アニメーションを作らず、その場で衝突だけ解消する。
      if (reduced) {
        for (let i = 0; i < 27; i++) step();
        stop();
      }
    },
    step,
    stop,
  };
}
