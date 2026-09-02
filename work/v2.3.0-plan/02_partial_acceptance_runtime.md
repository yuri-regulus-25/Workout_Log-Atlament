# Master Partial Acceptance Runtime

Related Issue: #134

## Goal

Record Isolation ContractをRuntime / Master resolution / Maintenance / Recoveryへ統合し、healthy Master Recordを継続利用可能にする。

## Runtime Semantics

- valid Master Recordは通常通りRuntime dictionaryへ採用する。
- invalid / excluded Recordはdictionaryへ採用しない。
- Workoutがinvalid / excluded Master IDを参照する場合、Workout自体は正常データとして保持し、Master-derived displayを `?`、WARNにoriginal `xxx_id`を含める。
- internal reasonとしてmissing / deleted / invalid-excludedを区別できるようにする。
- invalid Recordが存在すること自体をfallback triggerにしない。valid部分でRuntimeを継続する。
- 集計上のWorkout sets / reps / weight等を失わない。

## Recovery Integration

- Maintenance / Recoveryからinvalid / excluded Recordとvalidation reasonを確認可能にする。
- Raw直接編集は行わない。
- v2.1.0 Replacement Resource方式で人間が修復する。
- Whole Resource Validationを通過したReplacementのみCommit可能。
- 修復後はsync / Runtime rebuildでMaster referenceを再解決し、正常表示へ復帰する。

## Platform Parity

Windows / Android AFは同一のvalidation、isolation、resolution、warning、rebuild semanticsを持つ。

## Tests

- valid Record継続利用。
- invalid reference → `? + WARN + ID`。
- unrelated valid Master references remain resolved。
- invalid Record存在時もfallbackしない。
- Recovery → replacement → rebuild → re-resolution。
- Windows / Android parity。
