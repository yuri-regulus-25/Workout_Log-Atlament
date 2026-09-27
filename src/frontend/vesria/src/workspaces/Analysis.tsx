import { FloatingDate } from "../ui/FloatingSelection";
import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { getMachineDisplayName, getTotalSets } from "@workout-lab/workout-core";
import { useRuntime } from "../application/runtime";
import {
  bodyNames,
  bodySets,
  dailySets,
  selectPeriod,
} from "../application/metrics";
import { Empty, Heading } from "../ui/common";
const Chart = lazy(() => import("../ui/Chart"));
export default function Analysis() {
  const { data } = useRuntime(),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [part, setPart] = useState("");
  const period = selectPeriod(data?.sessions || [], from, to),
    sessions = part
      ? period
          .map((s) => ({
            ...s,
            machines: s.machines.filter(
              (m) =>
                m.body_part === part &&
                (!m.resolution || m.resolution.state === "resolved"),
            ),
          }))
          .filter((s) => s.machines.length)
      : period;
  const distribution = bodySets(period),
    daily = dailySets(sessions);
  const machineFacts = new Map<string, { name: string; sets: number }>();
  for (const session of sessions)
    for (const machine of session.machines) {
      const previous = machineFacts.get(machine.machine_id);
      machineFacts.set(machine.machine_id, {
        name: getMachineDisplayName(machine),
        sets: (previous?.sets || 0) + machine.sets.length,
      });
    }
  return (
    <>
      <Heading eyebrow="04 / ANALYSIS" title="Look a little closer.">
        期間と部位を絞り、記録にある事実から調べる。
      </Heading>
      <div className="analysis-controls glass">
        <label>
          開始日
          <FloatingDate
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <span>—</span>
        <label>
          終了日
          <FloatingDate
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          className="quiet"
          onClick={() => {
            const last = data?.sessions.at(-1)?.date || "";
            setFrom(last.slice(0, 7) + "-01");
            setTo(last);
          }}
        >
          最新の記録月
        </button>
        <button
          className="quiet"
          onClick={() => {
            setFrom("");
            setTo("");
            setPart("");
          }}
        >
          リセット
        </button>
      </div>
      {from && to && from > to ? (
        <Empty title="期間を確認してください">
          開始日は終了日より前にしてください。
        </Empty>
      ) : (
        <div className="analysis-layout">
          <aside className="body-map glass">
            <span className="eyebrow">BODY PART → MACHINE → RECORD</span>
            <h2>部位から記録をたどる</h2>
            <div className="body-buttons">
              <button
                className={!part ? "selected" : "quiet"}
                onClick={() => setPart("")}
              >
                全部位
              </button>
              {Object.entries(bodyNames).map(([key, label]) => (
                <button
                  key={key}
                  className={part === key ? "selected" : "quiet"}
                  onClick={() => setPart(key)}
                  aria-pressed={part === key}
                >
                  {label}
                  <small>
                    {distribution.find(([name]) => name === label)?.[1] || 0}{" "}
                    sets
                  </small>
                </button>
              ))}
            </div>
            <p>
              部位はマスターの分類に基づきます。身体状態の推測は行いません。
            </p>
          </aside>
          <div className="analysis-results">
            <div className="analysis-summary">
              <div>
                <span>OBSERVED SESSIONS</span>
                <strong>{sessions.length}</strong>
              </div>
              <div>
                <span>RECORDED SETS</span>
                <strong>
                  {sessions.reduce((n, s) => n + getTotalSets(s), 0)}
                </strong>
              </div>
              <div>
                <span>FOCUS</span>
                <strong className="focus-label">
                  {bodyNames[part] || "全体"}
                </strong>
              </div>
            </div>
            {sessions.length ? (
              <>
                <section className="body-relations">
                  <h3>{part ? `${bodyNames[part]}に分類されたマシン` : "期間内に記録されたマシン"}</h3>
                  <ul>
                    {[...machineFacts].map(([id, fact]) => (
                      <li key={id}>
                        <Link to={`/machines/${encodeURIComponent(id)}`}>
                          {fact.name} <span>{fact.sets}セット ↗</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="glass">
                  <div className="section-line">
                    <h3>Frequency over time</h3>
                    <span>日別セット数</span>
                  </div>
                  <Suspense
                    fallback={
                      <div className="chart-loading" role="status">
                        グラフを準備しています…
                      </div>
                    }
                  >
                    <Chart
                      kind="bar"
                      labels={daily.map(([d]) => d.slice(5))}
                      values={daily.map(([, v]) => v)}
                      name="期間内の日別セット数"
                    />
                  </Suspense>
                </section>
                <section className="distribution-table">
                  <h3>Distribution / 期間全体の部位分布</h3>
                  {distribution.map(([name, count]) => (
                    <div key={name}>
                      <span>{name}</span>
                      <div>
                        <i
                          style={{
                            width: `${(count / Math.max(1, ...distribution.map(([, v]) => v))) * 100}%`,
                          }}
                        />
                      </div>
                      <strong>
                        {count} <small>sets</small>
                      </strong>
                    </div>
                  ))}
                </section>
              </>
            ) : (
              <Empty title="この条件の記録はありません" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
