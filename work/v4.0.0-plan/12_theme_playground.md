# Vesria Theme Playground 実装記録

## 目的と範囲

Plasma / Abyss / Nightを、人間が同じ情報UI上で切り替えて比較するための独立Design Spikeを追加した。本番Theme System、Settings、Navigation、Domain/Data、Application Frameworkには接続していない。正式なTheme仕様や採用判断を確定する成果物ではない。

場所は `src/frontend/vesria/theme-playground/`。開発時はRepository rootから `pnpm --filter @workout-lab/vesria dev:theme` を実行し、`http://127.0.0.1:5189/` を開く。Build出力は同Directoryの `dist/` で、本番Vesriaの `dist/` と分離する。

## 共通比較構造

Navigation、Header、Overview Surface、Chart、Balance、Recent Records、Bobble、Button、Select、Dialogを固定し、Themeが変更する範囲をAmbient、Light、Color、Surface Material、Motion Personalityに限定した。Ambientのみの表示、Theme既定／Glass／LiquidのMaterial override、Wide／Medium／NarrowのPreview幅、Animation Pause、Reduced Motion相当を比較できる。

Theme切替時も情報UIは同じDOMを維持する。背景の旧Themeと新Themeだけを1.6秒共存させ、opacityでCross Fadeする。Reduced Motion相当では180msへ縮退する。

## Plasma — 静けさ

既存Vesriaの `visual/materials.ts` にあるHuman Review済みGlass値と、`visual/ambientColor.ts` の `#00DDDD` から `#FFFFFF` までの生成時固定色契約を再利用した。さらに本番 `Ambient.tsx` と同じ上昇角・速度差・48秒寿命・末尾2.4秒Fade・160〜540個の画面面積別Budget・24/30fps上限・発光Sprite再利用を、Playground内の表示領域へ適用した。粒子は生存中に色相を変えない。Light Veilは簡略化せず既存 `LightVeil` Componentをそのまま配置し、7本の曲線Trail、12秒の通過、8秒の間隔、生成時固定色を維持した。比較のための新しい装飾物は追加していない。

## Abyss — 艶やか

上方から届く弱い光、極めて薄いcaustics、深度差のある32個の気泡は維持した。初回の放射状の花弁造形はHuman Reviewで不採用となり、花だけを全面的に作り直した。

新しい花は、海底から伸びる3本の透明な深海植物。実在の鈴蘭を写実的に模写せず、横から最初に花と認識できる下向きのベル型花冠を骨格にした。透明面の塗りは弱く、外周、波打つ下端、内側の重なり線、左右で非対称な屈折線、短い花糸と小さな透明球によって形を読む。3本は高さ278 / 382 / 242px、花数3 / 5 / 4、位置、opacity、枝振りを変え、均等配置を避けた。茎は細く、海底側にだけ控えめな透明葉を置く。

追加Human Reviewで植物骨格の接続が不自然と判断されたため、各花を「主茎上の分岐点 → 2つの制御点を持つ細い花柄 → 花冠上端」の構造データへ変更した。花柄pathの終点と花冠の上端は同一座標から生成する。花冠は回転させず重力方向へ下向きに固定し、接続部に小さな萼状のcollarを置いた。花冠単独のAnimationと花を持たない副茎は撤去し、主茎から花柄、花冠へ一方向に読める骨格を優先した。

後続Reviewで鈴蘭方向そのものを廃止した。参照画像1から暗い深紺と局所的なIce Blue、参照画像2から細く垂直な茎、高さの異なる疎な配置、幾何学的な透明花冠という特徴だけを抽出し、具体形状は模写していない。3株・中央主役は維持し、分岐のない主茎を海底から伸ばした。左右の花冠は上端に1つだけ置き、横から見た蓮を基に、奥5枚・中6枚・手前6枚の透明な結晶花弁が重なる構造とした。中央の主役は後続Reviewで百合へ変更し、球根を描かず、曲線で反る6枚の花被片、漏斗状の喉部、6本の雄しべと葯、雌しべによって横向きの百合として読む。百合の形自体を抽象的な結晶へ変形せず、自然な輪郭をそのままガラス細工へ置き換え、透明度、縁の屈折、面の重なりだけで素材感を作る。花被片は付け根から放射状に開かず、中央部を壺形の細い筒としてまとめ、開口部付近だけを外側へ反らせる。中央株は、海底から明確なS字で立ち上がり、中段で左へ振ってから花が開く右方向へ戻る一本の茎とした。下部3節だけに左右交互の帯状葉を残し、上部2枚は撤去した。残る葉は外へ張り出して先端が下へ反る長さを保ちつつ、帯幅を細くした。中央株の茎は12.5px相当、左右は3.2px相当として植物の骨格を明確にした。追加Reviewでは、花弁面と核の白い発光を抑えた。艶ではなく、青い透明面の濃度差、輪郭、花弁同士の重なり線によって立体感を作る。

さらに、閉じた花被片pathを継ぎ足した花冠は線が衝突して崩壊したため、中央株を全面的に再設計した。新しい百合は、参考写真の植物構造を基準に、緩く湾曲する7.5px相当の主茎、長さの異なる5枚の帯状葉、上部から左へ伸びる蕾、右向きに開く1輪で構成する。花冠は重複する花被片の閉じた面を持たず、一続きの外形silhouetteへ5本の境界線を入れて6枚の花被片を示す。ガラス表現は単一の透明面、内側の厚み、縁の屈折、弱い反射線に限定する。

LiquidはGlassの色替えではない。BorderとReflectionを弱め、Radiusを25pxへ広げ、Shadowより透過面の濃度差を使う。常時変形は行わず、Hover / Focus時だけ反射面がわずかに移動する。

## Night — 瞬き

星は位置を固定し、星ごとに異なる周期と位相で輝度だけを変える。少数の星だけが稀に強く煌めき、22秒周期に一度だけ弱い流星を許容した。Plasmaのような上昇・driftは持たず、大半の星が同時に明滅しない。Surfaceは既存Glassを基準に、Nightの冷たい微光を受ける色へ調整した。

## 性能と停止

### 中央株の再制作（2026-09-28、最新）

先行する中央株の造形は不採用。中央の描画パスと専用スタイルを撤去し、`GlassLily.tsx` に茎・葉・花を同一座標系で新規描画した。先細りする曲線の茎、互生する5枚の細長い葉、横向きの一輪を構成する。花被片は奥3枚・手前3枚で、先端間の空間と面の明暗を優先する。雄しべは花被片より弱く表示する。左右の植物の座標・パス・スタイル、背景・気泡・照明・他Themeは変更しない。造形の判定はコード上の枚数ではなく実画面で行い、中央株と全景のスクリーンショットを確認資料とする。

### 百合の配置と気泡の仕上げ（2026-09-28、最新）

中央株の花・茎・葉のpathは変更せず完成形の基準とした。旧左右株は撤去し、同じ百合を縮小・左右反転して左奥へ置く。左奥株は輝度、コントラスト、彩度を抑え、中央株だけを主役とする。右側には植物を配置しない。気泡は塗りつぶしと強い発光を廃止し、ほぼ透明な内部、弱い膜の輪郭、上側の部分反射、一定サイズ以上だけに見える反対側の弱い反射で描く。大きさと反射強度には個体差を持たせる。海底、上方光、caustics、Plasma、Nightは変更しない。

### 描画上限

- Plasmaは既存と同じ160〜540点の面積別Budget、Abyssは32気泡、Nightは96星に上限を固定した。
- 動体はThemeごとに1枚のCanvasへまとめ、React stateをframeごとに更新しない。
- Plasmaは30fps、Abyssは24fps、Nightは20fpsを上限とし、DPRは通常1.4、狭幅1に制限した。
- 百合は中央と左奥の2株に限定し、同じ6枚のSVG花被片を固定pathとして描画する。花被片単位のSimulationや毎frameのpath生成を行わない。
- Surfaceの常時変形、全画面Refraction、重いSVG filter、大面積の動くblurを使わない。
- 非表示ThemeのCanvasは停止する。Cross Fade終了後は旧Themeを非表示にし、長時間の二重描画を避ける。
- Animation PauseではCanvasの時間進行とCSS animationを止める。Reduced Motion相当ではCanvasを静止画にし、CSS animationを無効化する。

## Human Reviewで確認する点

1. Plasmaの情報量を増やさず、Abyss / Nightと人格の差を比較できるか。
2. Abyssの花が最初に横向きの花と認識でき、その次に透明で不思議な深海植物だと感じられるか。
3. 気泡がEffectの主張ではなく、水中認識の補助になっているか。
4. Liquidが柔らかな透明面として成立し、文字・Chartの可読性を維持するか。
5. Nightの星が漂わず、独立した「瞬き」に見えるか。流星が静けさを壊さないか。
6. 1.6秒のCross Fadeで情報の連続性を維持しつつ、世界が遷移した感覚を得られるか。
7. Wide / Medium / NarrowでBobbleやDialogが情報を遮りすぎないか。

## 本番採用前の技術的懸念

- Android実機のGPU負荷、発熱、長時間のframe timeは未計測。
- `backdrop-filter`の端末差と、Liquidの透過濃度は実機確認が必要。
- 独立PlaygroundのCanvas実装は比較用であり、本番Ambientの置換を意味しない。本番へ採用する場合は既存の常駐Ambient寿命、非表示tab停止、Application Shellとの責務境界を改めて設計する。
- Abyssの花の造形・密度、caustics、Nightの流星はHuman ReviewでAdopt / Adjust / Dropを判断する。
