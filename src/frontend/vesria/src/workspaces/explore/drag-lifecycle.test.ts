// @vitest-environment jsdom
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useBobbleDrag } from "./useBobbleDrag";

it("収束・Dialog unmount・pointercancelでRAFを残さない", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const queue = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queue.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => queue.delete(key));
  const layout = {
    width: 600,
    height: 400,
    core: { x: 300, y: 200 },
    nodeWidth: 112,
    nodeHeight: 92,
    nodes: [{ key: "a", x: 120, y: 100 }],
  };
  function Harness() {
    const drag = useBobbleDrag(layout, false);
    return h(
      "div",
      { ref: drag.stage },
      h("svg", null, h("line", { "data-key": "a" })),
      h(
        "div",
        { className: "graph-bobble", "data-key": "a", ...drag.handlers("a") },
        h("button", null, "a"),
      ),
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(() => root.render(h(Harness)));
    const send = async (type: string, x: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        isPrimary: true,
        clientX: x,
        clientY: 100,
      });
      await act(() => host.querySelector("button")!.dispatchEvent(event));
    };
    await send("pointerdown", 100);
    await send("pointermove", 150);
    await send("pointerup", 150);
    expect(queue.size).toBe(1);
    for (let tick = 1; tick <= 35; tick++) {
      const callbacks = [...queue.values()];
      queue.clear();
      callbacks.forEach((callback) => callback(tick * 34));
    }
    expect(queue.size).toBe(0);
    expect(host.firstElementChild?.getAttribute("data-motion-state")).toBe(
      "idle",
    );
    await send("pointerdown", 100);
    await send("pointermove", 140);
    await send("pointercancel", 140);
    expect(queue.size).toBe(0);
    expect(host.firstElementChild?.getAttribute("data-motion-state")).toBe(
      "idle",
    );
    await send("pointerdown", 100);
    await send("pointermove", 150);
    expect(queue.size).toBe(1);
    await act(() => root.unmount());
    expect(queue.size).toBe(0);
  } finally {
    host.remove();
    vi.unstubAllGlobals();
  }
});
