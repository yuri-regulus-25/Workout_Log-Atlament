import type {
  WorkoutLoadResult,
  WorkoutMasterData,
} from "@workout-lab/workout-types";
import type {
  WorkoutSessionInput,
  WorkoutDateSnapshot,
  AfConfiguration,
  CredentialStatus,
  MasterDocumentSnapshot,
  MasterDocumentType,
} from "@workout-lab/frontend-common";

// 既存の検証済み入力形状を継承する。画面はAFのURL・envelope・transportを知らない。
export type SessionInput = WorkoutSessionInput;
export type EditSnapshot = WorkoutDateSnapshot;
export type Connection = AfConfiguration;
export type Credential = CredentialStatus;
export type MasterSnapshot = MasterDocumentSnapshot;
export type MasterKind = MasterDocumentType;
export type DataSnapshot = WorkoutLoadResult & {
  readiness: string;
  fallback: boolean;
};
export type Mutation = {
  operation: "create" | "update" | "delete";
  id?: string;
  input: SessionInput;
  context: string;
};
export type Receipt = { reflected: boolean; message: string };
export type FieldIssue = { path: string; message: string };
export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly uncertain = false,
    public readonly fieldIssues: FieldIssue[] = [],
  ) {
    super(message);
  }
}

/** 交換可能なApplication境界。FixtureもLiveも同一の利用手順を提供する。 */
export interface VesriaRepository {
  readonly mode: "review" | "live";
  load(): Promise<DataSnapshot>;
  edit(date: string): Promise<EditSnapshot>;
  mutate(request: Mutation): Promise<Receipt>;
  master(kind: MasterKind): Promise<MasterSnapshot>;
  saveMaster(
    snapshot: MasterSnapshot,
    masters: WorkoutMasterData,
  ): Promise<Receipt>;
  connection(): Promise<{ configuration: Connection; credential: Credential }>;
  configure(repository: Connection["repository"]): Promise<void>;
  credential(token: string, limitDate: string | null): Promise<void>;
  sync(): Promise<void>;
}
