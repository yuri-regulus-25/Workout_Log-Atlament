# Floating Selection Material — Human Review用Spike

正式採用・仕様FIXではない。`feature-vesria-full-redesign`上の未Commit実装。Adopt / Adjust / Dropを人間が判断する。

## ライブラリと責務

- `@base-ui/react` 1.8.0: Selectの選択状態、キーボード操作、フォーカス、Portal、Popupの位置調整。Calendarの外枠はPopover。
- `react-day-picker` 10.0.1: 日本語の日付グリッド、日付選択、矢印キー等の操作、月移動、選択不可日の扱い。Base UIの公開コンポーネントにCalendarがないため補助として使用。
- ライブラリ付属テーマは読み込まない。GlassとLiquidはVesria側のCSSで所有する。

参照: [Base UI Select](https://base-ui.com/react/components/select)、[Popover](https://base-ui.com/react/components/popover)、[DayPickerのアクセシビリティ](https://daypicker.dev/guides/accessibility)、[独自スタイル](https://daypicker.dev/docs/styling)。

## 変更範囲

- `src/frontend/vesria/src/ui/FloatingSelection.tsx`: Select / Date / Monthの薄い入力境界と共通Indicator。
- `src/frontend/vesria/src/ui/floatingSelection.css`: 共通Floating Glass、Liquid、Calendar独自スタイル。
- `src/frontend/vesria/src/ui/floating-selection.test.ts`: 日付変換、選択通知、選択不可日、クリア、Reduced Motionの試験。
- Workout / Machines / Resources / SettingsのSelect、Workout / Analysis / Settingsの日付入力を置換。Workoutの表示月も同じPopupへ統一。
- Vesriaの`package.json`とルート`pnpm-lock.yaml`に依存追加。

既存option定義、値、検証エラーとの紐付け、フィールドID、disabled、日付の上限、任意項目のクリアを維持する。日付はUTCへ変換せずローカル暦で取り扱う。

Workspace配置、Domain/Data/AF、Dialog本体、Ambient、Particle、Light Veil、Bobble、Graphは今回変更していない。色Variationも維持。

## Interaction

### Select

閉じた状態は既存入力に合わせたGlass Trigger。開くと軽い展開とFadeでGlass Popupを表示する。Selectedはチェック、Highlightedは淡いCyanのLiquid面で区別。同じ1枚のIndicatorを次の項目の座標へ155msで移動し、文字は変形しない。

選択値は遅延なく通知する。押下時の短い輪郭応答、Popupの退出、更新後Triggerの160msの輪郭応答を繋ぐ。演出のためのCommit待機は設けていない。

### Calendar

日付グリッドと文字は静止。Focus / Pointerの位置へ同じLiquidが移動する。Selectedは輪郭、Todayは下側の小さな点。月移動ではCalendar内部だけを130msで小さく移動・Fadeする。

直接入力と適用、任意値のクリアも残す。不正な日付や範囲外の入力はエラーを出し、既存値を書き換えない。表示月の入力は日付を選ぶと所属月を確定する試作で、月専用グリッドは未実装。

## Responsive / Accessibility / Performance

Base UIがPopupの衝突を調整し、使用可能な高さを超える場合は内部スクロールする。主な選択対象の高さは44px。既存Native Dialog内では、そのDialogをPortal先にしてtop layer / inertの外に出さない。EscapeでPopupだけを閉じ、親Dialogは維持する。

OSとアプリ双方のReduced Motionを尊重し、Indicatorの移動補間・Popup transition・確定応答・月移動演出を抑制する。情報・選択操作は残す。

常時Animation、Canvas、WebGL、Simulationは追加しない。Indicatorの計測は選択・Pointer・Focus・Scroll・Resizeの発生時だけ。Blurは小さなPopupに限定した静的8px。共有チャンクは約220kB / gzip約71kBで、対象Workspaceのロードに分離される。

## 検証

- `pnpm run check:vesria`: PASS。
- `pnpm run build:vesria`: PASS。既存ApexChartsチャンクのサイズ警告は継続。
- `pnpm run check:all`: PASS。
- Vesria関連: 12ファイル・62件PASS。
- 全体: 240件PASS / 1件FAIL。既存Vueの`stepper-contract.test.ts:89`でLF固定文字列とCRLFソースの比較が失敗。今回その実装・試験は変更していない。
- 開発ビルドで実操作: Calendarの矢印キー・Enter確定、上限日拒否、直接入力、SelectのキーボードHighlight・Pointer Click確定・Escape、Dialog内Portal、編集破棄フロー。
- Wideと390px Narrowで確認。Narrow Calendarは内部スクロールで入力・適用へ到達し、Selectもviewport内に収まることを確認。
- Reduced Motionは自動試験で確認。実際の指操作、Android実機、スクリーンリーダー読み上げ、全Workspaceでの網羅的E2E、GPU定量計測は未実施。

## Human Review

Workoutのセッション追加でGym / Machine、日付Trigger、Analysisの期間選択が入口になる。

1. Glass Popupが既存Ambient / Glassと馴染むか。
2. Pointer / Keyboardの移動が「背景色の切替」ではなくLiquidの移動に感じられるか。
3. 選択済み・操作中・Todayを迷わず見分けられるか。
4. Commitの反応が遅くなく、Motionが過剰でないか。
5. Narrowで操作しやすいか。Popupの透過度と輪郭、Calendarの密度は特にAdjust候補。

Commit / Pushは行っていない。
