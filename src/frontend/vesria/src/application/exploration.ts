import type {
  WorkoutMasterData,
  WorkoutSession,
  MasterReferenceResolution,
} from "@workout-lab/workout-types";
import { bodyNames } from "./metrics";
import { localDate } from "./date";

export const bobbleTypes = {
  period: "Period",
  machine: "Machine",
  gym: "Gym",
  body: "Body Part",
} as const;
export type BobbleType = keyof typeof bobbleTypes;
export type Bobble = {
  key: string;
  type: BobbleType;
  value: string;
  explanation: string;
  from?: string;
  to?: string;
};
export type ExploreRecord = {
  session: WorkoutSession;
  gym: string;
  machines: Set<string>;
  bodies: Set<string>;
};
export type ExploreCatalog = { bobbles: Bobble[]; records: ExploreRecord[] };

/** 起動日の暦日を固定。両端を含み、同日がない月ではその月末へ丸める。 */
export function relativeStart(date: Date, months: number) {
  const start = new Date(date.getFullYear(), date.getMonth() - months, 1);
  start.setDate(
    Math.min(
      date.getDate(),
      new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(),
    ),
  );
  return localDate(start);
}
/** 正規化済み履歴のIDを尊重し、削除済みも明示的なmaster対応がある場合だけ名称・部位を参照する。 */
function historical<T>(
  id: string,
  resolution: MasterReferenceResolution | undefined,
  index: Map<string, T>,
) {
  return resolution?.state === "invalid_excluded"
    ? undefined
    : index.get(resolution?.resolvedId || id) ||
        index.get(resolution?.originalId || id);
}
export function buildExploreCatalog(
  sessions: WorkoutSession[],
  masters: WorkoutMasterData | undefined,
  launched: Date,
): ExploreCatalog {
  const gyms = new Map<string, WorkoutMasterData["gyms"]["gyms"][number]>();
  const machines = new Map<
    string,
    WorkoutMasterData["machines"]["machines"][number]
  >();
  for (const g of masters?.gyms.gyms || [])
    for (const id of [g.gym_id, ...(g.source_ids || [])]) gyms.set(id, g);
  for (const m of masters?.machines.machines || [])
    for (const id of [m.machine_id, ...(m.source_ids || [])])
      machines.set(id, m);
  const bobbles = new Map<string, Bobble>();
  const add = (b: Bobble) => {
    if (!bobbles.has(b.key)) bobbles.set(b.key, b);
  };
  const end = localDate(launched);
  for (const [months, value] of [
    [1, "1か月"],
    [2, "2か月"],
    [3, "3か月"],
    [6, "半年"],
    [12, "1年"],
  ] as const) {
    const from = relativeStart(launched, months);
    add({
      key: `period:last-${months}`,
      type: "period",
      value: `最近${value}`,
      from,
      to: end,
      explanation: `${from} 〜 ${end} のセッション。Exploreを開いた日を基準に、開始日・終了日とも含みます。`,
    });
  }
  const unique = [...new Map(sessions.map((s) => [s.session_id, s])).values()];
  const records = unique.map((session) => {
    const month = session.date.slice(0, 7);
    const [year, m] = month.split("-").map(Number);
    const from = `${month}-01`,
      to = localDate(new Date(year, m, 0));
    add({
      key: `period:${month}`,
      type: "period",
      value: month.replace("-", "/"),
      from,
      to,
      explanation: `${from} 〜 ${to} に記録されたセッションを探します。`,
    });
    const g = historical(session.gym.id, session.gym.resolution, gyms);
    const gym = `gym:${g?.gym_id || session.gym.resolution?.resolvedId || session.gym.id}`;
    add({
      key: gym,
      type: "gym",
      value:
        g?.short_name ||
        g?.name ||
        session.gym.short_name ||
        session.gym.name ||
        `不明 (${session.gym.id})`,
      explanation:
        "このGymで記録されたセッションを探します。過去に利用したGymも含みます。",
    });
    const machineKeys = new Set<string>(),
      bodies = new Set<string>();
    for (const entry of session.machines) {
      const master = historical(entry.machine_id, entry.resolution, machines);
      const key = `machine:${master?.machine_id || entry.resolution?.resolvedId || entry.machine_id}`;
      machineKeys.add(key);
      add({
        key,
        type: "machine",
        value: master?.name || entry.name || `不明 (${entry.machine_id})`,
        explanation:
          "このMachineの記録を含むセッションを探します。現在の有効・削除状態では履歴を除外しません。",
      });
      const part =
        master?.body_part ||
        (!entry.resolution || entry.resolution.state === "resolved"
          ? entry.body_part
          : undefined);
      if (part && bodyNames[part]) {
        const body = `body:${part}`;
        bodies.add(body);
        add({
          key: body,
          type: "body",
          value: bodyNames[part],
          explanation:
            "この部位に分類されたマシンを含むセッションを探します。身体状態や効果の評価ではありません。",
        });
      }
    }
    return { session, gym, machines: machineKeys, bodies };
  });
  return { bobbles: [...bobbles.values()], records };
}
/** 同種OR・異種AND。Session単位で判定し、期間が重複しても同じIDは一度だけ返す。 */
export function matchingSessions(catalog: ExploreCatalog, selected: string[]) {
  const conditions = catalog.bobbles.filter((b) => selected.includes(b.key));
  if (!conditions.length) return [];
  const groups = Object.keys(bobbleTypes)
    .map((type) => conditions.filter((b) => b.type === type))
    .filter((group) => group.length);
  return catalog.records
    .filter((record) =>
      groups.every((group) =>
        group.some((b) =>
          b.type === "period"
            ? record.session.date >= b.from! && record.session.date <= b.to!
            : b.type === "gym"
              ? record.gym === b.key
              : b.type === "machine"
                ? record.machines.has(b.key)
                : record.bodies.has(b.key),
        ),
      ),
    )
    .map((r) => r.session)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.session_id.localeCompare(b.session_id),
    );
}
/** 表示済みの未選択候補を保持し、不足分だけランダム補充。Refresh時は別の候補を優先する。 */
export function candidateKeys(
  pool: Bobble[],
  selected: string[],
  current: string[] = [],
  count = 4,
  refresh = false,
  random = Math.random,
) {
  const eligible = pool
    .map((b) => b.key)
    .filter((key) => !selected.includes(key));
  const kept = refresh
    ? []
    : [...new Set(current)]
        .filter((key) => eligible.includes(key))
        .slice(0, count);
  const shuffle = (items: string[]) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  const rest = eligible.filter((key) => !kept.includes(key));
  const next = refresh
    ? [
        ...shuffle(rest.filter((key) => !current.includes(key))),
        ...shuffle(rest.filter((key) => current.includes(key))),
      ]
    : shuffle(rest);
  return [...kept, ...next].slice(0, count);
}
export const resultPageSize = 20;
/** 枠の位置を保持して空いた枠だけを補充する。候補不足でもnullの枠を詰めない。 */
export function candidateSlots(
  pool: Bobble[],
  selected: string[],
  current: (string | null)[] = [],
  refresh = false,
) {
  const eligible = new Set(
    pool.filter((b) => !selected.includes(b.key)).map((b) => b.key),
  );
  const seen = new Set<string>();
  const slots = Array.from({ length: 4 }, (_, i) => {
    const key = current[i];
    if (!refresh && key && eligible.has(key) && !seen.has(key)) {
      seen.add(key);
      return key;
    }
    return null;
  });
  const replacements = candidateKeys(
    pool,
    [...selected, ...seen],
    current.filter((key): key is string => !!key),
    4,
    true,
  );
  return slots.map((key) => key || replacements.shift() || null);
}
export function sessionPage(sessions: WorkoutSession[], page: number) {
  const pages = Math.max(1, Math.ceil(sessions.length / resultPageSize));
  const current = Math.max(1, Math.min(page, pages));
  return {
    pages,
    current,
    sessions: sessions.slice(
      (current - 1) * resultPageSize,
      current * resultPageSize,
    ),
  };
}
