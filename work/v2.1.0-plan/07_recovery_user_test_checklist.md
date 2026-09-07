# v2.1.0 Recovery User Test Checklist

Status: **NOT STARTED**

Use this checklist for human UI/UX testing after manufacturing close. Do not mark Release Ready from this document alone.

| Scenario ID | Purpose | Precondition / Fixture | Steps | Expected Result | UX observation points | Pass / Fail | Notes |
|---|---|---|---|---|---|---|---|
| UT-01 Broken JSON / simple missing field | Verify a single broken JSON file can be understood and repaired without raw JSON editing. | One Workout JSON file missing a required field such as `date`; other resources valid. | Open Maintenance -> 修復が必要なデータ -> select the resource -> create 下書き -> enter missing value -> 修復内容を確認 -> 修復を確定. | Resource appears in Broken list before repair, validates Healthy or Degraded, commits on supported platform, disappears from inventory, draft is removed. | User understands next action, JSON/Git knowledge is unnecessary, autosave is visible, Validate and Commit are distinct. |  |  |
| UT-02 Mixed JSONL | Verify a broken JSONL line quarantines the whole file and recovers as a whole replacement. | JSONL file with line 1 valid, line 2 broken, line 3 valid; another independent Workout resource exists. | Sync/build runtime -> open Recovery -> repair all fields for the JSONL resource -> validate -> commit on supported platform. | Sessions from the mixed JSONL file are not adopted before recovery; line diagnostic is visible; replacement validates as a whole resource; unrelated resource remains adopted. | User sees line/context as secondary detail and does not expect partial-line repair. |  |  |
| UT-03 Multiple Resources / one Broken | Verify independent resources continue and commit does not touch unrelated files. | Workout A Healthy, Workout B Broken, Workout C Healthy. | Confirm runtime availability -> recover B -> inspect repository diff/commit. | A/C remain unchanged and adopted; B is replaced/adopted; only B path changes unless path relocation is required. | User can identify the exact target data without opaque resourceKey. |  |  |
| UT-04 Degraded warning | Verify warning-only resources remain usable and are not listed as Broken. | Workout with missing/deleted Master reference only. | Sync/build runtime -> inspect app readiness and Recovery list. | Runtime is usable with warning; Recovery Broken inventory does not include the degraded resource. | User can distinguish warning from failure. |  |  |
| UT-05 Stale Draft | Verify source revision changes make the draft non-committable without merge. | Create draft against source revision A, then update source to revision B outside Recovery. | Reopen Recovery detail -> attempt validate/commit. | Draft state is stale; commit is prohibited; no automatic merge or silent rewrite occurs. | User understands they must restart from current data. |  |  |
| UT-06 Corrupted Draft | Verify corrupted local draft is isolated from the resource. | Place invalid JSON in the AF-local Recovery draft store for a broken resource. | Open Recovery detail. | UI says 下書きを読み込めません; resource itself is not described as deleted or Git-broken; discard/restart is available. | User understands only the draft is corrupted. |  |  |
| UT-07 Validation remains Broken | Verify unresolved or invalid input blocks commit. | Broken Workout with at least one unresolved field. | Create draft -> leave one required field unresolved or invalid -> 修復内容を確認. | Validation result is まだ修復できない項目があります; commit CTA is disabled. | User can tell what field still needs action. |  |  |
| UT-08 Path relocation | Verify corrected date/path relocation is visible and atomic. | Broken JSON path/date mismatch that requires new path after repair. | Repair date -> validate -> inspect confirmation -> commit on supported platform. | Confirmation shows 保存場所が変更されます; supported commit deletes old path and creates new path in one logical commit; no intermediate broken commit. | User notices path change before commit. |  |  |
| UT-09 Write conflict | Verify remote/source change before commit is not overwritten. | Validate draft against source revision A, then change source remotely to revision B. | Press 修復を確定. | Commit fails with RECOVERY_WRITE_CONFLICT; draft remains; no force, merge, or overwrite. | User understands latest state must be checked. |  |  |
| UT-10 Reflection failure | Verify Git success and runtime reflection failure are distinguishable. | Supported commit path with controlled sync/reinspect/runtime reflection failure after Git write. | Commit a valid recovery. | API preserves Git success fact; no rollback; UI shows 保存済み・反映失敗; blind recommit is not primary action. | User does not interpret it as save failure or try duplicate commit. |  |  |

General observation prompts:

- Can the user understand the next operation without JSON or Git knowledge?
- Is autosave state visible but not noisy?
- Does the user distinguish validation from final commit?
- Does warning/degraded presentation differ clearly from broken/failure?
- After conflict, does the user understand refresh/restart behavior?
- After reflection failure, does the user avoid duplicate commit attempts?
