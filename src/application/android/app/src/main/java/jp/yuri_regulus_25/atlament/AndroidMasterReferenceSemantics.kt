package jp.yuri_regulus_25.atlament

internal fun androidMasterReferenceResolutionState(resolvedId: String?, deleted: Boolean, invalidExcluded: Boolean = false): String = when {
    invalidExcluded -> "invalid_excluded"
    resolvedId.isNullOrBlank() -> "missing"
    deleted -> "deleted"
    else -> "resolved"
}

internal fun androidMasterReferenceWarningCode(deleted: Boolean, invalidExcluded: Boolean = false): String =
    if (invalidExcluded) "MASTER_REFERENCE_INVALID_EXCLUDED" else if (deleted) "MASTER_REFERENCE_DELETED" else "MASTER_REFERENCE_MISSING"
