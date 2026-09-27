import { useEffect, useState } from "react";
import { LogoSample, patterns, sizes, type Pattern } from "./LogoSample";
import "./style.css";

export default function Playground({ reduced = false }: { reduced?: boolean }) {
  const [osReduced, setOsReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [previewReduced, setPreviewReduced] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOsReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return <div className="logo-playground">
    <header><p className="eyebrow">VESRIA / VISUAL SPIKE · NOT PRODUCTION</p><h1>Logo Motion Playground</h1>
      <p>Logoを直接Click / Tap。Enter・Spaceでも再生できます。再生中の再押下は無視します。</p>
      <label><input type="checkbox" checked={previewReduced} onChange={e => setPreviewReduced(e.target.checked)} /> Reduced Motionを試す{osReduced && "（OS設定も有効）"}</label>
    </header>
    <div className="size-head" aria-hidden="true"><span>Motion personality</span><span>Entry · 140px</span><span>Entry Narrow · 115px</span><span>Rail · 45px</span><span>Mobile · 34px</span></div>
    {(Object.keys(patterns) as Pattern[]).map(pattern => <section className="pattern-row" key={pattern} aria-label={pattern}>
      <div className="pattern-label"><h2>{pattern}</h2><p>{patterns[pattern].description}</p><small>{patterns[pattern].duration / 1000}s · one-shot</small></div>
      {sizes.map(size => <LogoSample key={size} pattern={pattern} size={size} reduced={reduced || osReduced || previewReduced} />)}
    </section>)}
    <footer>実寸比較：ブラウザーのZoomは100%を推奨。34pxも押下領域は最低44px。演出は全サイズ共通です。採用・調整・撤去はHuman Review後に判断します。</footer>
  </div>;
}
