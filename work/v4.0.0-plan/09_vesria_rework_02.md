# Vesria Human Review Rework 02 実装報告

対象: `feature-vesria-full-redesign`。Commit / Pushは実施していない。

## Workout

Session一覧、詳細の外枠、Workspaceは維持し、詳細の中身だけをSession IDで切り替える。Motionの退出は70ms・上へ3px、登場は140ms・下5pxから定位置へのopacity / transform。初期表示では追加の登場を行わない。Reduced Motionでは移動をなくし、切替時間を0にする。

641px以上では一覧と詳細それぞれを高さ制約のある独立した`overflow-y: auto`領域にした。外側の見出し・操作欄は維持する。詳細切替時は詳細だけ先頭へ戻し、一覧のスクロール位置・DOMは保持する。低い画面では最小560pxのWorkspaceを確保するため、外側も必要に応じてスクロールする。

スクロールバーは`scrollbar-width: none`と`::-webkit-scrollbar`で隠す。overflowそのものは禁止しない。Narrowは既存の一覧／詳細切替と通常のページスクロールを維持する。

## Overview / Navigation

- Overview末尾のExplore専用誘導カードと、そのカードだけが使用していた候補算出を削除。活動チャート・部位分布・最近の記録は維持。
- Railはメニューが縮小できず下部が切れる構成だった。`nav`に`min-height: 0`、`flex: 1`、縦方向のoverflowを与え、メニューだけをスクロール可能にした。
- Logoと下部領域は縮めず固定。メニューには20pxの下余白を確保し、スクロールバーはWorkoutと同じ方法で非表示。
- `YOUR RECORDS`とLogo横の文字Identityを削除。Symbolのみとし、Logoへの操作は追加していない。

## Entry

手動ボタン「記録のある空間へ →」または180,000msの待機でOverviewへ進む。どちらも履歴を置き換える。読み込み状態やReduced Motionで待機時間を短縮しない。タイマーはEntryのmount時に開始し、unmount時に破棄する。初期形成をループさせず、その後は既存Ambientと低頻度の光のみが動く。

## Light Veil — 採用未確定の試作

`LightVeil.tsx`と`lightVeil.css`に分離。`enabled: false`で無効化でき、完全撤去もAmbientの呼出しと当該ファイルの削除に限定できる。追加ライブラリはない。

既存の永続Ambient内に置き、Text / Chart / Control / Dialogより後ろで描画する。Cyan / Iceの透過gradientを既存Glass越しに見る構成で、Glass側に専用処理は追加していない。Web Animations APIでtransformとopacityだけを変える。Route依存を持たないため、画面遷移で再生成・再開始しない。

| 調整値 | 初期値 |
| --- | --- |
| 通過時間 | 12秒 |
| 通過後の休止 | 36秒 |
| 初回待機 | 4秒 |
| 最大要素opacity | 0.12（gradient自体にも透過あり） |
| 帯の幅 | 42vw |
| 傾斜 | -24度 |

Reduced Motionでは要素を表示せず、実行中のAnimationも破棄する。非表示タブでは既存Ambientの停止指定と連動してpauseし、復帰時に続行する。毎フレームのReact更新、動くblur/filter、別のCanvasやForce Simulationは追加していない。

Desktopの今回の操作中に明らかな停止・継続的な操作遅延は観測していない。ただしGPU使用率やフレーム時間の定量計測は未実施であり、性能保証ではない。大きな透過レイヤーの合成コストは今後の計測対象。Androidは **Pending real-device verification**。外部公開は行っていない。

## 変更ファイル

すべて`src/frontend/vesria/src/`配下。

- `App.tsx`: Entry分離、Railの不要Label / Text削除。
- `ui/Entry.tsx`: Entryの手動／3分遷移とタイマー寿命。
- `workspaces/Workout.tsx`: Detail内だけの切替、詳細スクロールのリセット。
- `workspaces/Overview.tsx`: Explore誘導削除。
- `styles.css`: Workoutの独立スクロール、Railメニューのoverflow。
- `visual/Ambient.tsx`: 永続Ambient内にLight Veilを配置。
- `visual/LightVeil.tsx` / `visual/lightVeil.css`: 独立した光の帯。
- `ui/entry-veil.test.ts`: タイマー・手動遷移・Veilの再生成抑止／停止の試験。
- `workspaces/workout-panes.test.ts`: Session切替で一覧と外枠を保持し、詳細だけを先頭へ戻す試験。

Domain / Data / AF、保存形式、Dialog、Analysis、Exploreの操作実装は変更していない。Browser Back Fatal StateとRail付近のBlurは、指定どおり別レビュー対象のまま。

## 検証結果

### 自動確認

- `pnpm run check:vesria`: PASS。
- `pnpm run build:vesria`: PASS。既存Chart chunk約937kBのサイズ警告あり。
- `pnpm run check:all`: PASS。Svelte診断0件、実データ試験4件、MPAの9ページと5つの404を確認。
- `pnpm run test src/frontend/vesria/src`: 10ファイル・58件PASS。
- `pnpm run test`: 236件PASS、1件FAIL。既存`stepper-contract.test.ts:89`のLF文字列とCRLFソースの比較が失敗。今回そのVue実装・試験は変更していない。
- `git diff --check`: PASS（追跡済み差分）。今回のVesriaは既存作業から未追跡のため、この結果だけで全SPAを検査したとは扱わない。

### Production buildでの実操作

架空のReview dataを使用し、保存・外部送信は行っていない。

- Wide 1280×900: 一覧と詳細のホイールスクロールを別々に確認。一覧900px／詳細約447pxへ独立して動き、外側は0px。詳細切替でWorkspace全体のtransformは動かず、詳細だけ切替。
- Wide 1280×360 / Medium 900×360: メニューのみをスクロールしSettingsへ到達。Logo位置は固定。通常高さでも全メニューを表示。
- Narrow 390×844: Session選択後は一覧を隠す既存構成を維持。詳細は通常スクロール。編集Dialogを開閉し、フォーム表示を確認。
- Overview: 専用Explore誘導なし。24セッション・252セットの集計、チャート、最近の記録を確認。
- Narrow Navigation: Workout → Analysis → Exploreの移動を確認。Analysisの集計とチャート、ExploreのPick・結果更新・Graph Dialog・条件説明を確認。
- Entry: 128秒時点で滞在継続、その後の確認で自動Overview遷移済み。実時間の遷移瞬間は計測していない。180秒の境界は自動テストで確認。手動ボタンも実操作で確認。
- Light Veil: 通過中のopacity / transformの変化と画面を確認。Route切替中も開始位置に戻らず通過を継続。設定のReduced MotionをONにすると要素が消え、OFFで復帰することを確認。

MediumのWorkout両ペイン、実機Touch、Exploreの全Drag／衝突条件は今回の実操作では網羅していない。前回受入済みのExploreコードは維持し、関連自動試験は成功している。これを実機・全操作の再試験PASSとは扱わない。

## Human Reviewで見てほしい点

1. Sessionを続けて選んだとき、詳細だけが控えめに切り替わるか。
2. 一覧と詳細の高さ・スクロール範囲が普段の画面サイズで適切か。
3. 低い画面でRail最下部に到達しやすく、最後の項目の余白が十分か。
4. Entryを眺める時間と手動ボタンの存在感が適切か。
5. Light VeilはGlassの奥の淡い光として成立するか。Adopt / Adjust / Dropを判断し、必要なら上記初期値を調整する。
