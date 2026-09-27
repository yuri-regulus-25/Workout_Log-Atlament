import { expect, it } from "vitest";
import { sampleAmbientColor } from "./ambientColor";

it("Cyan〜Whiteの同一線分を連続的に標本化する", () => {
  expect(sampleAmbientColor(() => 0)).toBe("0 221 221");
  expect(sampleAmbientColor(() => 1)).toBe("255 255 255");
  expect(sampleAmbientColor(() => 0.5)).toBe("127.5 238 238");
  for (const t of [0.001, 0.137, 0.789, 0.999]) {
    const [r, g, b] = sampleAmbientColor(() => t)
      .split(" ")
      .map(Number);
    expect(r).toBeCloseTo(255 * t);
    expect(g).toBeCloseTo(221 + 34 * t);
    expect(b).toBe(g);
  }
});
