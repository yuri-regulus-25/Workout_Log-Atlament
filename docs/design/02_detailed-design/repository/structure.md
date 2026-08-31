# Repository Structure

現行の top-level structure:

```text
.
├─ data/
├─ docs/
├─ src/
│  ├─ application/
│  │  ├─ windows/
│  │  └─ android/
│  ├─ frontend/
│  └─ shared/
├─ tools/
├─ dist/
├─ dist-windows/
├─ package.json
├─ package-lock.json
├─ vitest.config.ts
└─ src/version.json
```

`dist/` と `dist-windows/` は generated artifact である。Android build output は Android project 配下に生成される。

## Source Areas

`src/frontend/` は screen application を含む。

- `portal`
- `dashboard-react`
- `workouts-vue`
- `machines-angular`
- `analytics-svelte`
- `settings-solid`
- `errors`

`src/shared/` は workspace package を含む。

- `workout-types`
- `workout-core`
- `workout-data`
- `design-tokens`
- `shared-styles`
- `frontend-common`

`src/application/` は native application framework を含む。

- `windows`
- `android`

## Documentation

`docs/design/` は現行 As-Is 仕様書である。`docs/instructions/` は implementation instruction を含み、現行 behavior の primary source ではない。

## Work Area

`work/` は planning と work note を含む。現行 design specification の一部ではなく、runtime または build script から import されない。
