namespace Atlament.Core;

public sealed class WindowsPathProvider
{
    public WindowsPathProvider(string runtimeRoot)
    {
        RuntimeRoot = runtimeRoot;
        DataRoot = Path.Combine(runtimeRoot, "data");
        FrontendArtifactRoot = Path.Combine(DataRoot, "frontend");
        ConfigurationRoot = Path.Combine(DataRoot, "configuration");
        RuntimeDataRoot = Path.Combine(DataRoot, "runtime");
        RecoveryRoot = Path.Combine(DataRoot, "recovery");
        LogRoot = Path.Combine(DataRoot, "logs");
    }

    public string RuntimeRoot { get; }
    public string DataRoot { get; }
    public string FrontendArtifactRoot { get; }
    public string ConfigurationRoot { get; }
    public string RuntimeDataRoot { get; }
    public string RecoveryRoot { get; }
    public string LogRoot { get; }
    public string CurrentRuntimeRoot => Path.Combine(RuntimeDataRoot, "current");
    public string TemporaryRuntimeRoot => Path.Combine(RuntimeDataRoot, "temporary");
    public string ConfigurationPath => Path.Combine(ConfigurationRoot, "af-settings.json");
    public string CredentialPath => Path.Combine(ConfigurationRoot, "credential.dpapi");
    public string RuntimeDataPath => Path.Combine(CurrentRuntimeRoot, "runtime-data.json");
    public string RecoveryDraftRoot => Path.Combine(RecoveryRoot, "drafts");
    public string TemporaryRecoveryRoot => Path.Combine(RecoveryRoot, "temporary");
}
