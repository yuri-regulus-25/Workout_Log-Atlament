# v2.0.0 Application Settings 改修 DRAFT

## 基本方針
SettingsはApplication / Data Source等の「設定」を管理する。Master Dataの内容編集はSettingsへ含めず、Master Data Maintenanceへ分離する。

- Master Dataのファイル名 / Path等: Settings
- Master Dataの内容: Master Data Maintenance
- Main Gym指定: Master Data Maintenance

Settingsは情報量に応じてSection整理だけでなく、属性種別単位で画面を分割する構成も検討する。

# 1. Information Architecture
- Section再編: Pass
- Anchor Navigation: IA設計へ統合
- Mobile Section Selector: 独立FeatureとしてSkip、IA設計へ統合
- Advanced設定の分離: Pass
  - Accordion固定ではなく、低頻度・高度設定を通常設定から分離する要件とする
- 初回設定項目を上位へ: Setup専用画面へ吸収

# 2. Setup Assistant
初回設定専用画面を新設する。

- Setup完了前は通常Applicationへ進めない
- Setup Skipは不可
- 途中離脱後は完了Stepを保持しResume可能
- Repository / Resources / Credential / Connection Check / Initial Sync / Completionを扱う
- Setup Progress / Completionを明示
- Connection Check成功後にInitial Syncを実施
- Initial Sync成功までをSetup完了条件とする
- Setup完了後は通常NavigationからSetupへの導線を表示しない
- 完了後の設定変更はSettingsから行う
- Setup UIは固定構成または設定状態からの動的DOM生成を実装時に選択可能

# 3. Repository
- Owner / Repository / Ref / Root Path等のInline Validation: Pass
- Connection Test独立操作: Skip
  - 通常SettingsではSave時にValidation + Connection Checkを実施
- Remote Checked成功結果詳細: Skip
- Ref説明: Information IconのTooltipとしてPass
  - 実際に設定可能なRef種別のみ説明する
- Root Path Preview: Skip
- Dirty State: Pass
  - 未保存表示 + Save状態制御
  - 画面離脱Warningは不要
- Reset Unsaved Changes: Skip

# 4. Resources
- Resource Type重複: WarningではなくValidation
  - 同一Typeを複数保持可能かは設計確認事項
- Required Resource不足Validation: Pass
- Resource Path Validation: Pass
- file / directory説明: Skip
- Default Resource Template: Skip
- Remove Confirmation: Pass
- Resource Status表示: Skip
- Remote Resolved Path Preview: Skip
- Drag Reorder: Skip
- Resource追加・削除後Dirty State: Pass
- ResourceごとのInline Validation: Pass
- Save時のResource全体整合性Validation: Pass

# 5. Credential
- Token Show / Hide: Pass
- Credential Status (`Present / Missing / Expired`): Pass
- Days Until Expiry: Pass
- Expiry Warning: Pass
- Credential Delete: Pass
- Delete Confirmation: Pass
- Frontend非保存の説明: Skip
- GitHub Scope Guidance: Pass（Tooltip等）

## Token Expiration / Limit
Token LimitはGitHub側の設定可能値に合わせた選択式とする。

- Presetから選択
- Custom / 自由設定を選択した場合のみLimit Date設定Componentを表示
- Preset選択時は期間と日付を二重入力させない
- SetupのCredential Stepにも同一仕様を適用

# 6. Sync
- Manual SyncをStatus / Sync情報付近へ配置: Pass
- Sync Operation State: Pass
- Double Execution防止: Pass（Operation Stateへ統合）
- Last Successful Sync: Conditional Pass
  - 既存Sync処理 / AF側で自然に日時を保持できる場合のみ
  - 表示のためだけに大きな永続化構造を追加しない
- Last Attempted Sync: Skip
- Runtime Data Timestamp: Skip
- Local Fallback Active表示: Pass
- Sync Result Summary: Skip（APIにない情報を表示目的だけで追加しない）
- Sync Failure時の該当Settings誘導: Pass
  - 原因を特定できる場合のみ対応Sectionへ誘導

# 7. Status / Version
- Application Overall Status: Pass
- AF / Frontend Version: Pass
- Android / Windows Package Version: Pass
- GitHub / Runtime / Hosting Component Status: Pass
- Required Actions: Pass
- Status Refresh: Skip
- Copy Diagnostics: Skip

# 8. Diagnostics
独立Diagnostics機能は設けない。

- Runtime Status Snapshot: #7へ統合
- Component States: #7-4へ統合
- Required Actions: #7-5へ統合
- Version Matrix: #7-2 / #7-3へ統合
- Configuration Completeness: Skip
- Last Operation Status: Skip
- Platform Information: Skip
- Copy as Text / JSON: Skip

# 9. Timeout
- Advancedへ移動: Pass
- Default値表示: Pass
- Reset Defaults: Skip
- 単位明示: Pass
- 推奨範囲説明: Skip
- 異常に短い値Warning: Validationへ変更してPass
  - System上成立しない値のみ保存不可とする

# 10. UI / UX
- 全画面Operation Overlay見直し: Pass
- 操作単位Loading: Pass
- Save後Scroll-to-top廃止: Pass
- Section-local Message: Pass
- Dirty Indicator: Pass / #3へ統合
- Save Enable条件: Pass
  - 変更あり + Validation OK時のみSave可能
- Sticky Action Area: Skip
- Mobile Resource Row改善: Commonへ
- Destructive Action Style統一: Commonへ
- Form Description常時追加: Skip
- Autocomplete属性適正化: Pass

# 11. Accessibility
Settings固有Featureとして分離せずCommonへ移植する。

- Operation状態Announcement
- Field Error Association
- Dynamic Resource Add / Remove Announcement
- Destructive Confirmation Keyboard Operation
- Statusを色だけで表現しない
- Form Group Semantics

# 12. Developer Experience
- Settings Component分割: 実装時判断
- Section単位Component化: 実装時判断
- Operation State型強化: Pass
- Validation Utility: Pass
- Status Label Metadata共通化: 実装時判断
- Settings Integration Tests: Pass

画面 / Section構造確定前にComponent構造を固定しない。
