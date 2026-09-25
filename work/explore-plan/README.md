# Explore Screen Concept

Status: Draft / Work in progress  
Target: Future release (version undecided)

## 1. Purpose

Explore は、Workout Data を「検索条件フォームで絞り込む」のではなく、データ要素を触りながら関連を辿る read-only exploration workspace とする。

明確な分析目的や次回 Workout の事前計画を要求しない。「自分の Workout Data を眺める」「気になった要素を寄せる」「偶然の関連に気付く」ことを主目的とする。

既存画面との責務は次の通り。

| Application | Responsibility |
|---|---|
| Dashboard | 現在の summary / recent overview |
| Workout Domain | Workout history / session detail |
| Performance Detail | Machine-specific performance history |
| Analytics | 定義済み集計による長期分析 |
| Resource Management / Manager | Data maintenance / CRUD |
| Explore | Workout Data の自由探索 |

Explore は Workout / Master Data を変更しない。

## 2. Technology Direction

- Frontend: React + TypeScript + Vite
- Primary interaction library candidate: Plasma UI
- Shell / shared navigation は既存 Atlament の contract を維持する。
- Plasma 表現は Main frame 自体には適用せず、Explore workspace 内の操作対象に限定する。
- WebGL2 / Plasma UI が利用できない環境では、同じ情報構造と操作結果を維持できる non-plasma fallback を用意する。

Plasma UI: https://cruxgarden.github.io/plasma-ui/

React 採用は既存 Dashboard との統合を目的とするものではない。Explore は独立 screen application とし、Plasma UI の利用適合性を主な選定理由とする。

## 3. Core UX Principle

> Plasma is an interaction language, not a global visual theme.

Plasma の結合・分離には機能上の意味を持たせる。

- Merge: exploration condition の追加
- Detach: exploration condition の解除
- Node click: その要素を新しい exploration focus とする
- Result click: 既存の詳細画面へ遷移する
- Spatial placement: 原則として表示上の配置であり、Performance の優劣や因果関係を意味しない

単なる decorative glass / liquid effect として全画面へ展開しない。

## 4. Initial State

初期状態では workspace に Core Plasma を置かず、探索入口を表示する。

候補:

- Machine
- Session
- Weight
- Reps
- Gym
- Date / Period
- Notes
- Recent
- Random

検索入力から Machine / Session 等を直接 focus にできることも検討する。

Random は「分析目的なしで Explore を開く」用途のための入口とし、過去データから探索可能な起点を提示する。Random の抽選規則は実装設計時に決定する。

## 5. Workspace Model

### 5.1 Core

現在の探索対象を表す中心 Node。

例:

```text
Pec Fly
12 Sessions
31 Sets
```

### 5.2 Candidate

Core から次に探索可能な軸を周囲へ提示する Node。

例:

- Weight
- Reps
- Gym
- Date / Period
- Notes
- Session

Candidate の提示は、現在の Core / Condition と実データから決定する。存在しない関連を推論して生成しない。

### 5.3 Condition

Candidate または具体値を Core に Merge した状態。

概念上の query:

```text
Machine = pec_fly
AND Weight = 25
AND Period = recent
```

UI 上では Condition を Core Plasma の一部として表現する。

### 5.4 Result

現在の探索条件に該当する Workout / Session 等を表す Node。

Result は Core と Merge しない。Result 選択時は既存 application の該当 detail route へ遷移することを基本とする。

## 6. Interaction Rules

### Merge

Candidate を Core に近づけ、merge threshold を超えた場合に Condition として追加する。

視覚上の Plasma merge 完了と query state 更新のタイミングを一致させる。

### Detach

Core 内の Condition をドラッグして分離することで Condition を解除する。

アクセシビリティおよび精密操作のため、Condition には remove action も併設する。

### Undo

直前の Merge / Detach を取り消す。

Undo stack の対象は exploration state の変更のみとし、canvas pan / zoom は対象外とする方向で検討する。

### Reset

すべての Core / Condition / Result / Candidate を破棄し、Initial State に戻す。

### Canvas

- 空白 drag: pan
- wheel / pinch: zoom
- Node drag: Node 操作
- drag と canvas pan の競合を避けるため pointer capture / drag threshold を定義する

## 7. Query Semantics

v1 の Merge は原則 AND 条件とする。

同一 dimension の複数値を Merge した場合の semantics は未確定とし、実装前に以下のいずれかを決定する。

1. 同一 dimension は単一値のみ許可し replace する。
2. 同一 dimension 内を OR、dimension 間を AND とする。

曖昧なまま UI の merge 挙動へ委ねない。

Explore は deterministic な記録事実の探索を行う。既存 Data Overview の原則に従い、根拠なく成長・刺激・効果・良否等を推論しない。

## 8. Data Scope

v1 候補:

| Dimension | Source / Meaning |
|---|---|
| Machine | resolved Machine Master |
| Session | Workout Session / session_id |
| Weight | recorded set weight |
| Reps | recorded set reps |
| Gym | resolved Gym Master |
| Date / Period | Workout date |
| Notes | recorded notes |
| Workout Result | matching recorded Workout data |

Muscle / Body Part は Machine Master に信頼できる既存 field / relation が存在する場合のみ候補とする。Explore 独自の推測 mapping は導入しない。

Session と Date は同一視しない。Session identity は既存設計どおり session_id を使用する。

## 9. Navigation

暫定 route:

```text
/explore/
```

Explore は shared navigation の application entry として追加する方向で検討する。

Result の遷移先例:

- Machine → `/machines/:id`
- Date / Workout → `/workouts/:date`

同一日に複数 Session が存在可能なため、Session Result を `/workouts/:date` へ遷移させる場合の focus 方法は別途設計する。

## 10. Component Direction

暫定構成:

```text
ExploreApp
├─ ExploreHeader
├─ ExploreStart
│  ├─ ExploreSearch
│  └─ EntryNodes
└─ ExploreWorkspace
   ├─ PlasmaCanvas
   ├─ CoreNode
   ├─ CandidateNode
   ├─ ResultNode
   ├─ ConditionView
   └─ WorkspaceControls
```

State / query logic は Plasma rendering から分離する。

```text
UI / Plasma
    ↓ intent
Explore State
    ↓
Query Builder
    ↓
Workout Data Adapter
    ↓
Normalized WorkoutSession[]
```

Plasma UI を交換または fallback しても、Explore State と Query semantics が変化しない構造を目標とする。

## 11. State Sketch

```ts
type ExploreState = {
  focus: ExploreFocus | null;
  conditions: ExploreCondition[];
  candidates: ExploreCandidate[];
  results: ExploreResult[];
  history: ExploreHistoryEntry[];
};
```

実型は既存 shared package / normalized model を調査した上で定義する。この文書内の型名をそのまま実装契約とはしない。

## 12. Empty / Error / Fallback

### No Workout Data

探索対象がないことを正常な empty state として表示する。

### No Result

Core と Condition は維持し、「該当データなし」を workspace 上で明示する。自動で Condition を解除しない。

### Missing Master Reference

既存 normalized model の unresolved / missing semantics を尊重する。Explore 独自に Machine / Gym 名を補完・推測しない。

### Plasma unavailable

WebGL2 非対応、初期化失敗、または Plasma UI の runtime failure 時は、通常 card / chip ベースの workspace へ fallback する。Query semantics と navigation は維持する。

## 13. Accessibility

Plasma の drag 操作のみを必須経路にしない。

最低限以下を別操作として提供する。

- Candidate の Add
- Condition の Remove
- focus selection
- Undo / Reset
- Result open

prefers-reduced-motion が有効な場合は merge / detach animation を抑制または短縮する。

## 14. Non-goals

Explore v1 では以下を行わない。

- Workout Data の create / update / delete
- Master Data の maintenance
- 次回 Workout plan の作成
- Strategy の保存
- AI による training recommendation
- 因果推論
- Machine 間の Weight / Volume を単純比較した performance 評価
- Analytics の代替となる dashboard / chart suite
- Plasma による Shell / Main frame の全面置換

## 15. Open Questions

実装着手前に以下を確定する。

1. 同一 dimension 複数 Condition の AND / OR semantics
2. Recent の期間定義
3. Random の抽選単位（Session / Machine / Set 等）
4. Notes を全文検索 dimension とするか、token / tag 化するか
5. Result 最大表示数と pagination / virtualization
6. Session Result の既存 route への focus 方法
7. Plasma UI の license / package version / production suitability
8. WebGL2 fallback の具体 UI
9. mobile での drag / pinch / detach gesture conflict
10. Explore を導入する target release version

## 16. Validation Focus

Prototype / UT では最低限以下を確認する。

- Merge と query state が一意に同期する
- Detach / remove で同じ Condition が解除される
- Undo / Reset が deterministic
- 0件 / unresolved reference で破綻しない
- 同一日複数 Session を Date と混同しない
- touch device で canvas pan と Node drag が競合しない
- Plasma failure 時にも探索機能を継続できる
- large workout history で Candidate / Result 更新が操作を阻害しない

## 17. Current Decision

現時点では Explore を「Workout Data Playground」として設計継続する。

Strategy / planning application にはしない。Explore の価値は、計画を要求せず、既存 Workout Data を自由に触って関連を辿れることに置く。
