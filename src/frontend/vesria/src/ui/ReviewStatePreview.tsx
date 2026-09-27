import { useRuntime } from "../application/runtime";
import { Empty, ErrorMessage, Loading, FailureSurface } from "./common";

/** 状態の見た目だけをレビューする。実接続エラーやデータの破損を偽装しない。 */
export default function ReviewStatePreview() {
  const { reviewState, setReviewState } = useRuntime();
  return (
    <section>
      <p className="warning-note">
        REVIEW PREVIEW · 意図的な状態表示です。実データの異常ではありません。
      </p>
      <button className="quiet" onClick={() => setReviewState("")}>
        通常表示に戻る
      </button>
      {reviewState === "loading" && <Loading />}
      {reviewState === "empty" && <Empty />}
      {reviewState === "data-error" && (
        <div className="data-error">
          <ErrorMessage>
            必須データを読み込めません。空の記録とは異なります。接続と同期状態を確認してください。
          </ErrorMessage>
        </div>
      )}
      {reviewState === "local-error" && (
        <div className="fatal">
          <span className="eyebrow">LOCAL ERROR</span>
          <h2>この表示を更新できません</h2>
          <p>メニューと他の画面は引き続き利用できます。</p>
        </div>
      )}
      {reviewState === "not-found" && (
        <Empty title="このページは見つかりません" variant="not-found">
          メニューから別の画面を開いてください。
        </Empty>
      )}
      {reviewState === "fatal" && (
        <FailureSurface retry={() => location.reload()} />
      )}
    </section>
  );
}
