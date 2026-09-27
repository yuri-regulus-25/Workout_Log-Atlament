/** 上端の光から下端の尾へ連続的に細くなる閉じた輪郭。全フレームで頂点数を固定する。 */
export function trailRibbon(x: number, bend: number, head: number): string {
  const left: string[] = [],
    right: string[] = [];
  for (let i = 0; i <= 32; i++) {
    const u = i / 32;
    const t = head - (0.32 * 2 / 3) * (1 - u);
    const cx = x + bend * Math.sin(t * Math.PI * 2);
    const cy = 1080 - 1160 * t;
    const dx = bend * Math.PI * 2 * Math.cos(t * Math.PI * 2);
    const norm = Math.hypot(dx, 1160);
    // 最後の短い区間だけ丸く閉じ、先端にも切断面を作らない。
    const radius =
      (1.1 * 2 / 3) * Math.pow(u, 0.85) * Math.sqrt(Math.min(1, (1 - u) / 0.06));
    const nx = (1160 / norm) * radius,
      ny = (dx / norm) * radius;
    left.push(`${(cx + nx).toFixed(3)},${(cy + ny).toFixed(3)}`);
    right.push(`${(cx - nx).toFixed(3)},${(cy - ny).toFixed(3)}`);
  }
  return `M ${left.join(" L ")} L ${right.reverse().join(" L ")} Z`;
}
