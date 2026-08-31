# Workout Resource Recovery

**Related Issue:** #90

## Boundary
Invalid Workout ResourceをResource単位で隔離し、正常Schemaに従うReplacement Workout Resourceとして復旧する。

## Recovery Targets
- unknown / schema-extra
- required field missing
- duplicate Workout unique ID
- semantic invalid value
- file date / internal date mismatch
- 同一Workout dateの複数Resource conflict
- JSON / JSONL parse impossible
- parse可能だがinvalid root

## Runtime Contract
Affected Resource全体を隔離する。Broken Resource内部のhealthy pieceだけをRuntimeへpartial acceptanceしない。他の独立Resource/dateは通常処理する。

## Recovery Contract
1. Broken Resourceから回収可能な値を抽出する。
2. Recovery専用のNormalized Draftへ投入する。
3. 正常Workout Schemaに基づくUIで人間が未解決事項を修復する。
4. 欠損値、duplicate、conflictの正解をシステムが推測・自動確定しない。
5. Whole Resource Validationを実行する。
6. Validation成功後のみReplacement Workout Fileを生成する。
7. Replacement Commit後、sync/runtime rebuildで通常データとして復帰する。

## Prohibitions
- Raw Workoutの一般編集機能
- Partial acceptance
- Automatic factual inference
- Validation bypass
- Broken intermediate commit
