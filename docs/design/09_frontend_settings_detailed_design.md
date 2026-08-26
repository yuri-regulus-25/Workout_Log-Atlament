# Frontend改修 / Settings 詳細設計

## 0. 文書目的

本書は AF 導入に伴う Frontend 側改修と、新規 Settings Application の詳細設計を定義する。

対象:

- Portal / Entry
- Dashboard / React
- Workouts / Vue
- Workout Detail / Vue
- Performance Detail / Angular
- Analytics / Svelte
- Settings / SolidJS

AF内部実装および共通JavaScript内部実装は別文書を正とする。

---

## 1. Frontend構成

```text
Portal / Entry
Dashboard                  React
Workouts                   Vue 3
Workout Detail             Vue 3
Performance Detail         Angular
Analytics                  Svelte
Settings                   SolidJS
```

Settings は独立 Application とし、Portal に設定責務を持たせない。

Portal は入口 / Navigation を責務とし、Settings への導線を追加するだけとする。

---

## 2. Frontend共通原則

各 Frontend Framework は以下を直接行わない。

- GitHub通信
- AF APIへの直接fetch
- Local File操作
- OS固有処理
- AF Lifecycle制御
- Master Resolve
- Runtime Data Parse / Normalize

AFとの通信は必ず共通JSのCall Interfaceを利用する。

Frontendの責務:

- UI描画
- User Interaction
- Framework固有State Management
- Routing
- Chart表示
- Error / Warningのユーザー通知
- 共通JSから受領したResultの画面反映

---

## 3. Runtime Data取得

既存画面は原則 `loadRuntimeWorkoutSessions()` の外部Interfaceを維持する。

AF導入後は内部取得元のみ共通JS / AF APIへ変更する。

各画面で個別にデータ取得方式を書き直さない。

現行画面は共通の `WorkoutSession[]` を基礎データとして利用し、画面固有集計は既存 `workout-core` 等で実施する。

AFに画面用集計APIを要求しない。

Master Resolve Failure等により今回のRemote Syncが失敗した場合、Frontendは今回取得分から独自に正常Sessionだけを抽出して部分表示してはならない。AFが維持・提供する最後の正常Local Runtime Dataが利用可能なら、そのRuntime Dataを継続表示する。

---

## 4. Dashboard / React

主な利用情報:

- 月間Workout数
- 月間Set数
- 月間Volume
- Latest Workout
- 直近28SessionのVolume推移
- Set数推移
- 部位別Set数
- 直近Workout一覧

AFからは正規化済み `WorkoutSession[]` を取得し、現行集計ロジックを維持する。

改修対象:

- Runtime Data取得元の共通JS化
- `errors.length > 0` 時の通知表示対応
- AF Runtime Data unavailable 時の表示対応

画面固有AF APIは現時点で作成しない。

---

## 5. Workouts / Vue

主な利用情報:

- Session一覧
- Date
- Gym
- Machine数
- Set数
- Volume
- Machine名一覧
- Machine Filter
- Sort
- Pagination

現行 `WorkoutSession[]` を利用し、Filter / Sort / PaginationはFrontend責務を維持する。

改修対象:

- Runtime Data取得元の共通JS化
- AF Error通知表示
- Runtime unavailable時の表示

---

## 6. Workout Detail / Vue

主な利用情報:

- 指定日Session
- Gym
- Exercise
- Body Part
- Set番号
- Weight
- Reps
- RIR
- Exercise Notes
- Session Notes

Frontendは未解決Master属性を持つWorkoutSessionを前提にしない。

今回のRemote Sync中にMaster Resolve Failureが発生した場合、そのSync SetはRuntime Dataとして確定されない。Frontendは不正Sessionのみを除外して今回のRemote Dataを部分採用してはならず、AFが提供する最後の正常Local Runtime Dataが利用可能ならそれを継続表示する。

Master Resolve FailureはSync Operation失敗として `success:false` と `errors` で通知される。FrontendはFallback済みRuntime Dataの表示可否と、直前のSync Operation成否を別概念として扱う。

---

## 7. Performance Detail / Angular

主な利用情報:

- Exercise一覧
- Exercise履歴
- Latest Date
- Total Sets
- Best Weight
- Best Reps
- Estimated 1RM
- 直近28日の平均Set重量
- Weight推移Chart

集計は共通 `workout-core` / Frontend側責務を維持する。

AFから画面用計算結果を取得しない。

---

## 8. Analytics / Svelte

主な利用情報:

- 全期間Total Sets
- 全期間Total Volume
- Training Frequency
- Average Interval
- SessionごとのVolume
- Body Part Summary
- 直近28日のMachine Variety

集計処理は現行Frontend共通ロジックを維持する。

---

## 9. Error / Warning表示共通ルール

共通JS Result:

```text
success:false
→ Operation失敗。Fallback済みの利用可能なdataが返る場合がある

success:true
→ Operation成立

errors.length > 0
→ ユーザー通知対象あり
```

Frontendは `errors.length > 0` を一律の通知判定として利用可能。

例:

```text
2026-08-24 の new-machine が対応する情報がマスターにありません。
追加してください。
```

Master Resolve Failureにより今回のRemote Runtime Dataを確定できない場合は `success:false` とする。最後の正常Local Runtime DataへのFallbackが成立していても、直前のRemote Sync Operation自体を成功扱いに変更しない。

通知の見た目・配置は各Frontend責務。

Error Codeの `message` 文字列を条件分岐キーとして利用してはならない。

---

## 10. Runtime Data unavailable時

AFが稼働しているが Runtime Data が unavailable の場合、画面全体をクラッシュさせない。

ユーザーへ以下相当を通知可能とする。

```text
Runtime Dataを利用できません。
Settingsを確認してください。
```

Settings / PortalはRuntime Data unavailableでも利用可能とする。

---

## 11. Settings / SolidJS

Settingsは新規独立ApplicationとしてSolidJSで実装する。

SolidStart等のServer機能は使用せず、Build済みStatic ArtifactとしてAFがHostingする。

Route:

```text
/settings/
```

Artifact:

```text
./dist/settings/
```

Source / Framework固有の中間Build Artifactは各Frontend配下に生成してよい。ただし最終的なProduction Artifact / Packaging SourceはRepository直下 `./dist/settings/` に統合する。

Settings Artifact欠落は個別画面欠落としてAF degraded。AF全体Fatalにはしない。

---

## 11.1. Settings UI表示文言

Settings画面の表示文言は以下を基本とする。

- 紫色の小見出しは英語表記。
- 黒色の主見出しは短い日本語表記。
- API値 / Enum値 / 保存値は英語の内部値を維持し、ユーザー向け表示のみ変換してよい。
- AF等の内部実装略称や、技術的な内部処理説明を一般ユーザー向けUIに不用意に露出しない。
- Sensitive Dataは平文表示、Console / Log出力、Frontend Storage保存をしない。

Status値のユーザー向け表示例:

| API値 | UI表示 |
|---|---|
| available / ready | 利用可能 |
| degraded | 一部利用不可 |
| unavailable | 利用不可 |
| unknown | 不明 |
| completed | 完了 |
| idle | 待機中 |
| running | 実行中 |
| failed | 失敗 |
| missing | 未設定 |
| invalid | 無効 |
| expired | 期限切れ |

Required Actionsは以下の形式で表示する。

```text
内部コード / 日本語メッセージ
```

例:

```text
CONFIGURATION_REQUIRED / 設定が必要
CREDENTIAL_REQUIRED / 資格情報が必要
RUNTIME_DATA_REQUIRED / 同期済みデータが必要
```

---

## 12. Settings画面構成

1画面 + Section分割を基本とする。

```text
Settings
├─ AF Status
├─ Repository
├─ Resources
├─ Timeout
├─ Credential
└─ Operations
```

過剰なRoutingや複雑な画面分割を要求しない。

---

## 13. AF Status Section

利用Interface:

```text
getAfStatus()
```

表示対象:

- AF Version
- Application Status
- Runtime Data Status
- GitHub Status
- Credential Status
- Hosting Component Status
- Operation State
- Required Actions

例:

```text
Application Framework Status
-------------------------
Application    利用可能
Runtime Data   利用可能
GitHub         利用可能
Credential     利用可能
```

黒色主見出し:

```text
アプリケーション状況
```

Status Sectionは参照専用。

---

## 14. Repository Section

編集項目:

```text
Owner
Repository
Branch
Root Path
```

紫色小見出し:

```text
GitHub Repository Source
```

黒色主見出し:

```text
リポジトリ接続情報
```

保存はSection単位。

利用Interface:

```text
getConfiguration()
updateConfiguration(...)
```

Repository / Remote Source変更時はAFが保存後にGitHub導通確認を行う。

UIは保存結果と導通確認結果を分離して表示可能とする。

例:

```text
設定は保存しましたが、GitHubへの接続を確認できませんでした。
```

---

## 15. Resources Section

編集対象:

```text
Resource Type
Path
Data Type
必須
Nullable
```

正式Resource Type:

```text
WORKOUT / ワークアウト情報
EXERCISE_MASTER / 種目マスター
GYM_MASTER / ジムマスター
```

`type` は自由入力させずSelect等から選択する。

Resource Typeの内部値は `WORKOUT` / `EXERCISE_MASTER` / `GYM_MASTER` のままとし、UI表示のみ日本語を併記する。

Unknown Resource Typeをユーザーが作成できるUIにしない。

Resource追加 / 編集 / 削除を可能とする。

保存はSection単位。

---

## 16. Timeout Section

すべて秒単位。

```text
GitHub Request (1-120 sec) / GitHub通信
Sync Operation (5-600 sec) / 同期処理
General API (1-120 sec) / API通信
Shutdown (1-60 sec) / 終了処理
```

値:

| 設定 | Default | Min | Max |
|---|---:|---:|---:|
| GitHub Request | 10 | 1 | 120 |
| Sync Operation | 60 | 5 | 600 |
| General API | 30 | 1 | 120 |
| Shutdown | 10 | 1 | 60 |

範囲外入力は保存前またはAF ResponseによりError表示する。

保存はSection単位。

---

## 17. Credential Section

CredentialはSettings画面内で他設定と同居してよいが、機密性をUI上で明示する。

対象:

```text
GitHub Token
Token Limit Date
```

UI上は鍵Icon等を利用し、Confidential Dataであることを明示する。

例:

```text
資格情報 - GitHub Token
設定済み / 未設定
[ GitHub Token ]

Token Limit Date / 有効期限
[ 2026-12-31 ]

登録された情報は、システム内に保存されます。
```

Token値はAFから取得・再表示しない。

既存Token設定済みの場合は `Configured` 等の状態表示のみ。

Token入力はMaskする。

空欄保存で既存Tokenを暗黙削除する仕様にしない。

MVPではCredential削除Operationを追加しない。

---

## 18. Operations Section

Manual Sync操作を提供する。

利用Interface:

```text
syncWorkoutData()
```

例:

```text
リモートデータ同期
[ 今すぐ同期 ]
GitHubから最新データを取得します。
```

Sync中はButtonをDisabledにし、重複操作をUI上でも抑止する。

ただし最終的な二重実行防止はAF Operation Stateが保証する。

Settings画面でAPI処理を実行している間は、画面全体にOverlayを表示する。

- z-index は 2000
- 背景は半透明のShadow / Mask
- 中央にCircular Loaderを表示
- API処理中は二重操作を防止
- 成功 / 失敗 / exception のいずれでもOverlayを解除する
- API処理完了後は、結果通知を確認できるよう画面最上部へスクロールする

この制御はRepository / Resources / Timeout / Credential / Operationsなど、Settings内のAPI操作に横断適用する。

成功例:

```text
Sync completed.
```

Operation成立 + 通知対象異常ありの例:

```text
Sync completed with warnings.
```

Master Resolve Failure等によりRemote Syncが成立せず、最後の正常Local Runtime Dataを継続利用する例:

```text
Sync failed.
The last successfully synchronized local data is still being used.
```

この場合、Sync Resultは `success:false` / `source:local` / `updated:false` / `degraded:true` とし、具体的なError Code / messageを併せて通知する。Fallback成立を理由にSync成功として表示してはならない。

Remote通信失敗 / Local利用についても同様に、直前のRemote Operation成否とLocal Runtime Dataの継続利用可否を分離して表示する。

---

## 19. Settings Save粒度

保存はSection単位。

```text
Repository → Save
Resources  → Save
Timeout    → Save
Credential → Update
Operations → Sync
```

画面全体を一括Saveしない。

変更していない項目は原則送信しない。

Configuration APIのPartial Updateを利用する。

---

## 20. 初回起動 / 設定不足

設定不足でもSettingsを利用可能とする。

```text
AF起動
↓
Configuration Required
↓
HTTP Server / Settings Hosting開始
↓
ユーザーがSettings入力
↓
保存
↓
Manual Sync
↓
Runtime Available
```

設定不足を理由にSettings自身を開けない構成は禁止。

---

## 21. Confidential / Non-Confidential表示

Settings UI上は設定を一元的に扱う。

```text
General / Non-Confidential
├─ Repository
├─ Resources
├─ Timeout
└─ その他AF設定

Confidential
├─ GitHub Token
└─ Token Limit Date
```

保存先はAF側で分離されるため、FrontendはSecure Storage実装を意識しない。

---

## 22. Portal改修

PortalにConfiguration編集責務を持たせない。

Portal変更は原則SettingsへのNavigation追加のみ。

```text
Portal
├─ Dashboard
├─ Workouts
├─ Analytics
└─ Settings
```

PortalからAF設定APIを直接操作しない。

---

## 23. Navigation

各画面からSettingsへの導線は必要に応じ追加可能。

ただしSettings責務を各画面へ分散しない。

設定異常時の通知から `/settings/` へ誘導することは可。

---

## 24. Framework別改修方針

### React / Dashboard

既存表示・集計ロジックを維持し、Runtime LoaderとError表示を対応。

### Vue / Workouts・Detail

既存Filter / Sort / Pagination / Detail描画を維持し、Runtime LoaderとError表示を対応。

### Angular / Performance Detail

既存Exercise履歴・指標計算を維持し、Runtime LoaderとError表示を対応。

### Svelte / Analytics

既存集計・Chart生成を維持し、Runtime LoaderとError表示を対応。

### SolidJS / Settings

新規。Form Binding、Async API、条件表示、Status表示を主用途とする。

---

## 25. Frontend改修規模の考え方

AF導入に伴う既存画面の主要変更は、各画面のデータロジック全面刷新ではなく以下を中心とする。

```text
共通Data LoaderのAF対応
AF Error表示
Runtime unavailable表示
Settingsへの誘導
```

画面集計ロジックをAFへ移動しない。

---

## 26. 禁止事項

- PortalにSettings責務を持たせない。
- 各Frameworkに設定画面を重複実装しない。
- 各FrontendからAFへ直接fetchしない。
- FrontendからGitHubへ直接通信しない。
- FrontendでTokenを永続保存しない。
- Token値をAFから取得して再表示しない。
- Master未登録値をFrontendで捏造補完しない。
- `name:null` / `body_part:null`等の未解決Master属性を持つWorkoutSessionを前提にしない。
- Master Resolve Failure時に今回のRemote Sync結果から正常Sessionのみを独自に部分採用しない。
- `errors.length > 0` を無視しない。
- Error message文字列を制御分岐キーにしない。
- Runtime Data unavailableでApplication全体をクラッシュさせない。
- Settings ArtifactにServer実装を追加しない。
- SettingsにSolidStart等のBackend責務を持たせない。
- 画面別集計APIを必要性なく追加しない。
- Framework比較目的だけで不要な複雑性を追加しない。

---

## 27. 実装完了条件

```text
✓ Settings / SolidJS新規Application
✓ /settings/ Artifact
✓ PortalからSettings導線
✓ AF Status Section
✓ Repository Section
✓ Resources Section
✓ Timeout Section
✓ Credential Section
✓ Manual Sync Section
✓ Confidential UI表示
✓ Section単位Save
✓ Runtime Data取得の共通JS化
✓ React対応
✓ Vue対応
✓ Angular対応
✓ Svelte対応
✓ AF errors通知対応
✓ Runtime unavailable対応
✓ Frontend直接fetch排除
```