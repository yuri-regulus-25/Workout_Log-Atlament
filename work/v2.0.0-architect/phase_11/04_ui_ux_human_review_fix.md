# v2.0.0 Phase 11-F/G — UI/UX Human Review & Cross-App Fix

## 日本語

### 前提
Developer Mode / Mock Simulationが利用可能であること。

### 目的
全Applicationを実画面でHuman Reviewし、通常Dataだけでは確認困難な状態もDeveloper Modeで再現しながらUI/UXを最終調整する。

### Review対象
各Applicationについて必要に応じ以下を確認する。
- Normal
- Loading
- Empty
- Partial
- Error / Unavailable / Degraded
- Long text / large data
- Dialog / confirmation
- Navigation / Drawer / Portal
- Error Pages
- Desktop / narrow/mobile
- Windows / Android

### Fix対象
- wording / labels
- information hierarchy
- cards / tables / forms / dialogs
- spacing / typography
- icons
- empty/error/loading presentation
- navigation consistency
- responsive / safe area
- accessibility / focus / keyboard
- shared CSS/design tokens

### 進め方
Planning段階でPixel/文言を固定しない。Codexが既存実装・Design Token・Application責務から初期修正案を作り、人間が実画面をレビューし、指摘・修正・再レビューを反復する。

Domain/API/Data semanticsをUI都合で無断変更しない。必要な仕様変更が判明した場合は影響範囲を再確認する。

### 完了条件
全Applicationの主要状態がHuman Reviewされ、製品全体として一貫したUI/UXへ調整されていること。

---

## English
Use Developer Mode/state simulation to perform human visual/interaction review across every application and major normal/loading/empty/partial/error/degraded/stress state on desktop/mobile and Windows/Android. Iteratively refine wording, hierarchy, cards/tables/forms/dialogs, spacing, typography, icons, state presentations, navigation, responsive/safe-area behavior, accessibility, and shared styles. Do not freeze pixel-level details in planning or silently change domain/API/data semantics for UI convenience.