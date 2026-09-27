import { FloatingSelect } from "../ui/FloatingSelection";
import { useState } from "react";
import { validateWorkoutMasterData } from "@workout-lab/workout-core";
import type {
  WorkoutMasterData,
  MachineMasterItem,
  GymMasterItem,
} from "@workout-lab/workout-types";
import { useRuntime } from "../application/runtime";
import {
  ApplicationError,
  type MasterKind,
  type MasterSnapshot,
} from "../application/contracts";
import { bodyNames } from "../application/metrics";
import { Dialog, Empty, ErrorMessage, Heading } from "../ui/common";
import { useEditorGuard } from "../ui/useEditorGuard";
import {
  FieldError,
  ValidationSummary,
  fieldAttributes,
  type FieldIssue,
} from "../ui/validationFeedback";

type ResourceEditor = {
  snapshot: MasterSnapshot;
  masters: WorkoutMasterData;
  index: number;
  isNew: boolean;
  initial: string;
};
export default function Resources() {
  const { data, repository, refresh, notify } = useRuntime(),
    [kind, setKind] = useState<MasterKind>("MACHINE_MASTER"),
    [editor, setEditor] = useState<ResourceEditor | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [sourceIds, setSourceIds] = useState(""),
    [aliases, setAliases] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const closeEditor = () => {
    setEditor(null);
    setError("");
    setIssues([]);
  };
  const guard = useEditorGuard(
    !!editor &&
      JSON.stringify({ masters: editor.masters, sourceIds, aliases }) !==
        editor.initial,
    busy,
    closeEditor,
  );
  const machines = kind === "MACHINE_MASTER",
    items = machines
      ? data?.masterData?.machines.machines || []
      : data?.masterData?.gyms.gyms || [];
  async function open(id?: string) {
    setBusy(true);
    setError("");
    try {
      if (!data?.masterData) throw new Error("マスターがありません");
      const snapshot = await repository.master(kind),
        masters = structuredClone(data.masterData);
      // 表示時ではなく編集開始時のrevisionと内容をセットで使う。
      if (machines) masters.machines = JSON.parse(snapshot.content);
      else masters.gyms = JSON.parse(snapshot.content);
      let index: number;
      if (machines) {
        index = id
          ? masters.machines.machines.findIndex((m) => m.machine_id === id)
          : masters.machines.machines.length;
        if (!id)
          masters.machines.machines.push({
            machine_id: "",
            name: "",
            body_part: "other",
            active: true,
            deleted: false,
          });
      } else {
        index = id
          ? masters.gyms.gyms.findIndex((g) => g.gym_id === id)
          : masters.gyms.gyms.length;
        if (!id)
          masters.gyms.gyms.push({
            gym_id: "",
            name: "",
            active: true,
            deleted: false,
            main: false,
          });
      }
      if (index < 0) throw new Error("対象は最新マスターにありません");
      const target = machines
        ? masters.machines.machines[index]
        : masters.gyms.gyms[index];
      setSourceIds(target.source_ids?.join(", ") || "");
      setAliases(
        "machine_id" in target ? target.aliases?.join(", ") || "" : "",
      );
      setEditor({
        snapshot,
        masters,
        index,
        isNew: !id,
        initial: JSON.stringify({
          masters,
          sourceIds: target.source_ids?.join(", ") || "",
          aliases:
            "machine_id" in target ? target.aliases?.join(", ") || "" : "",
        }),
      });
      setIssues([]);
      setConfirm(false);
      setUncertain(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const item = editor
    ? machines
      ? editor.masters.machines.machines[editor.index]
      : editor.masters.gyms.gyms[editor.index]
    : null;
  function update(values: Partial<MachineMasterItem & GymMasterItem>) {
    if (!editor) return;
    const next = structuredClone(editor);
    const target = machines
      ? next.masters.machines.machines[next.index]
      : next.masters.gyms.gyms[next.index];
    Object.assign(target, values);
    if (values.main)
      next.masters.gyms.gyms.forEach((g, i) => {
        if (i !== next.index) g.main = false;
      });
    setEditor(next);
  }
  function validate() {
    if (!editor) return;
    const next = structuredClone(editor);
    const target = machines
      ? next.masters.machines.machines[next.index]
      : next.masters.gyms.gyms[next.index];
    target.source_ids = sourceIds
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if ("machine_id" in target)
      target.aliases = aliases
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    setEditor(next);
    const result = validateWorkoutMasterData(next.masters);
    const errors: FieldIssue[] = [];
    const idField = "machine_id" in target ? "machine_id" : "gym_id";
    if (!("machine_id" in target ? target.machine_id : target.gym_id).trim())
      errors.push({ path: idField, message: "IDを入力してください" });
    if (!target.name.trim())
      errors.push({ path: "name", message: "名前を入力してください" });
    for (const issue of result.issues) {
      const targetPath = `${machines ? "machines.machines" : "gyms.gyms"}[${editor.index}]`;
      if (issue.code.includes("required-field") && issue.path === targetPath)
        continue;
      const field = issue.path.startsWith(`${targetPath}.`)
        ? issue.path.slice(targetPath.length + 1)
        : issue.code.startsWith("duplicate-") &&
            issue.referenceId ===
              ("machine_id" in target ? target.machine_id : target.gym_id)
          ? idField
          : issue.code.startsWith("duplicate-") &&
              target.source_ids?.includes(issue.referenceId || "")
            ? "source_ids"
            : !machines && /main-gym/.test(issue.code)
              ? "main"
              : "";
      const message = issue.code.startsWith("duplicate-")
        ? "同じIDまたは旧IDが他の項目で使われています"
        : issue.code === "invalid-machine-body-part"
          ? "部位を選択してください"
          : issue.code === "inactive-or-deleted-main-gym"
            ? "Main Gymは有効かつ未削除のGymにしてください"
            : issue.code === "multiple-main-gyms"
              ? "Main Gymは1件だけ指定してください"
              : "既存マスターに不正な項目があります。対象の項目を確認してください";
      errors.push({ path: field, message });
    }
    if (
      data?.masterData?.gyms.gyms.some((g) => g.main) &&
      !editor.masters.gyms.gyms.some((g) => g.main)
    )
      errors.push({
        path: "main",
        message: "Main Gymは解除ではなく別のGymへ切り替えてください",
      });
    setIssues(errors);
    setError("");
    if (!errors.length) setConfirm(true);
  }
  async function save() {
    if (!editor) return;
    setBusy(true);
    setError("");
    try {
      const receipt = await repository.saveMaster(
        editor.snapshot,
        editor.masters,
      );
      notify(receipt.message);
      setEditor(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      setUncertain(e instanceof ApplicationError && e.uncertain);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="06 / RESOURCES"
        title="The things behind the records."
        action={
          <button disabled={busy} onClick={() => void open()}>
            ＋ {machines ? "Machine" : "Gym"}追加
          </button>
        }
      >
        マスターを整える。過去のワークアウト記録は書き換えません。
      </Heading>
      <div className="resource-tabs" role="group" aria-label="リソース種類">
        <button
          className={machines ? "selected" : "quiet"}
          disabled={busy}
          onClick={() => setKind("MACHINE_MASTER")}
        >
          Machines{" "}
          <span>{data?.masterData?.machines.machines.length || 0}</span>
        </button>
        <button
          className={!machines ? "selected" : "quiet"}
          disabled={busy}
          onClick={() => setKind("GYM_MASTER")}
        >
          Gyms <span>{data?.masterData?.gyms.gyms.length || 0}</span>
        </button>
      </div>
      {error && !editor && <ErrorMessage>{error}</ErrorMessage>}
      <div className="resource-list">
        {items.map((item) => {
          const id = "machine_id" in item ? item.machine_id : item.gym_id;
          return (
            <article className="resource-row glass" key={id}>
              <span className="resource-glyph">{machines ? "M" : "G"}</span>
              <span>
                <strong>{item.name}</strong>
                <small>{id}</small>
              </span>
              <span>
                {"body_part" in item
                  ? bodyNames[item.body_part]
                  : item.main
                    ? "MAIN GYM"
                    : "GYM"}
              </span>
              <span className={`pill ${item.deleted ? "deleted" : ""}`}>
                {item.deleted ? "削除済み" : item.active ? "有効" : "無効"}
              </span>
              <button
                className="quiet resource-edit"
                aria-label={`${item.name}を編集`}
                onClick={() => void open(id)}
                disabled={busy}
              >
                編集 ↗
              </button>
            </article>
          );
        })}
      </div>
      {!items.length && <Empty />}
      <p className="resource-note">
        削除は論理削除です。履歴の参照を保持し、新規利用の対象から外します。Main
        Gymは常に1件以下で、設定済みの場合は別のGymへ切り替えます。
      </p>
      {editor && item && (
        <Dialog
          title={`${machines ? "Machine" : "Gym"} ${editor.isNew ? "追加" : "編集"}`}
          close={guard.requestClose}
          busy={busy}
          primary={
            <button
              disabled={busy || uncertain}
              onClick={() => (confirm ? void save() : validate())}
            >
              {busy ? "処理中…" : confirm ? "保存する" : "内容を確認"}
            </button>
          }
        >
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <ValidationSummary issues={issues} />
          {confirm ? (
            <>
              <h3>「{item.name}」の変更を保存しますか？</h3>
              <p>
                ID: {"machine_id" in item ? item.machine_id : item.gym_id}
                <br />
                {item.active ? "有効" : "無効"} /{" "}
                {item.deleted ? "削除済み" : "未削除"}
                <br />
                {"body_part" in item
                  ? `部位: ${bodyNames[item.body_part]}`
                  : `Main Gym: ${item.main ? "はい" : "いいえ"}`}
                <br />
                旧ID: {item.source_ids?.join(", ") || "なし"}
              </p>
              <p>
                {item.deleted
                  ? "論理削除します。過去の記録自体は削除しません。"
                  : "マスターの検証が完了しました。"}
              </p>
              <p>
                {repository.mode === "live"
                  ? "接続先Repositoryへ書き込みます。"
                  : "レビュー用メモリー内だけを変更します。"}
              </p>
              <div className="button-row">
                <button
                  className="quiet"
                  disabled={busy}
                  onClick={() => setConfirm(false)}
                >
                  戻る
                </button>
              </div>
            </>
          ) : (
            <>
              <label>
                ID
                <input
                  {...fieldAttributes(
                    issues,
                    machines ? "machine_id" : "gym_id",
                  )}
                  disabled={!editor.isNew}
                  value={"machine_id" in item ? item.machine_id : item.gym_id}
                  onChange={(e) =>
                    update(
                      machines
                        ? { machine_id: e.target.value }
                        : { gym_id: e.target.value },
                    )
                  }
                />
                <FieldError
                  issues={issues}
                  path={machines ? "machine_id" : "gym_id"}
                />
              </label>
              <label>
                名前
                <input
                  {...fieldAttributes(issues, "name")}
                  value={item.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
                <FieldError issues={issues} path="name" />
              </label>
              {"body_part" in item ? (
                <label>
                  部位
                  <FloatingSelect
                    {...fieldAttributes(issues, "body_part")}
                    value={item.body_part}
                    onChange={(e) =>
                      update({
                        body_part: e.target
                          .value as MachineMasterItem["body_part"],
                      })
                    }
                  >
                    {Object.entries(bodyNames).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </FloatingSelect>
                  <FieldError issues={issues} path="body_part" />
                </label>
              ) : (
                <>
                  <label>
                    略称
                    <input
                      value={item.short_name || ""}
                      onChange={(e) => update({ short_name: e.target.value })}
                    />
                  </label>
                  <label className="checkbox">
                    <input
                      {...fieldAttributes(issues, "main")}
                      type="checkbox"
                      checked={item.main}
                      onChange={(e) => update({ main: e.target.checked })}
                    />
                    Main Gym（他のGymから切り替え）
                    <FieldError issues={issues} path="main" />
                  </label>
                </>
              )}
              <label>
                旧ID / 参照の対応付け（カンマ区切り）
                <input
                  {...fieldAttributes(issues, "source_ids")}
                  value={sourceIds}
                  onChange={(e) => setSourceIds(e.target.value)}
                />
                <FieldError issues={issues} path="source_ids" />
              </label>
              {machines && (
                <label>
                  別名（カンマ区切り）
                  <input
                    value={aliases}
                    onChange={(e) => setAliases(e.target.value)}
                  />
                </label>
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={(e) => update({ active: e.target.checked })}
                />
                新しい記録で利用可能
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={item.deleted}
                  onChange={(e) =>
                    update({
                      deleted: e.target.checked,
                      ...(e.target.checked ? { active: false } : {}),
                    })
                  }
                />
                論理削除（解除で復元）
              </label>
            </>
          )}
        </Dialog>
      )}
      {guard.confirmation}
    </>
  );
}
