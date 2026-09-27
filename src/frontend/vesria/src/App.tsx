import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  mdiViewDashboardOutline,
  mdiCalendarOutline,
  mdiDumbbell,
  mdiChartTimelineVariant,
  mdiOrbit,
  mdiShapeOutline,
  mdiTuneVariant,
  mdiInformationOutline,
  mdiClose,
} from "@mdi/js";
import symbol from "./assets/vesria-full-symbol.svg";
import { useRuntime } from "./application/runtime";
import {
  Dialog,
  Empty,
  ErrorBoundary,
  ErrorMessage,
  Icon,
  Loading,
} from "./ui/common";
import ReviewStatePreview from "./ui/ReviewStatePreview";
import { Ambient } from "./visual/Ambient";
import { materialVariables } from "./visual/materials";
import { useNarrow } from "./ui/useNarrow";
import Entry from "./ui/Entry";
const Overview = lazy(() => import("./workspaces/Overview"));
const Workout = lazy(() => import("./workspaces/Workout"));
const Machines = lazy(() => import("./workspaces/Machines"));
const Analysis = lazy(() => import("./workspaces/Analysis"));
const Explore = lazy(() => import("./workspaces/Explore"));
const Resources = lazy(() => import("./workspaces/Resources"));
const Settings = lazy(() => import("./workspaces/Settings"));
const LogoPlayground = lazy(() => import("../logo-playground/main"));
const navigation = [
  ["/overview", "Overview", mdiViewDashboardOutline],
  ["/workouts", "Workout", mdiCalendarOutline],
  ["/machines", "Machines", mdiDumbbell],
  ["/analysis", "Analysis", mdiChartTimelineVariant],
  ["/explore", "Explore", mdiOrbit],
  ["/resources", "Resources", mdiShapeOutline],
  ["/settings", "Settings", mdiTuneVariant],
  ["/logo-playground", "Logo Playground", mdiOrbit],
];

/** 常駐空間とroute寿命の分離点。各Workspaceの入力状態やAF呼び出しは所有しない。 */
export default function App() {
  const location = useLocation(),
    navigate = useNavigate(),
    root = useRuntime(),
    osReduced = useReducedMotion();
  const [menu, setMenu] = useState(false),
    [about, setAbout] = useState(false);
  const reduced = root.reduced || !!osReduced;
  const narrow = useNarrow();
  const workspaceKey = location.pathname.split("/")[1] || "entry";
  const scrollWorkspace = useRef(workspaceKey);
  useEffect(() => {
    if (!narrow) setMenu(false);
  }, [narrow]);
  useEffect(() => {
    // Modalのscroll lock解除による位置復元が終わってから、別Workspaceの先頭へ移す。
    if (menu || scrollWorkspace.current === workspaceKey) return;
    scrollWorkspace.current = workspaceKey;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [workspaceKey, menu]);
  const stage = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const entry = location.pathname === "/";
  useEffect(() => {
    setMenu(false);
    document.title = `Vesria · ${navigation.find(([url]) => location.pathname.startsWith(url))?.[1] || "Entry"}`;
  }, [location.pathname]);
  const links = (
    <>
      {navigation.map(([url, label, icon], i) => (
        <NavLink
          key={url}
          to={url}
          aria-label={label}
          title={label}
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <Icon path={icon} />
          <span>{label}</span>
          <small>0{i + 1}</small>
        </NavLink>
      ))}
    </>
  );
  return (
    <div
      className={`app ${reduced ? "reduced-motion" : ""} ${hidden ? "ambient-paused" : ""}`}
      style={materialVariables}
    >
      <Ambient reduced={reduced} paused={hidden} />
      {!entry && (
        <>
          <a className="skip-link" href="#workspace">
            本文へ移動
          </a>
          <aside className="rail glass">
            <div className="brand" role="img" aria-label="Vesria">
              <img src={symbol} alt="" />
            </div>
            <nav aria-label="Global navigation">{links}</nav>
            <div className="rail-foot">
              <span className="status-dot" />
              <span>
                {root.repository.mode === "review"
                  ? "Review environment"
                  : "Connected workspace"}
              </span>
              <button
                className="icon-button"
                aria-label="システム情報"
                onClick={() => setAbout(true)}
              >
                <Icon path={mdiInformationOutline} size={18} />
              </button>
            </div>
          </aside>
          <button
            className="mobile-trigger glass"
            aria-label="ナビゲーションを開く"
            aria-expanded={menu}
            onClick={() => setMenu(true)}
          >
            <img src={symbol} alt="" />
          </button>
        </>
      )}
      {menu && (
        <Dialog title="メニュー" close={() => setMenu(false)}>
          <nav aria-label="Mobile navigation">{links}</nav>
          <button
            className="quiet"
            onClick={() => {
              setMenu(false);
              setAbout(true);
            }}
          >
            <Icon path={mdiInformationOutline} />
            システム情報
          </button>
        </Dialog>
      )}
      <div className={entry ? "" : "workspace-shell"}>
        {!entry && (
          <div className="topbar">
            <span className="breadcrumb">
              VESRIA <span>/</span>{" "}
              {navigation
                .find(([url]) => location.pathname.startsWith(url))?.[1]
                ?.toUpperCase() || "PAGE"}
            </span>
            <button
              className={`mode-badge ${root.repository.mode}`}
              onClick={() => navigate("/settings")}
            >
              {root.repository.mode === "review"
                ? "● REVIEW DATA · 未保存の架空データ"
                : `● LIVE${root.data?.fallback ? " · FALLBACK / 読取のみ" : ""}`}
            </button>
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={workspaceKey}
            id="workspace"
            ref={stage}
            tabIndex={-1}
            initial={{ opacity: 0, x: reduced ? 0 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduced ? 0 : -48 }}
            transition={{ duration: reduced ? 0 : 0.14 }}
            onAnimationComplete={() =>
              stage.current?.focus({ preventScroll: true })
            }
          >
            <ErrorBoundary local>
              <Suspense fallback={<Loading />}>
                {entry ? (
                  <Entry />
                ) : location.pathname === "/logo-playground" ? (
                  <LogoPlayground reduced={reduced} />
                ) : location.pathname !== "/settings" &&
                  root.reviewState &&
                  root.repository.mode === "review" ? (
                  <ReviewStatePreview />
                ) : location.pathname !== "/settings" && root.loading ? (
                  <Loading />
                ) : location.pathname !== "/settings" && root.error ? (
                  <div className="data-error">
                    <ErrorMessage>{root.error}</ErrorMessage>
                    <button onClick={() => void root.refresh()}>再読込</button>
                    <button
                      className="quiet"
                      onClick={() => navigate("/settings")}
                    >
                      Settingsへ
                    </button>
                  </div>
                ) : (
                  <>
                    {!!root.data?.issues.length && (
                      <ErrorMessage>
                        {root.data.issues.length}
                        件のデータ問題があります。一部の記録は除外されています。Settingsで同期状態を確認してください。
                      </ErrorMessage>
                    )}
                    {!!root.data?.warnings?.length && (
                      <p className="warning-note">
                        参照不明・削除済みのマスターがあります。推測で補完せず「?」として表示します。
                      </p>
                    )}
                    <Routes location={location}>
                      <Route path="/overview" element={<Overview />} />
                      <Route
                        path="/workouts/:sessionId?"
                        element={<Workout />}
                      />
                      <Route
                        path="/machines/:machineId?"
                        element={<Machines />}
                      />
                      <Route path="/analysis" element={<Analysis />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/resources" element={<Resources />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route
                        path="*"
                        element={
                          <Empty title="このページは見つかりません" variant="not-found">
                            <button onClick={() => navigate("/overview")}>
                              Overviewへ戻る
                            </button>
                          </Empty>
                        }
                      />
                    </Routes>
                  </>
                )}
              </Suspense>
            </ErrorBoundary>
          </motion.main>
        </AnimatePresence>
        {!entry && (
          <footer className="app-footer">
            <span>OBSERVED = CALM. CHANGING = FLUID. DISCOVERY = PLAYFUL.</span>
            <span>VESRIA / INITIAL STUDY</span>
          </footer>
        )}
      </div>
      <div className="snackbar" role="status" aria-live="polite">
        {root.toast && (
          <div>
            {root.toast}
            <button
              aria-label="通知を閉じる"
              className="icon-button"
              onClick={() => root.notify("")}
            >
              <Icon path={mdiClose} size={18} />
            </button>
          </div>
        )}
      </div>
      {about && (
        <Dialog title="システム情報" close={() => setAbout(false)}>
          <img className="about-symbol" src={symbol} alt="Vesria symbol" />
          <p>記録を眺め、関係を見つけ、自分のリズムをつくる。</p>
          <p>
            Initial Human Review · 全体のVisual / UX /
            Motionを検討するための初回実装です。
          </p>
          <p>
            Review
            dataは架空・メモリー内のみ。医療判断や運動効果の診断は行いません。
          </p>
        </Dialog>
      )}
    </div>
  );
}
