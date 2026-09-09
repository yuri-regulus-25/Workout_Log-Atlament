# Application Framework Recovery Contract

## Scope

この文書は、Windows AF、Android AF、Node.js開発用ランタイム、共通フロントエンドクライアント、Maintenance UIが共有するv3.0.0のData Recovery契約を定義する。

契約の起点となった計画資料は `work/v2.1.0-plan/04_recovery_architecture_contract.md` と `05_recovery_api_and_implementation_plan.md` である。現行契約は本書とソース、テストを正とする。

## Public Namespace

```text
/api/v1/common/recovery
```

Public endpoints:

```text
GET    /recovery/resources
GET    /recovery/resources/{resourceKey}
GET    /recovery/resources/{resourceKey}/source
GET    /recovery/resources/{resourceKey}/draft
POST   /recovery/resources/{resourceKey}/draft
PUT    /recovery/resources/{resourceKey}/draft
DELETE /recovery/resources/{resourceKey}/draft
POST   /recovery/resources/{resourceKey}/validate
POST   /recovery/resources/{resourceKey}/commit
```

All endpoints use the existing AF response envelope. `resourceKey` is opaque and must not be decoded by Frontend business logic.

Windows, Android, Node development runtime, shared frontend client, and Maintenance UI publish the same public DTO names and endpoint set. Platform-specific capability differences must be represented through `RecoveryCapabilities` and stable error codes, not fake successful responses.

## Resource Contract

- One JSON / JSONL file is one Resource.
- Resource identity: `path + revision`.
- Inspection identity: `path + revision + inspectionVersion`.
- 現行の検査バージョン（`inspectionVersion`）: `1`。
- Resource health: `healthy | degraded | broken`.
- Broken Resource is logically quarantined; detection never mutates Git.
- Broken Workout Resource is excluded as a whole; other independent Workout Resources continue.
- Broken Master blocks new Runtime adoption and follows whole-Runtime LKG fallback rules.

## Recovery Draft

- Native AF local storage only; never Git and never browser-storage SoT.
- Binds to source path/revision.
- 下書きは端末ごとのローカルデータであり、別端末とは同期しない。
- Uses `draftRevision` optimistic concurrency.
- Source revision change makes Draft stale and non-committable.
- No automatic merge.
- Stale values may be copied only through explicit human action into a new current Draft.

## Validation

Whole Resource Validation is mandatory.

```text
healthy  -> commit allowed
degraded -> commit allowed with warning
broken   -> commit prohibited
```

Validation includes schema/domain and relevant repository-integrity rules. Draft/source/repository-context changes invalidate prior validation. Commit performs a final validation/recheck.

## Git Write Boundary

Frontend never sends Raw replacement content, arbitrary target path, Git credentials, or commit message.

Recovery uses optimistic concurrency and no repository-wide lock. No auto merge/rebase/overwrite/force update.

Normal rule:

```text
1 Recovery = 1 Broken Resource = 1 logical Git commit
```

Same-path replacement may use existing Contents API semantics. Path relocation must delete the old path and create the new path in one atomic Git commit.

## Commit Result / Reflection

After Git success AF attempts re-inspection and Runtime reflection. Git success is not rolled back when reflection fails. The API/UI must distinguish Git failure, Git success + reflection failure, and full Recovery success.

WindowsとAndroidは、設定と認証情報が利用可能で対象リソースが修復可能な場合、ネイティブ側のGitHub書き込み境界を通じてRecoveryの変更をGitへ反映する。Androidも同一パスの置換と、追加・削除を1コミットにまとめるパス移動を実行でき、`RecoveryCapabilities.commit` は修復可否に従う。`RECOVERY_UNAVAILABLE` は書き込み境界を安全に提供できないランタイムまたは状態に用いる共通エラーであり、Androidを一律利用不能とするものではない。Node.js開発用ランタイムは偽のコミット成功を返さない。

## Status Facts

`GET /status` publishes Recovery/quarantine facts:

```text
runtimeData.quarantinedWorkoutResourceCount
recovery.brokenResourceCount
recovery.brokenWorkoutResourceCount
recovery.brokenMasterResourceCount
recovery.recoverableResourceCount
recovery.activeDraftCount
```

Workout Resource quarantine keeps Runtime available with degraded readiness and does not set `fallbackActive`. Whole-runtime LKG fallback is reserved for remote/validation failure or Broken Master handling where the current runtime cannot be safely adopted.

## Error Codes

Recovery-specific stable codes include:

```text
RECOVERY_RESOURCE_NOT_FOUND
RECOVERY_RESOURCE_NOT_BROKEN
RECOVERY_UNAVAILABLE
RECOVERY_SOURCE_UNAVAILABLE
RECOVERY_SOURCE_VIEW_TOO_LARGE
RECOVERY_SCHEMA_UNSUPPORTED
RECOVERY_DRAFT_REQUIRED
RECOVERY_DRAFT_CONFLICT
RECOVERY_DRAFT_STALE
RECOVERY_DRAFT_INCOMPATIBLE
RECOVERY_DRAFT_CORRUPTED
RECOVERY_DRAFT_SAVE_FAILED
RECOVERY_WRITE_CONFLICT
RECOVERY_WRITE_FAILED
RECOVERY_REFLECTION_FAILED
```

Existing `GITHUB_*` transport/auth codes are reused. Human messages are display-only and must not be parsed for logic.

## Security

Recovery does not enable generic Raw JSON write, generic Git write, arbitrary commit messages, or Frontend-held credentials. Resource/path authorization is enforced inside AF.
