import type { WorkoutFieldMessage, WorkoutMasterOption, WorkoutSessionInput } from '@workout-lab/frontend-common'

export const messages = {
  required: '必須項目です',
  numeric: '数字を入力してください',
  repsMinimum: '1以上の整数を入力してください',
  repsMaximum: '100以下の数値を入力してください',
  weightMaximum: '999.99以下の数値を入力してください',
  decimalScale: '少数は2桁までです',
  notesMaximum: '400字以内に入力してください',
  reference: 'マスターデータに存在しません',
  duplicateMachine: '同じマシンは選択できません',
} as const

export function validateSession(
  session: WorkoutSessionInput,
  original: WorkoutSessionInput | null,
  gyms: WorkoutMasterOption[],
  machines: WorkoutMasterOption[],
): WorkoutFieldMessage[] {
  const errors: WorkoutFieldMessage[] = []
  const validGyms = new Set(gyms.map((item) => item.id))
  const validMachines = new Set(machines.map((item) => item.id))
  validateReference('gymId', session.gymId, original?.gymId, validGyms, errors)
  if (session.machines.length < 1 || session.machines.length > 10) errors.push({ path: 'machines', message: 'マシンは1件以上10件以下にしてください' })
  const selected = new Set<string>()
  session.machines.forEach((machine, machineIndex) => {
    const path = `machines[${machineIndex}]`
    const originalMachine = machine.sourceIndex == null ? null : original?.machines[machine.sourceIndex] ?? null
    validateReference(`${path}.machineId`, machine.machineId, originalMachine?.machineId, validMachines, errors)
    if (machine.machineId && selected.has(machine.machineId)) errors.push({ path: `${path}.machineId`, message: messages.duplicateMachine })
    if (machine.machineId) selected.add(machine.machineId)
    if (machine.sets.length < 1 || machine.sets.length > 10) errors.push({ path: `${path}.sets`, message: 'セットは1件以上10件以下にしてください' })
    machine.sets.forEach((set, setIndex) => {
      const setPath = `${path}.sets[${setIndex}]`
      if (set.reps == null) errors.push({ path: `${setPath}.reps`, message: messages.required })
      else if (Number.isNaN(set.reps)) errors.push({ path: `${setPath}.reps`, message: messages.numeric })
      else if (!Number.isInteger(set.reps) || set.reps < 1) errors.push({ path: `${setPath}.reps`, message: messages.repsMinimum })
      else if (set.reps > 100) errors.push({ path: `${setPath}.reps`, message: messages.repsMaximum })
      if (set.weightKg == null || Number.isNaN(set.weightKg)) errors.push({ path: `${setPath}.weightKg`, message: messages.required })
      else if (set.weightKg < 0) errors.push({ path: `${setPath}.weightKg`, message: messages.numeric })
      else if (set.weightKg > 999.99) errors.push({ path: `${setPath}.weightKg`, message: messages.weightMaximum })
      else if (!/^\d+(\.\d{1,2})?$/.test(String(set.weightKg))) errors.push({ path: `${setPath}.weightKg`, message: messages.decimalScale })
      const originalSet = set.sourceIndex == null ? null : originalMachine?.sets[set.sourceIndex] ?? null
      validateNotes(`${setPath}.notes`, set.notes, originalSet?.notes, errors)
    })
  })
  validateNotes('notes', session.notes, original?.notes, errors)
  return errors
}

function validateReference(path: string, value: string | null, original: string | null | undefined, valid: Set<string>, errors: WorkoutFieldMessage[]) {
  if (!value) errors.push({ path, message: messages.required })
  else if (value !== original && !valid.has(value)) errors.push({ path, message: messages.reference })
}

function validateNotes(path: string, value: string | null, original: string | null | undefined, errors: WorkoutFieldMessage[]) {
  if ((value?.length ?? 0) > 400 && (value ?? '') !== (original ?? '')) errors.push({ path, message: messages.notesMaximum })
}
