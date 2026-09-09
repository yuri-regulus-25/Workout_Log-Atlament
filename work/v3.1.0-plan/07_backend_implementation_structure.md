# v3.1.0 Backend / Application Framework 実装分割

## 1. 方針

Workout Manager の書き込み機能は、Frontend から GitHub や workout resource を直接操作しない。

責務は以下へ分離する。

1. Frontend: 入力・表示・client validation・API 呼び出し
2. Application Framework API: HTTP contract / DTO / response envelope
3. Write Service: create / update / delete のユースケース制御
4. Validation: server validation と master reference validation
5. Resource: JSON / JSONL の解決・再構築・serialization
6. Repository: GitHub remote state / commit / concurrency
7. Reflection: commit 後の runtime 反映確認

Windows / Android は同一の `/api/v1/common` contract と同一の意味論を提供する。

実装言語・プラットフォーム差によりクラス名を完全一致させる必要はないが、責務境界は揃える。

---

## 2. 命名方針

人間がファイルツリーを見て役割を判断できる短い名前を優先する。

- `Workout*` のような冗長な prefix は原則付与しない。
- ディレクトリ名を namespace / context として利用する。
- 1ファイルへ CRUD 全処理を詰め込まない。
- Windows / Android で既存の命名規則がある場合は既存規則を優先する。

例:

```text
write/
├─ Dto.*
├─ Service.*
├─ Validator.*
├─ Resource.*
├─ Repository.*
└─ Reflection.*
```

---

## 3. API 層

概念 endpoint は既存 Write Contract を踏襲する。

```text
GET    /api/v1/common/workout-write/boundary
GET    /api/v1/common/workout-write/date/{date}
POST   /api/v1/common/workout-write/sessions
PUT    /api/v1/common/workout-write/sessions/{sessionId}
DELETE /api/v1/common/workout-write/sessions/{sessionId}
```

既存 Application Framework の routing 規約と衝突する場合は URL の具体名を調整してよい。

API 層の責務:

- request decode
- DTO bind
- Write Service 呼び出し
- common response envelope への変換
- stable error code の返却

API 層では resource path、JSON/JSONL、GitHub commit 手順を扱わない。

---

## 4. DTO

DTO は API contract 専用とし、raw JSON schema object をそのまま request contract にしない。

概念構成:

```text
SessionRequest
├─ date
├─ gymId
├─ machines[]
│  ├─ machineId
│  └─ sets[]
│     ├─ reps
│     ├─ weightKg
│     └─ note
├─ notes
└─ concurrency context
```

Create では `session_id` を受け付けない。

Update / Delete の identity は URL の `sessionId` を使用する。

revision / expected head 等の concurrency 情報は Frontend が意味を解釈しなくてよい opaque value として扱ってよい。

---

## 5. Write Service

`Service` が Create / Update / Delete の orchestration を担当する。

### Create

1. write eligibility 確認
2. request validation
3. active master reference validation
4. server side `session_id` 生成
5. target resource 解決
6. existing resource + new Session で全体再構築
7. affected resource 全体 validation
8. concurrency / remote state 確認
9. atomic Git commit
10. runtime reflection 確認
11. result 返却

### Update

1. write eligibility 確認
2. `session_id` で既存 Session 特定
3. request validation
4. master reference validation
5. UI 非公開 field の preserve
6. resource 再構築
7. affected resource 全体 validation
8. concurrency / remote state 確認
9. atomic Git commit
10. runtime reflection 確認
11. result 返却

### Delete

1. write eligibility 確認
2. `session_id` で既存 Session 特定
3. resource から Session 除去
4. 0 Session なら resource 自体を削除対象化
5. affected state validation
6. concurrency / remote state 確認
7. atomic Git commit
8. runtime reflection 確認
9. result 返却

Machine / Set 単位の persistence endpoint は作成しない。

---

## 6. Validator

Server validation は Frontend と同一ルール・同一日本語文言を使用する。

主な規則:

- Gym: required / active / not deleted
- Machine: required / active / not deleted / Session 内 unique / 1..10
- Set: Machine ごと 1..10
- Reps: required / integer / `0 < x <= 100`
- Weight: required / `0 <= x < 1000` / 小数第2位まで
- Notes: 編集対象となった入力は 400字以内

文言例:

- `必須項目です`
- `数字を入力してください`
- `1以上の整数を入力してください`
- `x以下の数値を入力してください`
- `少数は2桁までです`
- `400字以内に入力してください`
- `マスターデータに存在しません`

field error は field path と message を構造化して返し、Frontend は server message をそのまま Component へ表示できるようにする。

---

## 7. Resource 層

`Resource` は persistence format を隠蔽する。

責務:

- date / session から resource を解決
- JSON / JSONL load
- `session_id` による対象特定
- resource 全体再構築
- canonical serialization
- resource delete 判定
- revision の取得

Frontend / API DTO / Write Service は `.json` / `.jsonl` / line number を前提にしない。

JSONL update でも部分行 overwrite は行わず、resource 全体を再構築してから validation / serialization する。

---

## 8. Repository 層

`Repository` は GitHub 操作を隠蔽する。

責務:

- remote HEAD / revision 確認
- optimistic concurrency
- blob / tree / commit 作成
- multi-path mutation の atomic commit
- ambiguous result reconciliation

禁止:

- sequential delete → create による擬似 relocation
- conflict 時の force overwrite
- blind retry
- automatic merge / rebase

1回のユーザー保存操作は1回の Domain Mutationとして atomic Git commit にする。

---

## 9. Reflection

Git commit 成功と runtime 反映成功を別状態として扱う。

`Reflection` の責務:

- commit 後に Application Framework が新 revision を観測できるか確認
- runtime data 再構築結果を確認
- Git 成功 / reflection 失敗を区別して返却

Git commit 済みなのに reflection が失敗した場合、同じ mutation を自動再実行しない。

---

## 10. Windows 構成

既存 Application Framework の配置規則へ合わせつつ、概念上は以下の単位へ分割する。

```text
Core/
└─ Write/
   ├─ Dto.cs
   ├─ Service.cs
   ├─ Validator.cs
   ├─ Resource.cs
   ├─ Repository.cs
   └─ Reflection.cs
```

HTTP routing / handler は既存 server entry point 側へ薄く追加する。

`Service.cs` から GitHub HTTP API を直接叩かず `Repository.cs` を経由する。

既存 RuntimeDataBuilder / Recovery 系の責務へ write 処理を混入させない。

---

## 11. Android 構成

Windows と同一 contract / semantics を維持する。

概念構成:

```text
write/
├─ Dto.kt
├─ Service.kt
├─ Validator.kt
├─ Resource.kt
├─ Repository.kt
└─ Reflection.kt
```

Android 固有の HTTP / storage / GitHub client 差分は各 adapter 内へ閉じ込める。

Windows のコード構造を機械的にコピーする必要はない。

ただし以下は一致必須:

- endpoint semantics
- request / response shape
- validation rule / message
- error code
- concurrency semantics
- atomicity semantics
- reflection result semantics

---

## 12. Error Mapping

既定 error taxonomy:

```text
WORKOUT_WRITE_UNAVAILABLE
WORKOUT_SESSION_NOT_FOUND
WORKOUT_SESSION_CONFLICT
WORKOUT_RESOURCE_CONFLICT
WORKOUT_REPOSITORY_CONFLICT
WORKOUT_VALIDATION_FAILED
WORKOUT_REFERENCE_INVALID
WORKOUT_WRITE_FAILED
WORKOUT_WRITE_RESULT_AMBIGUOUS
WORKOUT_REFLECTION_FAILED
```

内部 exception text を Frontend contract にしない。

API は stable code / message / field errors / data を common envelope へ載せる。

---

## 13. 実装順序

依存関係を単純化するため、概ね以下で実装する。

1. DTO / shared validation contract
2. Resource read / rebuild / serialize
3. Repository concurrency / atomic commit
4. Write Service
5. API routing
6. Windows contract test
7. Android equivalent implementation
8. Windows / Android parity test
9. Frontend API client 接続
10. E2E

詳細なクラス名・private method 名・内部 helper 分割は製造時に決定してよい。

---

## 14. 製造時に人間判断を要求しない事項

以下は実装者判断でよい。

- private method 名
- helper / mapper の分割
- DTO の内部ファイル分割
- Windows / Android の package / namespace 微調整
- serializer helper の具体名
- repository adapter の内部構造
- test fixture 名
- mock / fake の構成

既存設計・既存コード規約と整合する範囲で、読みやすさとテスト容易性を優先する。
