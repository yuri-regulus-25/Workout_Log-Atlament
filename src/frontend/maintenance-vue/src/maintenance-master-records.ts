import type { MasterDocumentType } from '@workout-lab/frontend-common'

export type MachineRecord = {
  machine_id: string
  source_ids?: string[]
  name: string
  body_part: string
  aliases: string[]
  active: boolean
  deleted: boolean
}

export type GymRecord = {
  gym_id: string
  source_ids?: string[]
  name: string
  short_name?: string
  active: boolean
  deleted: boolean
  main: boolean
}

export type RecordDraft = MachineRecord | GymRecord

export function recordId(record: RecordDraft): string {
  return isMachine(record) ? record.machine_id : record.gym_id
}

export function cloneRecordDraft(record: RecordDraft): RecordDraft {
  return isMachine(record) ? cloneMachineRecord(record) : cloneGymRecord(record)
}

export function cloneMachineRecord(record: MachineRecord): MachineRecord {
  return {
    machine_id: record.machine_id,
    source_ids: [...(record.source_ids ?? [])],
    name: record.name,
    body_part: record.body_part,
    aliases: [...record.aliases],
    active: record.active,
    deleted: record.deleted,
  }
}

export function cloneGymRecord(record: GymRecord): GymRecord {
  return {
    gym_id: record.gym_id,
    source_ids: [...(record.source_ids ?? [])],
    name: record.name,
    short_name: record.short_name,
    active: record.active,
    deleted: record.deleted,
    main: record.main,
  }
}

export function masterTypeLabel(type: MasterDocumentType): string {
  return type === 'MACHINE_MASTER' ? 'マシン' : 'ジム'
}

export function isRecordDraft(value: unknown): value is RecordDraft {
  return isMachine(value) || isGym(value)
}

export function isMachine(record: unknown): record is MachineRecord {
  return isRecordLike(record) && 'machine_id' in record
}

export function isGym(record: unknown): record is GymRecord {
  return isRecordLike(record) && 'gym_id' in record
}

export function toUserFacingMasterWriteError(error: unknown): string {
  const code = firstAfErrorCode(error)
  if (code === 'MASTER_WRITE_CONFLICT') {
    return 'ほかの更新が先に反映されています。画面を再読み込みしてから再度操作してください。'
  }
  if (code === 'MASTER_SYNC_REQUIRED') {
    return '同期が必要です。同期してから再度操作してください。'
  }
  if (code === 'MASTER_WRITE_INVALID' || code === 'RUNTIME_DATA_INVALID') {
    return '入力内容を保存できませんでした。マスター情報を確認してください。'
  }
  if (code === 'CONFIGURATION_REQUIRED' || code === 'CONFIG_REQUIRED') {
    return '必要な設定を行ってから、再度操作してください。'
  }
  if (code === 'CREDENTIAL_REQUIRED' || code === 'GITHUB_UNAUTHORIZED' || code === 'GITHUB_FORBIDDEN') {
    return 'GitHub Tokenを確認してください。'
  }
  if (code === 'GITHUB_RESOURCE_NOT_FOUND') {
    return '必要なマスター情報が見つかりません。設定情報と同期対象を確認してください。'
  }
  if (code === 'GITHUB_TIMEOUT' || code === 'GITHUB_CONNECTION_FAILED' || code === 'GITHUB_RATE_LIMIT' || code === 'GITHUB_SERVER_ERROR') {
    return 'GitHubとの通信に失敗しました。時間をおいて再度実行してください。'
  }

  return 'マスターデータを保存できませんでした。設定情報と同期状態を確認してください。'
}

export function firstAfErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('errors' in error)) return null
  const errors = (error as { errors?: Array<{ code?: string }> }).errors
  return errors?.[0]?.code ?? null
}

function isRecordLike(record: unknown): record is Record<string, unknown> {
  return typeof record === 'object' && record !== null
}
