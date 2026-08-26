# 共通 JavaScript 詳細設計

## 0. 文書目的

本書は AF と各 Frontend Framework の間に位置する共通 JavaScript（以下 共通JS）の詳細設計を定義する。

共通JSは AF の内部実装を知ってはならず、各 Frontend Framework に HTTP / Timeout / Response Contract 等の共通処理を重複実装させないための境界 Layer とする。

対象外:

- AF内部実装
- Frontend固有UI
- Framework固有State Management
- Chart / Layout / Routing Design

---

## 1. 責務境界

```text
Application Framework
        ↑↓ HTTP
     Common JS
        ↑↓ Call
Frontend Framework
```

共通JSの責務:

- AF API Call の統一窓口
- Promise / async 制御
- HTTP通信成立判定
- Timeout判定
- Response Parse
- Response Envelope形式確認
- AF Application Errorの受領
- Transport Errorの共通Error化
- Frontendへの共通Call Interface提供

共通JSの非責務:

- GitHubへの直接通信
- Local File直接操作
- OS Process制御
- AF Runtime Data生成
- Master Resolve
- Workout業務データValidation
- UI描画
- User Notificationの見た目
- Frontend固有State管理

---

## 2. Module構成

```text
common-js/
├─ af-client/
│  ├─ http-client
│  ├─ response-validator
│  ├─ timeout
│  └─ error-mapper
├─ services/
│  ├─ status-service
│  ├─ workout-service
│  ├─ sync-service
│  ├─ configuration-service
│  ├─ credential-service
│  └─ shutdown-service
└─ contracts/
   ├─ common
   ├─ status
   ├─ workout
   ├─ configuration
   ├─ credential
   └─ errors
```

責務が異なる処理は分離する。

---

## 3. AF API Endpoint

初期 API Version は `v1`。

Version指定:

```text
/api/v1/common/...
```

Version省略:

```text
/api/common/...
```

Version省略時は AF が提供する最新 Version を使用する。

共通JSの通常利用は Version省略Endpointを使用してよい。

特定Version固定が必要な場合は、Client生成時にVersionを指定できる余地を持たせる。

例:

```ts
createAfClient({ apiVersion: 'v1' })
```

---

## 4. 共通Response Contract

AF Response:

```ts
type AfError = {
  code: string
  message: string
  recoverable: boolean
}

type AfResponse<T> = {
  success: boolean
  errors: AfError[]
  data: T | null
}
```

意味:

- `success`: API Operationそのものの成否
- `errors`: Operation中に検出されたユーザー通知対象の異常情報
- `data`: 利用可能な結果

以下を正常なContractとして許容する。

```text
success = true
errors.length > 0
data != null
```

ただし、Master Resolve Failure により今回の Remote Runtime Data を確定できない場合は Sync Operation 失敗であり、このContractには該当しない。その場合は AF が `success:false` とし、利用可能な既存 Local Runtime Data がある場合は `source:local` / `updated:false` / `degraded:true` として返す。

したがって共通JSは `success:true` だから `errors` を無視してはならず、`success:false` でも `data` にFallback結果が存在する可能性を独自判断で破棄してはならない。

---

## 5. Frontend向け共通Result

Frontendへは原則以下の形で返す。

```ts
type AfCallResult<T> = {
  success: boolean
  errors: AfError[]
  data: T | null
}
```

AFから正しいEnvelopeが返った場合は、そのApplication結果を保持して返す。

Transport Failure等、AFから有効なResponseを受け取れない場合は共通JSが `success:false` のResultを生成する。

---

## 6. Transport Error

共通JS独自Error Codeは必要最小限とする。

```text
AF_CONNECTION_FAILED
AF_TIMEOUT
AF_INVALID_RESPONSE
AF_RESPONSE_PARSE_FAILED
```

用途:

### AF_CONNECTION_FAILED

HTTP通信そのものが成立しない。

### AF_TIMEOUT

共通JS側Timeoutを超過した。

### AF_INVALID_RESPONSE

JSONとしてParse可能だが期待するEnvelope Contractを満たさない。

### AF_RESPONSE_PARSE_FAILED

JSONとしてParseできない等、Response本文を解釈できない。

共通JS独自Error Codeを実装者判断で増殖させない。

---

## 7. 共通JSの判定順序

```text
API Call
↓
Timeout監視
↓
HTTP Response受信?
├─ No → AF_CONNECTION_FAILED / AF_TIMEOUT
└─ Yes
    ↓
Response Parse可能?
├─ No → AF_RESPONSE_PARSE_FAILED
└─ Yes
    ↓
Envelope Contract正常?
├─ No → AF_INVALID_RESPONSE
└─ Yes
    ↓
AF Call Resultとして返却
```

AFが `success:false` を返した場合、それはTransport FailureではなくAF Application FailureとしてそのままFrontendへ返す。

---

## 8. Timeout

AF Configuration上のTimeout設定を利用する。

```text
getAfStatus            → generalApiTimeoutSec
getWorkoutSessions     → generalApiTimeoutSec
syncWorkoutData        → syncOperationTimeoutSec
getConfiguration       → generalApiTimeoutSec
updateConfiguration    → generalApiTimeoutSec
getCredentialStatus    → generalApiTimeoutSec
updateCredential       → generalApiTimeoutSec
shutdownAf             → shutdownTimeoutSec
```

Configuration取得前にもTimeoutが必要なため、共通JSはBootstrap用Default Timeoutを持つ。

Bootstrap Timeout候補:

```text
10 sec
```

Configuration取得成功後はAF設定値へ切り替える。

Timeout値は秒単位として扱う。

---

## 9. 公開Call Interface

Frontend Frameworkへ提供する主要Interface:

```ts
getAfStatus(): Promise<AfCallResult<AfStatus>>

getWorkoutSessions(): Promise<AfCallResult<WorkoutRuntimeData>>

syncWorkoutData(): Promise<AfCallResult<SyncResult>>

getConfiguration(): Promise<AfCallResult<AfConfiguration>>

updateConfiguration(
  configuration: AfConfigurationUpdate
): Promise<AfCallResult<ConfigurationUpdateResult>>

getCredentialStatus(): Promise<AfCallResult<CredentialStatus>>

updateCredential(
  credential: CredentialUpdate
): Promise<AfCallResult<CredentialUpdateResult>>

shutdownAf(): Promise<AfCallResult<ShutdownResult>>
```

各Frontendから `fetch('/api/...')` を直接書くことは禁止する。

---

## 10. Runtime Workout Data

Workout Runtime Dataは AF が正規化済みの状態で提供する。

```ts
type WorkoutRuntimeData = {
  sessions: WorkoutSession[]
}
```

`sessions` は、正常なRemote SyncでMaster Resolveまで完了して確定されたRuntime Data、または過去に正常確定済みのLocal Runtime Dataに含まれるWorkoutSessionのみを含む。

Master Resolve Failure が今回のRemote Sync中に発生した場合、そのSync Setから一部Sessionだけを採用した新しいRuntime Dataは生成しない。AFは今回のRemote Runtime Dataを確定せず、利用可能な既存Local Runtime Dataがあればそれを維持する。Master Resolve FailureはSync APIの `success:false` と `errors` で通知する。

共通JSはWorkout SessionのMaster ResolveやParseを再実行しない。

---

## 11. 既存 workout-data 互換

既存の以下Interfaceは可能な限り維持する。

```ts
loadRuntimeWorkoutSessions()
```

旧処理:

```text
Runtime Endpointからfiles/masterData取得
↓
JSON / JSONL Parse
↓
Master Resolve
↓
WorkoutSession[]生成
```

新処理:

```text
Common JS
↓
GET AF Runtime Workout API
↓
正規化済みWorkoutSession[]受領
↓
既存呼出元へ返却
```

既存4画面のデータ取得Interface変更を最小化する。

Parser等の旧ロジックを残す場合でも、AF稼働時Runtime Data取得の正本処理として利用してはならない。

---

## 12. Status Interface

Status取得時に共通JSがGitHubや各Componentへ追加Checkを要求してはならない。

AFが保持するStatusを受け取るだけとする。

主な型:

```ts
type ApplicationStatus =
  | 'starting'
  | 'ready'
  | 'degraded'
  | 'stopping'
  | 'failed'

type ComponentStatus =
  | 'unknown'
  | 'available'
  | 'unavailable'
  | 'degraded'

type OperationStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
```

---

## 13. Error通知判定

共通JSは `errors` を落とさずFrontendへ渡す。

Frontendは一律、以下で通知要否を判断可能とする。

```text
errors.length > 0
→ User Notification対象あり
```

`success` と通知要否は別概念。

```text
success:false
→ Operation失敗。Local Fallback等の利用可能なdataが返る場合がある

success:true + errorsあり
→ Operation成立、ただし通知対象異常あり
```

Master Resolve Failureで今回のRemote Runtime Dataを確定できない場合は前者とし、`success:true + errorsあり` の部分成功として扱わない。

共通JS自身がUI通知を描画してはならない。

---

## 14. Configuration Interface

Configuration GET / POSTを共通Callとして提供する。

Configuration更新はPartial Updateを許容する。

例:

```ts
updateConfiguration({
  repository: {
    repository: 'new-name'
  }
})
```

共通JSはRepository変更時のGitHub導通確認を独自実行しない。AF Responseとして受領する。

---

## 15. Credential Interface

Credential Status取得でToken値を期待してはならない。

```ts
type CredentialStatus = {
  configured: boolean
  state: 'available' | 'missing' | 'invalid' | 'expired' | 'unknown'
  limitDate: string | null
}
```

Credential Update時のみToken値をAFへ送信する。

共通JSでTokenを永続保存してはならない。

---

## 16. Manual Sync Interface

Manual Syncは非同期Callとする。

Sync Result例:

```ts
type SyncResult = {
  source: 'remote' | 'local'
  updated: boolean
  degraded: boolean
}
```

Remote SyncがMaster Resolve Failure等により成立せず、既存Local Runtime DataへFallbackした場合は、AFの `success:false` / `source:'local'` / `updated:false` / `degraded:true` とError情報をそのままFrontendへ返す。

Operation競合による `OPERATION_ALREADY_RUNNING` はAF Application Errorとして受領する。

共通JSがRetryしてはならない。

---

## 17. Shutdown Interface

`shutdownAf()` はAF終了要求のみを行う。

共通JSはOS Processを直接Killしてはならない。

AFがShutdown要求を受理したResponseを受け取った時点でCall成功として扱う。

AF Process終了そのものの完了待ちを必須としない。

---

## 18. API Versioning

通常Callは最新Version Aliasを使用可能。

```text
/api/common/...
```

Version固定Clientでは指定Versionを使用する。

```text
/api/v1/common/...
```

旧Version ContractのBreaking Changeを共通JS側で吸収したことにして隠蔽しない。必要に応じVersion別Contract Adapterを明示的に分ける。

---

## 19. 禁止事項

- FrontendからAFへ直接fetchする実装を増やさない。
- 共通JSからGitHubへ直接通信しない。
- 共通JSからLocal Fileを直接操作しない。
- 共通JSからAF ProcessをKillしない。
- OS固有APIを持たせない。
- Runtime Dataを独自Fallback生成しない。
- AF API失敗時にGitHub等へ別経路Fallbackしない。
- 自動Retryを追加しない。
- Master Resolveを共通JSへ戻さない。
- AF Error Codeを文言で判定しない。
- `success:true` の場合に `errors` を無視しない。
- UI通知を共通JS責務にしない。
- 設計書にないEndpointを利用しない。

---

## 20. 実装完了条件

```text
✓ AF Client共通化
✓ Response Envelope Validation
✓ Timeout共通化
✓ Transport Error共通化
✓ Status Service
✓ Workout Service
✓ Sync Service
✓ Configuration Service
✓ Credential Service
✓ Shutdown Service
✓ API Version Alias対応
✓ Version固定余地
✓ loadRuntimeWorkoutSessions互換
✓ Frontendからの直接fetch排除
```