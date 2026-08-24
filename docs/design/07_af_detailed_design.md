# Application Framework 詳細設計 — AF側

## 0. 文書目的

本書は Application Framework（以下 AF）の **AF側のみ** を対象とした詳細設計仕様である。

実装担当は、本書に記載されていない便利機能・Fallback・Cache・Retry・自動処理・抽象化を独自判断で追加してはならない。必要性を認識した場合は、実装せず仕様変更候補として提示すること。

対象外:

- Frontend Framework 内部実装
- 共通 JavaScript 内部実装
- UI Layout / Component Design
- Frontend Routing Design
- Chart 等の表示仕様

---

## 1. AF基本原則

AF は Application Runtime として以下を担当する。

```text
Application Framework
├─ Runtime Data 管理・提供
├─ GitHub SoT との同期
├─ Local Runtime Data 維持
├─ Credential 管理
├─ Configuration 管理
├─ Frontend Artifact 管理・Hosting
├─ localhost HTTP Server
├─ AF Health / Status 管理
├─ AF Lifecycle 管理
└─ Platform / OS 差異吸収
```

基本原則:

- GitHub を Workout / Master Data の SoT とする。
- GitHub 操作は Read Only。
- Remote 利用不能時は Local Runtime Data へ Fallback する。
- Runtime Data と Frontend Artifact を分離する。
- AF は Frontend Build を行わない。
- OS 固有差異を外部 HTTP Interface へ露出させない。
- Windows / Android で外部仕様を共通化する。
- 責務が異なる非OS依存処理は原則独立 Component / Module へ分割する。
- 保守性・障害調査容易性を Component 数の少なさより優先する。

---

## 2. Component構成

```text
AF
├─ Application / Orchestration
│  ├─ Common
│  ├─ Dashboard
│  ├─ Workout
│  ├─ Workout Detail
│  ├─ Performance Detail
│  └─ Analytics
├─ HTTP API
│  ├─ Common
│  ├─ Dashboard
│  ├─ Workout
│  ├─ Workout Detail
│  ├─ Performance Detail
│  └─ Analytics
├─ Operation State
├─ Configuration
├─ Health / Status
├─ Credential
├─ GitHub Access
├─ Runtime Data
├─ Runtime Data Format
├─ Runtime Data Storage
├─ Frontend Hosting
├─ Frontend Artifact Storage
├─ Log
└─ Platform / OS Adapter
   ├─ File System
   ├─ Secure Storage
   ├─ Configuration Storage
   ├─ HTTP Server
   └─ Process / Lifecycle
```

依存方向:

```text
HTTP API
   ↓
Application / Orchestration
   ↓
各 Domain Component
   ↓
Repository / Storage abstraction
   ↓
Platform / OS Adapter
```

逆方向依存は禁止する。

---

## 3. Application / Orchestration

各 Component を組み合わせて UseCase を成立させる責務のみを持つ。

主な UseCase:

- Startup
- Shutdown
- Startup Sync
- Manual Sync
- Configuration Update
- Credential Update
- Runtime Data Read
- Health / Status Read

Startup Sync と Manual Sync は同一 Remote Sync UseCase を利用する。

Orchestration は JSON Parse、File I/O、GitHub HTTP 通信、Credential 保存、Configuration 保存、OS 固有処理を直接実装しない。

---

## 4. Operation State

長時間処理または二重実行を許可しない処理を上位層で一元管理する。

状態:

```text
idle
running
completed
failed
```

主な Operation:

```text
startup
manualSync
configurationUpdate
credentialUpdate
shutdown
```

原則:

- 同一 Operation の二重実行は禁止。
- Remote 条件を書き換える Operation 同士は排他する。
- Sync 中の Runtime Data GET は許可する。
- GET 系 API は原則排他しない。
- Shutdown 開始後は新規 Operation を受け付けない。
- Operation 終了時は成功・失敗にかかわらず Running 状態を解除する。

Remote Operation Lock 対象:

- Manual Sync
- Repository / Resource Configuration Update
- Credential Update

---

## 5. Configuration

### 5.1 保存対象

非機密不揮発設定は Configuration として管理する。

- Repository Configuration
- Runtime / Resource Configuration
- Timeout Configuration
- その他 AF 設定

Credential は Configuration へ含めない。

### 5.2 保存方式

非機密 Configuration は JSON ファイルで保持する。

```text
configuration/
└─ af-settings.json
```

基本構造:

```json
{
  "schemaVersion": 1,
  "repository": {
    "owner": "",
    "repository": "",
    "ref": "main",
    "rootPath": ""
  },
  "resources": [],
  "timeouts": {
    "githubRequestTimeoutSec": 10,
    "syncOperationTimeoutSec": 60,
    "generalApiTimeoutSec": 30,
    "shutdownTimeoutSec": 10
  }
}
```

更新は Validation 後に Temporary File へ書込み、書込成功後に `af-settings.json` を安全に置換する。

破損 Configuration は自動初期化・自動修復しない。Parse / Schema Error 時は Configuration を unavailable、AF を degraded とし、起動継続する。

---

## 6. Timeout設定

すべて秒単位の正整数とする。

| 設定 | Default | Min | Max |
|---|---:|---:|---:|
| `githubRequestTimeoutSec` | 10 | 1 | 120 |
| `syncOperationTimeoutSec` | 60 | 5 | 600 |
| `generalApiTimeoutSec` | 30 | 1 | 120 |
| `shutdownTimeoutSec` | 10 | 1 | 60 |

GitHub Request Timeout と Sync 全体 Timeout は別設定とする。

Timeout 時に自動 Retry は行わない。

---

## 7. Resource Configuration

正式 Resource Type:

```text
WORKOUT
EXERCISE_MASTER
GYM_MASTER
```

Resource 定義:

```text
type
path
resourceKind
required
emptyAllowed
```

`resourceKind` は `file` / `directory` の2値。

推奨初期値:

```json
[
  {
    "type": "WORKOUT",
    "path": "workouts/",
    "resourceKind": "directory",
    "required": true,
    "emptyAllowed": false
  },
  {
    "type": "EXERCISE_MASTER",
    "path": "master/exercises.json",
    "resourceKind": "file",
    "required": true,
    "emptyAllowed": false
  },
  {
    "type": "GYM_MASTER",
    "path": "master/gyms.json",
    "resourceKind": "file",
    "required": true,
    "emptyAllowed": false
  }
]
```

Unknown Resource Type は `CONFIG_INVALID` として保存拒否する。実装者判断による Resource Type 追加は禁止する。

---

## 8. Credential

Credential:

- GitHub Token
- Token Limit Date

Token は Platform Secure Storage へ保存する。

```text
Credential
    ↓
Credential Repository
    ↓
Platform / Secure Storage
```

Token 値を HTTP API から取得可能にしてはならない。

Credential 状態:

```text
available
missing
invalid
expired
unknown
```

Token Limit Date 不在だけを理由に GitHub Access を禁止しない。

Credential 更新は Validate → Secure Storage 保存 → Credential State 更新で終了し、GitHub 導通確認は行わない。

Secure Storage 読込失敗等は Fatal とせず、Remote 利用不可 / Local Runtime Data 利用可能なら degraded で継続する。

---

## 9. GitHub Access

### 9.1 責務分割

```text
GitHub Access
├─ Access Service
├─ GitHub API Client
├─ Request Builder
├─ Response Parser
├─ GitHub Contract
└─ GitHub Error
```

GitHub API Client は Repository の意味を持たない。Request Builder が Configuration から Repository / Ref / Path を組み立てる。

### 9.2 通信仕様

- Read Only
- 自動 Retry なし
- Rate Limit 時の自動待機なし
- 定期 Polling なし
- 起動時1回 + Manual Sync のみ

代表 Error:

```text
GITHUB_UNAUTHORIZED
GITHUB_FORBIDDEN
GITHUB_RATE_LIMIT
GITHUB_RESOURCE_NOT_FOUND
GITHUB_CONNECTION_FAILED
GITHUB_TIMEOUT
GITHUB_SERVER_ERROR
```

独立した事前 Network Check は行わず、GitHub Access の実結果から判定する。

Repository 等の Remote Source 設定変更時のみ、保存後に GitHub 導通確認を行う。導通確認失敗でも Configuration 保存は成功として扱う。

---

## 10. Runtime Data Format

責務:

```text
Runtime Data Format
├─ Format Service
├─ Parser
├─ Serializer
├─ Syntax Validator
└─ Format Error
```

JSON / JSONL で Architecture Component を分割しない。実装クラス単位の分割は可。

---

## 11. Runtime Data

責務:

```text
Runtime Data
├─ Runtime Data Service
├─ Runtime Data Resolver
├─ Runtime Data Validator
├─ Runtime Data Model
└─ Runtime Data Error
```

AF は Raw Workout / Master を受け取り、Frontend から利用可能な正規化済み Runtime Data を生成する。

```text
Workout Raw Data
+
Exercise Master
+
Gym Master
↓
Master Resolve
↓
Normalized WorkoutSession[]
```

月間 Volume、Body Part Summary、Estimated 1RM 等の画面用集計は AF の責務ではない。

---

## 12. Master Resolve

AF は Master 参照を解決する。

Master 未登録は処理継続可能な異常とする。

例:

```text
2026-08-24 の new-machine が対応する情報がマスターにありません。
追加してください。
```

Master 未登録時に値を捏造しない。

```json
{
  "exercise_id": "new-machine",
  "name": null,
  "body_part": null
}
```

Gym も同様に `id` は保持し、`name` / `short_name` は null とする。

---

## 13. Runtime Validation

### 正常

Runtime として利用可能、異常情報なし。

### 利用可能 + Error情報あり

例:

- Master未登録
- Optional情報不足

Runtime は利用可能で Local 更新も可能。API では `success:true` かつ `errors` 非空で返却可能。

### Invalid

例:

- JSON / JSONL Syntax Error
- 必須 ID 欠落
- 型不正
- 必須構造欠落
- Empty 禁止 Resource が空
- Runtime として復元不能

Sync Set 全体を Reject する。Partial Updateは禁止。

---

## 14. Remote Sync

```text
Remote Sync
↓
必要 Resource をすべて取得
↓
Parse
↓
Technical Validation
↓
Master Resolve
↓
Runtime Data 生成
↓
Temporary へ保存
↓
全体成立確認
↓
current を安全に置換
```

1件でも Invalid または必須 Resource 取得失敗があれば Sync Set 全体を Rejectし、current を更新せず既存 current を維持する。

Master 未登録等、利用可能な Error のみの場合は更新可能。

---

## 15. Local Runtime Data

論理構造:

```text
runtime/
├─ current/
└─ temporary/
```

GitHub の論理 Directory 構造を基準とする。Platform ごとの物理 Root 差異のみ Adapter で吸収する。

利用可能条件:

- current が存在する
- required Resource がすべて存在する
- Empty禁止 Resource が空でない
- Syntax 正常
- Runtime Contract 正常
- Invalid がない

Master 未登録は利用可能。Local も Remote と同一 Validation Pipeline を通す。

---

## 16. Temporary

Temporary は作業領域であり Fallback / Backup には使用しない。

```text
AF起動時       → Clear
Sync開始時     → Create / Empty確認
Sync成功       → Clear
Sync失敗       → Clear
異常終了       → 残存可
次回起動       → 無条件Clear
```

起動時に Temporary 内容を Resume・Validation・復旧利用してはならない。

---

## 17. Backup / Rollback

恒久 Backup を作成しない。明示 Rollback 機能も持たない。

更新失敗時は `current` を更新しないことで既存 Runtime を保全する。

Platform 上で Atomic Replace 実現のため一時退避が必要な場合のみ、Platform 内部実装として許可する。

---

## 18. Frontend Artifact Storage

論理配置:

```text
artifacts/
├─ portal/
├─ dashboard/
├─ workouts/
├─ exercises/
├─ analytics/
└─ settings/
```

Settings は SolidJS Build Artifact とする。

AF は Artifact を Build しない。Artifact Download、自動更新、GitHub からの Artifact 取得、Version 管理、Hot Reload、起動中差替え検知は行わない。

---

## 19. Artifact欠落

Application必須 Artifact 欠落は Fatal → Unified Shutdown。

個別画面 Artifact 欠落は Error とし、該当 Component を unavailable、Application を degraded とする。他画面 Hosting は継続する。

---

## 20. Frontend Hosting

Routes:

```text
/             Portal
/dashboard/   React
/workouts/    Vue
/exercises/   Angular
/analytics/   Svelte
/settings/    SolidJS
```

`/api/...` は HTTP API を優先する。

存在する Artifact 領域内でファイル欠落は HTTP 404、Artifact 領域自体が unavailable の場合は HTTP 503。

任意 Path を `index.html` に戻す SPA Fallback を AF が勝手に実装しない。

---

## 21. localhost HTTP Server

Bind は `127.0.0.1 / localhost only`。

Port:

```text
Primary   14108
Secondary 45194
```

14108 の bind に失敗した場合のみ 45194 を試す。両方失敗時は Fatal → Unified Shutdown。

それ以外の空 Port を動的探索してはならない。

---

## 22. HTTP Response共通形式

全 API:

```json
{
  "success": true,
  "errors": [],
  "data": null
}
```

意味:

- `success`: API Operation そのものの成否
- `errors`: Operation 中に検出されたユーザー通知対象の異常情報
- `data`: 正常に提供可能な結果

`success:true` かつ `errors` 非空かつ `data` 利用可能、を許容する。

Error:

```json
{
  "code": "GITHUB_TIMEOUT",
  "message": "GitHub access timed out.",
  "recoverable": true
}
```

内部 StackTrace / Exception をそのまま Response へ返してはならない。

---

## 23. HTTP Status基本方針

```text
200 Request成立・処理完了
400 Request不正
404 Endpoint / Resourceなし
409 Operation競合
500 AF内部想定外Error
503 一時的利用不能
```

Local Fallback 成立等、要求された機能が成立している場合は `200 + success:true` を許容する。

---

## 24. API Versioning

Version指定時は `/api/v1/...` のように指定Versionを使用する。

Version省略 `/api/common/...` は AF が提供する最新 API Version への Alias とする。

Breaking Change は新 Version として追加し、既存 Version の Contract を Breaking 変更してはならない。

初期 Version は `v1`。

---

## 25. API一覧 v1

```text
GET  /api/v1/common/status
GET  /api/v1/common/runtime/workouts
POST /api/v1/common/sync
GET  /api/v1/common/configuration
POST /api/v1/common/configuration
GET  /api/v1/common/credential/status
POST /api/v1/common/credential
POST /api/v1/common/shutdown
```

Version省略 Alias `/api/common/...` も同一機能を提供する。

画面別 API Namespace は Architecture 上存在してよいが、必要 Endpoint がない限り空でよい。

---

## 26. Status API

`GET /api/v1/common/status`

返却例:

```json
{
  "success": true,
  "errors": [],
  "data": {
    "version": "1.0.0",
    "application": {
      "status": "ready",
      "degraded": false,
      "acceptingRequests": true
    },
    "operations": {
      "startup": "completed",
      "manualSync": "idle",
      "configurationUpdate": "idle",
      "credentialUpdate": "idle",
      "shutdown": "idle"
    },
    "components": {
      "configuration": "available",
      "credential": "available",
      "github": "available",
      "runtimeData": "available",
      "hosting": {
        "portal": "available",
        "dashboard": "available",
        "workouts": "available",
        "exercises": "available",
        "analytics": "available",
        "settings": "available"
      }
    },
    "requiredActions": []
  }
}
```

Status API 呼出時に Component を再Checkしたり GitHub へアクセスしてはならない。保持中の現在状態のみ返す。

Status State:

```text
Application: starting / ready / degraded / stopping / failed
Component: unknown / available / unavailable / degraded
Operation: idle / running / completed / failed
```

設定不足等は `requiredActions` で表現する。

---

## 27. Runtime Workout API

`GET /api/v1/common/runtime/workouts`

正規化済み WorkoutSession 集合を返す。

```json
{
  "success": true,
  "errors": [],
  "data": {
    "sessions": []
  }
}
```

Master 未登録等が存在する場合も `success:true` とし、`errors` に通知対象異常を格納する。画面向け集計済み Data は返さない。

---

## 28. Manual Sync API

`POST /api/v1/common/sync`

Request Body なし。

成功:

```json
{
  "success": true,
  "errors": [],
  "data": {
    "source": "remote",
    "updated": true,
    "degraded": false
  }
}
```

Remote失敗 + Local利用:

```json
{
  "success": true,
  "errors": [
    {
      "code": "GITHUB_TIMEOUT",
      "message": "GitHub access timed out.",
      "recoverable": true
    }
  ],
  "data": {
    "source": "local",
    "updated": false,
    "degraded": true
  }
}
```

同一 Sync 実行中は HTTP 409 / `success:false` / `OPERATION_ALREADY_RUNNING`。

---

## 29. Configuration API

### GET

`GET /api/v1/common/configuration`

Token 等 Credential は含めない。

### POST

`POST /api/v1/common/configuration`

Partial Update を許可する。

Repository / Resource 取得先情報変更時のみ、保存後に GitHub 導通確認を行う。導通失敗でも設定保存は Rollback しない。

---

## 30. Credential API

### Status

`GET /api/v1/common/credential/status`

Token 値は返さない。

```json
{
  "success": true,
  "errors": [],
  "data": {
    "configured": true,
    "state": "available",
    "limitDate": "2026-12-31"
  }
}
```

### Update

`POST /api/v1/common/credential`

```json
{
  "token": "...",
  "limitDate": "2026-12-31"
}
```

保存時に GitHub Access は行わない。

---

## 31. Shutdown API

`POST /api/v1/common/shutdown`

Shutdown開始を受理した時点で Response を返す。

```json
{
  "success": true,
  "errors": [],
  "data": {
    "accepted": true,
    "alreadyShuttingDown": false
  }
}
```

Shutdown中に再度呼ばれても冪等扱いする。

---

## 32. Startup Sequence

```text
AF Process Start
↓
Single Instance Check
↓
Platform Initialization
↓
Configuration Load / Validate
↓
Credential Load / Validate
↓
Self Health Check
↓
HTTP Server Start
↓
Frontend Hosting Start
↓
Startup Remote Sync
↓
Runtime Status Determine
↓
Ready / Degraded
```

Remote Sync 完了前でも HTTP / Hosting を可能な限り先に利用可能とする。

Configuration不足、Credential不足、GitHub利用不能、Remote取得失敗、Local Runtime Dataなし、一部Frontend Artifact欠落は起動継続可能。

Platform / HTTP Server初期化不能や Application 必須 Artifact 欠落等のみ Fatal。

---

## 33. Self Health Check

Fatal Check:

- Platform 必須機能
- AF 内部初期化
- 必須 Storage
- Application 必須 Artifact

Non-Fatal Check:

- Configuration
- Credential
- Local Runtime Data
- 各 Component 状態

Self Health Check 自身は修復を行わない。

---

## 34. Local Fallback

```text
Remote取得不能
↓
Local current確認
↓
同一Validation Pipeline
├─ Valid → Local利用
└─ Invalid → Runtime Data unavailable
```

Local なし + Remote 失敗でも AF 自体は Fatal にしない。Runtime Data unavailable / AF degraded とし、Settings / Portal / HTTP Server は継続する。

---

## 35. Shutdown

全終了経路を一本化する。

```text
Form Close
API Shutdown Request
Startup Failure
Fatal Error
Host / OS終了要求
        ↓
Unified Shutdown
```

Shutdown は冪等。

各 Resource は起動済みなら Close / Dispose、未起動または終了済みなら Skip。

Cleanup 1件失敗でも残りの Cleanup を継続する。

---

## 36. Single Instance

AF 自身が多重起動を検出する。

```text
AF Start
↓
Single Instance Check
├─ Existingなし → 起動継続
└─ Existingあり → 後発Instanceが自己終了
```

既存 Instance を Kill してはならない。

---

## 37. Windows / WinForms境界

WinForms は AF Common ではなく Host / Platform 側。

```text
Windows AF Host
├─ WinForms UI
└─ Windows Bootstrap
        ↓
AF Common
        ↓
Platform Contract
        ↓
Windows Platform
```

WinForms から Runtime Data Read、GitHub Access、Credential管理、Configuration論理処理を直接行わない。

---

## 38. Android互換性

Common Layer へ Windows / Android 固有 API を持ち込まない。

Windows / Android 差異は Platform Adapter へ隔離する。

---

## 39. Log

Log は3系統。

```text
Integrated → INFO / WARN / ERROR / FATAL
Error      → ERRORのみ
Fatal      → FATALのみ
```

共通 Log Record:

```text
date
type
endpoint
detail
```

`date` は ISO 8601 DateTime。

### Windows

```text
logs/
├─ integrated.sqlite
├─ error
└─ fatal_error
```

`integrated.sqlite` は SQLite とし、AF初期起動時に不存在なら生成。保持期間は672時間。

`error` / `fatal_error` は拡張子なし Text File。対象Error発生時に不存在なら生成、存在時は追記。ファイル生成から24時間経過でDeleteする。

### Android

Application 固有 SQLite Database を利用する。論理的には Integrated / Error / Fatal を分離し、保持期間は672時間。

Log保存失敗は Fatal にしない。

---

## 40. 日付・時刻仕様

```text
Date      : YYYY-MM-DD
DateTime  : ISO 8601
Duration  : seconds
```

---

## 41. Error設計

Error は Fatal / Error / 継続可能異常に分類し、外部 Contract では `recoverable:true/false` を持つ。

Error Code 命名は `{DOMAIN}_{ERROR_NAME}`。

代表:

```text
COMMON_INTERNAL_ERROR
OPERATION_ALREADY_RUNNING
CONFIG_REQUIRED
CONFIG_INVALID
CONFIG_SAVE_FAILED
CREDENTIAL_REQUIRED
CREDENTIAL_INVALID
CREDENTIAL_SAVE_FAILED
GITHUB_UNAUTHORIZED
GITHUB_FORBIDDEN
GITHUB_RATE_LIMIT
GITHUB_RESOURCE_NOT_FOUND
GITHUB_CONNECTION_FAILED
GITHUB_TIMEOUT
GITHUB_SERVER_ERROR
RUNTIME_DATA_INVALID
RUNTIME_DATA_EMPTY
RUNTIME_DATA_UNAVAILABLE
RUNTIME_DATA_UPDATE_FAILED
MASTER_EXERCISE_NOT_FOUND
MASTER_GYM_NOT_FOUND
HOSTING_ARTIFACT_NOT_FOUND
HOSTING_START_FAILED
HTTP_PORT_UNAVAILABLE
HTTP_SERVER_START_FAILED
STORAGE_READ_FAILED
STORAGE_WRITE_FAILED
SHUTDOWN_FAILED
```

実装者判断による Error Code 乱立は禁止。

---

## 42. 禁止事項

少なくとも以下を禁止する。

- Frontend Build を AF Runtime で実行する。
- Runtime Data を Frontend Artifact へ埋め込む。
- Runtime Data 変更を理由に Frontend Rebuild する。
- Runtime で npm / Node / Frontend Framework CLI を実行する。
- Runtime Data をソースコードへ固定化する。
- INVALID Data で current を上書きする。
- Remote Sync を Partial Update する。
- 恒久 Backup / 手動 Rollback を追加する。
- Temporary を Fallback / Recovery に使用する。
- GitHub Write / Commit / Push / Delete を行う。
- 自動 Retry / 定期同期を追加する。
- 起動時1回 + Manual Sync 以外の同期 Trigger を追加する。
- Frontend から GitHub へ直接通信する。
- Frontend から AF 管理 Local Resource を直接操作する。
- Common Layer へ OS 固有実装を混入する。
- AF へ画面描画・Routing・画面 State 責務を追加する。
- AF へ画面用集計処理を追加する。
- localhost 以外へ bind する。
- Primary / Secondary 以外の Port を動的探索する。
- Token を API Response へ出力する。
- StackTrace を API Response へ直接出力する。
- OS ごとに API Contract を変更する。
- 既存 AF Instance を後発 Instance から Kill する。
- Shutdown 経路を重複実装する。
- Cleanup 1件失敗で Shutdown 全体を停止する。
- Master未登録を Fatal にする。
- Master未登録値を捏造補完する。
- Log書込失敗を Fatal にする。
- 設計書にない Cache / Fallback / Convenience Feature / Endpoint / Resource Type を追加する。

---

## 43. AF実装完了条件

最低限、以下を満たすこと。

```text
✓ Single Instance
✓ localhost 14108 / 45194
✓ Configuration永続化
✓ Secure Credential管理
✓ GitHub Read Only
✓ 起動時Sync
✓ Manual Sync
✓ Remote → Local Fallback
✓ Sync Set Atomic Update
✓ Master Resolve
✓ Runtime Validation
✓ Workout Runtime API
✓ Status API
✓ Configuration API
✓ Credential API
✓ Shutdown API
✓ API v1 + Latest Alias
✓ Frontend Artifact Hosting
✓ Partial Artifact Failure対応
✓ Unified Shutdown
✓ Windows Logging
✓ OS依存処理隔離
```
