# Runtime Contract Matrix

Windows AF と Android AF は同じ入力状態に対して同じ Runtime contract を公開する。OS 固有差は credential 保護方式、local file path、native packaging に限定し、`/api/v1/common/status`、`/runtime/workouts`、`/sync` の product behavior 差は認めない。

## Status Inputs

| Input | Values | Contract |
|---|---|---|
| configuration | missing / available | missing は `CONFIGURATION_REQUIRED` を required action に追加し、readiness は `unconfigured`。 |
| credential | missing / invalid / expired / available | missing は `CREDENTIAL_REQUIRED` を required action に追加し、readiness は `unconfigured`。invalid/expired は configured runtime failure として credential component を `unavailable` にし、setup 未完了へ戻さない。 |
| remote retrieval | unknown / succeeded / failed / skipped | failed は GitHub component を `degraded` にする。LKG があれば fallback、なければ Runtime Data required。 |
| validation | unknown / succeeded / failed / skipped | failed は current fetched set を reject する。LKG があれば fallback、なければ Runtime Data required。 |
| LKG Runtime Data | absent / present | present は remote failure 時も current runtime を維持する。absent は normal app access を許可しない。 |
| Main Gym | unconfigured / configured / invalid | readiness には影響しない。Main Gym dependent metrics only の feature-level availability として扱う。 |
| unresolved Master reference | none / missing / deleted | Runtime warning として保持し、Workout は Runtime Data に採用する。単独では degraded/fallback/error を発火しない。 |

## Behavior Matrix

| Scenario | Runtime Data | Readiness | Components | `runtimeData.fallbackActive` | Required Actions | `/sync` result |
|---|---|---|---|---|---|---|
| configuration missing | current availability unchanged | `unconfigured` | configuration `unavailable` | `false` | `CONFIGURATION_REQUIRED` | skipped or rejected before remote access |
| credential missing | current availability unchanged | `unconfigured` | credential `unavailable` | `false` | `CREDENTIAL_REQUIRED` | skipped or rejected before remote access |
| credential invalid/expired, LKG present | LKG retained | `degraded` | credential `unavailable` | `false` | none unless runtime absent | failed credential/update or sync guard |
| credential invalid/expired, no LKG | absent | `unavailable` | credential `unavailable`, runtimeData `unavailable` | `false` | `RUNTIME_DATA_REQUIRED` when configured | failed credential/update or sync guard |
| remote success + validation success | new Runtime Data adopted | `ready` when no required action remains | github/runtimeData `available` | `false` | none | `success:true`, `degraded:false` |
| remote retrieval failed + LKG present | LKG retained | `degraded` | github `degraded`, runtimeData `available` | `true` | none | `success:false`, `degraded:true` |
| remote retrieval failed + no LKG | absent | `unavailable` after setup is complete | github `degraded`, runtimeData `unavailable` | `false` | `RUNTIME_DATA_REQUIRED` | `success:false`, no adopted runtime |
| validation failed + LKG present | LKG retained | `degraded` | github `available` or `degraded`, runtimeData `available` | `true` | none | `success:false`, `degraded:true` |
| validation failed + no LKG | absent | `unavailable` after setup is complete | runtimeData `unavailable` | `false` | `RUNTIME_DATA_REQUIRED` | `success:false`, no adopted runtime |
| unresolved Master missing/deleted only | new Runtime Data adopted with warnings | `ready` when other inputs are healthy | github/runtimeData `available` | `false` | none | `success:true`, `degraded:false`, warnings populated |
| Main Gym unconfigured only | Runtime Data adopted | `ready` when other inputs are healthy | github/runtimeData `available` | `false` | none | `success:true`, Main Gym metrics report feature-level `unconfigured` |

## Runtime Master Reference Assertions

- `resolved`: canonical Master ID and display fields are projected; no Master reference warning is emitted.
- `missing`: original raw ID is preserved in `resolution.originalId` and warning `originalId`; display projection uses `?`; Workout/session/set facts remain available.
- `deleted`: original raw ID is preserved, `resolution.resolvedId` is the deleted canonical ID when known, warning state is `deleted`; display projection uses `?`; body part classification does not infer a value.
- `source_ids`: raw Workout ID is not rewritten; Runtime output uses canonical Master ID with `resolution.originalId` retaining the raw ID.
- Later Master repair returns to `resolved` through normal sync/runtime rebuild without editing Raw Workout data.

## API Facts

`GET /status` must publish enough facts for shared frontend policy without platform-specific inference:

- `readiness.state`
- `readiness.requiredActions`
- `readiness.unavailableComponents`
- `readiness.degradedComponents`
- `runtimeData.currentAvailable`
- `runtimeData.latestRemoteRetrieval`
- `runtimeData.latestValidation`
- `runtimeData.fallbackActive`
- `requiredActions`

`GET /runtime/workouts` and `POST /sync` use warnings for unresolved Master references. Errors remain reserved for genuine validation, configuration, credential, network, or persistence failures.
