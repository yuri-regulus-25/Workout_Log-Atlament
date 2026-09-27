import { Component, useEffect, useRef, type ReactNode } from "react";
import { mdiArrowRight, mdiClose, mdiAlertCircleOutline } from "@mdi/js";
import { Link } from "react-router-dom";

let modalLocks = 0;
let unlockDocument = () => {};
/** 多重の確認Dialogでも、最後の1枚を閉じるまでは背面のスクロールを解放しない。 */
function lockDocumentScroll() {
  if (modalLocks++ === 0) {
    const body = document.body,
      html = document.documentElement;
    const y = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: html.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `${-y}px`;
    body.style.width = "100%";
    html.style.overflow = "hidden";
    unlockDocument = () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      html.style.overflow = previous.overflow;
      window.scrollTo({ top: y, behavior: "instant" });
    };
  }
  return () => {
    if (--modalLocks === 0) unlockDocument();
  };
}
export function Icon({ path, size = 22 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}
export function ArrowLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <Icon path={mdiArrowRight} size={18} />
    </Link>
  );
}
export function Heading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="workspace-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </header>
  );
}
export function Empty({
  title = "まだ記録がありません",
  children,
  variant = "empty",
}: {
  title?: string;
  children?: ReactNode;
  variant?: "empty" | "not-found";
}) {
  return (
    <div className="empty glass">
      <span className={`empty-orbit ${variant === "not-found" ? "broken-orbit" : ""}`} aria-hidden="true" />
      <h2>{title}</h2>
      <p>
        {children ||
          "条件を変えるか、Workoutから最初の記録を追加してください。"}
      </p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="empty-orbit" />
      <p>記録を読み込んでいます</p>
    </div>
  );
}
export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <div className="error-message" role="alert">
      <Icon path={mdiAlertCircleOutline} />
      <span>{children}</span>
    </div>
  );
}
/** Native dialogのfocus trap / Escape / focus復帰を利用。処理中は閉じる操作を抑制する。 */
export function Dialog({
  title,
  children,
  close,
  busy = false,
  primary,
  className = "",
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  busy?: boolean;
  primary?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current;
    const unlock = lockDocumentScroll();
    dialog?.showModal();
    return () => {
      dialog?.close();
      unlock();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`glass dialog ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <header>
        <button
          className="icon-button"
          aria-label="閉じる"
          disabled={busy}
          onClick={close}
        >
          <Icon path={mdiClose} />
        </button>
        <h2>{title}</h2>
        <div className="dialog-primary">{primary}</div>
      </header>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
export class ErrorBoundary extends Component<
  { children: ReactNode; local?: boolean },
  { failed: boolean; reloadPage: boolean }
> {
  state = { failed: false, reloadPage: false };
  static getDerivedStateFromError(error: unknown) {
    // 更新前の履歴が古いchunkを参照した場合、React.lazyの再描画だけでは再取得できない。
    const message = error instanceof Error ? error.message : "";
    return {
      failed: true,
      reloadPage:
        /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
          message,
        ),
    };
  }
  render() {
    return this.state.failed ? (
      <FailureSurface
        local={this.props.local}
        retry={() =>
          this.props.local && !this.state.reloadPage
            ? this.setState({ failed: false })
            : location.reload()
        }
      />
    ) : (
      this.props.children
    );
  }
}

/** RouterとReactの例外境界が共有する復帰面。更新処理の再実行は行わない。 */
export function FailureSurface({
  local = false,
  retry,
}: {
  local?: boolean;
  retry: () => void;
}) {
  return (
    <section className="fatal">
      <span className="eyebrow">{local ? "LOCAL ERROR" : "FATAL STATE"}</span>
      <h1>表示を続けられません</h1>
      <p>保存処理は再送されません。再読み込みして状態を確認してください。</p>
      <button onClick={retry}>再読み込み</button>
    </section>
  );
}
