import { loadRuntimeWorkoutSessions } from "@workout-lab/workout-data";
import type {
  AfResponse,
  AfStatus,
  WorkoutWriteBoundary,
  MasterWriteBoundary,
  WorkoutMutationOutcome,
} from "@workout-lab/frontend-common";
import {
  ApplicationError,
  type VesriaRepository,
  type DataSnapshot,
  type EditSnapshot,
  type Mutation,
  type Receipt,
  type MasterSnapshot,
  type MasterKind,
  type Connection,
  type Credential,
} from "../application/contracts";
import type { WorkoutMasterData } from "@workout-lab/workout-types";

/** 診断用コードやサーバー側の入力パスを、そのまま利用者向け文章にしない。 */
function errorMessage(errors: { code: string; message: string }[]) {
  return errors
    .map((e) =>
      /CONFLICT/.test(e.code)
        ? "ほかの変更が反映されています。最新の内容を読み直してから編集してください。"
        : /VALIDATION|MASTER_WRITE_INVALID/.test(e.code)
          ? "入力内容を確認してください。保存は行われていません。"
          : e.message,
    )
    .join("\n");
}

/** Legacy localhost AFだけを知る暫定アダプター。非冪等操作は自動再送しない。 */
export class LegacyAfRepository implements VesriaRepository {
  readonly mode = "live" as const;
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  private async request<T>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<AfResponse<T>> {
    try {
      const response = await this.fetcher(`/api/v1/common/${path}`, {
        method,
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
      });
      const payload = (await response.json()) as AfResponse<T>;
      if (
        typeof payload.success !== "boolean" ||
        !Array.isArray(payload.errors)
      )
        throw new Error("応答形式が不正です");
      return payload;
    } catch {
      throw new ApplicationError(
        method === "GET"
          ? "Application Frameworkに接続できません。Settingsで接続先・起動状態を確認してください。"
          : "応答を確認できません。保存済みの可能性があります。自動再送せず、同期して結果を確認してください。",
        method !== "GET",
      );
    }
  }
  private async read<T>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> {
    const response = await this.request<T>(path, method, body);
    if (!response.success || response.data == null)
      throw new ApplicationError(
        errorMessage(response.errors) || "データを取得できません",
        method !== "GET",
      );
    return response.data;
  }
  async load(): Promise<DataSnapshot> {
    const status = await this.read<AfStatus>("status");
    if (
      status.readiness.state === "unconfigured" ||
      status.readiness.state === "unavailable"
    )
      throw new ApplicationError(
        `接続状態: ${status.readiness.state}。Settingsで設定・同期を行ってください。`,
      );
    const data = await loadRuntimeWorkoutSessions({
      endpoints: ["/api/v1/common/runtime/workouts"],
      fetcher: (url, options) =>
        this.fetcher(url, { ...options, signal: AbortSignal.timeout(45000) }),
    });
    if (!data.masterData)
      throw new ApplicationError(
        "必須マスターを読み込めません。空の記録とは扱わず、Settingsで同期を確認してください。",
      );
    return {
      ...data,
      readiness: status.readiness.state,
      fallback: status.runtimeData.fallbackActive,
    };
  }
  async edit(date: string): Promise<EditSnapshot> {
    const boundary = await this.read<WorkoutWriteBoundary>(
      "workout-write/boundary",
    );
    if (!boundary.writable)
      throw new ApplicationError(
        `編集できません: ${boundary.reason || boundary.source}`,
      );
    return this.read(`workout-write/date/${encodeURIComponent(date)}`);
  }
  async mutate({ operation, id, input, context }: Mutation): Promise<Receipt> {
    const response = await this.request<WorkoutMutationOutcome>(
      `workout-write/sessions${operation === "create" ? "" : `/${encodeURIComponent(id!)}`}`,
      { create: "POST", update: "PUT", delete: "DELETE" }[operation],
      operation === "delete"
        ? { expectedContext: context }
        : { session: input, expectedContext: context },
    );
    // Remote commitが成立している場合、reflection failureを失敗扱いして再送させない。
    if (response.data?.result)
      return {
        reflected: response.data.result.reflection.succeeded,
        message: response.data.result.reflection.succeeded
          ? "保存しました"
          : "保存済みですが表示の更新に失敗しました。再保存せず同期してください。",
      };
    throw new ApplicationError(
      errorMessage(response.errors) || "保存結果を確認できません",
      !response.errors.some((e) => /VALIDATION|CONFLICT/.test(e.code)),
      response.data?.fieldErrors || [],
    );
  }
  async master(kind: MasterKind): Promise<MasterSnapshot> {
    const boundary = await this.read<MasterWriteBoundary>(
      "master-write/boundary",
    );
    if (
      !boundary.security.writeEnabled ||
      !boundary.allowedTargets.some((t) => t.type === kind && t.writeAllowed)
    )
      throw new ApplicationError(
        "このマスターは現在編集できません。接続設定を確認してください。",
      );
    return this.read(`master-write/documents/${kind}`);
  }
  async saveMaster(
    snapshot: MasterSnapshot,
    masters: WorkoutMasterData,
  ): Promise<Receipt> {
    await this.read(`master-write/documents/${snapshot.type}`, "PUT", {
      expectedRevision: snapshot.revision,
      content: JSON.stringify(
        snapshot.type === "MACHINE_MASTER" ? masters.machines : masters.gyms,
      ),
    });
    return { reflected: true, message: "マスターを保存しました" };
  }
  async connection() {
    const [configuration, credential] = await Promise.all([
      this.read<Connection>("configuration"),
      this.read<Credential>("credential/status"),
    ]);
    return { configuration, credential };
  }
  async configure(repository: Connection["repository"]) {
    await this.read("configuration", "POST", { repository });
  }
  async credential(token: string, limitDate: string | null) {
    await this.read("credential", "POST", { token, limitDate });
  }
  async sync() {
    await this.read("sync", "POST");
  }
}
