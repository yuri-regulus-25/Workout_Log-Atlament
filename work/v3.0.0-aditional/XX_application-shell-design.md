# Atlament v3.0.0 — Application Shell Design

## Positioning

v3.0.0でDashboard以下のApplication群へ適用するApplication Shellを刷新する。

本資料は完成DOM / CSS仕様ではなく、責務・構造・Visual DirectionのBaselineを定義する。

作成済みのApplication Shell MockをVisual Baselineとする。ただし、Mock内のApplication Contentはv2.x系HTMLを検証目的で組み込んだものであり、DOM構造や細かなCSS値をv3.0.0の確定仕様とはしない。

## Shell Structure

```text
Viewport
└─ Application Shell
   ├─ Navigation
   ├─ Header
   └─ Main Surface
      └─ Screen Content
```

- Navigation / HeaderはShell責務とする。
- Main Surfaceは大きな角丸を持つNeutral系Floating Surfaceとする。
- Theme / Brand Colorは主としてShell外周へ使用する。
- Screen固有UIはMain Surface内へ配置する。
- Viewport全体ではなくMain Surface内部を主なScroll領域とする。
- Scrollbarは視覚的には目立たせない方向とする。
- ShellはVanilla JavaScript + CSSで一元実装する。
- React / Vue / Angular / Svelte / SolidJS等の各Screen FrameworkへShell実装を分散させない。

## Visual Direction

- Theme Surface + Floating Main Surfaceを基本構造とする。
- Primary ColorはGreenを基本とする。
- 現行より柔らかいVisualへ刷新する。
- Application Screenの実用性・情報密度は維持する。
- Redesignを理由として過剰な余白や巨大なUIを導入しない。
- Atlamentらしさは主としてShell / Brand Surface側で表現する。
- spacing / radius / font size / breakpoint等の具体値はMockを参考に実装時調整する。

## Header

従来各Screen内に存在していたScreen Title / Descriptionは削除ではなくShell Headerへ責務移管する。

Headerは原則として以下の1行形式とする。

```text
{Screen Name} - {日本語概要}
```

例:

```text
Dashboard - 現在までのワークアウトの概要を表示します
```

従来のTitle + Subtitleによる2段構成をそのまま移植せず、Screen Nameと日本語概要を1行へ簡略化する。

Search / Filter / Period Selector / Session Navigation / Create・Edit等のDomain固有ActionはScreen責務としてMain Surface内に残す。

現行モデルでHeader文字列部に存在するEaster EggはShell Header側へ移植し、各Frameworkへ分散させない。

## Navigation

```text
Navigation
├─ Fixed Area
│  ├─ Atlament Logo SVG
│  ├─ Divider
│  └─ Portal Access
│     ├─ Icon
│     └─ Label
└─ Scrollable Area
   └─ Application Navigation
      ├─ Dashboard
      ├─ Workout
      ├─ Performance
      ├─ Analytics
      ├─ Resource Management
      └─ Settings
```

### Logo

- 既存Atlament Logo SVGを利用する。
- LogoはNavigation ItemではなくBrand Identityとして扱う。
- 現行のLogo押下Primary Color Changeギミックは継承候補とする。
- Primary Color ChangeのためだけにSettingsへ設定項目を追加しない。
- 本InteractionはBrand Interaction / Easter Eggに近い位置付けとする。

### Portal Access

PortalはApplication Shell内のScreenではないため、Application Navigationとは意味的・Visual的に分離する。

```text
Logo
────────────
Portal

Dashboard
Workout
Performance
Analytics
Resource Management
Settings
```

Portal AccessはNavigation上部へ固定し、Application NavigationのScrollによって押し出されない構造とする。

Icon候補は `mdi-arrange-send-to-back` とする。最終的なIcon選択は実装時に調整可能とする。

### Application Navigation

Dashboard以下のApplication NavigationのみをNavigation内部のScroll対象とする。

Visualは作成済みShell MockのNavigationをBaselineとする。

## Responsive Navigation

### md以上

Navigationを常時表示する。

### smレベル

常設Navigationを非表示にし、同一のNavigation ContentをMobile Drawerとして表示する。

Desktop用とMobile用でNavigation責務を二重実装しない。

```text
Desktop / Tablet
Navigation Content → Shell左側へ常設

Mobile
Navigation Content → 通常非表示
                   → Edge Swipe時にDrawer表示
```

Mobile Drawerは左端からのSwipeで表示する。

想定Interaction:

- 左端からSwipe → Drawer Open
- Drawer外領域Tap → Drawer Close
- Application Navigation選択 → Drawer Close + Screen遷移
- Portal選択 → Portal遷移
- Drawerを左方向へSwipe → Drawer Close

Drawer幅は画面横幅の約70%を初期Baselineとする。ただし厳密値は固定せず、実機確認時に調整する。

Gesture閾値・Animation Duration・Easing等も実装詳細として扱う。

## Portal Boundary

PortalはDashboardより上位のEntry Pointであり、Application Shell内部へ収容しない。

```text
Portal
  ↓
Application Shell
  ├─ Dashboard
  ├─ Workout
  ├─ Performance
  ├─ Analytics
  ├─ Resource Management
  └─ Settings
```

Shell上のPortal AccessはShell内部の別Screenへの遷移ではなく、Portalへ戻るための導線とする。

Portalへ遷移した時点でApplication Shellは外れ、Portal独自Layoutへ切り替わる。

PortalとApplication Shellは同一Layoutを共有しないが、Primary Color / Surface / Typography / Motion等のVisual Languageは共有可能とする。

Portal詳細Redesignは別途検討する。

## Responsive / Visual Detail Policy

設計段階では以下を過度に固定しない。

- breakpointの厳密なpx値
- Navigation幅
- Mobile Drawer幅の厳密値
- spacing / radius / font size
- Swipe判定距離
- transition duration / easing
- scrollbarの細かな実装

これらはShell Mockを初期Baselineとし、実際のScreen Contentを組み込んだ実装時に調整する。

一方、Responsiveによって責務・構造が変化する箇所については本設計で定義する。

## Implementation Principles

1. Shell責務を各Application Frameworkへ分散させない。
2. Screen固有責務をShellへ過剰に持ち込まない。
3. Mockの具体値より、Mockが示す空間構造とVisual Directionを優先する。
4. Responsive時に同一Navigation Contentを可能な限り再利用する。
5. UI上の修正箇所から実装責務を人間が自然に追跡できる構造を維持する。
6. 実装上の複雑性が判明した場合は本設計をBaselineとして追加分割・調整する。

## Decision Status

| 項目 | 状態 |
|---|---|
| Shell全体構造 | 決定 |
| Visual Direction | Shell MockをBaselineとして決定 |
| Shell実装 | Vanilla JavaScript + CSS |
| Header責務 | 決定 |
| Header表示形式 | `画面名 - 日本語概要` |
| Header Easter Egg | Shell Headerへ移植 |
| Main Surface / Scroll責務 | 決定 |
| Navigation構造 | 決定 |
| Logo | 既存SVG利用 |
| Logo Primary Color Change | 継承候補 |
| Portal Access | Navigation上部固定 / Application Navigationと分離 |
| Application Navigation | Navigation下部 / Scroll対象 |
| md以上 | Navigation常設 |
| smレベル | Navigation非表示 / Edge Swipe Drawer |
| Mobile Drawer幅 | 約70%をBaseline、実装時調整 |
| Responsive細部 | Mock + 実装時調整 |
| Portal詳細設計 | 別途検討 |
