using Atlament.Core;
using Atlament.Host;

namespace Atlament;

public sealed class WindowsBootstrap : IAsyncDisposable
{
    private readonly Mutex _singleInstanceMutex;

    private WindowsBootstrap(Mutex singleInstanceMutex, WindowsPathProvider paths, AtlamentApplication application, AfHttpHost httpHost)
    {
        _singleInstanceMutex = singleInstanceMutex;
        Paths = paths;
        Application = application;
        HttpHost = httpHost;
    }

    public WindowsPathProvider Paths { get; }
    public AtlamentApplication Application { get; }
    public AfHttpHost HttpHost { get; }

    public static async Task<WindowsBootstrap?> StartAsync(SynchronizationContext uiContext, CancellationToken cancellationToken)
    {
        var mutex = new Mutex(false, "Atlament.Windows.AF.SingleInstance", out var created);
        if (!created)
        {
            mutex.Dispose();
            return null;
        }

        var paths = new WindowsPathProvider(AppContext.BaseDirectory);
        var log = new AfLog(paths);
        var configuration = new ConfigurationStore(paths);
        var credential = new CredentialStore(paths);
        var runtime = new RuntimeDataStore(paths);
        var builder = new RuntimeDataBuilder();
        var github = new GithubAccessService();
        var hosting = new HostingStatusService(paths);
        var recovery = new RecoveryService(new RecoveryDraftStore(paths));
        var application = new AtlamentApplication(configuration, credential, runtime, builder, github, hosting, log, recovery);
        var httpHost = new AfHttpHost(application, hosting, log, uiContext);
        var bootstrap = new WindowsBootstrap(mutex, paths, application, httpHost);

        await application.StartAsync(cancellationToken).ConfigureAwait(false);
        await httpHost.StartAsync(cancellationToken).ConfigureAwait(false);
        return bootstrap;
    }

    public async ValueTask DisposeAsync()
    {
        Application.BeginShutdown();
        await HttpHost.DisposeAsync().ConfigureAwait(false);
        _singleInstanceMutex.Dispose();
    }
}
