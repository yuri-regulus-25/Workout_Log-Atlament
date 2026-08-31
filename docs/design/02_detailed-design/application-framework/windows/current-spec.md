# Windows Application Framework 現行仕様

## Architecture

Windows AF は `src/application/windows/` 配下に実装される。

現行の主要 component:

- `Program.cs`
- `WindowsBootstrap.cs`
- `AtlamentMainForm.cs`
- `Host/AfHttpHost.cs`
- `Core/AfContracts.cs`
- `Core/AfModels.cs`
- `Core/AfServices.cs`

Shell は WebView2 を使用する Windows Forms application である。AF は localhost Kestrel HTTP server を起動し、その server 経由で frontend を load する。

## Runtime Roots

Windows は executable/runtime directory を root として使用する。Path provider は以下を定義する。

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

## Hosting

`AfHttpHost` は `127.0.0.1` で listen する。

Port order:

```text
14108
45194
```

Known app artifact name:

- portal root は `data/frontend/`
- `dashboard`
- `workouts`
- `machines`
- `analytics`
- `settings`
- `maintenance`

Dynamic route fallback は以下にのみ存在する。

- `/workouts/YYYY-MM-DD`
- `/machines/<id>`

Unknown API path は 404 を返し、frontend HTML へ fall through しない。Missing frontend artifact root は 503 を発生させる場合がある。

## API

Windows は以下を map する。

- `/api/v1/common/*`

[AF API Contract](../api-contract.md) を参照。

## Runtime Data

Windows は configured GitHub resource を fetch し、normalized runtime data を build し、validation 成功後に `runtime/current/runtime-data.json` へ write する。

Remote sync は required resource missing または technical validation failure の場合、current fetched set を reject する。以前の valid local runtime が存在する場合、application は degraded/local fallback mode で継続できる。Master reference が missing/deleted の場合は Runtime warning として報告し、session は Runtime Data として accept する。

Runtime readiness、fallback、required actions、unresolved Master reference の共通意味論は [Runtime Contract Matrix](../runtime-contract-matrix.md) を正とする。

## Resource Management API

Windows は `/api/v1/common/master-write/*` を Resource Management 用に公開する。`/master-write/documents/{type}` の GET は `runtime/current/runtime-data.json` 内の Local Master snapshot を返し、Remote Master body を表示用に独自 read しない。Local Master snapshot がない場合は `MASTER_SYNC_REQUIRED` を返す。

Write は Local Master snapshot revision と request `expectedRevision` の一致、candidate whole-master validation、Remote revision metadata の一致、GitHub Contents API PUT、Local Runtime Data rebuild を適用する。Runtime Data が参照中の Gym/Machine logical delete は許可し、Workout/raw/general Git write endpoint は公開しない。

## Configuration and Credential

Configuration は JSON であり non-secret である。

Credential は Windows protected data を使用し、`credential.dpapi` に分離して保存される。Credential API response は status のみを公開し、token value は公開しない。

## Logging

Windows logging は `data/logs/integrated.sqlite` の SQLite を使用する。Severe error は rotating text file にも write される場合がある。

## Version and Packaging

Windows version metadata は `src/application/windows/Atlament.csproj` に保存され、`src/version.json` と照合される。

`tools/build/build-windows.mjs` は frontend build を実行し、self-contained Windows x64 single-file executable を publish し、publish 時に frontend artifact を embed し、以下を作成する。

```text
dist-windows/Atlament-v<version>-win-x64/Atlament.exe
```

Installer generation は現行 source では実装されていない。
