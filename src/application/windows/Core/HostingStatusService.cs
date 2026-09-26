using System.Reflection;

namespace Atlament.Core;

public sealed record FrontendArtifactFile(string RequestPath, string? PhysicalPath, string? ResourceName)
{
    public bool IsEmbedded => ResourceName is not null;
}

public sealed class HostingStatusService
{
    private const string EmbeddedFrontendPrefix = "Frontend/";
    private readonly WindowsPathProvider _paths;
    private readonly Assembly _resourceAssembly;
    private readonly IReadOnlyDictionary<string, string> _embeddedResources;
    private static readonly IReadOnlyDictionary<string, string> ArtifactNames = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["portal"] = "portal",
        ["dashboard"] = "dashboard",
        ["workouts"] = "workouts",
        ["workout-manager"] = "workout-manager",
        ["machines"] = "machines",
        ["analytics"] = "analytics",
        ["settings"] = "settings",
        ["maintenance"] = "maintenance"
    };

    public HostingStatusService(WindowsPathProvider paths)
    {
        _paths = paths;
        _resourceAssembly = typeof(HostingStatusService).Assembly;
        _embeddedResources = _resourceAssembly.GetManifestResourceNames()
            .Select(name => new { Key = NormalizeResourceName(name), ResourceName = name })
            .Where(resource => resource.Key.StartsWith(EmbeddedFrontendPrefix, StringComparison.Ordinal))
            .ToDictionary(resource => resource.Key, resource => resource.ResourceName, StringComparer.Ordinal);
    }

    public HostingComponentState GetStatus() => new(
        Status("portal"),
        Status("dashboard"),
        Status("workouts"),
        Status("workout-manager"),
        Status("machines"),
        Status("analytics"),
        Status("settings"),
        Status("maintenance"));

    public FrontendArtifactFile? TryResolveFile(string requestPath, out bool artifactUnavailable)
    {
        artifactUnavailable = false;
        var normalized = requestPath.Trim('/');
        var app = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "portal";
        if (app is "dashboard" or "workouts" or "workout-manager" or "machines" or "analytics" or "settings" or "maintenance")
        {
            var relative = normalized.Length == app.Length ? "index.html" : normalized[(app.Length + 1)..];
            return Resolve(app, relative, out artifactUnavailable);
        }

        return Resolve("portal", normalized.Length == 0 ? "index.html" : normalized, out artifactUnavailable);
    }

    public Stream OpenRead(FrontendArtifactFile file)
    {
        if (file.PhysicalPath is not null)
        {
            return File.OpenRead(file.PhysicalPath);
        }

        if (file.ResourceName is not null)
        {
            return _resourceAssembly.GetManifestResourceStream(file.ResourceName)
                ?? throw new FileNotFoundException("Embedded frontend artifact was not found.", file.ResourceName);
        }

        throw new FileNotFoundException("Frontend artifact does not have a readable source.", file.RequestPath);
    }

    private string Status(string app)
    {
        return ResolveIndex(app) is not null
            ? ComponentStatus.available.ToString()
            : ComponentStatus.unavailable.ToString();
    }

    private FrontendArtifactFile? Resolve(string app, string relative, out bool artifactUnavailable)
    {
        artifactUnavailable = false;
        var sanitized = relative.Replace('\\', '/').TrimStart('/');
        if (sanitized.Split('/', StringSplitOptions.RemoveEmptyEntries).Any(segment => segment == ".."))
        {
            return null;
        }

        var resolved = ResolveExact(app, sanitized);
        if (resolved is not null)
        {
            return resolved;
        }

        if (app != "portal" && IsDefinedMpaRoute(app, sanitized))
        {
            if (app == "workouts")
            {
                return ResolveExact(app, "detail.html") ?? ResolveIndex(app);
            }

            return ResolveIndex(app);
        }

        if (!HasAppArtifactRoot(app))
        {
            artifactUnavailable = true;
        }

        return null;
    }

    private FrontendArtifactFile? ResolveIndex(string app) => ResolveExact(app, "index.html");

    private static bool IsDefinedMpaRoute(string app, string relative)
    {
        var route = relative.Trim('/');
        return app switch
        {
            "workouts" => System.Text.RegularExpressions.Regex.IsMatch(route, @"^\d{4}-\d{2}-\d{2}$"),
            "machines" => System.Text.RegularExpressions.Regex.IsMatch(route, @"^[A-Za-z0-9][A-Za-z0-9_-]*$"),
            _ => false
        };
    }

    private FrontendArtifactFile? ResolveExact(string app, string relative)
    {
        var root = PhysicalRoot(app);
        if (Directory.Exists(root))
        {
            var candidate = Path.GetFullPath(Path.Combine(root, relative.Replace('/', Path.DirectorySeparatorChar)));
            var fullRoot = Path.GetFullPath(root);
            if (candidate.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase) && File.Exists(candidate))
            {
                return new FrontendArtifactFile(candidate, candidate, null);
            }
        }

        var embeddedPath = EmbeddedPath(app, relative);
        return _embeddedResources.TryGetValue(embeddedPath, out var resourceName)
            ? new FrontendArtifactFile(embeddedPath, null, resourceName)
            : null;
    }

    private bool HasAppArtifactRoot(string app) => Directory.Exists(PhysicalRoot(app)) || ResolveIndex(app) is not null;

    private string PhysicalRoot(string app) => app == "portal"
        ? _paths.FrontendArtifactRoot
        : Path.Combine(_paths.FrontendArtifactRoot, ArtifactNames[app]);

    private static string EmbeddedPath(string app, string relative)
    {
        var normalized = relative.Replace('\\', '/').TrimStart('/');
        return app == "portal"
            ? EmbeddedFrontendPrefix + normalized
            : EmbeddedFrontendPrefix + ArtifactNames[app] + "/" + normalized;
    }

    private static string NormalizeResourceName(string resourceName) => resourceName.Replace('\\', '/');
}
