import type { FieldIssue } from "../application/contracts";
export type { FieldIssue } from "../application/contracts";
export const fieldId = (path: string) =>
  `edit-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;

/** Domainのパスは入力との対応付けだけに使い、表示文には利用者が認識できる名前を使う。 */
export function fieldLabel(path: string) {
  const machine = path.match(/machines\[(\d+)\]/),
    set = path.match(/sets\[(\d+)\]/);
  const prefix = machine
    ? `マシン${Number(machine[1]) + 1}${set ? `・セット${Number(set[1]) + 1}` : ""}の`
    : "";
  const labels: Record<string, string> = {
    date: "日付",
    gymId: "Gym",
    machineId: "マシン",
    weightKg: "重量（kg）",
    reps: "回数",
    notes: "メモ",
    machines: "マシン一覧",
    sets: "セット一覧",
    machine_id: "ID",
    gym_id: "ID",
    name: "名前",
    short_name: "略称",
    source_ids: "旧ID",
    aliases: "別名",
    active: "利用状態",
    deleted: "削除状態",
    main: "Main Gym",
    body_part: "部位",
  };
  return prefix + (labels[path.split(".").at(-1)!] || "入力内容");
}
export function fieldAttributes(issues: FieldIssue[], path: string) {
  const invalid = issues.some((issue) => issue.path === path);
  return {
    id: fieldId(path),
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? `${fieldId(path)}-error` : undefined,
  };
}
export function FieldError({
  issues,
  path,
}: {
  issues: FieldIssue[];
  path: string;
}) {
  const messages = issues.filter((issue) => issue.path === path);
  return messages.length ? (
    <span className="field-error" id={`${fieldId(path)}-error`}>
      {messages.map((issue) => issue.message).join(" / ")}
    </span>
  ) : null;
}
export function ValidationSummary({ issues }: { issues: FieldIssue[] }) {
  return issues.length ? (
    <div className="validation-summary" role="alert">
      <p>次の入力を確認してください。</p>
      <ul>
        {issues.map((issue, index) => (
          <li key={`${issue.path}-${index}`}>
            {issue.path ? (
              <button
                className="quiet"
                onClick={() =>
                  document.getElementById(fieldId(issue.path))?.focus()
                }
              >
                {fieldLabel(issue.path)}：{issue.message}
              </button>
            ) : (
              <span>{issue.message}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  ) : null;
}
