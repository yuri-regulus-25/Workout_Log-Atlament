# Atlament v3.0.0 — Portal 実装指示書

## 1. 目的

PortalはAtlament全体への入口として機能する。

本資料は、v3.0.0におけるPortalの責務・画面構造・Application Shellとの境界・視覚方針・レスポンシブ時の考え方を定義する実装指示書である。

参照対象のPortal MHTMLモックを画面構成と視覚方向の基準として採用する。

ただし、モックは完成DOM / CSS仕様ではない。余白値、文字サイズ、Card幅、breakpoint、Animation等の具体値をそのまま確定仕様として扱わない。

---

## 2. Portalの位置付け

PortalはApplication Shell内部の1画面ではない。

Portalから各Applicationへ遷移した時点でApplication Shellを適用し、ShellからPortalへ戻る時点でApplication Shellを外す。

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

PortalをShellのMain Surface内へ描画してはならない。

Shell側のPortal導線は「Shell内部の別画面へ移動する」ものではなく、「Atlamentの入口へ戻る」ための導線として扱う。

---

## 3. Portalの責務

Portalの主責務は、ユーザーが移動先Applicationを選択できるようにすることである。

```text
Portal
└─ 移動先を選ぶ
```

Portalを第二のDashboardにしてはならない。

以下のような画面固有情報は、原則としてPortalへ持ち込まない。

- Workout履歴の詳細
- Performance指標
- Analytics用Chart
- Resource Managementの管理操作
- Settingsの設定値
- 各Application固有の検索・Filter・編集操作

Portalに情報を追加する場合は、「入口としての判断を助ける軽量な情報か」を基準に判断する。

---

## 4. 画面構造

Portalは以下の2領域を基本とする。

```text
Portal
├─ Hero / Brand Area
└─ Application Launcher
   └─ Application Card × N
```

### 4.1 Hero / Brand Area

Hero / Brand Areaは以下を担当する。

- Atlament Logoまたはブランド識別
- Atlamentへの入口であることの視覚表現
- Portal全体の雰囲気形成

Application Shellより強いブランド表現を許容する。

ただし、Heroを大きくしすぎてApplication Launcherが画面下へ追いやられる構造にはしない。

### 4.2 Application Launcher

Application LauncherはPortalの主要機能である。

最低限、以下のApplicationへ直接遷移できるようにする。

```text
Application Launcher
├─ Dashboard
├─ Workout
├─ Performance
├─ Analytics
├─ Resource Management
└─ Settings
```

Launcherは、移動先を迷わず選択できることを最優先する。

---

## 5. Application Card

Application Cardは1つのApplicationへの入口を表す。

各Cardは主として以下を伝える。

- Application名
- 何を行う画面か分かる短い説明
- クリック可能であること

必要に応じてIconを表示してよい。

一方、以下はCardへ持ち込まない。

- 詳細な数値一覧
- Chart
- 複数の操作Button
- Application内で完結すべきFilterや設定
- Card単体で完結する管理機能

Cardを「小型Dashboard」にしないこと。

Card押下時は対象Applicationへ遷移し、Application Shellを適用する。

---

## 6. Application Shellとの境界

PortalとApplication Shellは別Layoutとして実装する。

```text
Portal Layout
    ↓ Application選択
Application Shell
    ↓ Portal選択
Portal Layout
```

同一のLayout Componentへ条件分岐を大量に追加してPortalとShellを無理に共存させる構造は避ける。

ただし、同じ製品として見えるよう、以下の視覚言語は揃えてよい。

- Primary Green
- Atlament Logo
- Typography
- 角丸Surface
- 影
- Motionの方向性
- Iconの扱い
- 余白感

「見た目を揃えること」と「Layout実装を共有すること」は別に判断する。

---

## 7. 視覚方針

PortalはApplication Shellより強いブランド表現を持たせてよい。

ただし、入口としての分かりやすさを損なう装飾は追加しない。

実装時は以下を守る。

- Primary ColorはGreenを基本とする。
- HeroとLauncherの階層が一目で分かるようにする。
- Launcher Cardを主操作として認識できるようにする。
- 柔らかいUI表現を維持する。
- 過剰な余白によって操作導線を遠ざけない。
- 装飾だけを目的とした要素を増やさない。

視覚的な方向はPortalモックを基準とする。

---

## 8. モックの扱い

Portal MHTMLモックは以下の判断に使用する。

- HeroとLauncherの配置関係
- 全体のSurface構造
- Greenを中心とした視覚方向
- Cardの並び方
- Desktop / Tablet / Mobileでの崩し方の参考

以下はモックからそのまま確定しない。

- DOM階層
- CSS設計
- Cardの固定幅
- 列数の固定値
- breakpointのpx値
- spacingの固定値
- font sizeの固定値
- hoverの具体Animation
- transition時間

実装時は「モックと同じ見た目にすること」より「モックが示す役割・階層・雰囲気を再現すること」を優先する。

---

## 9. レスポンシブ方針

PortalはDesktop / Tablet / Mobileの各幅で利用できることを必須とする。

実装時に維持する構造は以下とする。

- HeroがPortalの入口表現として認識できる。
- Application Launcherが主要操作として認識できる。
- 全Applicationへの導線を失わない。
- Cardは利用可能幅に応じて再配置する。
- 小画面でも説明文や操作性を不必要に削らない。

Card列数や具体breakpointは固定しない。

モックを初期基準にし、実画面サイズで不自然な折返し・過密・巨大な余白が発生しないよう調整する。

---

## 10. 実装手順

Portal実装時は以下の順序で進める。

1. 現行Portalソースを確認し、既存の遷移先・Logo・Card・Easter Egg等の機能有無を確認する。
2. Portalモックと現行Portalの役割を比較する。
3. Portal LayoutをApplication Shellから分離する。
4. Hero / Brand Areaを実装する。
5. Application Launcherを実装する。
6. Dashboard / Workout / Performance / Analytics / Resource Management / Settingsへの遷移を接続する。
7. Application選択時にApplication Shellが適用されることを確認する。
8. ShellからPortalへ戻った時にShellが外れることを確認する。
9. Desktop / Tablet / MobileでLauncherの視認性と操作性を確認する。
10. モックとの差異を確認し、差異が意図した実装上の調整であることを確認する。

現行Portalにモックへ反映されていない機能が存在した場合は、機能を削除する前に継承要否を確認する。

判断材料が不足する場合は推測で削除・追加せず作業を止める。

---

## 11. 完了条件

以下を満たした時点でPortal実装を完了とみなす。

- PortalがApplication Shellの外側に存在する。
- Portal表示中にShell Navigation / Headerが残っていない。
- Hero / Brand AreaとApplication Launcherが明確に分かれている。
- 6つの主要Applicationへ遷移できる。
- Application選択後にApplication Shellへ切り替わる。
- ShellからPortalへ戻るとPortal独自Layoutへ戻る。
- Portalが第二Dashboard化していない。
- Application Cardに過剰な業務情報や操作を持たせていない。
- Desktop / Tablet / Mobileで全Applicationへ到達できる。
- Portalモックと同じ視覚方向を保っている。
- モックの数値を根拠なく固定値として転記していない。

---

## 12. 未確定事項

以下は実装時調整事項として残す。

| 項目 | 扱い |
|---|---|
| Card列数 | 画面幅に応じて調整 |
| Card幅 | モックを参考に調整 |
| breakpoint具体値 | 実装時調整 |
| spacing / radius / font size | モック基準で調整 |
| Card説明文 | 実装時に画面用途と整合確認 |
| Icon | 既存資産と視認性を確認して決定 |
| hover / Motion | 操作性を損なわない範囲で調整 |
| 現行Portal固有機能の継承 | 現行ソース確認後に判断 |

未確定事項を推測で仕様化しないこと。