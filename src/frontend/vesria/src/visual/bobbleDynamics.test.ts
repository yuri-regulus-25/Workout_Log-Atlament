import { describe, expect, it } from "vitest";
import { createBobbleDynamics, dragThreshold } from "./bobbleDynamics";

const layout = {
  width: 800,
  height: 600,
  core: { x: 400, y: 300 },
  nodeWidth: 112,
  nodeHeight: 92,
  nodes: [
    { key: "a", x: 200, y: 200 },
    { key: "b", x: 360, y: 200 },
    { key: "c", x: 600, y: 400 },
  ],
};
describe("必要な間だけ動くBobble", () => {
  it("idleは計算せず、drag対象は追従し、近接Nodeが避け、有限stepで停止する", () => {
    const d = createBobbleDynamics(layout, false);
    const original = structuredClone(d.nodes);
    expect(d.phase).toBe("idle");
    expect(d.step()).toBe(false);
    expect(d.nodes).toEqual(original);
    d.start("a");
    d.move(330, 200);
    for (let i = 0; i < 8; i++) d.step();
    expect(d.nodes[0].x).toBe(330);
    expect(d.nodes[0].y).toBe(200);
    expect(Math.hypot(d.nodes[1].x - 360, d.nodes[1].y - 200)).toBeGreaterThan(
      10,
    );
    expect(layout.core).toEqual({ x: 400, y: 300 });
    d.end();
    expect(d.phase).toBe("settling");
    for (let i = 0; i < 30; i++) d.step();
    expect(d.phase).toBe("idle");
    const settled = structuredClone(d.nodes);
    expect(d.step()).toBe(false);
    expect(d.nodes).toEqual(settled);
  });
  it("Reduced Motionは直接操作を維持し、release後すぐ停止する", () => {
    const d = createBobbleDynamics(layout, true);
    d.start("a");
    d.move(260, 220);
    expect(d.nodes[0].x).toBe(260);
    d.end();
    expect(d.phase).toBe("idle");
  });
  it("キャンセル・破棄は慣性と固定点を解放する", () => {
    const d = createBobbleDynamics(layout, false);
    d.start("a");
    d.move(230, 230);
    d.stop();
    expect(d.phase).toBe("idle");
    expect(
      d.nodes.every(
        (n) => n.fx == null && n.fy == null && n.vx === 0 && n.vy === 0,
      ),
    ).toBe(true);
  });
  it("pointer種別による閾値を持つ", () => {
    expect(dragThreshold("mouse")).toBe(6);
    expect(dragThreshold("touch")).toBe(8);
  });
});
