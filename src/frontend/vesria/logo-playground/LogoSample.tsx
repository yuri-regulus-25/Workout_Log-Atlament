import { useEffect, useRef, useState, type CSSProperties } from "react";
import source from "../src/assets/vesria-full-symbol.svg?raw";

export const patterns = {
  Sparkle: { duration: 4100, description: "一度消え、ひとつずつきらめいて現れる。完成したら光の合図。" },
  Elegant: { duration: 2100, description: "線がほどけて、光とともに結び直される。" },
  Mechanical: { duration: 2300, description: "回転、接続、噛み合い。小さな機構が順番に動く。" },
  Weird: { duration: 2400, description: "ノードが寄り道。輪が待ち、何事もなかった顔で戻る。" },
  Bubble: { duration: 1250, description: "押すとむにゅっと潰れ、遅れてﾌﾟﾙﾝ……。" },
} as const;
export type Pattern = keyof typeof patterns;
export const sizes = [140, 115, 45, 34] as const;

/** Repository所有SVGをそのままInline化。Geometryは触らず重複IDと読み上げだけを整理する。 */
export const symbolMarkup = source
  .replace(/<\?xml[^>]*\?>/, "")
  .replace(/\bid="([^"]+)"/g, 'data-part="$1"')
  .replace(/aria-labelledby="[^"]*"/, 'aria-hidden="true"')
  .replace(/role="img"/, 'focusable="false"');

// 個々の線・点へ出現順だけを付ける。Geometryは変更しない。
let revealIndex = 0;
const sparkleMarkup = symbolMarkup.replace(/<(path|circle)\b/g, (_, tag: string) =>
  `<${tag} style="--reveal-delay:${180 + revealIndex++ * 65}ms"`);

export function LogoSample({ pattern, size, reduced }: { pattern: Pattern; size: number; reduced: boolean }) {
  const [running, setRunning] = useState(false);
  const locked = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finish = () => { locked.current = false; setRunning(false); };
  useEffect(() => () => clearTimeout(timer.current), []);
  const play = () => {
    // stateの反映前に連打されても、同期refで再開・Queue・二重実行を防ぐ。
    if (locked.current) return;
    locked.current = true;
    setRunning(true);
    timer.current = setTimeout(finish, reduced ? 180 : patterns[pattern].duration);
  };
  return <div className="sample">
    <button type="button" className={`logo-trigger ${pattern.toLowerCase()} ${running ? "running" : ""} ${reduced ? "reduced" : ""}`}
      style={{ "--logo-size": `${size}px` } as CSSProperties}
      aria-label={`${pattern} ${size}pxを再生`} aria-disabled={running} onClick={play}>
      <span className="symbol" dangerouslySetInnerHTML={{ __html: pattern === "Sparkle" ? sparkleMarkup : symbolMarkup }} />
    </button>
    <span className="sample-status" aria-live="polite">{running ? "再生中" : `${size} × ${size}px`}</span>
  </div>;
}
