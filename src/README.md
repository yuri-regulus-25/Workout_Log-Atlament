# src

Application、Frontend、Shared PackageのSourceを管理します。

## 構成

```text
src/
├─ application/     # Windows AFなどPlatform Application
├─ frontend/        # 画面単位Frontend
└─ shared/          # Frontend共通処理・型・Style
```

## 注意点

- Windows固有処理は `src/application/windows/` に置きます。
- Frontend画面固有の実装は `src/frontend/<app>/` に置きます。
- Framework非依存の共通処理は `src/shared/` に置きます。
- ビジネスロジックをForm、Endpoint、UI Componentへ直接寄せすぎないようにします。
