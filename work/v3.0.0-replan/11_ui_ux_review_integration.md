# UI・UXレビュー要求のv3.0.0統合

## 1. 位置づけ

`work/ui-ux-review-through-v2.1.0/` に記録されたUI、UX、機能UX、操作UX、運用UXの指摘をv3.0.0の製造対象へ統合する。

元資料の区分を維持し、確定要求と改善候補・未確定事項を混同しない。v3.0.0へ統合することを理由に、元資料で未確定だった文言、表示方式、内部実装を推測で確定してはならない。

UIはWindows / Androidで共有する。Platform別画面を増やさず、必要な差は入力能力や画面幅等の実際の利用条件に基づく軽微な挙動差として扱う。

## 2. 共通UI規則

### ThemeとSemantic Color

- Light / Dark双方で同じ意味を同程度に認識できること。
- Primary Actionと通常LoadingはThemeの`primary`を使用する。
- 状態Badge、Alert、Icon、Select Menu等をThemeへ追従させる。
- 色だけで状態を識別させず、文言等も維持する。
- `変更しました`、`復元できました`、`未解決`等の異なる状態を同じ見た目にしない。
- 画面固有の色値を意味表現として直書きしない。

### Pagination

同じ件数選択UIの表示はFrontend横断で`Show Items`へ統一する。0件時にPagerを表示するかどうかは本件では決定しない。

### Loading Overlay

- Light / Dark双方で処理中であることを明確に認識できること。
- Overlay表示中は少なくとも背面Scrollを禁止する。
- Pointer / Tap、Focus、Keyboard操作が背面へ抜けないことも確認する。
- Overlay解除後は通常操作へ戻ること。

### Dialog

Maintenance系Dialogは、Close、Title、Primary ActionをHeaderへ集約し、Header下にDivider、Bodyに内容を配置する構造を基本とする。Primary / CancelのためだけのFooter空間は原則作らない。

既存のRecovery確認・Commit等の固有契約は、共通Dialog構造の都合で変更しない。

`v-alert`は不要な縦余白を減らし、後続内容との意味的余白を確保する。元資料で明示された対象では`mb-4`相当の余白を維持する。

## 3. Portal / Navigation / Application Shell

- Navigation順序は `Dashboard → Workout Domain → Performance Detail → Analytics → Resource Management → Application Settings` とする。
- PortalとApplication Shell側Navigationで同じ意味順を維持する。
- Responsiveで1列化しても順序を変えない。
- PortalのHover AnimationはHover可能環境で維持する。
- Hover時だけ得られる説明情報をTouch環境で欠落させない。
- Touch環境で説明確認のためだけの二段階Tapを要求しない。
- 狭幅・縦長画面では共通Headerへ常時アクセス可能にする。
- 既存Navigation Drawerの明示操作を維持しつつ、左端からのスワイプで同じDrawerを開く要求を引き継ぐ。横操作との競合を避ける。

FX-25の具体的な固定方式やジェスチャー判定値は未確定であり、現行Shell再構成との整合を見て決定する。

## 4. Dashboard

- Dashboardは「最近どうか」を短時間で把握する画面とし、詳細分析と混同しない。
- 「セット数推移」は「ボリューム推移 - メインジム」と同じ期間範囲を使用する。期間値を別途推測して固定しない。
- 「最近のワークアウト」の`Workout List`導線削除は改善候補であり確定要求ではない。実遷移、RowからDetailsへの導線、Global Navigationを確認し、固有能力を失わないことを確認してから判断する。

## 5. Workout Domain / Workout Detail

### Calendar

- 初期表示はデバイス現在年月。
- 左操作で前月、右操作で翌月へ移動する。
- 現在月では未来月への右操作を無効化する。
- 空月も通常表示する。
- 年跨ぎを通常の月移動として扱う。
- Workoutありの日付Cellから当日の1st Session Detailsへ直接遷移する。
- 同日2nd Session以降はWorkout Record側の既存導線を利用する。
- CalendarへSession選択機能を追加しない。

### Search Target

- Resetは検索条件Gridから分離し、Search Target Header右端のUtility Actionとして扱う。
- Bodyは検索条件だけのResponsive Gridとする。
- Workout Domainは広い画面で3列×2段、Performance Detailは広い画面で3列均等を基準とし、中間幅・狭幅では2列・1列へ自然に変化させる。
- 入力項目の論理順序を維持する。

### Workout Record / Detail

- `MACHINE NAMES`を含むTable HeaderのY軸位置を揃える。列幅、列意味、並び、Sort、Pagination等は本件で変更しない。
- Machine Notesが存在する場合のみ、Workout全体Notesと整合する`NOTES`ラベルを表示する。
- Notesのデータ形式や保存仕様は変更しない。

## 6. Performance Detail

`Main Gym Estimated 1RM`相当のKPIだけが不自然に2行となる状態を解消し、KPI群の縦方向のリズムを揃える。1RM値・計算仕様は変更しない。

最終ラベル文言は元資料で未確定である。`Main Gym Est. 1RM`等を人間確認なしに確定しない。

## 7. Analytics

ユーザー向け期間選択に`7d`、`28d`、`3m`、`6m`等の内部的短縮表記を露出しない。

期間意味は維持する。

- 7d = 直近7日
- 28d = 直近28日
- Month = 当月（暦月）
- 3m = 直近3か月
- 6m = 直近6か月
- All = 全期間

表示を日本語・英語のどちらへ統一するかは元資料で未確定であり、勝手に決定しない。内部値と表示ラベルを分離する。

## 8. Application Settings

### Initial Setup

4枚の状態CardはDesktopの横4枚配置を維持し、内部の不要な上下余白を削減する。2×2化を本要求として採用しない。

### 保存済み状態と未保存状態

次をユーザーが区別できること。

- 保存済み設定が存在し、Formも一致している。
- 保存済み設定は存在するが、Formに未保存変更がある。
- 設定自体が未登録である。

保存失敗時に保存済み状態へ遷移してはならない。具体文言・配置は未確定のため、実装調査後に決定する。

## 9. Resource Management

元資料のFX-16〜21は確定要求と改善候補が混在するため、以下を区別する。

確定または要求本体:
- `影響`等の数値は何を数えているか理解できること。実定義を確認してから命名する。
- Icon Actionの意味をHoverだけに依存せず理解でき、accessible labelを持つこと。
- `v-alert`の密度と後続余白を整理する。
- Dark ThemeのSelect Menu等をThemeへ追従させる。

改善候補・要調査:
- 上位で種別が明確な場合のTable`種別`列削除。
- line情報がない場合の`行`列非表示。
- 新規作成Dialogの最終Title文言。

候補は現行画面状態・API・データを確認せず一律適用しない。

## 10. Recovery UI

RecoveryのCorrectness契約、Draft、Validation、Commit、再解決等の意味論は維持したまま情報設計を改善する。

- Resource Type表示を残す場合は実Typeから動的に決定する。Badge自体を残すかは未確定。
- `下書きあり`と件数をLight / Dark双方で認識可能にする。
- Draftを異常状態として誤認させない。
- Issueは人間向け説明を主要情報とし、内部英語MessageやCodeは診断用の補助情報へ下げる。
- ユーザー判断が必要なFieldと安全に復元済みのFieldで情報密度を分ける。
- `変更しました`、`復元できました`、`未解決`等を意味別に識別できるようにする。
- Dark ThemeでDate Picker Icon、Alert、Select等を視認可能にする。
- Validation stale、Validation結果、Path Warningを同一階層のAlertとして扱わず、今行うべき操作・結果・注意事項を区別する。
- Raw SourceはRead-onlyの補助導線として扱い、主要操作領域を占有させない。削除は確定していない。
- Draft破棄はPrimary Actionとして扱わない。具体配置・確認方式は未確定。
- `修復内容を確認`、`修復を確定`等の主要操作はTheme `primary`を利用する。
- Recovery Commit確認Dialogでは対象データ、保存先、確認結果を走査しやすい構造で表示する。

## 11. 製造時の判断規則

各項目について実装前に元資料と現行実装を照合する。

1. 元資料で確定要求ならv3.0.0の受入対象とする。
2. 改善候補なら、現行実装調査で問題が現在も存在するか確認する。
3. 未確定事項を決めなければ実装できない場合は人間判断へ上げる。
4. v2.2.0までに既に改善済みなら、重複実装せず回帰確認対象とする。
5. UI改善のためにRuntime/API/Data Contractを変更する必要が生じた場合は停止して確認する。
