// @vitest-environment jsdom
import { act, createElement as h } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { ReviewRepository } from "../../infrastructure/review-repository";
import Explore from "../Explore";

const runtime = vi.hoisted(() => ({
  data: undefined as unknown,
  reduced: true,
}));
vi.mock("../../application/runtime", () => ({ useRuntime: () => runtime }));
let root: Root;
let host: HTMLDivElement;
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  runtime.data = await new ReviewRepository().load();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function click(selector: string) {
  const button = host.querySelector<HTMLButtonElement>(selector);
  expect(button).toBeTruthy();
  await act(() => button!.click());
}
async function mount(conditions: string[] = []) {
  await act(() =>
    root.render(
      h(
        MemoryRouter,
        { initialEntries: [{ pathname: "/explore", state: { conditions } }] },
        h(Explore),
      ),
    ),
  );
}
it("未選択は全件を表示せず、Graphも空の中心だけになる", async () => {
  await mount();
  expect(host.querySelectorAll(".session-glass")).toHaveLength(0);
  expect(host.textContent).toContain("Bobbleを選んでみてね");
  await click(".mixture-bar button");
  expect(host.querySelectorAll(".graph-bobble")).toHaveLength(0);
  expect(host.querySelector(".bobble-core")).toBeTruthy();
});
for (const pointerType of ["mouse", "touch"])
  it(`${pointerType}: 余白Dragは表示位置だけを動かし、Node座標や条件を変えない`, async () => {
    await mount(["period:last-12", "gym:harbor"]);
    await click(".mixture-bar button");
    const viewport = host.querySelector<HTMLElement>(".bobble-graph-viewport")!;
    Object.defineProperties(viewport, {
      clientWidth: { value: 600 },
      clientHeight: { value: 400 },
    });
    viewport.scrollLeft = 150;
    viewport.scrollTop = 120;
    const coordinates = [...host.querySelectorAll(".graph-bobble")].map((n) =>
      n.getAttribute("style"),
    );
    const send = async (type: string, x: number, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        pointerType,
        pointerId: 8,
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: y,
      });
      await act(() => viewport.dispatchEvent(event));
    };
    await send("pointerdown", 100, 100);
    await send("pointermove", 180, 140);
    await send("pointerup", 180, 140);
    expect(viewport.scrollLeft).toBe(70);
    expect(viewport.scrollTop).toBe(80);
    expect(viewport.dataset.panning).toBeUndefined();
    expect(
      [...host.querySelectorAll(".graph-bobble")].map((n) =>
        n.getAttribute("style"),
      ),
    ).toEqual(coordinates);
    expect(
      host
        .querySelector(".bobble-graph-stage")
        ?.getAttribute("data-motion-state"),
    ).toBe("idle");
  });
it("Cを選んでもA/B/DのDOMと枠が変わらず、補充だけCの枠へ入る", async () => {
  await mount();
  const slots = [...host.querySelectorAll(".candidate-slot")];
  const before = slots.map((s) => s.querySelector("button"));
  await click(".candidate-slot:nth-child(3) button");
  for (const i of [0, 1, 3]) {
    expect(host.querySelectorAll(".candidate-slot")[i]).toBe(slots[i]);
    expect(slots[i].querySelector("button")).toBe(before[i]);
  }
  expect(slots[2].querySelector("button")).not.toBe(before[2]);
  await click(".candidate-slot:nth-child(2) button");
  expect(slots[0].querySelector("button")).toBe(before[0]);
  expect(slots[3].querySelector("button")).toBe(before[3]);
  await click(".candidate-refresh");
  expect(slots[0].querySelector("button")).not.toBe(before[0]);
});
for (const pointerType of ["mouse", "touch"])
  it(`${pointerType}: 閾値未満はClick、Drag後のClickは選択解除にしない`, async () => {
    await mount(["period:last-12", "gym:harbor"]);
    await click(".mixture-bar button");
    const node = host.querySelector<HTMLElement>(".graph-bobble")!,
      button = node.querySelector("button")!;
    const pointer = async (type: string, x: number, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        pointerId: 1,
        pointerType,
        button: 0,
        isPrimary: true,
        clientX: x,
        clientY: y,
      });
      await act(() => button.dispatchEvent(event));
    };
    await pointer("pointerdown", 100, 100);
    await pointer("pointermove", 102, 101);
    await pointer("pointerup", 102, 101);
    await act(() =>
      button.dispatchEvent(
        new MouseEvent("click", { bubbles: true, detail: 1 }),
      ),
    );
    expect(button.getAttribute("aria-pressed")).toBe("true");
    const before = node.style.transform;
    await pointer("pointerdown", 100, 100);
    await pointer("pointermove", 140, 120);
    await pointer("pointerup", 140, 120);
    await act(() =>
      button.dispatchEvent(
        new MouseEvent("click", { bubbles: true, detail: 1 }),
      ),
    );
    expect(node.style.transform).not.toBe(before);
    expect(host.querySelectorAll(".graph-bobble")).toHaveLength(2);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(
      host
        .querySelector(".bobble-graph-stage")
        ?.getAttribute("data-motion-state"),
    ).toBe("idle");
    // 次の通常Clickは従来どおり解除できる。
    await pointer("pointerdown", 140, 120);
    await pointer("pointerup", 140, 120);
    await act(() =>
      button.dispatchEvent(
        new MouseEvent("click", { bubbles: true, detail: 1 }),
      ),
    );
    expect(host.querySelectorAll(".graph-bobble")).toHaveLength(1);
  });
it("候補を使い切っても選択済みを再提示せず、フォーカスの帰着先を残す", async () => {
  await mount();
  await click(".bobble-types button:nth-child(3)");
  expect(host.querySelectorAll(".bobble-candidates button")).toHaveLength(2);
  await click(".bobble-candidates button");
  await click(".bobble-candidates button");
  expect(host.querySelectorAll(".bobble-candidates button")).toHaveLength(0);
  expect(host.querySelector(".candidate-empty")?.textContent).toContain(
    "すべて選ばれています",
  );
  expect(document.activeElement).toBe(host.querySelector(".bobble-candidates"));
});
it("詳細を閉じても候補とページを保持し、Graph解除ではページを戻す", async () => {
  await mount(["period:last-12", "period:last-6"]);
  expect(host.querySelectorAll(".session-glass")).toHaveLength(20);
  await click(".explore-pagination button:last-child");
  expect(host.querySelectorAll(".session-glass")).toHaveLength(4);
  const candidates = host.querySelector(".bobble-candidates")?.textContent;
  await click(".session-glass");
  expect(document.documentElement.style.overflow).toBe("hidden");
  expect(host.querySelector("dialog")?.textContent).toContain(
    "セッションの記録",
  );
  await click('dialog button[aria-label="閉じる"]');
  expect(host.querySelector(".bobble-candidates")?.textContent).toBe(
    candidates,
  );
  expect(host.querySelector(".explore-pagination")?.textContent).toContain(
    "2 / 2",
  );
  await click(".mixture-bar button");
  await click(".graph-bobble button");
  expect(host.querySelectorAll(".graph-bobble")).toHaveLength(2);
  expect(host.querySelector(".condition-detail")?.textContent).toContain(
    "このBobbleを解除",
  );
  await click('.graph-bobble button[aria-pressed="true"]');
  expect(host.querySelectorAll(".graph-bobble")).toHaveLength(1);
  expect(document.activeElement).toBe(
    host.querySelector(".bobble-graph-viewport"),
  );
  await click('dialog button[aria-label="閉じる"]');
  expect(host.querySelector(".explore-pagination")?.textContent).toContain(
    "1 / 2",
  );
});
