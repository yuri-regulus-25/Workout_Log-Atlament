import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import symbol from "../assets/vesria-full-symbol.svg";
import { useRuntime } from "../application/runtime";

export const entryTimeoutMs = 180_000;
/** Entryの滞在時間は読込・Motion設定とは独立。手動遷移とunmountで待機timerを破棄する。 */
export default function Entry() {
  const navigate = useNavigate();
  const { loading } = useRuntime();
  useEffect(() => {
    const timer = setTimeout(
      () => navigate("/overview", { replace: true }),
      entryTimeoutMs,
    );
    return () => clearTimeout(timer);
  }, [navigate]);
  return (
    <section className="entry">
      <img src={symbol} alt="Vesria" />
      <span className="eyebrow">A SPACE FOR YOUR RHYTHM</span>
      <h1>
        Vesria<span>.</span>
      </h1>
      <p>記録が、あなたの輪郭になる。</p>
      <p role="status">
        {loading ? "記録を準備しています…" : "この光を、少し眺めて。"}
      </p>
      <button
        className="quiet"
        onClick={() => navigate("/overview", { replace: true })}
      >
        記録のある空間へ →
      </button>
    </section>
  );
}
