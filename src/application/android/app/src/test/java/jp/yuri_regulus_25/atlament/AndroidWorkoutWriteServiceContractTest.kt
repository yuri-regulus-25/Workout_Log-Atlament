package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidWorkoutWriteServiceContractTest {
    private val service = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidWorkoutWriteService.kt").readText()
    private val server = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidLocalhostServer.kt").readText()

    @Test
    fun exposesTheSamePurposeSpecificWorkoutRoutesAsWindows() {
        assertTrue(server.contains("/workout-write/boundary"))
        assertTrue(server.contains("/workout-write/date/"))
        assertTrue(server.contains("/workout-write/sessions"))
        assertTrue(server.contains("workoutWriteService.createResponse"))
        assertTrue(server.contains("workoutWriteService.updateResponse"))
        assertTrue(server.contains("workoutWriteService.deleteResponse"))
    }

    @Test
    fun fixesCommitIdentityAndOptimisticConcurrencyInsideTheApplicationFramework() {
        assertTrue(service.contains("\$operation: Workout Log - \${date.replace('-', '/')}"))
        assertTrue(service.contains("expectedHeadOid"))
        assertTrue(service.contains("WORKOUT_REPOSITORY_CONFLICT"))
        assertFalse(service.contains("force\""))
        assertFalse(service.contains("autoMerge"))
        assertEquals(1, "githubClient.postWorkoutMutationGraphql".toRegex().findAll(service).count())
        assertTrue(service.contains("reconcileWorkoutCommit"))
    }

    @Test
    fun reconciliationRecognizesTheCommittedMutation() {
        val reconciler = WorkoutCommitReconciler(
            readHead = { "commit" },
            compare = { _, _ -> WorkoutCommitComparison(
                "ahead",
                listOf(WorkoutCommitCandidate("commit", "Update: Workout Log - 2026/09/13", setOf("head"))),
                mapOf(path to "modified")
            ) },
            readContent = { _, _ -> "{}\n" }
        )

        val result = reconciler.reconcile(
            "head",
            "Update: Workout Log - 2026/09/13",
            listOf(WorkoutRepositoryChange(path, "{}\n"))
        )

        assertEquals(WorkoutCommitReconciliationState.COMMITTED, result.state)
        assertEquals("commit", result.revision)
    }

    @Test
    fun reconciliationRecognizesThatTheMutationWasNotCommitted() {
        val reconciler = WorkoutCommitReconciler({ "head" }, { _, _ -> error("comparison must not run") }, { _, _ -> null })

        val result = reconciler.reconcile("head", "message", emptyList())

        assertEquals(WorkoutCommitReconciliationState.NOT_COMMITTED, result.state)
    }

    @Test
    fun reconciliationKeepsUnknownStateWhenRepositoryCannotBeRead() {
        val reconciler = WorkoutCommitReconciler({ error("head unavailable") }, { _, _ -> error("comparison unavailable") }, { _, _ -> null })

        val result = reconciler.reconcile("head", "message", emptyList())

        assertEquals(WorkoutCommitReconciliationState.UNKNOWN, result.state)
    }

    @Test
    fun keepsValidationAndLegacyRulesAlignedWithTheSharedContract() {
        for (message in listOf(
            "必須項目です",
            "数字を入力してください",
            "1以上の整数を入力してください",
            "100以下の数値を入力してください",
            "999.99以下の数値を入力してください",
            "少数は2桁までです",
            "400字以内に入力してください",
            "マスターデータに存在しません",
            "同じマシンは選択できません",
            "日付は変更できません"
        )) {
            assertTrue(service.contains(message), message)
        }
        assertTrue(service.contains("value.orEmpty() != sourceValue.orEmpty()"))
        assertTrue(service.contains("value != sourceValue"))
        assertTrue(service.contains("usedSourceSets"))
    }

    @Test
    fun reportsReflectionSeparatelyWithoutRepeatingTheMutation() {
        assertTrue(service.contains("WORKOUT_REFLECTION_FAILED"))
        assertTrue(service.contains("val commitRevision = commit"))
        assertTrue(service.contains("val reflection = reflect"))
        assertFalse(service.substringAfter("val reflection = reflect").contains("commit(context.configuration"))
    }

    @Test
    fun treatsZeroWorkoutResourcesAsAValidInitialState() {
        val builder = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidRuntimeDataBuilder.kt").readText()
        val fetcher = File("src/main/java/jp/yuri_regulus_25/atlament/AndroidConfiguredResourceFetcher.kt").readText()

        assertFalse(builder.contains("workoutFiles.isEmpty()"))
        assertTrue(fetcher.contains("GITHUB_RESOURCE_NOT_FOUND") && fetcher.contains("emptyList()"))
    }

    @Test
    fun machineNotesUseExistingArraySchemaAndPreserveOmittedOrUnchangedValues() {
        assertTrue(service.contains(".put(\"notes\", projectNotes(machine))"))
        assertTrue(service.contains("if (machine.has(\"notes\")) validateNotes(\"\$path.notes\""))
        assertTrue(service.contains("machineInput.has(\"notes\") && nullableString(machineInput, \"notes\").orEmpty() != projectNotes(machine)"))
        assertTrue(service.contains("if (notes.isEmpty()) machine.remove(\"notes\") else machine.put(\"notes\", JSONArray(notes))"))
    }

    private companion object {
        const val path = "workouts/2026/09/2026-09-13.json"
    }
}
