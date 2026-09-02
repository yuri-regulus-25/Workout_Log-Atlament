# Filesystem I/O 現行仕様と設計方針

Atlament は Repository、Development Runtime、Native Application で異なる filesystem storage を使用する。

物理保存先の差異と、Application が扱う論理保存構造は分離する。横断原則は [共通設計原則](../../01_basic-design/design-principles.md) を参照する。

## Repository Files

Repository `data/` は Test と Node development runtime で使用する source / example data である。

Repository `dist/` と `dist-windows/` は generated artifact である。

## Node Development Runtime

Node development runtime は以下を読み取る。

- `data/master/machines.json`
- `data/master/gyms.json`
- `data/workouts/**/*.json`
- `data/workouts/**/*.jsonl`
- `src/version.json`

現行 Node development runtime は Runtime Data を永続化しない。

## 論理保存構造

OS に依存する理由がない Application Data は、Platform から見える物理 root が異なっても、root 配下の論理構造を可能な限り共通化する。

基準とする論理分類:

```text
configuration/
runtime/
recovery/drafts/
logs/
```

Recovery Draft の共通論理パスは次を基準とする。

```text
recovery/drafts/{resourceKey}.json
```

共通ロジックはこの論理パスを扱い、Windows / Android の Platform Storage Adapter が各 OS の物理 root へ解決する。

## Windows Runtime Files

現行 Windows AF は runtime root 配下へ書き込む。

```text
data/configuration/af-settings.json
data/configuration/credential.dpapi
data/runtime/current/runtime-data.json
data/runtime/temporary/
data/logs/integrated.sqlite
data/frontend/
```

Configuration と Runtime write は current file を置換する前に temporary file / directory を使用する。

Windows の `data/` prefix は物理 runtime root の現行構造であり、共通 Domain logic が `data/...` を論理パスとして要求するものではない。

## Android Runtime Files

現行 Android AF は app internal storage を使用する。

```text
configuration/af-settings.json
runtime/current/runtime-workouts.json
log/atlament-log.sqlite
recovery/drafts/
```

Credential data は SharedPreferences と Android Keystore-backed encryption を通じて保存する。

Frontend artifact は APK assets から読み取り、現行 source では app internal storage へ展開しない。

## Platform 差異の扱い

`runtime-data.json` と `runtime-workouts.json`、`logs/` と `log/` のような差異は、OS または実装基盤に依存する理由があるかを確認する。

理由がない差異は将来の整理対象とし、共通論理名へ寄せる。Log の保存方式等、Platform / logging infrastructure に正当な理由がある差異は許容する。

Recovery Draft のように Domain 上同じ意味を持つ保存物は、物理 root が異なっても論理パスを揃える。
