package jp.yuri_regulus_25.atlament

import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.time.LocalDate
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

/**
 * Workout Manager の用途限定 read/write boundary。
 *
 * raw resource と GitHub path は API へ公開せず、session mutation を resource 再構築、
 * optimistic concurrency、1 atomic commit、runtime reflection の順に処理する。
 */
internal class AndroidWorkoutWriteService(
    private val configurationStatus: () -> String,
    private val loadConfigurationJson: () -> String,
    private val credentialState: () -> String,
    private val githubClient: AndroidGithubClient,
    private val resourceFetcher: AndroidConfiguredResourceFetcher,
    private val runtimeBuilder: AndroidRuntimeDataBuilder,
    private val runtimeStore: AndroidRuntimeDataStore,
    private val fallbackActive: () -> Boolean,
    private val markReflectionSucceeded: () -> Unit
) {
    private data class MasterEntry(val id: String, val name: String, val active: Boolean, val deleted: Boolean)
    private data class Catalog(
        val gyms: Map<String, MasterEntry>,
        val machines: Map<String, MasterEntry>,
        val machineDocument: MasterDocument,
        val gymDocument: MasterDocument
    )
    private data class Resource(val path: String, val revision: String, val jsonl: Boolean, val sessions: MutableList<JSONObject>)
    private data class Context(val configuration: JSONObject, val head: String, val resources: MutableList<Resource>, val catalog: Catalog)
    private data class Location(val resource: Resource, val index: Int, val session: JSONObject)
    private data class Change(val path: String, val content: String?)

    fun boundaryResponse(): SyncResponse {
        if (configurationStatus() != "available" || credentialState() != "available" || fallbackActive()) {
            val reason = when {
                fallbackActive() -> "FALLBACK_ACTIVE"
                configurationStatus() != "available" -> "CONFIGURATION_REQUIRED"
                else -> "CREDENTIAL_REQUIRED"
            }
            return ok(JSONObject()
                .put("writable", false)
                .put("reason", reason)
                .put("remoteAvailable", false)
                .put("source", if (fallbackActive()) "fallback" else "unavailable")
                .put("revision", JSONObject.NULL)
                .put("workoutDates", JSONArray()))
        }
        return respond {
            val context = loadContext()
            val dates = context.resources.flatMap { it.sessions }
                .mapNotNull { it.optString("date").takeIf(String::isNotBlank) }
                .distinct().sorted()
            ok(JSONObject()
                .put("writable", true)
                .put("reason", JSONObject.NULL)
                .put("remoteAvailable", true)
                .put("source", "remote")
                .put("revision", context.head)
                .put("workoutDates", JSONArray(dates)))
        }
    }

    fun dateResponse(date: String): SyncResponse = respond {
        if (!isDate(date)) throw AfException("WORKOUT_VALIDATION_FAILED", "Workout date is invalid.")
        val context = loadContext()
        val sessions = JSONArray()
        context.resources.flatMap { it.sessions }
            .filter { it.optString("date") == date }
            .sortedBy { it.optString("session_id") }
            .forEach { source -> sessions.put(projectSession(source, context.catalog)) }
        val revisions = JSONObject()
        context.resources.filter { resource -> resource.sessions.any { it.optString("date") == date } }
            .forEach { revisions.put(it.path, it.revision) }
        ok(JSONObject()
            .put("date", date)
            .put("sessions", sessions)
            .put("gyms", options(context.catalog.gyms))
            .put("machines", options(context.catalog.machines))
            .put("expectedContext", encodeContext(context.head, revisions)))
    }

    fun createResponse(body: String): SyncResponse = mutate("Create", null, body)
    fun updateResponse(sessionId: String, body: String): SyncResponse = mutate("Update", sessionId, body)
    fun deleteResponse(sessionId: String, body: String): SyncResponse = mutate("Delete", sessionId, body)

    private fun mutate(operation: String, sessionId: String?, body: String): SyncResponse = respond {
        val request = JSONObject(body.ifBlank { "{}" })
        val expected = decodeContext(request.optString("expectedContext"))
            ?: throw AfException("WORKOUT_SESSION_CONFLICT", "Workout session must be reloaded before saving.")
        val context = loadContext()
        if (expected.optString("headRevision") != context.head) {
            throw AfException("WORKOUT_REPOSITORY_CONFLICT", "Workout data changed. Reload before saving.")
        }
        val location = sessionId?.let { findSession(context.resources, it) }
        if (sessionId != null && location == null) throw AfException("WORKOUT_SESSION_NOT_FOUND", "Workout session was not found.")
        val input = request.optJSONObject("session")
        val date = if (operation == "Delete") location!!.session.optString("date") else input?.optString("date").orEmpty()
        verifyExpectedRevisions(expected.optJSONObject("resourceRevisions") ?: JSONObject(), context.resources, date)

        if (operation != "Delete") {
            val fieldErrors = validate(input, location?.session, context.catalog, operation == "Create")
            if (fieldErrors.length() > 0) {
                val referenceInvalid = (0 until fieldErrors.length()).any {
                    fieldErrors.getJSONObject(it).optString("message") == "マスターデータに存在しません"
                }
                return@respond failure(
                    400,
                    if (referenceInvalid) "WORKOUT_REFERENCE_INVALID" else "WORKOUT_VALIDATION_FAILED",
                    "Workout validation failed.",
                    JSONObject().put("result", JSONObject.NULL).put("fieldErrors", fieldErrors)
                )
            }
        }

        val changes = mutableListOf<Change>()
        val resultSessionId = when (operation) {
            "Create" -> createMutation(context, input!!, changes)
            "Update" -> {
                updateMutation(context, location!!, input!!, changes)
                sessionId
            }
            else -> {
                deleteMutation(context, location!!, changes)
                sessionId
            }
        }
        validateCandidate(context)
        val commitRevision = commit(context.configuration, context.head, "$operation: Workout Log - ${date.replace('-', '/')}", changes)
        val reflection = reflect(context.configuration, commitRevision)
        val result = JSONObject()
            .put("operation", operation.lowercase())
            .put("sessionId", resultSessionId ?: JSONObject.NULL)
            .put("date", date)
            .put("commitRevision", commitRevision)
            .put("reflection", reflection)
        val errors = if (reflection.optBoolean("succeeded")) JSONArray() else errors("WORKOUT_REFLECTION_FAILED", "Workout data was saved, but runtime reflection failed.")
        response(200, true, errors, reflection.optJSONArray("warnings") ?: JSONArray(), JSONObject().put("result", result).put("fieldErrors", JSONArray()))
    }

    private fun loadContext(): Context {
        if (configurationStatus() != "available" || credentialState() != "available") throw AfException("WORKOUT_WRITE_UNAVAILABLE", "Workout write is unavailable.")
        val configuration = JSONObject(loadConfigurationJson())
        val before = githubClient.readBranchHead(configuration)
        val fetched = resourceFetcher.fetchAll(configuration)
        val after = githubClient.readBranchHead(configuration)
        if (before != after) throw AfException("WORKOUT_REPOSITORY_CONFLICT", "Workout data changed while loading.")
        val machine = fetched.machineMaster ?: throw AfException("WORKOUT_WRITE_UNAVAILABLE", "Machine master is unavailable.")
        val gym = fetched.gymMaster ?: throw AfException("WORKOUT_WRITE_UNAVAILABLE", "Gym master is unavailable.")
        val resources = fetched.workoutFiles.map(::parseResource).toMutableList()
        val catalog = Catalog(
            parseMaster(gym.content, "gyms", "gym_id"),
            parseMaster(machine.content, "machines", "machine_id"),
            MasterDocument("MACHINE_MASTER", machine.path, machine.revision ?: contentRevision(machine.content), machine.content),
            MasterDocument("GYM_MASTER", gym.path, gym.revision ?: contentRevision(gym.content), gym.content)
        )
        return Context(configuration, after, resources, catalog)
    }

    private fun parseResource(file: RuntimeSourceFile): Resource {
        try {
            val jsonl = file.path.endsWith(".jsonl", ignoreCase = true)
            val sessions = if (jsonl) file.content.split("\r\n", "\n").filter(String::isNotBlank).map(::JSONObject) else listOf(JSONObject(file.content))
            if (sessions.isEmpty()) throw IllegalArgumentException()
            return Resource(file.path, file.revision ?: contentRevision(file.content), jsonl, sessions.toMutableList())
        } catch (_: Exception) {
            throw AfException("WORKOUT_VALIDATION_FAILED", "${file.path}: Workout resource is invalid.")
        }
    }

    private fun parseMaster(content: String, arrayName: String, idName: String): Map<String, MasterEntry> {
        val result = linkedMapOf<String, MasterEntry>()
        val items = JSONObject(content).getJSONArray(arrayName)
        for (index in 0 until items.length()) {
            val item = items.getJSONObject(index)
            val id = item.getString(idName)
            val entry = MasterEntry(id, item.optString("name", id), item.optBoolean("active"), item.optBoolean("deleted"))
            result[id] = entry
            val sourceIds = item.optJSONArray("source_ids") ?: JSONArray()
            for (sourceIndex in 0 until sourceIds.length()) result[sourceIds.getString(sourceIndex)] = entry
        }
        return result
    }

    private fun projectSession(source: JSONObject, catalog: Catalog): JSONObject {
        val machines = JSONArray()
        val warnings = JSONArray()
        addReferenceWarning("gymId", source.optString("gym_id"), catalog.gyms, warnings)
        val sourceMachines = source.optJSONArray("machines") ?: JSONArray()
        for (machineIndex in 0 until sourceMachines.length()) {
            val machine = sourceMachines.getJSONObject(machineIndex)
            addReferenceWarning("machines[$machineIndex].machineId", machine.optString("machine_id"), catalog.machines, warnings)
            val sets = JSONArray()
            val sourceSets = machine.optJSONArray("sets") ?: JSONArray()
            for (setIndex in 0 until sourceSets.length()) {
                val set = sourceSets.getJSONObject(setIndex)
                sets.put(JSONObject()
                    .put("sourceIndex", setIndex)
                    .put("reps", set.opt("reps"))
                    .put("weightKg", set.opt("weight_kg"))
                    .put("notes", set.optString("note").takeIf(String::isNotEmpty) ?: JSONObject.NULL))
            }
            machines.put(JSONObject().put("sourceIndex", machineIndex).put("machineId", machine.optString("machine_id")).put("sets", sets).put("notes", projectNotes(machine)))
        }
        return JSONObject()
            .put("sessionId", source.optString("session_id"))
            .put("session", JSONObject()
                .put("date", source.optString("date"))
                .put("gymId", source.optString("gym_id"))
                .put("machines", machines)
                .put("notes", projectNotes(source)))
            .put("warnings", warnings)
    }

    private fun validate(input: JSONObject?, source: JSONObject?, catalog: Catalog, create: Boolean): JSONArray {
        val fields = JSONArray()
        if (input == null) {
            fields.put(field("session", "必須項目です"))
            return fields
        }
        val date = input.optString("date")
        if (!isDate(date)) fields.put(field("date", "必須項目です"))
        else if (!create && source != null && date != source.optString("date")) fields.put(field("date", "日付は変更できません"))
        validateReference("gymId", input.optString("gymId"), source?.optString("gym_id"), catalog.gyms, create, fields)
        val machines = input.optJSONArray("machines") ?: JSONArray()
        if (machines.length() !in 1..10) fields.put(field("machines", "マシンは1件以上10件以下にしてください"))
        val selected = mutableSetOf<String>()
        val usedSourceMachines = mutableSetOf<Int>()
        val sourceMachines = source?.optJSONArray("machines")
        for (machineIndex in 0 until machines.length()) {
            val machine = machines.getJSONObject(machineIndex)
            val path = "machines[$machineIndex]"
            val sourceIndex = machine.optInt("sourceIndex", -1)
            if (sourceIndex >= 0 && !usedSourceMachines.add(sourceIndex)) fields.put(field(path, "入力内容が不正です"))
            val sourceMachine = sourceMachines?.optJSONObject(sourceIndex)
            val machineId = machine.optString("machineId")
            validateReference("$path.machineId", machineId, sourceMachine?.optString("machine_id"), catalog.machines, create || sourceMachine == null, fields)
            if (machine.has("notes")) validateNotes("$path.notes", nullableString(machine, "notes"), sourceMachine?.let(::projectNotes), fields)
            if (machineId.isNotBlank() && !selected.add(machineId)) fields.put(field("$path.machineId", "同じマシンは選択できません"))
            val sets = machine.optJSONArray("sets") ?: JSONArray()
            if (sets.length() !in 1..10) fields.put(field("$path.sets", "セットは1件以上10件以下にしてください"))
            val sourceSets = sourceMachine?.optJSONArray("sets")
            val usedSourceSets = mutableSetOf<Int>()
            for (setIndex in 0 until sets.length()) {
                val set = sets.getJSONObject(setIndex)
                val setPath = "$path.sets[$setIndex]"
                val sourceSetIndex = set.optInt("sourceIndex", -1)
                if (sourceSetIndex >= 0 && !usedSourceSets.add(sourceSetIndex)) fields.put(field(setPath, "入力内容が不正です"))
                val reps = set.opt("reps")
                when {
                    reps == null || reps == JSONObject.NULL -> fields.put(field("$setPath.reps", "必須項目です"))
                    reps !is Number -> fields.put(field("$setPath.reps", "数字を入力してください"))
                    reps.toDouble() % 1.0 != 0.0 || reps.toDouble() < 1 -> fields.put(field("$setPath.reps", "1以上の整数を入力してください"))
                    reps.toDouble() > 100 -> fields.put(field("$setPath.reps", "100以下の数値を入力してください"))
                }
                val weight = set.opt("weightKg")
                when {
                    weight == null || weight == JSONObject.NULL -> fields.put(field("$setPath.weightKg", "必須項目です"))
                    weight !is Number -> fields.put(field("$setPath.weightKg", "数字を入力してください"))
                    weight.toDouble() < 0 -> fields.put(field("$setPath.weightKg", "数字を入力してください"))
                    weight.toDouble() > 999.99 -> fields.put(field("$setPath.weightKg", "999.99以下の数値を入力してください"))
                    weight.toString().substringAfter('.', "").length > 2 -> fields.put(field("$setPath.weightKg", "少数は2桁までです"))
                }
                val originalSet = sourceSets?.optJSONObject(sourceSetIndex)
                validateNotes("$setPath.notes", nullableString(set, "notes"), originalSet?.optString("note"), fields)
            }
        }
        validateNotes("notes", nullableString(input, "notes"), source?.let(::projectNotes), fields)
        return fields
    }

    private fun validateReference(path: String, value: String?, sourceValue: String?, entries: Map<String, MasterEntry>, requireCurrent: Boolean, fields: JSONArray) {
        if (value.isNullOrBlank()) {
            fields.put(field(path, "必須項目です"))
        } else if ((requireCurrent || value != sourceValue) && entries[value]?.let { it.active && !it.deleted } != true) {
            fields.put(field(path, "マスターデータに存在しません"))
        }
    }

    private fun validateNotes(path: String, value: String?, sourceValue: String?, fields: JSONArray) {
        if ((value?.length ?: 0) > 400 && value.orEmpty() != sourceValue.orEmpty()) fields.put(field(path, "400字以内に入力してください"))
    }

    private fun createMutation(context: Context, input: JSONObject, changes: MutableList<Change>): String {
        val date = input.getString("date")
        val sessionId = "$date-${UUID.randomUUID().toString().replace("-", "")}"
        val created = reconstruct(null, sessionId, input)
        val targets = context.resources.filter { resource -> resource.sessions.any { it.optString("date") == date } }
        if (targets.size > 1) throw AfException("WORKOUT_RESOURCE_CONFLICT", "Multiple resources contain the selected Workout date.")
        if (targets.isEmpty()) {
            val path = datePath(context.configuration, date, "json")
            val content = serialize(false, listOf(created))
            changes.add(Change(path, content))
            context.resources.add(Resource(path, contentRevision(content), false, mutableListOf(created)))
        } else {
            val target = targets.single()
            if (target.jsonl) {
                target.sessions.add(created)
                changes.add(Change(target.path, serialize(true, target.sessions)))
            } else {
                val newPath = datePath(context.configuration, date, "jsonl")
                if (context.resources.any { it.path == newPath }) throw AfException("WORKOUT_RESOURCE_CONFLICT", "Workout JSONL destination already exists.")
                changes.add(Change(target.path, null))
                val sessions = target.sessions.plus(created).toMutableList()
                val content = serialize(true, sessions)
                changes.add(Change(newPath, content))
                context.resources.remove(target)
                context.resources.add(Resource(newPath, contentRevision(content), true, sessions))
            }
        }
        return sessionId
    }

    private fun updateMutation(context: Context, location: Location, input: JSONObject, changes: MutableList<Change>) {
        location.resource.sessions[location.index] = reconstruct(location.session, location.session.getString("session_id"), input)
        changes.add(Change(location.resource.path, serialize(location.resource.jsonl, location.resource.sessions)))
    }

    private fun deleteMutation(context: Context, location: Location, changes: MutableList<Change>) {
        location.resource.sessions.removeAt(location.index)
        if (location.resource.sessions.isEmpty()) {
            changes.add(Change(location.resource.path, null))
            context.resources.remove(location.resource)
        } else {
            changes.add(Change(location.resource.path, serialize(location.resource.jsonl, location.resource.sessions)))
        }
    }

    private fun reconstruct(source: JSONObject?, sessionId: String, input: JSONObject): JSONObject {
        val result = source?.let { JSONObject(it.toString()) } ?: JSONObject()
            .put("schema_version", 1).put("session_id", sessionId).put("status", "complete")
        result.put("date", input.getString("date")).put("gym_id", input.getString("gymId"))
        val sourceMachines = source?.optJSONArray("machines")
        val machines = JSONArray()
        val inputs = input.getJSONArray("machines")
        for (machineIndex in 0 until inputs.length()) {
            val machineInput = inputs.getJSONObject(machineIndex)
            val original = sourceMachines?.optJSONObject(machineInput.optInt("sourceIndex", -1))
            val machine = original?.let { JSONObject(it.toString()) } ?: JSONObject()
            machine.put("machine_id", machineInput.getString("machineId"))
            // 未編集なら元の配列を保持し、旧クライアントの項目省略も許容する。
            if (machineInput.has("notes") && nullableString(machineInput, "notes").orEmpty() != projectNotes(machine)) {
                val notes = nullableString(machineInput, "notes").orEmpty().split("\r\n", "\n").filter(String::isNotEmpty)
                if (notes.isEmpty()) machine.remove("notes") else machine.put("notes", JSONArray(notes))
            }
            val originalSets = original?.optJSONArray("sets")
            val sets = JSONArray()
            val setInputs = machineInput.getJSONArray("sets")
            for (setIndex in 0 until setInputs.length()) {
                val setInput = setInputs.getJSONObject(setIndex)
                val set = originalSets?.optJSONObject(setInput.optInt("sourceIndex", -1))?.let { JSONObject(it.toString()) } ?: JSONObject()
                set.put("set", setIndex + 1).put("reps", setInput.getInt("reps")).put("weight_kg", setInput.getDouble("weightKg"))
                nullableString(setInput, "notes")?.takeIf(String::isNotEmpty)?.let { set.put("note", it) } ?: set.remove("note")
                sets.put(set)
            }
            machine.put("sets", sets)
            machines.put(machine)
        }
        result.put("machines", machines)
        val notes = nullableString(input, "notes").orEmpty().split("\r\n", "\n").filter(String::isNotEmpty)
        if (notes.isEmpty()) result.remove("notes") else result.put("notes", JSONArray(notes))
        return result
    }

    private fun validateCandidate(context: Context) {
        val files = context.resources.map { RuntimeSourceFile(it.path, serialize(it.jsonl, it.sessions)) }
        val build = runtimeBuilder.buildRuntimeDataPayload(files, context.catalog.machineDocument, context.catalog.gymDocument)
        if (build.payload == null || build.errors.length() > 0) throw AfException("WORKOUT_VALIDATION_FAILED", "Affected Workout resource is invalid.")
        val ids = context.resources.flatMap { it.sessions }.map { it.optString("session_id") }
        if (ids.size != ids.distinct().size) throw AfException("WORKOUT_VALIDATION_FAILED", "Duplicate session_id is not allowed.")
    }

    private fun commit(configuration: JSONObject, expectedHead: String, message: String, changes: List<Change>): String {
        if (githubClient.readBranchHead(configuration) != expectedHead) throw AfException("WORKOUT_REPOSITORY_CONFLICT", "Remote repository changed before Workout commit.")
        val repository = configuration.getJSONObject("repository")
        val additions = JSONArray()
        val deletions = JSONArray()
        changes.forEach { change ->
            if (change.content == null) deletions.put(JSONObject().put("path", change.path))
            else additions.put(JSONObject().put("path", change.path).put("contents", Base64.encodeToString(change.content.toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP)))
        }
        val input = JSONObject()
            .put("branch", JSONObject()
                .put("repositoryNameWithOwner", "${repository.optString("owner").trim()}/${repository.optString("repository").trim()}")
                .put("branchName", androidNormalizeGitBranchRef(repository.optString("ref", "main")).removePrefix("heads/")))
            .put("expectedHeadOid", expectedHead)
            .put("message", JSONObject().put("headline", message))
            .put("fileChanges", JSONObject().put("additions", additions).put("deletions", deletions))
        val payload = JSONObject()
            .put("query", "mutation(\$input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: \$input) { commit { oid } } }")
            .put("variables", JSONObject().put("input", input)).toString()
        val response = try {
            githubClient.postWorkoutMutationGraphql(configuration, payload)
        } catch (_: WorkoutMutationOutcomeUnknownException) {
            return reconcileCommit(configuration, expectedHead, message, changes)
        }
        val graphErrors = response.optJSONArray("errors")
        if (graphErrors != null && graphErrors.length() > 0) {
            val first = graphErrors.optJSONObject(0)
            val messageText = first?.optString("message").orEmpty()
            if (first?.optString("type") == "STALE_DATA" || messageText.contains("Expected branch to point to", true)) {
                throw AfException("WORKOUT_REPOSITORY_CONFLICT", "Remote repository changed before Workout commit.")
            }
            throw AfException("WORKOUT_WRITE_FAILED", messageText.ifBlank { "Workout write failed." })
        }
        return response.optJSONObject("data")?.optJSONObject("createCommitOnBranch")?.optJSONObject("commit")?.optString("oid")
            ?.takeIf(String::isNotBlank) ?: reconcileCommit(configuration, expectedHead, message, changes)
    }

    private fun reconcileCommit(configuration: JSONObject, expectedHead: String, message: String, changes: List<Change>): String {
        val result = githubClient.reconcileWorkoutCommit(
            configuration,
            expectedHead,
            message,
            changes.map { WorkoutRepositoryChange(it.path, it.content) }
        )
        return when (result.state) {
            WorkoutCommitReconciliationState.COMMITTED -> result.revision
                ?: throw AfException("WORKOUT_WRITE_RESULT_AMBIGUOUS", "GitHub write result is ambiguous.")
            WorkoutCommitReconciliationState.NOT_COMMITTED ->
                throw AfException("WORKOUT_WRITE_FAILED", "Workout commit was not applied to the repository branch.")
            WorkoutCommitReconciliationState.UNKNOWN ->
                throw AfException("WORKOUT_WRITE_RESULT_AMBIGUOUS", "GitHub write result is ambiguous.")
        }
    }

    private fun reflect(configuration: JSONObject, commitRevision: String): JSONObject {
        return try {
            val committed = JSONObject(configuration.toString())
            committed.getJSONObject("repository").put("ref", commitRevision)
            val fetched = resourceFetcher.fetchAll(committed)
            val machine = fetched.machineMaster ?: throw IllegalStateException("Machine master is unavailable.")
            val gym = fetched.gymMaster ?: throw IllegalStateException("Gym master is unavailable.")
            val build = runtimeBuilder.buildRuntimeDataPayload(
                fetched.workoutFiles,
                MasterDocument("MACHINE_MASTER", machine.path, machine.revision ?: contentRevision(machine.content), machine.content),
                MasterDocument("GYM_MASTER", gym.path, gym.revision ?: contentRevision(gym.content), gym.content)
            )
            if (build.payload == null) throw IllegalStateException("Runtime build failed.")
            val saveErrors = runtimeStore.saveAtomically(build.payload)
            if (saveErrors.length() > 0) throw IllegalStateException("Runtime save failed.")
            markReflectionSucceeded()
            JSONObject().put("succeeded", true).put("errors", JSONArray()).put("warnings", build.warnings)
        } catch (ex: Exception) {
            JSONObject().put("succeeded", false).put("errors", errors("WORKOUT_REFLECTION_FAILED", ex.message ?: "Runtime reflection failed.")).put("warnings", JSONArray())
        }
    }

    private fun findSession(resources: List<Resource>, sessionId: String): Location? {
        var found: Location? = null
        resources.forEach { resource -> resource.sessions.forEachIndexed { index, session ->
            if (session.optString("session_id") == sessionId) {
                if (found != null) throw AfException("WORKOUT_RESOURCE_CONFLICT", "Duplicate session_id is not allowed.")
                found = Location(resource, index, session)
            }
        } }
        return found
    }

    private fun verifyExpectedRevisions(expected: JSONObject, resources: List<Resource>, date: String) {
        val current = resources.filter { resource -> resource.sessions.any { it.optString("date") == date } }.associate { it.path to it.revision }
        if (expected.length() != current.size || current.any { expected.optString(it.key) != it.value }) throw AfException("WORKOUT_RESOURCE_CONFLICT", "Workout resource changed. Reload before saving.")
    }

    private fun options(entries: Map<String, MasterEntry>): JSONArray = JSONArray(entries.values.distinctBy { it.id }
        .filter { it.active && !it.deleted }.sortedBy { it.name }.map {
            JSONObject().put("id", it.id).put("name", it.name).put("active", it.active).put("deleted", it.deleted)
        })

    private fun addReferenceWarning(path: String, id: String, entries: Map<String, MasterEntry>, warnings: JSONArray) {
        if (entries[id]?.let { it.active && !it.deleted } != true) warnings.put(JSONObject()
            .put("path", path)
            .put("message", "現在のマスターデータでは選択できない値です。変更しない場合はそのまま保存できます。"))
    }

    private fun projectNotes(source: JSONObject): String {
        val notes = source.optJSONArray("notes") ?: return ""
        return (0 until notes.length()).map { notes.optString(it) }.joinToString("\n")
    }

    private fun serialize(jsonl: Boolean, sessions: List<JSONObject>): String = if (jsonl) {
        sessions.joinToString("\n") { it.toString() } + "\n"
    } else sessions.single().toString(2) + "\n"

    private fun datePath(configuration: JSONObject, date: String, extension: String): String {
        val repository = configuration.getJSONObject("repository")
        val resources = configuration.getJSONArray("resources")
        val workout = (0 until resources.length()).map { resources.getJSONObject(it) }.first { it.optString("type") == "WORKOUT" }
        return listOf(repository.optString("rootPath"), workout.optString("path"), date.substring(0, 4), date.substring(5, 7), "$date.$extension")
            .map { it.replace('\\', '/').trim('/') }.filter(String::isNotEmpty).joinToString("/")
    }

    private fun encodeContext(head: String, revisions: JSONObject): String = Base64.encodeToString(
        JSONObject().put("headRevision", head).put("resourceRevisions", revisions).toString().toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP)

    private fun decodeContext(value: String): JSONObject? = runCatching {
        JSONObject(String(Base64.decode(value, Base64.DEFAULT), StandardCharsets.UTF_8))
    }.getOrNull()

    private fun nullableString(value: JSONObject, name: String): String? = if (!value.has(name) || value.isNull(name)) null else value.optString(name)
    private fun field(path: String, message: String) = JSONObject().put("path", path).put("message", message)
    private fun isDate(value: String): Boolean = runCatching { LocalDate.parse(value).toString() == value }.getOrDefault(false)
    private fun contentRevision(content: String): String = "content-sha256-" + MessageDigest.getInstance("SHA-256")
        .digest(content.toByteArray(StandardCharsets.UTF_8)).joinToString("") { "%02x".format(it) }

    private fun respond(block: () -> SyncResponse): SyncResponse = try { block() } catch (ex: AfException) {
        failure(status(ex.code), ex.code, ex.message)
    } catch (_: Exception) {
        failure(500, "WORKOUT_WRITE_FAILED", "Workout write failed.")
    }

    private fun ok(data: JSONObject) = response(200, true, JSONArray(), JSONArray(), data)
    private fun failure(status: Int, code: String, message: String, data: JSONObject? = null) = response(status, false, errors(code, message), JSONArray(), data)
    private fun response(status: Int, success: Boolean, errors: JSONArray, warnings: JSONArray, data: JSONObject?): SyncResponse = SyncResponse(
        status,
        JSONObject().put("success", success).put("errors", errors).put("warnings", warnings).put("data", data ?: JSONObject.NULL).toString(),
        success
    )
    private fun errors(code: String, message: String) = JSONArray().put(JSONObject().put("code", code).put("message", message).put("recoverable", true))
    private fun status(code: String): Int = when (code) {
        "WORKOUT_SESSION_NOT_FOUND" -> 404
        "WORKOUT_SESSION_CONFLICT", "WORKOUT_RESOURCE_CONFLICT", "WORKOUT_REPOSITORY_CONFLICT" -> 409
        "WORKOUT_VALIDATION_FAILED", "WORKOUT_REFERENCE_INVALID" -> 400
        "GITHUB_UNAUTHORIZED" -> 401
        "GITHUB_FORBIDDEN" -> 403
        "GITHUB_RATE_LIMIT" -> 429
        else -> 503
    }
}
