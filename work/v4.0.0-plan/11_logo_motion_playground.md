# Logo Motion Playground — 実寸比較Spike

正式採用前の比較画面。追加依頼によりVesriaのメニューへ「Logo Playground」を追加し、`/logo-playground`でも同じ画面を表示する。独立SPAも維持する。Entry、Ambient、既存Workspace、Data Accessは変更していない。Commit / Pushなし。

## 追加Iteration

- Sparkle（4.1秒）を追加。全要素を消灯し、180ms後から各path / circleを65ms間隔で出現させる。短い輝きの後、全要素が揃ってからLogo内だけで一度フラッシュする。
- 5 Pattern × 4 Size = 20サンプル。再押下拒否、独立再生、終了時cleanupを継続。
- Reduced Motionでは順次出現とフラッシュも無効化する。
- 共通画面を遅延読み込みし、CSSはPlaygroundへ隔離。VesriaのReduced Motion設定も受け取る。データ読込・エラーに依存せず表示できる。
- Build（Vesria / 独立SPA）、関連69テスト、check:allが成功。以下の初回記録は追加前の検証結果。

## 起動

場所: `src/frontend/vesria/logo-playground/`

Repository rootから、ユーザー環境では:

```sh
npm run dev:logo -w @workout-lab/vesria
```

`http://127.0.0.1:5188/`へアクセスする。Productionの5184番ポートとは独立。Agentは`pnpm --filter @workout-lab/vesria run dev:logo`を使用する。

Build: `npm run build:logo -w @workout-lab/vesria`。出力は`logo-playground/dist/`で、Productionのdistへ書き込まない。

## 比較対象

4 Pattern × 4 Size = 16個。140px（Entry）、115px（Entry Narrow）、45px（Rail）、34px（Mobile Trigger）を実寸表示する。WideはPatternごとの横並び、Narrowは2列に折り返す。Logo自体を押す。34pxでも押下領域は44pxを確保するが、SVG自体は拡大しない。

まず全サイズ共通のAnimationを適用した。小サイズだけのDetail省略・Stroke増幅・Glow追加は行っていない。ブラウザーZoom 100%で比較する。

## SVGとMotion

Runtimeの`src/assets/vesria-full-symbol.svg`をViteのraw importで読み、React内にInline SVGとして配置する。Repository所有の固定SVGだけを扱う。Geometryの複製・描き直しは行わない。複数表示でIDが衝突しないようIDを`data-part`へ変換し、読み上げは外側ButtonのPattern / Sizeラベルへ集約する。

| Pattern | 時間 | One-shotの流れ |
| --- | --- | --- |
| Elegant | 2.1秒 | 輪の小さな回転と透過 → 接続線の再形成 → ノードの点灯と控えめなflare |
| Mechanical | 2.3秒 | 2つの軌道が別Timingで段階移動 → 接続が段階的に成立 → ノードが時間差で噛み合う |
| Weird | 2.4秒 | ノードが別方向へ逃げて一時停止 → 輪が左右を見回す → 粒子が妙に回る → 通常へ帰還 |
| Bubble | 1.25秒 | 輪・接続が潰れる → ノードが遅れて追従 → 小さくovershoot → 減衰して静止 |

終了時に再生classを除去し、元SVGのtransform / opacity / strokeへ戻す。恒久的なGeometry変更、音、激しいFlashはない。

## Guard / Accessibility / Performance

各Sampleの同期refで再押下を即時拒否する。React state反映前の同一ターン連打も拒否し、再開・Queue・Speed変更・二重実行をしない。終了timerは各Sample独立で、unmount時に破棄する。

Native buttonによりEnter / Spaceで操作できる。再生中は`aria-disabled`を使い、フォーカスを失うnative disabledへの切替はしない。OSのReduced Motion、またはPlayground内の確認用チェックで、180msのopacity応答へ縮退する。

既存React / Viteだけを使用し、新規依存は追加していない。CSS transform / opacity / stroke-dashoffset中心。Canvas / WebGL / RAF loop / blur filterなし。IdleでAnimationは走らない。

## 検証

- 独立SPAの型チェック・Build: PASS（JS約227kB / gzip約72kB、React込み）。
- Playgroundの6テスト: PASS。SVG Geometry不変、16Sample構成、各Patternの再押下無視、独立再生、終了後の静止復帰、Reduced Motion、unmount cleanup。
- Vesria＋Playground: 13ファイル・68件PASS。
- `pnpm run check:all`: PASS。
- 実ブラウザー: SVG実寸140 / 115 / 45 / 34px、直接Click、Keyboard、各CSS Animationの適用、Reduced Motion時の変形抑制を確認。
- Android実機・指操作・スクリーンリーダー読み上げは未検証。CSSの実機性能はHuman Review後も確認対象。

## Human Review

140pxだけで良し悪しを決めず、45pxと34pxでPersonalityが識別できるかを優先する。Elegantの線形成が小サイズでも見えるか、Mechanicalが単なる回転に見えないか、Weirdが意図的な変さとして読めるか、Bubbleが過剰でないかを確認する。

省略版が必要なら次のIterationでサイズ別Variantを試す。現時点では全サイズ共通利用を確定していない。
