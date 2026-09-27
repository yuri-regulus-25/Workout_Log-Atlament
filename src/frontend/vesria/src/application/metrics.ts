import { getTotalSets, getMachineDisplayName } from "@workout-lab/workout-core";
import type { WorkoutSession } from "@workout-lab/workout-types";

export const bodyNames: Record<string, string> = {
  chest: "胸",
  back: "背中",
  legs: "脚",
  shoulders: "肩",
  arms: "腕",
  glutes: "臀部",
  core: "体幹",
  cardio: "有酸素",
  other: "その他",
};
export function selectPeriod(
  sessions: WorkoutSession[],
  from: string,
  to: string,
) {
  return sessions.filter(
    (s) => (!from || s.date >= from) && (!to || s.date <= to),
  );
}
export function dailySets(sessions: WorkoutSession[]) {
  const map = new Map<string, number>();
  sessions.forEach((s) =>
    map.set(s.date, (map.get(s.date) || 0) + getTotalSets(s)),
  );
  return [...map].sort(([a], [b]) => a.localeCompare(b));
}
export function bodySets(sessions: WorkoutSession[]) {
  const map = new Map<string, number>();
  sessions.forEach((s) =>
    s.machines.forEach((m) => {
      const key =
        m.resolution && m.resolution.state !== "resolved"
          ? "不明"
          : bodyNames[m.body_part || "other"];
      map.set(key, (map.get(key) || 0) + m.sets.length);
    }),
  );
  return [...map];
}
/** 重量は同一gym・machineだけで比較。異なる設備のkgを合算して優劣を付けない。 */
export function machineHistory(
  sessions: WorkoutSession[],
  machineId: string,
  gymId: string,
) {
  return sessions
    .filter(
      (s) =>
        s.gym.id === gymId &&
        (!s.gym.resolution || s.gym.resolution.state === "resolved"),
    )
    .flatMap((s) =>
      s.machines
        .filter(
          (m) =>
            m.machine_id === machineId &&
            (!m.resolution || m.resolution.state === "resolved"),
        )
        .map((m) => ({
          id: s.session_id,
          date: s.date,
          sets: m.sets.length,
          weight: Math.max(0, ...m.sets.map((v) => v.weight_kg)),
          name: getMachineDisplayName(m),
        })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
