import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocation } from "react-router-dom";
import { mdiRefresh, mdiGraphOutline } from "@mdi/js";
import {
  getGymDisplayName,
  getMachineDisplayName,
  getTotalSets,
} from "@workout-lab/workout-core";
import { useRuntime } from "../application/runtime";
import {
  bobbleTypes,
  buildExploreCatalog,
  candidateSlots,
  matchingSessions,
  sessionPage,
  type BobbleType,
} from "../application/exploration";
import { Empty, Heading, Icon } from "../ui/common";
import { Bobble } from "./explore/Bobble";
import { SelectedGraph } from "./explore/SelectedGraph";
import { SessionDetail } from "./explore/SessionDetail";
import "./explore/explore.css";

/** 条件・候補・結果ページを所有する。Dialogはその状態を読み、閉じても探索文脈を失わない。 */
export default function Explore() {
  const { data, reduced: preference } = useRuntime(),
    location = useLocation(),
    osReduced = useReducedMotion();
  const reduced = preference || !!osReduced;
  const [launched] = useState(() => new Date());
  const catalog = useMemo(
    () => buildExploreCatalog(data?.sessions || [], data?.masterData, launched),
    [data, launched],
  );
  const [selected, setSelected] = useState<string[]>(() =>
    Array.isArray(location.state?.conditions)
      ? catalog.bobbles
          .map((b) => b.key)
          .filter((key) => location.state.conditions.includes(key))
      : [],
  );
  const [type, setType] = useState<BobbleType>("period");
  const pool = useMemo(
    () => catalog.bobbles.filter((b) => b.type === type),
    [catalog, type],
  );
  const [candidates, setCandidates] = useState(() =>
    candidateSlots(pool, selected),
  );
  const [collection, setCollection] = useState(0);
  const [page, setPage] = useState(1),
    [graph, setGraph] = useState(false),
    [detailId, setDetailId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const candidateArea = useRef<HTMLDivElement>(null),
    pendingFocus = useRef(false);
  const active = useMemo(
    () => catalog.bobbles.filter((b) => selected.includes(b.key)),
    [catalog, selected],
  );
  const matches = useMemo(
    () => matchingSessions(catalog, selected),
    [catalog, selected],
  );
  const result = sessionPage(matches, page);
  const detail = catalog.records.find(
    (r) => r.session.session_id === detailId,
  )?.session;
  useEffect(() => {
    setCandidates((current) => candidateSlots(pool, selected, current));
  }, [pool, selected]);
  useEffect(() => {
    if (pendingFocus.current) {
      const next = Array.from(
        candidateArea.current?.querySelectorAll<HTMLButtonElement>("button") ||
          [],
      ).find((button) => !selected.includes(button.dataset.bobbleKey || ""));
      (next || candidateArea.current)?.focus({ preventScroll: true });
      pendingFocus.current = false;
    }
  }, [candidates]);
  function choose(key: string) {
    const b = catalog.bobbles.find((b) => b.key === key);
    if (!b || selected.includes(key)) return;
    setSelected((current) =>
      current.includes(key) ? current : [...current, key],
    );
    setPage(1);
    setAnnouncement(`${bobbleTypes[b.type]}: ${b.value}を選びました。`);
    pendingFocus.current = true;
  }
  function remove(key: string) {
    setSelected((current) => current.filter((k) => k !== key));
    setPage(1);
    setAnnouncement("Bobbleを解除しました。");
  }
  return (
    <>
      <Heading eyebrow="05 / EXPLORE" title="A little curiosity.">
        これと、それ。まぜたら、どんな記録に出会える？
      </Heading>
      <section className="bobble-discovery" aria-label="Bobbleを見つける">
        <div className="bobble-toolbar">
          <div className="bobble-types" role="group" aria-label="Bobble Type">
            {(Object.entries(bobbleTypes) as [BobbleType, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  className={type === key ? "selected" : "quiet"}
                  aria-pressed={type === key}
                  onClick={() => {
                    setType(key);
                    setCollection((n) => n + 1);
                    setCandidates(
                      candidateSlots(
                        catalog.bobbles.filter((b) => b.type === key),
                        selected,
                      ),
                    );
                  }}
                >
                  {label}
                </button>
              ),
            )}
          </div>
          <button
            className="quiet candidate-refresh"
            disabled={pool.filter((b) => !selected.includes(b.key)).length < 2}
            onClick={() => {
              setCandidates((current) =>
                candidateSlots(pool, selected, current, true),
              );
              setCollection((n) => n + 1);
              setAnnouncement("候補を入れ替えました。");
            }}
          >
            <Icon path={mdiRefresh} size={18} />
            入れ替える
          </button>
        </div>
        <div className="candidate-caption">
          <span className="eyebrow">A CHANCE ENCOUNTER</span>
          <p>気になるBobbleを選んでみて。</p>
        </div>
        <div
          className="bobble-candidates"
          ref={candidateArea}
          tabIndex={-1}
          aria-label={`${bobbleTypes[type]}の候補`}
        >
          {candidates.map((key, slot) => {
            const b = catalog.bobbles.find((b) => b.key === key);
            return (
              <div className="candidate-slot" key={slot} data-slot={slot}>
                <AnimatePresence
                  key={reduced ? `${collection}:${key}` : slot}
                  mode="wait"
                  initial={false}
                >
                  {b && !selected.includes(b.key) ? (
                    <motion.div
                      key={`${collection}:${key}`}
                      className="candidate-occupant"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{
                        opacity: 0,
                        transition: {
                          delay: reduced ? 0 : 0.12,
                          duration: reduced ? 0 : 0.1,
                        },
                      }}
                      transition={{ duration: reduced ? 0 : 0.16 }}
                    >
                      <Bobble
                        fragment={b}
                        reduced={reduced}
                        onPick={() => choose(b.key)}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
          {!pool.some((b) => !selected.includes(b.key)) && (
            <p className="candidate-empty">
              {pool.length
                ? "このTypeのBobbleは、すべて選ばれています。別のTypeも見てみよう。"
                : "このTypeにつながる記録はまだありません。"}
            </p>
          )}
        </div>
        <div className="mixture-bar">
          <div>
            <span className="eyebrow">YOUR MIXTURE</span>
            <p>
              {active.length
                ? `${active.length}個のBobbleを組み合わせています`
                : "まだ、なにも混ざっていません"}
            </p>
          </div>
          <button className="quiet" onClick={() => setGraph(true)}>
            <Icon path={mdiGraphOutline} size={20} />
            選んだBobbleをみる{active.length ? ` (${active.length})` : ""}
          </button>
        </div>
        <p className="mixture-hint">
          同じTypeは「どれか」、違うTypeは「どちらも」。組み合わせはいつでも解除できます。
        </p>
      </section>
      <section className="session-glass-results" aria-label="探索結果">
        <div className="section-line">
          <div>
            <span className="eyebrow">THE RECORDS YOU FOUND</span>
            <h2>
              {active.length
                ? `${matches.length}件のセッション`
                : "どんな記録に出会えるかな。"}
            </h2>
          </div>
          {active.length > 0 && (
            <span className="result-range">
              {matches.length
                ? `${(result.current - 1) * 20 + 1}–${Math.min(result.current * 20, matches.length)} / ${matches.length}`
                : "0件"}
            </span>
          )}
        </div>
        <p className="sr-only" role="status">
          {announcement}{" "}
          {active.length
            ? `${matches.length}件のセッション。${result.current}ページ目。`
            : "Bobble未選択。"}
        </p>
        {!active.length ? (
          <div className="explore-welcome glass">
            <span className="welcome-bobble" aria-hidden="true" />
            <h3>Bobbleを選んでみてね</h3>
            <p>気になるデータを組み合わせると、セッションがここに現れます。</p>
          </div>
        ) : !matches.length ? (
          <Empty title="一致するセッションがありません">
            Bobbleの組み合わせを変えてみてください。
          </Empty>
        ) : (
          <>
            <div className="session-glass-grid">
              {result.sessions.map((session) => (
                <button
                  className="session-glass glass"
                  key={session.session_id}
                  onClick={() => setDetailId(session.session_id)}
                  aria-label={`${session.date} ${getGymDisplayName(session.gym)} のセッションを読む`}
                >
                  <div className="session-glass-top">
                    <time dateTime={session.date}>
                      {session.date.replaceAll("-", " / ")}
                    </time>
                    <span>
                      {session.status === "partial" ? "一部記録" : "記録"}
                    </span>
                  </div>
                  <h3>{getGymDisplayName(session.gym)}</h3>
                  <p className="session-machine-preview">
                    {session.machines
                      .slice(0, 3)
                      .map(getMachineDisplayName)
                      .join(" · ")}
                    {session.machines.length > 3 ? " …" : ""}
                  </p>
                  {session.notes?.length ? (
                    <p className="session-note-preview">
                      {session.notes.join(" / ")}
                    </p>
                  ) : null}
                  <div className="session-glass-bottom">
                    <span>
                      {session.machines.length} machines ·{" "}
                      {getTotalSets(session)} sets
                    </span>
                    <span aria-hidden="true">読む ↗</span>
                  </div>
                </button>
              ))}
            </div>
            <nav className="explore-pagination" aria-label="結果のページ">
              <button
                className="quiet"
                disabled={result.current === 1}
                onClick={() => setPage(result.current - 1)}
              >
                前へ
              </button>
              <span aria-live="polite">
                {result.current} / {result.pages}
              </span>
              <button
                className="quiet"
                disabled={result.current === result.pages}
                onClick={() => setPage(result.current + 1)}
              >
                次へ
              </button>
            </nav>
          </>
        )}
      </section>
      {graph && (
        <SelectedGraph
          selected={active}
          remove={remove}
          close={() => setGraph(false)}
          reduced={reduced}
        />
      )}
      {detail && (
        <SessionDetail session={detail} close={() => setDetailId(null)} />
      )}
    </>
  );
}
