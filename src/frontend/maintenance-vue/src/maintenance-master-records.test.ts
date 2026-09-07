import { describe, expect, it } from 'vitest'
import {
  cloneRecordDraft,
  firstAfErrorCode,
  isGym,
  isMachine,
  masterTypeLabel,
  recordId,
  toUserFacingMasterWriteError,
  type GymRecord,
  type MachineRecord,
} from './maintenance-master-records'

describe('maintenance master record presentation', () => {
  it('clones machine drafts without sharing array references', () => {
    const machine: MachineRecord = {
      machine_id: 'lat-pulldown',
      source_ids: ['lat_old'],
      name: 'Lat Pulldown',
      body_part: 'back',
      aliases: ['pulldown'],
      active: true,
      deleted: false,
    }

    const clone = cloneRecordDraft(machine) as MachineRecord
    clone.source_ids?.push('lat_new')
    clone.aliases.push('wide pulldown')

    expect(recordId(machine)).toBe('lat-pulldown')
    expect(clone).toEqual({ ...machine, source_ids: ['lat_old', 'lat_new'], aliases: ['pulldown', 'wide pulldown'] })
    expect(machine.source_ids).toEqual(['lat_old'])
    expect(machine.aliases).toEqual(['pulldown'])
  })

  it('identifies gym drafts and labels master document types', () => {
    const gym: GymRecord = {
      gym_id: 'main-gym',
      name: 'Main Gym',
      short_name: 'Main',
      active: true,
      deleted: false,
      main: true,
    }

    expect(isGym(gym)).toBe(true)
    expect(isMachine(gym)).toBe(false)
    expect(recordId(gym)).toBe('main-gym')
    expect(masterTypeLabel('MACHINE_MASTER')).toBe('マシン')
    expect(masterTypeLabel('GYM_MASTER')).toBe('ジム')
  })

  it('maps af save errors to user-facing maintenance messages', () => {
    const error = { errors: [{ code: 'GITHUB_RATE_LIMIT' }] }

    expect(firstAfErrorCode(error)).toBe('GITHUB_RATE_LIMIT')
    expect(toUserFacingMasterWriteError(error)).toBe('GitHubとの通信に失敗しました。時間をおいて再度実行してください。')
    expect(toUserFacingMasterWriteError({ errors: [{ code: 'MASTER_WRITE_CONFLICT' }] })).toBe(
      'ほかの更新が先に反映されています。画面を再読み込みしてから再度操作してください。',
    )
  })
})
