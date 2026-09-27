import { FloatingSelect, FloatingDate } from "../ui/FloatingSelection";
import { localDate } from "../application/date";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getGymDisplayName,
  getMachineDisplayName,
  getTotalSets,
} from "@workout-lab/workout-core";
import { mdiPlus, mdiPencilOutline, mdiDeleteOutline } from "@mdi/js";
import { useRuntime } from "../application/runtime";
import {
  ApplicationError,
  type EditSnapshot,
  type SessionInput,
} from "../application/contracts";
import { validateSession } from "../application/validation";
import { Dialog, Empty, ErrorMessage, Heading, Icon } from "../ui/common";
import { useNarrow } from "../ui/useNarrow";
import { useEditorGuard } from "../ui/useEditorGuard";
import {
  FieldError,
  ValidationSummary,
  fieldAttributes,
  fieldLabel,
  type FieldIssue,
} from "../ui/validationFeedback";

const blank = (date: string): SessionInput => ({
  date,
  gymId: null,
  notes: null,
  machines: [
    {
      sourceIndex: null,
      machineId: null,
      sets: [{ sourceIndex: null, weightKg: null, reps: null, notes: null }],
    },
  ],
});
type Editor = {
  snapshot: EditSnapshot;
  id?: string;
  original: SessionInput | null;
  input: SessionInput;
  operation: "create" | "update" | "delete";
  initial: string;
};
export default function Workout() {
  const {
      data,
      repository,
      refresh,
      notify,
      reduced: preference,
    } = useRuntime(),
    { sessionId } = useParams();
  const [month, setMonth] = useState(""),
    [date, setDate] = useState(localDate()),
    [editor, setEditor] = useState<Editor | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const narrow = useNarrow(),
    navigate = useNavigate();
  const detail = useRef<HTMLElement>(null);
  const osReduced = useReducedMotion(),
    reduced = preference || !!osReduced;
  useEffect(() => {
    if (!narrow && detail.current) detail.current.scrollTop = 0;
  }, [sessionId, narrow]);
  const closeEditor = () => {
    setEditor(null);
    setError("");
    setIssues([]);
  };
  const guard = useEditorGuard(
    !!editor &&
      editor.operation !== "delete" &&
      JSON.stringify(editor.input) !== editor.initial,
    busy,
    closeEditor,
  );
  useEffect(() => {
    if (narrow && sessionId && detail.current) {
      detail.current.scrollIntoView({ block: "start", behavior: "instant" });
      detail.current.focus({ preventScroll: true });
    }
  }, [sessionId, narrow]);
  const sessions = [...(data?.sessions || [])]
      .reverse()
      .filter((s) => !month || s.date.startsWith(month)),
    selected = data?.sessions.find((s) => s.session_id === sessionId);
  async function open(
    date: string,
    id?: string,
    operation: Editor["operation"] = "create",
  ) {
    setBusy(true);
    setError("");
    try {
      const snapshot = await repository.edit(date);
      const original = id
        ? snapshot.sessions.find((s) => s.sessionId === id)?.session
        : null;
      if (id && !original)
        throw new Error("最新の記録に対象セッションがありません");
      setEditor({
        snapshot,
        id,
        original: original || null,
        input: structuredClone(original || blank(date)),
        operation,
        initial: JSON.stringify(original || blank(date)),
      });
      setConfirm(operation === "delete");
      setIssues([]);
      setUncertain(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function change(fn: (input: SessionInput) => void) {
    if (!editor) return;
    const input = structuredClone(editor.input);
    fn(input);
    setEditor({ ...editor, input });
  }
  function validate() {
    if (!editor) return;
    const errors =
      editor.operation === "delete"
        ? []
        : validateSession(
            editor.input,
            editor.original,
            editor.snapshot.gyms,
            editor.snapshot.machines,
          );
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(editor.input.date) ||
      editor.input.date > localDate()
    )
      errors.push({ path: "date", message: "日付を指定してください" });
    setIssues(errors);
    setError("");
    if (!errors.length) setConfirm(true);
  }
  async function save() {
    if (!editor) return;
    setBusy(true);
    setError("");
    try {
      const receipt = await repository.mutate({
        operation: editor.operation,
        id: editor.id,
        input: editor.input,
        context: editor.snapshot.expectedContext,
      });
      notify(receipt.message);
      setEditor(null);
      await refresh();
      if (editor.operation === "delete")
        guard.afterSave(() => navigate("/workouts", { replace: true }));
    } catch (e) {
      setError((e as Error).message);
      setUncertain(e instanceof ApplicationError && e.uncertain);
      if (e instanceof ApplicationError && e.fieldIssues.length) {
        setIssues(e.fieldIssues);
        setConfirm(false);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="workout-workspace">
      <Heading eyebrow="02 / WORKOUT" title="One session at a time.">
        同じ日でも、セッションはそれぞれの記録。
      </Heading>
      <div className="workout-toolbar glass">
        <label>
          表示月
          <FloatingDate
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <button className="quiet" onClick={() => setMonth("")}>
          全期間
        </button>
        <div className="toolbar-spacer" />
        <label>
          新しいセッションの日付
          <FloatingDate
            type="date"
            max={localDate()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button disabled={busy || !date} onClick={() => void open(date)}>
          <Icon path={mdiPlus} />
          セッション追加
        </button>
      </div>
      {error && !editor && <ErrorMessage>{error}</ErrorMessage>}
      {sessionId && !selected ? (
        <Empty title="セッションが見つかりません">
          <Link to="/workouts">一覧へ戻る</Link>
        </Empty>
      ) : (
        <div className={`session-layout ${selected ? "has-detail" : ""}`}>
          <section className="timeline">
            {sessions.map((s) => (
              <Link
                className={`timeline-item ${selected?.session_id === s.session_id ? "selected" : ""}`}
                to={`/workouts/${s.session_id}`}
                key={s.session_id}
              >
                <span className="timeline-date">
                  {s.date.slice(5)}
                  <small>{s.date.slice(0, 4)}</small>
                </span>
                <span className="timeline-node" />
                <div>
                  <span className="eyebrow">
                    {s.status === "partial" ? "PARTIAL RECORD" : "SESSION"}
                  </span>
                  <h3>{getGymDisplayName(s.gym)}</h3>
                  <p>
                    {s.machines.length} machines · {getTotalSets(s)} sets
                  </p>
                  <small>{s.session_id}</small>
                </div>
                <span>↗</span>
              </Link>
            ))}
            {!sessions.length && <Empty />}
          </section>
          <section
            className="session-detail glass"
            ref={detail}
            tabIndex={-1}
            aria-label="セッション詳細"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                className="session-detail-content"
                key={selected?.session_id || "empty"}
                initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 5 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: reduced ? 0 : 0.14 },
                }}
                exit={{
                  opacity: 0,
                  y: reduced ? 0 : -3,
                  transition: { duration: reduced ? 0 : 0.07 },
                }}
              >
                {selected ? (
                  <>
                    <Link className="narrow-list-back text-link" to="/workouts">
                      ← 記録一覧へ
                    </Link>
                    <div className="section-line">
                      <span className="eyebrow">SESSION DETAIL</span>
                      <div className="button-row">
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label="セッションを編集"
                          onClick={() =>
                            void open(
                              selected.date,
                              selected.session_id,
                              "update",
                            )
                          }
                        >
                          <Icon path={mdiPencilOutline} />
                        </button>
                        <button
                          className="icon-button danger"
                          disabled={busy}
                          aria-label="セッションを削除"
                          onClick={() =>
                            void open(
                              selected.date,
                              selected.session_id,
                              "delete",
                            )
                          }
                        >
                          <Icon path={mdiDeleteOutline} />
                        </button>
                      </div>
                    </div>
                    <h2>{selected.date}</h2>
                    <p>{getGymDisplayName(selected.gym)}</p>
                    {selected.machines.map((m, i) => (
                      <div
                        className="machine-record"
                        key={`${m.machine_id}-${i}`}
                      >
                        <Link
                          to={`/machines/${encodeURIComponent(m.machine_id)}`}
                        >
                          {getMachineDisplayName(m)} ↗
                        </Link>
                        <table>
                          <thead>
                            <tr>
                              <th>SET</th>
                              <th>kg</th>
                              <th>reps</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.sets.map((s, i) => (
                              <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{s.weight_kg}</td>
                                <td>{s.reps}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {m.notes?.map((n, i) => (
                          <p key={i}>{n}</p>
                        ))}
                      </div>
                    ))}
                    <p>{selected.notes?.join(" / ")}</p>
                  </>
                ) : (
                  <div className="select-session">
                    <span className="eyebrow">EVERY SESSION HAS A STORY</span>
                    <h2>
                      記録をひとつ、
                      <br />
                      開いてみる。
                    </h2>
                    <p>一覧から記録を選択してください。</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      )}
      {editor && (
        <Dialog
          title={
            editor.operation === "delete"
              ? "セッション削除"
              : editor.operation === "create"
                ? "セッション追加"
                : "セッション編集"
          }
          busy={busy}
          close={guard.requestClose}
          primary={
            <button
              disabled={busy || uncertain}
              className={editor.operation === "delete" ? "danger" : ""}
              onClick={() => (confirm ? void save() : validate())}
            >
              {busy
                ? "処理中…"
                : confirm
                  ? editor.operation === "delete"
                    ? "削除する"
                    : "保存する"
                  : "内容を確認"}
            </button>
          }
        >
          <p className="eyebrow">
            {confirm ? "内容の確認" : "記録の入力"} ·{" "}
            {repository.mode === "review" ? "REVIEW DATA" : "LIVE DATA"}
          </p>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <ValidationSummary issues={issues} />
          {confirm ? (
            <div className="confirmation">
              <h3>
                {editor.input.date} の記録を
                {editor.operation === "delete" ? "削除" : "保存"}しますか？
              </h3>
              <p>
                {editor.input.machines.length} machines /{" "}
                {editor.input.machines.reduce((n, m) => n + m.sets.length, 0)}{" "}
                sets
              </p>
              <p>
                {editor.snapshot.gyms.find((g) => g.id === editor.input.gymId)
                  ?.name || `? ${editor.input.gymId}`}
              </p>
              {editor.operation !== "delete" &&
                editor.input.machines.map((machine, index) => (
                  <section className="machine-record" key={index}>
                    <h3>
                      {editor.snapshot.machines.find(
                        (m) => m.id === machine.machineId,
                      )?.name || `? ${machine.machineId}`}
                    </h3>
                    <p>
                      {machine.sets
                        .map(
                          (set) =>
                            `${set.weightKg ?? "?"} kg × ${set.reps ?? "?"} reps${set.notes ? ` (${set.notes})` : ""}`,
                        )
                        .join(" / ")}
                    </p>
                    {machine.notes && <p>{machine.notes}</p>}
                  </section>
                ))}
              {editor.operation !== "delete" && editor.input.notes && (
                <p>{editor.input.notes}</p>
              )}
              <p>
                {editor.operation === "delete"
                  ? "このセッションの削除を実行します。"
                  : "入力内容の検証が完了しました。"}
                {repository.mode === "review"
                  ? "変更はレビュー用メモリー内のみです。"
                  : "接続先Repositoryへ書き込みます。"}
              </p>
              <div className="button-row">
                {editor.operation !== "delete" && (
                  <button
                    className="quiet"
                    disabled={busy}
                    onClick={() => setConfirm(false)}
                  >
                    編集へ戻る
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <fieldset disabled={busy || editor.operation === "delete"}>
                <label>
                  日付
                  <FloatingDate
                    {...fieldAttributes(issues, "date")}
                    value={editor.input.date}
                    type="date"
                    disabled
                    onChange={() => {}}
                  />
                  <FieldError issues={issues} path="date" />
                </label>
                <label>
                  Gym
                  <FloatingSelect
                    {...fieldAttributes(issues, "gymId")}
                    value={editor.input.gymId || ""}
                    onChange={(e) =>
                      change((d) => {
                        d.gymId = e.target.value;
                      })
                    }
                  >
                    <option value="">選択してください</option>
                    {editor.input.gymId &&
                      !editor.snapshot.gyms.some(
                        (g) => g.id === editor.input.gymId,
                      ) && (
                        <option value={editor.input.gymId}>
                          ? {editor.input.gymId}（既存参照を保持）
                        </option>
                      )}
                    {editor.snapshot.gyms.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </FloatingSelect>
                  <FieldError issues={issues} path="gymId" />
                </label>
                {editor.snapshot.sessions
                  .find((s) => s.sessionId === editor.id)
                  ?.warnings.map((w, i) => (
                    <p className="warning-note" key={i}>
                      {fieldLabel(w.path)}: {w.message}
                    </p>
                  ))}
                {editor.input.machines.map((m, mi) => (
                  <section className="edit-machine" key={mi}>
                    <div className="section-line">
                      <label>
                        Machine {mi + 1}
                        <FloatingSelect
                          {...fieldAttributes(
                            issues,
                            `machines[${mi}].machineId`,
                          )}
                          value={m.machineId || ""}
                          onChange={(e) =>
                            change((d) => {
                              d.machines[mi].machineId = e.target.value;
                            })
                          }
                        >
                          <option value="">選択してください</option>
                          {m.machineId &&
                            !editor.snapshot.machines.some(
                              (v) => v.id === m.machineId,
                            ) && (
                              <option value={m.machineId}>
                                ? {m.machineId}（既存参照を保持）
                              </option>
                            )}
                          {editor.snapshot.machines.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </FloatingSelect>
                        <FieldError
                          issues={issues}
                          path={`machines[${mi}].machineId`}
                        />
                      </label>
                      <button
                        className="quiet danger"
                        onClick={() =>
                          change((d) => {
                            d.machines.splice(mi, 1);
                          })
                        }
                      >
                        除去
                      </button>
                    </div>
                    <label>
                      Machineメモ
                      <input
                        {...fieldAttributes(issues, `machines[${mi}].notes`)}
                        value={m.notes || ""}
                        onChange={(e) =>
                          change((d) => {
                            d.machines[mi].notes = e.target.value || null;
                          })
                        }
                      />
                      <FieldError
                        issues={issues}
                        path={`machines[${mi}].notes`}
                      />
                    </label>
                    {m.sets.map((s, si) => (
                      <div className="set-input" key={si}>
                        <span>{String(si + 1).padStart(2, "0")}</span>
                        <label>
                          kg
                          <input
                            {...fieldAttributes(
                              issues,
                              `machines[${mi}].sets[${si}].weightKg`,
                            )}
                            aria-label={`マシン${mi + 1} セット${si + 1} 重量 kg`}
                            type="number"
                            min="0"
                            max="999.99"
                            step=".01"
                            value={s.weightKg ?? ""}
                            onChange={(e) =>
                              change((d) => {
                                d.machines[mi].sets[si].weightKg =
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value);
                              })
                            }
                          />
                          <FieldError
                            issues={issues}
                            path={`machines[${mi}].sets[${si}].weightKg`}
                          />
                        </label>
                        <label>
                          reps
                          <input
                            {...fieldAttributes(
                              issues,
                              `machines[${mi}].sets[${si}].reps`,
                            )}
                            aria-label={`マシン${mi + 1} セット${si + 1} 回数`}
                            type="number"
                            min="1"
                            max="100"
                            value={s.reps ?? ""}
                            onChange={(e) =>
                              change((d) => {
                                d.machines[mi].sets[si].reps =
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value);
                              })
                            }
                          />
                          <FieldError
                            issues={issues}
                            path={`machines[${mi}].sets[${si}].reps`}
                          />
                        </label>
                        <label>
                          メモ
                          <input
                            {...fieldAttributes(
                              issues,
                              `machines[${mi}].sets[${si}].notes`,
                            )}
                            value={s.notes || ""}
                            onChange={(e) =>
                              change((d) => {
                                d.machines[mi].sets[si].notes =
                                  e.target.value || null;
                              })
                            }
                          />
                          <FieldError
                            issues={issues}
                            path={`machines[${mi}].sets[${si}].notes`}
                          />
                        </label>
                        <button
                          className="icon-button"
                          aria-label={`セット${si + 1}を除去`}
                          onClick={() =>
                            change((d) => {
                              d.machines[mi].sets.splice(si, 1);
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      {...fieldAttributes(issues, `machines[${mi}].sets`)}
                      className="quiet"
                      disabled={m.sets.length >= 10}
                      onClick={() =>
                        change((d) => {
                          d.machines[mi].sets.push({
                            sourceIndex: null,
                            weightKg: null,
                            reps: null,
                            notes: null,
                          });
                        })
                      }
                    >
                      ＋ セット
                    </button>
                    <FieldError issues={issues} path={`machines[${mi}].sets`} />
                  </section>
                ))}
                <button
                  {...fieldAttributes(issues, "machines")}
                  className="quiet"
                  disabled={editor.input.machines.length >= 10}
                  onClick={() =>
                    change((d) => {
                      d.machines.push(blank(date).machines[0]);
                    })
                  }
                >
                  ＋ Machine
                </button>
                <FieldError issues={issues} path="machines" />
                <label>
                  セッションメモ
                  <textarea
                    {...fieldAttributes(issues, "notes")}
                    value={editor.input.notes || ""}
                    onChange={(e) =>
                      change((d) => {
                        d.notes = e.target.value || null;
                      })
                    }
                  />
                  <FieldError issues={issues} path="notes" />
                </label>
              </fieldset>
            </>
          )}
        </Dialog>
      )}
      {guard.confirmation}
    </div>
  );
}
