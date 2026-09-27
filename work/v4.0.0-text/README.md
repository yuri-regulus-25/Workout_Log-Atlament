# Vesria v4.0.0 表示文言一覧

Vesriaの現行sourceで各画面に表示される文言を、画面単位で確認するための一覧。
文言の評価や改善案ではなく、実装されている表示内容のsnapshotとして扱う。

## 対象

- [共通](00_common.md)
- [Entry](01_entry.md)
- [Overview](02_overview.md)
- [Workout](03_workout.md)
- [Machines](04_machines.md)
- [Analysis](05_analysis.md)
- [Explore](06_explore.md)
- [Resources](07_resources.md)
- [Settings](08_settings.md)

## 記法

- `{date}`、`{count}`、`{name}`等は、runtime dataや入力値によって変化する箇所を示す。
- API / Repository由来の任意messageや実データそのものは、固定文言として展開しない。
- accessible name、status announcement、empty / error表示も、利用者へ提示される文言として含める。

## 対象外

- Logo Playgroundおよび`src/frontend/vesria/logo-playground/`配下の文言。
- Source comment、test名、開発者向けlog。
