# 共通設計原則

本書は Atlament の設計・実装・将来計画を横断して適用する共通原則を定義する。個別機能の詳細仕様より上位の判断基準として扱い、個別設計で例外を設ける場合は、その理由を明記する。

## 1. 共通化とプラットフォーム境界

OS に依存する理由がない処理は共通化する。Windows / Android の差異は Platform Adapter 境界より下へ閉じ込める。

Platform 固有実装には、その処理が Platform 固有である理由を要求する。

共通化対象には、少なくとも以下を含む。

- Resource Inspection と Health 判定
- Schema / Domain Validation
- Runtime 生成規則
- Master reference 解決
- Recovery Draft の状態遷移
- Recovery Validation
- Git write policy と conflict semantics
- API DTO、error code、readiness semantics
- 論理保存パス

OS 依存として許容する代表例は以下である。

- application data の物理 root
- OS 固有の filesystem / atomic write primitive
- credential encryption（Windows DPAPI / Android Keystore）
- localhost HTTP host 実装
- WebView / native lifecycle
- packaging / build mechanics
- OS や実装基盤に依存する log 出力方式

C# と Kotlin のように実装コードそのものを共有できない場合でも、契約・test vector・fixture・contract test を共有し、意味論を各 Platform が独自に発明しない。

## 2. 論理保存構造

物理 root が Platform ごとに異なることを理由に、root 配下の論理ディレクトリ構造まで Platform 固有化しない。

共通論理構造は原則として以下を使用する。

```text
configuration/
runtime/
recovery/drafts/
logs/
```

たとえば Recovery Draft は、共通ロジックから `recovery/drafts/{resourceKey}.json` として扱い、Platform Adapter が各 OS の物理 root へ解決する。

## 3. Source of Truth と重複定義

同一の意味を持つ情報は、可能な限り単一の Source of Truth を持つ。

Application metadata、route metadata、version/build metadata、状態判定規則などを複数箇所で独立定義しない。複数 Framework / Platform が必要とする場合は、単一契約から参照・生成・変換する。

## 4. Workout の識別単位

Workout に関する Date、Session、Resource を同一視しない。

- Date: grouping / search / navigation のための属性。
- Session: Workout Domain Entity。`session_id` を Domain Identity とする。
- Resource: persistence / validation / Git / Recovery の単位。

同一日に複数 Session が存在できる。Date のみを Session Identity として扱わない。

Session と Resource の対応は 1:1 と仮定しない。JSONL Resource のように 1 Resource が複数 Session を含める形式を許容する。

保存処理は「1 Day = 1 Commit」ではなく、原則として「1 回のユーザー保存操作 = 1 atomic Git commit」とする。必要な複数 Resource / tree entry の変更は persistence 層で解決し、Git の都合を Domain Identity へ漏らさない。

## 5. Empty / Missing / Broken の分離

正常な空状態、Resource 不在、破損状態を混同しない。

Workout は Resource 0 件を正常な初期状態として扱う。空の Workout file を正常な空状態の canonical representation として導入しない。

Master は file の不在と、存在する有効な Master file 内の record 0 件を区別する。

Resource の存在要件や空状態の扱いは Domain Contract であり、利用者が `required` / `emptyAllowed` のような汎用設定で変更するものではない。

## 6. Recovery と通常編集の分離

Recovery は Broken Resource を安全な Domain Resource へ戻すための専用機能であり、Raw JSON / JSONL editor や generic Git editor ではない。

通常 CRUD と Recovery は目的・入力状態・validation・write eligibility を分離する。Recovery の Git write も purpose-limited API / service 境界からのみ実行する。

## 7. Frontend と Application Framework の責務

Resource Health、Recovery eligibility、readiness、write eligibility などの Domain / system state は Application Framework または共通 Domain 層が決定する。

Frontend はそれらを独自推論せず、表示・入力・画面固有の状態管理・visual composition を担当する。

Frontend Framework が異なっても、利用者に見える意味・状態・操作規則は共通 UX Contract に従う。

## 8. Hidden Magic を避ける

利用者が指定していない別 Entity へ自動的に置き換える、理由を説明せず fallback する、入力や保存結果を暗黙変換する等の hidden magic を避ける。

不足パラメータは選択を促す正常な未選択状態として扱える。不正パラメータは明示的な警告と復帰導線を提供する。別 Entity への自動 redirect / fallback は、明確な製品上の理由がない限り行わない。

## 9. 事実・集計・評価の境界

Atlament は記録された事実と、明示的に定義された決定論的集計を基本として表示する。

根拠となる明示的なモデルが存在しない限り、成長、不足、刺激、肥大、効果、良否などを推論しない。

実験的 Visualization であっても、面白さのために元データや計算結果へ虚偽の意味を付与しない。

## 10. Weight / Volume の比較可能性

Weight / Volume を Performance 指標として比較・評価する場合、原則として同一 Gym・同一 Machine という比較可能性を維持する。

異種 Machine の Weight / Volume を単純集計すること自体と、その値から Performance 評価を導くことは区別する。異種 Machine を合算した値から成長や優劣を推論しない。

## 11. Application 追加契約

新しい Frontend Application を追加する場合、少なくとも以下を確認する。

- Application Registry
- route
- Portal への表示要否
- global navigation への表示要否と順序
- build 対象
- AF hosting 対象
- unknown / fallback route
- Theme / Branding
- Application Access Policy
- Light / Dark と responsive behavior

Application metadata は単一 Source of Truth から参照する。

## 12. 差異には理由を要求する

Windows / Android、Frontend Framework、通常画面 / Error Page 等に差異が存在すること自体を禁止しない。

ただし、差異には設計上の理由を要求する。たとえば Error Page が通常 Application より依存を減らすことは、障害時にも表示可能である必要があるため正当な差異である。
