# Workout Lab — Angular Machine Detail

Angular + TypeScript で、設計ドラフト上の Machine Detail domain を担当するアプリです。

## 起動方法

アプリ単体で起動する場合：

```sh
npm run start
```

リポジトリ root から起動する場合：

```sh
npm run dev:exercises
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

- `/exercises/:id`

## 実装内容

- Latest
- Best Weight
- Estimated 1RM
- Session Count / Total Sets
- Progress chart
- Machine history
- Workout History への戻りリンク

## 共通層

- `@workout-lab/workout-types`
- `@workout-lab/workout-data`
- `@workout-lab/workout-core`
- `@workout-lab/design-tokens`
