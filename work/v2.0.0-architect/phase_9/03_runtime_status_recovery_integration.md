# Phase 9-C — Runtime Status & Recovery Integration

**Related Issue:** #74

## Objective
FrontendのRuntime状態表示をAFの事実値へ統一する。

## Requirements
- fallback表示の唯一のtruthは `runtimeData.fallbackActive`
- `latestRemoteRetrieval` / `latestValidation` / `currentAvailable` / `currentGeneratedAt` 等を直接利用する
- Frontend独自のfallback推測を行わない
- remote retrieval失敗でも既存Runtime継続中である状態を明確に表現する
- ready/degraded/unavailableとRecovery導線を矛盾させない
