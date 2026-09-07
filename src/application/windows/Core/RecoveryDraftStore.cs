using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Atlament.Core;

public sealed class RecoveryDraftStore
{
    private readonly WindowsPathProvider _paths;

    public RecoveryDraftStore(WindowsPathProvider paths)
    {
        _paths = paths;
    }

    public RecoveryDraftSnapshot Load(AfConfiguration configuration, string resourceType, string sourcePath, string currentSourceRevision)
    {
        try
        {
            if (!Directory.Exists(_paths.RecoveryDraftRoot))
            {
                return new RecoveryDraftSnapshot("none", null);
            }

            foreach (var path in Directory.EnumerateFiles(_paths.RecoveryDraftRoot, "*.json").OrderBy(path => path, StringComparer.Ordinal))
            {
                var envelope = ReadEnvelope(path);
                if (envelope is null)
                {
                    return new RecoveryDraftSnapshot("corrupted", null);
                }

                if (!SameRepository(envelope.Repository, configuration.Repository) ||
                    envelope.Draft.ResourceType != resourceType ||
                    envelope.Draft.SourcePath != sourcePath)
                {
                    continue;
                }

                if (envelope.Draft.SchemaVersion != 1)
                {
                    return new RecoveryDraftSnapshot("incompatible", envelope.Draft);
                }

                return new RecoveryDraftSnapshot(
                    envelope.Draft.SourceRevision == currentSourceRevision ? "active" : "stale",
                    envelope.Draft);
            }

            return new RecoveryDraftSnapshot("none", null);
        }
        catch
        {
            return new RecoveryDraftSnapshot("corrupted", null);
        }
    }

    public IReadOnlyList<RecoveryDraft> List(AfConfiguration configuration)
    {
        try
        {
            if (!Directory.Exists(_paths.RecoveryDraftRoot))
            {
                return Array.Empty<RecoveryDraft>();
            }

            return Directory.EnumerateFiles(_paths.RecoveryDraftRoot, "*.json")
                .OrderBy(path => path, StringComparer.Ordinal)
                .Select(ReadEnvelope)
                .Where(envelope => envelope is not null)
                .Where(envelope => SameRepository(envelope!.Repository, configuration.Repository))
                .Select(envelope => envelope!.Draft)
                .Where(draft => draft.SchemaVersion == 1)
                .ToArray();
        }
        catch
        {
            return Array.Empty<RecoveryDraft>();
        }
    }

    public IReadOnlyList<AfError> Save(AfConfiguration configuration, RecoveryDraft draft)
    {
        try
        {
            Directory.CreateDirectory(_paths.RecoveryDraftRoot);
            Directory.CreateDirectory(_paths.TemporaryRecoveryRoot);
            var envelope = new RecoveryDraftEnvelope(configuration.Repository, draft);
            var path = DraftPath(configuration, draft.ResourceType, draft.SourcePath, draft.SourceRevision);
            var temporaryPath = Path.Combine(_paths.TemporaryRecoveryRoot, Path.GetFileName(path) + ".tmp");
            File.WriteAllText(temporaryPath, JsonSerializer.Serialize(envelope, AfJson.Options), Encoding.UTF8);
            using (var stream = new FileStream(temporaryPath, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
            {
                stream.Flush(true);
            }

            File.Move(temporaryPath, path, true);
            return Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.RecoveryDraftSaveFailed, "Recovery Draft could not be saved.", true) };
        }
    }

    public IReadOnlyList<AfError> Delete(AfConfiguration configuration, string resourceType, string sourcePath, string sourceRevision)
    {
        try
        {
            var path = DraftPath(configuration, resourceType, sourcePath, sourceRevision);
            if (File.Exists(path))
            {
                File.Delete(path);
            }

            return Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.RecoveryDraftSaveFailed, "Recovery Draft could not be discarded.", true) };
        }
    }

    public int CountActive(AfConfiguration configuration)
    {
        try
        {
            if (!Directory.Exists(_paths.RecoveryDraftRoot))
            {
                return 0;
            }

            return Directory.EnumerateFiles(_paths.RecoveryDraftRoot, "*.json")
                .Select(ReadEnvelope)
                .Count(envelope => envelope is not null &&
                    SameRepository(envelope.Repository, configuration.Repository) &&
                    envelope.Draft.SchemaVersion == 1);
        }
        catch
        {
            return 0;
        }
    }

    private RecoveryDraftEnvelope? ReadEnvelope(string path)
    {
        try
        {
            return JsonSerializer.Deserialize<RecoveryDraftEnvelope>(File.ReadAllText(path), AfJson.Options);
        }
        catch
        {
            return null;
        }
    }

    private string DraftPath(AfConfiguration configuration, string resourceType, string sourcePath, string sourceRevision)
    {
        var key = string.Join("|", configuration.Repository.Owner, configuration.Repository.Repository, configuration.Repository.Ref, configuration.Repository.RootPath, resourceType, sourcePath, sourceRevision);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key))).ToLowerInvariant();
        return Path.Combine(_paths.RecoveryDraftRoot, hash + ".json");
    }

    private static bool SameRepository(RepositoryConfiguration left, RepositoryConfiguration right) =>
        left.Owner == right.Owner &&
        left.Repository == right.Repository &&
        left.Ref == right.Ref &&
        left.RootPath == right.RootPath;

    private sealed record RecoveryDraftEnvelope(
        [property: JsonPropertyName("repository")] RepositoryConfiguration Repository,
        [property: JsonPropertyName("draft")] RecoveryDraft Draft);
}
