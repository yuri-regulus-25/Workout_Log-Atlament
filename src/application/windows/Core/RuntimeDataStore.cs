using System.Text;
using System.Text.Json;

namespace Atlament.Core;

/// <summary>
/// Windows AF の採用済み Runtime Data と local Master snapshot を管理する永続化境界。
/// </summary>
/// <remarks>
/// Frontend が読む current file は同期完了後の一貫した snapshot だけにする。
/// 一時領域へ書いてから置換することで、同期中の部分書き込みを Runtime API へ露出しない。
/// </remarks>
public sealed class RuntimeDataStore
{
    private readonly WindowsPathProvider _paths;

    public RuntimeDataStore(WindowsPathProvider paths)
    {
        _paths = paths;
    }

    public void ClearTemporary()
    {
        if (Directory.Exists(_paths.TemporaryRuntimeRoot))
        {
            Directory.Delete(_paths.TemporaryRuntimeRoot, true);
        }

        Directory.CreateDirectory(_paths.TemporaryRuntimeRoot);
    }

    /// <summary>
    /// Runtime build 結果を current snapshot として原子的に保存する。
    /// </summary>
    public IReadOnlyList<AfError> SaveCurrent(RuntimeBuildResult result, LocalMasterDocuments? masterDocuments = null)
    {
        try
        {
            // Write through the temporary runtime area so Frontend requests never observe a
            // partially serialized runtime-data.json during sync.
            Directory.CreateDirectory(_paths.TemporaryRuntimeRoot);
            var data = new RuntimeDataFile(2, DateTimeOffset.UtcNow, result.Sessions, result.Errors, result.Warnings, masterDocuments);
            var tempPath = Path.Combine(_paths.TemporaryRuntimeRoot, "runtime-data.json");
            File.WriteAllText(tempPath, JsonSerializer.Serialize(data, AfJson.Options), Encoding.UTF8);
            Directory.CreateDirectory(_paths.CurrentRuntimeRoot);
            File.Move(tempPath, _paths.RuntimeDataPath, true);
            ClearTemporary();
            return Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.RuntimeDataUpdateFailed, "Runtime Data could not be updated.", true) };
        }
    }

    /// <summary>
    /// Frontend/API が使用する current Runtime Data を読み込む。
    /// </summary>
    /// <remarks>
    /// ファイル欠落は unavailable、schema 不整合や parse failure は invalid として返す。
    /// 呼び出し側は errors の message を分岐条件に使わず、code/component status を契約として扱う。
    /// </remarks>
    public (RuntimeDataFile? Data, IReadOnlyList<AfError> Errors) LoadCurrent()
    {
        try
        {
            if (!File.Exists(_paths.RuntimeDataPath))
            {
                return (null, new[] { new AfError(AfErrorCodes.RuntimeDataUnavailable, "Runtime Data is unavailable.", true) });
            }

            var data = JsonSerializer.Deserialize<RuntimeDataFile>(File.ReadAllText(_paths.RuntimeDataPath), AfJson.Options);
            if (data is null || data.SchemaVersion is not (1 or 2) || data.Sessions is null)
            {
                return (null, new[] { new AfError(AfErrorCodes.RuntimeDataInvalid, "Runtime Data contract is invalid.", true) });
            }

            return (data, Array.Empty<AfError>());
        }
        catch
        {
            return (null, new[] { new AfError(AfErrorCodes.RuntimeDataInvalid, "Runtime Data could not be read.", true) });
        }
    }
}
