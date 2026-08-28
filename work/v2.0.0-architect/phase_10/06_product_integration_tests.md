# v2.0.0 Phase 10-J — Product Integration Tests

## 日本語

### 目的
Phase 10で統合したPortal / Drawer / Navigation / Status / Error / Responsiveを、実際のユーザー遷移として横断試験する。

### 必須Test観点
- Portal -> 各Application
- Application -> Drawer -> 別Application
- Settings / Setup / Recoveryへの遷移
- Application -> Portal/Home
- Direct Route / Reload
- Browser Back / Android Back
- Current Application / Active Navigation state
- READY / DEGRADED / UNAVAILABLE等のPhase 8状態との整合
- Main Gym未設定が全体NavigationをBlockしないこと
- 404 / 500 / 503 Recovery
- Desktop / narrow/mobile / Android safe area
- Windows / Android / Development Runtime
- Application Registry/Metadata追加・変更時のPortal/Drawer整合

### Documentation Decision
**本Phaseでは `docs/design` の最終As-Is更新を行わない。**
Phase 11のUI/UX Human ReviewによりNavigation、Label、Dialog、Layout、Error presentation等が変更される可能性があるため、最終As-Is DocumentationはUI/UX FIX後の後続工程へ送る。

Phase 10中に実装上必要な最低限の作業メモ/契約更新が不可避な場合も、最終As-Is完成作業とは区別する。

### Phase 10 Exit Condition
Phase 0〜9で構築したApplication群がPortal / Drawer / Status / Error / Responsiveを含む一つの製品として機能的に操作可能であること。ただしUI/UXおよび最終設計書はFIX前である。

---

## English
Run product-level integration tests across Portal, Drawer, navigation, lifecycle status/recovery, error pages, responsive behavior, and all runtimes using real user navigation paths. Verify direct routes/back behavior and shared registry consistency.

**Do not perform final `docs/design` As-Is synchronization in Phase 10.** Phase 11 human UI/UX review may still change navigation, wording, dialogs, layout, and error presentation. Final As-Is documentation is deferred until UI/UX is fixed. Phase 10 exits with functional product integration while UI/UX and final documentation remain unfrozen.