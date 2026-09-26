# v4.0.0 Entry Architecture

Status: **Confirmed**

## Decision

v4.0.0 では現行の Portal Application を廃止する。

`/` は Portal / Application Launcher ではなく、**System Entry Point** として再定義する。

## Route Responsibilities

### `/` — System Entry

責務:

- Product Identity を提示する
- 起動時の Entry Experience / Animation を提供する
- Entry Experience 完了後、Dashboard へ引き渡す

非責務:

- Workout Data の集計・表示
- Application Launcher
- Dashboard の業務ロジック
- 各 Application の Navigation
- CRUD / Settings 等の機能

起動アニメーションの具体的な内容・表示項目は未決定とし、Visual Identity / Motion Design の検討時に定義する。

### `/dashboard/` — Dashboard Application

責務:

- Dashboard を直接表示する
- Entry Experience を経由しない

他 Application から Dashboard へ遷移する場合も `/dashboard/` を使用し、起動演出を繰り返さない。

概念:

```text
/             Entry Experience -> /dashboard/
/dashboard/   Dashboard Direct
```

## Portal Retirement

現行 Portal の以下の責務は v4.0.0 で廃止する。

- Application Launcher としての Portal
- Portal 固有 Header / Navigation
- Portal を独立 Application として維持する構成

Portal の既存実装は v3.x の軌跡として Legacy Snapshot / Backup 方針に従って保存対象とする。

## Logo Policy

Logo は常設 Navigation Element としない。

主な利用候補:

- `/` の Entry Experience
- About
- Application Icon / Native Platform Identity

Dashboard および各 Application の通常利用画面では、原則として Logo を常時表示しない。

Product Identity は Logo の反復表示ではなく、Design System（Glass / Liquid / Primary Green / Ambient Particle / Motion 等）によって表現する。

## Rationale

本システムには Login がなく、起動直後に Dashboard が直接表示される構成には System Entry の境界が存在しない。

`/` を System Entry Point とすることで、Login を導入することなく「システムを起動し、Application に入る」という体験上の境界を提供する。

同時に `/dashboard/` を純粋な Dashboard Application として維持することで、Entry と Dashboard の責務混在を避ける。

## Deferred

以下は本決定には含めず、後続設計で決定する。

- Entry Animation の具体的表現
- Product Name / Logo
- Animation duration / skip behavior
- reduced-motion 時の挙動
- Entry から Dashboard への技術的な handoff 方法
