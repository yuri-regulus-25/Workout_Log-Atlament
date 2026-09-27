import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { Dialog } from "./common";

/** 編集破棄と送信中の離脱をまとめて保護する。保存自体や保存結果の判定は呼び出し元が所有する。 */
export function useEditorGuard(
  dirty: boolean,
  busy: boolean,
  close: () => void,
) {
  const completed = useRef(false);
  const blocker = useBlocker(() => !completed.current && (dirty || busy));
  useEffect(() => {
    completed.current = false;
  }, [dirty, busy]);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (!dirty && !busy) return;
    const leaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", leaving);
    return () => window.removeEventListener("beforeunload", leaving);
  }, [dirty, busy]);
  const cancel = () => {
    setClosing(false);
    if (blocker.state === "blocked") blocker.reset();
  };
  const discard = () => {
    if (busy) return;
    setClosing(false);
    close();
    if (blocker.state === "blocked") blocker.proceed();
  };
  return {
    afterSave: (action: () => void) => {
      completed.current = true;
      action();
    },
    requestClose: () => {
      if (busy) return;
      if (dirty) setClosing(true);
      else close();
    },
    confirmation: (closing || blocker.state === "blocked") && (
      <Dialog
        title={busy ? "処理が終わるまでお待ちください" : "変更を破棄しますか？"}
        close={cancel}
        primary={
          !busy && (
            <button className="danger" onClick={discard}>
              変更を破棄
            </button>
          )
        }
      >
        <p>
          {busy
            ? "結果を確認するまで、この画面を離れないでください。"
            : "保存していない変更は失われます。編集を続ける場合は閉じてください。"}
        </p>
        <button className="quiet" onClick={cancel}>
          {busy ? "戻る" : "編集を続ける"}
        </button>
      </Dialog>
    ),
  };
}
