import type { WorkoutSession } from "@workout-lab/workout-types";
import {
  getGymDisplayName,
  getMachineDisplayName,
  getTotalSets,
} from "@workout-lab/workout-core";
import { Dialog } from "../../ui/common";

/** Explore内で記録された事実だけを読む。表示元の条件・候補・ページを変更しない。 */
export function SessionDetail({
  session,
  close,
}: {
  session: WorkoutSession;
  close: () => void;
}) {
  return (
    <Dialog
      title="セッションの記録"
      close={close}
      className="explore-detail-dialog"
    >
      <div className="explore-detail-summary">
        <span className="eyebrow">
          {session.status === "partial" ? "PARTIAL RECORD" : "SESSION"}
        </span>
        <h3>{session.date}</h3>
        <p>{getGymDisplayName(session.gym)}</p>
        <small>
          {session.machines.length} machines · {getTotalSets(session)} sets
        </small>
      </div>
      {session.notes?.length ? (
        <section>
          <h3>セッションメモ</h3>
          {session.notes.map((note, i) => (
            <p className="record-note" key={i}>
              {note}
            </p>
          ))}
        </section>
      ) : null}
      {session.machines.map((machine, index) => (
        <section
          className="explore-machine-facts"
          key={`${machine.machine_id}-${index}`}
        >
          <h3>{getMachineDisplayName(machine)}</h3>
          {machine.resolution && machine.resolution.state !== "resolved" && (
            <p>
              参照情報が不明です（記録ID: {machine.resolution.originalId}
              ）。記録値はそのまま表示します。
            </p>
          )}
          {machine.notes?.map((note, i) => (
            <p className="record-note" key={i}>
              {note}
            </p>
          ))}
          <table>
            <caption className="sr-only">
              {getMachineDisplayName(machine)}のセット記録
            </caption>
            <thead>
              <tr>
                <th>Set</th>
                <th>kg</th>
                <th>Reps</th>
                <th>RIR</th>
              </tr>
            </thead>
            <tbody>
              {machine.sets.map((set, i) => (
                <tr key={i}>
                  <th scope="row">{set.set}</th>
                  <td>{set.weight_kg}</td>
                  <td>{set.reps}</td>
                  <td>{set.rir ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {machine.sets
            .filter((s) => s.note || s.warmup || s.failure)
            .map((set, i) => (
              <p className="record-note" key={i}>
                Set {set.set}:{" "}
                {[
                  set.warmup && "ウォームアップ",
                  set.failure && "限界まで実施",
                  set.note,
                ]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
            ))}
        </section>
      ))}
      <small className="session-record-id">
        Session ID: {session.session_id}
      </small>
    </Dialog>
  );
}
