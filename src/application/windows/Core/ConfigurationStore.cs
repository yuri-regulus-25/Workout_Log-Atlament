using System.Text;
using System.Text.Json;

namespace Atlament.Core;

/// <summary>
/// Windows AF の非秘匿 Configuration を読み書きする永続化境界。
/// </summary>
/// <remarks>
/// credential は扱わない。Configuration schema、resource type/kind、timeout range を検証し、
/// API の readiness 判定が同じ facts から再現できる状態だけを available とする。
/// </remarks>
public sealed class ConfigurationStore
{
    private static readonly HashSet<string> ResourceTypes = new(StringComparer.Ordinal) { "WORKOUT", "MACHINE_MASTER", "GYM_MASTER" };
    private static readonly HashSet<string> ResourceKinds = new(StringComparer.Ordinal) { "file", "directory" };
    private readonly WindowsPathProvider _paths;

    public ConfigurationStore(WindowsPathProvider paths)
    {
        _paths = paths;
    }

    public (AfConfiguration Configuration, IReadOnlyList<AfError> Errors, bool Available) Load()
    {
        if (!File.Exists(_paths.ConfigurationPath))
        {
            return (AfConfiguration.Default, new[] { new AfError(AfErrorCodes.ConfigRequired, "Configuration is required.", true) }, false);
        }

        try
        {
            var config = JsonSerializer.Deserialize<AfConfiguration>(File.ReadAllText(_paths.ConfigurationPath), AfJson.Options);
            if (config is null)
            {
                return (AfConfiguration.Default, new[] { new AfError(AfErrorCodes.ConfigInvalid, "Configuration is invalid.", true) }, false);
            }

            var errors = Validate(config);
            return errors.Count == 0 ? (config, errors, true) : (config, errors, false);
        }
        catch
        {
            return (AfConfiguration.Default, new[] { new AfError(AfErrorCodes.ConfigInvalid, "Configuration could not be parsed.", true) }, false);
        }
    }

    public IReadOnlyList<AfError> Save(AfConfiguration configuration)
    {
        var errors = Validate(configuration);
        if (errors.Count > 0)
        {
            return errors;
        }

        try
        {
            Directory.CreateDirectory(_paths.ConfigurationRoot);
            var temporaryPath = _paths.ConfigurationPath + ".tmp";
            File.WriteAllText(temporaryPath, JsonSerializer.Serialize(configuration, AfJson.Options), Encoding.UTF8);
            File.Move(temporaryPath, _paths.ConfigurationPath, true);
            return Array.Empty<AfError>();
        }
        catch
        {
            return new[] { new AfError(AfErrorCodes.ConfigSaveFailed, "Configuration could not be saved.", true) };
        }
    }

    /// <summary>
    /// AF configuration contract に対する validation error を返す。
    /// </summary>
    public static IReadOnlyList<AfError> Validate(AfConfiguration configuration)
    {
        var errors = new List<AfError>();
        if (configuration.SchemaVersion != 1)
        {
            errors.Add(new AfError(AfErrorCodes.ConfigInvalid, "Unsupported configuration schemaVersion.", true));
        }

        if (string.IsNullOrWhiteSpace(configuration.Repository.Owner) ||
            string.IsNullOrWhiteSpace(configuration.Repository.Repository) ||
            string.IsNullOrWhiteSpace(configuration.Repository.Ref))
        {
            errors.Add(new AfError(AfErrorCodes.ConfigInvalid, "Repository configuration is invalid.", true));
        }

        foreach (var resource in configuration.Resources)
        {
            if (!ResourceTypes.Contains(resource.Type) || !ResourceKinds.Contains(resource.ResourceKind) || string.IsNullOrWhiteSpace(resource.Path))
            {
                errors.Add(new AfError(AfErrorCodes.ConfigInvalid, "Resource configuration is invalid.", true));
                break;
            }
        }

        ValidateRange(configuration.Timeouts.GithubRequestTimeoutSec, 1, 120, "githubRequestTimeoutSec", errors);
        ValidateRange(configuration.Timeouts.SyncOperationTimeoutSec, 5, 600, "syncOperationTimeoutSec", errors);
        ValidateRange(configuration.Timeouts.GeneralApiTimeoutSec, 1, 120, "generalApiTimeoutSec", errors);
        ValidateRange(configuration.Timeouts.ShutdownTimeoutSec, 1, 60, "shutdownTimeoutSec", errors);
        return errors;
    }

    private static void ValidateRange(int value, int min, int max, string name, List<AfError> errors)
    {
        if (value < min || value > max)
        {
            errors.Add(new AfError(AfErrorCodes.ConfigInvalid, $"{name} is out of range.", true));
        }
    }
}
