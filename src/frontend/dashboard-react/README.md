# Workout Lab — React Dashboard

React + TypeScript + Vite で、設計ドラフト上の Dashboard domain を担当するアプリです。

## 起動方法

```sh
npm run dev
```

build 済み画面を確認する場合：

```sh
npm run build
npm run prod
```

リポジトリ root から実行する場合：

```sh
npm run dev:dashboard
npm run build
```

## 担当画面

- `/dashboard/`

## 実装内容

- Monthly Summary
- Latest Workout
- Recent Workouts
- Machine shortcuts
- Training Frequency
- ApexCharts による簡易可視化

## 共通層

- `@workout-lab/workout-types`
- `@workout-lab/workout-data`
- `@workout-lab/workout-core`
- `@workout-lab/design-tokens`
