# Monthly Report Domain Model

Related Issue: #141

- Session → Machineを主情報階層とする。
- Record/Set/Repは集計入力であり主Navigationにしない。
- Session層: Training Days / Sessions / timing pattern。
- Machine層: execution frequency / 部位別実施頻度 / 同一Machine performance・weight trend。
- Gym分布比較は不要。Main Gym contextは比較条件の一貫性に利用可能。
- Facts only。異種Machineの重量尺度を混ぜない。
