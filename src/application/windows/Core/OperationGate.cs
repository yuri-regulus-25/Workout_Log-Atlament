namespace Atlament.Core;

public sealed class OperationGate
{
    private readonly object _syncRoot = new();
    private readonly Dictionary<string, OperationStatus> _operations = new(StringComparer.Ordinal)
    {
        ["startup"] = OperationStatus.idle,
        ["manualSync"] = OperationStatus.idle,
        ["recoveryCommit"] = OperationStatus.idle,
        ["configurationUpdate"] = OperationStatus.idle,
        ["credentialUpdate"] = OperationStatus.idle,
        ["shutdown"] = OperationStatus.idle
    };

    public bool TryStart(string name)
    {
        lock (_syncRoot)
        {
            // Startup sync and manual sync both update the same runtime file. Allowing them to
            // overlap would make Status API operation states ambiguous and risk last-writer wins.
            if (_operations["shutdown"] == OperationStatus.running && name != "shutdown") return false;
            if (name == "manualSync" && _operations["startup"] == OperationStatus.running) return false;
            if (name == "startup" && _operations["manualSync"] == OperationStatus.running) return false;
            if (name == "recoveryCommit" && (_operations["startup"] == OperationStatus.running || _operations["manualSync"] == OperationStatus.running)) return false;
            if ((name == "startup" || name == "manualSync") && _operations["recoveryCommit"] == OperationStatus.running) return false;
            if (_operations[name] == OperationStatus.running) return false;
            _operations[name] = OperationStatus.running;
            return true;
        }
    }

    public void Complete(string name, bool success)
    {
        lock (_syncRoot)
        {
            _operations[name] = success ? OperationStatus.completed : OperationStatus.failed;
        }
    }

    public OperationStateSnapshot Snapshot()
    {
        lock (_syncRoot)
        {
            return new OperationStateSnapshot(
                _operations["startup"].ToString(),
                _operations["manualSync"].ToString(),
                _operations["configurationUpdate"].ToString(),
                _operations["credentialUpdate"].ToString(),
                _operations["shutdown"].ToString());
        }
    }
}
