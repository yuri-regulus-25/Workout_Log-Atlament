# Vesria — 第2 Implementation Iteration

## 位置付けと参照

- 実装先: `feature-vesria-full-redesign`
- 確認日: 2026-09-27
- 設計基準: `Chat_GPT_Context` の `01_entry_architecture.md`、`02_information_architecture.md`、`03_initial_implementation_brief.md`
- 最優先のレビュー: `04_human_review_01.md`
- 参照した最新コミット: `f2d8eca`（originのChat_GPT_Contextを取得したFETCH_HEAD）

初回のSPA、Workspace構成、Cyan / Ice、Playground由来のAmbient / Glassを維持し、編集の安全性と操作の意味を中心に修正した。旧Atlamentの画面構成へ戻してはいない。保存形式、Domain/Data、Windows/AndroidのAF公開契約は変更していない。

**P0をすべて原因解消済みとする報告ではない。** 元のInvalid hook callとWideの常駐ぼかしは今回の本番ビルドでは再現せず、元の原因は未特定。下記で、修正を確認したものと再確認が必要なものを区別する。

## 1. P0の調査と対応

| 項目 | 原因・調査結果 | 対応と判定 |
| --- | --- | --- |
| Browser BackのInvalid hook call | 変更前の本番ビルドでも再現しなかった。React、ReactDOM、Motion、React Routerの解決先は同じReact 19.3.0だった。元の例外を再現する操作列・実行状態は未特定 | ViteのReact/ReactDOM重複解決を防止。編集の履歴保護に対応するData Routerへ移行。固定した本番ビルドのBack/Forwardは成功。ただし元のP0の原因解消は未証明 |
| Wideの常駐ぼかし・入力遮蔽 | 変更前後の本番ビルドで、遷移完了後のmainはtransformなし。Rail外のヒットテストは本文を指し、SettingsのReduced Motionも直接操作できた | Railの描画を境界内へ明示的にクリップ。局所的な描画境界の補強であり、元の原因特定とは区別。再現確認をHuman Review #2へ残す |
| 未保存編集の喪失 | Workout/Resourcesに共通のdirty判定・履歴離脱保護がなかった | `useEditorGuard`へ共通化。Close/Escape、SPA移動、Back/Forward、document離脱を保護。編集継続は入力を維持し、明示的な破棄のみ離脱。送信中は破棄不可 |
| 内部validation pathの表示 | 入力パスとmessageを本文へ直接連結していた。AF adapterにも同様の連結があった | 入力パスは項目との対応付けに限定。日本語の項目名、項目直下のエラー、入力へ移動できる要約を追加。AFのfieldErrorsも構造を保って渡し、確認画面から入力へ戻す |

### 検証中に発見した別の履歴エラー

プレビューを開いたまま再ビルドした後、Back/Forwardで古い画面へ戻ると、古いハッシュのJavaScriptファイルがなくなり、`Failed to fetch dynamically imported module`が発生した。これはログで原因を確認できたが、元のInvalid hook callとは別の例外である。

React.lazyが保持した読込失敗は、同じ画面の再描画だけでは回復しない。この種の例外では、利用者が「再読み込み」を押したときにdocumentを読み直すようにした。通常の局所的な描画例外はWorkspaceだけ再描画する。自動再送や自動リロードで例外を隠してはいない。

本番ビルドを固定してからOverview → Workout → Back → Forwardをやり直し、各画面の表示完了を確認した。新たな例外はなかった。Human Review中はプレビューの成果物を上書きしないことを推奨する。

## 2. P1の変更

- 遷移アニメーションのキーをWorkspace単位にした。WorkoutのセッションA → B、Machines内の対象切替では画面全体を退出・再生成しない。
- 大きな画面遷移は0.14秒へ短縮。詳細の変更は即時に表示し、安定した一覧を再アニメーションしない。
- データ更新時、既存データがある間は全WorkspaceをLoadingへ置き換えない。保存後も不要な再入場を避ける。
- NarrowのWorkoutは「一覧」と「選択した詳細」を切り替える。選択時に詳細へスクロール・focus移動し、「記録一覧へ」で戻れる。
- Wide詳細とNarrow一覧の独立スクロールを廃止。通常画面はdocumentのスクロールへ整理した。
- 共通Dialog、Exploreの空間操作を下記のとおり変更。
- `WORKSPACES`、`Lens`、操作ボタンの`Merge/Detach`を利用者向け表現へ置換。画面の英語タイトルや既存Workspace名まで一律に翻訳してはいない。

## 3. P2で採用した変更

- **Overview:** 実際の表示データから「Gym × 部位」と一致件数を表示。そこからExploreへ入り、その条件を引き継ぐ。推測の評価や架空の分析結果は追加していない。
- **Analysis:** 操作上の意味が薄かった人体の図を外し、部位別セット数、該当マシン、記録数・チャートの関係を明示した。即時フィルターは維持。
- **Entry:** 自動handoffと競合する手動CTAを削除。準備中／移動中の表示に統一。読込完了後1.6秒、Reduced Motionでは待たずに移動する。履歴はreplaceする。
- **Machines Narrow:** 横に隠れる一覧から2列の選択一覧へ変更。検索と全マシンへの到達性を維持。
- **Navigation:** WideロゴをIdentity-onlyに変更。システム情報は明示的な情報ボタンへ移動。Narrowメニュー表示中にWideへ広がった場合、自動的に閉じる。
- **Local state:** Routeを増やさず、Workoutの一覧／詳細、編集／確認、削除確認、Resourcesの入力／確認を明確化した。

## 4. Preserve対象への影響

Ambientの粒子数・寿命・フェード、Pre-Fix値、Cyan / Ice、Glassの基本値は変更していない。単発freezeを理由に視覚効果を減らしていない。

Wide Railの位置と構成は維持し、ぼかしの漏れを防ぐため描画境界だけ明示した。Exploreの球状Nodeと触感は残し、中央の円を条件の所属先として読み取れる大きさにした。Analysisの人体図だけは、レビューで許可された範囲で、事実の関係を示す一覧へ置き換えた。

新規の本番用libraryはない。テスト用に`jsdom`を追加し、ReactのDialog・履歴保護をDOM上で検証する。既存のMotion、Plasma、MDI、ApexChartsを引き続き利用する。

## 5. Exploreの操作モデル

1. **Focus:** Nodeをタップすると、その条件の説明を表示する。条件にはまだ追加しない。
2. **Merge:** Nodeの中心を中央の円へ移すと「離すと条件に追加」と予告。円内で離した時点で条件に追加する。
3. **所属の表示:** 追加されたNodeは中央の円周付近へ整列し、中心と線でつながる。空間的位置が条件の所属を示す。
4. **Detach:** 追加済みNodeを円の外へ引き離し、離すと解除する。境界付近の誤操作を避けるため、解除境界には28pxの余裕を持たせた。
5. **Result:** 条件確定時に結果を更新。「一致する記録を見る」で結果へ移動する。位置を動かすだけでは保存済みデータは変わらない。

条件はANDで結合する。異なるGymを同時指定した場合は0件になることを明示する。Focus、追加、解除、結果への移動はボタンでも可能。空間表示は最大6件だが、それ以外の部位も同等操作から指定できる。

Pointer cancelは条件を確定しない。空間に表示するNodeが入れ替わった場合は、Plasmaの描画登録も更新する。

## 6. Dialog System

`ui/common.tsx`のDialogをWorkout、Resources、破棄確認、メニュー、システム情報で共用する。

- 左端Close → Title → 右端Primary Action。
- ヘッダーはスクロール領域から分離。本文だけが必要に応じてスクロールする。
- Native dialogのmodal/focus trap/Escapeを利用。閉じた後は元の操作へfocusを戻す。
- bodyを固定してdocumentスクロールを止め、最後のDialogを閉じた時点で元の位置を復元する。破棄確認を重ねても先に解除しない。
- 保存中はCloseとPrimaryの重複操作を抑制する。
- 削除確認は日付、Gym、マシン数・セット数、影響と削除操作だけ。長い無効フォームは表示しない。

Narrowメニューのscroll lock解除が次画面の先頭移動を打ち消す事象を実操作で発見し、解除後にWorkspace移動時のスクロールを行う順序へ修正した。

## 7. Responsive / Accessibility

Wide 1440×1000、Narrow 390×844で操作確認した。Narrowでも作成・編集・削除、マスター管理、分析、探索を削っていない。メニュー→resize→Wide Railで古いModalが残らず、document lockも解除される。

入力エラーに`aria-invalid`と説明との関連付けを追加。要約から入力にfocusできる。ExploreのNodeと同等ボタンは選択状態を読み取れる。DialogのEscape、focus復帰、Narrow詳細へのfocusを確認した。

アプリ内Reduced Motionで画面移動を即時にし、Nodeの整列も即時にする。Direct Manipulationそのものは利用できる。Reduced Motion中に時間を空けた2枚の画面キャプチャが一致し、継続するAmbientの動きが停止していることも確認した。OS設定の尊重は既存実装を維持したが、OS設定自体の切替試験は実施していない。

## 8. Performance / Android

既存の粒子描画上限、更新頻度、低負荷端末での描画切替、背景・非表示時の停止、操作中と短い余韻だけのPlasma描画を維持した。ドラッグ中は条件結果を毎フレーム更新せず、離したときに確定する。レイアウトを作り直すWorkspace遷移も局所切替から除外した。

固定した本番ビルドで単発freezeは再現しなかった。したがって、原因を計測した最適化という主張はしない。Android実機のGPU負荷、長時間動作、native配布での試験は今回NT。Narrowブラウザー試験をAndroid実機PASSとは扱わない。

## 9. Build / Typecheck / Test

| 検証 | 結果 |
| --- | --- |
| `pnpm run build:vesria` | PASS。ApexChartsを含むchunkの500kB超警告は残る |
| `pnpm run check:vesria` | PASS |
| `pnpm run check:all` | PASS。既存Analytics、Data、MPA smoke checkも成功 |
| `pnpm run test src/frontend/vesria/src` | 27件PASS |
| `pnpm run test` | 205件PASS、1件FAIL |
| `git diff --check` | PASS |

全体テストの失敗は既存`workout-manager-vue/src/stepper-contract.test.ts:89`。ソースにCRLFがある一方、期待文字列がLF固定のため失敗する。今回の変更前にも確認された失敗であり、別目的のテスト修正は行っていない。

追加試験には、Merge/Detach境界、条件の重複追加防止、入力名の変換、AFの項目エラーの保持、dirty Back、破棄確認の多重scroll lock、送信中の離脱保護、実際の描画例外からの局所復帰、古いchunk例外の区別を含む。jsdomのmodal APIは補完しているため、native focus動作はブラウザー試験と区別する。

## 10. 実操作の再検証

使用環境: Viteのproduction buildをpreviewで配信。更新・削除はすべてReview data（メモリー内）に限定し、実データへの書込はしていない。

| 対象 | 確認結果 |
| --- | --- |
| Entry → Overview、Back/Forward | 固定ビルドで表示完了。元のInvalid hook callは非再現 |
| Workspace navigation | 各Workspaceへ到達。Narrowメニューから先頭へ移動 |
| Narrow menu → Wide resize | Modal消滅、Rail表示、scroll lock解除 |
| Wide Session A → B | 詳細の対象が即時更新。画面全体の退出なし |
| Narrow Session selection | 一覧が詳細へ切り替わり、詳細上端がviewport内へ移動 |
| Workout Create/Edit/Delete | Wide/Narrow両方で保存・一覧反映・削除後一覧復帰を確認 |
| Dirty abandonment | WorkoutのBackを保留し、編集継続で入力保持。Closeから明示的破棄。ResourcesでもClose/Backを確認 |
| Validation | 空入力の日本語要約・項目エラー、重量エラーから入力へのfocus、修正後保存を確認 |
| Dialog scroll | Wide/Narrowで長い本文を末尾まで移動してもヘッダー位置不変。document固定。Escape後focusが編集ボタンへ復帰 |
| Resources Create/Edit | WideでMachine、NarrowでGymの作成・編集・保存、dirty保護を確認 |
| Analysis | 胸→該当マシン36セット、最新月→12セットなど、期間・部位の即時更新を確認。Narrow横はみ出しなし |
| Explore | WideでFocus/Merge/Detach、同等ボタン、Result。NarrowのReduced Motionでもドラッグ追加・解除、結果3件を確認 |
| Overview → Explore | East side gym × 胸の3件を条件付きで引継ぎ |
| Machines Narrow | 横スクロールなしで末尾のAbdominalを選択、機器別表示へ切替 |
| Reduced Motion | Wideで遮蔽なく設定操作。Narrowでも探索操作可能。静止キャプチャ一致 |
| Route Not Found | 実際の不明URLからOverviewへ復帰 |
| Data Error | Preview表示とは別に、Live接続失敗と再試行、Settingsへの移動、明示的Review切替を確認 |
| Fatal recovery | 意図的なFatal previewで再読み込み→Overview復帰。実際のRuntimeProvider fatal注入試験は未実施 |

Wideの全ページキャプチャには、撮影時の分割合成による重複・継ぎ目が見られた。これだけをアプリのぼかし不具合の証拠として扱わず、実際の入力操作、DOM境界、ヒットテストも併用した。

## 11. Human Review #2で見てほしい箇所

1. 元のBack Fatal、Rail付近のぼかし・遮蔽が同じ環境／手順で再現するか。再現時はURL、直前の操作、ブラウザーの例外ログを残してほしい。
2. 未保存編集の保護が過不足なく、編集を続けたときに入力が残るか。
3. DialogのClose・Title・Primaryの配置と、長いフォームの操作性。
4. Nodeを中央へ重ねる／外す操作が、探索条件の追加／解除として自然に理解できるか。
5. Narrowの一覧→詳細と一覧への復帰、Machines一覧の見通し。
6. Overviewの探索入口、Analysisの部位→マシン→事実が説明なしでも追いやすいか。

## 12. 次回へ残した事項

- 非再現のP0 2件の元の原因特定と、報告環境での再確認。防御的変更だけで完了扱いにしない。
- Android実機の長時間操作・性能計測、Windows/Android native配布のE2E。
- 稼働中のAFに対する実データ更新試験。今回はadapter自動試験と接続失敗時のUI確認に限定。
- スクリーンリーダー実機、OS Reduced Motion切替の試験。
- 大量マスター時の空間配置・6件を超える条件の見せ方、Plasmaの吸着境界の細かなHuman Review。
- ApexChartsのbundleサイズ、既存VueのCRLF依存テスト。
- ロゴのsparkle/easter eggは依頼どおり未実装。

今回、commit/pushは実行していない。初回実装からの未commitファイルを保持したまま、同じ製造ブランチへ変更を追加している。
