# 設計監査 最終まとめ

## 対象範囲

この文書は `Chat_GPT_Context` 上で実施したRepository全体の設計監査を締めるためのまとめである。

監査では次を分離して扱った。

- 確定済みの製品・Domain契約
- 現行実装
- 未Release機能の実装差異
- 将来Release計画
- 意図されたPlatform Adapter差異

実装差異を、現行仕様であるかのように設計書へ書き換えない。

## 確定した横断契約

### Identityと保存単位

- Workout Domain Identityは `session_id`。
- Dateはグループ化・検索・画面遷移に使う属性であり、Identityではない。
- Resourceは永続化・検証・Git・Recoveryの単位であり、Workout Domain Identityではない。
- 1回の利用者保存操作を1つのatomic Git commitとして扱う。

### 空・不在・利用不能の区別

- Workout Resource 0件を標準の正常な初期・空状態とする。
- 存在するWorkout Resourceは少なくとも1 Sessionを含む。
- 0 byte / 0 line JSONL、`{}`、`[]` を正常な空Workout Resource表現にはしない。
- Master Resourceの不在は異常。
- schema-validなMaster Resourceがrecord 0件である状態は、読み取り/schema上の正常状態になり得る。
- 読み取り上のvalidityとResource Managementの書き込み遷移規則は分離する。

### Resource Configuration

- `required` と `emptyAllowed` を目標仕様の利用者設定可能なDomain semanticsにはしない。
- Resourceの存在・空状態の規則はResource Type / Atlament Domain契約で定義する。
- 現行実装に残るfieldは無断削除せず、移行を伴う実装差異として扱う。

### Runtime Health

- v2.1.0ではBroken Workout ResourceをResource全体で隔離し、他のWorkout Resourceは利用可能な場合がある。
- Broken Workoutの隔離と、Runtime全体のLKG代替利用は別状態。
- Broken Master Resourceは新Runtime採用を止め、whole-runtime LKGがあれば代替利用し、なければRuntime利用不可。
- v2.3.0では構造解析後のinvalid Master Recordだけを隔離できる設計へ拡張可能。Recoveryの置換単位はResource全体のまま。

### Data Recovery

- Data Recoveryは用途限定のResource置換であり、汎用Workout CRUDやRaw JSON editorではない。
- Recovery DraftはAF localに保存し、元Resource Revisionへ紐付ける。
- Git書き込み前にResource全体検証を行う。
- 同一path置換はContents APIを使用できる。
- path変更はGit Data APIを使った1つのatomic Git commitで行う。
- 自動merge、rebase、overwrite、force updateを行わない。
- Git保存成功後にlocal反映だけ失敗した場合は「保存済み・反映失敗」とし、Gitを自動rollbackしない。

### Platform間設計

- OSに依存しない意味・処理は共通化する。
- OS差異は実際にPlatform固有である理由がある場合にPlatform Adapter境界より下へ閉じ込める。
- 物理app-data rootは異なってよいが、root配下の論理保存構造まで理由なく分岐させない。
- C# / Kotlin等の理由でliteral code sharingが困難な場合は、共通fixture / test vector / contract testで意味的同一性を保証する。

### Frontend

- FrontendはAFが返すHealth、Readiness、書き込み可否等のstructured factsを表示し、messageから独自推論しない。
- Hosted Application metadataは1つのApplication Registryまたはそこから生成したartifactを基準情報とする。
- Frameworkが異なっても、UXの意味、操作、accessibility、responsive behavior、状態表現は共通契約に従う。Component sourceの共有自体は必須ではない。
- Theme / Brandingの意味契約と、localStorage / DOM等の保存・実装方式を分離する。

### 集計とパフォーマンス

- Atlamentは記録された事実と、明示的に定義された決定論的集計を表示する。
- 明示的な評価モデルがない限り、成長、不足、刺激、効果、良否等を推論しない。
- Weight / VolumeをPerformance指標として比較する場合、原則として同一Gym・同一Machineの比較可能性を維持する。
- 期間ID `month` は使用箇所において現在のlocal calendar monthを意味する。

## 設計書へ反映した領域

今回の監査では、次の設計領域を更新または追加した。

- 共通設計原則・Architecture
- Data Overview
- Workout / Master schema
- Runtime Contract Matrix
- Recovery Contract
- AF API Contract / Inventory
- Windows / Android AF仕様
- Filesystem / GitHub I/O
- Build / RuntimeとApplication Registry方針
- Frontend共通UX契約
- Portal
- Dashboard
- Workout Domain
- Performance Detail
- Analytics
- Application Settings
- 確定済み横断契約と衝突する範囲のv2.2 / v3.1 / v3.7計画

## 残っている実装作業

以下は未解決の製品判断ではなく、実装・移行作業である。

1. Windows、Android、Settings、shared DTO、test、永続化済みconfigurationから `required` / `emptyAllowed` を廃止・非推奨化する。
2. v2.2目標仕様でWorkout Resource 0件を正常Runtime状態とし、invalidな空file検出は維持する。
3. Androidの未知API routeを404へ統一する。
4. Androidのrate-limit error codeを `GITHUB_RATE_LIMIT` へ統一する。
5. Android Recoveryのpath変更をatomic Git writeで実装する。これはv2.1の正当性を満たすための必須修正。
6. Android Recovery確定失敗をUIへ正しく表示し、UTを再実施する。
7. Windows / Androidのcanonical replacement serializationについて必要な同一性を解決する。
8. Recovery Draftの論理保存を共通Application Storage境界へ収束させる。
9. Application Registry metadataの重複consumerを統合する。
10. Runtimeの物理file名を変更する前に、収束方法と移行・互換性を調査する。
11. v3.1でDateだけでは曖昧な場合にSessionを明示識別できるWorkout CRUD / routeを導入する。
12. About実装前にCommon Build Metadata契約を定義する。

詳細は `01_design-implementation-gaps.md` を参照する。

## 横断検索結果

Repository横断検索では、確定した目標仕様との差異が現行ソースコードに残っていることを確認した。主な対象は次のとおり。

- `required` / `emptyAllowed`
- Workout 0件を拒否する処理
- Android固有実装の一部差異
- Runtime保存名

今回の作業は設計監査であるため、これらはApplication sourceを勝手に変更せず「実装差異」として記録した。

過去のUT・調査・レビュー証跡には、当時の実装や用語が残る場合がある。目標仕様が当時すでに存在したように見せるため、Historical Evidenceを書き換えてはいけない。

## Path命名規則

GitHub Mobileでの互換性を考慮し、Repositoryのfile / directory名は可能な限りASCII英語を使用する。文書本文は日本語でよい。

UI/UX review archiveとdesign-audit workspaceはASCII英語pathを使用する。

## 完了条件

次を満たした時点で、今回の設計監査は完了とする。

- 確定済み契約が現行設計書へ反映されている。
- 既知のソースコード差異が実装差異として分類されている。
- 将来計画が確定済みのRelease横断契約と矛盾していない。
- 過去の証跡と現行設計を区別できる。
- 新しい製品・Architecture判断を実装詳細として隠していない。

以上の条件を満たしたため、Repository全体の設計監査は完了とする。

残件は実装・移行、UT、または後続文書整備として扱う。
