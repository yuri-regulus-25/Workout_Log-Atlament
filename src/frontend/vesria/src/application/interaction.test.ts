import { describe, expect, it } from "vitest";
import { fieldAttributes, fieldLabel } from "../ui/validationFeedback";

describe("検証結果の提示", () => {
  it("内部パスを利用者の言葉へ変換する", () => {
    expect(fieldLabel("machines[0].sets[1].weightKg")).toBe(
      "マシン1・セット2の重量（kg）",
    );
    expect(fieldLabel("gymId")).toBe("Gym");
    expect(fieldLabel("name")).toBe("名前");
  });
  it("エラーを該当入力と説明文へ結び付ける", () => {
    const props = fieldAttributes(
      [{ path: "gymId", message: "必須" }],
      "gymId",
    );
    expect(props["aria-invalid"]).toBe(true);
    expect(props["aria-describedby"]).toBe(props.id + "-error");
    expect(fieldAttributes([], "gymId")["aria-invalid"]).toBeUndefined();
  });
});
