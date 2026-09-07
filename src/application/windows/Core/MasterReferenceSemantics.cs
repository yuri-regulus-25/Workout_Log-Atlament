namespace Atlament.Core;

public static class MasterReferenceSemantics
{
    public static MasterReferenceResolution Resolve(string originalId, string? resolvedId, bool deleted, bool invalidExcluded)
    {
        if (invalidExcluded)
        {
            return new MasterReferenceResolution("invalid_excluded", originalId, null);
        }

        if (string.IsNullOrWhiteSpace(resolvedId))
        {
            return new MasterReferenceResolution("missing", originalId, null);
        }

        return new MasterReferenceResolution(deleted ? "deleted" : "resolved", originalId, resolvedId);
    }

    public static RuntimeWarning CreateWarning(
        string referenceKind,
        string originalId,
        string? resolvedId,
        bool deleted,
        bool invalidExcluded,
        string sessionId,
        string filePath,
        int? line)
    {
        var resolutionState = invalidExcluded ? "invalid_excluded" : deleted ? "deleted" : "missing";
        var subject = referenceKind == "gym" ? "ジム" : "マシン";
        var stateText = invalidExcluded ? "Runtime採用対象から除外されています" : deleted ? "削除されています" : "存在しません";
        return new RuntimeWarning(
            invalidExcluded ? "MASTER_REFERENCE_INVALID_EXCLUDED" : deleted ? "MASTER_REFERENCE_DELETED" : "MASTER_REFERENCE_MISSING",
            referenceKind,
            resolutionState,
            originalId,
            resolvedId,
            sessionId,
            filePath,
            line,
            $"特定の{subject}が{stateText}: {originalId}");
    }
}
