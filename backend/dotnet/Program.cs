using Microsoft.Data.Sqlite;

var builder = WebApplication.CreateBuilder(args);

// Port: --urls argument > ASPNETCORE_URLS > PORT env > 3000
if (Environment.GetEnvironmentVariable("ASPNETCORE_URLS") is null
    && !args.Any(a => a.StartsWith("--urls")))
{
    var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(p =>
        p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var dbPath = Environment.GetEnvironmentVariable("DATABASE_URL") ?? "./health.db";
// WAL mode + connection string — vsak request dobi svojo povezavo iz pool-a
var connStr = $"Data Source={dbPath};Mode=ReadWriteCreate;Cache=Shared";
// Scoped = ena povezava na request, DI jo samodejno zapre ob koncu zahteve
builder.Services.AddScoped(_ =>
{
    var c = new SqliteConnection(connStr);
    c.Open();
    return c;
});
// Enkratna inicializacija baze ob zagonu
using var initConn = new SqliteConnection(connStr);
initConn.Open();
using var walCmd = initConn.CreateCommand();
walCmd.CommandText = "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;";
walCmd.ExecuteNonQuery();
var connection = initConn; // alias za init blok spodaj

var app = builder.Build();
app.UseCors();

// ── Inicializacija baze ───────────────────────────────────────────────────────
using (var cmd = connection.CreateCommand())
{
    cmd.CommandText = """
        CREATE TABLE IF NOT EXISTS symptoms (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            symptoms  TEXT    NOT NULL,
            date      TEXT    NOT NULL,
            timestamp INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS medications (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            dosage     TEXT NOT NULL,
            frequency  TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date   TEXT
        );
        CREATE TABLE IF NOT EXISTS visits (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_name TEXT NOT NULL,
            visit_date  TEXT NOT NULL,
            diagnosis   TEXT,
            notes       TEXT
        );
        CREATE TABLE IF NOT EXISTS subscriptions (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            subscription TEXT NOT NULL UNIQUE
        );
        """;
    cmd.ExecuteNonQuery();
}

// ── Pomožna metoda za branje vrstic v slovar ──────────────────────────────────
static List<Dictionary<string, object?>> ReadRows(SqliteCommand cmd)
{
    var rows = new List<Dictionary<string, object?>>();
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
        var row = new Dictionary<string, object?>();
        for (int i = 0; i < reader.FieldCount; i++)
            row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
        rows.Add(row);
    }
    return rows;
}

// ── Health check ──────────────────────────────────────────────────────────────
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// ── Simptomi ──────────────────────────────────────────────────────────────────
app.MapPost("/vnos", async (HttpContext ctx, SqliteConnection db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<Dictionary<string, string>>();
    if (body is null || !body.TryGetValue("symptoms", out var symptoms) || string.IsNullOrEmpty(symptoms)
        || !body.TryGetValue("date", out var date) || string.IsNullOrEmpty(date))
        return Results.BadRequest(new { error = "Manjkajo potrebni podatki" });

    using var cmd = db.CreateCommand();
    cmd.CommandText = "INSERT INTO symptoms (symptoms, date, timestamp) VALUES ($s, $d, $t)";
    cmd.Parameters.AddWithValue("$s", symptoms);
    cmd.Parameters.AddWithValue("$d", date);
    cmd.Parameters.AddWithValue("$t", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
    cmd.ExecuteNonQuery();

    using var idCmd = db.CreateCommand();
    idCmd.CommandText = "SELECT last_insert_rowid()";
    var id = (long)(idCmd.ExecuteScalar() ?? 0);

    return Results.Created($"/vnosi/{id}", new { id, symptoms, date });
});

app.MapGet("/vnosi", (SqliteConnection db) =>
{
    using var cmd = db.CreateCommand();
    cmd.CommandText = "SELECT * FROM symptoms ORDER BY timestamp DESC LIMIT 30";
    return Results.Ok(ReadRows(cmd));
});

// ── Zdravila ──────────────────────────────────────────────────────────────────
app.MapPost("/zdravila", async (HttpContext ctx, SqliteConnection db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<Dictionary<string, string?>>();
    if (body is null) return Results.BadRequest(new { error = "Manjkajo podatki" });

    body.TryGetValue("name", out var name);
    body.TryGetValue("dosage", out var dosage);
    body.TryGetValue("frequency", out var frequency);
    body.TryGetValue("start_date", out var startDate);
    body.TryGetValue("end_date", out var endDate);

    using var cmd = db.CreateCommand();
    cmd.CommandText = """
        INSERT INTO medications (name, dosage, frequency, start_date, end_date)
        VALUES ($name, $dosage, $freq, $start, $end)
        """;
    cmd.Parameters.AddWithValue("$name", name ?? "");
    cmd.Parameters.AddWithValue("$dosage", dosage ?? "");
    cmd.Parameters.AddWithValue("$freq", frequency ?? "");
    cmd.Parameters.AddWithValue("$start", startDate ?? "");
    cmd.Parameters.AddWithValue("$end", endDate is not null ? endDate : DBNull.Value);
    cmd.ExecuteNonQuery();

    using var idCmd = db.CreateCommand();
    idCmd.CommandText = "SELECT last_insert_rowid()";
    var id = (long)(idCmd.ExecuteScalar() ?? 0);

    return Results.Created($"/zdravila/{id}", new { id, name, dosage, frequency, start_date = startDate });
});

app.MapGet("/zdravila", (SqliteConnection db) =>
{
    using var cmd = db.CreateCommand();
    cmd.CommandText = "SELECT * FROM medications WHERE end_date IS NULL OR end_date > date('now')";
    return Results.Ok(ReadRows(cmd));
});

// ── Zdravniški obiski ─────────────────────────────────────────────────────────
app.MapPost("/objekti", async (HttpContext ctx, SqliteConnection db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<Dictionary<string, string?>>();
    if (body is null) return Results.BadRequest(new { error = "Manjkajo podatki" });

    body.TryGetValue("doctor_name", out var doctorName);
    body.TryGetValue("visit_date", out var visitDate);
    body.TryGetValue("diagnosis", out var diagnosis);
    body.TryGetValue("notes", out var notes);

    using var cmd = db.CreateCommand();
    cmd.CommandText = """
        INSERT INTO visits (doctor_name, visit_date, diagnosis, notes)
        VALUES ($doctor, $date, $diag, $notes)
        """;
    cmd.Parameters.AddWithValue("$doctor", doctorName ?? "");
    cmd.Parameters.AddWithValue("$date", visitDate ?? "");
    cmd.Parameters.AddWithValue("$diag", diagnosis is not null ? diagnosis : DBNull.Value);
    cmd.Parameters.AddWithValue("$notes", notes is not null ? notes : DBNull.Value);
    cmd.ExecuteNonQuery();

    using var idCmd = db.CreateCommand();
    idCmd.CommandText = "SELECT last_insert_rowid()";
    var id = (long)(idCmd.ExecuteScalar() ?? 0);

    return Results.Created($"/objekti/{id}", new { id, doctor_name = doctorName, visit_date = visitDate });
});

app.MapGet("/objekti", (SqliteConnection db) =>
{
    using var cmd = db.CreateCommand();
    cmd.CommandText = "SELECT * FROM visits ORDER BY visit_date DESC";
    return Results.Ok(ReadRows(cmd));
});

// ── Push naročnine ────────────────────────────────────────────────────────────
app.MapPost("/push/subscribe", async (HttpContext ctx, SqliteConnection db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<Dictionary<string, object>>();
    if (body is null || !body.TryGetValue("subscription", out var sub))
        return Results.BadRequest(new { error = "Manjka subscription" });

    try
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = "INSERT INTO subscriptions (subscription) VALUES ($s)";
        cmd.Parameters.AddWithValue("$s", sub?.ToString() ?? "");
        cmd.ExecuteNonQuery();
        return Results.Created("/push/subscribe", new { success = true });
    }
    catch (SqliteException ex) when (ex.Message.Contains("UNIQUE"))
    {
        return Results.Ok(new { success = true, message = "Already subscribed" });
    }
});

// ── Background Sync ───────────────────────────────────────────────────────────
app.MapPost("/sync", async (HttpContext ctx, SqliteConnection db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<Dictionary<string, object>>();
    if (body is null) return Results.BadRequest(new { error = "Manjka telo zahteve" });

    body.TryGetValue("type", out var typeObj);
    body.TryGetValue("data", out var dataObj);

    if (typeObj?.ToString() == "symptom" && dataObj is System.Text.Json.JsonElement dataEl)
    {
        var s = dataEl.GetProperty("symptoms").GetString() ?? "";
        var d = dataEl.GetProperty("date").GetString() ?? "";
        var t = dataEl.GetProperty("timestamp").GetInt64();

        using var cmd = db.CreateCommand();
        cmd.CommandText = "INSERT INTO symptoms (symptoms, date, timestamp) VALUES ($s, $d, $t)";
        cmd.Parameters.AddWithValue("$s", s);
        cmd.Parameters.AddWithValue("$d", d);
        cmd.Parameters.AddWithValue("$t", t);
        cmd.ExecuteNonQuery();
    }

    return Results.Ok(new { success = true });
});

// ── Izvoz podatkov ────────────────────────────────────────────────────────────
app.MapGet("/izvoz-pdf", (SqliteConnection db) =>
{
    List<Dictionary<string, object?>> Query(string sql)
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = sql;
        return ReadRows(cmd);
    }

    var symptoms   = Query("SELECT * FROM symptoms ORDER BY timestamp DESC");
    var medications = Query("SELECT * FROM medications");
    var visits     = Query("SELECT * FROM visits ORDER BY visit_date DESC");

    var symptomsLines = symptoms
        .Select(s => $"- {s["date"]}: {s["symptoms"]}")
        .DefaultIfEmpty("  Ni vnosov");
    var medsLines = medications
        .Select(m => $"- {m["name"]} {m["dosage"]} ({m["frequency"]})")
        .DefaultIfEmpty("  Ni vnosov");
    var visitsLines = visits
        .Select(v => $"- {v["doctor_name"]} ({v["visit_date"]}): {v["diagnosis"] ?? "Ni diagnoze"}")
        .DefaultIfEmpty("  Ni vnosov");

    var summary = $"""
        POVZETEK ZDRAVSTVENEGA DNEVNIKA
        Ustvarjen: {DateTime.Now:dd.MM.yyyy HH:mm}

        SIMPTOMI ({symptoms.Count})
        {string.Join('\n', symptomsLines)}

        ZDRAVILA ({medications.Count})
        {string.Join('\n', medsLines)}

        ZDRAVNIŠKI OBISKI ({visits.Count})
        {string.Join('\n', visitsLines)}
        """;

    return Results.Text(summary, "text/plain; charset=utf-8");
});

app.Run();
