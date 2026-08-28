# v2.0.0 Phase 7-D — Master Data Maintenance Application

## 日本語

### 前提
Phase 7-A〜7-Cが現在の作業Branchへ反映済みであることを前提とする。

### Technology
Maintenance ApplicationはVue + Vuetifyを使用する。

### 目的
Gym / Machine Masterを安全に1Record単位で作成・参照・編集するMaintenance UIを実装する。

### List
- `v-data-table`でMaster Record一覧を表示する。
- 初期表示はLogical DeleteされていないRecord (`delete_flag=false`相当) とする。
- 一覧上のControlで表示Modeを切り替え、Active / Deleted（必要ならAll）を閲覧可能にする。
- Row clickで対象RecordのEdit Dialogを開く。
- Bulk selection / Bulk Editは禁止する。

### Edit Dialog
- Raw JSON編集は禁止する。
- Gym/Machine各Schemaに対応するForm ComponentをDOMとして構成する。
- stringはtext-field系、booleanはcheckbox/switch系、single/multiple choiceやrelationはselect/pulldown/multi-select等、型・意味に適したVuetify Componentを使用する。
- 過剰なGeneric Form Engineを目的にせず、実Schemaへ明示的に対応する。
- 入力中はFrontend Local Stateとして保持し、更新Buttonが押されたタイミングで初めてWrite APIを呼ぶ。
- Cancel/Close時はRemote Writeしない。Dirty Stateで閉じる場合は変更破棄の意思確認を行う。
- `xxx_id`はFrontendでも重複を検知する。ただしAF側Validationを最終保証とする。

### Copy
- Row内でDelete/Restore actionの左隣にCopy actionを配置する。
- CopyはRemote Recordの直接複製ではなく、新規Record作成の入力補助とする。
- 元Recordの値をCreate Dialog初期値として利用するが、Unique ID (`xxx_id`) は空欄等の未設定状態へResetする。
- Lifecycle stateは新規ActiveへResetする。
- GymのMain Gym属性はCopy時にfalseへResetし、Main Gymを複製しない。
- Copy後も通常のCreate Validation/Write Flowを通す。

### UI Detail
Icon、Label、具体的文言、余白等の視覚調整はPlanningで過度に固定しない。製造時にCodexが既存UIとの整合から初期案を作り、人間が実画面レビューして調整する。

### 完了条件
Raw JSONへ触れず、Schemaに対応したFormと明示的なUpdate/Create操作によってGym/Machine Masterを1Record単位で安全に編集・コピーできること。

---

## English

### Prerequisite
Phase 7-A through 7-C must be present on the current working branch.

### Technology
Use Vue + Vuetify for the Maintenance application.

### Objective
Provide safe record-by-record maintenance for Gym and Machine masters.

### List
Use `v-data-table`. Default to non-deleted records and provide a display-mode control for Active/Deleted (and All if useful). Row click opens an Edit Dialog. No bulk selection/edit.

### Edit Dialog
Raw JSON editing is prohibited. Build explicit Gym/Machine schema-aware forms with appropriate Vuetify controls: text fields for strings, checkbox/switch for booleans, select/pulldown/multi-select for choices/relations. Do not overbuild a generic form engine. Keep edits local until the explicit Update action calls the write API. Cancel does not write; confirm discarding dirty changes. Frontend checks ID duplicates for UX, while AF validation remains authoritative.

### Copy
Place Copy immediately before the Delete/Restore row action. Copy opens a Create flow initialized from the source record; reset the unique ID, lifecycle to active, and Gym Main flag to false. It must pass normal create validation/write.

### UI Detail
Exact icons, wording, labels, spacing, and visual polish are refined during implementation and human visual review rather than frozen here.

### Completion Criteria
Gym/Machine records can be safely created, edited, and copied one record at a time through schema-aware forms without raw JSON editing.