package jp.yuri_regulus_25.atlament

/**
 * Android Runtime Data で公開する Master reference resolution state を固定する。
 *
 * Windows/shared frontend と同じ `resolved`/`missing`/`deleted`/`invalid_excluded` を使用し、
 * UI は表示文言ではなく state と warning code を契約として扱う。
 */
internal fun androidMasterReferenceResolutionState(resolvedId: String?, deleted: Boolean, invalidExcluded: Boolean = false): String = when {
    invalidExcluded -> "invalid_excluded"
    resolvedId.isNullOrBlank() -> "missing"
    deleted -> "deleted"
    else -> "resolved"
}

/**
 * Master reference warning の stable code を返す。
 */
internal fun androidMasterReferenceWarningCode(deleted: Boolean, invalidExcluded: Boolean = false): String =
    if (invalidExcluded) "MASTER_REFERENCE_INVALID_EXCLUDED" else if (deleted) "MASTER_REFERENCE_DELETED" else "MASTER_REFERENCE_MISSING"
