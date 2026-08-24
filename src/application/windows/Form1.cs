using Microsoft.Web.WebView2.Core;

namespace Atlament;

public partial class Form1 : Form
{
    private readonly WindowsBootstrap _bootstrap;
    private bool _initialSetupNoticeShown;

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
            await ShowInitialSetupNoticeIfNeededAsync();
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

    private async Task ShowInitialSetupNoticeIfNeededAsync()
    {
        if (_initialSetupNoticeShown)
        {
            return;
        }

        var status = _bootstrap.Application.GetStatus().Data;
        for (var attempt = 0; attempt < 1200 && status?.Operations.Startup == "running" && !IsDisposed; attempt++)
        {
            await Task.Delay(500);
            status = _bootstrap.Application.GetStatus().Data;
        }

        if (status is null || status.Operations.Startup == "running")
        {
            return;
        }

        var requiredActions = status.RequiredActions;
        if (requiredActions.Count == 0)
        {
            return;
        }

        _initialSetupNoticeShown = true;
        var message = "初期設定が必要です。\n\n"
            + DescribeRequiredActions(requiredActions)
            + "\nApplication Settingsを開きますか？";
        var result = MessageBox.Show(message, "Atlament", MessageBoxButtons.YesNo, MessageBoxIcon.Information);
        if (result == DialogResult.Yes)
        {
            webView.Source = new Uri(_bootstrap.HttpHost.BaseUri, "settings/");
        }
    }

    private static string DescribeRequiredActions(IReadOnlyList<string> requiredActions)
    {
        var lines = requiredActions.Select(action => action switch
        {
            "CONFIGURATION_REQUIRED" => "- リポジトリ接続情報の設定が必要です。",
            "CREDENTIAL_REQUIRED" => "- GitHub Tokenの設定が必要です。",
            "RUNTIME_DATA_REQUIRED" => "- 同期済みデータの作成が必要です。",
            _ => "- " + action
        });
        return string.Join("\n", lines) + "\n";
    }
}
