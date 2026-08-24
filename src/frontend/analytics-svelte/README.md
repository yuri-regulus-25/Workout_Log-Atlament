# Workout Lab — Svelte Analytics

Svelte + TypeScript + Vite で、設計ドラフト上の Analytics domain を担当するアプリです。

## 起動方法

アプリ単体で起動する場合：

```sh
npm run dev
```

リポジトリ root から起動する場合：

```sh
npm run dev:analytics
```

build：

```sh
npm run build
```

root から全アプリを build：

```sh
npm run build
```

## 担当画面

- `/analytics/`

## 実装内容

- Monthly sessions
- Sets / volume trends
- Body Part summary
- Machine frequency
- PR trend placeholder
- ApexCharts vanilla API integration

## 共通層

- `@workout-lab/workout-types`
- `@workout-lab/workout-data`
- `@workout-lab/workout-core`
- `@workout-lab/design-tokens`
