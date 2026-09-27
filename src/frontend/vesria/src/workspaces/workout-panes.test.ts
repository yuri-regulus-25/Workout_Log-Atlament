// @vitest-environment jsdom
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { ReviewRepository } from "../infrastructure/review-repository";
import Workout from "./Workout";
const runtime = vi.hoisted(() => ({
  data: undefined as unknown,
  repository: undefined as unknown,
  reduced: true,
  refresh: async () => {},
  notify: () => {},
}));
vi.mock("../application/runtime", () => ({ useRuntime: () => runtime }));
it("Session切替でListと詳細の器を維持し、詳細のScrollだけ先頭へ戻す", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
  const repository = new ReviewRepository();
  runtime.repository = repository;
  runtime.data = await repository.load();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const router = createMemoryRouter(
    [{ path: "/workouts/:sessionId?", element: h(Workout) }],
    { initialEntries: ["/workouts/review-24"] },
  );
  try {
    await act(() => root.render(h(RouterProvider, { router })));
    const list = host.querySelector<HTMLElement>(".timeline")!,
      detail = host.querySelector<HTMLElement>(".session-detail")!;
    const first = list.firstElementChild;
    list.scrollTop = 250;
    detail.scrollTop = 180;
    await act(() => router.navigate("/workouts/review-23"));
    expect(host.querySelector(".timeline")).toBe(list);
    expect(list.firstElementChild).toBe(first);
    expect(list.scrollTop).toBe(250);
    expect(host.querySelector(".session-detail")).toBe(detail);
    expect(detail.scrollTop).toBe(0);
    await act(() => router.navigate("/workouts/review-22"));
    expect(list.scrollTop).toBe(250);
    expect(host.querySelector(".timeline")).toBe(list);
  } finally {
    await act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
