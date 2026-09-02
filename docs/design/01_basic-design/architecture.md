# Architecture

Atlament は GitHub 上の原本データ、Application Framework（AF）、共通 Domain、Frontend を分離する。

```text
GitHub repository
  ├─ Master Data
  └─ Workout Data
        ↓
Application Framework
  ├─ GitHub 同期
  ├─ 検証・参照解決
  ├─ Local Runtime Data
  ├─ 設定・認証情報
  ├─ localhost HTTP API
  └─ Frontend 配信
        ↓
Shared / Domain packages
        ↓
Frontend MPA applications
```

現行実装の事実と、将来実装にも適用する設計原則は区別する。横断的な判断基準は [共通設計原則](./design-principles.md) を正とする。

## 責務境界

GitHub は Workout Data と Master Data の外部 Source of Truth である。

AF の責務:

- GitHub への接続
- 設定管理
- 認証情報の安全な保存
- Runtime Data の生成・保存
- Runtime Data に含まれる Local Master snapshot の管理
- localhost API
- Frontend artifact 配信
- Native shell lifecycle
- Domain / system state の確定
- GitHub への変更が許可される操作では、用途を限定した書き込み境界を提供する

Shared / Domain package の責務:

- 共通 TypeScript 型と API 契約
- Workout の純粋計算
- Workout / Master の検証・正規化に利用する共通規則
- Frontend 共通 client
- Application metadata と navigation
- Theme、Branding、page transition
- Design Token と共通 CSS

Frontend application の責務:

- 画面固有の表示
- 利用者入力
- 画面固有の一時状態
- Application 内の route handling
- visual composition と chart configuration

Frontend は Resource Health、readiness、write eligibility 等の Domain / system state を独自に推測しない。

## プラットフォーム境界

- Workout Log registration or editing
- arbitrary Master Data editing outside Resource Management fixed allowlist
- GitHub write APIs outside Machine/Gym Master write
- multi-user server APIs
- public web hosting
- installer generation
- Android AAB / Google Play packaging
- Planning段階にのみ存在する未実装Application

## Data Correctness Boundary

現行実装では Raw JSON / JSONL parsing と technical validation を Runtime Data 採用前に実行する。Master reference は Runtime Data 生成中に `resolved` / `missing` / `deleted` として記録される。`missing` / `deleted` は warning として報告するが、Workout session 自体は Runtime Data として利用できる。

Remote GitHub から Local Runtime / Local Master snapshot への同期は Wake Up / Settings Sync が担当する。Resource Management の Master read は Local Master snapshot を使用し、Remote Master body を表示目的で独自取得しない。

### v2.1.0 以降へ適用する契約

v2.1.0 Recovery の実装反映時は、単純な「検証成功 / 失敗」だけでなく Resource 単位の Health を Architecture に昇格する。

- `Healthy`: 安全に採用可能。
- `Degraded`: 採用可能だが確認事項がある。
- `Broken`: 安全に採用できず、Recovery 対象になり得る。

Workout Resource が Broken の場合は、その Resource 全体を最新 Runtime から隔離する。他の健全な Workout Resource は継続利用できる。Master Resource が Broken の場合は新しい Runtime を構築せず、利用可能な whole-runtime LKG があれば継続利用し、なければ Runtime unavailable とする。

Recovery は Broken Resource を通常 Domain Resource へ戻すための専用境界であり、Raw editor や汎用 Git write ではない。Recovery の状態判定・検証・書き込み可否は AF / Domain 側で確定し、Frontend は表示と利用者入力を担当する。

## GitHub 書き込み境界

GitHub write は「Master だけ」「Workout は絶対に書かない」といったデータ種別だけでは定義しない。**用途を限定した Domain operation ごとに許可する。**

現行通常機能では Resource Management の固定 allowlist による Gym / Machine Master write のみを提供する。v2.1.0 では Broken Workout Resource を安全な状態へ置換する Recovery write が追加される。

将来の Workout CRUD も同じく専用 Domain 境界から実行し、Raw JSON write / Generic Git write を Frontend へ公開しない。

## Runtime と集計

Workout 由来の aggregate value は AF の表示ロジックへ埋め込まず、主に `workout-core` 等の共通 Domain logic で計算する。

正常な空状態、Resource 不在、Broken は別の状態として扱う。Workout Resource 0 件を正常な初期状態として扱う設計は v2.2.0 で実装予定であり、空の Workout file をその代替表現にはしない。

## 現行実装に存在しない主な機能

- 通常の Workout Log 登録・編集 UI
- Resource Management の固定範囲を超える任意 Master Data 編集
- 汎用 GitHub write API
- multi-user server API
- public web hosting
- installer generation
- Android AAB / Google Play packaging

Recovery については v2.1.0 の設計・実装が存在するが、Release 反映前の差異は `work/v2.1.0-plan/` と UT 証跡も併せて参照する。
