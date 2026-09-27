// @vitest-environment jsdom
import { act, createElement as h } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import Entry from "./Entry";
import { LightVeil, lightVeil } from "../visual/LightVeil";
vi.mock("../application/runtime", () => ({
  useRuntime: () => ({ loading: false, reduced: true }),
}));
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
async function entry() {
  const router = createMemoryRouter([
    { path: "/", element: h(Entry) },
    { path: "/overview", element: h("p", null, "Overview") },
  ]);
  await act(() => root.render(h(RouterProvider, { router })));
  return router;
}
it("Reduced Motionでも179999msはEntry、180000msでOverview", async () => {
  const router = await entry();
  await act(() => vi.advanceTimersByTime(179999));
  expect(router.state.location.pathname).toBe("/");
  await act(() => vi.advanceTimersByTime(1));
  expect(router.state.location.pathname).toBe("/overview");
  expect(vi.getTimerCount()).toBe(0);
});
it("手動遷移で待機timerを破棄する", async () => {
  const router = await entry();
  await act(() => host.querySelector("button")!.click());
  expect(router.state.location.pathname).toBe("/overview");
  expect(vi.getTimerCount()).toBe(0);
});
it("Veilはrerenderで再生成せず、非表示でpause、Reduced Motionで撤去する", async () => {
  const animation = {
    cancel: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    onfinish: null as null | (() => void),
  };
  const random = vi.spyOn(Math, "random").mockReturnValue(0);
  const animate = vi.fn(
    (_frames: Keyframe[], _options: KeyframeAnimationOptions) => animation,
  );
  Object.defineProperty(Element.prototype, "animate", {
    value: animate,
    configurable: true,
  });
  await act(() => root.render(h(LightVeil, { reduced: false, paused: false })));
  await act(() => root.render(h(LightVeil, { reduced: false, paused: false })));
  expect(animate).toHaveBeenCalledTimes(lightVeil.count);
  expect(animate.mock.calls[0]?.[1]).toMatchObject({
    duration: (lightVeil.durationSeconds + lightVeil.intervalSeconds) * 1000,
    iterations: 1,
  });
  const surface =
    host.querySelectorAll<SVGElement>(".light-trail")[lightVeil.count - 1];
  expect(host.querySelectorAll(".light-trail")).toHaveLength(7);
  expect(surface.querySelectorAll("path")).toHaveLength(1);
  expect(
    Array.from(surface.querySelectorAll("stop")).map((stop) =>
      stop.getAttribute("stop-opacity"),
    ),
  ).toEqual(["0.9", "0"]);
  const frames = animate.mock.calls[0][0];
  expect(frames).toHaveLength(82);
  expect(frames[0]).toHaveProperty("d");
  expect(surface.style.getPropertyValue("--trail-color")).toBe("0 221 221");
  const curve = surface.querySelector("path")!.getAttribute("d");
  random.mockReturnValue(1);
  await act(() => root.render(h(LightVeil, { reduced: false, paused: false })));
  expect(surface.style.getPropertyValue("--trail-color")).toBe("0 221 221");
  expect(surface.querySelector("path")!.getAttribute("d")).toBe(curve);
  await act(() => animation.onfinish?.());
  expect(surface.style.getPropertyValue("--trail-color")).toBe("255 255 255");
  expect(animate.mock.calls[lightVeil.count]?.[1]).toMatchObject({
    delay: 0,
    duration: 20000,
  });
  await act(() => root.render(h(LightVeil, { reduced: false, paused: true })));
  expect(animation.pause).toHaveBeenCalled();
  await act(() => root.render(h(LightVeil, { reduced: true, paused: false })));
  expect(animation.cancel).toHaveBeenCalled();
  expect(host.querySelector(".light-veil")).toBeNull();
  delete (Element.prototype as { animate?: unknown }).animate;
});
