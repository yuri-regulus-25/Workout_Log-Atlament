# Frontend Common 現行仕様と設計方針

Common frontend code は `src/shared/frontend-common/` 配下にある。

## 責務

Frontend Common は Framework に依存しない意味論・metadata・client boundary を共有する。

主な責務:

- typed AF client
- Application metadata / navigation
- Application Access Policy
- Theme semantic contract
- Branding semantic contract
- page transition
- shared interaction contract
- Character Easter Egg

React / Vue / Angular / Svelte / Solid 等の Component 実装そのものを強制共有する必要はない。

## AF Client

Typed helper は `/api/v1/common/*` を呼び common AF response envelope を parse する。

現行代表 helper:

```text
getAfStatus()
getConfiguration()
updateConfiguration()
getCredentialStatus()
updateCredential()
syncWorkoutData()
```

v2.1.0 Recovery では purpose-limited Recovery helper / DTO を同じ shared boundary へ追加する。

Frontend client は Resource Health、readiness、write eligibility を human message から推論しない。AF が返す structured facts / stable code を使用する。

## Application Registry

Hosted Application metadata は**単一の Registry を Source of Truth** とする。

現行 `navigation/application-registry.js` と `navigation/routes.ts` 等に同じ route 情報が重複している場合、長期的には Registry または Registry から生成した artifact に統合する。

Registry から導出する対象:

- Portal cards
- shared navigation
- production route / base path
- MPA build / validation
- Development Gateway / watch
- Windows / Android AF hosting metadata
- TypeScript consumer metadata

同じ Application 一覧を利用箇所ごとに手書きしない。

現行 hosted routes:

```text
portal      /
dashboard   /dashboard/
workouts    /workouts/
machines    /machines/
analytics   /analytics/
settings    /settings/
maintenance /maintenance/
```

`maintenance` は内部 route/application ID として残せるが、利用者向け機能名は Resource Management / Data Recovery 等、実際の機能を表す名称を使用する。

## Shared Navigation

Navigation の共通契約は「同じDOMを必ず使う」ではなく、意味・配置・状態・interaction・accessibility を共有する。

`initializeAppNavigation()` は現行 non-Portal application へ desktop drawer、mobile header / drawer、overlay、branding / theme trigger を提供する。

Framework 固有 Application が独自 Component で同じ Navigation を実装する場合も、Application Registry と共通UX契約を正とする。

## Theme

Theme は semantic contract と永続化実装を分離する。

Semantic state:

```text
light
dark
```

現行 browser implementation:

```text
localStorage: atlament.system.theme
DOM: data-theme="dark"
```

LocalStorage key や DOM attribute は現行 implementation detail であり、Theme の意味そのものではない。

Application は semantic Design Token を使用し、primary / danger / warning 等の意味色を画面ごとに hard-code しない。

## Branding

Branding も semantic state と保存方式を分離する。

現行 browser implementation:

```text
localStorage: atlament.system.branding.logoVariant
primary   -> green brand
secondary -> violet brand
DOM: data-brand
```

Branding storage implementation を Application 固有 Domain logic にしない。

## Common UX Contract

Cross-framework UX は [共通UX契約](./common-ux-contract.md) を正とする。

共有対象の例:

- Dialog semantics
- Loading Overlay
- Primary Action
- Reset
- Pagination
- Responsive behavior
- Hover / Touch
- accessibility
- Empty / Warning / Error state

Framework ごとに Component source が異なることは許容するが、利用者に見える意味論を理由なく変えない。

## Page Transition

現行 page transition:

- 240ms entry animation
- right-to-left offset 32px
- opacity transition
- `prefers-reduced-motion` では animation disable

Animation timing は UX implementation detail であり、Domain contract にはしない。

## Character Easter Egg

Character Easter Egg は `src/shared/frontend-common/src/easter-egg/` 配下にある。

現行 trigger:

- Application name を page lifetime 中5回 click。
- Count は永続化しない。
- fixed lower-left snackbar を表示。
- active 中の repeated trigger は queue。

AF はこの feature に関与しない。
