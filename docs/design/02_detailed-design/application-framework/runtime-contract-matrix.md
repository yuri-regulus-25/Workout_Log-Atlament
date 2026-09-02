# Runtime Contract Matrix

Windows AF と Android AF は同じ入力状態に対して同じ Runtime contract を公開する。Platform 差異は OS に依存する Adapter 境界へ閉じ込め、`/api/v1/common/status`、`/runtime/workouts`、`/sync` の product behavior 差は認めない。

## 判定レイヤー

Runtime 採用可否を 1 つの「validation success / failure」だけで表現しない。少なくとも以下を区別する。

1. **Resource 構造検証**: file / JSON / JSONL / required field 等が安全に解釈できるか。
2. **Record 検証**: Resource 内の個々の Domain record が有効か。
3. **Repository / Domain 整合性**: Master reference、identity、Main Gym 等の横断規則を満たすか。
4. **Runtime 採用判断**: Resource Health と Resource Type に応じて、採用・隔離・LKG fallback・unavailable を決定する。

v2.1.0 では Workout の隔離単位は **Resource**、Master Broken 時の fallback 単位は **whole Runtime** とする。v2.2.0 で Master partial acceptance を導入する場合、Master の検証・隔離単位は Record へ細分化できるが、Recovery の Git write 単位は Resource のままとする。

## Resource Health

```text
healthy
  安全に Runtime へ採用できる。

degraded
  採用可能だが確認事項がある。

broken
  安全に採用できない。
```

Health の集約優先順位は `broken > degraded > healthy` とする。

Unresolved Master reference は Runtime warning であり、それ単独では Resource Health を Broken にせず、Runtime fallback も発火しない。

## Status Inputs

| Input | Values | Contract |
|---|---|---|
| configuration | missing / available | missing は `CONFIGURATION_REQUIRED` を required action に追加し、readiness は `unconfigured`。 |
| credential | missing / invalid / expired / available | missing は `CREDENTIAL_REQUIRED` を追加し `unconfigured`。invalid / expired は configured runtime failure として扱い、setup 未完了へ戻さない。 |
| remote retrieval | unknown / succeeded / failed / skipped | failed 時、利用可能な LKG があれば fallback、なければ Runtime Data required。 |
| Resource inspection | healthy / degraded / broken | Resource Type ごとの採用規則を適用する。 |
| LKG Runtime Data | absent / present | whole-runtime fallback が必要な場合にのみ使用する。 |
| Workout Resource count | zero / one-or-more | zero は v2.2.0 以降、正常な初期状態として `sessions=[]` を生成する。空 file の意味ではない。 |
| Main Gym | unconfigured / configured / invalid | readiness には影響しない。Main Gym dependent metrics の feature-level availability とする。 |
| unresolved Master reference | none / missing / deleted | Runtime warning として保持し、Workout は採用する。単独では fallback / unavailable を発火しない。 |

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
| Broken Workout Resource only | Runtime Data adopted from other Healthy/Degraded Workout Resources; Broken Resource quarantined as a whole | `degraded` | runtimeData `degraded` | `false` | none | `success:true`, `degraded:true`, Broken count surfaced |
| all Workout Resources Broken | Broken Resource を隔離した結果 `sessions=[]` | `degraded` | runtimeData `degraded` | `false` | Recovery を案内。Runtime 自体は利用可能 | sync 自体は完了可能 |
| Broken Master with LKG | LKG retained; new current Runtime not adopted | `degraded` | runtimeData `available` or `degraded` | `true` | none | `success:false`, `degraded:true` |
| Broken Master without LKG | absent | `unavailable` after setup is complete | runtimeData `unavailable` | `false` | `RUNTIME_DATA_REQUIRED` | `success:false`, no adopted runtime |
| Workout Resource count 0 | `sessions=[]` | `ready` when other inputs are healthy | github/runtimeData `available` | `false` | none | `success:true`, `degraded:false` |
| Master invalid/excluded Record only | valid Master Record と Workout facts を採用し、除外 Record 参照は warning として保持 | `ready` when other inputs are healthy | github/runtimeData `available` | `false` | none | `success:true`, `degraded:false`, warnings populated |
| Degraded Resource only | Resource adopted with warning | `ready` when other inputs are healthy | github/runtimeData `available` | `false` | none | `success:true`, `degraded:false`, warnings populated |
 
### Broken Workout と空状態の違い

Workout Resource 0 件は正常な初期状態である。一方、存在する Workout Resource が Broken で隔離された結果 Session 0 件になった場合は、利用可能な Runtime が空であっても `degraded` と Broken Resource facts を保持する。

したがって Frontend は `sessions.length === 0` だけから「初期状態」か「隔離結果」かを推測しない。

## Master Partial Acceptance への拡張

v2.2.0 で structurally parseable な Master Resource の partial acceptance を導入する場合:

- Resource 構造自体を安全に解釈できない場合は Resource Broken のまま。
- 構造を解釈できる場合、Record validation を個別に行える。
- 有効 Record は Runtime へ採用し、無効 Record は除外できる。
- 除外 Record を参照する Workout は、理由を失わず unresolved として扱う。
- `missing`、`deleted`、`invalid/excluded` は内部 facts として区別可能にする。UI が同一警告表現を使うことは妨げない。
- Recovery commit / Git replacement の単位は引き続き whole Resource。

Workout record の partial acceptance は v2.2.0 の対象外とする。

## Runtime Master Reference Assertions

- `resolved`: canonical Master ID と表示 field を projection する。
- `missing`: raw ID を `resolution.originalId` と warning に保持し、表示 projection は `?`。Workout facts は保持する。
- `deleted`: original ID と、既知なら deleted canonical ID を保持する。body part を推論しない。
- `invalid/excluded`: 将来 Master partial acceptance で除外された Record を参照したことを内部的に識別可能にする。
- `source_ids`: raw Workout ID は書き換えず、Runtime output は canonical Master ID、`resolution.originalId` は raw ID を保持する。
- Master repair 後は Raw Workout を編集せず、通常 sync / Runtime rebuild で `resolved` に戻る。

## API Facts

`GET /status` は Frontend が Platform 固有推論をせず判断できる facts を公開する。

- `readiness.state`
- `readiness.requiredActions`
- `readiness.unavailableComponents`
- `readiness.degradedComponents`
- `runtimeData.currentAvailable`
- `runtimeData.latestRemoteRetrieval`
- `runtimeData.latestValidation`
- `runtimeData.fallbackActive`
- `runtimeData.quarantinedWorkoutResourceCount`
- `recovery.brokenResourceCount`
- `recovery.brokenWorkoutResourceCount`
- `recovery.brokenMasterResourceCount`
- `recovery.recoverableResourceCount`
- `recovery.activeDraftCount`
- `requiredActions`

既存 facts に加え、v2.1.0 では少なくとも次の Recovery / quarantine facts を公開する。

```text
brokenResourceCount
brokenWorkoutResourceCount
brokenMasterResourceCount
recoverableResourceCount
activeDraftCount
quarantinedWorkoutResourceCount
```

配置する DTO は API Contract で定義する。Frontend は message 文言や Session 数からこれらを再計算しない。

`RUNTIME_DATA_REQUIRED` は Runtime が本当に利用不能な場合にのみ使用する。Broken Workout Resource が存在しても、隔離後 Runtime が利用可能なら required action にしない。
