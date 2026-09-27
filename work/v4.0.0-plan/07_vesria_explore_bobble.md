# Vesria Explore / Bobble 実装記録

## 1. 今回の変更

`feature-vesria-full-redesign` のExploreをBobble方式へ変更した。新しいBranch、commit、pushは行っていない。

設計基準は `Chat_GPT_Context` の `43a7474` にある `05_explore_bobble_design.md`。01〜04の設計・レビューも確認し、Exploreについては最新05を優先した。従来のPlasma、常設Graph、Merge / Detach操作を廃止し、Ambient / Glass / Liquidは維持した。他Workspaceの構成、Domain/Data/AF契約、保存形式は変更していない。

利用者はTypeを選び、ランダムに出会ったBobbleを選ぶ。結果のSession Glassは即座に更新される。検索の実行ボタンはない。選択内容は専用Graph Dialogで確認・解除できる。

## 2. 主なファイルと責務

すべてのSourceは `src/frontend/vesria/` 配下。

| ファイル | 責務 |
|---|---|
| `src/workspaces/Explore.tsx` | 候補、選択条件、結果ページ、Dialogの状態を所有 |
| `src/application/exploration.ts` | 履歴から候補生成、同種OR・異種AND、重複排除、20件単位のページ分割 |
| `src/workspaces/explore/Bobble.tsx` | 安定した文字と、一度だけ反応する外殻 |
| `src/workspaces/explore/SelectedGraph.tsx` | Graph表示、Focus、解除、条件説明 |
| `src/visual/bobbleGraph.ts` | 停止したd3-forceによる有限回の配置計算と非重複保証 |
| `src/workspaces/explore/SessionDetail.tsx` | Sessionの読み取り専用詳細 |
| `src/workspaces/explore/explore.css` | Explore固有の形状、余白、Responsive配置 |
| `src/application/exploration.test.ts` | 候補・条件・期間・歴史的参照・実データ・Graphの試験 |
| `src/workspaces/explore/explore-ui.test.ts` | 無選択、候補枯渇、詳細の文脈保持、Graph解除の試験 |

共通Dialogには任意の `className` のみ追加した。AppからPlasma用の描画ホストを削除し、フッターの旧Material宣言を更新した。旧Explore専用CSS、`PlasmaOptics.tsx`、Pre-FixのPlasma設定と不要な試験は撤去した。過去の作業記録は履歴として残した。

## 3. ライブラリ

- 追加: `d3-force ^3.0.0`。Graphの初期配置と衝突調整だけを担当。
- 追加: 開発用 `@types/d3-force ^3.0.10`。
- 削除: `@cruxgarden/plasma-ui`。Plasma廃止に伴い描画責務がなくなったため。
- 継続: Motionの短い外殻アニメーション、Reactの状態管理、MDI、既存共通Dialog。

Graphの接続線はSVG、操作するBobbleは通常のHTML button。WebGLやCanvasをGraphのために追加していない。背景の既存Ambient Canvasはそのまま。

## 4. Graphの採用方式

SVG＋d3-forceの初回実装。simulationは生成直後に停止し、最大64条件までは100回だけ手動計算する。[公式のstatic layout手順](https://d3js.org/d3-force/simulation)に沿い、常駐timerは残さない。

少数条件は中心周辺の放射状配置、多数条件は広がる放射状配置にする。ID由来の揺らぎを使うため、規則正しい円周だけにはならず、同じ条件集合・同じ幅区分で開き直すと同じ位置へ戻る。外殻とフォーカス枠の余白を含む円で衝突を検査し、有限計算後にも重なりがないよう距離を補正する。

64条件を超える場合はforce計算を省略した静的配置へ落とす。GraphはDialogが開いている間だけ存在し、閉じている間は配置・描画処理を行わない。中心は文字のない小さな核。1回目で条件説明、同じBobbleの2回目で解除。別のBobbleを選ぶとFocusだけが移る。解除ボタンも用意し、解除後はGraph領域へキーボードフォーカスを戻す。

実機Androidでの性能評価を通していないため、最終採用はHuman Reviewと実機計測の確認待ち。

## 5. Bobbleの見た目と動き

不均一な丸い輪郭、Cyan / Iceの縁、局所的な内側の光と陰影で、平らなChipやGlass Cardとは異なる柔らかい塊を表現した。全体の色・背景・Glassは変更していない。

文字は外殻と別の要素に置く。拡縮・輪郭変形は外殻だけに適用し、文字を歪めない。登場・選択・Focusは短い一度きりの反応で、待機中は静止する。Type切替や候補補充で関係のない候補を作り直さない。長い名前は3行まで表示し、完全な名前をaccessible nameとtitleに残す。

## 6. 候補と検索の意味

- Period: 起動日から1・2・3・6・12か月の5種類と、実際にSessionがある暦月。相対期間はローカル暦日を固定し、両端を含む。同日がない月は月末へ補正する。これは今回採用した境界定義であり、必要なら次回調整できる。
- Machine / Gym: Session履歴に登場したものだけ。有効・無効・削除済みで履歴を除外しない。未使用masterは候補にしない。
- ID: 既存の正規化結果とmasterのsource ID対応を尊重する。存在しない対応や名称は推測しない。名称不明はID付きの不明表示。
- Body Part: 使用されたMachineについて、明示的に解決可能な部位のみ。削除済みでもmaster対応が残っていれば使える。解決不能な部位は推測で追加しない。
- 候補は最大4個。重複・選択済みを除外し、選択後は残りを保持して不足分だけ補充する。Refreshは未提示の候補を優先する。母集団が小さければ同じ候補が残ることはある。
- 同じTypeはOR、違うTypeはAND。判定単位はSessionであり、MachineとBody Partが同じSession内の別Machineに一致しても条件を満たす。
- 期間の重複を含め、Session IDを重複させない。日付降順、同日ならID順。
- 無選択は案内のみ。全件を表示しない。0件は正常なEmpty。条件緩和や推奨・効果判定は生成しない。
- 結果は20件ずつ。条件の追加・解除で1ページ目へ戻る。
- Session Glassを選ぶとExplore内の読み取り専用Dialogを開く。日付、Gym、Machine、セット、メモ等の記録を示す。存在しない時刻や分析判断は生成しない。閉じても候補・条件・ページを維持する。

## 7. Responsive / Accessibility / Reduced Motion

Wideは候補4列、結果3列。中間幅は結果2列。Narrowは候補2列×2行、結果1列とし、Typeも省略しない。

GraphはWideで説明を横へ、Narrowで下へ置く。NarrowのDialogは画面に近い大きさとし、大きいGraphは内部を縦横スクロールする。Dialogヘッダー固定・本文スクロール・背景ロックは既存共通システムを利用する。

BobbleはEnter / Spaceで選択できるbutton。Focus状態はaria-pressed、結果更新は控えめなlive regionで伝える。候補選択後は残る候補、全候補を選択し終えた場合は候補領域へフォーカスを戻す。

OSまたはアプリ設定のReduced Motionでは外殻変形・登場の動きを即時にし、全操作・情報を維持する。結果Glassのhover移動も止める。スクリーンリーダー実機での読み上げ確認は未実施。

## 8. Androidでの注意点

新たな常時GPU処理はない。外殻の陰影は小さな要素に局所化し、Graphは停止状態。結果DOMは最大20件。Explore JS chunkは本番buildで約27.3 kB、gzip約10.5 kB。

ただし大量条件の非重複検査は二乗計算で、Graphの開閉時には再計算する。100条件までの決定性・非重複を自動試験したが、低性能Androidの実測ではない。長い条件名、大量の選択条件、Graphの2方向スクロール、外殻の一時描画コストを実機で確認する必要がある。既存Ambientの性能方針は変更していない。

## 9. 検証

- `pnpm run build:vesria`: PASS。TypeScript検証も含む。既存ApexChartsの大きなchunk警告は継続。
- `pnpm run test src/frontend/vesria/src`: 44件PASS。
- `pnpm run check:all`: PASS。既存script内のnpm呼び出しは変更せず、入口はpnpmで実行。
- 全体 `pnpm run test`: 222 PASS / 1 FAIL。失敗は既存Vue `stepper-contract.test.ts:89` のLF文字列とCRLFソースの比較。対象外のため変更していない。
- 実データ: Repository内のmasterとworkoutファイルを既存parserで読み、実在する月のORが重複なしの全Sessionになることを自動試験。
- ブラウザー: 安定した本番preview、Review dataで1440×1000と390×844を操作。4Type、Refresh、補充、同種OR・異種AND、0件、20＋4件のページ分割、条件変更のページリセット、GraphのFocusと再選択解除、明示解除、Session詳細、Dialogの背景ロック、詳細を閉じた文脈保持を確認。
- Reduced Motion: アプリ設定を有効にしてNarrowで選択・結果表示を操作し、外殻transformなしで機能が維持されることを確認。
- Narrow: 文書の横はみ出しなし。Graph内部のスクロールは意図したもの。解除後のフォーカスを確認。
- Android実機・Windows native: NT。ブラウザー検証を実機PASSとして扱わない。

画面確認は既存ReviewRepositoryの架空データを使用し、Liveへの保存はしていない。実データ試験も読み取り専用。

## 10. Human Reviewで見てほしい点

1. 候補を選ぶ体験が、検索フォームの操作ではなく「気になる記録との出会い」になっているか。
2. Bobbleの柔らかさ・輪郭・文字の安定性。Glassとは別の存在として感じられるか。
3. Graphの1回目Focus／2回目解除が理解しやすく、誤解除しにくいか。
4. NarrowのGraphの内部スクロールと条件説明の読みやすさ。
5. Session Glassの情報量と、詳細を閉じて探索へ戻る感覚。
6. 相対期間の境界、未知の名称の表示、複数Typeの条件の説明。

最終的なGraph採用判定、Android実機計測、スクリーンリーダー実機、大量条件時の追加最適化は次の確認事項。今回の結果を最終デザイン確定とは扱わない。
