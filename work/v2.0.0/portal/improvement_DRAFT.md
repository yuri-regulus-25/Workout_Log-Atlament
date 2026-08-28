# v2.0.0 Portal Improvement DRAFT

## Status

Portal Discovery一次レビュー後のDRAFT。

`improvement_candidates.md` の全候補から、Portalの責務に合うものを残し、横断課題は `../common/improvement_candidates.md` へ分離した。

## Portalの基本思想

PortalはAtlamentの各Applicationへ入るためのEntry Surfaceとする。

以下はPortalへ持ち込まない。

- Workout Dataの分析・Summary
- Recommendation
- Workout操作
- Repository / Credential等の設定変更
- Manual Sync等の実行系API操作

Portalから状態情報を参照することは許容するが、実行・設定責務はApplication Settingsへ残す。

---

# 1. Application Card表現の将来拡張

**Priority: Low**

現行のApplication Cardおよびフレーバーテキスト自体は維持してよい。

ただし今後Applicationが増加した際、Applicationごとに新しいフレーバーテキストを必須とすると追加負荷になるため、フレーバーテキストがなくても成立するCard表現を検討する。

候補:

- Application Nameを主情報として明確化
- Category / Frameworkは副情報として扱う
- Descriptionが短い、または存在しない場合でもLayoutが成立する
- Card全体のclick / focus affordance改善
- 新規Application追加時に既存Cardとの高さ・情報密度が破綻しないこと

既存フレーバーテキストを積極的に削除する目的ではない。

---

# 2. Status / Initial Setup Information UI

**Priority: Medium**

現行Status NoticeとInitial Setup Guidance候補を整理し、PortalからAtlamentの現在状態を必要なときだけ確認できるUIを検討する。

## 基本方針

- Status情報は恒常的に大きく表示しない
- Dialog / Popover / Drawer等の開閉可能なUIを候補とする
- 通常時はPortalのApplication Launcherを邪魔しない
- Setup不足・Degraded等の場合は状態の存在だけ認識できる表現を検討する
- 詳細を開いた場合にStatus / Data freshness / Setup Guidance等を表示する
- 必要な操作はApplication Settingsへ誘導する

表示候補:

- Runtime Ready / Degraded
- Runtime Data Available / Required
- GitHub connection state
- Last successful sync / data freshness
- Local Fallback利用中であること
- Initial Setup required
- Required Actionの概要
- Application SettingsへのNavigation

## 明示的に行わないこと

Portalから以下の実行系APIは呼び出さない。

- Manual Sync
- Connection Test
- Repository更新
- Resource更新
- Credential更新
- Timeout更新

Portalは状態参照とSettingsへの導線までを責務とする。

---

# 3. Hero / Layout調整

**Priority: Medium候補**

PortalのFirst ViewとApplication LauncherのInformation Densityを再評価する。

候補:

- Hero高さの縮小
- Application LauncherをFirst Viewへ寄せる
- Status UI追加時のLayout Shift抑制
- Desktop / Mobileでの余白調整

Portal単独で完結する軽微調整なら本項で扱う。

全ApplicationのHero / Page Headerへ影響する場合は `../common/improvement_candidates.md` のCross-Frontend課題として扱い、影響範囲によってはHigh相当とする。

---

# 4. Theme / Brand Visual Polish

**Priority: Medium**

v1.1.0で導入したTheme / Brand Variant基盤を前提に、PortalのVisual表現を軽く磨く。

候補:

- Hero background tokenの調整
- Card accent表現
- Dark ModeでのCard境界・階層改善
- Green / Violet Brand Variantでのsubtle decoration
- Theme間でInformation Hierarchyが変化しないことの確認

Brand VariantごとにLayout・機能・Navigationを分岐させない。

---

# 5. 軽微なMotion調整

**Priority: Low**

必要であれば以下を調整する。

- Card hover / focus transition
- Status Information UIのopen / close
- 軽微なEntry transition

過剰なAnimationは導入しない。

`prefers-reduced-motion`等の横断品質はCommon課題として扱う。

---

# 6. Application Metadata活用

**Priority: Low**

新規Application追加時のPortal / Shared Navigation間の重複更新を減らせる場合、既存Navigation metadataの活用範囲を広げる。

候補:

- route
- application name
- framework
- category

フレーバーテキスト等のPortal固有表現まで無理に共通metadata化しない。

実装が単純で保守性改善が明確な場合のみ採用する。

---

# Portalから除外した候補

以下は一次レビューでPortal責務から除外した。

- Application利用可否をCardへ大量表示
- Recently Used Application
- Application Search / Quick Launch
- Portal上のWorkout Data Snapshot
- Latest Workout Shortcut
- Recent PR
- Continue Exploring
- Manual Sync
- Open in New Window
- Keyboard Quick Navigation
- Application数増加を先読みした過剰なGrid設計
- Visual要素の追加によるCard装飾強化

Accessibility / Mobile / Responsive Baseline / Frontend Test等の全画面課題はCommonへ移動した。
