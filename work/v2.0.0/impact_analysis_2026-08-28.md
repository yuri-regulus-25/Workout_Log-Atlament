# v2.0.0 Impact Analysis / Feasibility Assessment

Date: 2026-08-28

Scope: Repository-wide read of current Source Code, `/data`, current As-Is Design Documents, and `work/v2.0.0/` Planning/DRAFT/BUGFIXES.

This report is an investigation result. It does not decide design decisions and does not define an implementation plan.

## 1. Executive Summary

Overall finding: v2.0.0 is feasible on the current architecture, but the change set is not a simple frontend-only expansion. The largest impacts are Application Registration / Build / Native Hosting for six new applications, shared/core aggregate logic, and Master Data write support. Existing Workout Log schema can remain read-only for most planned features if gym/exercise/body_part derived data is used carefully.

Feasibility count by analyzed requirement group:

| Grade | Count |
|---|---:|
| S | 3 |
| A | 11 |
| B | 10 |
| C | 1 |
| D | 0 |

Largest impact areas:

- `src/shared/workout-core`: period, aggregate, compare, body part, report, and main-gym-aware volume logic.
- Application registration surfaces: frontend metadata, portal cards, root scripts, dev gateway/watch, MPA build, MPA smoke validation, Windows hosting/status, Android hosting/status/assets.
- AF API and GitHub I/O if Master Data Maintenance writes to GitHub SoT.
- Master Data schema if Machine / Main Gym are added as first-class concepts.

Largest risks:

- Weight / Volume comparison semantics across gyms or machines. Current data has `gym_id` and `exercise_id`, but no machine identity.
- Master Data Maintenance write path. Current GitHub I/O is read-only, and current API has no master read/write endpoint.
- Adding Machine as a required entity would create compatibility and migration work. The requirement should first be tested against current `gym_id + exercise_id + body_part` derivation.

Important design decisions required before implementation:

- Whether Machine is required, optional, or explicitly deferred.
- Where Main Gym is stored: Master Data, AF configuration, or another settings document.
- Whether Body Part remains an Exercise attribute or becomes an entity.
- Whether Data Explorer needs raw source files through AF or can use the existing development/runtime payload shape.
- How new application registration is centralized enough to prevent drift without over-abstracting app-specific UI.
- How Master Data write APIs validate, diff, commit, conflict-check, and resync.

## 2. As-Is Baseline

Evidence sources:

- Current design index: `docs/design/README.md`
- As-Is architecture/data: `docs/design/01_basic-design/architecture.md`, `docs/design/01_basic-design/data-overview.md`, `docs/design/01_basic-design/screen-structure.md`
- Detailed specs: `docs/design/02_detailed-design/**`
- Source: `src/**`, `tools/**`, root `package.json`
- Data SoT: `data/master/*.json`, `data/workouts/**/*.json`, `data/workouts/**/*.jsonl`
- Planning: `work/v2.0.0/**`

Current application routes and frameworks:

| Route | Current Application | Framework |
|---|---|---|
| `/` | Portal | Vanilla JS |
| `/dashboard/` | Dashboard | React |
| `/workouts/`, `/workouts/:date` | Workout Domain | Vue 3 |
| `/exercises/`, `/exercises/:id` | Performance Detail | Angular |
| `/analytics/` | Analytics | Svelte |
| `/settings/` | Application Settings | SolidJS |
| `/404.html`, `/500.html`, `/503.html` | Error Pages | Static HTML |

Current data model:

- Master Data has only `gyms.json` and `exercises.json`.
- Gym fields: `gym_id`, `name`, optional `short_name`, `active`.
- Exercise fields: `exercise_id`, `name`, `body_part`, optional `aliases`, `active`.
- Body Part is an Exercise attribute, not an entity.
- No Machine entity, no Machine ID in Workout Log, no Main Gym field, no dedicated logical delete field.
- Workout raw session stores `schema_version`, `session_id`, `date`, `status`, `gym_id`, `exercises[]`, optional `condition`, optional `notes`.
- Workout raw exercise stores `exercise_id`, `sets[]`, optional `notes`.
- Set stores `set`, `weight_kg`, `reps`, optional `rir`, `failure`, `warmup`, `note`.
- Runtime normalization resolves `gym_id` to `gym` and `exercise_id` to `name/body_part`.

Current AF/API:

- Common API prefixes: `/api/v1/common` and `/api/common`.
- Endpoints: `GET /status`, `GET /runtime/workouts`, `POST /sync`, `GET/POST /configuration`, `GET /credential/status`, `POST /credential`, `POST /shutdown`.
- Valid resources are exactly `WORKOUT`, `EXERCISE_MASTER`, `GYM_MASTER`.
- GitHub I/O is read-only.
- Windows and Android host the same MPA artifact shape and both know fixed app names.
- Dynamic route fallback exists only for Workout date and Exercise ID routes.

Current core capabilities:

- Existing `workout-core` covers volume, sets, exercise history, max weight/reps, estimated 1RM, recent sessions, monthly sessions/volume, body part summary, personal records, training streak, average interval, training frequency, and workout rows.
- Existing core does not provide general period presets, previous period comparison, main gym context, machine comparability, report aggregates, A/B compare, calendar aggregation, or Master Data write validation.

## 3. Requirement Impact Matrix

Legend: `-` no direct impact, `Minor` localized, `Medium` multiple modules in one area, `Major` cross-component or contract/data impact.

| Requirement | Common | Portal | Dashboard | Workout | Performance | Analytics | Settings | Compare | Body Map | Explorer | About | Report | Maintenance | Error Pages | CSS | Windows | Android | Master | Workout Data | Design Docs | BUGFIX | Feasibility |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Common accessibility/responsive/UI baseline | Medium | Minor | Minor | Minor | Minor | Minor | Minor | Minor | Minor | Minor | Minor | Minor | Minor | Minor | Major | - | Minor | - | - | Medium | - | A |
| Shared frontend/core responsibility review | Major | Minor | Medium | Medium | Medium | Medium | Medium | Medium | Medium | Medium | Minor | Medium | Medium | - | Minor | - | - | - | - | Medium | - | B |
| Shared metadata/application registration | Major | Medium | Minor | Minor | Minor | Minor | Minor | Medium | Medium | Medium | Medium | Medium | Medium | - | Minor | Major | Major | - | - | Medium | - | B |
| Portal status/layout/card metadata polish | Minor | Medium | - | - | - | - | Settings link | - | - | - | - | - | - | - | Medium | - | - | - | - | Minor | - | A |
| Dashboard previous month comparison | Medium | - | Medium | - | - | - | - | - | - | - | - | Report overlap | - | - | Minor | - | - | - | - | Medium | Related | A |
| Dashboard latest/recent/calendar/chart UX | Medium | - | Medium | Workout links | - | - | - | - | - | - | - | - | - | - | Medium | - | - | - | No migration | Medium | - | A |
| Workout filters/list/calendar/detail summary/navigation | Medium | - | - | Major | Performance link | - | - | Compare adjacency | Body part reuse | - | - | - | - | - | Medium | Route fallback only if new paths | Route fallback only if new paths | - | No migration | Medium | - | A |
| Workout lightweight session compare | Medium | - | - | Medium | - | - | - | Dependency candidate | - | - | - | - | - | - | Minor | - | - | - | No migration | Medium | Related | B |
| Performance search/filter/metrics/chart/history rename | Medium | - | - | Workout links | Major | - | Main gym dependency | - | - | - | - | Report metric overlap | - | - | Medium | - | - | Optional main gym/machine | No migration if filtered | Medium | Related | B |
| Analytics global period/aggregate/body/gym/exercise | Major | - | Dashboard overlap | Workout links | Performance links | Major | Main gym dependency | Shared compare delta | Body part reuse | Explorer overlap | - | Report overlap | Master quality handoff | - | Medium | - | - | Optional main gym/machine | No migration if filtered | Medium | Related | B |
| Settings IA/setup/validation/credential/sync/status | Medium | Portal setup link | - | - | - | - | Major | - | - | - | About version overlap | - | Maintenance boundary | - | Medium | Medium | Medium | - | - | Medium | - | B |
| Compare new Preact app | Major | Medium | - | Medium links | Medium links | Medium aggregate reuse | Main gym/status maybe | Major | Body part filters | - | About gallery | Report aggregate reuse | Master context | - | Medium | Major | Major | Optional machine/main gym | No migration if scoped | Major | Related | B |
| Training Map / Body Map new Lit app | Major | Medium | - | Workout links | Performance links | Analytics overlap | - | - | Major | - | About gallery | Report overlap | Master context | - | Major | Major | Major | Body part adequate; Machine optional | No migration | Major | - | B |
| Data Explorer new Alpine app | Medium | Medium | - | Drill-down | Drill-down | - | - | - | - | Major | About gallery | - | Maintenance boundary | - | Medium | Major if raw API | Major if raw API | Read model only | No migration | Major | - | B |
| About / Technology Gallery new Astro app | Medium | Medium | - | - | - | - | Version/status boundary | - | - | - | Medium | - | - | - | Medium | Major hosting | Major hosting | - | - | Major | - | A |
| Report new Mithril app | Major | Medium | Dashboard aggregate overlap | Workout links | Performance links | Analytics overlap | Main gym dependency | Compare aggregate reuse | Body part charts | - | About gallery | Major | Master context | - | Medium | Major | Major | Optional main gym | No migration if derived | Major | Related | B |
| Master Data Maintenance Vue+Vuetify | Major | Medium | Indirect | Resolve links | Indirect | Data quality handoff | Major boundary | Master context | Master context | Explorer boundary | About gallery | Main gym context | Major | - | Major | Major | Major | Major schema/write | No direct migration unless Machine required | Major | Related | C |
| Error page polish | Minor | - | - | - | - | - | - | - | - | - | - | - | - | Medium | Medium | Minor | Minor | - | - | Minor | - | S |
| Cross-gym machine weight comparability BUGFIX | Major | - | Medium | Medium | Major | Major | Main gym setting | Major | Medium | Data inspection | - | Major | Master relation | - | - | Medium if API context | Medium if API context | Design decision | Avoid migration first | Major | Major | B |
| Dashboard current month hardcoding BUGFIX reference | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | Minor | Resolved/Not Applicable | S |

Note: `dashboard_current_month_hardcoding.md` is referenced by Planning but does not exist under `work/v2.0.0/BUGFIXES/`. Current source already uses `getCurrentLocalYearMonth()`, so the referenced bug is treated as Resolved / Not Applicable from current evidence.

## 4. Frontend Impact

### Common

Planning requirement:

- Cross-application accessibility, responsive behavior, loading/empty/error states, motion, UI density, and domain responsibility cleanup.
- Avoid shared UI components across frameworks; use shared metadata, shared styles, design tokens, and core/domain utilities.

Current As-Is:

- `frontend-common` owns AF client, navigation, theme, branding, page transition, and Character Easter Egg.
- `shared-styles` and `design-tokens` exist.
- Current `workout-core` contains useful but partial domain logic.

Gap:

- No generic period model, delta model, comparison model, calendar aggregation, report aggregate, main-gym-aware filter, or machine comparability contract.
- Accessibility and responsive behavior are mostly app-local.

Required change:

- Extend `workout-core` and likely `workout-types` for reusable aggregate/view-model primitives.
- Extend frontend-common application metadata for new app route/display/framework/category/icon where useful.
- Extend shared CSS/tokens only for cross-app primitives.

Impact: Major for shared/core; Medium for frontend-common/styles.

Feasibility: B. Feasible, but requires responsibility boundary decisions to avoid duplicated calculations and incompatible app-local semantics.

### Portal

Planning requirement:

- Keep Portal as entry surface.
- Improve app cards for more applications.
- Add compact status/setup information and route to Settings.
- Avoid manual sync/settings edit directly from Portal.

Current As-Is:

- Portal cards are hard-coded in `src/frontend/portal/src/index.html`.
- Status polling is implemented in `src/frontend/portal/src/main.js` every 1500ms.
- Portal currently does not use shared navigation drawer.

Gap:

- New apps require card additions or metadata-driven rendering.
- Status has no detailed drawer/popover and no direct Settings cause routing.

Required change:

- Either keep static cards and update them, or render from expanded metadata.
- Improve status UI without adding write actions.

Impact: Medium Portal; Minor common metadata/CSS.

Feasibility: A.

### Dashboard

Planning requirement:

- Current month summary with previous month comparison.
- Latest/recent workout summary.
- Existing chart UX improvement.
- Current month workout calendar.
- Skip PR/personalization/runtime quality widgets.

Current As-Is:

- Current month already uses runtime local month through `getCurrentLocalYearMonth()`.
- Dashboard already renders monthly workouts/sets/volume/latest workout, charts, latest workout, and recent rows linking to `/workouts/<date>/`.

Gap:

- Previous month aggregate/delta is not implemented.
- Calendar aggregation is not implemented.
- Tooltip/navigation refinement may need chart config changes.
- Planning reference to hardcoding bug is stale.

Required change:

- Add previous period/month aggregate utilities in `workout-core`.
- Add calendar aggregation or view model in `workout-core`.
- Update React UI and CSS.

Impact: Medium Dashboard; Medium core.

Feasibility: A. No schema migration needed.

### Workout Domain

Planning requirement:

- List filters: body part, gym, date range, search text, sort, URL query, grouping, pagination/virtualization if needed.
- Calendar view inside Workout Domain.
- Detail summary: gym summary, unique exercise count, total reps.
- Exercise card table/RIR secondary display/performance navigation.
- Lightweight previous session comparison.
- Navigation context preservation.

Current As-Is:

- Vue + Vue Router.
- Current list filter is named Machine but uses exercise display names from loaded sessions.
- Detail groups sessions by date and gym, displays body part, sets, volume, RIR, notes, and Performance Detail links.

Gap:

- No body part/gym/date/search filters, URL query state, calendar view, previous/next navigation, scroll restore, or comparison.
- Current "Machine" terminology is not backed by Machine entity.

Required change:

- Add filter state/view logic in Vue.
- Add core helpers for total reps, calendar aggregation, previous session resolver, and session comparison.
- Keep Workout Log read-only.

Impact: Major Workout UI; Medium core.

Feasibility: A for filters/calendar/navigation; B for comparison if weight/volume semantics are included. The DRAFT limits comparison to counts/reps/exercises, making Workout Log migration unnecessary.

### Performance Detail

Planning requirement:

- Rename `Best Weight` semantics to `Max Weight`.
- Search and body part filter.
- Metrics: total sessions, total reps, days since last performed, max session volume, total volume, max weight date.
- Charts: max/average weight and session volume with fixed period, moving average, detail drill-down.
- Main Gym restriction for weight/volume metrics.

Current As-Is:

- Angular app currently shows Best Weight, Best Reps, Estimated 1RM, recent 28-day average set weight, Best Weight chart, body part, session count, and history table.
- Core currently computes max weight/reps, estimated 1RM, average set weight, exercise history.

Gap:

- No main gym context.
- No period selector/filter, moving average, max weight date, days since last performed, row drill-down, or set-level expansion.
- Current source still uses `Best` and e1RM that DRAFT wants to shrink/remove.

Required change:

- Update Angular UI and chart model.
- Extend core with period filtering, series, moving average, main-gym-aware metric variants.
- Decide Main Gym source before applying main-gym restriction.

Impact: Major Performance; Medium core; Master/settings dependency.

Feasibility: B because Main Gym source and comparison semantics must be decided first.

### Analytics

Planning requirement:

- Global period context, previous period comparison, fixed presets, calendar month selector.
- Volume analytics limited by Main Gym.
- Frequency, body part, exercise, gym analytics.
- Remove data quality from Analytics responsibility.

Current As-Is:

- Svelte app currently has all-history KPI, trend, body part sets, recent 28-day machine variety by body part, and body part volume table.
- No global period selector or data quality management.

Gap:

- Need shared period engine and previous period deltas.
- Need main-gym-aware filtering for volume metrics if that rule is adopted.
- Need drill-down links and richer chart behavior.

Required change:

- Extend `workout-core` for period presets, previous range, aggregation, body part trend, exercise ranking, sessions by gym.
- Update Svelte state and chart rendering.
- Decide Main Gym before volume restriction.

Impact: Major Analytics; Major core.

Feasibility: B.

### Application Settings / Setup

Planning requirement:

- Settings IA improvements, validation, dirty state, section-local feedback, credential expiry UX, sync/status placement.
- New first-run Setup Assistant with completion gate.
- Master Data content editing excluded; Main Gym assigned to Master Data Maintenance in DRAFT.

Current As-Is:

- SolidJS Settings already handles AF status, configuration, resources, timeouts, credential, manual sync.
- AF API supports configuration and credential updates plus manual sync.
- No setup assistant, setup gate, diagnostics export, or Master Data editor.

Gap:

- Setup completion state is not part of AF status/configuration.
- No app-wide navigation gate.
- Token expiry presets need UI and possibly validation alignment.

Required change:

- Add frontend setup flow and state handling.
- Possibly extend AF config/status for setup completion if gate must be enforced across app launches.
- Keep Master Data content outside Settings.

Impact: Major Settings; Medium Windows/Android if setup state enters AF.

Feasibility: B because the location and enforcement level of setup completion must be decided.

### Compare

Planning requirement:

- New Preact app for Workout vs Workout and Period vs Period A/B comparison within same Gym context.
- No winner/improved judgment.
- Core owns delta, aggregate, and comparison.

Current As-Is:

- No Compare app, route, build, package, hosting, status, or metadata.
- Core has simple totals and history, but no A/B compare or period aggregate.

Gap:

- Requires new workspace app and all registration surfaces.
- Requires same-gym filtering and comparison view models.
- Machine entity is not strictly required for same-gym comparison, but it affects any machine-sensitive weight/volume interpretation.

Required change:

- Add Preact dependency/workspace and app artifact.
- Add shared route/app metadata, Portal card, build/dev/validation/native hosting registration.
- Add core compare primitives.

Impact: Major new app and registration; Major core.

Feasibility: B. Feasible if scoped to same gym using current `gym_id`; design decision required for machine-sensitive metrics.

### Training Map / Body Map

Planning requirement:

- New Lit app with body map, period selector, gym filter, body part tap/click, sets/frequency/last trained metrics.
- Uses Master Data Machine -> Body Part in Planning.

Current As-Is:

- No app.
- Current Master has body_part directly on Exercise; no Machine entity.
- Runtime sessions include normalized exercise `body_part`.

Gap:

- Body Map metrics can be implemented from current normalized WorkoutSession exercise `body_part` for sets/frequency/last trained.
- Machine -> Body Part mapping is not currently present and is not necessary for the planned metric set unless drill-down explicitly requires physical Machine.

Required change:

- Add Lit app and registration surfaces.
- Add body part aggregate helpers in core.
- Use Exercise.body_part initially, or decide Machine model if richer drill-down requires it.

Impact: Major new app; Medium core; optional Master schema.

Feasibility: B if Machine mapping remains undecided; A if body_part attribute is accepted as sufficient for v2.0.0 metrics.

### Data Explorer

Planning requirement:

- New Alpine.js read-only app to inspect Raw and Normalized data and relationships.
- No editing or fixing.

Current As-Is:

- Runtime frontend API exposes normalized sessions only.
- Development/preview data APIs can return `{ masterData, files }`.
- Native AF current `/runtime/workouts` does not expose raw files.

Gap:

- Raw data is not available through current native AF API.
- Normalized data is available.
- Master data is not exposed as a separate native API.

Required change:

- Minimum option: Data Explorer consumes normalized sessions only and displays their preserved IDs/fields. This does not satisfy "Raw Data" fully.
- Full requirement: add read-only raw/master API or extend runtime payload contract on Windows and Android.

Impact: Major Explorer; Major AF if raw API is required.

Feasibility: B. Raw API need is a design decision; read-only nature keeps data risk low.

### About / Technology Gallery

Planning requirement:

- New Astro app showing app/framework/architecture/version/build/shared packages.
- No runtime status/config/credential.

Current As-Is:

- Version JSON exists.
- Metadata exists for current apps only.
- No Astro dependency/app.

Gap:

- Requires new workspace and registration.
- Architecture/static content can derive from metadata and static docs/source facts.

Required change:

- Add Astro app and route/build/hosting registration.
- Avoid runtime status overlap with Settings.

Impact: Medium app; Major registration.

Feasibility: A.

### Report

Planning requirement:

- New Mithril.js read-only fixed weekly/monthly report app.
- Period aggregate, previous period comparison, body part/gym charts, drill-down.
- Weight/volume uses Main Gym context.

Current As-Is:

- No app.
- Existing core has totals but not report period aggregate or previous period logic.

Gap:

- Needs shared report aggregate model.
- Main Gym dependency for volume.

Required change:

- Add Mithril app and registration.
- Add core period/report aggregate utilities.
- Decide Main Gym source.

Impact: Major new app; Major core; Medium Master/settings dependency.

Feasibility: B.

### Master Data Maintenance

Planning requirement:

- New Vue + Vuetify read/write app.
- Manage Gym, Machine, Exercise, possibly Body Part, Main Gym, unresolved values, validation, logical delete/restore, GitHub commit/diff/conflict, auto sync.

Current As-Is:

- Current GitHub I/O is read-only.
- Current AF API has no Master Data read/write endpoints.
- Current Master schema has Gym and Exercise only.
- Current `active` exists; no logical-delete-specific field.
- Current validation is parser-level and rejects unknown Master references for runtime build.

Gap:

- Requires new write API and GitHub write implementation on Windows and Android.
- Requires schema decisions for Machine/Main Gym/Body Part/logical delete.
- Requires domain validation beyond current parser.

Required change:

- Add Master Data read/write contract and validation layer.
- Add GitHub write/commit/conflict handling.
- Add UI app and registration.
- Decide whether to modify Master schema and how to preserve existing Workout Log compatibility.

Impact: Major across frontend, AF, GitHub I/O, Master Data, docs, tests.

Feasibility: C if implemented with Machine/Main Gym schema changes and GitHub write in v2.0.0. Feasible, but high rework/risk relative to current read-only architecture.

### 404 / 500 / 503

Planning requirement:

- Error page quality and common visual/accessibility polish.

Current As-Is:

- Static HTML/CSS error pages exist and are copied into dist.

Gap:

- No functional gap for v2.0.0 new apps except route validation/hosting should still map errors correctly.

Required change:

- Localized static CSS/HTML polish if desired.

Impact: Medium Error Pages/CSS; Minor native hosting only if routing expands.

Feasibility: S.

### CSS

Planning requirement:

- Global CSS/shared styles/design tokens/app-specific CSS alignment.

Current As-Is:

- `design-tokens`, `shared-styles`, app-local CSS, frontend-common navigation/branding/easter-egg CSS.

Gap:

- New apps will need consistent tokens and responsive/accessibility conventions.
- Framework-specific components remain app-local.

Required change:

- Add cross-app token/style primitives only when multiple apps use them.
- Keep chart/SVG/table details app-local where framework-specific.

Impact: Major CSS/shared styles due to six new apps and common QA criteria.

Feasibility: A.

## 5. Application Impact

### Windows

Current evidence:

- Windows uses Kestrel + WinForms/WebView2.
- Known app artifacts are fixed in `HostingStatusService`: dashboard, workouts, exercises, analytics, settings.
- Dynamic fallback only supports `/workouts/YYYY-MM-DD` and `/exercises/<id>`.
- API has no Master Data write endpoints.
- GitHub fetcher maps 429 to `GITHUB_RATE_LIMIT`.

Impact:

- New frontend apps require Windows hosting/status additions.
- New nested routes, if any, require fallback route rules.
- Master Data Maintenance requires API and GitHub write additions.
- Setup gate may require status/config extension if enforced natively.
- Data Explorer raw view requires read-only raw/master API if normalized data is insufficient.

Feasibility:

- New static app hosting: A.
- API extensions for read-only raw/master: B.
- GitHub write/Master maintenance: C.

### Android

Current evidence:

- Android uses WebView + custom localhost `ServerSocket`.
- `appNames` is fixed to dashboard, workouts, exercises, analytics, settings.
- Hosting status JSON is fixed to those apps.
- Dynamic fallback only supports workouts date and exercises ID.
- API unknown routes return 501.
- GitHub 429 maps to `GITHUB_RATE_LIMITED`, spelling differs from Windows.
- Back navigation uses WebView history.

Impact:

- Same new app registration and route fallback work as Windows, but implemented separately in Kotlin.
- Android assets copy flow must include new app artifacts through `dist/`.
- Safe area/mobile behavior is mostly frontend CSS; Android native impact is likely Minor unless WebView edge-to-edge behavior is changed.
- Master write and raw API must be duplicated in Kotlin if API contract changes.

Feasibility:

- New app hosting/assets/status: A.
- Raw/master read API: B.
- GitHub write/Master maintenance: C.

## 6. Master Data Impact

Current SoT:

- `data/master/gyms.json`
- `data/master/exercises.json`

Machine:

- Current Master Data has no Machine entity.
- Current Workout Data has no Machine identity.
- Current UI often labels Exercise as Machine, but technically uses `exercise_id` and exercise display name.
- Training Map sets/frequency/last trained can be derived from current Exercise `body_part`.
- Compare can be constrained to same `gym_id` without Machine entity.
- Weight/Volume comparison across gyms cannot be made semantically safe from current data alone.

Machine evaluation: Design Decision Required. It is not required for Body Map v2.0.0 if Exercise.body_part is accepted. It is optional for same-gym Compare. It may become required only if v2.0.0 insists on physical-equipment-level comparability or Machine CRUD in Maintenance.

Main Gym:

- No current Data/Settings field exists.
- Required by Performance/Analytics/Report DRAFTs for weight/volume restriction.
- Compare can function without Main Gym if it requires explicit same-gym context.
- Natural SoT is undecided:
  - Master Data if Main Gym is domain/reference state shared across devices.
  - AF configuration if it is device/user preference.
  - Separate settings document if it must be user preference but synced.
- Historical Workout Data does not need direct changes if Main Gym is external context used during runtime/core filtering.

Main Gym evaluation: Design Decision Required.

Body Part:

- Current Body Part is `ExerciseMasterItem.body_part`.
- It is an attribute, not an entity.
- Training Map can aggregate current runtime sessions by normalized exercise `body_part`.
- Machine -> Body Part mapping is not required by current data model for the planned Body Map metrics unless Machine is introduced independently.

Body Part evaluation: Attribute is sufficient for v2.0.0 read-only aggregation; entity conversion is optional/design-dependent.

Active / Inactive / Logical Delete:

- Current records have `active`.
- Current parser/validator requires `active`.
- Existing logs can resolve inactive records by ID because current lookup does not reject inactive use.
- There is no separate deleted/restored field.
- Logical delete can be represented by `active:false` if accepted as the domain meaning, but UI terminology and validation rules must be decided.

Alias / Normalize:

- Exercise `aliases` exists as an optional string array and is present in current data.
- There is no separate alias entity or unresolved-resolution table.

Referential Integrity:

- Current runtime build rejects unknown `gym_id` or `exercise_id`.
- Current Master validation checks duplicate IDs and body_part values.
- It does not validate Machine relations because they do not exist.

## 7. Workout Data Impact

Current Workout Log should remain read-only SoT per Planning.

Schema change / migration assessment:

- Dashboard, Workout filters/calendar/detail summary, Analytics body/frequency/gym, Body Map sets/frequency/last trained, Report summaries, and same-gym Compare can be implemented from existing `gym_id`, `exercise_id`, `date`, `sets`, `weight_kg`, `reps`, `rir`, and Master-derived `body_part`.
- Main Gym can be applied as runtime/core filtering without adding a field to historical Workout Log.
- Raw machine-level comparability cannot be solved from current Workout Log because no Machine ID exists. However, this does not force immediate Workout Log migration if v2.0.0 avoids cross-gym machine-sensitive judgments and scopes comparisons to same gym or main gym.
- Data Explorer raw viewing may require AF to expose raw files, but not Workout Log schema changes.

Recommendation from evidence: do not plan Workout Log migration as a prerequisite for the whole v2.0.0. Treat migration as a separate decision only if Machine identity is made required for v2.0.0 metrics.

## 8. BUGFIXES Assessment

### Cross-gym machine weight comparability

Planning bug:

- Same logical Exercise can represent different physical machines in different gyms, making raw `weight_kg` comparisons semantically unsafe.

Current State:

- Current Data SoT includes the same `exercise_id` across multiple `gym_id` values.
- Example evidence:
  - `data/workouts/2026/06/2026-06-18.json` has `gym_id: af-yakoekimae` and `abdominal` up to `50kg`.
  - `data/workouts/2026/08/2026-08-12.json` has `gym_id: af-shioiri` and `abdominal` up to `25kg`.
- Current `workout-core` computes max weight, personal records, exercise history, and volume from raw values without machine comparability context.

Expected State:

- Features must not claim cross-gym/machine performance superiority from raw weight alone.
- Weight/volume comparisons should be constrained by an explicit comparable context such as same gym or main gym, unless Machine semantics are added.

Root cause candidate:

- Data model has no physical Machine/Equipment identity and core calculations do not carry comparability metadata.

Code fix needed:

- Yes, if current UI continues or expands `Best Weight`, `PR`, `PersonalRecord`, or volume comparisons without context.
- For v2.0.0 DRAFTs, the practical fix can be scoping/renaming/removing unsafe comparisons and adding core context filters.

Data correction needed:

- Not necessarily. Current Workout Log records are valid facts.

Master Data impact:

- Design decision required. A Machine entity can improve semantics but is not automatically required for every v2.0.0 feature.

Workout Data impact:

- No immediate migration required if context-based filtering is used.
- Migration only becomes relevant if physical Machine identity is required in historical comparisons.

Regression risk:

- High for Performance/Analytics/Compare/Report if raw weight semantics are changed inconsistently.

Feature dependencies:

- Performance metrics, Analytics volume, Compare deltas, Report volume/max weight, Master Data Maintenance, Main Gym.

Feasibility: B.

### Dashboard current month hardcoding

Planning reference:

- `work/v2.0.0/dashboard/improvement_DRAFT.md` references `../BUGFIXES/dashboard_current_month_hardcoding.md`.

Current evidence:

- That file does not exist under `work/v2.0.0/BUGFIXES/`.
- Current Dashboard uses `getCurrentLocalYearMonth()` from `workout-core`.

Assessment:

- Resolved / Not Applicable in current source.

Code fix needed: No.

Feasibility: S.

## 9. Design Document Impact

The following As-Is design documents would need update when implementation decisions are made:

- `docs/design/01_basic-design/system-overview.md`: new app set and responsibility map.
- `docs/design/01_basic-design/architecture.md`: new write path if Master Data Maintenance writes to GitHub; raw API if added.
- `docs/design/01_basic-design/screen-structure.md`: new routes/apps/dynamic route behavior.
- `docs/design/01_basic-design/data-overview.md`: Machine/Main Gym/Body Part schema decisions if adopted.
- `docs/design/01_basic-design/technology-stack.md`: Preact, Lit, Alpine.js, Astro, Mithril, Vuetify if added.
- `docs/design/02_detailed-design/repository/structure.md`: new frontend workspace directories.
- `docs/design/02_detailed-design/repository/build-runtime.md`: package scripts, MPA build, dev ports, Android copy, Windows build.
- `docs/design/02_detailed-design/data/master-data/current-schema.md`: Machine/Main Gym/logical delete/body part decisions.
- `docs/design/02_detailed-design/data/workout-data/current-schema.md`: only if Workout Log schema changes; otherwise clarify derived context.
- `docs/design/02_detailed-design/application-framework/api-contract.md`: new raw/master/read/write/status endpoints.
- `docs/design/02_detailed-design/application-framework/windows/current-spec.md`: hosting/status/routes/API/write implementation.
- `docs/design/02_detailed-design/application-framework/android/current-spec.md`: hosting/status/routes/API/write implementation.
- `docs/design/02_detailed-design/frontend-framework/common-js.md`: metadata and AF client additions.
- `docs/design/02_detailed-design/frontend-framework/common-css.md`: shared styles/tokens if extended.
- Current app docs under `frontend-framework/`: per-app changed behavior.
- New app docs under `frontend-framework/`: Compare, Body Map, Data Explorer, About, Report, Master Data Maintenance.
- `docs/design/02_detailed-design/io/github.md`: GitHub write, conflict detection, commit semantics.
- `docs/design/02_detailed-design/io/filesystem.md`: runtime/master/raw cache files if added.
- `docs/design/02_detailed-design/io/http-api.md`: new localhost routes/status behavior.

## 10. Shared / Core / API Impact

Shared/core candidates:

- `workout-types`: period types, aggregate result types, comparison result types, maybe master domain types for Machine/Main Gym if adopted.
- `workout-core`: period presets, previous period ranges, deltas, calendar aggregation, body part sets/frequency/last trained, exercise ranking, sessions by gym, report aggregate, same-gym compare, total reps, moving average, main-gym filtering.
- `workout-data`: raw/master loading exposure only if Data Explorer or Maintenance needs a shared read path.
- `frontend-common`: app metadata, route IDs, AF client methods for any new APIs, navigation entries.
- `shared-styles` / `design-tokens`: cross-app controls, tables, status states, responsive and accessibility primitives.
- AF API: raw/master read endpoints, Master Data write endpoints, setup state endpoint/config extension if adopted.

API impact by requirement:

- New read-only apps using normalized sessions only: no new API.
- Data Explorer Raw Data: new read-only raw/master API or expanded runtime payload.
- Master Data Maintenance: new read/write API, validation response, diff/conflict response, commit result, and post-save sync.
- Setup gate: may require status/config additions.

## 11. Cross-DRAFT Dependencies

Dependencies:

- New applications depend on application registration updates across metadata, Portal, build/dev/validation, Windows, Android.
- Dashboard/Analytics/Compare/Report depend on shared period/aggregate core utilities to avoid duplicated calculations.
- Performance/Analytics/Report depend on Main Gym decision for weight/volume restriction.
- Machine comparability BUGFIX affects Performance, Analytics, Compare, Report, and any PR/Best-like feature.
- Master Data Maintenance depends on Master schema decisions and AF GitHub write capability.
- Body Map can proceed with current Exercise.body_part if Machine entity is not required.
- Data Explorer raw mode depends on AF exposing raw/master data in native runtime.
- Setup Assistant depends on Settings IA and possibly AF status/config setup-completion state.

Duplicate requirements:

- Period selector/previous comparison: Dashboard, Analytics, Compare, Report.
- Body part aggregation: Dashboard, Workout filters, Analytics, Body Map, Report.
- Drill-down to Workout/Performance: Dashboard, Workout, Analytics, Compare, Body Map, Report, Data Explorer.
- Status/setup guidance: Portal and Settings.
- Data quality/unresolved handling: Analytics candidate, Settings diagnostics candidate, Master Data Maintenance DRAFT. DRAFTs mostly move this to Maintenance/Settings.

Responsibility collisions:

- Portal vs Settings: Portal should show status guidance only; Settings owns operations/configuration.
- Analytics vs Report: Analytics explores; Report presents fixed period summary.
- Workout vs Compare: Workout only lightweight previous session context; Compare owns arbitrary A/B comparison.
- Analytics vs Master Data Maintenance: Analytics should not own data quality management.
- Data Explorer vs Master Data Maintenance: Explorer is read-only inspection; Maintenance owns edits.
- Settings vs Master Data Maintenance: Settings owns paths/config; Maintenance owns Master content/Main Gym per DRAFT.

Shared implementation candidates:

- Period and previous period: `workout-core`.
- Delta and comparability-aware comparison: `workout-core`.
- Body part aggregation: `workout-core`.
- Master validation/referential checks: core/domain validation package or AF-shared logic; current repo has no cross-language shared validator for Windows/Android.
- AF client additions: `frontend-common`.
- App registry metadata: `frontend-common`, with build/native still needing explicit registration unless a generated registry is introduced.

## 12. Conflicts / Contradictions

Planning vs current evidence:

- Planning mentions Machine as Master SoT in several places, but current Master Data and types have no Machine entity.
- Planning assigns Main Gym to Master Data Maintenance, but current Data/Settings has no Main Gym concept.
- Planning says Body Map uses Machine -> Body Part, but current schema uses Exercise -> Body Part.
- Data Explorer requires Raw Data and Normalized Data; native AF currently exposes normalized sessions only.
- Master Data Maintenance requires GitHub write; current GitHub I/O is read-only.
- New app Frameworks are selected in Planning, but current package/workspace has no Preact/Lit/Alpine/Astro/Mithril/Vuetify apps.
- Dashboard DRAFT references a missing hardcoding BUGFIX doc, and current Dashboard no longer hardcodes `2026/8`.
- Android GitHub rate limit code spelling differs from Windows (`GITHUB_RATE_LIMITED` vs `GITHUB_RATE_LIMIT`), already captured in current design.

No conflict found between current As-Is design docs and source for the major investigated points. The As-Is docs match the current source/data shape observed in this investigation.

## 13. Design Decisions Required Before Implementation

| ID | Decision | Current Evidence | Why Required | Affected Areas | Possible Directions |
|---|---|---|---|---|---|
| DD-01 | Machine entity requirement | No Machine master; no Machine ID in Workout Log; current UI uses exercise as "Machine" label | Prevent unnecessary schema/migration; define comparability semantics | Master, Core, Performance, Analytics, Compare, Body Map, Maintenance | Required for physical equipment; Optional for future; Unnecessary for v2.0.0 read-only body metrics; Defer with same-gym/main-gym constraints |
| DD-02 | Main Gym SoT | No current field in data/config; DRAFT requires it for weight/volume | Needed before main-gym-filtered metrics | Settings, Maintenance, Core, Analytics, Performance, Report | Master domain state; AF config/device preference; separate synced preference |
| DD-03 | Body Part modeling | Current `Exercise.body_part` attribute; no entity | Body Map/Maintenance need validation/editing semantics | Master, Body Map, Analytics, Maintenance | Keep enum attribute; add body part master entity; hybrid labels/config |
| DD-04 | Raw Data API | Native AF returns normalized sessions only; dev runtime can return raw files/masterData | Data Explorer Raw requirement cannot be met natively otherwise | AF API, Windows, Android, Data Explorer | Add read-only raw/master endpoint; expand runtime endpoint; reduce v2.0.0 scope to normalized only |
| DD-05 | Master Data write architecture | GitHub I/O is read-only; no write API | Maintenance cannot save without new contract | AF, GitHub I/O, Maintenance, validation | Native GitHub write endpoint; local draft + manual export; defer write |
| DD-06 | Logical delete semantics | Current `active` exists; no delete field | Maintenance delete/restore needs exact meaning | Master, Maintenance, validation | Treat `active:false` as logical delete; add `deleted`/metadata; use inactive only |
| DD-07 | Setup completion state/gate | Settings exists; no setup assistant/gate | DRAFT requires blocking normal app access before setup | Settings, Portal, AF status, navigation | Frontend-only gate; AF status requiredAction; configuration flag |
| DD-08 | App registry centralization | App names fixed in multiple JS, build, C#, Kotlin, tests | Six apps increase drift risk | Frontend-common, build, Windows, Android, validation | Manual explicit updates; generated registry; shared JSON manifest consumed by tools/native |
| DD-09 | Period model | Core has monthly/recent helpers only | Dashboard/Analytics/Compare/Report need consistent period semantics | Core, Dashboard, Analytics, Compare, Report | Preset-only immutable ranges; frontend-local state; URL state skipped per DRAFT |
| DD-10 | Weight/volume comparability policy | Core compares raw values; data has gym_id but no machine_id | Avoid silent semantic bugs | Core, Performance, Analytics, Compare, Report | Same gym only; main gym only; machine-aware; display facts without superiority |

## 14. Feasibility Summary

| Area / Requirement | Grade | Reason | Main Risk | Prerequisite |
|---|---|---|---|---|
| Error page polish | S | Static pages already exist | Visual regressions | None |
| Dashboard hardcoding bug | S | Current code already uses runtime local month | None | None |
| Minor Portal visual polish | S | Localized HTML/CSS/JS | Layout/accessibility | None |
| Portal status/card improvements | A | Fits current Portal responsibility | Overloading Portal with Settings actions | Keep read-only/status-only boundary |
| Dashboard previous comparison/calendar | A | Existing core/dashboard structure supports extension | Duplicated period logic | Shared period/month core helper |
| Workout filters/calendar/navigation | A | Existing Vue Router/list/detail model fits | State/query complexity | Filter model decision |
| About / Technology Gallery | A | Static/read-only app fits MPA architecture | Registration drift | New app registration |
| CSS/common quality baseline | A | Existing tokens/styles can be extended | One-off app-local divergence | Define common quality rules |
| New app static hosting registration | A | Current MPA/native hosting pattern is simple | Fixed lists in many places | Registration inventory |
| Common frontend/core responsibility review | B | Feasible but cross-app contract required | Inconsistent calculations | Core/view-model boundary decision |
| Application registry/metadata | B | Feasible but spans JS/tools/C#/Kotlin | Drift between registries | Centralization or explicit checklist |
| Workout lightweight comparison | B | Counts/reps easy; weight comparison constrained | Semantic comparison bug | Comparability policy |
| Performance v2.0.0 metrics/charts | B | Existing app/core available | Main Gym and terminology migration | Main Gym/comparability decisions |
| Analytics v2.0.0 | B | Existing Svelte/core available | Shared period and main-gym semantics | Period model + Main Gym |
| Settings IA/setup | B | Existing API surface helps | Setup gate state ownership | Setup state decision |
| Compare | B | Architecture supports new app | Same-gym/machine-sensitive semantics | Period/compare core, app registry |
| Body Map | B | Body part can be derived now | Machine mapping assumption | Decide Exercise.body_part sufficiency |
| Data Explorer | B | Normalized read is easy | Raw native API absent | Raw API scope decision |
| Report | B | Read-only fixed summary fits | Main Gym/period aggregation | Period/report core + Main Gym |
| Machine comparability bugfix | B | Can mitigate by scoping/renaming | Full machine model is larger | Comparability decision |
| Master Data Maintenance | C | Requires GitHub write, validation, conflict handling, maybe schema changes | Data correctness and cross-platform API duplication | Master schema + write architecture |

## 15. Previous High-Risk Assumptions Reassessment

Machine Entity:

- Current evidence: absent from Master Data, Workout Data, types, AF resource configuration, and runtime normalization.
- Evaluation: Design Decision Required.
- It is not automatically required for Body Map sets/frequency/last trained because Exercise.body_part is available.
- It is not automatically required for Compare if comparison is same-gym and avoids cross-machine claims.
- It becomes required only if v2.0.0 requires physical-equipment identity, Machine CRUD, or cross-gym comparable equipment semantics.

Main Gym:

- Current evidence: absent from data/config/settings/API.
- Evaluation: Design Decision Required.
- Historical Workout Log migration is not required if Main Gym is external context used by core filtering.

Body Part:

- Current evidence: Exercise Master attribute, normalized into runtime exercises.
- Evaluation: current structure is sufficient for read-only aggregation. Entity conversion is optional.

Raw Data API:

- Current evidence: native AF exposes normalized sessions only; dev/preview can expose raw files/masterData.
- Evaluation: Design Decision Required. Full Data Explorer raw view requires native API extension; normalized-only explorer does not.

Application Registry:

- Current evidence: app IDs/routes are fixed in frontend-common, Portal HTML, root scripts, dev gateway/watch ports, build-mpa, check-mpa, Windows hosting/status models, Android `appNames`/hosting status.
- Evaluation: Design Decision Required. Six new apps make drift likely.

Master Data Write:

- Current evidence: no GitHub write API, no master read/write endpoint, GitHub I/O read-only.
- Evaluation: C if included with GitHub SoT write in v2.0.0.

Workout Log Migration:

- Current evidence: current schema lacks machine identity but contains enough for many v2.0.0 read-only features.
- Evaluation: Not required as blanket prerequisite. Required only if Machine identity is made mandatory for historical comparisons.

Windows / Android Impact:

- Current evidence: both native hosts duplicate fixed app registration and AF API behavior.
- Evaluation: A for new static app hosting; B/C for new API/write semantics depending on feature.

## 16. Dependency Order

This is a technical dependency order, not an implementation plan.

1. Decide Machine, Main Gym, Body Part, Raw API, Master write, Setup gate, and App registry direction.
2. Define shared type/core contracts for period, aggregate, delta, body part summaries, compare, and main-gym/comparability context.
3. Register new applications consistently across metadata/build/dev/native hosting/status before relying on Portal/navigation links.
4. Add read-only feature apps that depend only on normalized runtime data.
5. Add AF read APIs if Data Explorer requires raw/master visibility.
6. Add Master Data write APIs and GitHub write path only after Master schema and validation rules are fixed.
7. Update As-Is design documents after decisions and implementation, using the new `docs/design` hierarchy.

## 17. Open Questions

- Is Machine identity in scope for v2.0.0 implementation, or should v2.0.0 avoid Machine-required metrics?
- Is Main Gym user/device preference or shared domain data?
- Should `active:false` be the logical delete representation, or is a separate deletion model required?
- Should Body Part remain a fixed enum attribute or become editable Master Data?
- Does Data Explorer require byte-level raw file viewing in native apps, or is normalized runtime plus Master enough?
- Should new app registration remain explicit per platform, or should a generated/shared manifest be introduced?
- What exact GitHub write workflow is acceptable for Master Data Maintenance: branch target, commit author/message, conflict detection, retry policy, and post-save sync?
- Should Setup completion block navigation at Portal/frontend level only, or should AF status enforce it?
- Are weight/volume values allowed as factual displays outside Main Gym, while only deltas/ranking are restricted?
- Is Vuetify dependency acceptable for the existing Vue workspace, or should Maintenance be a separate Vue workspace with Vuetify only there?
