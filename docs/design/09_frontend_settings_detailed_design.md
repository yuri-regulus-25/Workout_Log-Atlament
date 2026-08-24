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

Master未登録を含むWorkoutSessionはAFでSession Rejectされるため、Frontendは未解決Master属性を持つWorkoutSessionを前提にしない。

AFの `errors` をユーザーへ通知し、Runtime Dataへ載った正常なWorkoutSessionのみ表示継続してよい。

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
→ Operation失敗

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
artifacts/settings/
```

Settings Artifact欠落は個別画面欠落としてAF degraded。AF全体Fatalにはしない。

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
AF Status
-------------------------
Application    Ready
Runtime Data   Available
GitHub         Available
Credential     Available
```

Status Sectionは参照専用。

---

## 14. Repository Section

編集項目:

```text
Owner
Repository
Ref
Root Path
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
Type
Path
Resource Kind
Required
Empty Allowed
```

正式Resource Type:

```text
WORKOUT
EXERCISE_MASTER
GYM_MASTER
```

`type` は自由入力させずSelect等から選択する。

Unknown Resource Typeをユーザーが作成できるUIにしない。

Resource追加 / 編集 / 削除を可能とする。

保存はSection単位。

---

## 16. Timeout Section

すべて秒単位。

```text
GitHub Request Timeout
Sync Operation Timeout
General API Timeout
Shutdown Timeout
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
GitHub Token 🔒
Configured
[ Enter new token to replace ]

Token Limit Date
[ 2026-12-31 ]

Confidential / Stored securely
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
Remote Data
[ Sync Now ]
```

Sync中はButtonをDisabledにし、重複操作をUI上でも抑止する。

ただし最終的な二重実行防止はAF Operation Stateが保証する。

成功例:

```text
Sync completed.
```

通知対象異常あり:

```text
Sync completed with errors.
2026-08-24 の new-machine が対応する情報がマスターにありません。
追加してください。
```

Remote失敗 / Local利用例:

```text
GitHub access timed out.
Existing local data is still being used.
```

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
