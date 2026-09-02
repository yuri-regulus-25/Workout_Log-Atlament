# Windows Application Framework 現行仕様と設計方針

## Architecture

Windows AF は `src/application/windows/` 配下に実装する。

現行主要 component:

- `Program.cs`
- `WindowsBootstrap.cs`
- `AtlamentMainForm.cs`
- `Host/AfHttpHost.cs`
- `Core/AfContracts.cs`
- `Core/AfModels.cs`
- `Core/AfServices.cs`

Shell は WebView2 を使用する Windows Forms application である。AF は localhost Kestrel HTTP server を起動し、その server 経由で Frontend を読み込む。

## Platform Boundary

Windows 固有実装は、OS / Native runtime に依存する責務へ限定する。

Windows 固有でよい例:

- WebView2 / Windows Forms lifecycle
- Kestrel host wiring
- Windows application-data root の解決
- DPAPI credential protection
- Windows filesystem atomic primitive
- Windows packaging

Resource Inspection、Runtime 採用規則、Recovery state transition、Validation、API DTO / error semantics、Git write policy 等は Windows 独自仕様にせず共通契約へ従う。

## Runtime Roots

現行 Windows は executable / runtime directory を物理 root として使用する。

```text
data/
├─ frontend/
├─ configuration/
│  ├─ af-settings.json
│  └─ credential.dpapi
├─ runtime/
│  ├─ current/
│  │  └─ runtime-data.json
│  └─ temporary/
└─ logs/
```

v2.1.0 Recovery Draft は native application-data に保存する。論理パスは Platform 共通で次を基準とする。

```text
recovery/drafts/{resourceKey}.json
```

物理 root の差異は Storage Adapter が解決する。

## Hosting

`AfHttpHost` は `127.0.0.1` で listen する。

Port order:

```text
14108
45194
```

Known app artifact:

- portal root: `data/frontend/`
- `dashboard`
- `workouts`
- `machines`
- `analytics`
- `settings`
- `maintenance`

Dynamic route fallback:

- `/workouts/YYYY-MM-DD`
- `/machines/<id>`

Unknown API path は 404。Frontend HTML へ fall through しない。

## API

Windows は `/api/v1/common/*` を公開する。[AF API Contract](../api-contract.md) を正とする。

v2.1.0 では `/api/v1/common/recovery/*` を同じ契約で提供する。

## Runtime Data

Windows は configured GitHub Resource を取得し、Inspection / Validation / normalization 後に Runtime Data を構築する。

v2.1.0 以降:

- Broken Workout Resource は Resource 単位で隔離する。
- 他の Workout Resource は継続採用できる。
- Broken Master Resource は新 Runtime adoption を停止する。
- whole-runtime LKG があれば fallback、なければ unavailable。
- unresolved Master reference 単独では fallback を発火しない。
- Workout Resource 0 件を正常な初期状態として扱う変更は v2.2.0 で反映する。

共通意味論は [Runtime Contract Matrix](../runtime-contract-matrix.md) を正とする。

## Resource Management API

Windows は `/api/v1/common/master-write/*` を Resource Management 用に公開する。

GET は Local Master snapshot を使用し、表示目的で Remote Master body を独自取得しない。Write は revision、whole-master validation、Remote revision を確認し、用途限定 Git write を行う。

Raw Workout / Generic Git write endpoint は公開しない。

## Recovery

Recovery の orchestration は責務ごとに分離し、巨大な AF service へ集約しない。

Windows は `/api/v1/common/recovery/*` を Maintenance Recovery UI 用に公開する。Recovery inventory/detail/source/draft/validate/commit は Workout Broken Resource を対象に、AF-local draft store、whole Resource validation、GitHub optimistic concurrency、same-path Contents API write、path relocation の atomic Git Data API commit を通す。

Successful Recovery commit 後は sync/reinspect/runtime rebuild/reflection を試行し、draft を削除する。Git commit 成功後に runtime reflection が失敗した場合は rollback や blind recommit を行わず、`RECOVERY_REFLECTION_FAILED` と reflection result で区別する。

Status は `runtimeData.quarantinedWorkoutResourceCount` と `recovery.*` facts を公開する。Workout quarantine は Runtime usable + readiness degraded であり、whole-runtime LKG fallback の `fallbackActive` とは別事象である。

論理責務:

```text
ResourceInspector
RecoveryService
RecoveryDraftStore
RecoveryValidator
RecoveryReplacementBuilder
RecoveryGitWriter
Sync / RuntimeBuilder
```

`RecoveryService` は orchestration を担当し、schema engine、Git primitive、filesystem primitive を自身へ重複実装しない。

`RecoveryReplacementBuilder` は通常 Domain model と canonical serializer を使用する。

`RecoveryGitWriter` のみが Recovery 用 Git write primitive を知る。Same-path replacement と path relocation の Git primitive が異なっても、上位 Recovery contract は変えない。

## Configuration / Credential

Configuration は non-secret JSON。`required` / `emptyAllowed` を利用者設定から廃止する方針は [AF API Contract](../api-contract.md) に従う。

Credential は Windows protected data を使用し、現行では `credential.dpapi` に分離保存する。API response は status のみを公開し token value は返さない。

## Logging

Windows logging は現行 `data/logs/integrated.sqlite` を使用する。Severe error は rotating text file にも書き込まれる場合がある。

Logging infrastructure の Platform 差異は正当な理由があれば許容するが、API error code や Domain semantics を Log 実装差へ引きずらない。

## Version / Packaging

Windows version metadata は `src/application/windows/Atlament.csproj` に保存し、`src/version.json` と照合する。

`tools/build/build-windows.mjs` は Frontend build、self-contained Windows x64 single-file publish、Frontend artifact embed を行い、次を生成する。

```text
dist-windows/Atlament-v<version>-win-x64/Atlament.exe
```

Installer generation は現行 source では未実装。
