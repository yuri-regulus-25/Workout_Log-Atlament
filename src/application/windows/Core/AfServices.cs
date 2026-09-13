using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using Atlament.Core.Write;

namespace Atlament.Core;

/// <summary>
/// Windows AF の Application orchestration ルート。
/// </summary>
/// <remarks>
/// HTTP layer から呼び出されるユースケースを束ね、Configuration、Credential、GitHub I/O、
/// Runtime build、Recovery、Master write の各サービスを契約どおりの AF response envelope と
/// HTTP status に変換する。ここでは永続化形式や Runtime 正規化の詳細を所有せず、
/// 操作順序、並行実行制御、Status facts の整合性を守る。
/// </remarks>
public sealed class AtlamentApplication
{
    private static readonly IReadOnlyList<MasterWriteTarget> MasterWriteTargets = new[]
    {
        new MasterWriteTarget("MACHINE_MASTER", "master/machines.json", "file", true),
        new MasterWriteTarget("GYM_MASTER", "master/gyms.json", "file", true)
    };

    private static readonly string ApplicationFrameworkVersion =
        typeof(AtlamentApplication).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
        ?? typeof(AtlamentApplication).Assembly.GetName().Version?.ToString()
        ?? "unknown";

    private static readonly BuildIdentity ApplicationBuildIdentity =
#if DEBUG
        new("Debug", true);
#else
        new("Release", false);
#endif

    private readonly ConfigurationStore _configurationStore;
    private readonly CredentialStore _credentialStore;
    private readonly RuntimeDataStore _runtimeDataStore;
    private readonly RuntimeDataBuilder _runtimeDataBuilder;
    private readonly GithubAccessService _github;
    private readonly HostingStatusService _hosting;
    private readonly AfLog _log;
    private readonly RecoveryService? _recovery;
    private readonly Service _workoutWrite;
    private readonly OperationGate _operations = new();
    private AfConfiguration _configuration = AfConfiguration.Default;
    private CredentialStatus _credentialStatus = new(false, CredentialState.missing.ToString(), null);
    private string? _token;
    private ComponentStatus _configurationStatus = ComponentStatus.unknown;
    private ComponentStatus _credentialComponentStatus = ComponentStatus.unknown;
    private ComponentStatus _githubStatus = ComponentStatus.unknown;
    private ComponentStatus _runtimeStatus = ComponentStatus.unknown;
    private ApplicationStatus _applicationStatus = ApplicationStatus.starting;
    private string _latestRemoteRetrieval = "unknown";
    private string _latestValidation = "unknown";
    private readonly List<string> _requiredActions = new();

    public AtlamentApplication(
        ConfigurationStore configurationStore,
        CredentialStore credentialStore,
        RuntimeDataStore runtimeDataStore,
        RuntimeDataBuilder runtimeDataBuilder,
        GithubAccessService github,
        HostingStatusService hosting,
        AfLog log,
        RecoveryService? recovery = null,
        Service? workoutWrite = null)
    {
        _configurationStore = configurationStore;
        _credentialStore = credentialStore;
        _runtimeDataStore = runtimeDataStore;
        _runtimeDataBuilder = runtimeDataBuilder;
        _github = github;
        _hosting = hosting;
        _log = log;
        _recovery = recovery;
        _workoutWrite = workoutWrite ?? new Service(github, runtimeDataBuilder, new Repository(), new Reflection(github, runtimeDataBuilder, runtimeDataStore));
    }

    /// <summary>
    /// 起動時のローカル状態を読み込み、初回同期をバックグラウンドで開始する。
    /// </summary>
    /// <remarks>
    /// Shell の初回描画を同期完了まで待たせないことが契約である。
    /// Frontend は `/status` の operation/component facts を見て startup 中、degraded、
    /// unavailable を判定する。
    /// </remarks>
    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_operations.TryStart("startup")) return Task.CompletedTask;
        try
        {
            _log.Initialize();
            _runtimeDataStore.ClearTemporary();
            LoadConfiguration();
            LoadCredential();
            ValidateLocalRuntime();
            _applicationStatus = DetermineApplicationStatus();
            // Startup Sync is background work by design: the shell should open and let Frontend
            // reflect running/degraded state through Status API instead of blocking first paint.
            _ = Task.Run(() => StartupSyncAsync(), CancellationToken.None);
        }
        catch (Exception ex)
        {
            _log.Write(LogType.FATAL, "Startup failed: " + ex.Message);
            _applicationStatus = ApplicationStatus.failed;
            _operations.Complete("startup", false);
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// Frontend が platform 固有推測をせずに利用可否を判断するための Status snapshot を返す。
    /// </summary>
    public AfResponse<AfStatus> GetStatus() => AfResponses.Ok(new AfStatus(
        new StatusVersions(ApplicationFrameworkVersion, GetFrontendFrameworkVersion(), GetNativePackageVersions(), ApplicationBuildIdentity),
        DetermineReadiness(),
        DetermineRuntimeDataStatus(),
        DetermineRecoveryStatus(),
        new ApplicationState(_applicationStatus.ToString(), _applicationStatus == ApplicationStatus.degraded, _applicationStatus is not ApplicationStatus.stopping and not ApplicationStatus.failed),
        _operations.Snapshot(),
        new ComponentStateSnapshot(
            _configurationStatus.ToString(),
            _credentialComponentStatus.ToString(),
            _githubStatus.ToString(),
            _runtimeStatus.ToString(),
            _hosting.GetStatus()),
        _requiredActions.ToArray()));

    private RuntimeDataStatusFacts DetermineRuntimeDataStatus()
    {
        var (data, _) = _runtimeDataStore.LoadCurrent();
        var currentAvailable = data is not null && _runtimeStatus != ComponentStatus.unavailable;
        return new RuntimeDataStatusFacts(
            currentAvailable,
            data?.GeneratedAt,
            _latestRemoteRetrieval,
            _latestValidation,
            (_latestRemoteRetrieval == "failed" || _latestValidation == "failed") && currentAvailable,
            CountQuarantinedWorkoutResources(data));
    }

    private RecoveryStatusFacts DetermineRecoveryStatus()
    {
        var (data, _) = _runtimeDataStore.LoadCurrent();
        var brokenWorkoutCount = CountQuarantinedWorkoutResources(data);
        return new RecoveryStatusFacts(
            brokenWorkoutCount,
            brokenWorkoutCount,
            0,
            brokenWorkoutCount,
            _recovery?.CountActiveDrafts(_configuration) ?? 0);
    }

    private static int CountQuarantinedWorkoutResources(RuntimeDataFile? data)
    {
        if (data is null) return 0;
        return data.Errors
            .Select(error => error.Message.Split(':', 2)[0].Trim())
            .Where(path => path.EndsWith(".json", StringComparison.OrdinalIgnoreCase) || path.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.Ordinal)
            .Count();
    }

    private ApplicationReadiness DetermineReadiness()
    {
        var requiredActions = _requiredActions.Distinct(StringComparer.Ordinal).OrderBy(action => action, StringComparer.Ordinal).ToArray();
        if (requiredActions.Contains("CONFIGURATION_REQUIRED", StringComparer.Ordinal) ||
            requiredActions.Contains("CREDENTIAL_REQUIRED", StringComparer.Ordinal))
        {
            return new ApplicationReadiness(
                "unconfigured",
                requiredActions,
                UnavailableComponents(),
                DegradedComponents());
        }

        if (_applicationStatus is ApplicationStatus.failed or ApplicationStatus.stopping ||
            _runtimeStatus == ComponentStatus.unavailable)
        {
            return new ApplicationReadiness(
                "unavailable",
                requiredActions,
                UnavailableComponents(),
                DegradedComponents());
        }

        var unavailable = UnavailableComponents();
        var degraded = DegradedComponents();
        if (_applicationStatus == ApplicationStatus.degraded || degraded.Count > 0 || unavailable.Count > 0 || requiredActions.Length > 0)
        {
            return new ApplicationReadiness(
                "degraded",
                requiredActions,
                unavailable,
                degraded);
        }

        return new ApplicationReadiness("ready", requiredActions, Array.Empty<string>(), Array.Empty<string>());
    }

    private IReadOnlyList<string> UnavailableComponents()
    {
        var components = new List<string>();
        if (_configurationStatus == ComponentStatus.unavailable) components.Add("configuration");
        if (_credentialComponentStatus == ComponentStatus.unavailable) components.Add("credential");
        if (_runtimeStatus == ComponentStatus.unavailable) components.Add("runtimeData");
        return components;
    }

    private IReadOnlyList<string> DegradedComponents()
    {
        var components = new List<string>();
        if (_githubStatus == ComponentStatus.degraded) components.Add("github");
        if (_runtimeStatus == ComponentStatus.degraded) components.Add("runtimeData");
        return components;
    }

    private string GetFrontendFrameworkVersion()
    {
        var version = ReadVersionJson();
        return version?["frontend"]?.GetValue<string>() ?? "unknown";
    }

    private NativePackageVersions GetNativePackageVersions()
    {
        var version = ReadVersionJson();
        return new NativePackageVersions(
            new WindowsPackageVersion(version?["windows"]?.GetValue<string>() ?? ApplicationFrameworkVersion),
            new AndroidPackageVersion(
                version?["android"]?["versionName"]?.GetValue<string>() ?? "unknown",
                version?["android"]?["versionCode"]?.GetValue<int>() ?? 0));
    }

    private JsonNode? ReadVersionJson()
    {
        try
        {
            var versionFile = _hosting.TryResolveFile("/version.json", out _);
            if (versionFile is null) return null;
            using var stream = _hosting.OpenRead(versionFile);
            return JsonNode.Parse(stream);
        }
        catch
        {
            return null;
        }
    }

    private static int MapMasterWriteStatusCode(IReadOnlyList<AfError> errors)
    {
        var code = errors.FirstOrDefault()?.Code;
        return code switch
        {
            AfErrorCodes.MasterWriteConflict => 409,
            AfErrorCodes.MasterSyncRequired => 409,
            AfErrorCodes.MasterWriteInvalid => 400,
            AfErrorCodes.CredentialRequired or AfErrorCodes.GithubUnauthorized => 401,
            AfErrorCodes.GithubForbidden => 403,
            AfErrorCodes.GithubResourceNotFound => 404,
            AfErrorCodes.GithubRateLimit => 429,
            AfErrorCodes.GithubTimeout or AfErrorCodes.GithubConnectionFailed => 503,
            _ => 500
        };
    }

    private static int RecoveryStatusCode(IReadOnlyList<AfError> errors)
    {
        var code = errors.FirstOrDefault()?.Code;
        return code switch
        {
            AfErrorCodes.RecoveryResourceNotFound => 404,
            AfErrorCodes.RecoverySourceViewTooLarge => 413,
            AfErrorCodes.RecoveryResourceNotBroken or
            AfErrorCodes.RecoveryDraftRequired or
            AfErrorCodes.RecoveryDraftConflict or
            AfErrorCodes.RecoveryDraftStale or
            AfErrorCodes.RecoveryDraftIncompatible or
            AfErrorCodes.RecoveryDraftCorrupted or
            AfErrorCodes.RecoveryValidationFailed or
            AfErrorCodes.RecoveryWriteConflict => 409,
            AfErrorCodes.RecoveryUnavailable => 503,
            AfErrorCodes.RecoveryWriteFailed => 503,
            AfErrorCodes.ConfigRequired or AfErrorCodes.ConfigInvalid => 400,
            _ => MapMasterWriteStatusCode(errors)
        };
    }

    /// <summary>
    /// 現在採用済みの Runtime Data を返す。
    /// </summary>
    /// <remarks>
    /// 未解決 Master reference は warnings として返し、Workout 自体は Runtime Data に残す。
    /// Runtime Data が存在しない場合だけ data unavailable として失敗させる。
    /// </remarks>
    public AfResponse<RuntimeWorkoutData> GetRuntimeWorkouts()
    {
        var (data, errors) = _runtimeDataStore.LoadCurrent();
        if (data is null)
        {
            return AfResponses.Fail<RuntimeWorkoutData>(errors.First());
        }

        return AfResponses.Ok(new RuntimeWorkoutData(data.Sessions, data.MasterDocuments), data.Errors, data.Warnings ?? Array.Empty<RuntimeWarning>());
    }

    public AfResponse<AfConfiguration> GetConfiguration() => AfResponses.Ok(_configuration);

    public Task<(int StatusCode, AfResponse<Boundary> Response)> GetWorkoutWriteBoundaryAsync(CancellationToken cancellationToken) =>
        _workoutWrite.GetBoundaryAsync(
            _configuration,
            _token,
            _configurationStatus == ComponentStatus.available,
            _credentialStatus.State == CredentialState.available.ToString(),
            DetermineRuntimeDataStatus().FallbackActive,
            cancellationToken);

    public Task<(int StatusCode, AfResponse<DateSnapshot> Response)> GetWorkoutWriteDateAsync(string date, CancellationToken cancellationToken) =>
        _workoutWrite.GetDateAsync(_configuration, _token, date, cancellationToken);

    public Task<(int StatusCode, AfResponse<MutationOutcome> Response)> CreateWorkoutSessionAsync(CreateRequest request, CancellationToken cancellationToken) =>
        _workoutWrite.CreateAsync(_configuration, _token, request, cancellationToken);

    public Task<(int StatusCode, AfResponse<MutationOutcome> Response)> UpdateWorkoutSessionAsync(string sessionId, UpdateRequest request, CancellationToken cancellationToken) =>
        _workoutWrite.UpdateAsync(_configuration, _token, sessionId, request, cancellationToken);

    public Task<(int StatusCode, AfResponse<MutationOutcome> Response)> DeleteWorkoutSessionAsync(string sessionId, DeleteRequest request, CancellationToken cancellationToken) =>
        _workoutWrite.DeleteAsync(_configuration, _token, sessionId, request, cancellationToken);

    /// <summary>
    /// Settings からの部分 Configuration 更新を適用する。
    /// </summary>
    /// <remarks>
    /// repository/resources の変更時だけ remote check を行う。未指定項目は現行値を維持し、
    /// 独立した Settings card の保存が他領域を初期化しないようにする。
    /// </remarks>
    public async Task<(int StatusCode, AfResponse<ConfigurationUpdateResult> Response)> UpdateConfigurationAsync(ConfigurationUpdate update, CancellationToken cancellationToken)
    {
        if (!_operations.TryStart("configurationUpdate"))
        {
            return (409, AfResponses.Fail<ConfigurationUpdateResult>(new AfError(AfErrorCodes.OperationAlreadyRunning, "Configuration update is already running.", true)));
        }

        try
        {
            var next = MergeConfiguration(_configuration, update);
            var errors = _configurationStore.Save(next);
            if (errors.Count > 0)
            {
                _operations.Complete("configurationUpdate", false);
                return (400, new AfResponse<ConfigurationUpdateResult>(false, errors, null));
            }

            var remoteChanged = update.Repository is not null || update.Resources is not null;
            _configuration = next;
            _configurationStatus = ComponentStatus.available;
            _requiredActions.RemoveAll(action => action == "CONFIGURATION_REQUIRED");
            var responseErrors = new List<AfError>();
            if (remoteChanged)
            {
                responseErrors.AddRange(await _github.CheckAsync(_configuration, _token, cancellationToken));
                _githubStatus = responseErrors.Count == 0 ? ComponentStatus.available : ComponentStatus.degraded;
            }

            _applicationStatus = DetermineApplicationStatus();
            _operations.Complete("configurationUpdate", true);
            return (200, AfResponses.Ok(new ConfigurationUpdateResult(remoteChanged), responseErrors));
        }
        catch
        {
            _operations.Complete("configurationUpdate", false);
            return (500, AfResponses.Fail<ConfigurationUpdateResult>(new AfError(AfErrorCodes.CommonInternalError, "Configuration update failed.", true)));
        }
    }

    public AfResponse<CredentialStatus> GetCredentialStatus() => AfResponses.Ok(_credentialStatus);

    /// <summary>
    /// Master write が許可する固定 target と security facts を返す。
    /// </summary>
    /// <remarks>
    /// target path は Configuration の任意 path ではなく AF 内部 allowlist を正とする。
    /// Frontend には Raw JSON write、Workout write、汎用 Git write を許可しない。
    /// </remarks>
    public AfResponse<MasterWriteBoundary> GetMasterWriteBoundary()
    {
        var repositoryConfigured =
            !string.IsNullOrWhiteSpace(_configuration.Repository.Owner) &&
            !string.IsNullOrWhiteSpace(_configuration.Repository.Repository) &&
            !string.IsNullOrWhiteSpace(_configuration.Repository.Ref);
        var configuredTargetKeys = _configuration.Resources
            .Where(resource => resource.ResourceKind == "file")
            .Select(resource => $"{resource.Type}:{resource.Path}")
            .ToHashSet(StringComparer.Ordinal);
        var allTargetsConfigured = MasterWriteTargets.All(target => configuredTargetKeys.Contains($"{target.Type}:{target.Path}"));
        var writeEnabled =
            _configurationStatus == ComponentStatus.available &&
            _credentialStatus.Configured &&
            _credentialStatus.State == CredentialState.available.ToString() &&
            repositoryConfigured &&
            allTargetsConfigured;

        return AfResponses.Ok(new MasterWriteBoundary(
            _configuration.Repository,
            MasterWriteTargets,
            new MasterWriteSecurity(
                _configurationStatus == ComponentStatus.available,
                _credentialStatus.Configured,
                _credentialStatus.State,
                repositoryConfigured,
                writeEnabled,
                false,
                false,
                false)));
    }

    public Task<(int StatusCode, AfResponse<MasterDocumentSnapshot> Response)> ReadMasterDocumentAsync(string type, CancellationToken cancellationToken)
    {
        var local = LoadLocalMasterDocuments();
        if (local.Documents is null)
        {
            return Task.FromResult((409, AfResponses.Fail<MasterDocumentSnapshot>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data must be synchronized before maintenance.", true))));
        }

        var document = SelectLocalMasterDocument(local.Documents, type);
        var result = document is null
            ? (400, AfResponses.Fail<MasterDocumentSnapshot>(new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true)))
            : (200, AfResponses.Ok(document));
        return Task.FromResult(result);
    }

    /// <summary>
    /// GitHub 上の current source から Broken Resource 一覧を検査して返す。
    /// </summary>
    public async Task<(int StatusCode, AfResponse<IReadOnlyList<BrokenResourceSummary>> Response)> ListRecoveryResourcesAsync(CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<IReadOnlyList<BrokenResourceSummary>>(false, context.Errors, null));
        }

        return (200, AfResponses.Ok(_recovery!.ListBrokenResources(_configuration, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!)));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryResourceDetail> Response)> GetRecoveryResourceAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryResourceDetail>(false, context.Errors, null));
        }

        var (detail, errors) = _recovery!.GetDetail(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0 || detail is null
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryResourceDetail>(false, errors, null))
            : (200, AfResponses.Ok(detail));
    }

    public async Task<(int StatusCode, AfResponse<RecoverySourceView> Response)> GetRecoverySourceAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoverySourceView>(false, context.Errors, null));
        }

        var (source, errors) = _recovery!.GetSource(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0 || source is null
            ? (RecoveryStatusCode(errors), new AfResponse<RecoverySourceView>(false, errors, null))
            : (200, AfResponses.Ok(source));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryDraftSnapshot> Response)> GetRecoveryDraftAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryDraftSnapshot>(false, context.Errors, null));
        }

        var (snapshot, errors) = _recovery!.GetDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryDraftSnapshot>(false, errors, null))
            : (200, AfResponses.Ok(snapshot));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryDraftSnapshot> Response)> CreateRecoveryDraftAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryDraftSnapshot>(false, context.Errors, null));
        }

        var (snapshot, errors) = _recovery!.CreateDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryDraftSnapshot>(false, errors, null))
            : (200, AfResponses.Ok(snapshot));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryDraftSnapshot> Response)> UpdateRecoveryDraftAsync(string resourceKey, RecoveryDraftUpdate update, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryDraftSnapshot>(false, context.Errors, null));
        }

        var (snapshot, errors) = _recovery!.UpdateDraft(_configuration, resourceKey, update, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryDraftSnapshot>(false, errors, null))
            : (200, AfResponses.Ok(snapshot));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryDraftSnapshot> Response)> DeleteRecoveryDraftAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryDraftSnapshot>(false, context.Errors, null));
        }

        var (snapshot, errors) = _recovery!.DeleteDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryDraftSnapshot>(false, errors, null))
            : (200, AfResponses.Ok(snapshot));
    }

    public async Task<(int StatusCode, AfResponse<RecoveryValidationResult> Response)> ValidateRecoveryDraftAsync(string resourceKey, CancellationToken cancellationToken)
    {
        var context = await LoadRecoveryContextAsync(cancellationToken);
        if (context.Errors.Count > 0)
        {
            return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryValidationResult>(false, context.Errors, null));
        }

        var (result, errors) = _recovery!.ValidateDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        return errors.Count > 0 || result is null
            ? (RecoveryStatusCode(errors), new AfResponse<RecoveryValidationResult>(false, errors, null))
            : (200, AfResponses.Ok(result));
    }

    /// <summary>
    /// 検証済み Recovery Draft を GitHub へ 1 Resource 単位で反映する。
    /// </summary>
    /// <remarks>
    /// Frontend は replacement content や任意 path を直接渡さない。
    /// source/draft revision の optimistic concurrency と最終 validation を通過した場合のみ
    /// Recovery write を行い、Git 成功後の Runtime reflection 失敗は Git 失敗とは区別して返す。
    /// </remarks>
    public async Task<(int StatusCode, AfResponse<RecoveryCommitResult> Response)> CommitRecoveryDraftAsync(
        string resourceKey,
        RecoveryCommitRequest request,
        CancellationToken cancellationToken)
    {
        if (!_operations.TryStart("recoveryCommit"))
        {
            return (409, AfResponses.Fail<RecoveryCommitResult>(new AfError(AfErrorCodes.OperationAlreadyRunning, "Recovery commit is already running.", true)));
        }

        try
        {
            if (string.IsNullOrWhiteSpace(request.ExpectedSourceRevision) || request.ExpectedDraftRevision is null)
            {
                _operations.Complete("recoveryCommit", false);
                return (400, AfResponses.Fail<RecoveryCommitResult>(new AfError(AfErrorCodes.RecoveryWriteFailed, "Recovery commit request is invalid.", true)));
            }

            var context = await LoadRecoveryContextAsync(cancellationToken);
            if (context.Errors.Count > 0)
            {
                _operations.Complete("recoveryCommit", false);
                return (RecoveryStatusCode(context.Errors), new AfResponse<RecoveryCommitResult>(false, context.Errors, null));
            }

            var (detail, detailErrors) = _recovery!.GetDetail(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
            if (detailErrors.Count > 0 || detail is null)
            {
                var staleSource = context.WorkoutFiles!.FirstOrDefault(file =>
                    _recovery.MatchesWorkoutResourceKey(_configuration, resourceKey, file, request.ExpectedSourceRevision!));
                if (staleSource is not null &&
                    !string.Equals(ResolveRuntimeSourceRevision(staleSource), request.ExpectedSourceRevision, StringComparison.Ordinal))
                {
                    var sourceConflictErrors = new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery source revision is stale.", true) };
                    _operations.Complete("recoveryCommit", false);
                    return (409, new AfResponse<RecoveryCommitResult>(false, sourceConflictErrors, null));
                }

                _operations.Complete("recoveryCommit", false);
                return (RecoveryStatusCode(detailErrors), new AfResponse<RecoveryCommitResult>(false, detailErrors, null));
            }

            if (!string.Equals(detail.Inspection.Revision, request.ExpectedSourceRevision, StringComparison.Ordinal))
            {
                var sourceConflictErrors = new[] { new AfError(AfErrorCodes.RecoveryWriteConflict, "Recovery source revision is stale.", true) };
                _operations.Complete("recoveryCommit", false);
                return (409, new AfResponse<RecoveryCommitResult>(false, sourceConflictErrors, null));
            }

            if (detail.Inspection.Health != "broken")
            {
                var notBrokenErrors = new[] { new AfError(AfErrorCodes.RecoveryResourceNotBroken, "Recovery target is not Broken.", true) };
                _operations.Complete("recoveryCommit", false);
                return (409, new AfResponse<RecoveryCommitResult>(false, notBrokenErrors, null));
            }

            var (draft, draftErrors) = _recovery.GetDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
            if (draftErrors.Count > 0 || draft.State != "active" || draft.Draft is null)
            {
                var draftUnavailableErrors = draftErrors.Count > 0 ? draftErrors : new[] { new AfError(AfErrorCodes.RecoveryDraftRequired, "Recovery Draft is required.", true) };
                _operations.Complete("recoveryCommit", false);
                return (RecoveryStatusCode(draftUnavailableErrors), new AfResponse<RecoveryCommitResult>(false, draftUnavailableErrors, null));
            }

            if (draft.Draft.DraftRevision != request.ExpectedDraftRevision)
            {
                var draftConflictErrors = new[] { new AfError(AfErrorCodes.RecoveryDraftConflict, "Recovery Draft was updated elsewhere.", true) };
                _operations.Complete("recoveryCommit", false);
                return (409, new AfResponse<RecoveryCommitResult>(false, draftConflictErrors, null));
            }

            var (validation, validationErrors) = _recovery.ValidateDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
            if (validationErrors.Count > 0 || validation is null)
            {
                _operations.Complete("recoveryCommit", false);
                return (RecoveryStatusCode(validationErrors), new AfResponse<RecoveryCommitResult>(false, validationErrors, null));
            }

            if (!validation.CommitAllowed || string.IsNullOrWhiteSpace(validation.ReplacementContent))
            {
                var invalidCandidateErrors = new[] { new AfError(AfErrorCodes.RecoveryValidationFailed, "Recovery candidate is not committable.", true) };
                _operations.Complete("recoveryCommit", false);
                return (409, new AfResponse<RecoveryCommitResult>(false, invalidCandidateErrors, null));
            }

            var push = await _github.PushRecoveryReplacementAsync(
                _configuration,
                _token,
                detail.Inspection.Path,
                request.ExpectedSourceRevision!,
                validation.ReplacementPath,
                validation.ReplacementContent!,
                cancellationToken).ConfigureAwait(false);
            if (push.Result is null)
            {
                _operations.Complete("recoveryCommit", false);
                return (RecoveryStatusCode(push.Errors), new AfResponse<RecoveryCommitResult>(false, push.Errors, null));
            }

            var reflection = await ReflectRecoveryCommitAsync(validation.ReplacementPath, push.Result.ReplacementRevision, push.Result.CommitRevision, cancellationToken).ConfigureAwait(false);
            var result = new RecoveryCommitResult(
                true,
                detail.Inspection.Path,
                detail.Inspection.Revision,
                push.Result.ReplacementPath,
                push.Result.ReplacementRevision,
                push.Result.CommitRevision,
                validation.PathChange,
                reflection.Reflection);

            if (reflection.Reflection.Succeeded)
            {
                _ = _recovery.DeleteDraft(_configuration, resourceKey, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
                _operations.Complete("recoveryCommit", true);
                return (200, AfResponses.Ok(result));
            }

            var errors = new[] { new AfError(AfErrorCodes.RecoveryReflectionFailed, "Recovery commit succeeded but runtime reflection failed.", true) }
                .Concat(reflection.Reflection.Errors)
                .ToArray();
            _operations.Complete("recoveryCommit", false);
            return (200, new AfResponse<RecoveryCommitResult>(true, errors, reflection.Reflection.Warnings, result));
        }
        catch
        {
            _operations.Complete("recoveryCommit", false);
            return (500, AfResponses.Fail<RecoveryCommitResult>(new AfError(AfErrorCodes.CommonInternalError, "Recovery commit failed.", true)));
        }
    }

    private (RuntimeDataFile? Runtime, LocalMasterDocuments? Documents) LoadLocalMasterDocuments()
    {
        var (data, _) = _runtimeDataStore.LoadCurrent();
        return (data, data?.MasterDocuments);
    }

    private static MasterDocumentSnapshot? SelectLocalMasterDocument(LocalMasterDocuments documents, string type) => type switch
    {
        "MACHINE_MASTER" => documents.Machine,
        "GYM_MASTER" => documents.Gym,
        _ => null
    };

    private static LocalMasterDocuments ReplaceLocalMasterDocument(LocalMasterDocuments documents, string type, string content, string revision) => type switch
    {
        "MACHINE_MASTER" => documents with { Machine = new MasterDocumentSnapshot("MACHINE_MASTER", "master/machines.json", revision, content) },
        "GYM_MASTER" => documents with { Gym = new MasterDocumentSnapshot("GYM_MASTER", "master/gyms.json", revision, content) },
        _ => documents
    };

    private static RuntimeSourceFile ToRuntimeSource(MasterDocumentSnapshot document) => new(document.Path, document.Content, document.Revision);

    private async Task<RecoveryContext> LoadRecoveryContextAsync(CancellationToken cancellationToken)
    {
        if (_recovery is null)
        {
            return new RecoveryContext(
                null,
                null,
                null,
                new[] { new AfError(AfErrorCodes.RecoveryUnavailable, "Recovery is unavailable.", true) });
        }

        LoadConfiguration();
        LoadCredential();
        if (_configurationStatus != ComponentStatus.available)
        {
            return new RecoveryContext(
                null,
                null,
                null,
                new[] { new AfError(AfErrorCodes.ConfigRequired, "Configuration is required.", true) });
        }

        if (string.IsNullOrWhiteSpace(_token))
        {
            return new RecoveryContext(
                null,
                null,
                null,
                new[] { new AfError(AfErrorCodes.CredentialRequired, "Credential is required.", true) });
        }

        var workouts = await _github.FetchWorkoutFilesAsync(_configuration, _token, cancellationToken).ConfigureAwait(false);
        if (workouts.Errors.Count > 0)
        {
            return new RecoveryContext(null, null, null, workouts.Errors);
        }

        var machineSnapshot = await _github.ReadMasterDocumentAsync(_configuration, _token, "MACHINE_MASTER", cancellationToken).ConfigureAwait(false);
        if (machineSnapshot.Document is null)
        {
            return new RecoveryContext(null, null, null, machineSnapshot.Errors);
        }

        var gymSnapshot = await _github.ReadMasterDocumentAsync(_configuration, _token, "GYM_MASTER", cancellationToken).ConfigureAwait(false);
        if (gymSnapshot.Document is null)
        {
            return new RecoveryContext(null, null, null, gymSnapshot.Errors);
        }

        return new RecoveryContext(
            workouts.Files,
            ToRuntimeSource(machineSnapshot.Document),
            ToRuntimeSource(gymSnapshot.Document),
            Array.Empty<AfError>());
    }

    private async Task<(RecoveryReflectionResult Reflection, ResourceInspection? Inspection)> ReflectRecoveryCommitAsync(
        string replacementPath,
        string replacementRevision,
        string commitRevision,
        CancellationToken cancellationToken)
    {
        var committedConfiguration = _configuration with
        {
            Repository = _configuration.Repository with { Ref = commitRevision }
        };
        var context = await LoadRecoveryContextAsync(committedConfiguration, cancellationToken).ConfigureAwait(false);
        if (context.Errors.Count > 0)
        {
            return (new RecoveryReflectionResult(false, null, context.Errors, Array.Empty<RuntimeWarning>()), null);
        }

        var committed = context.WorkoutFiles!
            .FirstOrDefault(file => string.Equals(file.Path, replacementPath, StringComparison.Ordinal));
        if (committed is null || !string.Equals(ResolveRuntimeSourceRevision(committed), replacementRevision, StringComparison.Ordinal))
        {
            return (new RecoveryReflectionResult(
                false,
                null,
                new[] { new AfError(AfErrorCodes.RecoveryReflectionFailed, "Recovered resource revision is not reflected at the Recovery commit.", true) },
                Array.Empty<RuntimeWarning>()), null);
        }

        var inspection = _recovery!.InspectPath(_configuration, replacementPath, context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        if (inspection is null || inspection.Health == "broken")
        {
            return (new RecoveryReflectionResult(
                false,
                inspection?.Health,
                new[] { new AfError(AfErrorCodes.RecoveryReflectionFailed, "Recovered resource is not reflected as Healthy or Degraded.", true) },
                Array.Empty<RuntimeWarning>()), inspection);
        }

        var build = _runtimeDataBuilder.Build(context.WorkoutFiles!, context.MachineMaster!, context.GymMaster!);
        if (build.TechnicalInvalid)
        {
            _latestValidation = "failed";
            return (new RecoveryReflectionResult(false, inspection.Health, build.Errors, build.Warnings), inspection);
        }

        var masterDocuments = new LocalMasterDocuments(
            ToMasterDocumentSnapshot(context.MachineMaster!, "MACHINE_MASTER"),
            ToMasterDocumentSnapshot(context.GymMaster!, "GYM_MASTER"));
        var saveErrors = _runtimeDataStore.SaveCurrent(build, masterDocuments);
        if (saveErrors.Count > 0)
        {
            _runtimeStatus = ComponentStatus.unavailable;
            return (new RecoveryReflectionResult(false, inspection.Health, saveErrors, build.Warnings), inspection);
        }

        _githubStatus = ComponentStatus.available;
        _runtimeStatus = ComponentStatus.available;
        _latestRemoteRetrieval = "succeeded";
        _latestValidation = "succeeded";
        _requiredActions.RemoveAll(action => action == AfErrorCodes.RuntimeDataRequired);
        _applicationStatus = build.Errors.Count > 0 ? ApplicationStatus.degraded : ApplicationStatus.ready;
        return (new RecoveryReflectionResult(true, inspection.Health, Array.Empty<AfError>(), build.Warnings), inspection);
    }

    private async Task<RecoveryContext> LoadRecoveryContextAsync(AfConfiguration configuration, CancellationToken cancellationToken)
    {
        var workouts = await _github.FetchWorkoutFilesAsync(configuration, _token, cancellationToken).ConfigureAwait(false);
        if (workouts.Errors.Count > 0)
        {
            return new RecoveryContext(null, null, null, workouts.Errors);
        }

        var machineSnapshot = await _github.ReadMasterDocumentAsync(configuration, _token, "MACHINE_MASTER", cancellationToken).ConfigureAwait(false);
        if (machineSnapshot.Document is null)
        {
            return new RecoveryContext(null, null, null, machineSnapshot.Errors);
        }

        var gymSnapshot = await _github.ReadMasterDocumentAsync(configuration, _token, "GYM_MASTER", cancellationToken).ConfigureAwait(false);
        if (gymSnapshot.Document is null)
        {
            return new RecoveryContext(null, null, null, gymSnapshot.Errors);
        }

        return new RecoveryContext(
            workouts.Files,
            ToRuntimeSource(machineSnapshot.Document),
            ToRuntimeSource(gymSnapshot.Document),
            Array.Empty<AfError>());
    }

    private static MasterDocumentSnapshot ToMasterDocumentSnapshot(RuntimeSourceFile source, string type) =>
        new(type, source.Path, ResolveRuntimeSourceRevision(source), source.Content);

    private static string ResolveRuntimeSourceRevision(RuntimeSourceFile source)
    {
        if (!string.IsNullOrWhiteSpace(source.Revision))
        {
            return source.Revision;
        }

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(source.Content));
        return "content-sha256-" + Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private sealed record RecoveryContext(
        IReadOnlyList<RuntimeSourceFile>? WorkoutFiles,
        RuntimeSourceFile? MachineMaster,
        RuntimeSourceFile? GymMaster,
        IReadOnlyList<AfError> Errors);

    private static IReadOnlyList<AfError> ValidateLocalMasterLifecycleTransition(string type, string currentContent, string nextContent)
    {
        if (type != "GYM_MASTER")
        {
            return Array.Empty<AfError>();
        }

        try
        {
            var currentConfigured = HasMainGym(currentContent);
            var nextConfigured = HasMainGym(nextContent);
            return currentConfigured && !nextConfigured
                ? new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Configured Main Gym cannot be cleared.", true) }
                : Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.MasterWriteInvalid, "Master document lifecycle transition is invalid.", true) };
        }
    }

    private static bool HasMainGym(string content)
    {
        var document = JsonNode.Parse(content)?.AsObject();
        return document?["gyms"]?.AsArray()
            .OfType<JsonObject>()
            .Any(gym => gym["main"]?.GetValue<bool>() == true) == true;
    }

    public Task<(int StatusCode, AfResponse<IReadOnlyList<UnresolvedMasterReference>> Response)> GetUnresolvedMasterReferencesAsync(CancellationToken cancellationToken)
    {
        var (data, errors) = _runtimeDataStore.LoadCurrent();
        if (data is null)
        {
            return Task.FromResult((409, AfResponses.Fail<IReadOnlyList<UnresolvedMasterReference>>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data must be synchronized before maintenance.", true))));
        }

        return Task.FromResult((200, AfResponses.Ok(BuildUnresolvedMasterReferences(data.Warnings ?? Array.Empty<RuntimeWarning>()))));
    }

    /// <summary>
    /// Master document を expected revision 付きで保存し、成功後に Runtime Data を再構築する。
    /// </summary>
    /// <remarks>
    /// local revision、remote revision、whole-master validation、Gym lifecycle rule をすべて満たす必要がある。
    /// PUT 成功後に Runtime reflection できない場合は同期要求として返し、古い local snapshot を信用し続けない。
    /// </remarks>
    public async Task<(int StatusCode, AfResponse<MasterDocumentWriteResult> Response)> WriteMasterDocumentAsync(
        string type,
        MasterDocumentWriteRequest request,
        CancellationToken cancellationToken)
    {
        if (_configurationStatus != ComponentStatus.available)
        {
            return (400, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.ConfigRequired, "Configuration is required.", true)));
        }

        if (string.IsNullOrWhiteSpace(_token))
        {
            return (401, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.CredentialRequired, "Credential is required.", true)));
        }

        var local = LoadLocalMasterDocuments();
        if (local.Documents is null)
        {
            return (409, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data must be synchronized before maintenance.", true)));
        }

        var current = SelectLocalMasterDocument(local.Documents, type);
        if (current is null)
        {
            return (400, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterWriteInvalid, "Master write target is not allowed.", true)));
        }

        if (!string.Equals(current.Revision, request.ExpectedRevision ?? "", StringComparison.Ordinal))
        {
            return (409, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterSyncRequired, "Master document must be synchronized before saving.", true)));
        }

        var candidateContent = request.Content ?? "";
        if (string.IsNullOrWhiteSpace(candidateContent))
        {
            return (400, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterWriteInvalid, "Master document write request is invalid.", true)));
        }

        var candidateDocuments = ReplaceLocalMasterDocument(local.Documents, type, candidateContent, current.Revision);
        var lifecycleErrors = ValidateLocalMasterLifecycleTransition(type, current.Content, candidateContent);
        if (lifecycleErrors.Count > 0)
        {
            return (400, new AfResponse<MasterDocumentWriteResult>(false, lifecycleErrors, null));
        }

        var validationErrors = MasterWriteValidator.ValidateWholeMaster(candidateDocuments.Machine.Content, candidateDocuments.Gym.Content);
        if (validationErrors.Count > 0)
        {
            return (400, new AfResponse<MasterDocumentWriteResult>(false, validationErrors, null));
        }

        var push = await _github.PushMasterDocumentAsync(
            _configuration,
            _token,
            type,
            current.Revision,
            candidateContent,
            cancellationToken);
        if (push.Result is null)
        {
            return (MapMasterWriteStatusCode(push.Errors), new AfResponse<MasterDocumentWriteResult>(false, push.Errors, null));
        }

        var confirmedDocuments = ReplaceLocalMasterDocument(local.Documents, type, candidateContent, push.Result.Revision);
        var workouts = await _github.FetchWorkoutFilesAsync(_configuration, _token, cancellationToken);
        if (workouts.Errors.Count > 0)
        {
            return (409, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data was saved remotely. Synchronize application data before continuing.", true)));
        }

        var build = _runtimeDataBuilder.Build(workouts.Files, ToRuntimeSource(confirmedDocuments.Machine), ToRuntimeSource(confirmedDocuments.Gym));
        if (build.TechnicalInvalid)
        {
            return (409, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data was saved remotely. Synchronize application data before continuing.", true)));
        }

        var saveErrors = _runtimeDataStore.SaveCurrent(build, confirmedDocuments);
        if (saveErrors.Count > 0)
        {
            return (409, AfResponses.Fail<MasterDocumentWriteResult>(new AfError(AfErrorCodes.MasterSyncRequired, "Master data was saved remotely. Synchronize application data before continuing.", true)));
        }

        _runtimeStatus = ComponentStatus.available;
        _latestValidation = "succeeded";
        _requiredActions.RemoveAll(action => action == AfErrorCodes.RuntimeDataRequired);
        _applicationStatus = DetermineApplicationStatus();
        return (200, AfResponses.Ok(push.Result));
    }

    private static IReadOnlyList<UnresolvedMasterReference> BuildUnresolvedMasterReferences(IReadOnlyList<RuntimeWarning> warnings)
    {
        var groups = new Dictionary<(string Type, string ReferenceId), List<UnresolvedAffectedWorkout>>();
        foreach (var warning in warnings.Where(warning => warning.Code is "MASTER_REFERENCE_MISSING" or "MASTER_REFERENCE_DELETED"))
        {
            var referenceId = warning.OriginalId.Trim();
            if (referenceId.Length == 0)
            {
                continue;
            }

            var key = (warning.ReferenceKind == "machine" ? "MACHINE_MASTER" : "GYM_MASTER", referenceId);
            if (!groups.TryGetValue(key, out var affected))
            {
                affected = new List<UnresolvedAffectedWorkout>();
                groups[key] = affected;
            }

            affected.Add(new UnresolvedAffectedWorkout(warning.FilePath ?? "", warning.Line, warning.Message));
        }

        return groups
            .OrderBy(group => group.Key.Type, StringComparer.Ordinal)
            .ThenBy(group => group.Key.ReferenceId, StringComparer.Ordinal)
            .Select(group => new UnresolvedMasterReference(group.Key.Type, group.Key.ReferenceId, group.Value))
            .ToArray();
    }

    private static (string FilePath, int? Line) ParseErrorLocation(string message)
    {
        var separator = message.IndexOf(": ", StringComparison.Ordinal);
        var location = separator < 0 ? message : message[..separator];
        var lineMarker = ": line ";
        var lineIndex = location.LastIndexOf(lineMarker, StringComparison.Ordinal);
        if (lineIndex >= 0 && int.TryParse(location[(lineIndex + lineMarker.Length)..], out var line))
        {
            return (location[..lineIndex], line);
        }

        return (location, null);
    }

    public (int StatusCode, AfResponse<CredentialUpdateResult> Response) UpdateCredential(CredentialUpdate update)
    {
        if (!_operations.TryStart("credentialUpdate"))
        {
            return (409, AfResponses.Fail<CredentialUpdateResult>(new AfError(AfErrorCodes.OperationAlreadyRunning, "Credential update is already running.", true)));
        }

        try
        {
            var result = _credentialStore.Save(update);
            LoadCredential();
            _applicationStatus = DetermineApplicationStatus();
            _operations.Complete("credentialUpdate", result.State != CredentialState.invalid.ToString());
            return result.State == CredentialState.invalid.ToString()
                ? (400, AfResponses.Fail<CredentialUpdateResult>(new AfError(AfErrorCodes.CredentialInvalid, "Credential is invalid.", true)))
                : (200, AfResponses.Ok(result));
        }
        catch
        {
            _operations.Complete("credentialUpdate", false);
            return (500, AfResponses.Fail<CredentialUpdateResult>(new AfError(AfErrorCodes.CredentialSaveFailed, "Credential could not be saved.", true)));
        }
    }

    /// <summary>
    /// ユーザー操作による同期を実行する。
    /// </summary>
    /// <remarks>
    /// remote retrieval または validation に失敗しても LKG Runtime Data がある場合は degraded として継続し、
    /// Runtime Data がない場合だけ通常利用不可にする。
    /// </remarks>
    public async Task<(int StatusCode, AfResponse<SyncResult> Response)> ManualSyncAsync(CancellationToken cancellationToken)
    {
        if (!_operations.TryStart("manualSync"))
        {
            return (409, AfResponses.Fail<SyncResult>(new AfError(AfErrorCodes.OperationAlreadyRunning, "Sync is already running.", true)));
        }

        try
        {
            var response = await SyncCoreAsync(cancellationToken);
            _operations.Complete("manualSync", response.Response.Success);
            return response;
        }
        catch
        {
            _operations.Complete("manualSync", false);
            return (500, AfResponses.Fail<SyncResult>(new AfError(AfErrorCodes.CommonInternalError, "Sync failed.", true)));
        }
    }

    public AfResponse<ShutdownResult> BeginShutdown()
    {
        var already = !_operations.TryStart("shutdown");
        _applicationStatus = ApplicationStatus.stopping;
        if (!already) _operations.Complete("shutdown", true);
        return AfResponses.Ok(new ShutdownResult(true, already));
    }

    private async Task StartupSyncAsync()
    {
        try
        {
            if (_configurationStatus != ComponentStatus.available || _credentialStatus.State is "missing" or "invalid" or "unknown")
            {
                _applicationStatus = DetermineApplicationStatus();
                _operations.Complete("startup", true);
                return;
            }

            var response = await SyncCoreAsync(CancellationToken.None);
            _applicationStatus = DetermineApplicationStatus();
            _operations.Complete("startup", response.Response.Success);
            if (!response.Response.Success)
            {
                _log.Write(LogType.WARN, "Startup sync completed without updating remote runtime data.");
            }
        }
        catch (Exception ex)
        {
            _log.Write(LogType.ERROR, "Startup sync failed: " + ex.Message);
            _applicationStatus = DetermineApplicationStatus();
            _operations.Complete("startup", false);
        }
    }

    private async Task<(int StatusCode, AfResponse<SyncResult> Response)> SyncCoreAsync(CancellationToken cancellationToken)
    {
        var remote = await _github.FetchAsync(_configuration, _token, cancellationToken);
        if (remote.Errors.Count > 0)
        {
            _latestRemoteRetrieval = "failed";
            _latestValidation = "skipped";
            _githubStatus = ComponentStatus.degraded;
            ValidateLocalRuntime();
            if (_runtimeStatus == ComponentStatus.available)
            {
                // Remote failure is degraded, not fatal, when a previously built runtime file can
                // still satisfy Frontend data requests.
                return (200, new AfResponse<SyncResult>(false, remote.Errors, new SyncResult(true)));
            }

            return (503, new AfResponse<SyncResult>(false, remote.Errors, null));
        }

        _latestRemoteRetrieval = "succeeded";
        _githubStatus = ComponentStatus.available;
        var machineSnapshot = await _github.ReadMasterDocumentAsync(_configuration, _token, "MACHINE_MASTER", cancellationToken);
        if (machineSnapshot.Document is null)
        {
            _latestValidation = "failed";
            return RuntimeBuildFailure(machineSnapshot.Errors);
        }

        var gymSnapshot = await _github.ReadMasterDocumentAsync(_configuration, _token, "GYM_MASTER", cancellationToken);
        if (gymSnapshot.Document is null)
        {
            _latestValidation = "failed";
            return RuntimeBuildFailure(gymSnapshot.Errors);
        }

        var machineMaster = ToRuntimeSource(machineSnapshot.Document);
        var gymMaster = ToRuntimeSource(gymSnapshot.Document);
        var workoutFiles = remote.Files.Where(file => file.Path.Contains("workouts/", StringComparison.OrdinalIgnoreCase)).ToArray();

        var build = _runtimeDataBuilder.Build(workoutFiles, machineMaster, gymMaster);
        if (build.TechnicalInvalid)
        {
            _latestValidation = "failed";
            return RuntimeBuildFailure(build.Errors);
        }

        var masterDocuments = new LocalMasterDocuments(machineSnapshot.Document, gymSnapshot.Document);
        var saveErrors = _runtimeDataStore.SaveCurrent(build, masterDocuments);
        if (saveErrors.Count > 0)
        {
            _runtimeStatus = ComponentStatus.unavailable;
            return (500, new AfResponse<SyncResult>(false, saveErrors, null));
        }

        _runtimeStatus = ComponentStatus.available;
        _latestValidation = "succeeded";
        _requiredActions.RemoveAll(action => action == AfErrorCodes.RuntimeDataRequired);
        _applicationStatus = build.Errors.Count > 0 ? ApplicationStatus.degraded : ApplicationStatus.ready;
        return (200, AfResponses.Ok(new SyncResult(build.Errors.Count > 0), build.Errors, build.Warnings));
    }

    private (int StatusCode, AfResponse<SyncResult> Response) RuntimeBuildFailure(IReadOnlyList<AfError> errors)
    {
        _githubStatus = ComponentStatus.degraded;
        ValidateLocalRuntime();
        _applicationStatus = DetermineApplicationStatus();
        if (_runtimeStatus == ComponentStatus.available)
        {
            return (200, new AfResponse<SyncResult>(false, errors, new SyncResult(true)));
        }

        return (503, new AfResponse<SyncResult>(false, errors, null));
    }

    private void LoadConfiguration()
    {
        var loaded = _configurationStore.Load();
        _configuration = loaded.Configuration;
        _configurationStatus = loaded.Available ? ComponentStatus.available : ComponentStatus.unavailable;
        _requiredActions.RemoveAll(action => action == "CONFIGURATION_REQUIRED");
        if (!loaded.Available) _requiredActions.Add("CONFIGURATION_REQUIRED");
    }

    private void LoadCredential()
    {
        var loaded = _credentialStore.Load();
        _token = loaded.Token;
        _credentialStatus = loaded.Status;
        _credentialComponentStatus = _credentialStatus.State == CredentialState.available.ToString() ? ComponentStatus.available : ComponentStatus.unavailable;
        _requiredActions.RemoveAll(action => action == "CREDENTIAL_REQUIRED");
        if (!_credentialStatus.Configured) _requiredActions.Add("CREDENTIAL_REQUIRED");
    }

    private void ValidateLocalRuntime()
    {
        var (data, _) = _runtimeDataStore.LoadCurrent();
        _runtimeStatus = data is null ? ComponentStatus.unavailable : ComponentStatus.available;
        _requiredActions.RemoveAll(action => action == AfErrorCodes.RuntimeDataRequired);
        if (data is null) _requiredActions.Add(AfErrorCodes.RuntimeDataRequired);
    }

    private ApplicationStatus DetermineApplicationStatus()
    {
        if (_configurationStatus == ComponentStatus.available && _runtimeStatus == ComponentStatus.available)
        {
            return _requiredActions.Count == 0 ? ApplicationStatus.ready : ApplicationStatus.degraded;
        }

        return ApplicationStatus.degraded;
    }

    private static AfConfiguration MergeConfiguration(AfConfiguration current, ConfigurationUpdate update)
    {
        // Settings posts partial updates. Merge keeps unspecified fields stable so independent
        // cards on the Settings screen do not accidentally reset each other.
        var repository = update.Repository is null
            ? current.Repository
            : new RepositoryConfiguration(
                update.Repository.Owner ?? current.Repository.Owner,
                update.Repository.Repository ?? current.Repository.Repository,
                update.Repository.Ref ?? current.Repository.Ref,
                update.Repository.RootPath ?? current.Repository.RootPath);

        var timeouts = update.Timeouts is null
            ? current.Timeouts
            : new TimeoutConfiguration(
                update.Timeouts.GithubRequestTimeoutSec ?? current.Timeouts.GithubRequestTimeoutSec,
                update.Timeouts.SyncOperationTimeoutSec ?? current.Timeouts.SyncOperationTimeoutSec,
                update.Timeouts.GeneralApiTimeoutSec ?? current.Timeouts.GeneralApiTimeoutSec,
                update.Timeouts.ShutdownTimeoutSec ?? current.Timeouts.ShutdownTimeoutSec);

        return new AfConfiguration(current.SchemaVersion, repository, update.Resources ?? current.Resources, timeouts);
    }
}

