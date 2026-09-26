using Atlament.Core;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Atlament.Core.Write;

namespace Atlament.Host;

public sealed class AfHttpHost : IAsyncDisposable
{
    private readonly AtlamentApplication _application;
    private readonly HostingStatusService _hosting;
    private readonly AfLog _log;
    private readonly SynchronizationContext _uiContext;
    private WebApplication? _webApplication;

    public AfHttpHost(AtlamentApplication application, HostingStatusService hosting, AfLog log, SynchronizationContext uiContext)
    {
        _application = application;
        _hosting = hosting;
        _log = log;
        _uiContext = uiContext;
    }

    public int Port { get; private set; }
    public Uri BaseUri => new($"http://127.0.0.1:{Port}/");

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        foreach (var port in LocalhostEndpointPolicy.Ports)
        {
            try
            {
                _webApplication = BuildApplication(port);
                await _webApplication.StartAsync(cancellationToken);
                Port = port;
                _log.Write(LogType.INFO, $"HTTP server started on 127.0.0.1:{port}.");
                return;
            }
            catch (IOException)
            {
                // A previous instance or Android emulator bridge can own the primary port. Try the
                // secondary port before failing startup so the shell remains usable.
                _webApplication = null;
            }
            catch (InvalidOperationException)
            {
                _webApplication = null;
            }
        }

        throw new InvalidOperationException("Primary and secondary HTTP ports are unavailable.");
    }

    public async ValueTask DisposeAsync()
    {
        if (_webApplication is not null)
        {
            await _webApplication.StopAsync(TimeSpan.FromSeconds(10));
            await _webApplication.DisposeAsync();
            _webApplication = null;
        }
    }

    private WebApplication BuildApplication(int port)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(AfHttpHost).Assembly.FullName,
            Args = Array.Empty<string>()
        });

        builder.WebHost.UseKestrel(options => options.ListenLocalhost(port));
        var app = builder.Build();
        MapApi(app, "/api/v1/common");
        app.MapGet("/{**path}", ServeFrontendAsync);
        return app;
    }

    private void MapApi(WebApplication app, string prefix)
    {
        app.MapGet($"{prefix}/status", () => Results.Json(_application.GetStatus(), AfJson.Options));
        app.MapGet($"{prefix}/runtime/workouts", () =>
        {
            var response = _application.GetRuntimeWorkouts();
            return Results.Json(response, AfJson.Options, statusCode: response.Success ? 200 : 503);
        });
        app.MapGet($"{prefix}/workout-write/boundary", async (HttpContext context) =>
        {
            var result = await _application.GetWorkoutWriteBoundaryAsync(context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapGet($"{prefix}/workout-write/date/{{date}}", async (string date, HttpContext context) =>
        {
            var result = await _application.GetWorkoutWriteDateAsync(date, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapPost($"{prefix}/workout-write/sessions", async (HttpContext context) =>
        {
            var request = await context.Request.ReadFromJsonAsync<CreateRequest>(AfJson.Options, context.RequestAborted)
                ?? new CreateRequest(null, null);
            var result = await _application.CreateWorkoutSessionAsync(request, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapPut($"{prefix}/workout-write/sessions/{{sessionId}}", async (string sessionId, HttpContext context) =>
        {
            var request = await context.Request.ReadFromJsonAsync<UpdateRequest>(AfJson.Options, context.RequestAborted)
                ?? new UpdateRequest(null, null);
            var result = await _application.UpdateWorkoutSessionAsync(sessionId, request, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapDelete($"{prefix}/workout-write/sessions/{{sessionId}}", async (string sessionId, HttpContext context) =>
        {
            var request = await context.Request.ReadFromJsonAsync<DeleteRequest>(AfJson.Options, context.RequestAborted)
                ?? new DeleteRequest(null);
            var result = await _application.DeleteWorkoutSessionAsync(sessionId, request, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapPost($"{prefix}/sync", async (HttpContext context) =>
        {
            var result = await _application.ManualSyncAsync(context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapGet($"{prefix}/configuration", () => Results.Json(_application.GetConfiguration(), AfJson.Options));
        app.MapPost($"{prefix}/configuration", async (HttpContext context) =>
        {
            var update = await context.Request.ReadFromJsonAsync<ConfigurationUpdate>(AfJson.Options, context.RequestAborted)
                ?? new ConfigurationUpdate(null, null, null);
            var result = await _application.UpdateConfigurationAsync(update, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapGet($"{prefix}/credential/status", () => Results.Json(_application.GetCredentialStatus(), AfJson.Options));
        app.MapGet($"{prefix}/master-write/boundary", () => Results.Json(_application.GetMasterWriteBoundary(), AfJson.Options));
        app.MapGet($"{prefix}/master-write/unresolved", async (HttpContext context) =>
        {
            var result = await _application.GetUnresolvedMasterReferencesAsync(context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapGet($"{prefix}/master-write/documents/{{type}}", async (string type, HttpContext context) =>
        {
            var result = await _application.ReadMasterDocumentAsync(type, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapPut($"{prefix}/master-write/documents/{{type}}", async (string type, HttpContext context) =>
        {
            var update = await context.Request.ReadFromJsonAsync<MasterDocumentWriteRequest>(AfJson.Options, context.RequestAborted)
                ?? new MasterDocumentWriteRequest(null, null);
            var result = await _application.WriteMasterDocumentAsync(type, update, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapGet($"{prefix}/recovery/resources", async (HttpContext context) =>
        {
            var result = await _application.ListRecoveryResourcesAsync(context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapGet($"{prefix}/recovery/resources/{{resourceKey}}", async (string resourceKey, HttpContext context) =>
        {
            var result = await _application.GetRecoveryResourceAsync(resourceKey, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapGet($"{prefix}/recovery/resources/{{resourceKey}}/source", async (string resourceKey, HttpContext context) =>
        {
            var result = await _application.GetRecoverySourceAsync(resourceKey, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapGet($"{prefix}/recovery/resources/{{resourceKey}}/draft", async (string resourceKey, HttpContext context) =>
        {
            var result = await _application.GetRecoveryDraftAsync(resourceKey, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapPost($"{prefix}/recovery/resources/{{resourceKey}}/draft", async (string resourceKey, HttpContext context) =>
        {
            var result = await _application.CreateRecoveryDraftAsync(resourceKey, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapPut($"{prefix}/recovery/resources/{{resourceKey}}/draft", async (string resourceKey, HttpContext context) =>
        {
            var update = await context.Request.ReadFromJsonAsync<RecoveryDraftUpdate>(AfJson.Options, context.RequestAborted)
                ?? new RecoveryDraftUpdate(null, Array.Empty<System.Text.Json.Nodes.JsonObject>());
            var result = await _application.UpdateRecoveryDraftAsync(resourceKey, update, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapDelete($"{prefix}/recovery/resources/{{resourceKey}}/draft", async (string resourceKey, HttpContext context) =>
        {
            var result = await _application.DeleteRecoveryDraftAsync(resourceKey, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapPost($"{prefix}/recovery/resources/{{resourceKey}}/validate", async (string resourceKey, HttpContext context) =>
        {
            var result = await _application.ValidateRecoveryDraftAsync(resourceKey, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapPost($"{prefix}/recovery/resources/{{resourceKey}}/commit", async (string resourceKey, HttpContext context) =>
        {
            var request = await context.Request.ReadFromJsonAsync<RecoveryCommitRequest>(AfJson.Options, context.RequestAborted)
                ?? new RecoveryCommitRequest(null, null);
            var result = await _application.CommitRecoveryDraftAsync(resourceKey, request, context.RequestAborted);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapPost($"{prefix}/credential", async (HttpContext context) =>
        {
            var update = await context.Request.ReadFromJsonAsync<CredentialUpdate>(AfJson.Options, context.RequestAborted)
                ?? new CredentialUpdate(null, null);
            var result = _application.UpdateCredential(update);
            return Results.Json(result.Response, AfJson.Options, statusCode: result.StatusCode);
        });
        app.MapPost($"{prefix}/shutdown", (IHostApplicationLifetime lifetime) =>
        {
            var response = _application.BeginShutdown();
            _ = Task.Run(async () =>
            {
                await Task.Delay(150).ConfigureAwait(false);
                _uiContext.Post(_ => System.Windows.Forms.Application.Exit(), null);
            });
            return Results.Json(response, AfJson.Options);
        });
    }

    private async Task ServeFrontendAsync(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            // Unknown API routes should not fall through to index.html; clients rely on HTTP
            // status to distinguish routing mistakes from missing Frontend assets.
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        var file = _hosting.TryResolveFile(context.Request.Path.Value ?? "/", out var artifactUnavailable);
        if (artifactUnavailable)
        {
            // 503 means the application is alive but its static Frontend artifact is not available.
            // This is distinct from a user navigating to an unknown route.
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await context.Response.WriteAsJsonAsync(AfResponses.Fail<object>(
                new AfError(AfErrorCodes.HostingArtifactNotFound, "エラーが発生しました。アプリケーションを再起動してください。", true)), AfJson.Options);
            return;
        }

        if (file is null)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        context.Response.ContentType = GetContentType(file.RequestPath);
        await using var stream = _hosting.OpenRead(file);
        await stream.CopyToAsync(context.Response.Body, context.RequestAborted);
    }

    private static string GetContentType(string path) => Path.GetExtension(path).ToLowerInvariant() switch
    {
        ".html" => "text/html; charset=utf-8",
        ".js" => "text/javascript; charset=utf-8",
        ".css" => "text/css; charset=utf-8",
        ".json" => "application/json; charset=utf-8",
        ".svg" => "image/svg+xml",
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".ico" => "image/x-icon",
        ".woff" => "font/woff",
        ".woff2" => "font/woff2",
        ".ttf" => "font/ttf",
        ".eot" => "application/vnd.ms-fontobject",
        _ => "application/octet-stream"
    };
}
