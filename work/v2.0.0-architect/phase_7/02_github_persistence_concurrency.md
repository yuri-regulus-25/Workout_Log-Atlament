# v2.0.0 Phase 7-B — GitHub Persistence & Concurrency

## 日本語

### 前提
Phase 7-Aまでが現在の作業Branchへ反映済みであることを前提とする。

### 目的
Master Document単位の安全なGitHub Persistence、Optimistic Concurrency、Failure Recoveryを実装する。

### Write Policy
- Record単位の部分的Remote Writeではなく、対象Master Document全体を構築・Validationした後に1回のGitHub更新として保存する。
- GitHub上のcurrent SHA/revisionを利用してOptimistic Concurrency Controlを行う。
- Read時のrevisionとWrite時のcurrent revisionが一致しない場合はConflictとして拒否し、自動mergeしない。
- Conflict時は再取得と人間による再確認を基本とする。

### Commit Policy
- Write先BranchはApp Settingsで固定されたBranchを利用する。
- Maintenance画面からBranchを選択させない。
- Commit Messageをユーザー自由入力にしない。
- Gym Master / Machine Masterごとに固定Commit Messageを使用する。
- 具体的な固定文言は製造指示時に人間が決定する。
- GitHub Commit Historyを基本Audit Trailとして利用し、独自Audit DBを新設しない。

### Failure Recovery
- Remote Write成功が確認されるまでFrontendを保存済み状態にしない。
- Timeout / network / authentication / permission / rate-limit / GitHub failure時は編集内容を保持し、Retryまたは再取得を可能にする。
- 不明確な結果を成功扱いしない。

### 完了条件
Master更新がDocument単位で安全に保存され、古いrevisionによる上書き・部分更新・誤った成功判定を防止できること。

---

## English

### Prerequisite
Phase 7-A must be present on the current working branch.

### Objective
Implement safe master-document persistence, optimistic concurrency, and failure recovery over GitHub.

### Policy
Build and validate the complete target master document before one GitHub update. Use current SHA/revision for optimistic concurrency; reject revision mismatch as conflict and do not auto-merge. Re-fetch and human review are the default conflict recovery.

Repository branch is fixed by App Settings. Users cannot choose a branch or free-type commit messages. Gym and Machine masters use separate fixed commit messages whose exact wording is decided during implementation. GitHub commit history is the audit trail; do not create a separate audit database.

Do not mark frontend state saved until remote success is confirmed. Preserve edits on failures and allow retry/re-fetch.

### Completion Criteria
Master writes are atomic at document level and protected from stale overwrite, partial update, and ambiguous success.