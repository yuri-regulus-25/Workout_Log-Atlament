# HTTP API I/O 現行仕様

Atlament は frontend application と native/application runtime の boundary として localhost HTTP を使用する。

## Hosts

Native runtime は `127.0.0.1` のみに bind する。

Port order:

```text
14108
45194
```

Development runtime uses:

```text
127.0.0.1:5180
```

Development gateway uses:

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

`/api/workout-data` は frontend dev server / preview fallback 用 endpoint であり、native AF production contract には含めない。

## Frontend Asset Routes

Production/preview hosting は以下を serve する。

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

Unknown nested frontend path は通常 application index page へ rewrite されない。現行 dynamic fallback は Workout と Performance Detail route に限定される。

## HTTP Status Meaning

現行 code は以下を使用する。

- 200: successful API call および successful asset response
- 400: invalid update request
- 404: unknown API/resource または unknown frontend route
- 405: Android asset serving における non-GET frontend request
- 409: operation conflict
- 500: internal error
- 501: unknown Android API route
- 503: runtime data unavailable または frontend artifact unavailable
