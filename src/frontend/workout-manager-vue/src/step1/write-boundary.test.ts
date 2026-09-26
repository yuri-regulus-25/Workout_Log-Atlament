import { describe, expect, it } from 'vitest'
import { writeBoundaryMessage } from './write-boundary'

describe('Workout Manager write boundary presentation', () => {
  it.each([
    ['FALLBACK_ACTIVE', 'Fallbackデータを表示しているため'],
    ['CONFIGURATION_REQUIRED', 'Repository設定が未登録のため'],
    ['CREDENTIAL_REQUIRED', 'GitHub Tokenが未登録のため'],
    [null, 'Application Settingsで接続状態を確認してください'],
  ])('%sの変更不可理由を表示する', (reason, expected) => {
    expect(writeBoundaryMessage(reason)).toContain(expected)
  })
})
