# Frontend Common JS 現行仕様

Common frontend code は `src/shared/frontend-common/` 配下にある。

## Exports

Package は以下を export する。

- root AF client type と function
- navigation utility
- page transition constant と class name
- theme utility
- branding utility と CSS
- Character Easter Egg utility と CSS

## AF Client

Root `src/shared/frontend-common/src/index.ts` は以下の typed helper を公開する。

- `getAfStatus()`
- `getConfiguration()`
- `updateConfiguration()`
- `getCredentialStatus()`
- `updateCredential()`
- `syncWorkoutData()`

これらの helper は `/api/v1/common/*` を call し、common AF response envelope を parse し、result に `httpStatus` を追加する。

`src/shared/frontend-common/src/af-client.js` は、Portal が使用する小さな JavaScript `getAfStatus()` helper も提供する。

## Navigation Metadata

`navigation/application-registry.js` は current application metadata の共有SoTであり、Portal card、shared drawer、MPA build/validation、Development Runtime gateway/watch が同じ registry を参照する。`navigation/routes.ts` は TypeScript consumer 向けに同じ current route を定義する。

```text
portal: /
dashboard: /dashboard/
workouts: /workouts/
machines: /machines/
analytics: /analytics/
settings: /settings/
maintenance: /maintenance/
```

`navigation/apps.ts` はそれらの application の display metadata と icon を定義する。Drawer は current `applications` list を含む。`portal` は `drawer:false` だが metadata には残る。Portal cards は `portalCardApplications` を使用し、`portal` を除く current hosted applications、`dashboard`、`workouts`、`machines`、`analytics`、`settings`、`maintenance` を表示する。

## Shared Navigation UI

`initializeAppNavigation()` は non-Portal application へ navigation を inject する。

生成するもの:

- desktop drawer
- mobile header
- mobile drawer
- overlay
- branding logo triggers
- theme toggle triggers

Shared navigation state は DOM class と ARIA attribute で表現される。

## Theme

Theme state は localStorage key に保存される。

```text
atlament.system.theme
```

Light mode は explicit `data-theme` attribute を持たない。Dark mode は `data-theme="dark"` を使用する。

## Branding

Branding state は localStorage key に保存される。

```text
atlament.system.branding.logoVariant
```

Current mapping:

- `primary` logo -> green brand
- `secondary` logo -> violet brand

Brand state は `data-brand="green"` または `data-brand="violet"` で表現される。

## Page Transition

現行 page transition は以下を使用する。

- class name exported by page transition package
- 240ms entry animation
- right-to-left offset of 32px
- opacity transition
- `prefers-reduced-motion` は animation を disable にする

## Character Easter Egg

Character Easter Egg は `src/shared/frontend-common/src/easter-egg/` 配下にある。

Current trigger:

- Application name text が current page lifetime 中に 5 回 click される。
- Count は永続化されない。
- Character image と text を含む fixed lower-left snackbar を表示する。
- Message active 中の repeated trigger は queue される。
- Asset と voice category は source 内の asset/category contract を通じて選択される。

AF はこの feature に関与しない。
