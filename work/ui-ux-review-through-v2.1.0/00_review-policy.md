# UI・UXレビュー方針

## この資料の位置づけ

2026-09-02時点でGoogle Driveへ退避されているUI/UXレビュー会話を、後から製造判断・実装指示へ利用できる形に再整理する。

この資料は `001.md`〜`060.md` までに確認できたレビュー方針を記録する。

## レビュー対象

画面だけに限定しない。次の領域をレビュー対象とする。

- UI: 表示、レイアウト、文言、視認性
- UX: 導線、状態理解、処理結果の伝達、エラー表現
- 機能UX: 必要な操作ができない、仕様上利用者が困る等の問題
- 操作UX: 操作回数、再操作、戻る・更新、誤操作への耐性
- 開発UX: UT fixture、branch切替、build・install、ADB、デバッグ、ログ、再現性
- 運用UX: Recovery後の確認、Git差分、障害時の復旧・調査容易性

## 基本原則

**レビュー対象は広く、v2.1.0の変更範囲は狭くする。**

「問題として記録すること」と「v2.1.0へ実装すること」は分離する。

レビューで見つけた問題は、v2.1.0へ入れない場合でも失わず記録する。

開発UXについては、DX-01〜DX-04で共通して次の問題意識が確認された。

> Release / Debug、Windows / Android、接続先、設定を混在させ、人間が頭の中と手作業で辻褄を合わせる運用をやめる。

人間が「今どのBuildが動いているか」「どのPlatformか」「どこへ接続しているか」「どの設定を投入するか」を暗黙に管理するのではなく、Build・Tooling・設定の境界を明示する。

ただし、DX-02 / DX-03については `009.md` で **v2.1.0では同時稼働を避ける等のOperationでCoverする** 方針が示された。要求自体はBacklogとして保持するが、v2.1.0へ入れる確定事項として扱わない。

## Windows / Android共通UIを前提としたレビュー方法

AtlamentではWindows / AndroidでUIを共通化している。

`011.md` で、次の線引きが明示された。

- Shared UIは維持する。
- Android専用の機能画面は新設しない。
- 同一Component / 同一機能モデルの中で、Platformまたは入力Capabilityに応じた軽微な挙動差は許容する。
- AndroidでPagination Animationを抑制している既存例のように、操作環境に応じた差分は認める。

したがって、Windows固有のInteractionをそのままAndroidへ要求しない一方、Platform差を理由に情報や能力そのものを失わせない。

> **同じ情報・同じ能力を提供する。画面は共通化したまま、必要なら入力Capabilityに応じた軽微なInteraction差を許容する。**

## Portal / Global Navigation

PortalとGlobal SidebarでNavigation順序を統一し、Responsiveで1列化しても意味上の順序を維持する。

## Dashboard

Dashboardは「最近どうか」を短時間で把握する画面として扱い、詳細分析と混同しない。同一Dashboard内のTrend Chartは比較可能な期間Scopeを維持する。

## Search Target Card

検索条件全体に作用するResetは入力Gridへ混ぜず、Header Utility Actionとして扱う。Bodyは検索条件だけのResponsive Gridとする。

## ユーザー向け期間表記

Analytics等のユーザーUIへ `7d` / `28d` / `3m` のような内部的短縮表記をそのまま露出しない。内部値と表示ラベルを分離する。

## 状態表示

保存済み状態と未保存Form状態を混同しない。画面上に見えている値が未保存である場合、それを保存済みであるかのように見せない。

## Theme / Semantic Color

`046.md`以降のLight / Dark比較で、Themeごとの視認性とSemantic Distinctionを個別に確認する方針が明確になった。

- Lightで成立していてもDarkで成立するとは限らない。
- Darkで成立していてもLightで成立するとは限らない。
- Primary Actionと通常LoadingはTheme `primary` を使用する。
- 状態BadgeはSemantic Tokenを使用し、意味の異なる状態を同じ見た目にしない。
- 色だけで状態を識別させず、文言も維持する。
- Select Menu、Icon、Alert等もTheme-awareにする。

詳細は `COMMON-01_ThemeとSemanticColor共通規則.md` を参照する。

## Loading Overlay

Loading Overlayは、処理中であることがLight / Dark双方で視認でき、表示中は背面Interactionを抑止する。少なくとも背面Scrollを許可しない。

通常Loading IndicatorはTheme `primary` を使用する。

## `v-alert` の共通規則

`040.md`で明示された要求として、対象Dialog等の `v-alert` はCompact化し、原則 `class="mb-4"` を付与する。

- Alert内部の不要な上下余白は削る。
- Alert直後のContentとの意味的余白は残す。
- 1行Alertは低く、複数行は内容に応じて自然に伸ばす。
- Light / Dark双方でSemantic ColorとContrastを成立させる。

## Dialog共通Shell

Maintenance系Dialogは、HeaderにClose / Title / Primary Actionをまとめ、Header下にDivider、BodyにContentを置く構図を基本とする。Footer Action用の無駄な空間を原則持たない。

参照HTMLはVue.js v2 + Vuetify v2由来のため、**コード・DOM・class・固定widthを移植しない。構図だけを現行AtlamentのComponent APIで再構成する。**

Recovery Commit確認Dialogでは、対象データ・保存先・確認結果をCompactな情報Gridとして表示する。

Recovery等、固有の契約があるFlowを共通Dialog見た目の都合で変更しない。

## Pagination表記

同じ件数選択UIで `Items per page` / `Items per page:` 等の表記を混在させず、Frontend横断で `Show Items` に統一する。

0件時にPagerを表示するかどうかは別論点であり、本件では決定しない。

## Recovery UI

Recovery UIでは、次を特に重視する。

- Resource Type / Draft / 件数等のBadgeをLight / Dark双方で認識可能にする。
- IssueはHuman-readableな説明をPrimaryにする。
- 内部英語Message / CodeはSecondaryへ落とす。
- User Actionが必要なFieldと安全に復元済みのFieldで情報密度を分ける。
- `変更しました` / `復元できました` 等のField StateをSemantic Roleで区別する。
- Raw SourceはRead-onlyのSecondaryな補助導線とする。
- Validation stale / Result / Path Warningを同じAlert表現で並べず情報階層を分ける。

詳細は `FX-23_Recovery一覧の種別表示とDraft状態視認性.md`、`FX-24_RecoveryDetailの情報設計とTheme対応.md` を参照する。

## v2.1.0新規Recovery機能との境界

`009.md` 以降の機能UXレビューでは、原則として **v2.1.0新規Recovery機能の再設計を目的としない。**

既存機能をレビューしている途中でRecoveryにも関係する指摘が見つかった場合、Correctness問題でなければ基本的にBacklog候補として扱う。

## 058〜060の扱い

`058.md` と `060.md` はレビュー後の集計・再集計であり、個別レビューの一次記録ではない。

`059.md` では、`058.md` の集計からDX-xx / Portal / Common Navigation / Dashboardが漏れていたことが明示されている。

したがって再構成では、**001〜057の個別会話をSoTとして先に抽出し、058〜060は漏れ確認のCross-checkにのみ使用する。**

058〜060にだけ存在する要約内容で、前段の個別記録と矛盾するものを上書きしない。

## 分類

- A: v2.1.0 Freeze blocker — Correctness、安全性、データ破壊、操作不能等。
- B: v2.1.0で直す価値が高い小修正 — 低リスク・低コストで明確に改善できるもの。
- C: Backlog — 妥当だがv2.1.0へ入れるとRelease Scopeが大きくなるもの。
- D: Observation — 仕様変更を決定できるだけの根拠がまだないもの。

後続会話で決定が更新された場合は新しい決定を優先する。

## 資料化ルール

- ユーザーが明示した要求と、会話中に提示された実装案を区別する。
- 実装案を確定仕様へ昇格させない。
- 不明事項を推測で補完しない。
- 後続ファイルで決定が更新された場合は、更新された内容を反映する。
- 画像が根拠となる指摘では、可能な限り元画像も確認する。
- 製造担当者が元会話を読まなくても、要求・現状問題・受入条件・未確定事項を把握できる粒度を目標とする。
