import { FloatingSelect } from "../ui/FloatingSelection";
import { lazy, Suspense, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMachineDisplayName } from "@workout-lab/workout-core";
import { useRuntime } from "../application/runtime";
import { bodyNames, machineHistory } from "../application/metrics";
import { Empty, Heading } from "../ui/common";
const Chart = lazy(() => import("../ui/Chart"));
export default function Machines() {
  const { data } = useRuntime(),
    { machineId } = useParams(),
    [search, setSearch] = useState(""),
    [gym, setGym] = useState("");
  const options = [
    ...new Map(
      data?.sessions.flatMap((s) =>
        s.machines.map((m) => [m.machine_id, m] as const),
      ),
    ).values(),
  ];
  const machine =
    options.find((m) => m.machine_id === machineId) ||
    (!machineId ? options[0] : undefined);
  const gyms = data?.masterData?.gyms.gyms.filter((g) => !g.deleted) || [],
    gymId = gym || gyms.find((g) => g.main)?.gym_id || gyms[0]?.gym_id || "";
  const rows = machine
    ? machineHistory(data?.sessions || [], machine.machine_id, gymId)
    : [];
  return (
    <>
      <Heading
        eyebrow="03 / MACHINE-ORIENTED VIEW"
        title="Know your instruments."
      >
        ひとつのマシンを軸に、記録の変化を読む。
      </Heading>
      <div className="machine-layout">
        <aside className="machine-index">
          <label>
            Machineを探す
            <input
              type="search"
              placeholder="名前で絞り込む"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {options
            .filter((m) =>
              getMachineDisplayName(m)
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((m, i) => (
              <Link
                className={`machine-index-item ${machine?.machine_id === m.machine_id ? "selected" : ""}`}
                to={`/machines/${encodeURIComponent(m.machine_id)}`}
                key={m.machine_id}
              >
                <small>{String(i + 1).padStart(2, "0")}</small>
                <span>
                  {getMachineDisplayName(m)}
                  <small>{bodyNames[m.body_part || "other"]}</small>
                </span>
                <span>↗</span>
              </Link>
            ))}
        </aside>
        <section>
          {machine ? (
            <>
              <div className="machine-title">
                <span className="eyebrow">
                  {bodyNames[machine.body_part || "other"]} / OBSERVATION
                </span>
                <h2>{getMachineDisplayName(machine)}</h2>
                <p>マスターの変更はResourcesで行います。</p>
              </div>
              <div className="glass machine-history">
                <div className="section-line">
                  <h3>Load trace</h3>
                  <label>
                    比較するGym
                    <FloatingSelect
                      value={gymId}
                      onChange={(e) => setGym(e.target.value)}
                    >
                      {gyms.map((g) => (
                        <option key={g.gym_id} value={g.gym_id}>
                          {g.name}
                        </option>
                      ))}
                    </FloatingSelect>
                  </label>
                </div>
                <p>
                  同一Gym・同一Machineの最大記録重量 /
                  session。筋力や効果の評価ではありません。
                </p>
                {rows.length ? (
                  <>
                    <Suspense
                      fallback={
                        <div className="chart-loading" role="status">
                          グラフを準備しています…
                        </div>
                      }
                    >
                      <Chart
                        labels={rows.map((r) => r.date.slice(5))}
                        values={rows.map((r) => r.weight)}
                        name="最大記録重量 kg"
                        height={300}
                      />
                    </Suspense>
                    <div className="history-strip">
                      {rows.map((r) => (
                        <Link to={`/workouts/${r.id}`} key={r.id}>
                          <small>{r.date}</small>
                          <strong>
                            {r.weight}
                            <small> kg</small>
                          </strong>
                          <span>{r.sets} sets ↗</span>
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <Empty title="この条件の記録はありません">
                    Gymを切り替えてください。互換性が確認できない重量比較は行いません。
                  </Empty>
                )}
              </div>
            </>
          ) : (
            <Empty title="Machineが見つかりません" />
          )}
        </section>
      </div>
    </>
  );
}
