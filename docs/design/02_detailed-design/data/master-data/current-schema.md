# Master Data Schema と整合性契約

現行 Master Data:

```text
data/master/
├─ machines.json
└─ gyms.json
```

## Machine Master

Top-level:

```json
{
  "schema_version": 1,
  "machines": []
}
```

主要 field:

| Field | Required | Meaning |
|---|---|---|
| `machine_id` | yes | canonical unique ID |
| `source_ids` | no | legacy / unresolved raw ID の alias |
| `name` | yes | display name |
| `body_part` | yes | supported body part |
| `aliases` | no | display/search alias |
| `active` | yes | current availability |
| `deleted` | yes | logical delete |

Supported body part:

```text
chest, back, legs, shoulders, arms, glutes, core, cardio, other
```

## Gym Master

Top-level:

```json
{
  "schema_version": 1,
  "gyms": []
}
```

主要 field:

| Field | Required | Meaning |
|---|---|---|
| `gym_id` | yes | canonical unique ID |
| `source_ids` | no | legacy / unresolved raw ID の alias |
| `name` | yes | display name |
| `short_name` | no | short display name |
| `active` | yes | current availability |
| `deleted` | yes | logical delete |
| `main` | yes | Main Gym flag |

## Resource の存在と record 0件

Master file の**不在**と、有効な Master file に record が **0件**ある状態を区別する。

- configured Machine Master file 不在: 異常。
- configured Gym Master file 不在: 異常。
- `{ "schema_version": 1, "machines": [] }`: schema として有効な正常状態になり得る。
- `{ "schema_version": 1, "gyms": [] }`: schema として有効な正常状態になり得る。

したがって Resource Configuration の `emptyAllowed` / `required` boolean でこの意味を利用者が変更する設計にはしない。

Main Gym は初期状態で0件を許容する。ただし一度 Main Gym を設定した後、Resource Management の通常 write で意図せず Main Gym 0件へ戻す遷移は拒否する。これは Master schema の「空配列がvalidか」とは別の write transition policy である。

## Validation

Whole Master validation は以下を確認する。

- top-level object / `schema_version`
- required array / record field
- canonical ID uniqueness
- `source_ids` と canonical / other source ID の衝突
- Machine `body_part`
- Main Gym 最大1件
- Main Gym は active / non-deleted record のみ

Logical deleted record も ID uniqueness の対象とし、deleted ID を再利用しない。

Historical reference と new-write reference は意味を分ける。

- historical: inactive record は参照可能。deleted / missing は Runtime warning として理由を保持する。
- new-write: `active:true` かつ `deleted:false` の record のみ候補。

`source_ids` で canonical record に解決しても Raw Workout value は書き換えない。

## Runtime Resolution

Runtime は reference を少なくとも次の facts として区別する。

```text
resolved / active
resolved / inactive
deleted
missing
```

v2.2.0 Master partial acceptance ではさらに、Master 内に存在したが validation により除外された record を `invalid/excluded` として内部的に区別可能にする。

`missing`、`deleted`、`invalid/excluded` が UI 上同じ `? + warning` 表現になることは許容するが、内部 reason を潰さない。

根拠のない name / body part 等を推論しない。

## Resource Health と将来の Record Isolation

v2.1.0 では structurally Broken な Master Resource は新 Runtime adoption を停止する。whole-runtime LKG があれば fallback、なければ unavailable。

v2.2.0 で Master partial acceptance を導入する場合:

- Resource 自体を構造的に解釈できない場合は whole Resource Broken のまま。
- 構造を安全に解釈できる場合、Record 単位 validation を行える。
- valid Record は Runtime 採用可能。
- invalid Record は Runtime から隔離可能。
- Recovery の修復・Git replacement 単位は引き続き whole Resource。

つまり **Runtime isolation unit と Recovery write unit は同じである必要はない。**

Workout Resource の partial acceptance はこの v2.2.0 方針には含めない。

## Main Gym Metrics

Main Gym dependent Weight / Volume metric は Main Gym context が valid な場合だけ比較可能な値を返す。

- configured + valid: Main Gym Session に限定して available。
- unconfigured: unavailable / unconfigured。
- constraint violation: invalid。

Main Gym 未設定を Application Readiness failure にはしない。

## Resource Management

Resource Management は Machine / Gym の Create、Edit、Copy to Create、logical Delete、Restore、Main Gym replacement を提供する。

Raw JSON editor、arbitrary path write、bulk edit/delete/restore は提供しない。

Read は Local Master snapshot を使用する。Write は expected revision、whole-master validation、Remote revision を確認した用途限定 Git write とする。

Main Gym の Delete は UI で拒否し、`deleted` / `main` を free boolean として編集させない。

Save conflict では local edit content を保持し、利用者が再取得後の再適用を判断する。

## Physical Delete

Master Record の通常操作では Physical delete を導入しない。Historical Workout reference を保持するため logical delete を使用する。
