# HTTP API I/O 現行仕様と設計方針

Atlament は Frontend application と Native / Application Runtime の境界として localhost HTTP を使用する。

## Hosts

Native runtime は `127.0.0.1` のみに bind する。

Port order:

```text
14108
45194
```

Development runtime:

```text
127.0.0.1:5180
```

Development gateway:

```text
127.0.0.1:5173
```

## API Routes

Current API route は [AF API Contract](../application-framework/api-contract.md) に記述する。

Frontend code は versioned `/api/v1/common/*` path を使用する。

Node development runtime は versioned AF API の read-only subset を実装する。

- status
- runtime workouts
- legacy workout data endpoint

`/api/workout-data` は Frontend dev server / preview fallback 用 endpoint であり、Native AF production contract には含めない。

## Frontend Asset Routes

Production / preview hosting は以下を serve する。

- `/`
- `/dashboard/`
- `/workouts/`
- `/workouts/YYYY-MM-DD`
- `/machines/`
- `/machines/<id>`
- `/analytics/`
- `/settings/`
- `/404.html`
- `/500.html`
- `/503.html`

Unknown nested frontend path は通常 Application index page へ自動 rewrite しない。現行 dynamic fallback は Workout と Performance Detail route に限定される。

## HTTP Status の共通意味

Windows / Android は同じ API 契約に対して同じ HTTP status semantics を使用する。

- 200: API operation 自体が正常に完了した。Domain 上の判定結果が「許可不可」「検証NG」であっても、判定処理そのものが成功した場合を含み得る。
- 400: request の形式・入力が API contract を満たさない。
- 404: endpoint、対象 Resource、または Frontend route が存在しない。
- 405: 既知 route に対して HTTP method が許可されない。
- 409: revision / draft / write 等の競合。
- 500: AF 内部の予期しない失敗。
- 503: Runtime、外部接続、依存機能等が一時的に利用できず operation を完了できない。

### Unknown API route

現行 Android 実装には unknown API route を 501 とする差異があるが、存在しない endpoint は **404** に統一する。

501 は「endpoint は認識されているが、その機能が実装されていない」意味に限定し、unknown route の代用には使用しない。

### Operation success と Domain result

HTTP success と Domain 上の許可結果を混同しない。

Recovery validation を例にすると、candidate の検証が正常に完了し、結果として Broken のままで `commitAllowed=false` になった場合は HTTP 200 の正常な validation result である。

一方、request malformed は 400、対象 Resource 不在は 404、revision / concurrency conflict は 409、validator 自体や依存機能が利用不能なら 500 / 503 等、失敗原因に対応する status を使用する。

この意味論を Windows / Android / Development Runtime / shared client の共通契約として扱う。
