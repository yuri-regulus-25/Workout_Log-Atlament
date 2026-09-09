# Workout Write Contract & Persistence

Related Issue: #139

## 1. Purpose

Workout CRUD専用Domain Write Boundaryを定義する。

FrontendへRaw Workout JSON、Repository Path、Branch、Git Commit等のPersistence Detailを公開しない。

FrontendはWorkout Session Domain Modelのみを操作する。

## 2. Mutation Unit

Write Unit：

```text
1 User Save
=
1 Workout Domain Mutation
=
1 Atomic Git Commit
```

DateをWrite Unitとしない。

同一Dateに複数Sessionが存在できる。

Create / Update / Deleteの結果として複数Resource変更が必要な場合も、1 User Save内の変更は1 Commitへまとめる。

## 3. Supported Mutation

Domain Mutationは以下。

```text
CreateSession
UpdateSession
DeleteSession
```

Machine / Set操作はFrontend Working Model内で行い、ServerへMachine単位 / Set単位のPersistence Mutation APIを公開しない。

Save時に完成したSession Domain ModelをServerへ送信する。

これによりTransaction BoundaryをSession Mutationへ固定する。

## 4. Identity

Session Identity：

```text
session_id
```

ClientはDateをSession Identityとして扱わない。

Create時に `session_id` を生成する責務はApplication Framework / Server Domain Layer側に置く。

Frontendから任意 `session_id` を直接指定させない。

生成IDはRepository内でUniqueでなければならない。

Update / Deleteは `session_id` を対象Identityとして指定する。

## 5. Date

v3.1.0 UIではSession DateはStep 1で選択する。

Step 2 FormではDate編集を提供しない。

したがって通常UpdateでDate Moveは発生しない。

Persistence Layerは将来のDomain Mutationまたは他Domain PathからDate Moveが要求された場合でも、Atomic Resource Relocationを処理可能な設計を維持する。

v3.1.0 FrontendからDate Move UIは公開しない。

## 6. Resource Model

Workout ResourceはSessionと同一ではない。

Persistence Layerは以下を解決する。

```text
Session Mutation
↓
Affected Resource Detection
↓
Resource Reconstruction
↓
Whole Resource Validation
↓
Atomic Git Mutation
```

JSON / JSONLをFrontendへ認識させない。

FrontendはResource Path / Extension / Line Numberを送信しない。

## 7. Persistence Resolution

Persistence Layerは対象Sessionが所属するResourceを解決する。

同一Dateに複数Sessionが存在する場合も正常状態として処理する。

Write時に以下を保証する。

- Session Identity保持
- 他Session非破壊
- Resource全体がValid
- Empty Resourceを残さない
- Repository Layoutを破壊しない

JSONL Resource内の1 Session更新時：

1. Resource全体をLoad
2. `session_id` で対象を特定
3. 対象Sessionのみ置換
4. Resource全体をValidate
5. Resource全体を再Serialize
6. Atomic Write

Delete時にResource内Sessionが0件となる場合：

- Resourceを物理削除

Resource内に他Sessionが残る場合：

- 残SessionからResourceを再構築

## 8. Resource Format Policy

既存JSON / JSONLを読み取り可能とする。

Mutation時の具体的なCanonical SerializationはPersistence Layerへ閉じ込める。

実装時には既存Repository Dataを調査し、以下を満たす最小変更方式を選択する。

- 同日複数Sessionを破壊しない
- 不要なFormat Migrationを発生させない
- JSONL内Session更新で他Lineを失わない
- Empty Resourceを生成しない
- Current Schemaへ適合する

Format Conversionが必要な場合、Delete + Create等のResource変更を1 Atomic Commit内で処理する。

## 9. API Boundary

Workout CRUD専用Domain APIとする。

概念Endpoint：

```text
GET    /api/v1/common/workout-write/boundary
GET    /api/v1/common/workout-write/date/{date}
POST   /api/v1/common/workout-write/sessions
PUT    /api/v1/common/workout-write/sessions/{sessionId}
DELETE /api/v1/common/workout-write/sessions/{sessionId}
```

最終Endpoint命名は既存Application FrameworkのNaming Ruleに合わせて実装時確定可能。

意味Contractを優先し、URL文字列自体は設計固定事項としない。

## 10. Boundary Response

FrontendはWrite可否をStatus Message等から推測しない。

ServerはStructured Factとして返却する。

概念例：

```json
{
  "writable": true,
  "reason": null,
  "remoteAvailable": true,
  "source": "remote",
  "revision": "..."
}
```

Fallback / LKG使用中はWrite不可。

Remote SoTへ正常到達できない場合もWrite不可。

## 11. Read for Edit

Step 1でDate決定後、Server / Runtimeから該当DateのSession一覧を取得する。

Frontend向けSession Optionは表示用Indexを持ってよい。

例：

```text
Session1
Session2
Session3
```

ただし表示IndexをDomain Identityとして使用しない。

Internal Selectionは必ず `session_id` と対応させる。

## 12. Create Request

概念DTO：

```text
CreateWorkoutSessionRequest
  date
  gym_id
  machines[]
    machine_id
    sets[]
      reps
      weight_kg
      notes?
  notes?
  expected_context
```

`session_id` はServer生成。

RequestはRaw JSON Stringを受け付けない。

Repository Pathを受け付けない。

Commit Messageを受け付けない。

Branchを受け付けない。

## 13. Update Request

概念DTO：

```text
UpdateWorkoutSessionRequest
  session_id
  session
    date
    gym_id
    machines[]
    notes?
  expected_context
```

UpdateはPatchではなく、**Working Model上で完成したSessionのDomain Replacement**を基本とする。

Serverは対象SessionをResourceから再解決して置換する。

## 14. Delete Request

概念DTO：

```text
DeleteWorkoutSessionRequest
  session_id
  expected_context
```

DeleteはDomain SessionのPhysical Delete。

Resourceが0 Sessionになった場合、Resourceも物理削除する。

## 15. Optimistic Concurrency

Write開始時にServerは最新Remote SoTを再確認する。

Expected Contextは最低限以下の事実を保持可能な構造とする。

```text
source resource
  path
  revision

target resource
  path
  revision or absent

repository
  expected head
```

FrontendへPathを直接操作させる必要はない。

Opaque Revision Token等として抽象化してよい。

重要なのはServerが以下を検証できること。

- 編集開始時に見ていたSourceが変わっていない
- Delete対象が変わっていない
- Create先Resourceが想定外に変わっていない
- Commit直前にRepository Headが変わっていない

## 16. Create Race

Createは「target date absent」を条件としない。

同一Dateに複数Sessionを登録可能なためである。

Create時は対象DateのResource Revision / Repository Contextを確認する。

別Clientが同一Dateへ先行Writeした場合、自動Mergeは行わない。

Conflictとして返却し、Frontendに再取得を要求する。

## 17. Update Conflict

Update時にSource RevisionがExpectedと一致しない場合：

- Writeしない
- Auto Mergeしない
- Auto Overwriteしない
- Forceしない

Conflict Resultを返却する。

## 18. Delete Conflict

Delete時に対象Session / Resource RevisionがExpectedと一致しない場合：

- Deleteしない
- Auto Retryしない
- Forceしない

Conflict Resultを返却する。

## 19. Validation Before Write

Server Write Sequence：

```text
Request Decode
↓
Field / DTO Validation
↓
Session Domain Validation
↓
Master Reference Validation
↓
Affected Resource Reconstruction
↓
Whole Affected Resource Validation
↓
Revision / Remote Context Validation
↓
Git Mutation
↓
Runtime Reflection
```

旧仕様の「Whole-day Validation」は使用しない。

Validation Unitは**Affected Resource**とする。

## 20. Master Reference Write Rule

新規Writeで選択可能なGym / Machineは以下。

```text
active = true
deleted = false
```

Frontend Selectでも候補を制限する。

Serverも同条件を再検証する。

Update対象のHistorical Sessionに現在Inactive / Deleted / Missing Referenceが含まれる場合の扱いは、Reference Validation Policyに従い安全側で処理する。

少なくとも新たに無効Referenceを選択することは許可しない。

既存値を変更せず保持した場合のHistorical Compatibilityは、既存Master Resolution Contractとの整合を実装調査時に確認する。

## 21. Atomic Git Write

Same Resource Replacementのみで完結する場合は、既存GitHub Contents API相当のSafe Writeを使用可能。

複数Path変更またはPath Relocationが必要な場合、逐次Delete / Createは行わない。

Git Data API等のAtomic Commit Primitiveを使用する。

概念Sequence：

```text
Blob
→ Tree
→ Commit
→ Remote HEAD Recheck
→ Fast-forward Ref Update
```

Non-fast-forward：

- Conflict
- Force禁止

Commit MessageはApplication生成固定文言とする。

Frontend指定不可。

## 22. Ambiguous Git Result

Network Error等によりGit Write成否が不明な場合：

- Blind Retry禁止
- RemoteをReconcile
- Commit / Resource状態を確認
- Resultを確定してからFrontendへ返却

Duplicate Session作成を避ける。

## 23. Runtime Reflection

Git Write成功後にRuntime Stateを再構築する。

Resultは最低限以下を区別する。

1. Git Write Failure
2. Git Write Success / Runtime Reflection Failure
3. Git Write Success / Runtime Reflection Success

Reflection Failure時にGit CommitをRollbackしない。

Frontendへ単純な「保存失敗」として返却し、同一Mutationの無条件Retryを誘発しない。

## 24. Security Boundary

禁止：

- Arbitrary Raw Workout JSON Write
- Arbitrary Repository
- Arbitrary Branch
- Arbitrary Path
- Arbitrary Commit Message
- Generic Git Write
- Force Push
- Auto Merge
- Auto Rebase
- Fallback / LKG Write

Workout CRUD Domain APIだけをControlled Mutation Pathとする。

## 25. Cross Platform

Windows / Android Application Frameworkは同一Contractを実装する。

共通化対象：

- DTO Semantics
- Validation
- Error Code
- Revision Semantics
- Conflict Semantics
- Git Result State
- Reflection Result State

Platform固有の実装差をFrontend Contractへ露出させない。
