package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MasterReferenceContractParityTest {
    @Test
    fun resolvesMissingAndDeletedStatesWithSharedContractValues() {
        assertEquals("missing", androidMasterReferenceResolutionState(null, deleted = false))
        assertEquals("missing", androidMasterReferenceResolutionState("", deleted = true))
        assertEquals("deleted", androidMasterReferenceResolutionState("deleted-machine", deleted = true))
        assertEquals("invalid_excluded", androidMasterReferenceResolutionState(null, deleted = false, invalidExcluded = true))
        assertEquals("resolved", androidMasterReferenceResolutionState("known-machine", deleted = false))
    }

    @Test
    fun emitsSharedWarningCodesForUnresolvedReferences() {
        assertEquals("MASTER_REFERENCE_MISSING", androidMasterReferenceWarningCode(deleted = false))
        assertEquals("MASTER_REFERENCE_DELETED", androidMasterReferenceWarningCode(deleted = true))
        assertEquals("MASTER_REFERENCE_INVALID_EXCLUDED", androidMasterReferenceWarningCode(deleted = false, invalidExcluded = true))
    }

    @Test
    fun keepsMasterRecordIsolationRuntimeSemanticsInAndroidBuilder() {
        val builderSource = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidRuntimeDataBuilder.kt")
            .readText()
        val semanticsSource = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidMasterReferenceSemantics.kt")
            .readText()

        assertTrue(builderSource.contains("MasterRecordCatalog"))
        assertTrue(builderSource.contains("structuralInvalid"))
        assertTrue(builderSource.contains("duplicate reference key is excluded"))
        assertTrue(semanticsSource.contains("\"MASTER_REFERENCE_INVALID_EXCLUDED\""))
        assertTrue(semanticsSource.contains("\"invalid_excluded\""))
        assertTrue(builderSource.indexOf("machines.structuralInvalid || gyms.structuralInvalid") < builderSource.indexOf("buildSession(file.path"))
    }

    @Test
    fun normalizesGitBranchRefsForRecoveryRefUpdates() {
        assertEquals("heads/main", androidNormalizeGitBranchRef(""))
        assertEquals("heads/master", androidNormalizeGitBranchRef("master"))
        assertEquals("heads/release-2.1.0-test-06-android", androidNormalizeGitBranchRef("refs/heads/release-2.1.0-test-06-android"))
        assertEquals("tags/v2.1.0", androidNormalizeGitBranchRef("tags/v2.1.0"))
    }

    @Test
    fun classifiesGithubHttpErrorsWithAndroidAfCodes() {
        assertEquals("GITHUB_UNAUTHORIZED", androidMapGithubError(401, "master/machines.json").code)
        assertEquals("GITHUB_FORBIDDEN", androidMapGithubError(403, "master/machines.json").code)
        assertEquals("GITHUB_RESOURCE_NOT_FOUND", androidMapGithubError(404, "master/machines.json").code)
        assertEquals("GitHub resource not found: master/machines.json.", androidMapGithubError(404, "master/machines.json").message)
        assertEquals("GITHUB_RATE_LIMIT", androidMapGithubError(429, "master/machines.json").code)
        assertEquals("GITHUB_CONNECTION_FAILED", androidMapGithubError(500, "master/machines.json").code)
        assertEquals("GitHub server error: HTTP 500.", androidMapGithubError(500, "master/machines.json").message)
    }

    @Test
    fun keepsLocalhostEndpointPrimaryAndSecondaryPortOrderAligned() {
        assertEquals(listOf(14108, 45194), androidLocalhostPorts)
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

    @Test
    fun keepsRecoveryFallbackUnresolvedFieldsLimitedToRequiredWorkoutSchemaFields() {
        val source = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt")
            .readText()
        val fallback = source
            .substringAfter("private fun unresolvedWorkoutFields")
            .substringBefore("private fun recoverableField")

        assertTrue(fallback.contains("\"/schema_version\", \"/session_id\", \"/date\", \"/status\", \"/gym_id\", \"/machines\""))
        assertTrue(fallback.contains("\"/condition\", \"/notes\""))
        assertTrue(fallback.contains(".put(\"state\", \"unresolved\")"))
        assertTrue(fallback.contains(".put(\"state\", \"recovered\")"))
        assertTrue(fallback.indexOf("\"/condition\", \"/notes\"") > fallback.indexOf(".put(\"state\", \"unresolved\")"))
    }

    @Test
    fun recoveryCommitClassifiesOldRevisionResourceKeyAsWriteConflictBeforeNotFound() {
        val source = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt")
            .readText()
            .substringAfter("private fun sendRecoveryCommit")
        val staleKeyLookup = "recoveryResourceKey(configuration, \"WORKOUT\", it.source.path, expectedSourceRevision) == resourceKey"
        val conflict = "failJson(\"RECOVERY_WRITE_CONFLICT\", \"Recovery source revision is stale.\")"
        val notFound = "failJson(\"RECOVERY_RESOURCE_NOT_FOUND\", \"Recovery Resource was not found.\")"

        assertTrue(source.contains(staleKeyLookup))
        assertTrue(source.indexOf(staleKeyLookup) < source.indexOf(notFound))
        assertTrue(source.indexOf(conflict) < source.indexOf(notFound))
    }

    @Test
    fun recoveryReadAndValidateClassifyOldRevisionDraftAsStaleBeforeNotFound() {
        val source = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt")
            .readText()
        val readResolver = "private fun resolveRecoveryResourceForRead"
        val draftKeyLookup = "recoveryDraftStore.findByResourceKey(configuration, resourceKey, ::recoveryResourceKey)"
        val stale = "errorsArray(\"RECOVERY_DRAFT_STALE\", \"Recovery Draft source revision is stale.\")"
        val notFound = "errorsArray(\"RECOVERY_RESOURCE_NOT_FOUND\", \"Recovery Resource was not found.\")"
        val validation = source.substringAfter("private fun validateRecoveryDraft")

        assertTrue(source.contains(readResolver))
        assertTrue(source.contains(draftKeyLookup))
        assertTrue(validation.indexOf(draftKeyLookup) < validation.indexOf(notFound))
        assertTrue(validation.contains(stale))
    }
}
