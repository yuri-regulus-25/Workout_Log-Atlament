/** Workout Write Boundaryの理由をStep 1向けの説明へ変換する。 */
export function writeBoundaryMessage(reason: string | null): string {
  if (reason === 'FALLBACK_ACTIVE') {
    return 'Fallbackデータを表示しているため、ワークアウトログを変更できません。Repositoryへ接続してから再度お試しください。'
  }
  if (reason === 'CONFIGURATION_REQUIRED') {
    return 'Repository設定が未登録のため、ワークアウトログを変更できません。Application Settingsで設定情報を登録してください。'
  }
  if (reason === 'CREDENTIAL_REQUIRED') {
    return 'GitHub Tokenが未登録のため、ワークアウトログを変更できません。Application SettingsでGitHub Tokenを登録してください。'
  }
  return 'ワークアウトログを変更できません。Application Settingsで接続状態を確認してください。'
}
