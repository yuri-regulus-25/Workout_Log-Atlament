# Page Composition Migration

Related Issue: #136

## Goal
Pageを巨大な実装単位ではなく、配置・構成・Component呼出を主責務とする構造へ移行する。

## Contract
- PageはComposition Rootとして振る舞う。
- Card/Dialog/Input内部の詳細表示・局所操作は該当Componentへ寄せる。
- Domain計算、Runtime契約、Persistence境界をUI都合で移動・複製しない。
- 画面の既存ユーザー機能を維持する。

## Implementation Rule
Implementation前に対象画面と共有実装を横断調査する。`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`
