package jp.yuri_regulus_25.atlament

import java.io.File
import kotlin.test.Test
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
}
