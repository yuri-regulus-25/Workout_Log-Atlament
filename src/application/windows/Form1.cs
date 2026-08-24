using Microsoft.Web.WebView2.Core;

namespace Atlament;

public partial class Form1 : Form
{
    private readonly WindowsBootstrap _bootstrap;

    public Form1(WindowsBootstrap bootstrap)
    {
        _bootstrap = bootstrap;
        InitializeComponent();
    }

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        try
        {
            await webView.EnsureCoreWebView2Async();
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.ProcessFailed += WebViewProcessFailed;
            webView.Source = _bootstrap.HttpHost.BaseUri;
        }
        catch (Exception ex)
        {
            MessageBox.Show($"WebView2 initialization failed: {ex.Message}", "Atlament", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        webView.CoreWebView2?.Stop();
        _bootstrap.Application.BeginShutdown();
        base.OnFormClosing(e);
    }

    private void WebViewProcessFailed(object? sender, CoreWebView2ProcessFailedEventArgs e)
    {
        MessageBox.Show($"WebView2 process failed: {e.ProcessFailedKind}", "Atlament", MessageBoxButtons.OK, MessageBoxIcon.Warning);
    }
}
