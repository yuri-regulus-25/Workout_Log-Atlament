import { FloatingSelect, FloatingDate } from "../ui/FloatingSelection";
import { useEffect, useState } from "react";
import { useRuntime } from "../application/runtime";
import type { Connection } from "../application/contracts";
import { Dialog, ErrorMessage, Heading } from "../ui/common";

export default function Settings() {
  const root = useRuntime(),
    [connection, setConnection] = useState<Connection["repository"]>({
      owner: "",
      repository: "",
      ref: "",
      rootPath: "",
    }),
    [credentialStatus, setCredentialStatus] = useState("未取得"),
    [token, setToken] = useState(""),
    [limit, setLimit] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<"configuration" | "credential" | null>(
      null,
    );
  useEffect(() => {
    let active = true;
    setToken("");
    setError("");
    root.repository
      .connection()
      .then((result) => {
        if (active) {
          setConnection(result.configuration.repository);
          setCredentialStatus(result.credential.state);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [root.repository]);
  async function execute() {
    setBusy(true);
    setError("");
    try {
      if (pending === "configuration")
        await root.repository.configure(connection);
      else await root.repository.credential(token, limit || null);
      setToken("");
      setPending(null);
      root.notify("設定を更新しました。同期して接続を確認してください。");
      const status = await root.repository.connection();
      setCredentialStatus(status.credential.state);
      await root.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPending(null);
    } finally {
      setBusy(false);
    }
  }
  async function sync() {
    setBusy(true);
    setError("");
    try {
      await root.repository.sync();
      await root.refresh();
      root.notify("同期処理が終了しました。接続状態を確認してください。");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading eyebrow="07 / SETTINGS" title="Make this space yours.">
        Runtimeと接続を整える。画面の外側の仕組みは、ここに。
      </Heading>
      <div className="settings-layout">
        <section className="settings-section">
          <span className="eyebrow">ENVIRONMENT</span>
          <h2>Review ↔ Reality</h2>
          <p>
            レビュー用データは架空で、再読み込み時にリセットされます。実接続では既存Application
            Frameworkを使います。障害時にレビュー用データへ自動切り替えしません。
          </p>
          <div className="segmented">
            <button
              aria-pressed={root.repository.mode === "review"}
              disabled={busy}
              onClick={() => root.switchMode("review")}
            >
              Review data
            </button>
            <button
              aria-pressed={root.repository.mode === "live"}
              disabled={busy}
              onClick={() => root.switchMode("live")}
            >
              Live connection
            </button>
          </div>
          <div className="runtime-facts glass">
            <span className="eyebrow">RUNTIME STATUS</span>
            <h3>
              {root.loading
                ? "確認中…"
                : root.error
                  ? "要確認"
                  : root.data?.readiness || "未取得"}
            </h3>
            <p>
              {root.repository.mode === "review"
                ? "IN-MEMORY / NO PERSISTENCE"
                : "LOCALHOST AF / COMPATIBILITY ADAPTER"}
            </p>
            <p>
              {root.data?.fallback
                ? "Fallbackデータを表示中。書き込み制限はAFが判断します。"
                : "接続状態とデータ状態は独立して確認します。"}
            </p>
            <button
              className="quiet"
              disabled={busy}
              onClick={() => void sync()}
            >
              同期・状態を再確認
            </button>
          </div>
          {root.error && <ErrorMessage>{root.error}</ErrorMessage>}
          {root.repository.mode === "review" && (
            <div className="state-review">
              <h3>表示状態のレビュー</h3>
              <label>
                状態
                <FloatingSelect
                  value={root.reviewState}
                  onChange={(e) =>
                    root.setReviewState(
                      e.target.value as typeof root.reviewState,
                    )
                  }
                >
                  <option value="">通常表示</option>
                  <option value="loading">Loading</option>
                  <option value="empty">Empty</option>
                  <option value="data-error">Data Error</option>
                  <option value="local-error">Local Error</option>
                  <option value="not-found">Route Not Found</option>
                  <option value="fatal">Fatal State</option>
                </FloatingSelect>
              </label>
              <p>選択後、Overviewなど別のWorkspaceを開いて確認できます。</p>
            </div>
          )}
          <h3>Motion preference</h3>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={root.reduced}
              onChange={(e) => root.setReduced(e.target.checked)}
            />
            動きを抑える
          </label>
          <p>
            OSのReduced Motionも自動で尊重します。操作・情報は失われません。
          </p>
        </section>
        <section className="glass connection-form">
          <span className="eyebrow">CONNECTION</span>
          <h2>Repository</h2>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <fieldset disabled={busy}>
            {(["owner", "repository", "ref", "rootPath"] as const).map(
              (key) => (
                <label key={key}>
                  {
                    {
                      owner: "Owner",
                      repository: "Repository",
                      ref: "Branch / Ref",
                      rootPath: "Root path",
                    }[key]
                  }
                  <input
                    value={connection[key]}
                    onChange={(e) =>
                      setConnection({ ...connection, [key]: e.target.value })
                    }
                  />
                </label>
              ),
            )}
            <button
              disabled={
                !connection.owner.trim() ||
                !connection.repository.trim() ||
                !connection.ref.trim()
              }
              onClick={() => setPending("configuration")}
            >
              接続設定を確認する
            </button>
            <hr />
            <h3>Credential</h3>
            <p>状態: {credentialStatus} · Tokenは表示・保存しません。</p>
            <label>
              GitHub token
              <input
                type="password"
                autoComplete="new-password"
                value={token}
                disabled={root.repository.mode === "review"}
                onChange={(e) => setToken(e.target.value)}
              />
            </label>
            <label>
              有効期限（任意）
              <FloatingDate
                type="date"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </label>
            <button
              disabled={!token || root.repository.mode === "review"}
              onClick={() => setPending("credential")}
            >
              認証情報を確認する
            </button>
          </fieldset>
        </section>
      </div>
      {pending && (
        <Dialog
          title="設定変更の確認"
          busy={busy}
          close={() => setPending(null)}
          primary={<button disabled={busy} onClick={() => void execute()}>{busy ? "更新中…" : "変更する"}</button>}
        >
          <p>
            {pending === "configuration"
              ? `${connection.owner}/${connection.repository} · ${connection.ref} に設定を変更します。`
              : "入力したTokenをApplication Frameworkへ送信します。Tokenはブラウザーの永続ストレージには保存しません。"}
          </p>
        </Dialog>
      )}
    </>
  );
}
