# Data Overview

Atlament は主に 2 種類のデータを扱う。

- Master Data: Gym と Machine の参照データ。
- Workout Data: JSON または JSONL として保存される Workout Session。

現行 example/source data は `data/` 配下にある。

```text
data/
├─ master/
│  ├─ machines.json
│  └─ gyms.json
└─ workouts/
   └─ <year>/<month>/<date>.json | .jsonl
```

## Master Data

現行 Master Data は次の 2 ファイルを持つ。

- `data/master/gyms.json`
- `data/master/machines.json`

Gym / Machine record は `active` と論理削除 field `deleted` を使用する。Main Gym は Gym Master record の `main` field で表す。

Master file の不在と、schema として有効な Master file 内の record 0 件は別状態として扱う。record 0 件は将来の正常な初期状態として扱えるが、file 自体の不在を同じ意味にはしない。

## Workout Data

Workout Session は `gym_id` と `machine_id` reference を持つ。表示名や body part は Workout Data に複製せず、Master Data から解決する。

1 つの JSON file は 1 Session を表現できる。JSONL file は 1 行ごとに 1 Session を表現し、1 Resource 内に複数 Session を保持できる。

### 識別単位

Workout の Date、Session、Resource は同一ではない。

- Date: grouping / search / navigation に使用する属性。
- Session: Workout Domain Entity。`session_id` を Domain Identity とする。
- Resource: persistence / validation / Git / Recovery の単位。

同一日に複数 Session が存在できる。Date だけで Session を一意に識別しない。また Session と Resource の対応を 1:1 と仮定しない。

現行 `/workouts/:date` は日付を入口とする画面 route であり、Domain Identity が Date であることを意味しない。将来 Session を直接編集・参照する機能では `session_id` を一意識別に使用する。

## 空状態

Workout の正常な「記録なし」は、Workout Resource が 0 件である状態を標準表現とする。0 byte JSONL、空 JSON object、空 array 等を「正常な空 Workout Resource」として新たに導入しない。

この契約は v2.2.0 で実装予定であり、現行実装との差異は Planning として管理する。

## Runtime Data

AF と Node development runtime は source data を `WorkoutSession[]` へ normalize する。Normalized model は resolved Gym と Machine 表示情報を持つため、Frontend application は Master JSON を直接読む必要がない。

Master reference は active / inactive / deleted / missing を区別して解決する。新規 write candidate は `active:true` かつ `deleted:false` の record のみに制限する。

v2.1.0 以降は Workout Resource の Health を Resource 単位で判定し、Broken Resource を最新 Runtime から隔離できる。Resource の異常と、そこに含まれる Session の Domain Identity は混同しない。

## 集計と比較の原則

Atlament は記録された事実と、明示的に定義された決定論的集計を基本とする。根拠となるモデルがない状態で、成長、不足、刺激、肥大、効果、良否等を推論しない。

Weight / Volume を Performance 指標として比較・評価する場合は、原則として同一 Gym・同一 Machine の比較可能性を維持する。

異種 Machine の Weight / Volume を事実として合計すること自体と、その合計値から Performance を評価することは区別する。異種 Machine の単純合算値から成長や優劣を推論しない。

Main Gym が未設定または invalid の場合、Main Gym に依存する kg metric は unavailable state として扱う。

## 書き込み責務

現行通常画面では Workout Data は read-only であり、Resource Management が固定 allowlist の Gym / Machine Master write を使用できる。

ただし「Workout Data は常に GitHub へ書き込まない」という契約ではない。v2.1.0 Recovery は Broken Workout Resource の安全な置換を書き込み対象とし、将来の Workout CRUD も専用 Domain 境界から書き込む予定である。

Raw JSON / JSONL editor や Generic Git write は提供しない。
