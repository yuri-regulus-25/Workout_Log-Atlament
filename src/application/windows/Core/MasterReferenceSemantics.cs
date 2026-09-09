namespace Atlament.Core;

/// <summary>
/// Runtime Data における Master reference の解決状態と warning code を固定する。
/// </summary>
/// <remarks>
/// Windows/Android/shared frontend で同じ `resolved`/`missing`/`deleted`/`invalid_excluded` 意味論を使う。
/// 表示文言は UI 用であり、呼び出し側の分岐条件は code と resolution state を使用する。
/// </remarks>
public static class MasterReferenceSemantics
{
    /// <summary>
    /// Raw Workout ID と canonical Master ID の関係を Runtime response 用に表現する。
    /// </summary>
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

    /// <summary>
    /// 採用済み Runtime Data に添付する user-actionable warning を生成する。
    /// </summary>
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
