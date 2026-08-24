# Workout Lab — Vue Screen Spike

Vue 3 + TypeScript + Vite で、設計ドラフトの画面構成を一度通すための Spike です。

## 起動方法

開発中はプロジェクト直下の `index.html` を `file://` で直接開かず、Vite の dev server 経由で確認します。

```sh
npm run dev
```

build 済みの画面を確認する場合は、先に build してから preview server を起動します。

```sh
npm run build
npm run prod
```

リポジトリ root から実行する場合：

```sh
npm run dev:workouts
npm run build
```

`vite.config.ts` で `base: './'` を指定しているため、`dist/index.html` は `file://` でも assets を相対パスで参照できます。ただし、通常の確認は `npm run dev` または `npm run prod` を推奨します。

通常の server 経由では設計書通り `/workouts/` と `/workouts/:date` を使います。`file://` 直開き時のみ、ブラウザ制約を避けるため hash routing に自動で切り替えます。

## 実装画面

- Workout History
- Workout Detail

## 検証対象

- 固定データ表示
- Component 分割
- Vue の reactivity / state update
- ApexCharts integration
- Vue table integration
- table sort / pagination
