import type { CredentialStatus } from '@workout-lab/frontend-common'

export type CredentialExpiryPreset = '7' | '30' | '60' | '90' | '366' | 'custom'

export const credentialExpiryPresets: Array<{ value: CredentialExpiryPreset; label: string }> = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: '366', label: '366 days' },
  { value: 'custom', label: 'Custom' },
]

export function resolveCredentialLimitDate(
  preset: CredentialExpiryPreset,
  customLimitDate: string,
  today = currentDateString(),
): string {
  if (preset === 'custom') {
    return customLimitDate.trim()
  }

  return addDays(today, Number(preset))
}

export function describeCredentialExpiry(
  credential: CredentialStatus | null,
  today = currentDateString(),
): { state: 'missing' | 'expired' | 'valid' | 'unknown'; label: string; detail: string } {
  if (!credential || !credential.configured || credential.state === 'missing') {
    return {
      state: 'missing',
      label: '期限未設定',
      detail: '',
    }
  }

  if (!credential.limitDate) {
    return {
      state: 'unknown',
      label: '期限不明',
      detail: '既存Credentialに期限日が保存されていません。',
    }
  }

  if (credential.state === 'expired' || credential.limitDate < today) {
    return {
      state: 'expired',
      label: '期限切れ',
      detail: `${formatCredentialDisplayDate(credential.limitDate)} に期限切れです。`,
    }
  }

  return {
    state: 'valid',
    label: '有効期限内',
    detail: `${formatCredentialDisplayDate(credential.limitDate)} まで有効です。`,
  }
}

export function formatCredentialDisplayDate(limitDate: string | null | undefined): string {
  return limitDate ? limitDate.replaceAll('-', '/') : '-'
}

export function inferCredentialExpiryPreset(limitDate: string | null, today = currentDateString()): CredentialExpiryPreset {
  if (!limitDate) {
    return '30'
  }

  const days = daysBetween(today, limitDate)
  return credentialExpiryPresets.some((preset) => preset.value === String(days))
    ? String(days) as CredentialExpiryPreset
    : 'custom'
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day + days))
  return toDateString(value)
}

function daysBetween(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number)
  const [toYear, toMonth, toDay] = to.split('-').map(Number)
  const fromUtc = Date.UTC(fromYear, fromMonth - 1, fromDay)
  const toUtc = Date.UTC(toYear, toMonth - 1, toDay)
  return Math.round((toUtc - fromUtc) / 86_400_000)
}

function currentDateString(): string {
  return toDateString(new Date())
}

function toDateString(value: Date): string {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
