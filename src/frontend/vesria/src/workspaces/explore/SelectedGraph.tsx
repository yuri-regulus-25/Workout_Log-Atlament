import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Dialog } from "../../ui/common";
import { useNarrow } from "../../ui/useNarrow";
import { layoutBobbleGraph } from "../../visual/bobbleGraph";
import {
  bobbleTypes,
  type Bobble as Fragment,
} from "../../application/exploration";
import { Bobble } from "./Bobble";
import { useBobbleDrag } from "./useBobbleDrag";

/** 開いている間だけ存在するGraph。focusは配置計算を再実行せず、同じ選択集合は同じ座標になる。 */
export function SelectedGraph({
  selected,
  remove,
  close,
  reduced,
}: {
  selected: Fragment[];
  remove: (key: string) => void;
  close: () => void;
  reduced: boolean;
}) {
  const compact = useNarrow();
  const [focused, setFocused] = useState<string | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const pan = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  function endPan(e: PointerEvent<HTMLDivElement>) {
    if (pan.current?.id !== e.pointerId) return;
    pan.current = null;
    delete e.currentTarget.dataset.panning;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const signature = JSON.stringify(selected.map((b) => b.key).sort());
  const layout = useMemo(
    () => layoutBobbleGraph(JSON.parse(signature), compact),
    [signature, compact],
  );
  const detail = selected.find((b) => b.key === focused);
  const drag = useBobbleDrag(layout, reduced);
  useEffect(() => {
    const el = viewport.current;
    if (el) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    }
    return () => {
      const active = pan.current;
      pan.current = null;
      if (el) {
        delete el.dataset.panning;
        if (active && el.hasPointerCapture?.(active.id))
          el.releasePointerCapture(active.id);
      }
    };
  }, [compact]);
  function deselect(key: string) {
    remove(key);
    setFocused(null);
    viewport.current?.focus({ preventScroll: true });
  }
  function focus(key: string) {
    if (focused === key) deselect(key);
    else setFocused(key);
  }
  return (
    <Dialog title="選んだBobble" close={close} className="bobble-graph-dialog">
      <p className="graph-instructions" id="graph-instructions">
        1回選ぶと説明。同じBobbleをもう一度選ぶと解除します。Bobbleは個別にドラッグ、余白をつかむとGraph全体を動かせます。
      </p>
      <div className="selected-graph-layout">
        <div
          className="bobble-graph-viewport"
          ref={viewport}
          tabIndex={0}
          aria-label="選択条件のGraph"
          aria-describedby="graph-instructions"
          onPointerDown={(e) => {
            if (
              e.button !== 0 ||
              e.isPrimary === false ||
              pan.current ||
              (e.target as Element).closest(".graph-bobble")
            )
              return;
            const el = e.currentTarget,
              rect = el.getBoundingClientRect();
            // scrollbar自体の操作はブラウザーへ残す。
            if (
              e.clientX - rect.left >= el.clientWidth ||
              e.clientY - rect.top >= el.clientHeight
            )
              return;
            pan.current = {
              id: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              left: el.scrollLeft,
              top: el.scrollTop,
            };
            el.setPointerCapture?.(e.pointerId);
            el.dataset.panning = "true";
          }}
          onPointerMove={(e) => {
            const start = pan.current;
            if (!start || start.id !== e.pointerId) return;
            e.preventDefault();
            e.currentTarget.scrollLeft = start.left - (e.clientX - start.x);
            e.currentTarget.scrollTop = start.top - (e.clientY - start.y);
          }}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onLostPointerCapture={endPan}
        >
          <div className="bobble-pan-space">
            <div
              className="bobble-graph-stage"
              ref={drag.stage}
              style={{ width: layout.width, height: layout.height }}
            >
              <svg
                width={layout.width}
                height={layout.height}
                className="bobble-connections"
                aria-hidden="true"
              >
                {layout.nodes.map((n) => (
                  <line
                    key={n.key}
                    data-key={n.key}
                    x1={layout.core.x}
                    y1={layout.core.y}
                    x2={n.x}
                    y2={n.y}
                  />
                ))}
              </svg>
              <span
                className="bobble-core"
                aria-hidden="true"
                style={{ left: layout.core.x, top: layout.core.y }}
              />
              {layout.nodes.map((n) => {
                const fragment = selected.find((b) => b.key === n.key)!;
                return (
                  <div
                    className="graph-bobble"
                    key={n.key}
                    data-key={n.key}
                    {...drag.handlers(n.key)}
                    style={{
                      left: 0,
                      top: 0,
                      transform: `translate(${n.x - layout.nodeWidth / 2}px,${n.y - layout.nodeHeight / 2}px)`,
                      width: layout.nodeWidth,
                      height: layout.nodeHeight,
                    }}
                  >
                    <Bobble
                      fragment={fragment}
                      graph
                      focused={focused === n.key}
                      reduced={reduced}
                      onPick={() => focus(n.key)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <aside className="condition-detail" aria-live="polite">
          {detail ? (
            <>
              <span className="eyebrow">{bobbleTypes[detail.type]}</span>
              <h3>{detail.value}</h3>
              <p>{detail.explanation}</p>
              <button className="quiet" onClick={() => deselect(detail.key)}>
                このBobbleを解除
              </button>
            </>
          ) : (
            <>
              <h3>
                {selected.length ? "どれが気になる？" : "まだ選ばれていません"}
              </h3>
              <p>
                {selected.length
                  ? "Bobbleを選ぶと、その条件の意味を確認できます。"
                  : "閉じて、新しいBobbleに出会ってみましょう。"}
              </p>
            </>
          )}
        </aside>
      </div>
    </Dialog>
  );
}
