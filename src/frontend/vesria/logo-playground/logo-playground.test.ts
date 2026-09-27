// @vitest-environment jsdom
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { LogoSample, patterns, sizes, symbolMarkup, type Pattern } from "./LogoSample";
import original from "../src/assets/vesria-full-symbol.svg?raw";
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers(); host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(() => root.unmount()); host.remove(); vi.useRealTimers(); });
it("Runtime SVGのGeometryと部品を維持し、重複idを除く", () => {
  const parser = new DOMParser();
  const before = parser.parseFromString(original, "image/svg+xml");
  const after = parser.parseFromString(symbolMarkup, "image/svg+xml");
  for (const tag of ["path", "circle"]) {
    const geometry = (doc: Document) => Array.from(doc.querySelectorAll(tag)).map(node => ["d","cx","cy","r","stroke-width","opacity"].map(key => node.getAttribute(key)));
    expect(geometry(after)).toEqual(geometry(before));
  }
  expect(after.querySelectorAll("[id]")).toHaveLength(0);
  expect(after.querySelector('[data-part="orbit-primary"]')).not.toBeNull();
});
for (const pattern of Object.keys(patterns) as Pattern[]) {
  it(`${pattern}: 4サイズ独立、再押下をQueueせず、完了後に静止へ戻る`, async () => {
    await act(() => root.render(h("div", null, sizes.map(size => h(LogoSample, { key:size, size, pattern, reduced:false })))));
    const buttons = host.querySelectorAll("button");
    expect(buttons).toHaveLength(4);
    sizes.forEach((size, index) => expect(buttons[index].style.getPropertyValue("--logo-size")).toBe(`${size}px`));
    const initial = buttons[0].querySelector("svg")!.outerHTML;
    await act(() => { buttons[0].click(); buttons[0].click(); });
    expect(vi.getTimerCount()).toBe(1);
    await act(() => vi.advanceTimersByTime(100));
    await act(() => { buttons[0].click(); buttons[1].click(); });
    expect(vi.getTimerCount()).toBe(2);
    await act(() => vi.advanceTimersByTime(patterns[pattern].duration - 100));
    expect(buttons[0].getAttribute("aria-disabled")).toBe("false");
    expect(buttons[1].getAttribute("aria-disabled")).toBe("true");
    expect(buttons[0].querySelector("svg")!.outerHTML).toBe(initial);
    await act(() => vi.advanceTimersByTime(100));
    expect(vi.getTimerCount()).toBe(0);
    await act(() => buttons[0].click());
    expect(vi.getTimerCount()).toBe(1);
  });
}
it("Reduced Motionは180msで終了、unmountでtimerも破棄", async () => {
  await act(() => root.render(h(LogoSample, {pattern:"Weird",size:34,reduced:true})));
  const button = host.querySelector("button")!;
  await act(() => button.click());
  await act(() => vi.advanceTimersByTime(180));
  expect(button.getAttribute("aria-disabled")).toBe("false");
  await act(() => button.click());
  await act(() => root.render(null));
  expect(vi.getTimerCount()).toBe(0);
});
