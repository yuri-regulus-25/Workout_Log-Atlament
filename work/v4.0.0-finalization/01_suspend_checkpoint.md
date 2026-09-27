# Vestia 全面刷新 作業記録・残作業整理

## 1. この文書の目的

2026年9月27日から28日未明にかけて実施した全面刷新作業の到達点と、Vestiaとして正式化するまでの残作業を記録する。

この文書は作業再開時の基準点として使用する。
現在の `v4.0.0` は開発上の仮称であり、正式なバージョン番号は後続のバージョン管理方針見直しで再判定する。

## 2. 名称

旧名称 Vesria は、発音時に `sr` が連続して読みにくいため、**Vestia（ヴェスティア）** へ変更する方針とした。

名称変更に伴うソースコード、文書、画面文言、ブランチ名、リポジトリ名等の実変更は未実施である。

現在の実装ブランチは `feature-vesria-full-redesign`。
`feature-vestia-full-redesign` への変更を候補とする。

## 3. ここまでに確定・実施した内容

### 3.1 システム構成・画面構成

従来の Atlament の構成を前提とせず、アプリケーション全体を再設計した。

主要画面は以下とする。

- Entry
- Overview
- Workout
- Machines
- Analysis
- Explore
- Resources
- Settings

Wide / Medium では Rail を常設し、Narrow では左上の Vestia Symbol からナビゲーションを開く。
Bottom Navigation は採用しない。

レスポンシブ対応では、機能を削るのではなく表示方法を変える。

### 3.2 表現体系

以下の役割を定義した。

- Glass: 安定して存在する情報・表示面
- Liquid: 操作・変化・遷移
- Bobble: 選択可能なデータ断片・概念

当初検討していた Plasma は不採用とした。

Bobble は文字を安定させ、外殻のみが生き物のように反応する。
常時揺らさず、出現・選択・操作など必要な場面だけ反応させる。

### 3.3 背景表現

Near-black を基調とし、Cyan / Ice 系の光を使用する。

Particle は生成時に `#00DDDD` から `#FFFFFF` の連続範囲から一色を選び、その個体の生存中は色を変えない。

Light Veil も出現ごとに同じ色範囲から一色を選び、通過中は色を変えない。
Glass の背後をゆっくり通過し、Glass 越しに拡散して見える表現とする。

### 3.4 動作表現

基本方針は、静止中は落ち着き、変化時は流動的に、操作時は即応すること。

- 背景表現は遅く継続的に動く
- 内容の出現は控えめにする
- 操作反応は短く明確にする
- 画面遷移時も背景とナビゲーションは維持する
- 画面内の局所変更で画面全体を再形成しない
- Reduced Motion に対応する
- Android で継続的な高負荷描画を避ける

### 3.5 選択部品・カレンダー

Select、Calendar 等は、Floating Glass Surface と Liquid Selection Indicator を基本表現とする。

表示面は Glass、選択・強調・状態変化は Liquid が担当する。
文字そのものを変形・ぼかしの対象にしない。

### 3.6 各画面

#### Entry

Vestiaへの入口として背景表現、Symbol、名称・説明文を表示する。
手動遷移を常時可能とし、無操作の場合は最大3分で Overview へ移動する。

#### Overview

Workout Log 全体を概観する画面。
複数種類のグラフを利用する。
Explore 専用導線は置かず、共通ナビゲーションから移動する。

#### Workout

Session 単位で閲覧・追加・変更・削除を行う。
Wide / Medium では Session List と Session Detail を独立して縦方向にスクロール可能とする。
Session 切替時は Detail のみ控えめに遷移させる。
変更処理は入力検証、確認、実行、結果の順で扱う。

#### Machines

Machine 単位で Workout Log を閲覧する。
履歴、可視化、比較等を扱い、Machine Master の管理は Resources が担当する。

#### Analysis

条件を指定して記録を調べるための画面。
Body illustration は使用せず、Body Part ごとの記録数、Sets、関連 Machine、グラフ等を明示する。

#### Explore

Workout Data で遊ぶための画面として残す。

Bobble Type は Period、Machine、Gym、Body Part。
同一種類は OR、異なる種類は AND とする。

候補選択時は選択した Bobble のみが抜け、空いた場所に新しい候補を補充する。
Graph 上の Bobble はドラッグ可能だが、位置変更によって検索条件は変化しない。
条件変更後は Search / Apply を要求せず、結果を即時更新する。

#### Resources

Machine / Gym Master の追加・変更・削除を担当する。

#### Settings

実行環境や接続に関する設定を担当する。
試作用の視覚調整機能を本番設定として肥大化させない。

### 3.7 ナビゲーション・ダイアログ

Rail の Logo は識別表示として扱い、ホーム遷移には使用しない。
System Information は明示的な情報表示導線から開く。

ダイアログはヘッダーを固定し、本文を独立してスクロールさせ、背景スクロールを禁止する。
削除確認は簡潔な構成とする。

### 3.8 Logo Motion

Logo Motion Playground で複数案を比較し、Sparkle を正式採用候補とした。

正式採用する場合は、一度だけ再生し、再生中の同一 Logo への操作は無視する。
Reduced Motion に対応する。
現在の外部画像参照方式では SVG 内部要素を個別制御できないため、正式実装時は Inline SVG Component 化を候補とする。

Logo Playground 自体は直近の本体保存対象から除外している。

### 3.9 画面文言棚卸し

`work/v4.0.0-text/` に画面文言を整理済み。

- `00_common.md`
- `01_entry.md`
- `02_overview.md`
- `03_workout.md`
- `04_machines.md`
- `05_analysis.md`
- `06_explore.md`
- `07_resources.md`
- `08_settings.md`

共通文言と各画面文言を分離しており、後続の文言確認に使用する。

## 4. 未解決事項

### 4.1 Browser Back 時の異常終了

過去に Browser Back で Invalid hook call 等の異常終了が発生した。
再読込で復旧した。
その後再現しなくなっているが、原因は確定していないため、Sol Review #2 で再確認する。

### 4.2 Wide Rail 境界の不要なぼかし

Rail 付近に不要なぼかし帯が出現した事象がある。
現在は再現性が低いが原因未確定のため、Sol Review #2 で再確認する。

## 5. 残作業

### 5.1 Vestia への名称変更

Vesria から Vestia へ以下を含めて変更する。

- 画面表示
- ソースコード内の名称
- 文書
- ブランチ名
- 必要に応じたパス・識別子
- リポジトリ名を変更する場合の影響確認

機械的な一括置換ではなく、変更対象を調査してから実施する。

### 5.2 Easter Egg

Sparkle の正式採用を確定し、必要な場所へ組み込む。
Desktop Rail Logo を主候補とする。
ナビゲーション操作を担う Mobile Logo には安易に割り当てない。

### 5.3 文言確認

`work/v4.0.0-text/` を基準に全画面の文言を確認する。

- 日本語と英語の混在
- ボタン・操作名
- 入力検証
- 空状態
- エラー
- 内部用語の露出
- Identity Copy

### 5.4 Android / Windows 用アイコン整備

Vestia Symbol を基準に配布用アイコンを整備する。

Android では Adaptive Icon、Foreground / Background、安全領域、各 Launcher Shape、小サイズ表示を確認する。

Windows では Window、Taskbar、Start 等の各表示サイズを確認し、必要な形式へ展開する。

Web Logo と配布用アイコンは同一の識別体系を維持しつつ、必要であれば小サイズ用に簡略化する。

### 5.5 Windows / Android 連携

Vestia の画面から既存のプラットフォーム固有処理を直接意識させず、アプリケーション向けの Repository / Service と互換層を介して接続する。

読み込み、Workout CUD、Master CUD、異常処理、復旧、Android 実機性能を確認する。

### 5.6 リポジトリ構成の再判定

現行 `Workout_Log-Atlament` をそのまま利用するか、Vestia 用に新しいリポジトリを設けるかを判定する。

さらに、システム用リポジトリと Workout Log / Master Data 用リポジトリを分割できるかを調査する。

判定では以下を確認する。

- 実行時のリポジトリ構造依存
- GitHub API の owner / repo / branch / path 依存
- Windows / Android の読み書き先
- Master と Workout Log の参照関係
- ビルド時・実行時の結合
- Release Lifecycle
- 書き込み競合・復旧
- 既存履歴の維持
- 分割による運用上の利点と欠点

分割を前提とせず、維持と分割の双方を比較して決定する。

### 5.7 バージョン管理方針の見直し

今回の変更は単なる画面改修ではなく、Atlament から Vestia へのシステム刷新であるため、バージョン管理を再設計する。

検討対象:

- Vestia を Atlament の v4.0.0 とするか
- Vestia v1.0.0 として再開始するか
- alpha / beta / rc を利用するか
- System Version
- Workout Data Schema Version
- Configuration Schema Version
- API / AF Contract Version
- Android / Windows の版を同期するか独立させるか
- Git tag と配布物の関係

現在の `v4.0.0` は正式決定まで仮称として扱う。

### 5.8 設計書・文書整備

検討資料と確定設計書を区別し、現在の実装と一致する正式な資料を整備する。

対象例:

- システム構成
- 画面・情報構造
- 各画面の責務
- 表現・動作設計
- データ構造
- Windows / Android 連携
- エラー処理
- リポジトリ構成
- バージョン管理
- データ移行・互換性
- 運用・保守
- 試験方針

#### 文書表記規約

**固有名詞を除き、設計書・作業資料・説明文では原則として日本語を使用する。日本語と英語を不必要に混在させない。**

例:

- 不可: 「Context と Feature を確認して commit する」
- 可: 「ContextブランチとFeatureブランチを確認してコミットする」
- 不可: 「Repository を Split して Migration する」
- 可: 「リポジトリを分割し、データを移行する」

Vestia、GitHub、Windows、Android、画面の正式名称等の固有名詞はそのまま使用できる。

### 5.9 ソースコード整理

設計書整備と並行して実施する。

- 画面単位の分割
- API 単位の分割
- データ取得・更新・入力検証・状態管理等の責務分離
- 巨大ファイル・巨大関数の解体
- 共通処理の整理
- Docコメントの整備
- 処理コメントの整備
- 旧 Atlament、Plasma、試作、未使用処理の除去
- 不要な依存関係の除去

コメントは処理を日本語へ直訳するためではなく、責務、存在理由、特殊条件、回避策等の「なぜ」を説明する。

Docコメント・処理コメントも、固有名詞や言語仕様上必要な識別子等を除き、日本語を原則とする。

分割自体を目的化せず、初見でも「どこに何があり、なぜ存在し、どこまでが責務か」を追跡できる状態を目標とする。

### 5.10 ログデータ・マスタデータのスキーマ再精査

現行形式を既成事実とせず、Vestia が長期間利用する保存形式として十分か再判定する。

- Session の識別・日時
- Machine / Gym 参照
- Sets / Reps / Weight の粒度
- Body Part 等のマスタ情報
- active / deleted / main 等の状態
- Notes 等の任意情報
- 過去データとマスタ変更・削除の関係
- 将来拡張性
- 保存すべき事実の不足
- 導出可能な値の重複保存
- 欠損・不整合・旧形式
- Schema Version
- リポジトリ分割時の参照整合性
- Windows / Android からの安全な読み書き
- 移行可能性

現行形式維持、部分変更、再設計のいずれも結論として許容する。

### 5.11 Git コミットメッセージ規約の確認

システム自身が Git コミットを生成するため、コミットメッセージをデータ履歴仕様の一部として確認する。

対象:

- Workout Session 追加・変更・削除
- Machine / Gym Master 変更
- 複数データ変更
- 復旧・再試行等の特殊ケース

Git 履歴だけでも何が起きたか理解できることを目標とする。

表記規則、日付、session_id、操作種別、Subject / Body、Windows / Android 間の統一、不要な内部情報の露出、リポジトリ分割後の意味等を確認する。

### 5.12 UI 総点検

通常表示だけでなく、操作や状態変化で初めて現れる表示を含め、全 UI を確認する。

特に ApexCharts 等の外部ライブラリが生成する表示も Vestia の UI として扱う。

確認対象:

- Tooltip
- Legend
- Axis Label
- Data Label
- Hover / Active
- 空データ
- 長い名称
- Touch
- 日付・時刻表記
- `07-21` 等の省略日付
- 数値・単位・小数桁
- Select / Calendar / Popover / Dropdown
- Dialog / Snackbar / Validation / Error
- Loading / Empty / Disabled / Focus / Selected
- Pagination
- Scrollbar
- 長文・省略
- Narrow / Medium / Wide
- Keyboard
- Reduced Motion
- Windows / Android の表示差

「表示内容として正しいか」と「Vestia の表現体系として正しいか」の両面から確認する。

### 5.13 セキュリティ・機密情報確認

- GitHub 認証情報
- ログ・エラーへの秘密情報混入
- 設定ファイル
- 誤コミット
- API 入力値
- HTML 表示
- 依存ライブラリの既知脆弱性
- 試験用情報の成果物混入

を確認する。

### 5.14 障害・復旧設計確認

正常系だけでなく以下を確認する。

- ネットワーク切断
- GitHub API 失敗
- 認証切れ
- Repository / Branch 不在
- 書き込み競合
- コミット結果不明
- 読み込み途中失敗
- JSON 破損
- Master 参照切れ
- Windows / Android 通信失敗
- 二重送信
- 再試行
- 書き込み成功後に応答だけ失われた場合

結果不明時に無条件再試行しない等、既存の安全策も Vestia の仕様として再確認する。

### 5.15 データ整合性検証

既存 Workout Log と Master Data 全体に対して、スキーマ違反、ID重複、孤立参照、不正値、欠損、重複 Session、存在しない Master 参照、旧形式残存等を確認する。

可能であれば将来も利用できるデータ健全性検査として残す。

### 5.16 移行・後方互換性

Atlament から Vestia への移行方法を正式化する。

- 既存ログをそのまま読むか
- 変換するか
- 一括移行か読み込み時互換か
- 巻き戻し可能性
- 旧 Windows / Android との混在可否
- 旧形式への書き込み停止時期

を決定する。

### 5.17 試験体系の再構築

単体試験、結合試験、画面試験、データ試験、異常系試験、回帰試験の責務を整理する。

Git 書き込み、競合、データ移行、リポジトリ分割、Windows / Android、レスポンシブ、Touch、Keyboard、Reduced Motion 等を含める。

### 5.18 アクセシビリティ確認

- Keyboard 操作
- Focus 順序・表示
- Dialog の Focus Trap / Restore
- Escape
- ARIA
- Screen Reader 向け名称
- 色だけに依存しない状態表現
- Contrast
- Touch Target
- Chart 情報の代替表現

を確認する。

### 5.19 性能・資源消費確認

特に Android 実機で以下を確認する。

- 初回表示
- 画面遷移
- Ambient
- Light Veil
- Bobble
- Explore Graph
- Dialog
- ApexCharts
- 大量 Workout Log
- メモリ
- CPU / GPU
- Entry 長時間表示

現在だけでなく、ログが長期間蓄積した場合も想定する。

### 5.20 依存関係・ビルド環境整理

- 不要依存
- バージョン固定方針
- lock ファイル
- 開発専用依存
- ビルド警告
- lint
- 型検査
- formatter
- 開発手順
- Windows / Android のビルド再現性

を確認する。

新規環境でも文書に従って構築できる状態を目標とする。

### 5.21 ライセンス・第三者資産確認

MDI、ApexCharts、UI ライブラリ、フォント、アイコン、その他外部資産のライセンスを確認し、必要に応じて NOTICE 等を整備する。

### 5.22 配布・更新方式

- Windows 成果物
- Android 成果物
- Version 注入
- Debug / Release 差分
- 更新方法
- 成果物命名
- Git tag
- GitHub Release
- 巻き戻し

を整理する。

### 5.23 設定値・環境差分

設定項目について、既定値、保存場所、型、入力検証、秘密情報、Windows / Android 共通性、移行、未設定時、不正設定時の復旧を確認する。

不要な設定は削除候補とする。

### 5.24 日付・時刻・単位規約

UI だけでなくシステム全体で、保存日時、表示日時、タイムゾーン、日付境界、日跨ぎ Workout、kg、回数、Sets、小数桁、期間表現等を統一する。

## 6. 最終確認

後半工程では Sol Review #2 を実施し、少なくとも以下を再確認する。

- システム構成
- UI / UX
- Browser Back 異常終了
- Wide Rail 境界のぼかし
- レスポンシブ
- エラー処理
- 性能
- 回帰
- 不要な複雑性
- 不要コード

指摘修正後、ビルド、各種試験、Windows、Android 実機、最終 Human Review を行い、正式な対象範囲と版を確定する。

## 7. 作業分担

ChatGPT は Production Source を直接変更しない。

ChatGPT の担当は、構成設計、画面・操作設計、設計資料、実装指示、確認、監査、壁打ちとする。

ソースコードの実装・変更は Codex / Astra / Sol / Luna 等の実装担当に任せ、人間が最終確認と判断を行う。

## 8. 完成条件

実装、設計書、データ、リポジトリ、バージョン、配布物が、同一の Vestia というシステムを矛盾なく説明できる状態を完成条件とする。

2026年9月27日作業分はここで Suspend とする。
