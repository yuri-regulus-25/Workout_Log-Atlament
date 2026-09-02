# Application Settings 現行仕様と設計方針

## 責務

Application Settings は AF-facing configuration と operation を管理する。

Workout Data または Master Data content は編集しない。

## Source / Framework

```text
src/frontend/settings-solid/
```

- SolidJS
- TypeScript
- Vite

## Route

```text
/settings/
```

## API Access

Settings は `@workout-lab/frontend-common` の AF client helper を以下に使用する。

- status
- configuration
- credential status
- configuration update
- credential update
- manual sync

Token value は AF から読み戻さず、Frontend storage にも保存しない。

## 画面構成

現行 Settings は以下を含む。

- Application Readiness に基づく Setup Assistant
- application、GitHub、runtime、hosting、version information を含む Status section
- owner、repository、ref、root path の Repository form
- Resources editor
- GitHub request、sync operation、general API、shutdown timeout の Timeout form
- GitHub token と token limit date の Credential form
- Manual Sync を含む Operations section

### Resources editor

現行実装は Resource ごとに `type`、`path`、`resourceKind`、`required`、`emptyAllowed` を編集対象としている。

設計上、`required` と `emptyAllowed` は利用者設定から廃止する。

Resource の存在要件と空状態の意味は Resource Type ごとの Domain Contract であり、利用者が汎用 boolean で変更するものではない。

- Workout Resource 0 件: 正常な初期状態として扱う設計へ移行する。
- 空の Workout file: 正常な空状態の標準表現にはしない。
- Gym / Machine Master file 不在: 正常な空状態とは扱わない。
- 有効な Master file 内の record 0 件: 正常な状態として扱える。

Settings の Resource 設定は「何を・どこから読むか」を中心にし、データ種別の意味論そのものを変更させない。

この変更は実装変更予定を含むため、Release 反映前は現行実装との差異として扱う。

## 状態と操作

画面は status、configuration、credential status を並行して読み込む。

保存操作は以下ごとに分離される。

- repository
- resources
- timeouts
- credential
- sync

Operation 実行中は busy state と full-screen operation overlay を持つ。Overlay は背面操作と背景 scroll を抑止し、進行表示は Theme の primary semantic color を使用する。

### 保存済み状態と入力中状態

AF から取得した保存済み configuration と、利用者が画面上で変更した未保存 form state を混同しない。

Status / Setup Assistant / readiness 表示は、未保存の入力値を「すでに設定済み」として扱わない。保存成功後に AF から確認できた状態を永続状態として表示する。

## Setup Assistant

Setup Assistant は独自の永続状態を持たず、既存 Settings operation を誘導する。

- Repository step: owner、repository、ref の入力を確認し、既存 repository save を実行する。
- Credential step: credential の設定状態を確認し、既存 credential update を実行する。
- Data Sources step: Workout、Machine Master、Gym Master の参照先を確認し、既存 resources save を実行する。
- Validation step: manual sync を実行し、AF status の `readiness.state` が `ready` になったことで完了とする。

Setup 完了条件は step 表示ではなく AF status の `readiness.state === "ready"` で判定する。Main Gym は任意 Context であり、未設定でも Setup 完了を妨げない。

Settings は shared frontend client の Application Access Policy を使用する。`runtimeData.fallbackActive` により、fallback 中の継続利用と Remote 取得 / validation 失敗を区別し、Retry Sync、Reload、Credential 更新等の操作へ接続する。

現行 source は app-wide setup gate、Master Data editor、diagnostics export を実装していない。

## Credential Status

UI に表示する credential state は AF が確定する。

- available
- missing
- invalid
- expired
- unknown

Settings は credential state と status component state を組み合わせて GitHub status を表示する。

## Navigation

Settings は current route ID `settings` で shared navigation を受け取る。
