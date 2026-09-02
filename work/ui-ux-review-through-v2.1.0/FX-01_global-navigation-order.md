# FX-01 グローバルナビゲーション順序統一

## 概要

PortalとGlobal Sidebarで機能順序を統一し、Responsiveで1列表示になった場合も意味上自然な順序を維持する。

## 確認した現状

PortalのDesktop表示では6機能が3列×2段で並ぶ。

確認画像:

`Codex 画像 2026年9月2日 00_55_22.png`

画像上の並びは次のとおり。

```text
Dashboard              Workout Domain          Performance Detail
Analytics              Application Settings    Resource Management
```

縦長WindowやAndroidで1列化した場合は、DOM順により概ね次の順で並ぶことが会話中に指摘されている。

```text
Dashboard
Workout Domain
Performance Detail
Analytics
Application Settings
Resource Management
```

またDashboard画面のSidebar画像でも、下位Navigationが次の順であることを確認できる。

```text
Analytics
Application Settings
Resource Management
```

したがってPortalだけを直しSidebarを放置すると、同一アプリ内でNavigation順が不一致になる。

## 要求

PortalとGlobal Sidebarの機能順序を次で統一する。

```text
1. Dashboard
2. Workout Domain
3. Performance Detail
4. Analytics
5. Resource Management
6. Application Settings
```

**Application Settingsは最後に置く。**

## Desktop Portalの期待配置

3列×2段のままなら次の見え方になる。

```text
Dashboard              Workout Domain          Performance Detail
Analytics              Resource Management     Application Settings
```

## Responsive時の期待順序

1列表示になっても同じ意味順を維持する。

```text
Dashboard
Workout Domain
Performance Detail
Analytics
Resource Management
Application Settings
```

## 実装上の方向

会話では、CSSによるPlatform別の見た目だけの並べ替えではなく、カード定義 / DOM順そのものを意味順へ合わせる案が提示されている。

これは実装候補として妥当だが、実装時には現在のNavigation定義を調査した上で最小変更とする。

PortalとSidebarで別々に順序をハードコードし、将来再度ズレる構造は避ける方向で検討する。

## 受入条件

1. Portalで `Resource Management → Application Settings` の順になる。
2. Global Sidebarでも同じ順になる。
3. Desktop / 縦長Window / Androidで意味上の順序が変わらない。
4. 既存の各Navigation先は変更しない。
5. Platform専用画面を追加しない。

## v2.1.0への位置づけ

既存機能の情報設計改善でありCorrectness blockerではない。

会話では変更規模・Riskが小さいためv2.1.0へ混ぜてもよい候補として扱われているが、v2.1.0へ実装すること自体はこの資料では確定しない。
