// @vitest-environment jsdom
import { act, useState, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  FloatingDate,
  FloatingSelect,
  parseSelectionDate,
  selectionDate,
} from "./FloatingSelection";
vi.mock("../application/runtime", () => ({
  useRuntime: () => ({ reduced: true }),
}));
vi.mock("motion/react", () => ({ useReducedMotion: () => false }));
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
it("実在日だけをローカル日付として往復する", () => {
  expect(parseSelectionDate("2026-02-29")).toBeUndefined();
  expect(parseSelectionDate("2026-13-01")).toBeUndefined();
  expect(parseSelectionDate("2026-9-1")).toBeUndefined();
  expect(selectionDate(parseSelectionDate("2024-02-29")!)).toBe("2024-02-29");
});
it("Selectは選択済みと単一Liquidを分け、選択値を通知する", async () => {
  function Sample() {
    const [value, set] = useState("a");
    return h(
      "label",
      null,
      "対象",
      h(
        FloatingSelect,
        { value, onChange: (e) => set(e.target.value) },
        h("option", { value: "a" }, "Alpha"),
        h("option", { value: "b" }, "Beta"),
        h("option", { value: "c", disabled: true }, "Disabled"),
      ),
    );
  }
  await act(() => root.render(h(Sample)));
  await act(() => host.querySelector<HTMLButtonElement>("button")!.click());
  expect(document.querySelectorAll(".liquid-selection-indicator")).toHaveLength(
    1,
  );
  expect(
    document.querySelector('[role="option"][aria-selected="true"]')
      ?.textContent,
  ).toContain("Alpha");
  expect(document.querySelector(".floating-glass")?.className).toContain(
    "floating-reduced",
  );
  const options = document.querySelectorAll<HTMLElement>('[role="option"]');
  await act(() => options[1].click());
  expect(host.querySelector("button")?.textContent).toContain("Beta");
});
it("Calendarは上限日より後を無効化し、クリアは空値を通知する", async () => {
  const change = vi.fn();
  await act(() =>
    root.render(
      h(
        "label",
        null,
        "日付",
        h(FloatingDate, {
          value: "2026-09-28",
          max: "2026-09-28",
          onChange: change,
        }),
      ),
    ),
  );
  await act(() => host.querySelector<HTMLButtonElement>("button")!.click());
  expect(
    document.querySelectorAll(".rdp-day_button:disabled").length,
  ).toBeGreaterThan(0);
  expect(document.querySelector(".rdp-selected")).not.toBeNull();
  const clear = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "クリア",
  )!;
  await act(() => clear.click());
  expect(change).toHaveBeenCalledWith({ target: { value: "" } });
});
