# Osebni zdravstveni dnevnik — PWA

Progressive Web App za upravljanje osebnega zdravstvenega dnevnika s poudarkom na dostopnosti (WCAG 2.2 AA).

## Ideja in ciljna skupina

Aplikacija je namenjena **bolnikom s kroničnimi boleznimi in njihovim skrbnikom**, ki potrebujejo enostavno orodje za:
- dnevno beleženje simptomov (vključno z glasovnim vnosom)
- upravljanje zdravil in opomnikov
- vodenje zgodovine zdravniških obiskov z možnostjo nalaganja PDF dokumentov
- vizualizacijo trendov simptomov v obliki grafov

Ključna prednost je **dostopnost** — aplikacija je zasnovana za uporabnike z motoričnimi, vidnimi ali kognitivnimi ovirami.

---

## Navodila za zagon

### Predpogoji

- Node.js >= 18
- .NET 8 SDK (za .NET backend)
- Ruby 3.3 + Bundler (za Ruby backend)
- k6 (za performance teste, opcijsko)

### 1. Backend — Node.js (privzeto, port 3000)

```bash
cd backend/nodejs
npm install
npm start
```

### 2. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

### 3. Alternativni backendi

```bash
# .NET 8 — port 3001
cd backend/dotnet
dotnet run --urls http://localhost:3001

# Ruby — port 3002
cd backend/ruby
bundle install
bundle exec puma -p 3002 config.ru
```

### 4. Docker (Node.js + frontend skupaj)

```bash
cp .env.example .env    # nastavi VAPID ključe
docker compose up --build
# Frontend: http://localhost:5173
# API:      http://localhost:3000
```

### 5. Push obvestila — VAPID ključi

```bash
cd backend/nodejs
npx web-push generate-vapid-keys
# Kopiraj ključe v backend/nodejs/.env in frontend/.env
```

---

## PWA zmožnosti

### Web App Manifest

Veljavna konfiguracija z SVG ikonami (any + maskable), imenom, kratkim imenom, `display: standalone`, orientacijo in bližnjicami:
- Bližnjica »Dnevnik simptomov« → `/?page=diary`
- Bližnjica »Seznam zdravil« → `/?page=medications`

### Service Worker (`/public/sw.js`)

Service Worker ima aktivno vlogo — prestreza vse zahteve in odloča med omrežjem in predpomnilnikom:

| Vrsta vira | Strategija | Razlog |
|-----------|------------|--------|
| CSS, JS, SVG, ikone | **Cache First** | Statični viri; hitrejši zagon brez omrežja |
| `/vnosi`, `/zdravila` | **Network First** | Zdravstveni podatki morajo biti sveži; predpomnilnik kot varnostna mreža |
| `/grafi` | **Stale-While-Revalidate** | Hitrejši prikaz, posodobitev v ozadju |
| `/izvoz-pdf` | **Network Only** | Izvoz mora biti vedno svež |

### Napredne zmožnosti

- **Background Sync** — simptomi, vneseni brez povezave, se sinhronizirajo z backendom, ko se omrežje obnovi (`sync-health-data`)
- **Push Notifications** — backend pošilja push obvestila prek VAPID; frontend se naroči v nastavitvah
- **Periodic Background Sync** — dnevni opomnik za vnos simptomov (`daily-health-reminder`)

### Offline delovanje

Aplikacija deluje brez interneta:
- IndexedDB hrani vse podatke lokalno
- Service Worker vrne predpomnjene odzive
- Ob vrnitvi na splet Background Sync pošlje čakajoče podatke

---

## Sodobni spletni API-ji

| API | Kje | Opis |
|-----|-----|------|
| **Web Speech API** | `SymptomDiary.jsx` | Glasovni vnos simptomov v slovenščini (`sl-SI`) |
| **Canvas API** | `TrendGraphs.jsx` | Črtni graf simptomov za zadnjih 30 dni |
| **IndexedDB API** | `DBContext.jsx` | Lokalna baza (simptomi, zdravila, obiski, sync queue) |
| **Vibration API** | `SymptomDiary.jsx` | Haptični odziv ob uspešnem shranjevanju |
| **File API** | `HealthVisits.jsx` | Nalaganje in prenos PDF dokumentov (izvidi, napotnice) |
| **Clipboard API** | `Settings.jsx` | Kopiranje povzetka dnevnika v odložišče |

---

## Strežniški del in primerjava okolij

Tri enakovredne implementacije z istim REST API-jem in SQLite bazo:

| Backend | Ogrodje | Port | Zagon |
|---------|---------|------|-------|
| **Node.js** | Fastify 5 + better-sqlite3 | 3000 | `npm start` |
| **.NET 8** | ASP.NET Core Minimal API + Microsoft.Data.Sqlite | 3001 | `dotnet run --urls http://localhost:3001` |
| **Ruby 3.3** | Sinatra 4 + Puma 6 | 3002 | `bundle exec puma -p 3002 config.ru` |

### Primerjava razvoja

| Kriterij | Node.js | .NET | Ruby |
|----------|---------|------|------|
| Hitrost zagona | ~0.5s | ~3s (JIT) | ~1s |
| Struktura kode | Funkcionalna | Funkcionalna (Minimal API) | DSL (route bloki) |
| Type safety | ❌ | ✅ C# | ❌ |
| Zahtevnost namestitve | npm install | dotnet restore | bundle install |

### REST API endpointi

| Metoda | Pot | Opis |
|--------|-----|------|
| GET | `/health` | Health check |
| POST | `/vnos` | Dodaj simptom |
| GET | `/vnosi` | Simptomi (zadnjih 30) |
| POST | `/zdravila` | Dodaj zdravilo |
| GET | `/zdravila` | Aktivna zdravila |
| POST | `/objekti` | Dodaj zdravniški obisk |
| GET | `/objekti` | Seznam obiskov |
| POST | `/push/subscribe` | Naroči se na push obvestila |
| POST | `/sync` | Background sync |
| GET | `/izvoz-pdf` | Izvoz povzetka kot text |

---

## Testiranje

### Accessibility testi — Playwright + axe-core

```bash
cd frontend
npm run test:a11y           # zaženi teste
npm run test:a11y:report    # HTML poročilo v playwright-report/
```

**Rezultat: 14/14 testov uspešnih**

Pokriva: WCAG kršitve (vseh 5 strani), skip link, tipkovnična navigacija, live region, aria-current, canvas opis, visok kontrast, mobilni prikaz.

### API testi — Jest

```bash
cd backend/nodejs
npm start          # backend mora teči
npm test           # v ločenem terminalu
```

Pokriva vse endpointe: health, simptomi, zdravila, obiski, sync, izvoz.

### Performance testi — k6

```bash
# Vsak backend na svojem portu
k6 run tests/k6-performance.js                                       # Node.js
k6 run --env API_URL=http://localhost:3001 tests/k6-performance.js   # .NET
k6 run --env API_URL=http://localhost:3002 tests/k6-performance.js   # Ruby
```

**Rezultati** (smoke + load + stress, 50 VU):

| Backend | req/s | p95 | Napake |
|---------|------:|----:|--------|
| Node.js | 138 | 19ms | 0% ✅ |
| .NET | 125 | 160ms | 0% ✅ |
| Ruby | 42 | 277ms | 0% ✅ |

Podrobnosti: [`tests/k6-comparison.md`](tests/k6-comparison.md)

---

## Poročilo o dostopnosti (WCAG 2.2 AA)

Preverjeno z axe-core 4.11 prek Playwright. **14/14 testov zelenih.**

| Zahteva | Status | Opomba |
|---------|--------|--------|
| Semantični HTML | ✅ | `<header>`, `<nav>`, `<main>`, `<section>`, `<time>` |
| Hierarhija naslovov | ✅ | H1 → H2 → H3 na vseh straneh |
| Skip link | ✅ | »Preskoči na vsebino« — viden ob Tab fokusu |
| Tipkovnična navigacija | ✅ | Vsi elementi dosegljivi; Enter/Space aktivira gumbe |
| Vidni fokus | ✅ | `outline: 3px solid #0c5394` povsod |
| Kontrast 4.5:1 | ✅ | Popravljeno: `btn-voice` (#1a56db=6.2:1), `empty-state` (#595959=6.7:1), `nav-label` |
| ARIA labele | ✅ | `aria-label` na vseh gumbih, `aria-pressed` na toggleih |
| Dostopni obrazci | ✅ | `<label for="...">`, `aria-describedby` za pomoč |
| Live regioni | ✅ | Navigacijske objave + online/offline status |
| Canvas dostopnost | ✅ | `role="img"` + `aria-label` + tabelarični prikaz pod grafom |
| Zmanjšano gibanje | ✅ | `prefers-reduced-motion` — animacije izklopljene |
| Visok kontrast | ✅ | Preklop v nastavitvah; vse barve #000/#fff |
| Prilagoditev pisave | ✅ | 3 velikosti (S/M/L) v nastavitvah |
| Podpora bralnikov zaslona | ✅ | Testirano z axe-core |

---

## Struktura projekta

```
MiniProjekt/
├── frontend/                    # React 19 + Vite
│   ├── public/
│   │   ├── manifest.json        # Web App Manifest (SVG ikone, bližnjice)
│   │   ├── sw.js                # Service Worker (4 strategije + Background Sync + Push)
│   │   ├── icon.svg             # Główna ikona
│   │   └── icon-maskable.svg    # Maskable ikona
│   ├── src/
│   │   ├── pages/               # SymptomDiary, MedicationList, HealthVisits, TrendGraphs, Settings
│   │   ├── components/          # Header, Navigation
│   │   └── context/             # DBContext (IndexedDB), ProfileContext
│   └── tests/
│       └── accessibility.spec.js  # 14 Playwright + axe-core testov
├── backend/
│   ├── nodejs/                  # Fastify 5 (port 3000) — privzeto
│   │   └── tests/api.test.js
│   ├── dotnet/                  # ASP.NET Core 8 Minimal API (port 3001)
│   └── ruby/                    # Sinatra 4 + Puma (port 3002)
├── tests/
│   ├── k6-performance.js        # k6 obremenitveni testi
│   ├── k6-comparison.md         # Rezultati primerjave
│   └── k6-report-dotnet.json    # Podroben report
└── compose.yaml                 # Docker Compose
```

---

## Okoljske spremenljivke

```bash
cp .env.example .env
```

| Spremenljivka | Opis |
|---------------|------|
| `VAPID_PUBLIC_KEY` | Javni VAPID ključ za push obvestila |
| `VAPID_PRIVATE_KEY` | Zasebni VAPID ključ |
| `VAPID_SUBJECT` | E-poštni naslov pošiljatelja |
| `DATABASE_URL` | Pot do SQLite baze (privzeto `./health.db`) |
| `VITE_VAPID_PUBLIC_KEY` | Javni ključ za frontend |
| `VITE_API_URL` | URL backenda (privzeto `http://localhost:3000`) |

---

## Licenca

MIT
