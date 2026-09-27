import { lazy, Suspense } from "react";
import { getGymDisplayName, getTotalSets } from "@workout-lab/workout-core";
import { Link } from "react-router-dom";
import { mdiPlus } from "@mdi/js";
import { useRuntime } from "../application/runtime";
import { bodySets, dailySets } from "../application/metrics";
import { ArrowLink, Empty, Heading, Icon } from "../ui/common";
const Chart = lazy(() => import("../ui/Chart"));
export default function Overview() {
  const { data } = useRuntime(),
    sessions = data?.sessions || [];
  const latest = sessions.at(-1),
    days = new Set(sessions.map((s) => s.date)).size,
    total = sessions.reduce((n, s) => n + getTotalSets(s), 0);
  const daily = dailySets(sessions).slice(-18),
    parts = bodySets(sessions);
  return (
    <>
      <Heading
        eyebrow="01 / OVERVIEW"
        title="Your rhythm, observed."
        action={
          <Link className="button" to="/workouts">
            <Icon path={mdiPlus} />
            記録する
          </Link>
        }
      >
        積み重ねを眺める。次の一歩は、あなたのペースで。
      </Heading>
      {!sessions.length ? (
        <Empty />
      ) : (
        <>
          <section className="overview-hero glass">
            <div className="hero-copy">
              <span className="eyebrow">THE BIG PICTURE</span>
              <h2>
                Small moments.
                <br />
                <em>Lasting rhythm.</em>
              </h2>
              <p>
                {sessions[0]?.date} — {latest?.date}
                <br />
                表示中の全記録に基づく活動の輪郭
              </p>
              <div className="hero-stats">
                <div>
                  <strong>{days}</strong>
                  <span>トレーニング日</span>
                </div>
                <div>
                  <strong>{sessions.length}</strong>
                  <span>セッション</span>
                </div>
                <div>
                  <strong>{total}</strong>
                  <span>セット</span>
                </div>
              </div>
            </div>
            <div className="hero-chart">
              <div className="section-line">
                <h3>Activity rhythm</h3>
                <span>セット / 日 · 直近18日分</span>
              </div>
              <Suspense
                fallback={
                  <div className="chart-loading" role="status">
                    グラフを準備しています…
                  </div>
                }
              >
                <Chart
                  labels={daily.map(([d]) => d.slice(5))}
                  values={daily.map(([, v]) => v)}
                  name="日別セット数"
                  height={255}
                />
              </Suspense>
            </div>
          </section>
          <div className="overview-bottom">
            <section className="glass distribution">
              <div className="section-line">
                <h3>Body balance</h3>
                <span>記録の分布</span>
              </div>
              <div className="distribution-inner">
                <Suspense
                  fallback={
                    <div className="chart-loading" role="status">
                      グラフを準備しています…
                    </div>
                  }
                >
                  <Chart
                    kind="donut"
                    labels={parts.map(([p]) => p)}
                    values={parts.map(([, v]) => v)}
                    name="部位別セット数"
                    height={220}
                  />
                </Suspense>
                <ul className="legend">
                  {parts.map(([p, v], i) => (
                    <li key={p}>
                      <i
                        style={{
                          background: [
                            "#96e7ec",
                            "#b0b5fa",
                            "#67aebc",
                            "#d9d2ac",
                            "#88beae",
                            "#7184a2",
                          ][i % 6],
                        }}
                      />
                      <span>{p}</span>
                      <strong>{v}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <ArrowLink to="/analysis">分布を詳しく調べる</ArrowLink>
            </section>
            <section className="recent">
              <div className="section-line">
                <h3>Recent sessions</h3>
                <ArrowLink to="/workouts">すべて</ArrowLink>
              </div>
              {[...sessions]
                .reverse()
                .slice(0, 3)
                .map((s) => (
                  <Link
                    className="session-mini glass"
                    key={s.session_id}
                    to={`/workouts/${s.session_id}`}
                  >
                    <span className="date-tile">
                      <strong>{s.date.slice(8)}</strong>
                      {s.date.slice(5, 7)} MONTH
                    </span>
                    <span>
                      <strong>{getGymDisplayName(s.gym)}</strong>
                      <small>
                        {s.machines.length} machines · {getTotalSets(s)} sets ·{" "}
                        {s.status === "partial" ? "一部記録" : "記録済み"}
                      </small>
                    </span>
                    <span>↗</span>
                  </Link>
                ))}
            </section>
          </div>
        </>
      )}
    </>
  );
}
