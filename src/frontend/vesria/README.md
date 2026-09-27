# Vesria — 初回フルリデザイン

Vesria全体を操作して、見た目・使い心地・動き・画面構成をレビューするための独立SPAです。既存AtlamentのMPAは置き換えず、同じRepository内で並行して動作します。

## 起動

Repositoryのルートで、依存関係の導入済み環境から実行してください。

```powershell
npm run dev:vesria
```

`http://127.0.0.1:5184/` を開きます。ユーザー向けの起動入口はnpmでも動作します。依存関係・lockfileの管理とCodexの検証はRepositoryの規約に従いpnpmを使います。

```powershell
pnpm install
pnpm run check:vesria
pnpm run build:vesria
pnpm run test src/frontend/vesria/src
```

起動時は **Review data** です。常に画面右上に「未保存の架空データ」と表示します。Workout・Resourcesの操作を試しても外部には保存しません。再読み込み、またはモードの切り替えで初期化します。

## 実データへの接続

Settingsの **Live connection** を選びます。旧Application Frameworkは別途起動してください。開発時の既定の転送先は既存Node開発Runtimeの `http://127.0.0.1:5180` です。Windows/AndroidのAFなど別ポートを使う場合は、Viteの起動前に指定します。

```powershell
$env:VESRIA_AF_ORIGIN = 'http://127.0.0.1:YOUR_AF_PORT'
npm run dev:vesria
```

接続できない場合はData Errorになります。実データの代わりに架空データを勝手に表示することはありません。Liveで確定した書き込みは、AFの設定先Repositoryへ反映されます。Human ReviewではまずReview dataを使ってください。

Tokenを入力するのはLiveのみです。TokenはブラウザーのlocalStorage等へ保存せず、既存AFのCredential APIへ渡します。画面の再読み込み後は安全のためReview dataに戻ります。

## 構成

- `src/App.tsx`: 常駐ナビゲーション・背景・ルーティング・画面遷移。
- `src/application/`: 画面向け契約、ルート共有状態、検証、事実に基づく集計。
- `src/infrastructure/legacy-af.ts`: `/api/v1/common` だけを知る暫定互換アダプター。
- `src/infrastructure/review-repository.ts`: 架空データとメモリー内編集。
- `src/workspaces/`: 各Workspaceの固有の見せ方・操作。
- `src/ui/`: Dialog、状態表示、ApexCharts、共通の表示部品。
- `src/visual/`: Human Review済みPre-Fix、常駐粒子、Bobble Graphの静的配置。
- `src/assets/`: Chat_GPT_Contextから移した正式なVesriaシンボル。

## 状態表示の確認

Review dataのSettingsにある「表示状態のレビュー」で、Loading / Empty / Data Error / Local Error / Route Not Found / Fatal Stateを選び、Overviewなどへ移動します。「通常表示に戻る」で解除できます。これは見た目の確認用であり、実際のデータ破損・障害とは明確に区別します。

通常の不明URLにもRoute Not Foundを表示します。実際の描画例外はWorkspace境界とApplication RootのError Boundaryがそれぞれ受け止めます。

## ビルドとホスティング

成果物は `src/frontend/vesria/dist/` です。静的ホストはSPAの深いURLを `index.html` に戻し、`/api/v1/common` はAFへ転送する必要があります。Vite開発サーバーはこの構成を提供します。

既存のWindows/Androidパッケージ生成、MPAルート、配布物の起動先は変更していません。Native配布への切り替えと実機E2Eは別途必要です。今回の成果は、既存AFに接続可能なフロントエンドと、ブラウザーで全体を確認できる初回レビュー環境です。

詳細は [初回実装・レビュー記録](../../../work/v4.0.0-plan/04_vesria_initial_implementation.md) を参照してください。

Ambient / GlassはPlaygroundのPre-FixをCyan / Iceへ適応しています。値の対応・性能調整・Reduced Motion・確認項目は [Visual Material統合記録](../../../work/v4.0.0-plan/05_vesria_visual_material_integration.md) を参照してください。同記録のPlasmaは後続のBobble設計で廃止されました。

第2Iterationの編集保護、共通Dialog、Exploreの操作モデル、検証結果と未解決事項は [第2Iteration記録](../../../work/v4.0.0-plan/06_vesria_iteration_02.md) を参照してください。履歴操作をレビューする間は本番ビルドを固定し、プレビューを開いたまま成果物を置き換えないでください。

Exploreの最新仕様・実装・検証は [Bobble実装記録](../../../work/v4.0.0-plan/07_vesria_explore_bobble.md) を参照してください。過去のFocus / Merge / Detachモデルではなく、候補を選んで記録に出会うBobble方式です。

候補の固定枠交換とGraph Dragの追加は [Bobble Human Review修正01](../../../work/v4.0.0-plan/08_vesria_bobble_rework_01.md) に記録しています。
