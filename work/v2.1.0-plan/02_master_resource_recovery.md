# Master Resource Recovery

**Related Issue:** #89

## Boundary
Record単位Recoveryへ進めないMaster Resource-level failureを扱う。

## Recovery Targets
- JSON parse impossible
- parse可能だがinvalid root
- records collection等を正常に解釈できないResource-level failure

## Recovery Contract
1. Broken Resourceは通常Runtimeへ採用しない。
2. Raw JSON Editorは提供しない。
3. 回収可能な値だけを正常Schema Modelへ取り込む。
4. parse不能の場合も正常Schemaを基準としてReplacement Resourceを新規構築する。
5. Invalid Master Record Recoveryとschema-generated Recovery/Maintenance UIを共用する。
6. Whole Resource Validation成功時のみValid Resource Fileを生成する。
7. 元ResourceをReplacement Commitし、sync/runtime rebuildで復帰する。

## Design Intent
「壊れたファイルを編集する」のではなく、「壊れたファイルを材料として正常な代替ファイルを生成する」。Git履歴上の旧Broken Resourceは履歴として残る。

## Prohibitions
- Raw JSON Editor
- Validation bypass
- Broken intermediate commit
- 壊れ方ごとの専用UI乱立
