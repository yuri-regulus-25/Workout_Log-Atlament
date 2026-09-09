using System.Text;
using Microsoft.Data.Sqlite;

namespace Atlament.Core;

public sealed class AfLog
{
    private readonly WindowsPathProvider _paths;
    private bool _sqliteReady;

    public AfLog(WindowsPathProvider paths)
    {
        _paths = paths;
    }

    public void Initialize()
    {
        Directory.CreateDirectory(_paths.LogRoot);
        using var connection = new SqliteConnection($"Data Source={Path.Combine(_paths.LogRoot, "integrated.sqlite")}");
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS logs (
                date TEXT NOT NULL,
                type TEXT NOT NULL,
                endpoint TEXT NULL,
                detail TEXT NOT NULL
            );
            DELETE FROM logs WHERE date < $threshold;
            """;
        command.Parameters.AddWithValue("$threshold", DateTimeOffset.UtcNow.AddHours(-672).ToString("O"));
        command.ExecuteNonQuery();
        _sqliteReady = true;
    }

    public void Write(LogType type, string detail, string? endpoint = null)
    {
        try
        {
            Directory.CreateDirectory(_paths.LogRoot);
            if (_sqliteReady)
            {
                using var connection = new SqliteConnection($"Data Source={Path.Combine(_paths.LogRoot, "integrated.sqlite")}");
                connection.Open();
                using var command = connection.CreateCommand();
                command.CommandText = "INSERT INTO logs(date, type, endpoint, detail) VALUES ($date, $type, $endpoint, $detail)";
                command.Parameters.AddWithValue("$date", DateTimeOffset.UtcNow.ToString("O"));
                command.Parameters.AddWithValue("$type", type.ToString());
                command.Parameters.AddWithValue("$endpoint", endpoint ?? "");
                command.Parameters.AddWithValue("$detail", detail);
                command.ExecuteNonQuery();
            }

            if (type is LogType.ERROR or LogType.FATAL)
            {
                // Text files are intentionally limited to severe failures. SQLite is the primary
                // operation log, but plain files remain useful when database initialization fails.
                AppendRotatingText(type == LogType.ERROR ? "error" : "fatal_error", type, detail, endpoint);
            }
        }
        catch
        {
            // Logging failure is explicitly non-fatal.
        }
    }

    private void AppendRotatingText(string fileName, LogType type, string detail, string? endpoint)
    {
        var path = Path.Combine(_paths.LogRoot, fileName);
        if (File.Exists(path) && File.GetCreationTimeUtc(path) < DateTime.UtcNow.AddHours(-24))
        {
            File.Delete(path);
        }

        File.AppendAllText(path, $"{DateTimeOffset.UtcNow:O}\t{type}\t{endpoint ?? ""}\t{detail}{Environment.NewLine}", Encoding.UTF8);
    }
}
