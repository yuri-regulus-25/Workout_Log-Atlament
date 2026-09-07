# Master Record Isolation Contract

Related Issue: #94

## Goal

Master ResourceをResource単位のall-or-nothing validationから、Record単位でvalid / invalidを識別できるRuntime Contractへ拡張する。

## Contract

- JSON parse / root / records collectionがResourceとして解釈可能であることをpartial acceptanceの前提とする。
- 各Master Recordを独立してschema / semantic validationする。
- valid RecordはRuntime採用候補とする。
- invalid RecordはRuntime採用対象から隔離し、validation reasonとoriginal `xxx_id`等の識別可能情報を保持する。
- duplicate `xxx_id`など一意なwinnerを安全に決められない競合では、システムがwinnerを推測しない。競合に関与するRecordをinvalid / excludedとして扱う。
- Resource-level parse/root failureはv2.1.0 Master Resource Recoveryの責務であり、本機能でpartial acceptanceしない。
- invalid Recordを黙って破棄したように見せず、Runtime / Maintenanceから状態を観測可能にする。

## Implementation Rule

Implementation前に関連既存実装を横断調査し、指示書との意味論・依存・Runtime契約の衝突を確認してから変更開始する。

`Investigation → Contract → Collision → Impact → Implementation → Test → Fix → Retest`

## Tests

- valid + invalid mixed Master Resource。
- required field missing。
- schema-extra / semantic invalid。
- duplicate ID conflict。
- Resource-level invalidとの境界。
