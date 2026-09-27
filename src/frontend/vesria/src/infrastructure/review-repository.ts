import { localDate } from "../application/date";
import { loadWorkoutSessionsFromFiles } from "@workout-lab/workout-data";
import { validateWorkoutMasterData } from "@workout-lab/workout-core";
import type {
  RawWorkoutSession,
  WorkoutMasterData,
} from "@workout-lab/workout-types";
import {
  ApplicationError,
  type VesriaRepository,
  type Mutation,
  type EditSnapshot,
  type MasterKind,
  type MasterSnapshot,
  type Connection,
} from "../application/contracts";
import { validateSession } from "../application/validation";

/** 人間のレビュー専用。実データとは混ざらず、リロードでリセットするメモリー内Repository。 */
export class ReviewRepository implements VesriaRepository {
  readonly mode = "review" as const;
  private revision = 1;
  private masters: WorkoutMasterData = {
    machines: {
      schema_version: 1,
      machines: [
        ["chest-press", "Chest press", "chest"],
        ["lat-pull", "Lat pulldown", "back"],
        ["leg-press", "Leg press", "legs"],
        ["shoulder-press", "Shoulder press", "shoulders"],
        ["cable-curl", "Cable curl", "arms"],
        ["abdominal", "Abdominal", "core"],
      ].map(([machine_id, name, body_part]) => ({
        machine_id,
        name,
        body_part: body_part as "chest",
        active: true,
        deleted: false,
      })),
    },
    gyms: {
      schema_version: 1,
      gyms: [
        {
          gym_id: "harbor",
          name: "Harbor training studio",
          short_name: "Harbor",
          active: true,
          deleted: false,
          main: true,
        },
        {
          gym_id: "east",
          name: "East side gym",
          short_name: "East",
          active: true,
          deleted: false,
          main: false,
        },
      ],
    },
  };
  private raw: RawWorkoutSession[];
  private repository = {
    owner: "review-only",
    repository: "in-memory",
    ref: "not-persisted",
    rootPath: "",
  };
  constructor(now = new Date()) {
    this.raw = Array.from({ length: 24 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (23 - i) * 3);
      return {
        schema_version: 1,
        session_id: `review-${i + 1}`,
        date: localDate(date),
        gym_id: i % 5 === 0 ? "east" : "harbor",
        status: i === 7 ? "partial" : "complete",
        notes: ["Human Review用の架空記録"],
        machines: this.masters.machines.machines
          .filter((_, m) => (m + i) % 2 === 0)
          .map((m, k) => ({
            machine_id: m.machine_id,
            sets: Array.from({ length: 2 + ((i * 7 + k) % 4) }, (_, s) => ({
              set: s + 1,
              weight_kg: 20 + k * 15 + (i % 4) * 2.5,
              reps: 10 - s,
              rir: 2,
              warmup: false,
            })),
          })),
      };
    });
  }
  async load() {
    return {
      ...loadWorkoutSessionsFromFiles(
        this.raw.map((s) => ({
          path: `${s.session_id}.json`,
          content: JSON.stringify(s),
        })),
        structuredClone(this.masters),
      ),
      readiness: "ready",
      fallback: false,
    };
  }
  async edit(date: string): Promise<EditSnapshot> {
    return {
      date,
      expectedContext: String(this.revision),
      gyms: this.masters.gyms.gyms
        .filter((g) => g.active && !g.deleted)
        .map((g) => ({
          id: g.gym_id,
          name: g.name,
          active: g.active,
          deleted: g.deleted,
        })),
      machines: this.masters.machines.machines
        .filter((m) => m.active && !m.deleted)
        .map((m) => ({
          id: m.machine_id,
          name: m.name,
          active: m.active,
          deleted: m.deleted,
        })),
      sessions: this.raw
        .filter((s) => s.date === date)
        .map((s) => ({
          sessionId: s.session_id,
          warnings: [],
          session: {
            date: s.date,
            gymId: s.gym_id,
            notes: s.notes?.join("\n") || null,
            machines: s.machines.map((m, i) => ({
              sourceIndex: i,
              machineId: m.machine_id,
              notes: m.notes?.join("\n") || null,
              sets: m.sets.map((set, j) => ({
                sourceIndex: j,
                weightKg: set.weight_kg,
                reps: set.reps,
                notes: set.note || null,
              })),
            })),
          },
        })),
    };
  }
  async mutate(request: Mutation) {
    if (request.context !== String(this.revision))
      throw new ApplicationError(
        "競合しました。閉じて最新情報から編集し直してください。",
      );
    const original = this.raw.find((s) => s.session_id === request.id);
    if (request.operation !== "create" && !original)
      throw new ApplicationError("対象のセッションがありません");
    const snapshot = await this.edit(request.input.date);
    const errors = validateSession(
      request.input,
      snapshot.sessions.find((s) => s.sessionId === request.id)?.session ||
        null,
      snapshot.gyms,
      snapshot.machines,
    );
    if (request.operation !== "delete" && errors.length)
      throw new ApplicationError(errors.map((e) => e.message).join("\n"));
    if (request.operation === "delete")
      this.raw = this.raw.filter((s) => s.session_id !== request.id);
    else {
      const next: RawWorkoutSession = {
        ...original,
        schema_version: 1,
        session_id: original?.session_id || `review-${crypto.randomUUID()}`,
        date: request.input.date,
        gym_id: request.input.gymId!,
        status: original?.status || "complete",
        notes: request.input.notes ? request.input.notes.split("\n") : [],
        machines: request.input.machines.map((m) => {
          const previous =
            m.sourceIndex === null
              ? undefined
              : original?.machines[m.sourceIndex];
          return {
            ...previous,
            machine_id: m.machineId!,
            notes:
              m.notes === undefined
                ? previous?.notes
                : m.notes?.split("\n") || [],
            sets: m.sets.map((s, i) => ({
              ...(s.sourceIndex === null ? {} : previous?.sets[s.sourceIndex]),
              set: i + 1,
              weight_kg: s.weightKg!,
              reps: s.reps!,
              note: s.notes || undefined,
            })),
          };
        }),
      };
      this.raw = [
        ...this.raw.filter((s) => s.session_id !== next.session_id),
        next,
      ];
    }
    this.revision++;
    return {
      reflected: true,
      message: "レビュー用データを変更しました（保存されません）",
    };
  }
  async master(type: MasterKind): Promise<MasterSnapshot> {
    return {
      type,
      path: "memory",
      revision: String(this.revision),
      content: JSON.stringify(
        type === "MACHINE_MASTER" ? this.masters.machines : this.masters.gyms,
      ),
    };
  }
  async saveMaster(snapshot: MasterSnapshot, masters: WorkoutMasterData) {
    if (snapshot.revision !== String(this.revision))
      throw new ApplicationError(
        "競合しました。最新情報から編集し直してください。",
      );
    if (!validateWorkoutMasterData(masters).valid)
      throw new ApplicationError("マスターの検証に失敗しました");
    if (
      this.masters.gyms.gyms.some((g) => g.main) &&
      !masters.gyms.gyms.some((g) => g.main)
    )
      throw new ApplicationError("Main Gymは解除ではなく切り替えてください");
    this.masters = structuredClone(masters);
    this.revision++;
    return {
      reflected: true,
      message: "レビュー用マスターを変更しました（保存されません）",
    };
  }
  async connection() {
    return {
      configuration: {
        schemaVersion: 1,
        repository: this.repository,
        resources: [],
        timeouts: {
          githubRequestTimeoutSec: 30,
          syncOperationTimeoutSec: 60,
          generalApiTimeoutSec: 30,
          shutdownTimeoutSec: 5,
        },
      } as Connection,
      credential: {
        configured: false,
        state: "missing" as const,
        limitDate: null,
      },
    };
  }
  async configure(repository: Connection["repository"]) {
    this.repository = repository;
  }
  async credential() {
    throw new ApplicationError(
      "レビュー用モードでは認証情報を受け付けません。実接続に切り替えてください。",
    );
  }
  async sync() {
    /* レビュー用Repositoryに外部I/Oはない。 */
  }
}
