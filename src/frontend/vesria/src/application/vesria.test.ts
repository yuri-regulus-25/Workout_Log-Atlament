import { describe, expect, it, vi } from "vitest";
import { ReviewRepository } from "../infrastructure/review-repository";
import { LegacyAfRepository } from "../infrastructure/legacy-af";
import { bodySets, dailySets, machineHistory, selectPeriod } from "./metrics";
import { validateSession } from "./validation";
import type { SessionInput } from "./contracts";
import { localDate } from "./date";

const input: SessionInput = {
  date: "2026-09-27",
  gymId: "harbor",
  notes: "review",
  machines: [
    {
      sourceIndex: null,
      machineId: "chest-press",
      sets: [{ sourceIndex: null, weightKg: 22.5, reps: 10, notes: null }],
    },
  ],
};
describe("Vesria review boundary", () => {
  it("日付はUTCではなく端末の暦日で扱う", () => {
    expect(localDate(new Date(2026, 8, 27, 0, 30))).toBe("2026-09-27");
  });
  it("架空記録を既存parserで正規化し、実データとは分離する", async () => {
    const repository = new ReviewRepository(new Date("2026-09-27T12:00:00Z"));
    const result = await repository.load();
    expect(result.issues).toEqual([]);
    expect(result.sessions).toHaveLength(24);
    expect(
      result.sessions.every((s) => s.session_id.startsWith("review-")),
    ).toBe(true);
    expect(result.masterData?.gyms.gyms.filter((g) => g.main)).toHaveLength(1);
  });
  it("同一日付でも別セッションとして作成し、古いcontextを拒否する", async () => {
    const repository = new ReviewRepository(),
      snapshot = await repository.edit(input.date);
    await repository.mutate({
      operation: "create",
      input,
      context: snapshot.expectedContext,
    });
    await expect(
      repository.mutate({
        operation: "create",
        input,
        context: snapshot.expectedContext,
      }),
    ).rejects.toThrow("競合");
    const fresh = await repository.edit(input.date);
    await repository.mutate({
      operation: "create",
      input,
      context: fresh.expectedContext,
    });
    const created = (await repository.edit(input.date)).sessions.filter(
      (s) => s.session.notes === "review",
    );
    expect(created).toHaveLength(2);
    expect(created[0].sessionId).not.toBe(created[1].sessionId);
  });
  it("編集でRIR等の未編集情報を保持し、削除は対象IDだけに適用する", async () => {
    const repository = new ReviewRepository(),
      data = await repository.load(),
      original = data.sessions[0],
      snapshot = await repository.edit(original.date);
    const edit = snapshot.sessions[0];
    edit.session.machines[0].sets[0].reps = 8;
    await repository.mutate({
      operation: "update",
      id: edit.sessionId,
      input: edit.session,
      context: snapshot.expectedContext,
    });
    const after = (await repository.load()).sessions.find(
      (s) => s.session_id === edit.sessionId,
    )!;
    expect(after.machines[0].sets[0].rir).toBe(2);
    expect(after.machines[0].sets[0].reps).toBe(8);
    const current = await repository.edit(original.date);
    await repository.mutate({
      operation: "delete",
      id: edit.sessionId,
      input: edit.session,
      context: current.expectedContext,
    });
    expect((await repository.load()).sessions).toHaveLength(23);
  });
  it("マスターの重複とMain Gym解除を拒否し、revisionを守る", async () => {
    const repository = new ReviewRepository(),
      data = await repository.load(),
      snapshot = await repository.master("GYM_MASTER");
    const masters = structuredClone(data.masterData!);
    masters.gyms.gyms[0].main = false;
    await expect(repository.saveMaster(snapshot, masters)).rejects.toThrow(
      "Main Gym",
    );
    masters.gyms.gyms[0].main = true;
    masters.gyms.gyms[1].gym_id = masters.gyms.gyms[0].gym_id;
    await expect(repository.saveMaster(snapshot, masters)).rejects.toThrow(
      "検証",
    );
  });
  it("機器間・Gym間の重量を混在させない", async () => {
    const data = await new ReviewRepository().load();
    const rows = machineHistory(data.sessions, "chest-press", "harbor");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows)
      expect(data.sessions.find((s) => s.session_id === row.id)?.gym.id).toBe(
        "harbor",
      );
    expect(machineHistory(data.sessions, "chest-press", "unknown")).toEqual([]);
    expect(dailySets(data.sessions).length).toBe(24);
    expect(bodySets(data.sessions).length).toBe(6);
    expect(selectPeriod(data.sessions, "2099-01-01", "")).toEqual([]);
  });
  it("入力の範囲・重複・既存参照保持を検証する", () => {
    const next = structuredClone(input);
    next.machines[0].sets[0].reps = 101;
    const options = [
      { id: "chest-press", name: "Chest", active: true, deleted: false },
    ];
    expect(
      validateSession(next, input, [], options).some((e) =>
        e.path.endsWith("reps"),
      ),
    ).toBe(true);
    const retained = structuredClone(input);
    retained.machines[0].sourceIndex = 0;
    expect(validateSession(retained, input, [], []).length).toBe(0);
    expect(validateSession(input, null, [], []).length).toBe(2);
  });
});
describe("Vesria Legacy AF adapter", () => {
  it("サーバーの項目エラーは文章に連結せず、入力へ対応付ける形で渡す", async () => {
    const fieldIssues = [
      { path: "machines[0].sets[0].reps", message: "1以上にしてください" },
    ];
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          errors: [
            {
              code: "WORKOUT_WRITE_VALIDATION_FAILED",
              message: "machines[0].sets[0].reps invalid",
            },
          ],
          data: { result: null, fieldErrors: fieldIssues },
        }),
      ),
    );
    await expect(
      new LegacyAfRepository(fetcher).mutate({
        operation: "create",
        input,
        context: "x",
      }),
    ).rejects.toMatchObject({
      uncertain: false,
      message: "入力内容を確認してください。保存は行われていません。",
      fieldIssues,
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("必須マスターの欠落を正常な空状態に変換しない", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            errors: [],
            data: {
              readiness: { state: "ready" },
              runtimeData: { fallbackActive: false },
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, errors: [], data: { sessions: [] } }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
    await expect(new LegacyAfRepository(fetcher).load()).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("IDとexpectedContextを変更せず送信し、commit済みreflection失敗を再送可能な失敗にしない", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          errors: [],
          data: { result: { reflection: { succeeded: false } } },
        }),
      ),
    );
    const repository = new LegacyAfRepository(fetcher);
    const receipt = await repository.mutate({
      operation: "update",
      id: "session/1",
      input,
      context: "revision:xyz",
    });
    expect(receipt.reflected).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/v1/common/workout-write/sessions/session%2F1",
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      session: input,
      expectedContext: "revision:xyz",
    });
  });
  it("通信途絶時に自動再送せず、結果不明として報告する", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline")),
      repository = new LegacyAfRepository(fetcher);
    await expect(
      repository.mutate({ operation: "create", input, context: "x" }),
    ).rejects.toMatchObject({ uncertain: true });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("readinessが未設定ならruntime dataを取得しない", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          errors: [],
          data: { readiness: { state: "unconfigured" } },
        }),
      ),
    );
    await expect(new LegacyAfRepository(fetcher).load()).rejects.toThrow(
      "unconfigured",
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("fallback書込不可を尊重して編集snapshotを取得しない", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          errors: [],
          data: { writable: false, reason: "FALLBACK_ACTIVE" },
        }),
      ),
    );
    await expect(
      new LegacyAfRepository(fetcher).edit(input.date),
    ).rejects.toThrow("FALLBACK_ACTIVE");
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
