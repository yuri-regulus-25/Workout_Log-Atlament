// @vitest-environment jsdom
import { act, createElement as h, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createMemoryRouter,
  RouterProvider,
  useNavigate,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dialog, ErrorBoundary } from "./common";
import { useEditorGuard } from "./useEditorGuard";

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  // jsdomではnative modal APIを補い、実際のfocus trapはブラウザーで確認する。
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function click(text: string) {
  const button = [...host.querySelectorAll("button")].find(
    (item) => item.textContent === text,
  );
  expect(button).toBeTruthy();
  await act(() => button!.click());
}
function Editor({ busy = false }: { busy?: boolean }) {
  const [open, setOpen] = useState(true);
  const [dirty, setDirty] = useState(false);
  const navigate = useNavigate();
  const guard = useEditorGuard(open && dirty, busy, () => setOpen(false));
  return h(
    "div",
    null,
    h("button", { onClick: () => navigate("/next") }, "移動"),
    open &&
      h(Dialog, {
        title: "編集",
        close: guard.requestClose,
        primary: h("button", null, "保存"),
        children: h("button", { onClick: () => setDirty(true) }, "変更"),
      }),
    guard.confirmation,
  );
}
describe("編集の離脱保護", () => {
  it("送信中の履歴移動は保留し、破棄する操作を提供しない", async () => {
    const router = createMemoryRouter(
      [{ path: "*", element: h(Editor, { busy: true }) }],
      { initialEntries: ["/previous", "/edit"] },
    );
    await act(() => root.render(h(RouterProvider, { router })));
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/edit");
    expect(host.textContent).toContain("処理が終わるまでお待ちください");
    expect(host.textContent).not.toContain("変更を破棄");
    await click("戻る");
    expect(router.state.blockers.size).toBe(1);
    expect([...router.state.blockers.values()][0].state).toBe("unblocked");
  });
  it("古いchunkの読込失敗は画面再取得が必要な例外として区別する", () => {
    expect(
      ErrorBoundary.getDerivedStateFromError(
        new TypeError("Failed to fetch dynamically imported module: /old.js"),
      ),
    ).toEqual({ failed: true, reloadPage: true });
    expect(
      ErrorBoundary.getDerivedStateFromError(new Error("描画失敗")),
    ).toEqual({ failed: true, reloadPage: false });
  });
  it("実際の描画例外をLocal Errorで受け止め、復帰時に再描画できる", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let failed = true;
    function Content() {
      if (failed) throw new Error("描画試験");
      return h("p", null, "復帰しました");
    }
    await act(() =>
      root.render(h(ErrorBoundary, { local: true, children: h(Content) })),
    );
    expect(host.textContent).toContain("LOCAL ERROR");
    failed = false;
    await click("再読み込み");
    expect(host.textContent).toBe("復帰しました");
  });
  it("閉じる→編集継続→破棄と、多重Dialogのscroll lockを保持する", async () => {
    const router = createMemoryRouter([{ path: "*", element: h(Editor) }]);
    await act(() => root.render(h(RouterProvider, { router })));
    expect(document.body.style.position).toBe("fixed");
    expect(host.querySelector("dialog header")?.textContent).toBe("編集保存");
    await click("変更");
    await act(() =>
      (
        host.querySelector('button[aria-label="閉じる"]') as HTMLButtonElement
      ).click(),
    );
    expect(host.querySelectorAll("dialog")).toHaveLength(2);
    await click("編集を続ける");
    expect(host.querySelectorAll("dialog")).toHaveLength(1);
    expect(document.body.style.position).toBe("fixed");
    await act(() =>
      (
        host.querySelector('button[aria-label="閉じる"]') as HTMLButtonElement
      ).click(),
    );
    await click("変更を破棄");
    expect(host.querySelectorAll("dialog")).toHaveLength(0);
    expect(document.body.style.position).toBe("");
  });
  it("履歴のBackを保留し、破棄後にのみ目的地へ進む", async () => {
    const router = createMemoryRouter(
      [
        { path: "/edit", element: h(Editor) },
        { path: "/previous", element: h("p", null, "前画面") },
      ],
      { initialEntries: ["/previous", "/edit"] },
    );
    await act(() => root.render(h(RouterProvider, { router })));
    await click("変更");
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/edit");
    await click("編集を続ける");
    await act(() => router.navigate(-1));
    await click("変更を破棄");
    expect(router.state.location.pathname).toBe("/previous");
    expect(host.textContent).toBe("前画面");
  });
});
