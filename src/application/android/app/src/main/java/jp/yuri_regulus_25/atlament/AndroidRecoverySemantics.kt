package jp.yuri_regulus_25.atlament

import java.nio.charset.StandardCharsets

internal data class AndroidRecoveryFileAddition(val path: String, val contents: String)
internal data class AndroidRecoveryFileDeletion(val path: String)

internal fun androidRecoveryRelocationAddition(replacementPath: String, replacementContent: String): AndroidRecoveryFileAddition =
    AndroidRecoveryFileAddition(
        replacementPath.trim('/'),
        java.util.Base64.getEncoder().encodeToString(replacementContent.toByteArray(StandardCharsets.UTF_8))
    )

internal fun androidRecoveryRelocationDeletion(sourcePath: String): AndroidRecoveryFileDeletion =
    AndroidRecoveryFileDeletion(sourcePath.trim('/'))

internal val androidRecoveryWorkoutFieldOrder = listOf(
    "schema_version",
    "session_id",
    "date",
    "status",
    "gym_id",
    "condition",
    "machines",
    "notes"
)
