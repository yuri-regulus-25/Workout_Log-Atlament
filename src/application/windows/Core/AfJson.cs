using System.Text.Encodings.Web;
using System.Text.Json;

namespace Atlament.Core;

/// <summary>
/// Shared JSON contract options for AF API payloads and persisted runtime/configuration files.
/// Keeping this centralized prevents casing drift between Windows, Android, and Frontend clients.
/// </summary>
public sealed class AfJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    public static readonly JsonSerializerOptions RepositoryWriteOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public static readonly JsonSerializerOptions RepositoryJsonlWriteOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };
}
