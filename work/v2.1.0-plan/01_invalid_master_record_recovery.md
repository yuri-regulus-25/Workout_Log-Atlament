# Invalid Master Record Recovery

**Related Issue:** #88

## Boundary
Master Resource自体はparse可能かつroot構造が有効で、個々のrecord validationに失敗するケースを扱う。

## Recovery Targets
- required field missing
- duplicate `xxx_id`
- unknown / schema-extra field
- その他record-level schema validation failure

## Runtime Contract
Invalid Recordを含むMaster Resourceは通常Runtimeへ採用しない。v2.3.0のMaster record-level partial acceptanceを先取りしない。

## Recovery Contract
1. Broken Master Resourceから回収可能な値を抽出する。
2. 正常Schema Modelへ投入する。
3. schema-generated Recovery/Maintenance UIで人間が修復する。
4. duplicate ID等の正解をシステムが推測しない。
5. Whole Resource Validationを実行する。
6. 全体が正常な場合のみReplacement Resourceを生成する。
7. 元ResourceをReplacement Commitし、sync/runtime rebuildで復帰する。

## Prohibitions
- Broken Resourceの直接Raw編集
- Validation bypass
- Invalid intermediate stateのCommit
- Record partial acceptance
