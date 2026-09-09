# src

Application、Frontend、Shared PackageのSourceを管理します。

## 構成

```text
src/
├─ application/     # Windows / Android AF
├─ frontend/        # 画面単位Frontend
└─ shared/          # Framework横断の共通処理・型・Style・Asset
```

## 責務

- Windows固有処理は `src/application/windows/` に置きます。
- Frontend画面固有の実装は `src/frontend/<app>/` に置きます。
- Framework非依存の共通処理は `src/shared/` に置きます。
- Frontend共通のRoute、Application metadata、Page Transition、Branding、Character Easter Eggの基盤は `src/shared/frontend-common/` で管理します。
- React / Vue / Angular / Svelte / SolidのUI Component自体は各Frontend Application側に置きます。
- ビジネスロジックをForm、Endpoint、UI Componentへ直接寄せすぎないようにします。
