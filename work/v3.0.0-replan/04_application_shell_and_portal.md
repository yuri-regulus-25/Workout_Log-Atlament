# Application Shell / Portal再構成

## 1. 参照方針

`XX_application-shell-design.md` と `XX_portal_design_baseline.md` を設計基礎とする。

画面資料は視覚方向・階層・配置関係の参考であり、完成済みDOM、CSS値、固定寸法として扱わない。

## 2. Application Shell

Shellの責務は次とする。

- Atlament Logo
- Portalへの戻り導線
- Application Navigation
- 現在画面を識別するHeader
- Header文字列部の既存Easter Egg
- Main Surface
- Desktop / MobileでのNavigation切替
- Shell外周の共通表現

画面固有の検索、絞込、期間選択、Session移動、編集操作、画面固有状態はShellへ移さない。

Shell本体は既存設計どおりVanilla JavaScript + CSSで一元化し、Frameworkごとに複製しない。

## 3. Portal

PortalはApplication Shell内部の一画面ではなく、Atlamentの入口として別Layoutを持つ。

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

Portalは第二のDashboardにしない。主責務は移動先Applicationの選択である。

## 4. 境界

PortalとShellで視覚言語を共有してよいが、同一Layoutへ大量の条件分岐を追加して共存させない。

Shell Headerへ移動する画面名・説明文は各Page側に二重表示しない。

既存Logo押下挙動、Primary Color変更、Easter Egg等は実装前に現行ソースを確認する。確認できない挙動を新規に推測しない。

## 5. Responsive

Desktop / Tablet / Mobileで導線と情報量を維持する。具体的な境界幅は実画面と既存実装を確認して決定する。

巨大な余白やCardによる情報密度低下を避ける。
