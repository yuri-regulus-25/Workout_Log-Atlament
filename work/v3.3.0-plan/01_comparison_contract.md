# Same Gym/Machine Comparison Contract

Related Issue: #143

- Current Machine executionを比較基準とする。
- same gym_id + machine_idでnearest earlier/laterを取得する。
- Sessionはcontext/entry pointに留める。
- Volumeは各record/setのWeight×Repsの総和。
- Current=100%。Previous/Nextを相対差分表示する。
- Missing previous/nextはerrorにしない。
