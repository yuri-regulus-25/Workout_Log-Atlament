package jp.yuri_regulus_25.atlament

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class MasterReferenceContractParityTest {
    @Test
    fun resolvesMissingAndDeletedStatesWithSharedContractValues() {
        assertEquals("missing", androidMasterReferenceResolutionState(null, deleted = false))
        assertEquals("missing", androidMasterReferenceResolutionState("", deleted = true))
        assertEquals("deleted", androidMasterReferenceResolutionState("deleted-machine", deleted = true))
        assertEquals("resolved", androidMasterReferenceResolutionState("known-machine", deleted = false))
    }

    @Test
    fun emitsSharedWarningCodesForUnresolvedReferences() {
        assertEquals("MASTER_REFERENCE_MISSING", androidMasterReferenceWarningCode(deleted = false))
        assertEquals("MASTER_REFERENCE_DELETED", androidMasterReferenceWarningCode(deleted = true))
    }

    @Test
    fun normalizesGitBranchRefsForRecoveryRefUpdates() {
        assertEquals("heads/main", androidNormalizeGitBranchRef(""))
        assertEquals("heads/master", androidNormalizeGitBranchRef("master"))
        assertEquals("heads/release-2.1.0-test-06-android", androidNormalizeGitBranchRef("refs/heads/release-2.1.0-test-06-android"))
        assertEquals("tags/v2.1.0", androidNormalizeGitBranchRef("tags/v2.1.0"))
    }

    @Test
    fun buildsAtomicRecoveryRelocationFileChanges() {
        val addition = androidRecoveryRelocationAddition(
            "data/workouts/2026/09/2026-09-01.json",
            "{ \"note\": \"日本語\" }\n"
        )
        val deletion = androidRecoveryRelocationDeletion("data/workouts/2026/08/2026-08-07.json")

        assertEquals("data/workouts/2026/09/2026-09-01.json", addition.path)
        assertEquals("eyAibm90ZSI6ICLml6XmnKzoqp4iIH0K", addition.contents)
        assertEquals("data/workouts/2026/08/2026-08-07.json", deletion.path)
        assertFalse(addition.path.contains("Android Recovery relocation commit is unavailable"))
        assertFalse(deletion.path.contains("Android Recovery relocation commit is unavailable"))
    }

    @Test
    fun keepsRecoveryWorkoutRepositoryFieldOrderAlignedWithCanonicalSchema() {
        assertEquals(
            listOf("schema_version", "session_id", "date", "status", "gym_id", "condition", "machines", "notes"),
            androidRecoveryWorkoutFieldOrder
        )
    }
}
