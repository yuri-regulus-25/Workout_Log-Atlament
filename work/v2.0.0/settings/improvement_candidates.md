# v2.0.0 Application Settings 改修候補

## 現状
SolidJS。AF Status、Version、GitHub Repository、Resource、Timeout、Credential、Manual Syncを扱う。設定更新はAF API経由で行い、Credential値そのものは再表示しない。

## 1. Information Architecture
- System Status / Data Source / Resources / Credential / Runtime / AdvancedへSection整理
- Anchor navigation
- Mobile section selector
- Advanced設定を折りたたむ
- 初回設定に必要な項目を上位へ

## 2. Setup Assistant
- 初回のみSetup checklist
- Repository
- Resource paths
- Credential
- Connection check
- Initial Sync
- Completion

Wizard専用画面にする案とSettings内stepper案を比較する。

## 3. Repository
- Owner/Repository/Ref/Root Pathのinline validation
- Save前の形式validation
- Connection Test独立操作
- Remote checked結果詳細
- Branch/Tag/Commit refの説明
- Root Path preview
- 設定変更dirty state
- Reset unsaved changes

## 4. Resources
- Resource Type重複warning
- Required resource不足warning
- Path validation
- file/directory説明
- drag reorderは必要性低
- default resource template
- Remove confirmation
- Resource status表示
- Remote resolved path preview

## 5. Credential
- Token入力のshow/hide
- Credential present / missing / expiredの視認性改善
- Expiryまでの日数
- Expiry warning
- Credential削除を明示操作化
- destructive confirmation
- CredentialがFrontend Storageへ保存されないことの説明
- GitHub access scope guidance

## 6. Sync
- Manual Sync buttonをStatus近辺へ
- Startup/Manual operation状態
- Last successful sync
- Last attempted sync
- Runtime data timestamp
- Local Fallback active
- Sync結果summary
- Sync failureから該当設定Sectionへ誘導
- double execution防止表示改善

## 7. Status / Version
- Application overall status
- AF / Frontend version
- Android/Windows package version
- GitHub / Runtime / Hosting component status
- Required Actionsを人間向け表示
- Status refresh
- Copy diagnostics

## 8. Diagnostics
新規System画面へ分離する可能性も含む。
- Runtime status snapshot
- component states
- required actions
- version matrix
- configuration completeness
- last operation status
- platform information（公開可能な範囲）
- Copy as text / JSON

Credential値は絶対に含めない。

## 9. Timeout
- Advanced扱いへ移動
- Default値表示
- Reset defaults
- 単位明示
- 推奨範囲説明
- 異常に短い値へのwarning

## 10. UI/UX
- 全画面operation overlayの必要性再評価
- 操作単位loading
- Save成功後のscroll-to-top廃止/見直し
- Section内message表示
- dirty indicator
- Save button enable条件
- sticky action area
- Mobile resource row改善
- destructive action style統一
- form description追加
- autocomplete属性適正化

## 11. Accessibility
- operation overlay focus/announcement
- field error association
- resource dynamic add/remove announcement
- destructive confirmation keyboard operation
- statusを色だけで表現しない
- form group semantics

## 12. Developer Experience
- Settings component分割
- Repository/Resource/Credential/Timeout section単位component
- operation stateの型強化
- validation utility
- status label metadata共通化
- Settings integration tests

## 有力候補
1. Section再編
2. Setup checklist
3. Connection Test
4. Credential expiry UX
5. Last Sync / Runtime freshness
6. dirty state + section-local feedback
7. Diagnostics導線
8. TimeoutをAdvanced化
