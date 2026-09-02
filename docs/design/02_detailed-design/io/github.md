# GitHub I/O 現行仕様と設計方針

GitHub は native AF における Workout Data と Master Data の外部 Source of Truth である。

## Access Model

GitHub access は「データ種別ごとの read/write 可否」だけではなく、**用途を限定した Domain operation** として公開する。

許可される操作だけが専用境界を持ち、Frontend へ以下を公開しない。

- Generic Git write
- Raw JSON / JSONL write
- arbitrary repository path
- arbitrary commit message
- Git credential

現行通常機能は Workout fetch と Master read/write を持つ。v2.1.0 Recovery は Broken Workout / Master Resource の安全な replacement write を追加する。

Repository configuration:

- owner
- repository
- ref
- root path
- resource paths

Resource path は request 前に root path と combine する。ただし write target authorization は利用者入力 path をそのまま信用せず、各 Domain operation の認可規則で確定する。

## Resources

```text
WORKOUT
MACHINE_MASTER
GYM_MASTER
```

現行 default:

- `WORKOUT`: directory, `workouts/`
- `MACHINE_MASTER`: file, `master/machines.json`
- `GYM_MASTER`: file, `master/gyms.json`

Resource の存在・空状態は `required` / `emptyAllowed` の自由設定ではなく Resource Type の Domain Contract とする方向へ移行する。

## Fetch / Inspection

Workout directory fetch は entry を traverse し JSON / JSONL Resource を取得する。Master は file Resource として取得する。

v2.1.0 以降は取得成功と Runtime 採用可否を分離する。取得した Resource は Inspection / Validation を通し、Health に応じて採用・隔離・fallback を判断する。

GitHub error の共通 stable code:

```text
GITHUB_UNAUTHORIZED
GITHUB_FORBIDDEN
GITHUB_RATE_LIMIT
GITHUB_RESOURCE_NOT_FOUND
GITHUB_CONNECTION_FAILED
GITHUB_TIMEOUT
GITHUB_SERVER_ERROR
```

Android 現行実装の `GITHUB_RATE_LIMITED` は共通 `GITHUB_RATE_LIMIT` へ統一する。

## Master Write

Master write は用途限定 endpoint から GitHub Contents API を使用する。現行 target は AF 内部 allowlist で固定する。

```text
MACHINE_MASTER -> master/machines.json
GYM_MASTER     -> master/gyms.json
```

Write sequence:

1. Local Master snapshot revision と `expectedRevision` を比較。
2. Candidate whole-master validation。
3. Remote content metadata を取得し current SHA を確認。
4. Remote / Local revision が一致する場合のみ fixed commit message で PUT。
5. 成功後 new SHA を採用し Runtime を rebuild。

Local / Remote mismatch と GitHub 409 は conflict とする。Ambiguous success は `MASTER_WRITE_FAILED` とし blind retry しない。

Runtime が参照中の Gym / Machine logical delete は許可する。Workout Raw Data は変更せず、次回 Runtime rebuild で unresolved warning とする。

## Recovery Write

Recovery は Master write とは別の用途限定 Git write 境界である。

### 共通規則

- 1 Recovery = 1 Broken Resource = 1 logical Git commit。
- Source `path + revision` を optimistic concurrency の基準とする。
- Write 前に source revision と関連 repository context を再確認する。
- unrelated Resource を同時変更しない。
- auto merge / rebase / overwrite / force / non-fast-forward を行わない。
- Commit message は AF 固定。
- Raw source / replacement content / credential を log や summary に残さない。

### Same-path replacement

同じ path の replacement は GitHub Contents API を使用できる。

### Path relocation

Path が変わる Recovery は、旧 path の削除と新 path の作成を **1 atomic Git commit** で実行する。

```text
expected remote parent
  ↓ recheck
create replacement blob/tree
  ↓
old path delete + new path create
  ↓
create commit
  ↓ remote head recheck
update ref (fast-forward only)
```

Git Data API 等の atomic primitive を使用する。Contents API を順番に2回呼ぶ delete→create / create→delete は禁止する。Atomic operation を提供できない Platform build は relocation を成功扱いしてはならない。

Remote head が期待 parent から変化していた場合は `RECOVERY_WRITE_CONFLICT`。Force update しない。

Git write result が曖昧な場合は Remote state を reconcile し、既に commit 済みかを確認してから次の操作を決める。同一内容を blind retry しない。

## Reflection

Recovery commit 成功後は re-inspection / sync / Runtime rebuild を試行する。

Reflection failure は Git commit を rollback しない。

```text
Git failed
Git saved + reflection failed
Git saved + reflection succeeded
```

を区別する。2番目は `RECOVERY_REFLECTION_FAILED` として「保存済み・反映失敗」を表現する。

## Testing

Production Repository を直接変更する unit / integration test を前提にしない。

GitHub transport と write primitive は fake / test double で以下を再現できるようにする。

- HTTP status / auth failure
- rate limit
- network error / timeout
- revision conflict
- ambiguous write result
- remote head changed before ref update
- same-path write
- atomic relocation
- Git success + reflection failure

Windows / Android で同じ Git write policy を検証する共通 test vector / contract test を持つ。
