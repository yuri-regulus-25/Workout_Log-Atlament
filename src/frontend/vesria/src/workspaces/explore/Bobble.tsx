import { memo, useState, type CSSProperties } from "react";
import { motion, useIsPresent } from "motion/react";
import {
  bobbleTypes,
  type Bobble as Fragment,
} from "../../application/exploration";
import { bobbleSeed } from "../../visual/bobbleGraph";

/** 文字と外殻を別レイヤーにし、ポヨンという変形は外殻だけに与える。操作は通常のbuttonで可能。 */
export const Bobble = memo(function Bobble({
  fragment,
  onPick,
  focused = false,
  reduced,
  graph = false,
}: {
  fragment: Fragment;
  onPick: () => void;
  focused?: boolean;
  reduced: boolean;
  graph?: boolean;
}) {
  const [pulse, setPulse] = useState(0);
  const present = useIsPresent();
  const seed = bobbleSeed(fragment.key);
  return (
    <button
      data-bobble-key={fragment.key}
      disabled={!present}
      aria-hidden={!present || undefined}
      className={`bobble ${focused ? "is-focused" : ""}`}
      style={
        { "--bobble-turn": `${Math.round(seed * 20 - 10)}deg` } as CSSProperties
      }
      aria-label={`${bobbleTypes[fragment.type]}: ${fragment.value}${graph ? (focused ? "、もう一度選ぶと解除" : "、条件を確認") : "を選択"}`}
      aria-pressed={graph ? focused : undefined}
      title={`${bobbleTypes[fragment.type]}: ${fragment.value}`}
      onClick={() => {
        if (graph) setPulse((n) => n + 1);
        onPick();
      }}
    >
      <motion.span
        key={pulse}
        className="bobble-shell"
        aria-hidden="true"
        initial={
          reduced
            ? false
            : {
                scale: pulse ? 0.96 : 0.93,
                borderRadius: "43% 57% 55% 45% / 52% 44% 56% 48%",
              }
        }
        animate={{
          scale: 1,
          borderRadius: "52% 48% 43% 57% / 44% 56% 44% 56%",
        }}
        exit={
          reduced
            ? { opacity: 0 }
            : {
                scaleX: [1, 0.96, 1.025, 0.9],
                scaleY: [1, 1.025, 0.97, 0.9],
                transition: { duration: 0.22, times: [0, 0.3, 0.58, 1] },
              }
        }
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 360, damping: 14, mass: 0.65 }
        }
      />
      <span className="bobble-content">
        <small>{bobbleTypes[fragment.type]}:</small>
        <strong>{fragment.value}</strong>
      </span>
    </button>
  );
});
