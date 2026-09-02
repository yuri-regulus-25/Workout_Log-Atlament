# Application Framework Recovery 契約

## 目的

この文書は、Windows AF、Android AF、Node.js開発用ランタイム、共通フロントエンドクライアント、Maintenance UIが共有するv3.0.0のData Recovery契約を定義する。

契約の起点となった計画資料は `work/v2.1.0-plan/04_recovery_architecture_contract.md` と `05_recovery_api_and_implementation_plan.md` である。現行契約は本書とソース、テストを正とする。

## Public Namespace

```text
/api/v1/common/recovery
```

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

全 endpoint は既存 AF response envelope を使用する。`resourceKey` は opaque かつ revision-bound であり、Frontend business logic は decode しない。

Windows, Android, Node development runtime, shared frontend client, and Maintenance UI publish the same public DTO names and endpoint set. Platform-specific capability differences must be represented through `RecoveryCapabilities` and stable error codes, not fake successful responses.

## Resource Inspection

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

Whole Resource Validation は必須である。

```text
healthy  -> commit allowed
degraded -> commit allowed with warning
broken   -> commit prohibited
```

Validation は schema、Domain、関連 Repository integrity を含む。candidate が新しい Broken repository state を作る場合は commit を許可しない。

Draft / source / repository context の変更は prior validation を無効化する。Commit は必ず直前に再検証する。

Candidate が Broken のままであることは validation operation 自体の失敗ではない。正常に判定できた場合、HTTP 200 の result として `commitAllowed=false` を返す。Validator 自体の内部失敗は operation error とする。

## Replacement Generation

Recovery candidate は通常 Domain model と canonical serializer を使用して生成する。Recovery 専用の重複 schema / serializer を作らない。

原則として元 path を維持する。Domain identity / consistency 修復のため path relocation が必要な場合のみ destination を変更できる。

Path relocation 時:

- destination を検証する。
- implicit overwrite を禁止する。
- UI で old path → new path を明示する。
- old delete + new create を **1 atomic Git commit** で実行する。
- sequential delete/create しかできない実装では relocation を実行してはならない。

## Git Write Boundary

Frontend は Raw replacement content、任意 target path、Git credential、commit message を送らない。

Recovery は optimistic concurrency を使用し、repository-wide lock を設けない。

```text
1 Recovery = 1 Broken Resource = 1 logical Git commit
```

禁止事項:

- auto merge
- auto rebase
- implicit overwrite
- force update
- non-fast-forward update
- unrelated Resource の同時変更

Same-path replacement は Contents API を使用できる。Path relocation は Git Data API 等、old delete + new create を 1 commit にできる primitive を使用する。

Write 前に source revision、関連 repository context、remote parent / head を再確認する。曖昧な write result では blind retry をせず、remote state を reconcile してから次の操作を決定する。

Commit message は AF 固定とし、Raw content や credential を log / summary へ出さない。

## Commit Result / Reflection

Git write 成功後、AF は自動で sync / re-inspection / Runtime rebuild を試行する。

Git 成功後に reflection が失敗しても Git を rollback しない。API / UI は次を区別する。

1. Git write 自体が失敗した。
2. Git への保存は成功したが、local reflection が失敗した。
3. Git 保存と local reflection の双方が成功した。

2 の状態は利用者へ「保存済み・反映失敗」と明示し、同一内容の blind re-commit を主要導線にしない。

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
RECOVERY_VALIDATION_FAILED
RECOVERY_WRITE_CONFLICT
RECOVERY_WRITE_FAILED
RECOVERY_REFLECTION_FAILED
```

既存 `GITHUB_*` transport / auth code を再利用する。Human message は表示用であり logic に使用しない。

HTTP status の共通意味は [HTTP API I/O](../io/http-api.md) に従う。

## Security

Recovery は以下を公開しない。

- generic Raw JSON write
- generic Git write
- arbitrary commit message
- Frontend-held credential
- arbitrary repository path mutation

Resource / path authorization は AF 内部で強制する。

## Platform Parity

Windows / Android は同じ Recovery contract を実装する。Platform 固有でよいのは storage root、filesystem primitive、credential protection、HTTP host 等、OS に依存する部分だけである。

同じ Recovery operation が Platform によって「対応 / 非対応」へ分岐する状態は、OS 制約による不可避な理由がない限り contract violation とする。

### UT で確認された実装差異

v2.1.0 UT では Android の path relocation commit が未実装で 503 `RECOVERY_WRITE_FAILED` となることを確認した。これは設計上許容する Platform 差ではなく、Release 前に修正すべき correctness blocker である。

同じく Draft 保存先の案内と実体に差異が確認された。実体 `files/recovery/drafts/` は native app-data という契約には適合する。今後は共通論理パス `recovery/drafts/` を設計上明示し、Platform root の差だけを Adapter へ閉じ込める。
