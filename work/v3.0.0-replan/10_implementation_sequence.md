# 製造順序と停止条件

## 1. 原則

v3.0.0は変更範囲が広いため、全領域を同時に書き換えない。

各段階で次を繰り返す。

```text
現状調査
  ↓
契約・要求確認
  ↓
責務境界設計
  ↓
既存設計との衝突確認
  ↓
影響範囲確認
  ↓
実装
  ↓
試験
  ↓
修正
  ↓
再試験
```

## 2. 推奨順序

### 第0段階 — 基準固定

- 現行Branch / Version / Build状態確認
- 既存試験結果確認
- v3.0.0で維持するRuntime/API/Recovery契約一覧確認
- `work/ui-ux-review-through-v2.1.0/` の確定要求・改善候補・未確定事項を現行実装と照合
- v2.2.0までに既に解消済みのUI・UX指摘を識別
- 既存設計文書と現行実装の差異確認

### 第1段階 — 現行構造調査

Frontend、Windows、Android、Shared、Build / Dev Toolingを横断し、責務と依存を棚卸しする。

この段階では大規模なソース変更を開始しない。

### 第2段階 — 共通境界の確定

Runtime、API、Recovery等、複数領域へ影響する契約と依存方向を先に確定する。

UI・UX改善がこれらの契約変更を必要とするように見える場合は、実装を開始せず衝突を整理する。

### 第3段階 — Application Framework責務分離

Windows / Androidを、Platform間整合性を確認しながら段階的に分離する。

片方だけ意味論を変更しない。

### 第4段階 — 開発UX基盤

Android通常版 / 開発版共存、Debug Build、Build識別、AF Target解決、Android CLI起動等を、Application Framework本体との責務境界を保ちながら整備する。

未確定のBuild構成や表示形式を決める必要がある場合は人間判断へ上げる。

### 第5段階 — Application Shell / Portal

ShellとPortalのLayout境界、Navigation、Header、Main Surfaceを再構成する。

Navigation順序、Hover / Touch情報到達性、狭幅Header、Navigation Drawer等のUI・UX要求を同時に反映する。

### 第6段階 — 各Frontend画面

Pageを配置・構成中心へ移し、意味あるCard / Dialog / Input等を分離する。

同時にUI・UXレビューの確定要求を対象画面へ反映する。改善候補は現行問題の有無を確認し、未確定事項を勝手に仕様化しない。

Frameworkごとに自然な実装を維持する。

### 第7段階 — 全体回帰確認

Windows、Android、Shared、Frontend、Build / Dev Toolingの自動試験と必要な手動試験を実施する。

Light / Dark、Desktop / Narrow、Mouse / Touch、Windows / Android等、UI・UX要求が依存する条件も確認する。

## 3. 順序変更

現行依存を調査した結果、上記順序では一時的に不整合が発生する場合は順序を変更してよい。

ただし変更理由を説明し、契約維持と試験可能性を優先する。

## 4. 停止条件

次の場合は推測で作業を継続せず停止して確認する。

- 現行挙動と設計文書が衝突し、どちらを契約とするか判断できない
- Windows / Androidで同一契約の意味論が一致していない
- 既存試験が意図的仕様か偶発的実装か判断できない
- リファクタリングだけでは解消できない機能変更が必要になった
- データ形式や公開APIの変更が必要になった
- 既存挙動を確認できず、新しい挙動を推測する必要が生じた
- UI・UXレビューで改善候補または未確定とされた事項について、具体仕様の決定が必要になった
- 表示文言、色値、Build方式、Application ID、Port等を資料・現行実装から一意に決定できない

## 5. 完了条件

- 責務境界と依存方向を説明できる
- 巨大実装の単なるファイル分割になっていない
- 既存Runtime/API/Recovery契約が維持されている
- Windows / Androidの意味論が維持されている
- Frontendの主要Pageが構成中心の責務になっている
- Shell / Portal境界が設計どおり成立している
- UI・UXレビューの確定要求が実装または既存実装で充足され、確認済みである
- 改善候補・未確定事項について採否・保留理由が追跡できる
- 開発UX改善の要求が満たされている
- 自動試験と必要な手動試験が完了している
- 新たに発見した機能課題がリファクタリングへ無秩序に混入せず記録されている
