# Vesria Visual Material / Ambient 統合記録

## 目的と変更範囲

`feature-vesria-full-redesign` の画面構成を保ち、Human Review済みの `feature-ui-v4.0.0` PlaygroundをCyan / Iceの空間へ適応した。Workspaceの情報構造、配置、既存の選択・検索・記録操作は変更していない。Domain / Data / Application Frameworkの契約変更はない。

## 参照した実装

- `src/frontend/v4-visual-playground/src/parameters.ts`：採用された全Pre-Fix値。
- `AmbientParticles.tsx`：下端からの上昇、角度・速度の分布、微小な粒径、発光、寿命に対するフェード。
- `GlassScene.tsx` / `styles.css`：半透明の3色グラデーション、反射マスク、inset highlight、薄い枠、深度の影、低blur。
- `PlasmaScene.tsx` / `CompositionScene.tsx`：`@cruxgarden/plasma-ui@0.7.0` の屈折・分散・縁・融合・粘性設定。
- `work/v4.0.0-plan/visual-playground/PRE-FIX-SPEC.md` / `ARCHITECTURE.md`：各値の意味、未接続の設定、描画器の制約。

新しい基準値は `src/frontend/vesria/src/visual/materials.ts` に集約した。元の値を性能調整で書き換えず、描画予算を別の関数で決める。

## Ambient：空間を途切れさせない

`Ambient.tsx` はApp直下に1つだけ置き、Workspace遷移では破棄しない。情報面より後ろで描画する。

| Pre-Fix | 統合方法 |
|---|---|
| backgroundBrightness 0 / greenIntensity 0 | 背景の明度加算・色面加算なし。ほぼ黒のグラデーションを維持 |
| ambientGlow 33 | 元のalpha係数 `0.33 × 0.34` を維持し、下端のCyan光へ変換 |
| density 100 / spawnRate 100 | 元の5個 / 0.15秒という発生式を保持しつつ、画面面積別の定常数へ間引く |
| riseSpeed 29 | 元の速度式を60fps基準の秒当たり移動量へ変換。0.55〜1.2倍の個体差を保持 |
| drift 120 | 元実装と同様、35度で上昇角のばらつきを制限 |
| particleSize 1 | 半径0.8〜1.35pxの微小な光点 |
| particleGlow 44 | blur 15px相当の光を小さな画像へ先に描く |
| particleOpacity 100 | 最大opacityは1。見えなくする性能調整はしない |
| lifetime 48 / fadeTiming 95 | 45.6秒まで保持し、最後の2.4秒で線形に0へ。0到達後に破棄 |

元のtsParticles Fullは追加していない。使用していた粒子の意味・変換式を小さなCanvas 2D描画器へ移した。tsParticlesの完全な物理挙動や乱数列の再現ではない。初期65個から時間をかけて充填する方式から、年齢を分散した定常配置へ変更し、起動直後から空間が成立するようにした。

通常は最大540個、狭い画面または4論理コア以下では最大220個、最低160個。発生数は最大数 / 48秒で補充する。画面縮小で超過した粒子は2.4秒かけて消し、突然削除しない。画面外へ出た光点が端で折り返すことはない。

色は元のGreen3色から `#96e7ec` / `#59d2e3` / `#d5faff` へ変更。LogoやChartのCyanと連続し、最も明るい芯だけIce寄りにする。

## Glass：暗い板ではなく透明な面

opacity20%、blur2px、saturation106%、border2%、radius16px、reflection65%、glow39%、shadow34%を元の式に接続した。左上の反射は下へ減衰するマスクを持ち、クリックを遮らない。反射・陰影にはアニメーションを付けない。

元のGreenを、淡いIceの反射・深いCyanの透過色・Cyanの弱い外光へ適応した。RailとExploreにあった独自の暗い塗りを取り除き、共通のGlassを通してAmbientが見えるようにした。Dialogは背後の文字との重なりを避けるため、既存の濃い塗りとscrimを維持する。入力欄・エラー色・Chartのカテゴリ色も可読性や意味を優先して保持する。

`borderBrightness:49` は元のCSSでも未使用だったため、値だけ基準に保持し、独自の明るい枠へ接続していない。

## Plasma：直接操作する場所だけ

Exploreの既存Motionドラッグと探索条件はそのままに、`PlasmaOptics.tsx` がDOMの位置を同じライブラリの描画器へ登録する。描画器は選択条件や記録データを所有しない。接触時の見た目の融合と、検索条件の論理的な「重なり」は別の責務である。

`size:100` は既存ノード寸法を等倍で維持する意味とし、viscosity / stretch / blend / flow / opacity / frost / refraction / dispersion / rim / glow / shimmerSpeedはPre-Fix値を直接渡す。TintとrimをCyanに変更し、背景はほぼ黒にする。粒子CanvasやDOMを屈折元として取り込まない点も元実装と同じ。

常時全画面を多重描画しないため、WebGLは操作中と終了後900msだけ作成する。静止時はCSSのIce highlight・色分散した縁・薄い光で質感を残す。この静止表現はシェーダーの厳密な再現ではない。4論理コア以下、Reduced Motion、WebGL2非対応時はCSS表現と既存の操作を使う。画面外・非表示・別WorkspaceではWebGLを持たない。ライブラリはExploreの遅延ロードに含める。

## 性能とReduced Motion

- Ambientは30fps、狭い画面等では24fps。DPR上限は通常1.5、軽量設定1。
- 各粒子のblurを毎フレーム計算せず、3枚の小さな発光画像を再利用する。React stateはフレームごとに更新しない。
- 大きなAmbient光源は110pxのCSS blurからradial gradientへ置換した。
- Plasmaは最大6面、DPR上限は通常1、狭い画面0.7。背景blur・常時の装飾drop・grainは使わない。
- Playgroundライブラリは局所Canvasをサポートしないため、空間的な局所化ではなく、Explore内の操作時間と面数を限定する。ドラッグ開始時のシェーダー初期化コストは実機レビュー対象。
- OSまたはアプリ内Reduced MotionではAmbientを静止画として残し、フレーム予約・発生・寿命更新を停止する。Plasma WebGLは作らない。直接操作と選択ボタンは使える。
- 非表示中はAmbientを停止し、復帰時に経過時間をまとめて進めない。

## 検証

- Visual用4テストと既存Vesria12テスト：16件PASS。
- `pnpm run check:vesria`：PASS。
- `pnpm run check:all`：PASS。既存Svelte、Data、MPAチェックを含む。
- `pnpm run build:vesria`：PASS。既存ApexCharts chunkの500kB超警告は継続。
- Wide 1440×1000 / Narrow 390×844でOverview・Exploreの見た目、横あふれ、Glass越しの光点を確認。
- Narrowでドラッグによる選択、タップによるフォーカス、操作後のPlasma Canvas破棄を確認。
- Reduced Motionで時間を空けた画面画像が一致し、静止Ambientが維持されることを確認。Exploreフォーカスは可能、Plasma Canvas数は0。
- Android実機のGPU負荷・発熱・フレーム時間は未測定。ブラウザーの狭幅検証をAndroid実機試験の代わりには扱わない。

## 次のHuman Review

1. 粒子が明るすぎず、かつ空間として十分に存在するか。45.6秒保持後の消え方が自然か。
2. Rail・Overviewの大きな面で、粒子の奥行きと文字・Chartの可読性が両立しているか。
3. Exploreの静止時と操作時の質感の差、接近した輪郭の融合、離した直後の切り替わりが自然か。
4. Androidでドラッグ開始時に引っ掛かりがないか。軽量設定でもVisual Characterが残っているか。

Pre-Fixは最終確定値ではない。今回の粒子数上限とPlasmaの短時間描画は、実機計測とHuman Reviewに応じて調整可能な適応方針である。
