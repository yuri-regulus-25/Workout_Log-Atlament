# Atlament 設計用語集

この文書は Atlament の設計書で使う用語の意味を統一するための用語集である。

本文は原則として日本語で記述し、コード上の識別子、API名、型名、製品名など、英語表記そのものに意味があるものだけ英語を残す。

## 基本概念

| 用語 | 意味 | 補足 |
|---|---|---|
| Atlament | Workout Log を閲覧・管理する本システム全体。 | Windows / Android の Application Framework と複数の画面Applicationを含む。 |
| Workout | トレーニング記録全般。 | 文脈によって Session や Workout Data 全体を曖昧に指さないよう注意する。 |
| Session | 1回のトレーニング記録を表すDomain Entity。 | Domain Identity は `session_id`。 |
| Date | Session の実施日。 | 一覧のグループ化、検索、画面遷移に使用する。SessionのIdentityではない。 |
| Resource | GitHub上で読み書き・検証・修復の対象となるデータ単位。 | Workout Sessionとは別概念。Identityは原則 `path + revision`。 |
| Master Data | Gym / Machine 等の基準情報。 | Workout Data からIDで参照される。 |
| Runtime Data | GitHub上のResourceを検証・正規化し、画面から安全に利用できる形にしたデータ。 | GitHub上のRaw Dataそのものではない。 |
| Domain Identity | Domain Entityを一意に識別する値。 | Workout Sessionでは `session_id`。 |
| Revision | GitHub上のResource内容を特定する版識別情報。 | Recoveryや競合検出で使用する。 |

## データ状態

| 用語 | 意味 | 利用者向け表現の考え方 |
|---|---|---|
| Healthy | Resourceを安全に利用でき、警告事項もない状態。 | 通常は状態名自体を強調表示しない。 |
| Degraded | ResourceまたはRuntimeを利用できるが、確認すべき警告事項がある状態。 | 「利用できますが確認事項があります」等、意味を日本語で示す。 |
| Broken | Resourceを安全に採用できない状態を示す内部状態。 | 利用者向け資料・画面では原則「修復が必要なデータ」等の機能的表現を使う。 |
| Quarantine / 隔離 | Broken Workout ResourceをRuntime採用対象から除外すること。 | GitHub上のfileを別pathへ移動する意味ではない。 |
| LKG | Last Known Good。最後に正常利用できたRuntime。 | 利用者向けには「前回正常に利用できたデータ」等の説明を優先する。 |
| Runtime Available | 現在利用可能なRuntimeがある状態。 | 一部Workout Resourceが隔離されていても成立し得る。 |
| Runtime Unavailable | 安全に利用できるRuntimeがない状態。 | Application利用に影響する。 |
| Missing | 期待されるResourceや参照先が存在しない状態。 | Broken、Deleted、Invalidとは理由を区別する。 |
| Deleted | Master Recordが論理削除されている状態。 | Historical Workout参照のためID自体は保持する。 |
| Invalid / Excluded | Master内に存在したが検証に通らずRuntime採用から除外されたRecord。 | v2.3.0以降の内部区別。Missingと同一視しない。 |

## Recovery

| 用語 | 意味 |
|---|---|
| Data Recovery / データ修復 | 安全に利用できないResourceから回収可能な事実を取り出し、利用者確認を経て正常なResourceへ置き換える機能。 |
| Recovery Draft / 修復下書き | 修復作業中の端末内一時データ。GitHubへ保存されるDomain Resourceではない。 |
| Recoverable Facts / 回収可能な値 | 壊れたResourceから構造的・安全に特定できた元の値。 |
| Suggestion / 候補 | Systemが提示できる修復候補。利用者が確認するまでは確定値ではない。 |
| Stale Draft | 元ResourceのRevisionが変わり、そのまま確定できなくなった修復下書き。 |
| Whole Resource Validation / Resource全体検証 | 修復後候補をResource全体として検証する処理。 |
| Replacement | 修復対象Resourceを正常候補で置き換えること。 |
| Reflection | GitHub保存後に同期・再検査・Runtime再生成を行い、保存結果をApplicationへ反映すること。 |

## Application Framework

| 用語 | 意味 |
|---|---|
| AF / Application Framework | Windows / Android上で動作し、Frontend hosting、GitHub I/O、設定、Runtime生成、Recovery等を担当するNative側基盤。 |
| Platform Adapter | OS固有処理を閉じ込める境界。Filesystem root、credential保護、HTTP server、WebView/lifecycle等を担当する。 |
| Application Storage | Applicationが利用する論理的な保存領域。物理rootとの差をPlatform Adapterで吸収する。 |
| Readiness | Applicationが現在どの程度利用可能かを表す状態。Frontendが独自推論せずAFのstructured factsを使う。 |
| Stable Error Code | UIやclientが処理判断に利用できる安定したerror識別子。人間向けmessageとは分離する。 |

## GitHub / 保存

| 用語 | 意味 |
|---|---|
| Contents API | GitHub上の単一path内容を扱うAPI。Recoveryの同一path置換等に使用できる。 |
| Git Data API | tree / commit / refを直接構築するGitHub API。複数path変更を1 atomic commitにする場合等に使用する。 |
| Optimistic Concurrency / 楽観的競合制御 | 読み取り時のRevision等を前提に保存し、保存直前に変更がないか再確認する方式。 |
| Atomic Commit | 1回の保存操作に必要な変更が、途中状態を残さず1つのGit commitとして成立すること。 |
| Fast-forward | Remote履歴を巻き戻さず、現在headの先へcommitを進める更新。 |

## Frontend

| 用語 | 意味 |
|---|---|
| Application Registry | Hosted ApplicationのID、route、表示名、build/hosting metadata等を管理する単一の基準情報。 |
| Shared Navigation / 共通ナビゲーション | 複数Applicationで共有する画面遷移UIとその意味論。 |
| Common UX Contract / 共通UX契約 | Frameworkが異なっても揃える操作、状態、配置、accessibility、responsive behavior等の契約。 |
| Theme | Light / Dark等の見た目の意味状態。localStorage keyやDOM attributeそのものを意味しない。 |
| Branding | Logo variant等のブランド表示状態。保存方式とは分離する。 |
| Empty State / 空状態 | 表示対象が0件である正常状態。ErrorやBrokenと同一視しない。 |
| Warning State / 注意状態 | 利用可能だが確認事項がある状態。 |
| Error State / エラー状態 | 操作や表示を正常完了できなかった状態。 |

## 集計・比較

| 用語 | 意味 |
|---|---|
| Factual Aggregation / 事実集計 | 記録済みデータを決定論的に合計・件数化・期間集計すること。 |
| Evaluation / 評価 | 成長、良否、不足、刺激、効果等の意味判断。根拠となる明示的モデルなしには行わない。 |
| Performance Comparison / パフォーマンス比較 | Weight / Volume等を能力変化の指標として比較すること。原則として同一Gym・同一Machineの比較可能性を維持する。 |
| Current Calendar Month / 今月 | 利用者のlocal calendarにおける現在月。Rolling 30 daysではない。 |

## 文書表現ルール

設計本文では、意味が変わらない限り次の日本語表現を優先する。

| 避けたい混在表現 | 推奨表現 |
|---|---|
| current behavior | 現行挙動 |
| target behavior | 目標仕様 |
| user-facing | 利用者向け |
| write eligibility | 書き込み可否 |
| source of truth / SoT | 基準情報 / Source of Truth（初出で定義後、必要な場合のみSoT） |
| fallback | 代替利用 / フォールバック（API・内部状態名の場合は英語を保持） |
| issue | 問題 / 警告事項（`ResourceIssue`等の型名は保持） |
| state | 状態 |
| behavior | 挙動 |
| boundary | 境界 |
| contract | 契約 |
| persistence | 永続化 / 保存 |
| validation | 検証 |
| navigation | 画面遷移 / ナビゲーション |

コード、型、route、file path、API endpoint、error code等は無理に日本語化しない。
