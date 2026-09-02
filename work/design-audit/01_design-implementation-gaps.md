# 設計・実装差異監査

## 目的

今回の設計監査では、次の3種類を混同しない。

1. **設計差異** — 現行設計書が、すでに確定した契約と矛盾している、または曖昧な状態。
2. **実装差異** — 目標仕様は確定しているが、現行実装がまだ追いついていない状態。
3. **計画差異** — 将来Releaseの計画が、Releaseをまたいで確定した契約と矛盾している状態。

実装差異が存在すること自体は、未Release機能について現行実装が直ちに不具合であることを意味しない。目標仕様を採用する時点で、実装または移行作業が必要であることを意味する。

## 現在の差異一覧

| ID | 分類 | 領域 | 現在の状態 | 目標仕様・決定 | 対応 |
|---|---|---|---|---|---|
| GAP-001 | 実装差異 | Resource Configuration | Windows / Android / Settings / shared types に `required` と `emptyAllowed` が残っている。 | Resourceの存在・空状態は利用者が変更するbooleanではなく、Atlament Domain契約で決める。 | schema/config移行を考慮してfieldを廃止・非推奨化する。 |
| GAP-002 | 実装差異 | Workout空状態 | 一部Runtime処理は、設定されたWorkout fileが0件の場合をPlatform固有ロジックで拒否する。 | Workout Resource 0件が標準の正常な初期・空状態。空のWorkout fileは正常表現ではない。 | v2.2.0でWindows / AndroidのRuntime処理とtestを揃える。 |
| GAP-003 | 実装差異 | Android API | 未知のAPI routeが501を返す場合がある。 | 未知のrouteは404。501を一般的な未知route応答に使用しない。 | Android routingを修正する。 |
| GAP-004 | 実装差異 | GitHub error code | Androidの一部処理で `GITHUB_RATE_LIMITED` を使用している。 | 安定error codeは `GITHUB_RATE_LIMIT` に統一する。 | 必要なら移行中のconsumer互換性を保ちながら名称を統一する。 |
| GAP-005 | 実装差異 | Recovery path変更 | Androidはpath変更を伴うRecovery確定で503を返す。 | path変更はGit Data APIを使った1つのatomic Git commitで行う。 | v2.1.0 Releaseの正当性を満たすための必須修正。 |
| GAP-006 | 実装差異 | Recovery error UI | Android UTで、確定失敗がUIへ十分に表示されない事象を確認した。 | 書き込み失敗を利用者へ明示し、Git状態を誤認させない。 | UI/error伝播を修正しUTを再実施する。 |
| GAP-007 | 実装差異 | Recovery serialization | WindowsとAndroidで置換Resourceのserialization結果が異なる。 | 通常Domain model + canonical serializerを使用し、Platform間の意味的同一性を保証する。 | 共通fixture/test vectorを定義・検証する。 |
| GAP-008 | 実装差異 | Recovery Draft保存 | 物理pathがPlatform間で異なり、論理保存構造も明文化されていなかった。 | 共通論理pathは `recovery/drafts/{resourceKey}.json`。物理app-data rootのみPlatform Adapterが所有する。 | 必要に応じてApplicationStorage / Platform Adapter境界へ整理する。 |
| GAP-009 | 設計・実装差異 | Application Registry | route/Application metadataがFrontend、Build、Runtime等へ重複している。 | 1つのApplication Registryまたはそこから生成したartifactを基準情報にする。 | 重複箇所を棚卸しし、生成境界を決め、consumerを移行する。 |
| GAP-010 | 実装詳細 | Portal状態更新 | Portalは現在1500msごとにpollingしている。 | 更新方式・間隔は製品契約ではなく、状態の意味だけを契約とする。 | 緊急変更不要。1500msを設計要件として固定しない。 |
| GAP-011 | 実装・将来対応 | Workout route Identity | 現行routeはDate中心。 | `session_id` がDomain Identity。Dateはグループ化・画面遷移属性。 | v3.1 CRUDではDateだけで曖昧になる場合にSessionを明示識別する。 |
| GAP-012 | 将来実装 | Master部分採用 | 現行はMasterがBrokenの場合、Resource単位で新Runtime採用を止める。 | v2.3ではinvalid Master Recordだけを隔離可能にする。Recoveryは引き続きResource全体置換。 | v2.3契約・testの範囲で実装する。 |
| GAP-013 | 実装差異 | Runtime保存名 | Windows / AndroidでRuntime file名が異なるが、意味上必要な差である根拠が確立していない。 | OS非依存の論理保存名は共通化する。物理rootは異なってよい。 | 既存file変更前に移行・互換性を調査する。 |
| GAP-014 | 設計保守 | API Inventory | 過去Phaseの判断記録と現行契約が同じ文書内で混在していた。 | 現行一覧と過去の判断記録を区別する。 | 設計書は修正済み。今後も区別して保守する。 |
| GAP-015 | 将来実装 | About metadata | Version/package情報が複数のPlatform/Build情報源に存在する。 | 共通Build Metadata契約からAboutへ情報を渡し、About自身は表示だけを担当する。 | v3.7実装前に契約を定義する。 |

## Release前に必須の項目

### v2.1.0

- GAP-005: Android Recoveryのpath変更をatomic commitで実行する。
- GAP-006: Android Recovery確定失敗を正しく利用者へ表示する。
- GAP-007: Recovery契約が要求する範囲でcanonical serializationのPlatform間同一性を解決する。

これらは許容するPlatform差異ではない。

## 移行を伴う項目

次の項目は、互換性を調査せずfield/fileを単純削除してはいけない。

- `required` / `emptyAllowed`
- Runtimeの物理file名
- Recovery Draftの物理保存場所
- Application Registryの重複metadata

実装前に、永続化済み設定、package更新時の挙動、旧Runtime/cacheのcleanup、testへの影響を確認する。

## 監査ルール

新しい差異を見つけた場合、コードを変更する前に分類する。

```text
確定済み契約と設計書が矛盾      -> 設計差異
確定済み契約が未実装            -> 実装差異
将来計画が確定済み契約と矛盾    -> 計画差異
実際のOS/Platform制約による差異  -> Adapter差異として理由を記録
理由のないPlatform差異           -> 共通化候補
```

設計がすでに確定している場合、現行コードを自動的な正解として扱わない。一方で、未Releaseの目標仕様を現行仕様であるかのようにも記述しない。
