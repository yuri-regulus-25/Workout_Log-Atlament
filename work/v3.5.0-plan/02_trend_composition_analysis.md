# Analytics Trend & Composition Analysis

Related Issue: #148

- 全体/Gym: Session count trend、Machine execution frequency、部位別実施頻度、Machine composition trend。
- Machine detail: Weight/Volume/Reps/Sets trend、execution frequency、execution interval。
- Machine detailの比較条件はsame gym_id + machine_idを維持する。
- 異種MachineのWeight/Volumeをglobal summary/evaluationへ使用しない。
- Report/Compare/Training Mapの責務を複製せず、長期・条件可変分析へ集中する。
