# Atlament v3.0.0 — Application Shell 実装指示書

## 1. 目的

v3.0.0では、Dashboard以下の各画面へ共通適用するApplication Shellを刷新する。

本資料は、Application Shellの責務・画面構造・実装境界・レスポンシブ時の挙動を定義する実装指示書である。

参照対象のMHTMLモックは、完成済みDOM / CSSの仕様書ではない。画面全体の構造、視覚上の方向性、配置関係を確認するための基準として使用する。

特に、各アプリケーション用モック内の画面本文はv2.x系HTMLを検証目的で組み込んだものであり、そのDOM構造・CSS値・余白値をv3.0.0の確定仕様として流用してはならない。

---

## 2. 実装対象と責務

Application Shellは以下を担当する。

```text
Viewport
└─ Application Shell
   ├─ Navigation
   ├─ Header
   └─ Main Surface
      └─ Screen Content
```

### Shellが担当するもの

- Atlament Logoの表示
- Portalへの戻り導線
- Application Navigation
- 現在画面の識別情報を表示するHeader
- Header文字列部のEaster Egg
- Main Surfaceの配置
- Desktop / MobileでのNavigation表示方式切替
- Shell外周のテーマ表現

### Shellへ持ち込まないもの

以下は各画面側の責務としてMain Surface内に残す。

- 検索条件
- Filter
- Period Selector
- Session Navigation
- 作成・編集などの画面固有操作
- 画面固有データ
- 画面固有の状態管理

Shell側へ画面固有ロジックを吸収してはならない。

---

## 3. 実装方式

Application Shellは **Vanilla JavaScript + CSSで一元実装する**。

React / Vue.js / Angular / Svelte / SolidJSの各画面へ、Shell本体の実装を分散させてはならない。

各Framework側は、原則としてMain Surfaceへ自身の画面内容を描画する責務のみを持つ。

実装上、各FrameworkからShellへ必要な情報を渡す必要がある場合も、Shell実装そのものをFramework別に複製しないこと。

---

## 4. Main Surface

Main Surfaceは、Shell外周のテーマ面上に配置する大きな角丸の中立色Surfaceとする。

実装時は以下を守る。

- 画面固有UIはMain Surface内へ配置する。
- 主な縦スクロール領域はViewport全体ではなくMain Surface内部とする。
- NavigationとHeaderはMain Surface内スクロールに追従させず、Shell構造として固定する。
- Scrollbarは視覚的に過度に目立たせない。
- 既存画面の情報密度を不必要に落とさない。
- UI刷新を理由に、巨大な余白・巨大なCard・情報量削減を行わない。

角丸・余白・Surface色・影などの具体値はモックを初期基準とし、実画面を組み込んだ状態で調整する。

---

## 5. Header

### 5.1 責務

従来各画面内に存在していた画面名と説明文は、削除ではなくShell Headerへ責務を移す。

Headerは現在画面を識別するための簡潔な1行表示とする。

```text
{Screen Name} - {日本語概要}
```

例:

```text
Dashboard - 現在までのワークアウトの概要を表示します
```

### 5.2 実装ルール

- 画面名と概要は1行で表示する。
- 従来のTitle + Subtitleによる2段構成をそのまま再現しない。
- 日本語概要は短い1文とする。
- 画面固有操作をHeaderへ追加しない。
- Header文字列の表示責務はShellへ集約する。

### 5.3 Easter Egg

現行のEaster Eggは、Header文字列部へ移植する。

実装時は以下を守る。

- Easter Eggの処理はShell Header側へ置く。
- 各Frameworkの画面コンポーネントへ同等処理を複製しない。
- 既存挙動の詳細は現行ソース確認後に継承する。
- 現行挙動を確認できない場合は、新しい挙動を推測して作らず作業を止める。

---

## 6. Navigation

Navigationは以下の2領域に分ける。

```text
Navigation
├─ 固定領域
│  ├─ Atlament Logo SVG
│  ├─ Divider
│  └─ Portal
│     ├─ Icon
│     └─ Label
│
└─ スクロール領域
   └─ Application Navigation
      ├─ Dashboard
      ├─ Workout
      ├─ Performance
      ├─ Analytics
      ├─ Resource Management
      └─ Settings
```

### 6.1 固定領域

Logo、Divider、PortalはNavigation内で固定する。

Application Navigationの項目数が増えた場合も、LogoとPortalがスクロールによって押し出されない構造にする。

### 6.2 Logo

- 既存Atlament Logo SVGを使用する。
- LogoをNavigation Itemとして扱わない。
- LogoはBrand Identityとして扱う。
- 現行のLogo押下によるPrimary Color変更機能は継承候補とする。
- Primary Color変更機能だけを理由としてSettingsへ新規設定項目を追加しない。

Logo押下時の現行挙動を実装前に確認し、継承可否を判断する。現行仕様が不明な場合は推測実装しない。

### 6.3 Portal

PortalはApplication Shell内部の画面ではない。

Portal導線はApplication Navigationと意味的にも視覚的にも分離する。

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

PortalはNavigation上部の固定領域へ配置する。

Portal用Iconは `mdi-arrange-send-to-back` を候補とする。Iconの最終採用は実装時に視認性を確認して決定する。

### 6.4 Application Navigation

Dashboard以下のApplication NavigationのみをNavigation内部のスクロール対象とする。

各項目はShell内部の画面遷移を担当する。

PortalだけはShell内部遷移ではなく、Portal Layoutへの切替として扱う。

---

## 7. Portalとの境界

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

Portal選択時はApplication Shellを外し、Portal独自Layoutへ切り替える。

PortalとApplication Shellは同一Layoutを共有しない。

ただし、以下の視覚言語は共通化してよい。

- Primary Green
- Logo
- Typography
- 角丸Surface
- 影
- Motionの方向性
- Iconの扱い

共通の見た目を持つことと、同一Layout Componentを共有することは別問題として扱う。

---

## 8. レスポンシブ時のNavigation

### 8.1 md以上

NavigationをShell左側へ常時表示する。

### 8.2 smレベル

常設Navigationを非表示にする。

同一のNavigation Contentを、左端から呼び出すDrawerとして表示する。

Desktop用とMobile用でNavigation内容を二重実装してはならない。

```text
Navigation Content
├─ Logo
├─ Portal
└─ Application Navigation

md以上
└─ Shell左側へ常設

smレベル
└─ 通常非表示
   └─ 左端SwipeでDrawer表示
```

### 8.3 Mobile Drawerで必要な挙動

実装時は最低限、以下の操作を成立させる。

- 左端から右方向へSwipeするとDrawerを開く。
- Drawer外領域をTapするとDrawerを閉じる。
- Application Navigation選択後にDrawerを閉じて画面遷移する。
- Portal選択時はDrawerを閉じてPortalへ遷移する。
- Drawer上で左方向へSwipeするとDrawerを閉じる。

Drawer幅は画面横幅のおおむね70%を初期基準とするが、厳密値は固定しない。

Swipe判定距離、Animation Duration、Easing、Drawer幅の最終値は実機確認後に調整する。

---

## 9. 視覚方針

- Primary ColorはGreenを基本とする。
- Shell外周でAtlamentらしさを表現する。
- Main Surfaceは中立色を中心とする。
- 現行より柔らかい視覚表現へ寄せる。
- 情報密度を維持する。
- 視認性・操作性を損なう装飾は追加しない。

以下の具体値は本資料では固定しない。

- breakpointのpx値
- Navigation幅
- Drawer幅の厳密値
- spacing
- radius
- font size
- Swipe閾値
- transition時間
- easing
- scrollbarの細部

これらはモックと実画面の両方を確認しながら調整する。

---

## 10. 実装手順

実装時は以下の順序で進める。

1. 現行Shell関連ソースを確認し、Navigation / Header / Layout / Easter Egg / Primary Color変更処理の所在を特定する。
2. 現行画面側に重複しているShell責務を洗い出す。
3. Vanilla JavaScript + CSSによるShell本体を一元化する。
4. Headerへ画面名と日本語概要の表示責務を移す。
5. Header Easter EggをShell側へ移す。
6. Navigationを固定領域とスクロール領域へ分ける。
7. Portal導線とApplication Navigationを分離する。
8. Main Surface内部のみが主にスクロールする構造へ調整する。
9. md以上の常設Navigationを実装する。
10. smレベルで同一Navigation ContentをDrawerとして表示する。
11. 各Framework画面から重複したShell実装を除去する。
12. Desktop / Tablet / Mobileで表示崩れと遷移を確認する。

現行ソース確認の結果、本資料と矛盾する既存依存が見つかった場合は、その場で推測修正せず影響範囲を整理してから対応する。

---

## 11. 完了条件

以下を満たした時点でApplication Shell実装を完了とみなす。

- Dashboard以下の各画面で同一Shellが使用されている。
- Shell本体が各Frameworkへ重複実装されていない。
- Headerに `画面名 - 日本語概要` が表示される。
- 画面固有操作がHeaderへ移動していない。
- Header Easter EggがShell側で動作する。
- Logo / PortalがApplication Navigationのスクロールに巻き込まれない。
- Application Navigationのみが必要に応じてスクロールする。
- Portal選択時にApplication Shellが外れる。
- md以上でNavigationが常設される。
- smレベルでNavigationが通常非表示となりDrawerから利用できる。
- Desktop / Tablet / Mobileで主要操作が成立する。
- Main Surface内の画面情報密度が不必要に低下していない。

---

## 12. 未確定事項

以下は実装時調整事項として残す。

| 項目 | 扱い |
|---|---|
| breakpointの具体px値 | 実装時調整 |
| Navigation幅 | 実装時調整 |
| Drawer幅 | 約70%を初期基準として調整 |
| Swipe閾値 | 実機確認後に決定 |
| Animation Duration / Easing | 実機確認後に決定 |
| Header font size | モック基準で調整 |
| Nav spacing | モック基準で調整 |
| Logo表示サイズ | モック基準で調整 |
| Portal Icon | `mdi-arrange-send-to-back` を候補として最終確認 |
| Logo押下Primary Color変更 | 現行挙動確認後に継承可否判断 |

未確定事項を推測で固定しないこと。