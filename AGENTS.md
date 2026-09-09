# Atlament Repository Instructions

この文書は、Atlament Repository で Codex / AI Agent が実装・調査・検証を行う際の恒久的な Repository-level 指示である。Version-specific な計画、試験、作業記録は `work/`、Architecture / Contract の詳細は `docs/design/` を参照し、この文書へ過剰に複製しない。

## 1. 基本姿勢

- 変更前に、対象領域の Source、`docs/design/`、関連する `work/` 記録、既存 Test を確認する。
- `docs/design/` は現行 As-Is の Architecture / Contract 基準として扱う。`work/` は Version-specific plan、試験、調査、作業記録として扱う。
- 実装と文書が矛盾する場合、どちらかを推測で正とせず、変更目的・履歴・現在の Contract を調査する。解消できない場合は STOP して報告する。
- 今回の目的に直接関係しない Source refactoring、formatting、comment 追加、UI 修正、metadata 変更を便乗して行わない。

## 2. 言語

- Repository 文書、設計文書、試験手順、作業記録、Source Comment / Doc Comment は原則として日本語で記述する。
- API 名、Class 名、Framework 名、Command、Identifier、技術的固有名詞は自然な英語表記のままでよい。
- 日本語で自然に説明できる文章を、不必要に日本語 / 英語混在へしない。
- UI 表示文言は各画面・既存設計の規約を優先し、この Documentation 規則をそのまま適用しない。

## 3. Branch / Git 運用

- Atlament の作業 Branch prefix / naming では、原則として区切りに `/` ではなく `-` を使用する。
- 例: `test-v3.0.0-unresolved-reference-light-secondary`
- `test/v3.0.0-...` のような Branch 名を勝手に導入しない。
- Fixture / Test Branch の data や試験専用 commit を Release Branch へ混入させない。
- Branch 作成、merge、rebase、reset など既存履歴へ影響する操作は、作業目的と現在の Branch 状態を確認してから実施する。
- 作業開始時と commit 前に `git status` / `git diff` などで状態を確認し、自分の変更と既存変更を区別する。
- ユーザー自身または別作業による未 commit 変更を、削除、checkout、restore、reset、上書きしない。
- ユーザー変更が作業対象と競合する場合は、勝手に解消せず STOP して報告する。

## 4. Node.js Package Manager

- この Repository では Node.js package manager として `pnpm` を使用する。
- Build / test / check などの package script は、最初から `pnpm` で実行する。`npm` を試して失敗後に `pnpm` へ fallback する運用は禁止する。
- Codex 実行環境で通常の `pnpm` 解決に問題がある場合は、利用可能な bundled `pnpm` runner など、正常動作する `pnpm` 実行経路を使用する。
- `package.json` の `packageManager` が未定義の場合は、lockfile、実行環境、既存設定を確認し、適切な `pnpm` version を明示すべきか調査する。ただし、根拠なく version を決めない。
- 既存 script 内に package manager 呼び出しが含まれる場合は、変更の影響範囲を確認してから扱う。単なる実行時の都合だけで script 群を大きく書き換えない。

## 5. Architecture / Responsibility

- Refactoring の目的はファイル数を増やすことではなく、責務境界、依存方向、変更理由を人間が追跡可能にすることである。
- 「既存ファイルに関連コードが存在する」ことは、「新しい責務もそのファイルへ追加すべき」という根拠にはならない。
- 新規実装・変更時は、その責務が本来どの Layer / Service / Component に属するかを判断する。
- 単純な CRUD や密接に結合した小規模処理まで機械的に Class / File へ分割しない。
- Tiny Class、意味のない Interface、Factory / Manager の多重化などによる過剰抽象化は禁止する。
- ファイル行数だけを理由に分割しない。独立した変更理由、責務、依存関係、testability、人間の追跡性を基準に判断する。

## 6. Windows / Android / Shared Contract

- Windows と Android で共有される Domain semantics、Runtime semantics、Recovery semantics、Master data semantics、API response semantics は parity を維持する。
- 片方のみを変更して意味論が乖離する可能性がある場合、もう一方への影響を調査する。
- Runtime / Recovery / GitHub Writer / Persistence / Validation などの既存 Contract を、UI 修正や refactoring の都合だけで変更しない。
- Public API、保存形式、GitHub write semantics、Recovery semantics などの変更が必要になった場合は、勝手に変更せず STOP して報告する。
- Windows / Android / Node development runtime / shared frontend client が共有する response envelope、readiness、runtime warning、Recovery public shape などは、`docs/design/02_detailed-design/application-framework/` を確認してから変更する。

## 7. Frontend

- Page / Composition Root、Application Shell、Feature Component、Dialog、Input、Shared Component などの既存責務境界を尊重する。
- Composition Root は画面全体の orchestration、state、data flow を担当し、個別 Component へ不要な全体責務を持ち込まない。
- Application Shell と各 Feature 画面の責務を混在させない。
- Framework 固有の自然な Component 設計を優先し、Framework を跨いだ不自然な共通化を行わない。
- UI / UX 修正を理由として Backend / Runtime semantics を無断変更しない。
- Frontend 横断の route、application metadata、navigation、theme、branding、page transition などは `src/shared/frontend-common/` と関連 design document を確認してから変更する。

## 8. Source Documentation

- 人間が Source を追跡できることを重要な品質要件として扱う。
- C# では XML Documentation Comment、Kotlin では KDoc、Frontend では JSDoc / TSDoc または Framework として自然な Documentation を使用する。
- すべての trivial method へ機械的に comment を追加する必要はない。
- 優先対象は、Public / Internal API、重要な private responsibility boundary、Composition Root、非自明な orchestration、Validation、Recovery、Persistence、GitHub I/O、Runtime construction、Frontend state / data flow、props / events などの Contract である。
- Comment には必要に応じて、責務、入力 / 前提条件、結果 / 事後条件、side effect、failure / conflict / partial acceptance、caller constraint、実装上非自明な「なぜ」を記載する。
- 既存 Comment は Source Artifact として扱い、無関係な変更で削除しない。実装変更によって内容が不正確になった場合は更新する。
- 明確な不要物である commented-out code の cleanup とは区別する。

## 9. Verification

- 変更範囲に応じて既存の Test / Check / Build を実行する。
- Frontend 変更では、少なくとも関連 Test、`pnpm run check:all`、必要な build を検討する。
- Windows Backend を変更した場合は、関連する .NET Test / Build を実行する。
- Android を変更した場合は、関連 Unit Test / Gradle Build などを実行する。
- Shared Contract を変更した場合は、Windows / Android 双方への影響を確認する。
- Commit 前には `git diff --check` を実行する。
- Test を通すために仕様、Contract、Test intent を勝手に変更しない。

### 9.1 Windows native Computer Use E2E Preflight

- Windows native Application を対象とする E2E を開始する前に、その時点の実行環境で native Computer Use が利用可能か runtime probe を行う。
- Computer Use Skill / Tool が利用可能な場合は、利用不能と判断する前に当該 Skill / Tool の最新の利用手順を確認し、必要な setup を実施する。
- 単一の tool surface で native Application API が公開されていない、または Application 一覧が空であることだけを理由に、native Computer Use を利用不能と判定しない。利用可能な Skill / Tool が示す別の正規経路がある場合は、それも確認する。
- 特定の内部 API、package、RPC 名を恒久的な前提にしない。E2E 実施時点で利用可能な Skill / Tool が指定する経路を優先する。
- native Computer Use が利用可能で対象 Atlament Application / Window を取得できる場合、Windows native 固有 E2E は Browser 等へ代替せず、実際の Atlament Windows Application を操作して実施する。
- 必要な setup と runtime probe を実施しても native Computer Use を利用できない場合は、失敗した経路と理由を記録し、native 固有試験を `NT (Not Tested)` として明示する。Browser 等による代替試験を実施する場合も、Windows native E2E の PASS として扱わない。

## 10. STOP Conditions

以下の場合は推測で製造を継続せず、STOP してユーザーへ報告する。

- Design document と実装のどちらを正とすべきか判断できない。
- Windows / Android parity を維持できるか判断できない。
- Public API / persisted data / Runtime / Recovery / GitHub write semantics の変更が必要。
- Test intent が不明で、Test または実装のどちらを変更すべきか判断できない。
- User change と自分の変更が競合する。
- Fixture / Test Branch の内容を Release へ取り込む必要があるように見える。
- 要求を満たすために Architecture 上の新しい重要な Contract を導入する必要がある。

## 11. Commit Scope

- Commit には依頼された変更と、それを成立させるために明示的に必要な最小限の Repository metadata 変更だけを含める。
- 既存 Source の refactoring、formatting、comment 追加、UI 修正を別目的の commit に混ぜない。
- `package.json` の `packageManager` を変更する場合は、現在の lockfile、実行環境、既存設定から version を確定できる根拠がある場合だけにする。
- Commit 前に作成内容を自己レビューし、現在の Repository 構成・既存設計と矛盾していないこと、特定 Version の一時的ルールを恒久ルールとして誤記していないことを確認する。
