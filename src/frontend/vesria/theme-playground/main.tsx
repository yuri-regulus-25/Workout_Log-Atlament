import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  mdiChartTimelineVariant,
  mdiClose,
  mdiDumbbell,
  mdiOrbit,
  mdiPause,
  mdiPlay,
  mdiTuneVariant,
  mdiViewDashboardOutline,
} from "@mdi/js";
import symbol from "../src/assets/vesria-full-symbol.svg";
import { LightVeil } from "../src/visual/LightVeil";
import { materialVariables } from "../src/visual/materials";
import { AmbientCanvas } from "./AmbientCanvas";
import { GlassFlowers } from "./GlassFlowers";
import {
  THEME_PROFILES,
  VIEWPORT_WIDTHS,
  resolveSurface,
  type SurfaceName,
  type ThemeName,
  type ViewportName,
} from "./theme";
import "./style.css";

type SurfaceChoice = "theme" | SurfaceName;

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={path} fill="currentColor" />
    </svg>
  );
}

function Toggle({
  checked,
  children,
  onChange,
}: {
  checked: boolean;
  children: ReactNode;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="switch-row">
      <span>{children}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function ThemeAmbient({
  name,
  phase,
  paused,
  reduced,
}: {
  name: ThemeName;
  phase: "active" | "outgoing" | "idle";
  paused: boolean;
  reduced: boolean;
}) {
  return (
    <div className={`theme-layer theme-${name} is-${phase}`} data-theme-layer={name} aria-hidden="true">
      <div className="theme-depth" />
      {name === "plasma" && <LightVeil reduced={reduced} paused={paused} />}
      {name === "abyss" && (
        <>
          <div className="abyss-light" />
          <div className="abyss-caustics" />
          <GlassFlowers />
          <div className="abyss-floor" />
        </>
      )}
      {name === "night" && <div className="meteor" />}
      <AmbientCanvas mode={name} running={phase !== "idle"} paused={paused} reduced={reduced} />
    </div>
  );
}

function ComparisonUi({
  theme,
  surface,
  dialog,
  setDialog,
}: {
  theme: ThemeName;
  surface: SurfaceName;
  dialog: boolean;
  setDialog: (open: boolean) => void;
}) {
  const profile = THEME_PROFILES[theme];
  return (
    <div className="sample-ui" data-surface={surface}>
      <aside className="sample-rail surface">
        <img src={symbol} alt="Vesria" />
        <nav aria-label="比較用ナビゲーション">
          {[
            [mdiViewDashboardOutline, "Overview"],
            [mdiDumbbell, "Workout"],
            [mdiChartTimelineVariant, "Analysis"],
            [mdiOrbit, "Explore"],
          ].map(([path, label], index) => (
            <button className={index === 0 ? "is-active" : ""} key={label} title={label} aria-label={label}>
              <Icon path={path} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <span className="rail-status"><i /> REVIEW</span>
      </aside>

      <main className="sample-main">
        <header className="sample-header">
          <div>
            <span className="kicker">VESRIA / OVERVIEW</span>
            <h1>今日までの軌跡。</h1>
          </div>
          <div className="header-actions">
            <label>
              <span>期間</span>
              <select defaultValue="4w">
                <option value="4w">直近4週間</option>
                <option value="12w">直近12週間</option>
              </select>
            </label>
            <button className="primary" onClick={() => setDialog(true)}>記録を追加</button>
          </div>
        </header>

        <section className="overview-grid">
          <article className="hero surface">
            <div className="hero-copy">
              <span className="kicker">CURRENT RHYTHM</span>
              <h2>静かな継続が、<br />形になっている。</h2>
              <p>{profile.description}</p>
            </div>
            <div className="hero-stats">
              <span><strong>24</strong><small>SESSIONS</small></span>
              <span><strong>8.6k</strong><small>VOLUME / KG</small></span>
              <span><strong>12</strong><small>WEEK STREAK</small></span>
            </div>
          </article>

          <article className="rhythm surface">
            <div className="section-title"><span><i /> ACTIVITY</span><small>SEP 01 — 28</small></div>
            <svg className="chart-svg" viewBox="0 0 620 190" preserveAspectRatio="none" role="img" aria-label="4週間の活動量チャート">
              <defs>
                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity="0.34" />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g className="chart-grid"><path d="M0 32H620M0 82H620M0 132H620M0 182H620" /></g>
              <path className="chart-area" d="M0 155 C48 151 57 117 104 126 S172 79 216 92 S292 138 332 103 S404 39 449 63 S518 126 566 74 S604 48 620 34 V190 H0Z" />
              <path className="chart-line" d="M0 155 C48 151 57 117 104 126 S172 79 216 92 S292 138 332 103 S404 39 449 63 S518 126 566 74 S604 48 620 34" />
            </svg>
            <div className="chart-labels"><span>W1</span><span>W2</span><span>W3</span><span>W4</span></div>
          </article>

          <article className="balance surface">
            <div className="section-title"><span><i /> BALANCE</span><small>28 DAYS</small></div>
            <div className="balance-body">
              <div className="donut"><span>252<small>SETS</small></span></div>
              <ol>
                <li><i /> Chest <strong>28%</strong></li>
                <li><i /> Back <strong>24%</strong></li>
                <li><i /> Legs <strong>21%</strong></li>
                <li><i /> Others <strong>27%</strong></li>
              </ol>
            </div>
          </article>

          <article className="recent surface">
            <div className="section-title"><span><i /> RECENT RECORDS</span><button>すべて見る</button></div>
            <div className="record-row"><time>SEP 28</time><span><strong>Upper strength</strong><small>Bench press · Row · Shoulder press</small></span><b>52m</b></div>
            <div className="record-row"><time>SEP 25</time><span><strong>Lower foundation</strong><small>Squat · Leg curl · Calf raise</small></span><b>61m</b></div>
          </article>

          <button className="bobble-sample" aria-label="Bobble: 直近4週間">
            <span /><strong>4 weeks</strong><small>PERIOD</small>
          </button>
        </section>
      </main>

      {dialog && (
        <div className="dialog-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(false)}>
          <section className="sample-dialog surface" role="dialog" aria-modal="true" aria-labelledby="sample-dialog-title">
            <header>
              <div><span className="kicker">QUICK ENTRY</span><h2 id="sample-dialog-title">記録を追加</h2></div>
              <button aria-label="閉じる" onClick={() => setDialog(false)}><Icon path={mdiClose} /></button>
            </header>
            <label>種目<select defaultValue="bench"><option value="bench">Bench press</option><option value="squat">Squat</option></select></label>
            <div className="dialog-fields"><label>重量<input defaultValue="70" inputMode="decimal" /></label><label>回数<input defaultValue="8" inputMode="numeric" /></label></div>
            <footer><button className="quiet" onClick={() => setDialog(false)}>キャンセル</button><button className="primary" onClick={() => setDialog(false)}>比較用に反映</button></footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default function ThemePlayground() {
  const [theme, setTheme] = useState<ThemeName>("plasma");
  const [outgoing, setOutgoing] = useState<ThemeName | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ambientOnly, setAmbientOnly] = useState(false);
  const [surfaceChoice, setSurfaceChoice] = useState<SurfaceChoice>("theme");
  const [viewport, setViewport] = useState<ViewportName>("wide");
  const [dialog, setDialog] = useState(false);
  const transitionTimer = useRef<number>(0);
  const profile = THEME_PROFILES[theme];
  const surface = resolveSurface(theme, surfaceChoice);

  const chooseTheme = (next: ThemeName) => {
    if (next === theme) return;
    window.clearTimeout(transitionTimer.current);
    setOutgoing(theme);
    setTheme(next);
    setTransitioning(true);
    transitionTimer.current = window.setTimeout(() => {
      setOutgoing(null);
      setTransitioning(false);
    }, reduced ? 180 : 1600);
  };

  useEffect(() => () => window.clearTimeout(transitionTimer.current), []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setDialog(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const stageStyle = {
    ...materialVariables,
    "--preview-width": VIEWPORT_WIDTHS[viewport],
    "--transition-time": reduced ? "180ms" : "1600ms",
  } as CSSProperties;

  return (
    <div className={`theme-playground ${paused ? "is-paused" : ""} ${reduced ? "is-reduced" : ""}`}>
      <header className="lab-header">
        <div className="lab-title"><img src={symbol} alt="" /><span><b>Theme Playground</b><small>DESIGN SPIKE · NOT PRODUCTION</small></span></div>
        <div className="theme-tabs" role="tablist" aria-label="Theme">
          {(Object.entries(THEME_PROFILES) as [ThemeName, (typeof THEME_PROFILES)[ThemeName]][]).map(([name, value]) => (
            <button key={name} role="tab" aria-selected={theme === name} className={theme === name ? "is-active" : ""} onClick={() => chooseTheme(name)}>
              <span>{value.label}</span><small>{value.feeling}</small>
            </button>
          ))}
        </div>
        <div className="lab-state"><i className={transitioning ? "is-live" : ""} /><span>{transitioning ? "WORLD TRANSITION" : `${profile.label.toUpperCase()} / ${profile.feeling}`}</span></div>
      </header>

      <div className="lab-body">
        <section className="preview-shell">
          <div className={`preview-frame viewport-${viewport}`} style={stageStyle} data-theme={theme} data-material={surface}>
            <div className="world" aria-hidden="true">
              {(["plasma", "abyss", "night"] as ThemeName[]).map((name) => (
                <ThemeAmbient
                  key={name}
                  name={name}
                  phase={name === theme ? "active" : transitioning && name === outgoing ? "outgoing" : "idle"}
                  paused={paused}
                  reduced={reduced}
                />
              ))}
            </div>
            {!ambientOnly && <ComparisonUi theme={theme} surface={surface} dialog={dialog} setDialog={setDialog} />}
            {ambientOnly && <div className="ambient-label"><span>{profile.label}</span><small>{profile.feeling} / AMBIENT ONLY</small></div>}
          </div>
        </section>

        <aside className="lab-controls" aria-label="Theme比較設定">
          <div className="control-heading"><span>COMPARE / 01</span><h2>同じ情報、異なる世界。</h2><p>構造を固定し、Ambient・Light・Material・Motionだけを比較します。</p></div>

          <fieldset>
            <legend>Viewport</legend>
            <div className="segmented three">
              {(["wide", "medium", "narrow"] as ViewportName[]).map((name) => <button key={name} className={viewport === name ? "is-active" : ""} onClick={() => setViewport(name)}>{name}</button>)}
            </div>
          </fieldset>

          <fieldset>
            <legend>Surface material</legend>
            <div className="segmented three">
              {(["theme", "glass", "liquid"] as SurfaceChoice[]).map((name) => <button key={name} className={surfaceChoice === name ? "is-active" : ""} onClick={() => setSurfaceChoice(name)}>{name}</button>)}
            </div>
            <p className="control-note">Current: <strong>{surface}</strong>{surfaceChoice === "theme" ? " / Theme既定" : " / 比較override"}</p>
          </fieldset>

          <fieldset>
            <legend>View</legend>
            <Toggle checked={ambientOnly} onChange={setAmbientOnly}>Ambientのみ</Toggle>
            <Toggle checked={reduced} onChange={setReduced}>Reduced Motion相当</Toggle>
            <button className="pause-button" onClick={() => setPaused((value) => !value)}>
              <Icon path={paused ? mdiPlay : mdiPause} />{paused ? "Animationを再開" : "Animationを一時停止"}
            </button>
          </fieldset>

          <section className="diagnostics" aria-label="簡易性能情報">
            <header><span>LIVE BUDGET</span><i className={!paused ? "is-live" : ""} /></header>
            <dl>
              <div><dt>Theme</dt><dd>{profile.label}</dd></div>
              <div><dt>{profile.particleLabel}</dt><dd>{profile.particleCount}</dd></div>
              <div><dt>Flower objects</dt><dd>{profile.flowerCount}</dd></div>
              <div><dt>Animation</dt><dd>{paused ? "Paused" : reduced ? "Reduced" : "Running"}</dd></div>
              <div><dt>Surface</dt><dd>{surface}</dd></div>
              <div><dt>Transition</dt><dd>{reduced ? "180 ms" : "1.6 s"}</dd></div>
            </dl>
          </section>

          <p className="lab-caution"><Icon path={mdiTuneVariant} size={15} /> Human Review前の比較試作です。本番Theme仕様を確定しません。</p>
        </aside>
      </div>
      <div className="sr-live" aria-live="polite">{transitioning ? `${profile.label}へ遷移中` : `${profile.label}を表示中`}</div>
    </div>
  );
}
