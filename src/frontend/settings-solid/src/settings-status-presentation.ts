import type { AfError, AfStatus, CredentialStatus } from '@workout-lab/frontend-common'

export type Message = {
  tone: 'success' | 'warning' | 'error'
  text: string
}

const statusLabels: Record<string, string> = {
  available: '利用可能',
  completed: '完了',
  degraded: '一部利用不可',
  expired: '期限切れ',
  failed: '失敗',
  idle: '待機中',
  invalid: '無効',
  loading: '読込中',
  missing: '未設定',
  ready: '利用可能',
  running: '実行中',
  starting: '起動中',
  stopping: '終了中',
  unconfigured: '初期設定未完了',
  unavailable: '利用不可',
  unknown: '不明',
}

export function toMessage(tone: Message['tone'], errors: AfError[], fallback: string): Message {
  const userFacingErrors = uniqueMessages(errors.map(toUserFacingAfError))
  return {
    tone,
    text: userFacingErrors.length === 0
      ? fallback
      : tone === 'warning'
        ? `${fallback} ${userFacingErrors.join(' / ')}`
        : userFacingErrors.join(' / '),
  }
}

export function displayStatus(value?: string) {
  if (!value) return '-'
  return statusLabels[value] ?? value
}

export function requiredActionLabel(action: string) {
  if (action === 'CONFIGURATION_REQUIRED') return '設定情報の登録が必要です'
  if (action === 'CREDENTIAL_REQUIRED') return 'GitHub Tokenの登録が必要です'
  if (action === 'RUNTIME_DATA_REQUIRED') return 'データ同期が必要です'
  return action
}

export function runtimeDataSummary(status: AfStatus | null) {
  if (!status) return '-'
  return status.runtimeData.currentAvailable ? '利用可能' : '利用不可'
}

export function buildIdentitySummary(status: AfStatus | null) {
  const build = status?.versions?.build
  if (!build) return '-'
  return build.debug ? `${build.variant} / 開発用` : `${build.variant} / 通常版`
}

export function resolveGithubStatus(status: AfStatus | null, credential: CredentialStatus | null) {
  if (!credential) return { label: '-' }
  if (!credential.configured || credential.state === 'missing') return { label: '未設定' }
  if (credential.state === 'expired') return { label: 'Token期限切れ' }
  if (credential.state !== 'available') return { label: '利用不可' }

  const github = status?.components.github
  if (github === 'available') return { label: '利用可能' }
  if (github === 'degraded' || github === 'unavailable' || github === 'failed') return { label: '利用不可' }
  return { label: displayStatus(github) }
}

function uniqueMessages(messages: string[]): string[] {
  return Array.from(new Set(messages))
}

function toUserFacingAfError(error: AfError): string {
  if (error.code === 'CONFIG_SAVE_FAILED') {
    return '設定情報を保存できませんでした。再度操作してください。'
  }
  if (error.code === 'CONFIG_REQUIRED') {
    return error.message === 'Repository configuration is required.'
      ? 'リポジトリ設定が完了していません。設定内容を確認してください。'
      : '必要な設定を行ってから、再度操作してください。'
  }
  if (error.code === 'CONFIG_INVALID') {
    if (error.message === 'Repository configuration is invalid.') {
      return 'リポジトリ設定に問題があります。入力内容を確認してください。'
    }
    if (error.message === 'Resource configuration is invalid.') {
      return 'リソース設定に問題があります。入力内容を確認してください。'
    }
    if (error.message === 'Resource configuration is required.') {
      return 'リソース設定が完了していません。設定内容を確認してください。'
    }
    if (error.message === 'Timeout configuration is required.') {
      return 'タイムアウト設定が完了していません。設定内容を確認してください。'
    }
    if (error.message.endsWith(' is out of range.')) {
      return 'タイムアウト設定の値が設定可能な範囲外です。入力内容を確認してください。'
    }
    return '設定情報が利用できない形式です。仕様を確認し、登録されている情報を見直してください。'
  }
  if (error.code === 'CREDENTIAL_REQUIRED') {
    return 'GitHub Tokenを登録してから、再度操作してください。'
  }
  if (error.code === 'CREDENTIAL_INVALID') {
    return 'GitHub Tokenが正しくありません。入力内容を確認してください。'
  }
  if (error.code === 'CREDENTIAL_SAVE_FAILED') {
    return 'GitHub Tokenを保存できませんでした。再度操作してください。'
  }
  if (error.code === 'OPERATION_ALREADY_RUNNING') {
    if (error.message === 'Sync is already running.') {
      return '同期処理を実行中です。完了してから再度操作してください。'
    }
    if (error.message === 'Credential update is already running.') {
      return 'GitHub Tokenの更新処理を実行中です。完了してから再度操作してください。'
    }
    return '設定情報の更新処理を実行中です。完了してから再度操作してください。'
  }
  if (error.code === 'COMMON_INTERNAL_ERROR') {
    return error.message === 'Sync failed.'
      ? '同期に失敗しました。再度操作してください。'
      : '設定情報を更新できませんでした。再度操作してください。'
  }
  if (error.code === 'RUNTIME_DATA_UPDATE_FAILED' || error.code === 'RUNTIME_DATA_SAVE_FAILED') {
    return '同期したデータを更新できませんでした。再度同期してください。'
  }
  if (error.code === 'RUNTIME_DATA_EMPTY') {
    return 'ワークアウトデータがありません。'
  }
  if (error.code === 'RUNTIME_DATA_INVALID') {
    return '同期対象のデータに問題があるため、同期できませんでした。'
  }
  if (error.code === 'RUNTIME_DATA_UNAVAILABLE') {
    return '同期済みデータがありません。同期してください。'
  }
  if (error.code === 'GITHUB_UNAUTHORIZED') {
    return 'GitHubの認証に失敗しました。GitHub Tokenを確認してください。'
  }
  if (error.code === 'GITHUB_FORBIDDEN') {
    return 'GitHubへのアクセスが許可されていません。リポジトリの権限とGitHub Tokenを確認してください。'
  }
  if (error.code === 'GITHUB_RESOURCE_NOT_FOUND') {
    return '同期対象のGitHubリソースが見つかりません。設定情報と同期対象を確認してください。'
  }
  if (error.code === 'GITHUB_RATE_LIMIT') {
    return 'GitHubの利用制限に達しました。時間をおいて再度操作してください。'
  }
  if (error.code === 'GITHUB_TIMEOUT') {
    return 'GitHubへの接続がタイムアウトしました。再度操作してください。タイムアウト秒数の再設定を検討してください。'
  }
  if (error.code === 'GITHUB_CONNECTION_FAILED') {
    return error.message.startsWith('GitHub server error:')
      ? 'GitHubでエラーが発生しました。時間をおいて再度操作してください。'
      : 'GitHubに接続できませんでした。ネットワーク接続を確認してください。'
  }
  if (error.code === 'GITHUB_SERVER_ERROR') {
    return 'GitHubでエラーが発生しました。時間をおいて再度操作してください。'
  }
  return fallbackAfErrorMessage(error)
}

function fallbackAfErrorMessage(error: AfError): string {
  if (error.recoverable) return '操作に失敗しました。再度操作してください。'
  return '同期対象のデータに問題があります。'
}
