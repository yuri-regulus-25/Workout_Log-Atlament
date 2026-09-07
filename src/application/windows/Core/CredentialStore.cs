using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Atlament.Core;

public sealed class CredentialStore
{
    private readonly WindowsPathProvider _paths;

    public CredentialStore(WindowsPathProvider paths)
    {
        _paths = paths;
    }

    public (string? Token, CredentialStatus Status) Load()
    {
        try
        {
            if (!File.Exists(_paths.CredentialPath))
            {
                return (null, new CredentialStatus(false, CredentialState.missing.ToString(), null));
            }

            var protectedBytes = File.ReadAllBytes(_paths.CredentialPath);
            // DPAPI binds credentials to the current Windows user. The token should never be
            // recoverable from copied application folders or written into Frontend-visible data.
            var json = Encoding.UTF8.GetString(ProtectedData.Unprotect(protectedBytes, null, DataProtectionScope.CurrentUser));
            var credential = JsonSerializer.Deserialize<StoredCredential>(json, AfJson.Options);
            if (credential?.Token is not { Length: > 0 })
            {
                return (null, new CredentialStatus(false, CredentialState.invalid.ToString(), credential?.LimitDate));
            }

            var state = CredentialState.available;
            if (DateOnly.TryParse(credential.LimitDate, out var limitDate) && limitDate < DateOnly.FromDateTime(DateTime.Today))
            {
                state = CredentialState.expired;
            }

            return (credential.Token, new CredentialStatus(true, state.ToString(), credential.LimitDate));
        }
        catch
        {
            return (null, new CredentialStatus(false, CredentialState.unknown.ToString(), null));
        }
    }

    public CredentialUpdateResult Save(CredentialUpdate update)
    {
        if (!string.IsNullOrWhiteSpace(update.LimitDate) && !DateOnly.TryParse(update.LimitDate, out _))
        {
            return new CredentialUpdateResult(false, CredentialState.invalid.ToString(), update.LimitDate);
        }

        var current = Load();
        var token = string.IsNullOrWhiteSpace(update.Token) ? current.Token : update.Token;
        if (string.IsNullOrWhiteSpace(token))
        {
            return new CredentialUpdateResult(current.Status.Configured, current.Status.State, current.Status.LimitDate);
        }

        Directory.CreateDirectory(_paths.ConfigurationRoot);
        var json = JsonSerializer.Serialize(new StoredCredential(token, update.LimitDate), AfJson.Options);
        var protectedBytes = ProtectedData.Protect(Encoding.UTF8.GetBytes(json), null, DataProtectionScope.CurrentUser);
        File.WriteAllBytes(_paths.CredentialPath, protectedBytes);
        var state = CredentialState.available;
        if (DateOnly.TryParse(update.LimitDate, out var limitDate) && limitDate < DateOnly.FromDateTime(DateTime.Today))
        {
            state = CredentialState.expired;
        }

        return new CredentialUpdateResult(true, state.ToString(), update.LimitDate);
    }

    private sealed record StoredCredential(string Token, string? LimitDate);
}
