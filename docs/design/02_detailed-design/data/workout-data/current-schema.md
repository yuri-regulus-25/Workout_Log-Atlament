# Workout Data Schema と Domain Identity

Workout Data は JSON または JSONL Resource として GitHub に保存する。

## Raw Session

Raw session の主要 required field:

| Field | Type | Required | Notes |
|---|---|---|---|
| `schema_version` | number | yes | 現行 data は `1`。 |
| `session_id` | string | yes | Workout Domain Identity。Date から自動生成しない。 |
| `date` | string | yes | `YYYY-MM-DD`。Grouping / navigation 属性。 |
| `status` | string | yes | `complete` または `partial`。 |
| `gym_id` | string | yes | Gym Master reference。 |
| `machines` | array | yes | Machine list。 |
| `condition` | object | no | Optional session condition。 |
| `notes` | string[] | no | Optional session notes。 |

`complete` session は少なくとも1つの valid machine を必要とする。`partial` session は empty machine list を持てる。

## Raw Machine / Set

Machine は `machine_id`、`sets`、optional `notes` を持つ。Workout file は Machine display name / body part を保存せず Master Data から解決する。

Set は `set`、`weight_kg`、`reps` と optional `rir`、`failure`、`warmup`、`note` を持つ。

## Date / Session / Resource

Workout では次の3概念を分離する。

| 概念 | 意味 | Identity / Key |
|---|---|---|
| Date | grouping、search、navigation に使う Session 属性 | `date` |
| Session | Workout Domain Entity | `session_id` |
| Resource | persistence、validation、Git、Recovery の単位 | `path + revision` |

**Workout Domain Identity は `session_id` である。**

Date は Identity ではない。同じ Date に複数 Session が存在できる。Resource も Session Identity ではなく、JSONL Resource は複数 Session を保持できる。

```text
Date
  ↓ grouping / navigation
Session (session_id)
  ↓ source mapping
Resource
  ↓
Git mutation
```

Frontend / Domain logic は Date、Session、Resource を同義語として扱わない。

## JSON / JSONL Resource

現行 layout:

```text
data/workouts/
└─ YYYY/MM/YYYY-MM-DD.json | YYYY-MM-DD.jsonl
```

- JSON Resource: 1 file = 1 Session object。
- JSONL Resource: 1 line = 1 Session。1 Resource に複数 Session を保持できる。
- 1 Resource = Recovery / whole-resource validation の単位。

存在する Workout Resource は少なくとも1 Sessionを含むことを前提とする。

## 正常な空状態

Workout 記録が存在しない正常状態の標準表現は **Workout Resource 0件** とする。

以下を新しい「正常な空 Workout Resource」表現にはしない。

```text
0 byte JSONL
0 line JSONL
{}
[]
```

空 file と Resource 0件は別状態である。存在する Resource が schema を満たさない場合は Inspection / Validation の対象とする。

この Resource 0件契約は v2.2.0 で Runtime 実装へ反映する予定である。

## Runtime Normalization

Normalized runtime session は `workout-types` の `WorkoutSession` shape、および同等の Windows / Android AF payload を使用する。

- raw `gym_id` は resolved `gym` object へ projection。
- Gym / Machine は `resolution.state`, `originalId`, `resolvedId` を保持できる。
- resolved reference は Master 由来 display field を持つ。
- unresolved reference は根拠のない display value / body part を推論しない。
- Raw set / notes は保持する。
- `source_ids` 解決時は canonical Master ID と original raw ID の双方を追跡可能にする。

## Validation

Workout validation は少なくとも次を区別する。

1. Resource を構造的に解釈できるか。
2. Session record が Domain schema を満たすか。
3. `session_id` 等の Domain identity / integrity が成立するか。
4. Master reference 等の repository-level integrity が成立するか。

現行 parser は invalid JSON / JSONL、missing required field、invalid date/status、invalid machine/set 等を reject する。

v2.1.0 では Workout Resource 内の一部 Session だけを Runtime 採用する partial acceptance は行わない。Resource 内に Broken issue があれば Resource 全体を隔離する。

Unknown / deleted Master reference はそれ単独で Workout Resource を Broken にせず、Runtime warning として扱う。sets / reps / weight / count の事実集計は unresolved Machine を含められるが、body part 別分類は根拠となる body part が解決できる Machine のみ対象とする。

## 将来の Workout CRUD

Workout CRUD は Session を Domain Entity として操作する。

- ある Date に Session 0件なら新規 Session を作成できる。
- 1件ならその Session を選択・編集できる。
- 2件以上なら対象 Session を選択するか、別 Session を作成する。
- Session の日付変更は Domain 上は `date` 属性の変更。

Persistence 層は Session が属する Resource を解決し、必要なら Resource 間移動を行う。Domain 層は「1 Session = 1 file」を前提にしない。

保存の Git transaction 単位は **1回の利用者保存操作 = 1 atomic Git commit** とする。Date / file / Session と機械的に同一視しない。

Session 削除により Resource が0 Sessionになる場合、空 Workout Resource を残さず Resource 自体を削除する。
