# Vesria 初回フルリデザイン — 実装とHuman Review

実施日: 2026-09-27

製造ブランチ: `feature-vesria-full-redesign`

## 1. 今回の到達点

Entryから全Workspaceを一続きに操作できる、新しいResponsive SPAを実装した。既存画面の順次改修ではなく、1つのReact Application Rootの下にVesriaの画面構成を作っている。既存Domain/Data・保存形式・Windows/Android AF契約には変更を加えていない。

この段階の目的はHuman Reviewであり、Native配布の置き換えや最終デザインの確定ではない。ブラウザーでの確認と、実機で確認していない範囲を明確に分ける。

### 参照した基準

- `origin/Chat_GPT_Context` = `98f2ca8669c14c16bfe612413f5912086009f8be`。
- 同ブランチの `01_entry_architecture.md`、`02_information_architecture.md`、`03_initial_implementation_brief.md`、`logo/vesria-full-symbol.svg`。
- Domain/Data/AF baseline: `origin/develop` = `32b6f96c247ff523776839a3c92634103bdfd9e0`。
- 現行 `frontend-common` のWorkout/Master書き込み契約、Workout Managerの入力検証、`workout-core` の集計・マスター検証、`workout-data` のRuntime読込・正規化。
- `docs/design/02_detailed-design/application-framework/` とマスタースキーマ文書。

初期Entry資料にある旧称Dashboard等より、新しいIAとInitial Implementation BriefのOverview・常駐Railを優先した。AFの古い一覧に書き込みAPIが不足している箇所は、baseline上の実装と現行型定義を確認し、既存v3.1のWorkout Writeを使用した。新しいBackend APIを推測して増設してはいない。

## 2. Application Architecture

```text
BrowserRouter
└─ RuntimeProvider（接続先、取得結果、通知、動きの設定）
   └─ App（常駐背景、Global Navigation、Route Presentation）
      ├─ Entry / Overview / Workout / Machines
      ├─ Analysis / Explore / Resources / Settings
      └─ Dialog / Snackbar / 状態表示

Workspace
  → VesriaRepository（画面向けの交換可能な契約）
      ├─ LegacyAfRepository → 既存localhost AF
      └─ ReviewRepository → メモリー内の架空データ
```

`src/frontend/vesria` は独立したworkspace package。旧Portal、Shell、Maintenance、frameworkごとのMPA分割は持ち込んでいない。`frontend-common` からは検証済み入力の型を継承するが、旧ナビゲーション・ブランド・テーマ・画面コンポーネントは利用しない。

画面遷移では画面内容だけを入れ替える。背景・ナビゲーション・RuntimeProviderは常駐する。接続先切り替え時は、古い通信結果を世代番号で破棄し、前のモードのデータが遅れて混ざることを防ぐ。

ルートは `/`、`/overview`、`/workouts`、`/workouts/:sessionId`、`/machines`、`/machines/:machineId`、`/analysis`、`/explore`、`/resources`、`/settings`。一時的なダイアログ、フィルター、探索モードはURLに増設していない。

## 3. Workspaceごとの見せ方と操作

| Workspace | 構成・代表操作 |
| --- | --- |
| Entry | 正式シンボルと短い導入。通常はOverviewへ自動で引き渡す。深いURLでは再生しない。 |
| Overview | 大きなタイポグラフィ、日別活動グラフ、部位別ドーナツ、直近セッション。記録数・日数・セット数を俯瞰する。 |
| Workout | 日付とsession_idのタイムライン＋詳細。日付が同じでも別セッションとして扱う。追加・更新・削除は検証→確認→実行→通知。 |
| Machine-oriented View | マシン索引＋履歴のグラフ。Gymを切り替え、同一Gym・同一Machineの最大記録重量を比較。履歴からWorkoutへ移動できる。マスター編集は置かない。 |
| Analysis | 期間選択、最新の記録月、部位のBody Lens、日別セット数、部位分布。Body Mapは分類を選ぶ補助で、身体状態の診断ではない。 |
| Explore | Plasmaノードを動かす・Focusする。Gymと部位を選び、Mergeで条件の交差を確認、Detachで解除。Resultから記録を開く。保存処理は持たない。 |
| Resources | Machine/Gymの一覧と編集Dialog。名前・分類・別名・旧ID対応・有効状態・論理削除/復元、Main Gym切り替えを扱う。 |
| Settings | Review/Live切り替え、Runtime状態、同期、Owner/Repository/Branch/Root path、Credential。Reduced Motionと初回レビュー用の状態プレビューもここで設定する。 |

グラフには同じ値を読める表を付けた。部位不明・削除済み参照は推測で補完しない。Workoutの一部記録はPartialとして表示する。筋力向上・運動効果・不足の診断や、異なる設備の重量を混ぜた順位付けは実装していない。

## 4. Libraryと責務

| Library | 採用理由 |
| --- | --- |
| React / React DOM | 1つのApplication Rootと画面状態の管理。既存Repositoryで利用中の系統を継続。 |
| React Router DOM 7 | SPAのWorkspace URL、直接アクセス、戻る/進む。新規追加。 |
| Motion 13 | 左方向への画面退出、次画面の控えめな形成、Exploreのドラッグと直接操作時の変形。新規追加。 |
| ApexCharts / react-apexcharts | 面・棒・ドーナツによる記録の可視化。指定の標準ライブラリを利用。遅延読込。 |
| @mdi/js | 標準アイコン。SVG pathのみを利用し、アイコンフォントを追加しない。 |
| @fontsource/dm-sans | 欧文フォントをローカル配布し、外部フォントサービスに実行時依存しない。日本語は端末フォントへフォールバック。新規追加。 |
| workout-types / workout-core / workout-data | 既存の型、セット集計、表示名解決、マスター検証、Runtime読込、架空記録の正規化を再利用。 |

常時WebGLや重量級パーティクルエンジンは導入していない。背景は最大12点のCSS粒子で十分に役割を果たせるため。ライブラリ数の少なさではなく、役割と性能を基準に選んだ。

## 5. Legacy AF compatibility boundary

AFのURL・HTTPメソッド・envelope解釈は `infrastructure/legacy-af.ts` に集約した。画面は `load / edit / mutate / master / saveMaster / connection / configure / credential / sync` だけを呼ぶ。

- Status/readinessがunconfigured・unavailableなら通常データ表示を制限し、Settingsは開ける。
- degraded・fallbackの状態を保持する。編集可能性はAFのWrite Boundaryで確認する。
- Runtimeの必須マスター欠落はData Error。正当な空の記録と区別する。
- Workoutの編集開始時に日付snapshotとexpectedContextを取得する。session_idとsourceIndexを維持し、未編集の既存情報を保全する。
- Master編集は最新document内容とrevisionを組にして使う。既存の検証とMain Gym制約を守る。
- 永続書き込み前には必ず確認画面を挟む。失敗時は入力を残す。
- 通信途絶・応答不明時は自動再送しない。「保存済みの可能性」を伝える。
- Workoutでremote commitが成立しreflectionだけ失敗した場合は、保存済みの警告として扱う。再実行ボタンへ戻さない。
- Tokenはメモリー内の入力値だけで保持し、成功時に破棄。localStorage等には保存しない。
- 旧Recovery/Draft APIはWorkspaceとして復活させない。

開発時はViteが `/api` を `VESRIA_AF_ORIGIN`（既定5180番）へ転送する。本番は同一originでSPA fallbackとAFをホストする必要がある。今回、Windows/Androidの配布ホストは切り替えていない。

## 6. Responsive / Material / Motion

- Wide: 文字付きRail。Medium: 名前付きアイコンRail。Narrow（640px以下）: 左上48pxのシンボルボタンからナビゲーションDialogを開く。Bottom Navigationはない。
- 画面幅に応じて並列ペインを縦に並べ替える。Machineの索引と履歴帯は局所的に横スクロールする。狭い画面でも編集・削除・分析条件・探索の機能を削らない。
- Glassは静かな情報面。背景ぼかしは主にRail、浮動トリガー、Dialogの背面に限定する。各カードを大量にぼかさない。
- Liquidは操作。押下・選択・画面変更に伴う短い位置/形状/色の反応を与える。Resourcesの安定した情報行と、変更を行う編集ボタンも分けた。
- PlasmaはExploreの直接操作。触れている間だけ変形し、選択条件と結果が変化する。空間表示は6ノード以内に制限し、全条件は同等のボタン操作でも利用できる。
- 通常遷移は約0.22秒。現画面が左へ抜け、初期スクロール位置から次画面が形成される。戻る/進むにも同じ規則を使う。
- Dialog・Snackbarは短いopacity/transformの形成。処理完了は演出完了を待たない。
- OSのReduced Motionと画面設定の両方を尊重。画面移動・粒子・チャート補間・直接操作時の装飾変形を簡略化する。操作自体は維持する。
- 背景粒子はWideで12、Narrowで5。非表示タブでは停止。常時Canvas/WebGLや毎フレームのReact更新はない。
- WorkspaceとChartを分割ロード。ApexChartsのchunkは約937kB（gzip約268kB）で警告が出る。これを隠す設定は入れていない。初回読込サイズのさらなる最適化は次の計測課題。

## 7. Mock / Fixtureの範囲

`ReviewRepository` に、24セッション・6マシン・2Gymの架空記録とメモリー内CRUDを隔離した。既存parserとvalidatorを通し、実データと同じ形で画面へ渡す。日付は起動日の周辺に配置する。数値はレビュー用の決定的な値で、運動成果の判断を含まない。

初期モードはReview data。画面上で常に架空・未保存と分かる。モード変更や再読み込みで初期化する。Liveの障害時にFixtureへ自動フォールバックしない。

状態プレビューは見た目の検討用である。実際のエラーを故意に発生させるものではなく、画面にもその区別を表示する。

## 8. 検証

- Vesria TypeScript check: PASS。
- Vesria production build: PASS。ApexChartsのchunk-size警告あり。
- 新規の境界・集計・検証テスト: 12件PASS。架空データの正規化、同日別session_id、競合、未編集情報保持、対象ID削除、Main Gym、比較条件、入力制約、通信途絶、reflection失敗、readiness、fallback、必須データ欠落、暦日を確認。
- `pnpm run check:all`: PASS。既存Svelteチェック、実データ4テスト、MPA 9ページ＋5種類の404を確認。
- 全体テスト: **190件PASS / 1件FAIL（30ファイル中29ファイルPASS）**。既存のWorkout Manager `stepper-contract.test.ts:89` の1件がFAIL。LF固定の文字列検査に対し作業コピーがCRLFであるため。該当既存Source/Testは変更していない。
- ブラウザー: Entry→Overview、全7Workspaceの到達、390/768/1440px、Narrowナビゲーション、Workoutの必須検証・追加・編集・削除・通知、Resources追加、Analysis部位選択、MachineのGym切り替え、ExploreのFocus/Merge/Detach/Result、状態プレビュー、Reduced Motion設定、不明ルートを確認。
- 検証で見つけたNarrowメニューのラベル欠落と、Machine履歴帯の横はみ出しを修正。
- 修正後の全7Workspace × 3幅（21組み合わせ）でページ全体の横はみ出しなし。戻る/進むで同じ遷移と先頭スクロールへの復帰を確認。最終ブラウザー確認時のconsole errorなし。
- 実データへの書き込みは実行していない。AFの呼出形状と失敗契約はテスト用応答で検証した。
- Windows native / Android実機E2E: NT（今回のブラウザー試験を実機PASSとは扱わない）。Backend/Nativeコードは変更していない。

## 9. Human Reviewの順番

1. Repositoryルートで `npm run dev:vesria` を実行し、5184番を開く。
2. Overviewを眺める。情報密度、文字の大小、Glassの境界、背景の存在感を確認する。
3. Workoutでセッションを追加し、入力を戻す・確認する・保存する。別セッションを編集/削除する。
4. MachineからGymを切り替えて履歴を見る。Workoutへ戻る導線を確認する。
5. Analysisで期間と部位を変える。必要な粒度、Body Lensの分かりやすさを検討する。
6. Exploreでノードを動かし、選択・条件の重なり・解除・結果の意味が伝わるか確認する。
7. ResourcesでMachine/Gymの変更を試す。Main Gym制約や論理削除が理解できるか確認する。
8. 画面幅を狭め、同じ操作を繰り返す。ナビゲーション、入力欄、横スクロール範囲を確認する。
9. SettingsからReduced Motionと各状態プレビューを試す。

特に見てほしい点は、「Vesriaらしい静かな観察と触りたくなる直接操作が両立しているか」「Workspaceごとの構成が責務に合うか」「Narrowで操作の意味が失われないか」の3点。

## 10. 意図的に次へ残したもの

- Human Reviewを受けた色・Glass形状・タイポグラフィ・モーション曲線の最終調整。
- Windows/Androidの配布ホストをVesriaへ切り替える工程と、実AF・実機での接続/書き込み/性能試験。
- 大量記録・多数マスターでの検索、仮想化、読込時間・ApexChartsのbundle最適化。
- Exploreの空間配置アルゴリズムとMerge/Detachの演出精度。初回は最大6ノード＋全条件ボタンで方向性を検証する。
- Settingsの任意の高度なAF設定（resource path一覧、timeout群）の詳細編集。今回の画面は要求された接続先と認証・同期を中心にした。
- 外部の読み上げ支援技術、Androidの実タッチ/ソフトキーボード、端末別GPU負荷の測定。

以上を「未実装のWorkspace」の代わりにはしていない。全Workspaceにはレビューできる操作を用意し、残項目は実環境での仕上げ・深化として分離している。
