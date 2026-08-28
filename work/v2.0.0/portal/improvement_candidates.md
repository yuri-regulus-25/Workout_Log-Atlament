# v2.0.0 Portal 改修候補

## 目的

`release-2.0.0-planning` 時点のPortal実装を基準に、v2.0.0で検討可能な機能追加・UI/UX調整候補を広く列挙する。

本書は採用仕様ではなくDiscovery資料である。候補間の優先順位付け、Release Scope確定、詳細設計は後工程で行う。

## 現状整理

PortalはAtlamentのEntry Surfaceであり、各Frontend Applicationへの入口を提供する。

現行実装では以下を持つ。

- Dashboard / Workout Domain / Performance Detail / Analytics / Application SettingsへのApplication Card
- 各ApplicationのFramework表示
- GitHub同期状態のStatus Notice
- Theme / Brand Variantの初期化
- LogoによるBrand Variant切替
- Application NameによるCharacter Easter Egg
- Portal独自Header

Portalは共通Navigation Drawerを持たず、他Applicationとは異なるEntry Surfaceとして扱われている。

---

# 1. Application Launcher 改修候補

## 1.1 Application Cardの情報量調整

現行CardはCategory / Application Name /短い説明 / Frameworkを表示する。

候補:

- Applicationの役割を1行でより具体的に説明する
- 各Applicationで現在利用可能な主要機能を補助表示する
- Framework Badgeの視認性を調整する
- Card全体のhover / focus表現を強化する
- Keyboard focus時の現在位置を明確化する
- Touch Deviceでhover依存にならないInteractionへ整理する
- Application Iconを共通Navigation metadataから取得する
- Application Card生成をNavigation metadataベースへ寄せ、Portal側の重複定義を減らす

## 1.2 Application Cardの状態表示

AF StatusとApplication metadataを利用し、各Applicationが現在利用可能かをPortal上で示す案。

例:

- Runtime Data未取得時にData参照系Applicationへ補助表示
- Hosting Degraded時に該当Application CardへWarning表示
- Configuration不足時にSettings Cardを強調
- Credential不足時にSettingsへの誘導を表示

ただしPortalからApplicationの利用可否を過剰に制御せず、原則としてNavigation自体は維持する。

## 1.3 最近利用したApplication

localStorage等のFrontend-local情報のみで、直近利用したApplicationをPortal上部へ表示する案。

候補:

- Last opened application
- Recent applications
- 前回開いたApplication Cardの軽い強調

GitHub SoTやAF Runtime Dataへ新規状態を保存しない。

## 1.4 Application検索 / Quick Launch

Application数が将来増加した場合に備え、PortalからApplicationを検索・絞り込みできる仕組み。

現時点のApplication数では過剰実装となる可能性が高いため、v2.0.0で新規画面が増える場合に再評価する。

---

# 2. Sync / Runtime Status 改修候補

## 2.1 Status Noticeの情報拡張

現行はloading / success / warning / errorを表示する。

候補:

- 最終同期日時表示
- Startup Sync / Manual Syncの区別
- Local Fallback利用中であることをより明確に表示
- Runtime Dataが何日時点のものか表示
- Warning / ErrorからSettingsへの直接導線
- Manual Sync失敗時の再試行導線
- Status詳細の展開表示

## 2.2 Compact System Status

通常時はStatus Noticeを非表示にする現行挙動を維持しつつ、Portalの一部へ小さなSystem Statusを常設する案。

表示候補:

- Ready / Degraded
- GitHub接続状態
- Runtime Data状態
- 最終同期日時
- Application Version

Settingsとの差別化のため、Portalでは概要のみとする。

## 2.3 Manual Sync Shortcut

PortalからManual Syncを開始できるShortcut。

利点:

- Settingsを経由せず最新データ取得が可能
- Entry Surfaceとして自然

注意:

- Portalに設定責務を戻さない
- Manual Sync API呼出のみとし、Repository / Credential編集はSettingsに残す
- Sync実行中の二重操作防止が必要

## 2.4 Initial Setup Guidance

`RUNTIME_DATA_REQUIRED` やConfiguration / Credential不足時に、初回利用者向けのGuidanceをPortalへ表示する。

例:

1. Application Settingsを開く
2. Repository / Resourcesを設定
3. GitHub Credentialを登録
4. Manual Syncを実行

通常利用時には表示しない。

---

# 3. Workout Dataを利用したEntry Surface候補

PortalをDashboard化しすぎないことを前提に、入口として有用な最小情報だけ表示する案。

## 3.1 Latest Workout Shortcut

最新Workout Sessionが存在する場合、直近Sessionへの直接導線を表示する。

表示候補:

- 日付
- Session名または種目数
- `/workouts/:date` へのリンク

## 3.2 Continue Exploring

直近データを利用して「次に見る場所」を提示する。

例:

- Latest Workoutを見る
- 最近実施したExerciseを見る
- Analyticsを見る

RecommendationではなくNavigation Shortcutとして扱う。

## 3.3 Data Snapshot

Entry Surface向けに極小のSnapshotを表示する案。

候補:

- Total Sessions
- Latest Workout Date
- Tracked Exercises
- Current data range

詳細なKPIやTrendはDashboard / Analyticsへ残す。

## 3.4 Recent Personal Record通知

将来PR判定基盤を導入する場合、直近PRが存在するときのみPortalに軽い通知を出す案。

Portal自身でPR計算は行わず、共通Domain Logicの結果を表示する。

---

# 4. Portal Layout / Visual 改修候補

## 4.1 Hero領域整理

現行の

- `Browse, Explore, Analyze.`
- `What do you want to explore?`
- 日本語説明

の情報階層を再検討する。

候補:

- Product Nameをより強くする
- Application LauncherをFirst Viewへ寄せる
- Desktop / MobileでHero高さを最適化する
- Sync Notice表示時のLayout Shiftを抑える

## 4.2 Responsive Grid改善

新規Application追加を想定してCard Gridを再検討する。

候補:

- 5枚前提から可変枚数前提へ変更
- Wide Desktopで最大列数を制限
- Tabletで2列
- Mobileで1列
- Card高さの統一
- Application追加時に最終行だけ不自然にならない配置

## 4.3 Visual Hierarchy

Applicationごとの差を色だけに依存せず表現する。

候補:

- Category typography
- Icon
- Framework Badge
- Card description
- Arrow / launch affordance

## 4.4 Theme / Brand表現強化

Theme / Brand VariantがPortalの印象へ自然に反映されるよう調整する。

候補:

- Hero background token
- Card accent token
- Brand-specific subtle decoration
- Dark ModeでのCard境界改善

BrandごとにLayoutや機能を分岐させない。

## 4.5 Motion調整

候補:

- Portal初期表示の軽いEntry animation
- Card hover transition
- Status Notice transition改善
- `prefers-reduced-motion`の統一対応

過剰なAnimationはEntry Surfaceの操作性を阻害するため避ける。

---

# 5. Navigation / Cross Application候補

## 5.1 Navigation Metadata完全利用

Portal Application CardをShared Navigation metadataから構築できるようにする。

期待効果:

- Application追加時のPortal更新漏れ防止
- Route / Display Name / Framework metadataの一元化
- 新規Application追加コスト低減

Portal独自の説明文等が必要な場合はmetadata Contractの拡張可否を検討する。

## 5.2 Open in New Window / External-like Launch

Desktop Applicationとして、Application Cardから別Window表示する需要があるか検討する。

ただしWindows / Android共通Frontend Contractを崩す可能性があるため、Platform固有機能として安易に追加しない。

## 5.3 Keyboard Quick Navigation

例:

- 数字キーによるApplication選択
- `/` でQuick Launchへfocus
- Arrow KeyによるCard移動

通常のWeb Accessibilityと衝突しない範囲で検討する。

---

# 6. Accessibility候補

- `<html lang="en">` と実際の日本語主体UIの整合を見直す
- Application Cardの説明とAccessible Nameを整理する
- Sync Noticeの`aria-live`通知頻度を検証する
- 1500ms pollingによる同一内容の再通知がScreen Readerへ影響しないか確認する
- Focus Visibleを全Interactive Elementで統一する
- Brand Logo TriggerのAccessible Labelを現在状態に応じて変更する
- Character Easter Egg Triggerが通常操作を阻害しないことを確認する
- Color ContrastをLight / Dark / Green / Violet全組合せで確認する
- Motion reductionをPortal固有Animationにも適用する

---

# 7. Mobile / Android WebView候補

- Safe Areaを考慮した余白
- Card touch target拡大
- MobileでFramework Badgeが窮屈にならないLayout
- Android Back操作時のPortal挙動確認
- Offline / Local Fallback状態をMobileで読みやすくする
- Status Notice長文時の折返し改善
- Landscape表示確認
- Font scaling時のCard崩れ確認

---

# 8. Developer Experience候補

## 8.1 Portal Card定義のData Driven化

現行HTMLに固定記述されているApplication Cardをmetadata駆動に寄せる。

新規Application追加時の変更箇所を減らすことが主目的。

## 8.2 Status Notice Logic分離

`main.js` 内のStatus polling / 状態遷移 / DOM制御を小さなModuleへ分離する案。

期待効果:

- Test容易性
- Portal main entryの単純化
- Status state transitionの明文化

## 8.3 Portal UI Test追加

候補:

- Status transition
- success timer
- warning継続表示
- API failure
- Application Card route
- Theme / Brand initialization
- Responsive smoke test

---

# 9. v2.0.0で特に相性が良い候補

現時点で比較的効果が高く、PortalのEntry Surface責務を崩しにくいもの。

1. Application CardのNavigation Metadata駆動化
2. Last Sync / Local Fallbackを含むStatus表示改善
3. Warning / ErrorからSettingsへの直接導線
4. Latest Workout Shortcut
5. 新規Application追加を前提としたResponsive Grid再設計
6. Accessibility改善
7. Status Notice LogicのModule分離とTest追加

---

# 10. Portalでは行わない方がよい候補

以下は他Applicationの責務と重複しやすいため、Portalへの導入は慎重に扱う。

- 詳細なWorkout Analytics
- Exercise単位の長期Graph
- Workout編集 / 登録
- Repository / Credentialの直接編集
- 大量のKPI Card
- Recommendation Engine本体
- Platform固有設定

Portalはあくまで「Atlamentへ入った最初の場所」として、入口・状態確認・次のApplicationへの導線を中心に保つ。
