namespace Atlament;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        SynchronizationContext.SetSynchronizationContext(new WindowsFormsSynchronizationContext());
        var uiContext = SynchronizationContext.Current
            ?? throw new InvalidOperationException("Windows Forms synchronization context is unavailable.");

        using var startupCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        var bootstrap = WindowsBootstrap.StartAsync(uiContext, startupCts.Token).GetAwaiter().GetResult();
        if (bootstrap is null)
        {
            MessageBox.Show("Atlament is already running.", "Atlament", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        try
        {
            Application.Run(new AtlamentMainForm(bootstrap));
        }
        finally
        {
            bootstrap.DisposeAsync().AsTask().GetAwaiter().GetResult();
        }
    }
}
