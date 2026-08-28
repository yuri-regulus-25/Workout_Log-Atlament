import { describe, expect, it } from 'vitest'
import {
  describeCredentialExpiry,
  inferCredentialExpiryPreset,
  resolveCredentialLimitDate,
  type CredentialExpiryPreset,
} from './credential-expiry'

describe('credential expiry helpers', () => {
  it.each([
    ['7', '2026-09-04'],
    ['30', '2026-09-27'],
    ['60', '2026-10-27'],
    ['90', '2026-11-26'],
    ['366', '2027-08-29'],
  ] as Array<[CredentialExpiryPreset, string]>)('resolves %s day preset', (preset, expected) => {
    expect(resolveCredentialLimitDate(preset, '', '2026-08-28')).toBe(expected)
  })

  it('uses the custom date only for Custom', () => {
    expect(resolveCredentialLimitDate('custom', '2026-12-31', '2026-08-28')).toBe('2026-12-31')
    expect(resolveCredentialLimitDate('30', '2026-12-31', '2026-08-28')).toBe('2026-09-27')
  })

  it('infers presets from an existing limit date', () => {
    expect(inferCredentialExpiryPreset(null, '2026-08-28')).toBe('30')
    expect(inferCredentialExpiryPreset('2026-09-27', '2026-08-28')).toBe('30')
    expect(inferCredentialExpiryPreset('2026-12-31', '2026-08-28')).toBe('custom')
  })

  it('describes missing, expired, valid, and unknown credential states', () => {
    expect(describeCredentialExpiry(null, '2026-08-28').state).toBe('missing')
    expect(describeCredentialExpiry({ configured: true, state: 'expired', limitDate: '2026-08-27' }, '2026-08-28').state).toBe('expired')
    expect(describeCredentialExpiry({ configured: true, state: 'available', limitDate: '2026-08-28' }, '2026-08-28').state).toBe('valid')
    expect(describeCredentialExpiry({ configured: true, state: 'available', limitDate: null }, '2026-08-28').state).toBe('unknown')
  })
})
