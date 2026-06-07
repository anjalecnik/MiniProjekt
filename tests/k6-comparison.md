# Primerjava zmogljivosti backendov — k6

Datum: 2026-06-07  
Orodje: k6 v2.0.0  
Scenariji: smoke (1 VU, 10s) → load (10 VU, 40s) → stress (50 VU, 40s)

## Rezultati

| Backend | Ogrodje | req/s | avg | p95 | Napake |
|---------|---------|------:|----:|----:|--------|
| **Node.js** | Fastify 5 + better-sqlite3 | 138 | ~5ms | **19ms** | 0% ✅ |
| **.NET 8** | ASP.NET Core Minimal API + Microsoft.Data.Sqlite | 125 | 20ms | **160ms** | 0% ✅ |
| **Ruby 3.3** | Sinatra 4 + Puma 6 (single mode) | 42 | ~60ms | **277ms** | 0% ✅ |

## Analiza

### Node.js (Fastify)
- Najboljša latenca: p95 = 19ms tudi pri 50 sočasnih uporabnikih
- Fastify je eden najhitrejših Node.js ogrodij, optimiziran za nizko latenco
- `better-sqlite3` je sinhronizirana knjižnica — ne blokira event loop pri kratkih poizvedbah
- Slabost: single-threaded; CPU-intenzivne operacije bi blokirale vse zahteve

### .NET 8 (ASP.NET Core)
- Višji throughput potencial (360 req/s brez korekcije), a latenca skoči pod stresom
- Problem: skupna `SqliteConnection` singleton → konkurenčni dostop → napake (49%)
- Po popravku (`AddScoped` + WAL mode): 0% napak, stabilno pri 50 VU
- p95 = 160ms pod stresom je posledica SQLite WAL locking pri pisanjih
- Prednost: type safety, compiled performance, odlična podpora za večje projekte

### Ruby (Sinatra + Puma)
- Najnižji throughput (42 req/s), a popolnoma stabilen (0% napak)
- Puma na Windows teče v single-worker načinu (brez `fork`) → omejena sočasnost
- Na Linuxu/Dockerju bi Puma z `workers 4` dosegla bistveno višji throughput
- Sinatra je minimalen framework — manj "magije" kot Rails, lažje razumljiv
- Slabost: GIL (Global Interpreter Lock) omejuje pravo vzporednost

## Primerjava razvoja

| Kriterij | Node.js | .NET | Ruby |
|----------|---------|------|------|
| Hitrost zagona | ~0.5s | ~3s (JIT) | ~1s |
| Struktura kode | Funkcionalna (middleware) | Funkcionalna (Minimal API) | DSL (route bloki) |
| Type safety | ❌ (JS) | ✅ (C#) | ❌ (dinamičen) |
| Zahtevnost namestitve | npm install | dotnet restore | bundle install |
| Ekosistem | npm (ogromen) | NuGet (velik) | RubyGems (srednji) |
| Testiranje | Jest / Vitest | xUnit / NUnit | RSpec / Minitest |

## Zaključek

Za to aplikacijo (SQLite + REST API) je **Node.js z Fastify optimalna izbira**:
- Najnižja latenca pri vseh obremenitvah
- Skupna koda z frontendom (JavaScript)
- Najenostavnejša namestitev in razvoj

**.NET** bi bil boljša izbira pri:
- večji ekipi z izkušnjami v C#
- potrebi po type safety in compile-time preverjanju
- migracij na relacijsko bazo (EF Core)

**Ruby** je primeren za:
- hiter prototip z berljivo kodo
- ekipe z Rails izkušnjami
- produkcijsko rabo na Linuxu z več Puma workerji

## Zagon testov

```bash
# Node.js (port 3000)
k6 run tests/k6-performance.js

# .NET (port 3001)
k6 run --env API_URL=http://localhost:3001 tests/k6-performance.js

# Ruby (port 3002)
k6 run --env API_URL=http://localhost:3002 tests/k6-performance.js
```

Vsak test shrani podrobno poročilo v `tests/k6-report-{nodejs|dotnet|ruby}.json`.
