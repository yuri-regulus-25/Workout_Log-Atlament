# Explore / Bobble Human Review Rework 01

## 対象と維持した仕様

`feature-vesria-full-redesign` 上の未commit変更。Commit / Push / Branch作成は行っていない。

今回のHuman Reviewを基準に、候補の交換方法とGraphの遊べるDragだけを変更した。候補の資格、Type、同種OR・異種AND、即時結果、20件ページング、Session Glass・詳細、Graph・条件説明、固定された空のCoreは維持した。Backend、保存形式、Domain、AF、他Workspaceは変更していない。依存追加なし。

## Candidateが「ｶﾞｯﾀﾝ」と見えた原因

候補はID順の可変配列として描画されており、選んだ候補を除外して残りを前へ詰め、新しい候補を末尾へ足していた。さらに `AnimatePresence mode="popLayout"` が離脱要素をレイアウトから外すため、Grid内の位置が変化した。

候補のID自体は維持していても、位置と偶数番目の余白が変わるため、柔らかい反応ではなく再配置に見える状態だった。

## 固定枠とMotion

- `candidateSlots()` が4枠を管理し、未選択の候補を元のindexへ保持する。候補不足でも空の枠を詰めない。
- 各枠を固定したDOMとし、その内部だけで `AnimatePresence mode="wait"` による離脱→登場を行う。
- 例: `A B C D` → `A B 空 D` → `A B E D`。A/B/DのDOMと位置は変わらない。
- Pickは外殻だけを約0.22秒で少しつぶし、わずかに戻して離脱。文字は変形しない。結果の条件更新は即時。
- 補充時は外殻を93%から小さく戻すSpring。常時反復なし。
- Refresh / Type切替では世代キーを更新し、同じIDが含まれていても集合として交換する。Pickでは世代を更新しない。
- Reduced Motionでは離脱待ちを省き、枠内で即座に交換する。

実操作中に、選択時の外殻の再mountが離脱と競合して補充が停止する問題も見つけた。Candidateでは外殻を再mountせず、離脱MotionそのものがPickの反応を担当するよう修正した。

## Graph Drag

SVGの線とHTML buttonという既存構成を維持した。座標だけを管理する `visual/bobbleDynamics.ts` と、Pointer / RAFのライフサイクルを管理する `workspaces/explore/useBobbleDrag.ts` を追加した。

- Mouse / Penは6 CSS px、Touchは8 CSS pxを超えた時だけDragとして開始する。
- 閾値未満は通常のClick。最初はFocus・説明、同じFocused Bobbleへの次のClickで解除する。
- Drag後に発生するPointer由来のClickはcapture段階で止める。KeyboardのClickは止めない。
- buttonがPointer captureを取得するため、Nodeの外へPointerが出ても追従する。複数Pointerを同時に掴ませない。
- CoreはDrag対象ではなく、d3上でも固定座標を持つ。NodeはGraphキャンバスの内側に留める。
- Nodeの移動は探索条件を変更しない。線だけが新しい座標へ追従し、近接Nodeが衝突を避ける。
- Release後は移動した地点を新しい落ち着き先とする。外殻に短い一度きりの反応を付ける。
- 収束途中で掴み直した場合は一旦停止し、接触位置を新しいDragの基点とする。
- 座標はDialog内の一時状態。閉じて開き直すと、同じ条件集合に対する元の放射状配置へ戻る。探索条件には影響しない。

## Simulationと性能

d3自身のtimerは生成直後に停止したまま。操作中のみ手動tickを実行する。通常時の計算更新は約30 Hz。Pointer位置は入力に直接追従し、ReactのWorkspace全体をフレームごとに再描画しない。transformとSVGの線の終点を更新する。

Release後は最大27 tick、または約900 msで停止する。速度が小さければ早期停止する。停止時は速度・固定点を解放する。Pointer cancel、capture喪失、タブ非表示、Dialog終了、配置変更でも停止し、不要なRAFを残さない。

Reduced Motionでも直接Dragは可能。衝突調整は有限回の同期計算で行い、Release後の慣性・外殻の反復は残さない。

大きなGraphでは衝突計算とNode数分の描画更新が増える。初期配置とは別に、Drag中の多数Nodeと低性能Androidの実測は必要。今回の本番Explore chunkは約33.5 kB、gzip約12.6 kB。新規WebGL・大面積blur・常時Simulationは導入していない。

## Touchとスクロール

追加レビューで「余白も掴んで動かしたい」と指定されたため、Graph枠全体をPointer / Touchのパン領域に変更した。余白DragではscrollLeft / scrollTopだけを更新する。Node自身の座標・条件・CoreのGraph内座標は変わらず、Simulationも開始しない。小さいGraphにも周囲180pxの移動余地を持たせた。

Node上では個別Drag、余白上では全体パン。`touch-action:none` と文字選択抑止はGraph枠内に限定し、枠外のDialog本文は通常スクロールを残す。スクロールバー・ホイール・キーボードの操作も維持する。Narrowでも同じ操作が可能で、機能を省略していない。

## 検証結果

- Vesria: 54テストPASS。固定枠のDOM保持、連続Pick、Refresh、Mouse / Touchの閾値、Drag後の誤解除防止、衝突、有限収束、Reduced Motion、cancel / unmount時のRAF解放、余白パンが座標・条件を変えないことを追加確認。
- Typecheck / 本番Build: PASS。既存ApexChartsの大きなchunk警告は継続。
- `pnpm run check:all`: PASS。
- 全Repositoryテスト: 232 PASS / 1 FAIL。既存Vue `stepper-contract.test.ts:89` のLF / CRLF依存による失敗。対象外のため変更していない。
- 本番preview、Wide 1280×900とNarrow 390×844で操作。Pick後の未操作枠の文書座標不変、補充、連続Pick、Mouse Drag、周囲の回避、Core固定、Release後のidle、Focus済みNodeのDragで条件が残ること、通常の再Clickによる解除を確認。
- NarrowでもPointer Dragを実操作。追加した余白パンはWide / Narrow双方で実操作し、Pointerの移動に一致して表示位置が変わり、Simulationはidleのままであることを確認。
- Touchイベントの処理は自動試験で検証。Android実機の指操作、実際のTouchスクロール競合、実機負荷はNT。NarrowのMouse操作をAndroid実機PASSとは扱わない。
- 画面のデータは既存の未保存Review fixture。Liveデータの変更はしていない。

## Human Reviewで再確認してほしい点

1. Cを選んだとき、A/B/Dに触れていない感覚が保たれているか。
2. Pickの離脱と補充が「ﾌﾟﾙﾝﾁｮ」の一回の反応として自然か。Refreshとの違いが明確か。
3. Graphの追従、衝突で避ける距離、Release後の収束が強すぎないか。
4. Clickの意図とDragの意図が混ざらず、Focus済みNodeでも安心して遊べるか。
5. AndroidでNodeを掴む操作と余白をスクロールする操作が自然に切り替わるか。
