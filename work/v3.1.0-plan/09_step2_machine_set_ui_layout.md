# Workout Manager v3.1.0 — Step 2 Machine / Set UI Layout Contract

Related Issue: #138

## 1. Purpose

本書はWorkout Manager Step 2 `操作内容` における、Machine / Set領域の**Visual Layout / Vuetify Component配置 / Add・Delete Action配置**を確定する。

既存の `04_ui_copy_and_component_contract.md` / `06_frontend_component_structure.md` では、Machine / Setの入力項目・Validation・Component責務は定義されている一方、Add / Delete Actionの**画面上の配置**とMachine / SetのGrid構造が十分に明文化されていなかった。

本書はその不足部分を補完する。

本書でいう「追加」は次の2つを区別する。

- **Actionの表示位置**：対象Machine / Setの右横
- **追加されるModelの挿入位置**：Actionを押下した対象Machine / Setの直後

`04_ui_copy_and_component_contract.md` の「対象項目の直下に追加」は、追加Modelの挿入順を意味するものとして扱い、Action Icon自体を対象項目の下部へ配置する意味では使用しない。

---

## 2. Step 2 Overall Layout

Step 2は以下の順序で構成する。

```text
Session Selector
Gym Select

Machine ExpansionPanel List
  Machine 1
  Machine 2
  ...

Session Notes

Step 2 Actions
```

Machine追加専用ActionをMachine一覧末尾へ1個だけ配置する構成は使用しない。

Machine Add / Deleteは、**各Machine ExpansionPanelごとに、そのPanel右横へ配置する。**

---

## 3. Machine Row

各Machineは独立した `v-expansion-panel` とし、Panel本体とMachine Action列を `v-row` で横並びにする。

基本構造：

```text
v-row dense
├─ v-col cols="11"
│  └─ v-expansion-panel
│     ├─ v-expansion-panel-title
│     │  ├─ Validation Icon
│     │  └─ Machine Name / ？
│     └─ v-expansion-panel-text
│        ├─ Machine Select
│        └─ Set List
│
└─ v-col cols="1"
   └─ Machine Action Column
      ├─ Add Machine Icon
      └─ Delete Machine Icon
```

### 3.1 Machine ExpansionPanel

- Machineごとに1つの `v-expansion-panel` を使用する。
- Machineを単純な `v-card` へ置き換えない。
- Panel Headerは既存ContractどおりValidation Icon + Machine表示名で構成する。
- Machine選択済み：日本語Machine名。
- Machine未選択：`？`。
- Machine Numberは表示しない。
- Machine追加直後は、追加したMachineのExpansionPanelを自動展開する。
- 自動スクロールは行わない。

### 3.2 Validation Icon

ExpansionPanel Header左側に表示する。

| State | Icon | Color |
| --- | --- | --- |
| Not Validated | `mdi-help-circle-outline` | Orange |
| Pass | `mdi-check-circle` | Green |
| Fail | `mdi-alert` | Red |

- Tooltipなし。
- Error件数表示なし。
- Fail時のみHeader文字色を赤系とする。

### 3.3 Machine Action Column

各Machine ExpansionPanelの**右横**に専用Action列を置く。

Actionは縦並びとする。

```text
+
×
```

Vuetify Component / Icon：

- Add：`v-icon` / small、`mdi-plus-thick`
- Delete：`v-icon` / small、`mdi-trash-can`
- Add Color：通常Theme文字色（Light / Dark Themeに追従）
- Delete Color：Red
- Tooltip：なし

Machine ActionをPanel下部、Panel内部の中央、Machine一覧末尾へ移動しない。

#### Add Machine

- 押下したMachineの**直後**に新規Machineを挿入する。
- Machine最大10件到達時disabled。
- disabled理由の補助表示なし。
- 追加したMachine Panelを自動展開する。
- 自動スクロールなし。

追加時初期値：

- Machine：未選択
- Set：1件
- Reps：空
- Weight：空
- Notes：空

既存Machine / Setの値を引き継がない。

#### Delete Machine

- Action列が属するMachine自身を削除する。
- Machine最小件数到達時disabled。
- 確認Dialogなし。
- Working Modelから即削除する。

---

## 4. Machine Content

ExpansionPanel展開時は、Machine Selectの下にSet Listを表示する。

```text
Machine Select

Set 1
Set 2
Set 3
...
```

Machine Selectは既存Contractを維持する。

- `v-select`
- `density="compact"`
- `variant="outlined"`
- label：`マシン`
- placeholderなし
- clearableなし
- 日本語名表示
- 日本語名部分一致検索
- 選択済みMachineは候補に残すがdisabled

---

## 5. Set Row

各Setは独立した行として表示し、Set本体とSet Action列を横並びにする。

基本構造：

```text
v-row dense
├─ Set Number Column
│  └─ mdi-numeric-*-box-outline
│
├─ Set Field Column
│  ├─ Reps / Weight
│  └─ Notes
│
└─ Set Action Column
   ├─ Add Set Icon
   └─ Delete Set Icon
```

Gridの基本配分は、Set Number / Field / Actionを分離し、既存Wireframeの構成に合わせる。

```text
cols=1 / cols=10 / cols=1
```

### 5.1 Set Number

- `mdi-numeric-*-box-outline` のIconのみ表示する。
- `Set 1` 等のTextは表示しない。
- Set Numberと入力Fieldを同一Columnへ混在させない。

### 5.2 Set Field Area

Reps / Weightは同一行に横並びとし、同等幅で表示する。

NotesはReps / Weightの下段に配置する。

```text
[ Reps                  ] [ Weight                ]
[ Notes                                            ]
```

Set入力Componentは既存Contractを維持する。

- Reps：`v-text-field`
- Weight：`v-text-field`
- Notes：`v-textarea`
- `density="compact"`
- `variant="outlined"`
- placeholderなし
- Notes rows=2
- Notes counter=400

Set Fieldの視覚的Boundaryには、既存Wireframeの意図に従いoutlined / denseのCard表現を使用してよい。

### 5.3 Set Action Column

各Setの**右横**に専用Action列を置く。

Actionは縦並びとする。

```text
+
×
```

Vuetify Component / Icon：

- Add：`v-icon` / small、`mdi-plus-thick`
- Delete：`v-icon` / small、`mdi-trash-can`
- Add Color：通常Theme文字色
- Delete Color：Red
- Tooltip：なし

Set ActionをSet下部中央へ配置しない。

#### Add Set

- 押下したSetの**直後**に新規Setを挿入する。
- Set最大10件到達時disabled。
- disabled理由の補助表示なし。

追加時初期値：

- Reps：空
- Weight：空
- Notes：空

既存Setの値を引き継がない。

#### Delete Set

- Action列が属するSet自身を削除する。
- Set最小1件時disabled。
- 確認Dialogなし。
- Working Modelから即削除する。

---

## 6. Session Notes

Session NotesはMachine ExpansionPanel Listの**後**に配置する。

Machine Add ActionをSession Notes直前へ単独配置しない。

既存Contractを維持する。

- `v-textarea`
- `density="compact"`
- `variant="outlined"`
- label：`Notes`
- rows=2
- counter=400
- placeholderなし

---

## 7. Input Component Presentation

Step 2の入力受付ComponentはVuetify画面共通UIルールとして以下を必須とする。

- `density="compact"`
- `variant="outlined"`

対象：

- Session `v-select`
- Gym `v-select`
- Machine `v-select`
- Reps `v-text-field`
- Weight `v-text-field`
- Set Notes `v-textarea`
- Session Notes `v-textarea`

既存Validation / suffix / counter / clearable / search / no-data-text等のContractは変更しない。

---

## 8. Prohibited Layouts

以下の配置は本設計では使用しない。

- Machine AddをMachine一覧末尾に1個だけ配置する。
- Machine Add / DeleteをExpansionPanel内部の下部中央へ配置する。
- Machine Add / DeleteをExpansionPanelから離れた共通Action領域へ配置する。
- Set Add / DeleteをSet Card下部中央へ配置する。
- Set Add / DeleteをSet List全体の末尾に集約する。
- MachineをExpansionPanelではなく単純なCardのみで表現する。
- Machine ActionとSet Actionを同一の共通Actionへ統合する。

---

## 9. Component Responsibility

既存のFrontend Component Structureを維持する。

```text
step2/Step.vue
├─ form/
│  ├─ Session.vue
│  ├─ Gym.vue
│  ├─ Machine.vue
│  ├─ Reps.vue
│  ├─ Weight.vue
│  └─ Notes.vue
└─ block/
   ├─ MachinePanel.vue
   └─ SetCard.vue
```

責務：

- `step2/Step.vue`
  - Machine / Set Collection Operation
  - Add / Delete
  - Expanded Machine管理
  - Validation Aggregate
- `MachinePanel.vue`
  - 1 MachineのExpansionPanel + Machine Action列
- `SetCard.vue`
  - 1 Setの表示構造 + Set Action列
- `form/*`
  - Field表示・入力・Field単位Validation

---

## 10. Human ST Acceptance Criteria

Human STでは最低限、以下を実画面で確認する。

1. 各Machine ExpansionPanelの右横に `+ / trash` が縦配置されている。
2. Machine一覧末尾に単独のMachine Addが存在しない。
3. Machine Addで、押下対象Machineの直後に新規Machineが挿入される。
4. Machine Deleteで、対象Machine自身が削除される。
5. 新規MachineのExpansionPanelが自動展開される。
6. 各Setの右横に `+ / trash` が縦配置されている。
7. Set Addで、押下対象Setの直後に新規Setが挿入される。
8. Set Deleteで、対象Set自身が削除される。
9. Reps / Weightが同一行、Notesが下段に配置されている。
10. Step 2のInput Componentがcompact / outlinedで統一されている。
11. Validation IconがMachine ExpansionPanel Header内に表示される。
12. Session NotesがMachine Listの後に配置される。

Test / Buildの成功だけでHuman ST完了とはしない。上記Visual Layoutは実画面で確認する。
