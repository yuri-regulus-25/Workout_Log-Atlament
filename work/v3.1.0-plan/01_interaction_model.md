# Workout CRUD Interaction Model

Related Issue: #138

- Vue + Vuetify。
- Workout Domain Identity は `session_id`。Date は grouping / search / navigation 属性、Resource は persistence / validation / Git / Recovery 単位として分離する。
- 日付選択時に Session が0件ならCreate modelを初期化できる。
- 既存Sessionが1件以上ある場合、編集対象Sessionを明示的に選択する。同日に新規Sessionを追加することも可能とする。
- 同一日に複数Sessionが存在することを正常状態として扱い、Dateだけから編集対象Sessionを暗黙決定しない。
- Create/EditはSave時にも対象Sessionとsource Resourceの存在・revision条件を再確認し、自動相互変換しない。
- Create入力を失敗後のEditへcarryしない。
- Session/Machine/Recordをworking model上でCRUD可能。
- Gym/Machine参照はSelect。unresolvedは未選択として通常required validation。
- Edit中のSession date変更を許可する。
- date変更によるResource/path移動が必要な場合も、利用者にはSession変更として扱い、persistence層が必要なResource変更を解決する。
- Cancel/closeはunsaved変更を破棄し、dirty時は確認する。
- Session deleteは対象SessionをDomain上から削除する。結果としてResourceが0 Sessionになる場合は空Resourceを残さず、persistence層でResourceを物理削除する。
- 保存単位は1回のユーザー保存操作であり、必要なResource変更を1 atomic Git commitにまとめる。
