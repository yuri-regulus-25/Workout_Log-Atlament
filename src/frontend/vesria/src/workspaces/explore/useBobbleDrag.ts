import { useEffect, useRef, type PointerEvent, type MouseEvent } from "react";
import {
  createBobbleDynamics,
  dragThreshold,
} from "../../visual/bobbleDynamics";
import type { layoutBobbleGraph } from "../../visual/bobbleGraph";

/** Pointer captureはNodeだけ。クリック条件とは独立し、フレーム更新ではReact全体を再描画しない。 */
export function useBobbleDrag(
  layout: ReturnType<typeof layoutBobbleGraph>,
  reduced: boolean,
) {
  const stage = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof createBobbleDynamics> | null>(null);
  const raf = useRef<number | null>(null),
    last = useRef(0);
  const settleDeadline = useRef(0);
  const gesture = useRef<{
    id: number;
    key: string;
    x: number;
    y: number;
    nx: number;
    ny: number;
    threshold: number;
    dragged: boolean;
    target: HTMLDivElement;
    capture: HTMLButtonElement;
  } | null>(null);
  const suppress = useRef<string | null>(null);
  function paint() {
    const root = stage.current,
      dynamics = engine.current;
    if (!root || !dynamics) return;
    root.dataset.motionState = dynamics.phase;
    const elements = new Map(
      Array.from(root.querySelectorAll<HTMLElement>(".graph-bobble")).map(
        (el) => [el.dataset.key, el],
      ),
    );
    const lines = new Map(
      Array.from(root.querySelectorAll<SVGLineElement>("line")).map((el) => [
        el.dataset.key,
        el,
      ]),
    );
    for (const n of dynamics.nodes) {
      const node = elements.get(n.key);
      if (node)
        node.style.transform = `translate(${n.x - layout.nodeWidth / 2}px,${n.y - layout.nodeHeight / 2}px)`;
      const line = lines.get(n.key);
      line?.setAttribute("x2", String(n.x));
      line?.setAttribute("y2", String(n.y));
    }
    if (dynamics.phase === "idle")
      root
        .querySelectorAll<HTMLElement>("[data-settling]")
        .forEach((el) => delete el.dataset.settling);
  }
  function frame(time: number) {
    raf.current = null;
    if (time - last.current >= 32) {
      if (
        engine.current?.phase === "settling" &&
        time >= settleDeadline.current
      )
        engine.current.stop();
      else engine.current?.step();
      last.current = time;
      paint();
    }
    if (engine.current?.phase !== "idle" && engine.current)
      raf.current = requestAnimationFrame(frame);
  }
  function schedule() {
    if (!reduced && engine.current?.phase !== "idle" && raf.current === null)
      raf.current = requestAnimationFrame(frame);
  }
  function finish(cancel = false) {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    if (g.dragged) {
      suppress.current = g.key;
      engine.current?.end();
      settleDeadline.current = performance.now() + 900;
      if (cancel) {
        engine.current?.stop();
        if (raf.current !== null) cancelAnimationFrame(raf.current);
        raf.current = null;
      }
      delete g.target.dataset.dragging;
      if (!reduced && !cancel) g.target.dataset.settling = "true";
      paint();
      schedule();
    }
    if (g.capture.hasPointerCapture?.(g.id))
      g.capture.releasePointerCapture(g.id);
  }
  useEffect(() => {
    engine.current = createBobbleDynamics(layout, reduced);
    paint();
    const hidden = () => {
      if (document.hidden) {
        finish(true);
        engine.current?.stop();
        if (raf.current !== null) cancelAnimationFrame(raf.current);
        raf.current = null;
        paint();
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      const g = gesture.current;
      gesture.current = null;
      if (g?.capture.hasPointerCapture?.(g.id))
        g.capture.releasePointerCapture(g.id);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      engine.current?.stop();
      engine.current = null;
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [layout, reduced]);
  return {
    stage,
    handlers: (key: string) => ({
      onPointerDown(e: PointerEvent<HTMLDivElement>) {
        if (e.button !== 0 || e.isPrimary === false || gesture.current) return;
        const n = engine.current?.nodes.find((n) => n.key === key);
        if (!n) return;
        const capture =
          e.currentTarget.querySelector<HTMLButtonElement>("button");
        if (!capture) return;
        // 収束中に掴み直した場合も、接触した位置を基点にして飛びを防ぐ。
        engine.current?.stop();
        if (raf.current !== null) cancelAnimationFrame(raf.current);
        raf.current = null;
        paint();
        suppress.current = null;
        gesture.current = {
          id: e.pointerId,
          key,
          x: e.clientX,
          y: e.clientY,
          nx: n.x,
          ny: n.y,
          threshold: dragThreshold(e.pointerType),
          dragged: false,
          target: e.currentTarget,
          capture,
        };
        // threshold未満のtapではbuttonの標準clickをそのまま使う。
        capture.setPointerCapture?.(e.pointerId);
      },
      onPointerMove(e: PointerEvent<HTMLDivElement>) {
        const g = gesture.current;
        if (!g || g.id !== e.pointerId) return;
        const dx = e.clientX - g.x,
          dy = e.clientY - g.y;
        if (!g.dragged && Math.hypot(dx, dy) <= g.threshold) return;
        if (!g.dragged) {
          g.dragged = true;
          engine.current?.start(key);
          g.target.dataset.dragging = "true";
          delete g.target.dataset.settling;
        }
        e.preventDefault();
        engine.current?.move(g.nx + dx, g.ny + dy);
        paint();
        schedule();
      },
      onPointerUp(e: PointerEvent<HTMLDivElement>) {
        if (gesture.current?.id === e.pointerId) finish();
      },
      onPointerCancel(e: PointerEvent<HTMLDivElement>) {
        if (gesture.current?.id === e.pointerId) finish(true);
      },
      onLostPointerCapture(e: PointerEvent<HTMLDivElement>) {
        if (gesture.current?.id === e.pointerId) finish(true);
      },
      onClickCapture(e: MouseEvent<HTMLDivElement>) {
        if (suppress.current === key && e.detail !== 0) {
          e.preventDefault();
          e.stopPropagation();
          suppress.current = null;
        }
      },
    }),
  };
}
