# Empty Runtime Contract

Related Issue: #91

## Goal

Empty / Initial StateをRuntime Contract上の正常状態として定義し、Validation Error・Resource Missing・Recovery対象と明確に分離する。

## Contract

- validなResource / configurationの内容が0件であることは正常状態。
- Emptyだけを理由にRuntime Build Failure、degraded、fallback、unavailableを発生させない。
- Runtime response / readiness / requiredActionsはEmptyをErrorとして報告しない。
- UIへEmptyを判定可能な事実値を提供し、Frontend側でErrorを推測しない。
- missing ResourceはEmptyと同義にしない。
- Windows / Androidで同じ入力から同じRuntime semanticsを返す。

## Implementation Rule

Implementation前に関連既存実装を横断調査し、指示書との意味論・依存・Runtime契約の衝突を確認してから変更開始する。

`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`

## Tests

- Empty stateがRuntime Errorにならない。
- Empty stateがfallbackを発火しない。
- missing / invalid / emptyが区別される。
- Windows / Android parity。
