/** #00DDDDから#FFFFFFへのRGB線分を連続・一様に標本化する。個体の生成時だけ呼ぶ。 */
export function sampleAmbientColor(random = Math.random): string {
  const t = random();
  return `${255 * t} ${221 + 34 * t} ${221 + 34 * t}`;
}
