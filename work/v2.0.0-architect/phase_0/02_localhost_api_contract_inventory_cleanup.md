# v2.0.0 Phase 0-B — Localhost API Contract Inventory & Cleanup

## 日本語

### 目的
v2.0.0 で全画面および新規 Application に変更を加える前に、Frontend ↔ AF 間の `127.0.0.1` localhost API を全件棚卸しし、現在利用されている Contract のみに整理する。

API を古いという理由だけで閉じない。Consumer から逆引きして利用実態を確認し、未使用 Response field を削除し、結果として利用価値を持たなくなった Endpoint のみを Close する。

### 対象
- Windows AF localhost API
- Android AF localhost API
- Development Runtime / Gateway の対応 Contract
- 全 Frontend Application
- Frontend shared/common module
- API response を利用する表示、計算、状態判定、制御、Navigation、Error handling 等
- Legacy endpoint
- Tests / fixtures / mocks
- `docs/design` の API / I/O / Application Framework 関連仕様

GitHub API は本棚卸しの主対象外とする。ただし localhost API が GitHub 取得結果を公開する場合、その Response contract の利用状況は対象とする。将来の GitHub Master Write は Phase 0-B の実装対象ではない。

### 棚卸し方法
全 localhost Endpoint について以下を追跡する。

`Endpoint → Request → Response field → Consumer → Usage`

Response は top-level field だけでなく、必要に応じて nested field まで field 単位で追跡する。

Consumer は直接参照だけでなく、normalize、shared state、helper、core、selector 等を経由する間接利用も追跡する。単純な文字列 grep のみで未使用判定しない。

### 削除ルール
- Response field が 1 箇所以上で実利用されている: Keep
- Response field の実利用が 0 件: Delete
- 表示されなくても計算・状態判定・制御等に使われる: Keep
- Shared/Core 等を経由して間接利用される: Keep
- Windows / Android の片方だけで必要でも現行仕様上必要: Keep
- Test だけが参照する field: Production consumer と分離して評価し、Test の存在だけを Keep 根拠にしない
- Response field を整理した結果、Endpoint が現行 Application に提供すべき有効な Response / side effect / control responsibility を持たない: Endpoint を Close
- Legacy endpoint も例外扱いせず同一基準で評価する

### Platform Contract Drift
同一 API について Windows / Android / Development Runtime の以下を比較する。

- Route
- HTTP method
- Request
- Response
- Field name / type / nullability
- HTTP status
- Error code
- Behavior

意図しない差異は Contract Drift として検出し、現行要件に基づいて統一する。Platform 固有差異として必要なものは理由を明文化する。

### Phase 0-A との関係
Phase 0-A の `Exercise → Machine` migration に伴い API route / request / response / type を変更する場合、本棚卸し結果を反映した最小 Contract に対して Machine terminology を適用する。

二重作業や legacy terminology の再導入を避けるため、Phase 0-A / 0-B の変更順序と統合方法を実装前に確認する。

### 成果物
実装変更に加え、少なくとも以下を確認可能な形で残す。

- Endpoint inventory
- Endpoint ごとの Request / Response
- Response field ごとの Consumer / Usage
- Keep / Delete 判定
- Closed endpoint とその根拠
- Windows / Android / Development Runtime の Contract Drift と対応結果

設計書には最終的に残った As-Is API Contract を反映し、調査途中の不要 Contract を正式仕様として残さない。

### Validation
- 全 Frontend / Shared を対象とした Consumer 再検索
- 削除 field / endpoint の参照残存が 0 件であること
- Windows / Android / Development Runtime の Contract 整合
- Frontend build / test / MPA build / smoke validation
- Native test / build の実行可能範囲での確認
- 404 / 405 / 409 / 500 / 501 / 503 等の Error behavior regression 確認
- 設計書と最終 Contract の一致確認

### 完了条件
localhost API が、現行 Consumer が実際に必要とする最小 Contract に整理されていること。未使用 Response field が残存せず、利用価値のない Endpoint が Close され、Windows / Android / Development Runtime 間の意図しない Contract Drift が解消されていること。

---

## English

### Objective
Before modifying all existing screens and adding new v2.0.0 applications, inventory every `127.0.0.1` localhost API between Frontend and AF and reduce the contracts to what current consumers actually use.

Do not close an API merely because it appears old. Trace usage from consumers, remove unused response fields, and close an endpoint only when it no longer provides any required response, side effect, or control responsibility.

### Scope
- Windows AF localhost APIs
- Android AF localhost APIs
- Corresponding Development Runtime / Gateway contracts
- All frontend applications
- Frontend shared/common modules
- UI display, calculations, state decisions, control flow, navigation, error handling, and other response consumers
- Legacy endpoints
- Tests / fixtures / mocks
- API / I/O / Application Framework specifications under `docs/design`

GitHub APIs are not the primary target of this inventory. However, if localhost APIs expose data obtained from GitHub, usage of those localhost response contracts is in scope. Future GitHub Master Write support is not part of Phase 0-B implementation.

### Inventory Method
Trace every localhost endpoint as:

`Endpoint → Request → Response field → Consumer → Usage`

Track response usage at field level, including nested fields where applicable.

Trace indirect consumption through normalization, shared state, helpers, core modules, selectors, and similar layers. Do not classify a field as unused based only on simple string grep.

### Removal Rules
- Response field used by one or more real consumers: Keep
- Response field with zero real consumers: Delete
- Field used for calculation, state decisions, or control even when not displayed: Keep
- Indirectly consumed through Shared/Core: Keep
- Field required by only one native platform but still required by current specification: Keep
- Field referenced only by tests: evaluate separately from production consumers; tests alone are not sufficient reason to keep it
- If cleanup leaves an endpoint with no response, side effect, or control responsibility required by current applications: Close the endpoint
- Apply the same rules to legacy endpoints

### Platform Contract Drift
Compare the same API across Windows, Android, and Development Runtime for:

- Route
- HTTP method
- Request
- Response
- Field names / types / nullability
- HTTP status
- Error codes
- Behavior

Detect unintended differences as contract drift and align them according to current requirements. Document any intentional platform-specific difference and its reason.

### Relationship with Phase 0-A
When Phase 0-A migrates API routes, requests, responses, or types from `Exercise` to `Machine`, apply Machine terminology to the minimized contract produced by this inventory.

Confirm implementation order/integration of Phase 0-A and 0-B before coding to avoid duplicate work or reintroducing legacy terminology.

### Deliverables
In addition to implementation changes, preserve enough evidence to identify:

- Endpoint inventory
- Request / Response for each endpoint
- Consumer / Usage for each response field
- Keep / Delete decisions
- Closed endpoints and rationale
- Contract drift across Windows / Android / Development Runtime and its resolution

Update design documents with the final As-Is API contract only; do not preserve obsolete intermediate contracts as formal specification.

### Validation
- Re-search all Frontend / Shared consumers
- Verify zero remaining references to removed fields/endpoints
- Verify contract alignment across Windows / Android / Development Runtime
- Run frontend builds/tests, MPA build, and smoke validation
- Run applicable native tests/builds
- Check regression behavior for relevant 404 / 405 / 409 / 500 / 501 / 503 paths
- Verify design documents match the final contracts

### Completion Criteria
The localhost API surface is reduced to the minimum contract actually required by current consumers. No unused response fields remain, endpoints with no remaining value are closed, and unintended contract drift across Windows, Android, and Development Runtime is resolved.