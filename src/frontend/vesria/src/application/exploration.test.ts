import { describe, expect, it } from "vitest";
import {
  buildExploreCatalog,
  candidateKeys,
  matchingSessions,
  relativeStart,
  sessionPage,
} from "./exploration";
import { ReviewRepository } from "../infrastructure/review-repository";
import { layoutBobbleGraph } from "../visual/bobbleGraph";
import { loadWorkoutSessionsFromFiles } from "@workout-lab/workout-data";
import type { WorkoutMasterData } from "@workout-lab/workout-types";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const launched = new Date(2026, 8, 28);
async function fixture() {
  const data = await new ReviewRepository(launched).load();
  return buildExploreCatalog(data.sessions, data.masterData, launched);
}
describe("Bobbleのデータと条件", () => {
  it("Repository内の実データを読み、全期間のORでuniqueな全Sessionを取得する", async () => {
    const masters: WorkoutMasterData = {
      machines: JSON.parse(readFileSync("data/master/machines.json", "utf8")),
      gyms: JSON.parse(readFileSync("data/master/gyms.json", "utf8")),
    };
    const files = (directory: string): { path: string; content: string }[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory()
          ? files(path)
          : /\.jsonl?$/.test(path)
            ? [{ path, content: readFileSync(path, "utf8") }]
            : [];
      });
    const data = loadWorkoutSessionsFromFiles(files("data/workouts"), masters);
    expect(data.issues).toEqual([]);
    const c = buildExploreCatalog(data.sessions, data.masterData, launched);
    const months = c.bobbles
      .filter((b) => b.type === "period" && !b.key.includes("last-"))
      .map((b) => b.key);
    expect(matchingSessions(c, months)).toHaveLength(
      new Set(data.sessions.map((s) => s.session_id)).size,
    );
    expect(
      c.bobbles.filter((b) => b.type === "machine").length,
    ).toBeLessThanOrEqual(masters.machines.machines.length);
  });
  it("起動日の暦日を基準に月末補正し、閏日も正しく扱う", () => {
    expect(relativeStart(new Date(2024, 2, 31), 1)).toBe("2024-02-29");
    expect(relativeStart(new Date(2026, 0, 31), 1)).toBe("2025-12-31");
  });
  it("相対期間5種と、記録のある月だけを混在させる", async () => {
    const c = await fixture();
    expect(c.bobbles.filter((b) => b.type === "period")).toHaveLength(8);
    expect(c.bobbles.find((b) => b.key === "period:2026-06")).toBeUndefined();
    expect(c.bobbles.find((b) => b.key === "period:last-1")).toMatchObject({
      from: "2026-08-28",
      to: "2026-09-28",
    });
  });
  it("無選択は全件ではなく0件を返す", async () =>
    expect(matchingSessions(await fixture(), [])).toEqual([]));
  it("同じTypeはOR、異なるTypeはANDになる", async () => {
    const c = await fixture();
    expect(matchingSessions(c, ["gym:harbor", "gym:east"])).toHaveLength(24);
    const selected = [
      "machine:chest-press",
      "machine:lat-pull",
      "gym:east",
      "body:chest",
    ];
    const result = matchingSessions(c, selected);
    expect(result).toHaveLength(3);
    expect(
      result.every(
        (s) =>
          s.gym.id === "east" &&
          s.machines.some((m) => m.body_part === "chest"),
      ),
    ).toBe(true);
  });
  it("期間の重複でSessionが重複せず、開始・終了日を含む", async () => {
    const c = await fixture();
    expect(
      matchingSessions(c, ["period:last-12", "period:2026-09"]),
    ).toHaveLength(24);
    const month = matchingSessions(c, ["period:2026-09"]);
    expect(month.every((s) => s.date.startsWith("2026-09"))).toBe(true);
    expect(
      matchingSessions(c, ["period:last-1"]).some(
        (s) => s.date === "2026-09-28",
      ),
    ).toBe(true);
  });
  it("存在しない組合せは条件を緩めず0件", async () =>
    expect(
      matchingSessions(await fixture(), ["machine:chest-press", "body:back"]),
    ).toEqual([]));
  it("履歴使用のある無効・削除済みを含み、未使用masterと部位を除外する", () => {
    const masters: WorkoutMasterData = {
      machines: {
        schema_version: 1,
        machines: [
          {
            machine_id: "deleted",
            source_ids: ["old"],
            name: "旧機器",
            body_part: "shoulders",
            active: false,
            deleted: true,
          },
          {
            machine_id: "unused",
            name: "未使用",
            body_part: "legs",
            active: true,
            deleted: false,
          },
        ],
      },
      gyms: {
        schema_version: 1,
        gyms: [
          {
            gym_id: "old-gym",
            name: "旧Gym",
            active: false,
            deleted: true,
            main: false,
          },
          {
            gym_id: "unused",
            name: "未使用",
            active: true,
            deleted: false,
            main: false,
          },
        ],
      },
    };
    const raw = {
      schema_version: 1,
      session_id: "historical",
      date: "2026-08-01",
      status: "complete",
      gym_id: "old-gym",
      machines: [
        { machine_id: "old", sets: [{ set: 1, weight_kg: 20, reps: 5 }] },
      ],
    };
    const data = loadWorkoutSessionsFromFiles(
      [{ path: "history.json", content: JSON.stringify(raw) }],
      masters,
    );
    const c = buildExploreCatalog(data.sessions, data.masterData, launched);
    expect(c.bobbles.map((b) => b.key)).toContain("machine:deleted");
    expect(c.bobbles.map((b) => b.key)).toContain("gym:old-gym");
    expect(c.bobbles.map((b) => b.key)).toContain("body:shoulders");
    expect(c.bobbles.map((b) => b.key)).not.toContain("body:legs");
    expect(c.bobbles.some((b) => b.key.includes("unused"))).toBe(false);
    expect(
      matchingSessions(c, ["machine:deleted", "body:shoulders"]),
    ).toHaveLength(1);
    expect(data.sessions[0].machines[0].resolution?.state).toBe("deleted");
  });
  it("欠落参照の部位を推測せず、実際のIDの候補は保持する", async () => {
    const c = await fixture();
    const session = structuredClone(c.records[0].session);
    session.machines = [
      {
        machine_id: "missing",
        sets: [],
        resolution: {
          state: "missing",
          originalId: "missing",
          resolvedId: null,
        },
      },
    ];
    const unknown = buildExploreCatalog([session], undefined, launched);
    expect(unknown.bobbles.some((b) => b.type === "body")).toBe(false);
    expect(
      unknown.bobbles.find((b) => b.key === "machine:missing")?.value,
    ).toContain("missing");
  });
  it("20件ずつ表示し、最後のページを越えない", async () => {
    const c = await fixture(),
      all = matchingSessions(c, ["period:last-12"]);
    expect(sessionPage(all, 1).sessions).toHaveLength(20);
    expect(sessionPage(all, 2).sessions).toHaveLength(4);
    expect(sessionPage(all, 10).current).toBe(2);
  });
  it("候補の重複と選択済みを除き、不足分だけ補充する", async () => {
    const pool = (await fixture()).bobbles.filter((b) => b.type === "machine");
    const current = candidateKeys(pool, [], [], 4, false, () => 0.5);
    const next = candidateKeys(
      pool,
      [current[0]],
      current,
      4,
      false,
      () => 0.5,
    );
    expect(new Set(next).size).toBe(4);
    expect(next).not.toContain(current[0]);
    expect(next.slice(0, 3)).toEqual(current.slice(1));
    const refresh = candidateKeys(pool, [], current, 4, true, () => 0.5);
    expect(refresh).not.toEqual(current);
    expect(
      candidateKeys(
        pool,
        pool.map((b) => b.key),
      ),
    ).toEqual([]);
  });
});
describe("静止するウニGraph", () => {
  for (const count of [0, 1, 4, 12, 64, 100])
    it(`${count}件で外殻が重ならず、順序・再開で配置が変わらない`, () => {
      const keys = Array.from({ length: count }, (_, i) => `machine:${i}`);
      const a = layoutBobbleGraph(keys, true),
        b = layoutBobbleGraph([...keys].reverse(), true);
      expect(a).toEqual(b);
      for (let i = 0; i < a.nodes.length; i++)
        for (let j = 0; j < i; j++) {
          const dx = Math.abs(a.nodes[i].x - a.nodes[j].x),
            dy = Math.abs(a.nodes[i].y - a.nodes[j].y);
          expect(dx >= a.nodeWidth || dy >= a.nodeHeight).toBe(true);
        }
    });
});
