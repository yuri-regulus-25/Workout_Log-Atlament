# Application Settings 現行仕様

## Responsibility

Application Settings は AF-facing configuration と operation を管理する。

Workout Log または Master Data content は edit しない。

## Source and Framework

Source:

```text
src/frontend/settings-solid/
```

Framework:

- SolidJS
- TypeScript
- Vite

## Route

```text
/settings/
```

## API Access

Settings は `@workout-lab/frontend-common` の AF client helper を以下に使用する。

- status
- configuration
- credential status
- configuration update
- credential update
- manual sync

Token value は AF から読み戻されず、frontend storage にも保存されない。

## Current Screen Sections

現行 Settings は以下を含む。

- application、GitHub、runtime、hosting、version information を含む Status section。
- owner、repository、ref、root path の Repository form。
- type、path、resource kind、required、empty allowed の Resources editor。
- GitHub request、sync operation、general API、shutdown timeout の Timeout form。
- GitHub token と token limit date の Credential form。
- Manual Sync を含む Operations section。

## State and Operations

画面は status、configuration、credential status を parallel に load する。

Save operation は以下ごとに分離される。

- repository
- resources
- timeouts
- credential
- sync

Operation running 中、画面は busy operation state と full-screen operation overlay を持つ。

現行 source は separate first-run setup assistant、app-wide setup gate、Master Data editor、diagnostics export を実装していない。

## Credential Status

UI に表示される credential state value は AF から derive される。

- available
- missing
- invalid
- expired
- unknown

Settings は credential state と status component state を combine して GitHub status を render する。

## Navigation

Settings は current route ID `settings` で shared navigation を受け取る。
