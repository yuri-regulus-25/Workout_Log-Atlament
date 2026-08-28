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

- Application Readiness に基づく Setup Assistant。
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

Setup Assistant は新しい永続状態を持たず、既存の Settings operation を誘導する。

- Repository step は owner、repository、ref が入力済みであることを確認し、既存の repository save を実行する。
- Credential step は credential が configured かつ available であることを確認し、既存の credential update を実行する。
- Data Sources step は Workout、Machine Master、Gym Master の必須参照先が設定済みであることを確認し、既存の resources save を実行する。
- Validation step は manual sync を実行し、AF status の `readiness.state` が `ready` になったことで完了とする。

Setup完了条件は step 表示ではなく AF status の `readiness.state === "ready"` で判定する。Main Gym は任意Contextであり、未設定でも Setup 完了を妨げない。

現行 source は app-wide setup gate、Master Data editor、diagnostics export を実装していない。

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
