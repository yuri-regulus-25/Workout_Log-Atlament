# Filesystem I/O 現行仕様

Atlament は context ごとに異なる filesystem storage を使用する。

## Repository Files

Repository `data/` は Test と Node development runtime で使用される source/example data である。

Repository `dist/` と `dist-windows/` は generated artifact である。

## Node Development Runtime

Node development runtime は以下を読み取る。

- `data/master/machines.json`
- `data/master/gyms.json`
- `data/workouts/**/*.json`
- `data/workouts/**/*.jsonl`
- `src/version.json`

Runtime data は persist しない。

## Windows Runtime Files

Windows AF は runtime root 配下へ write する。

```text
data/configuration/af-settings.json
data/configuration/credential.dpapi
data/runtime/current/runtime-data.json
data/runtime/temporary/
data/logs/integrated.sqlite
data/frontend/
```

Configuration と runtime write は current file を replace する前に temporary file/directory を使用する。

## Android Runtime Files

Android AF は app internal storage を使用する。

```text
configuration/af-settings.json
runtime/current/runtime-workouts.json
log/atlament-log.sqlite
```

Credential data は SharedPreferences と Android Keystore-backed encryption を通じて保存される。

Frontend artifact は APK assets から read され、現行 source では app internal storage へ展開されない。
