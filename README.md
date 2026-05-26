# Osebni zdravstveni dnevnik - PWA

Progressive Web App za upravljanje osebnega zdravstvenega dnevnika z dostopnostjo (WCAG 2.2 AA) v ospredju.

## Arhitektura

### Frontend

- **Framework**: React + Vite
- **Storage**: IndexedDB + localStorage
- **APIs**: Web Speech (glasovni vnos), File (PDF), Vibration, Clipboard, Canvas

### PWA

- **Manifest**: Web App Manifest za installacijo
- **Service Worker**: 4 strategije cachiranja
  - Cache First: statični viri (HTML, CSS, JS)
  - Network First: zdravstveni podatki
  - Stale-While-Revalidate: grafi
  - Network Only: PDF izvoz
- **Offline**: Fallback za zadnje shranjene vnose
- **Background Sync**: Sinhronizacija brez interneta
- **Push Notifications**: Opomniki za zdravila
- **Periodic Sync**: Dnevni opomniki

### Backend (3 implementacije)

Vsi z SQLite bazo, enakimi endpointi:

1. **Node.js + Fastify** (`backend/nodejs`)
   - Hiter, lahek server
   - Primerno za produkcijo
   - Zahteva Node.js >= 16

2. **Deno + Hono** (`backend/deno`)
   - Privzeto varna izvedba
   - Sodobna arhitektura
   - Zahteva Deno runtime

3. **Bun + Elysia** (`backend/bun`)
   - Najhitrejša izvedba
   - Integrirane SQLite
   - Zahteva Bun runtime

## Namestitev

### Predpogoji

- Node.js >= 16 (za frontend)
- npm ali yarn

### Zagon celotne aplikacije z Dockerjem

Za zagon frontenda in Node.js backenda brez lokalne namestitve odvisnosti potrebujete Docker Desktop oziroma Docker Engine z Docker Compose.

V korenski mapi projekta zaženite:

```bash
docker compose up --build
```

Po zagonu sta dostopna:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

SQLite podatki backenda se shranijo v Docker volume `backend-data`, zato ostanejo ohranjeni tudi po ustavitvi containerjev.

Za ustavitev aplikacije uporabite:

```bash
docker compose down
```

Za ustavitev in izbris shranjenih podatkov uporabite:

```bash
docker compose down -v
```

Push obvestila niso potrebna za osnovni zagon. Če jih želite uporabljati, kopirajte `.env.example` v `.env`, vnesite veljavne VAPID ključe in ponovno zaženite `docker compose up --build`.

### Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Dostopen na: `http://localhost:5173`

### Setup Node.js Backend

```bash
cd backend/nodejs
npm install
node index.js
```

Dostopen na: `http://localhost:3000`

### Setup Deno Backend

```bash
cd backend/deno
deno run --allow-net --allow-read --allow-write main.ts
```

### Setup Bun Backend

```bash
cd backend/bun
bun install
bun index.ts
```

## API Endpointi

### Simptomi

- `POST /vnos` - Dodaj simptom
- `GET /vnosi` - Pridobi simptome (zadnjih 30)

### Zdravila

- `GET /zdravila` - Pridobi aktivna zdravila
- `POST /zdravila` - Dodaj zdravilo

### Zdravniški obiski

- `GET /obiski` - Pridobi obiski
- `POST /obiski` - Dodaj obisk

### Push Notifications

- `POST /push/subscribe` - Prijava za obvestila
- `POST /push/send` - Pošlji obvestilo

### Ostali

- `POST /sync` - Background sync
- `GET /izvoz-pdf` - Izvez povzetka
- `GET /health` - Status preverjanja

## Dostopnost (WCAG 2.2 AA)

✅ Semantični HTML (main, nav, section, article)
✅ ARIA oznake in vloge (aria-label, aria-live, role="alert")
✅ Vidni fokus (outline 3px)
✅ Tab vrstni red
✅ Kontrast 4.5:1 (AAA za besedilo)
✅ Velika pisava (3 velikosti: S, M, L)
✅ Visok kontrast način
✅ Glasovni vnos (Web Speech API)
✅ Haptični odzivi (Vibration API)

## Testiranje

### Accessibility

```bash
npm test -- accessibility.test.js
```

### API

```bash
npm test -- api.test.js
```

### Manual Testing

- NVDA (Windows) - bralna naprava
- VoiceOver (Mac/iOS)
- Lighthouse (Chrome DevTools)
- axe DevTools (browser extension)

## Zmogljivost

Primerjava 3 backend implementacij:

```bash
# Namestite k6
npm install -g k6

# Zaženite test
k6 run tests/performance.k6.js
```

## Struktura Projekta

```
MiniProjekt/
├── frontend/                  # React + Vite
│   ├── src/
│   │   ├── components/       # UI komponente
│   │   ├── pages/            # Strani
│   │   ├── context/          # Context provideri
│   │   ├── services/         # API klici
│   │   └── utils/            # Utility funkcije
│   └── public/
│       ├── manifest.json     # PWA manifest
│       └── sw.js             # Service Worker
│
├── backend/
│   ├── nodejs/               # Fastify + SQLite
│   ├── deno/                 # Hono + SQLite
│   └── bun/                  # Elysia + SQLite
│
└── tests/                    # Testna suitaa
    ├── accessibility.test.js
    └── api.test.js
```

## Funkcionalnosti

### Dnevnik simptomov

- Tipkanje ali glasovni vnos (Web Speech API)
- Avtomatski videk vnos
- Grafi trendov (Canvas API)
- Izvoz povzetka

### Seznam zdravil

- Dodaj zdravilo z odmerkom in pogostostjo
- Opomniki za jemanje
- Haptični signali (Vibration API)

### Zdravniški obiski

- Vnos obiska z diagnozo
- Nalaganje PDF dokumentov
- Prenos dokumentov

### Multi-profil

- Pacient ↔ Negovalec
- Podatki se deljijo med profili

### Offline delovanje

- Zadnji vnosi dostopni brez interneta
- Avtomatska sinhronizacija ob vrnitvi na splet
- Background Sync API

## Okoljske spremenljivke

Kopirajte `.env.example` v `.env` in izpolnite:

```bash
cp .env.example .env
```

Potrebni ključi:

- `VAPID_PUBLIC_KEY` - Za push obvestila
- `VAPID_PRIVATE_KEY` - Za push obvestila
- `REACT_APP_API_URL` - URL backenda

## Generiranje VAPID ključev

```bash
cd backend/nodejs
npx web-push generate-vapid-keys
```

Kopirajte ključe v `.env` datoteko.

## Build for Production

### Frontend

```bash
cd frontend
npm run build
```

### Backends

Vsi 3 backendi so pripravljeni za produkcijo kot-je. Preprosto zaženite z:

- Node.js: `node index.js`
- Deno: `deno run -A main.ts`
- Bun: `bun index.ts`

## Prispevanje

Projekt je namenjen študijskim namenom in primerjavi razvojnih platform.

## Licenca

MIT
