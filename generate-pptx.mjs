import PptxGenJS from 'pptxgenjs';

const pptx = new PptxGenJS();

// ── Barve ─────────────────────────────────────────────────────────────────────
const GREEN  = '1e7e34';
const BLUE   = '0c5394';
const DARK   = '1a1a2e';
const LIGHT  = 'f4f7f6';
const WHITE  = 'ffffff';
const GRAY   = '595959';
const ACCENT = '2ecc71';

// ── Skupna tema ───────────────────────────────────────────────────────────────
pptx.layout  = 'LAYOUT_WIDE';
pptx.subject = 'Mini projekt — Sodobne tehnologije';
pptx.author  = 'Anja Lečnik';

// ── Pomožne funkcije ──────────────────────────────────────────────────────────
function headerSlide(slide, title, subtitle) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: DARK } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 3.8, w: '100%', h: 0.06, fill: { color: GREEN } });
  slide.addText(title, {
    x: 0.6, y: 1.2, w: 11.8, h: 1.6,
    fontSize: 40, bold: true, color: WHITE, fontFace: 'Calibri',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6, y: 2.9, w: 11.8, h: 0.8,
      fontSize: 20, color: ACCENT, fontFace: 'Calibri',
    });
  }
}

function contentSlide(title) {
  const slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: GREEN } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 1.0, w: '100%', h: 4.75, fill: { color: WHITE } });
  slide.addText(title, {
    x: 0.4, y: 0.1, w: 12.2, h: 0.8,
    fontSize: 26, bold: true, color: WHITE, fontFace: 'Calibri',
  });
  return slide;
}

function bullets(slide, items, opts = {}) {
  const { x = 0.5, y = 1.2, w = 12, h = 3.4, size = 16 } = opts;
  slide.addText(items.map(([txt, indent = 0]) => ({
    text: txt,
    options: {
      bullet: { indent: indent * 20 },
      fontSize: size,
      color: indent > 0 ? GRAY : DARK,
      fontFace: 'Calibri',
      paraSpaceAfter: indent > 0 ? 2 : 6,
    },
  })), { x, y, w, h, valign: 'top' });
}

function twoCol(slide, leftItems, rightItems, opts = {}) {
  const { y = 1.2, h = 3.4, size = 15 } = opts;
  const fmt = items => items.map(([txt, indent = 0]) => ({
    text: txt,
    options: {
      bullet: { indent: indent * 20 },
      fontSize: size,
      color: indent > 0 ? GRAY : DARK,
      fontFace: 'Calibri',
      paraSpaceAfter: indent > 0 ? 2 : 5,
    },
  }));
  slide.addText(fmt(leftItems),  { x: 0.4, y, w: 6.0, h, valign: 'top' });
  slide.addText(fmt(rightItems), { x: 6.6, y, w: 6.0, h, valign: 'top' });
}

function badge(slide, text, x, y, color = GREEN) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: 1.8, h: 0.42, fill: { color }, rectRadius: 0.08,
  });
  slide.addText(text, {
    x, y, w: 1.8, h: 0.42,
    fontSize: 13, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri',
  });
}

function table(slide, head, rows, opts = {}) {
  const { x = 0.4, y = 1.2, w = 12.2, colW } = opts;
  const data = [
    head.map(h => ({ text: h, options: { bold: true, color: WHITE, fill: GREEN, fontSize: 13, fontFace: 'Calibri', align: 'center' } })),
    ...rows.map(row => row.map((cell, i) => ({
      text: cell,
      options: { fontSize: 12, color: DARK, fontFace: 'Calibri', align: i === 0 ? 'left' : 'center' },
    }))),
  ];
  slide.addTable(data, { x, y, w, colW, rowH: 0.38, border: { pt: 1, color: 'dddddd' } });
}

// ════════════════════════════════════════════════════════════════════════════════
// 1. NASLOVNICA
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  headerSlide(slide, 'Osebni zdravstveni dnevnik', 'Progressive Web App · Sodobne tehnologije 2025/26');
  slide.addText('Anja Lečnik', {
    x: 0.6, y: 4.1, w: 6, h: 0.5, fontSize: 16, color: '9ca3af', fontFace: 'Calibri',
  });
  slide.addText('9. / 11. junij 2026', {
    x: 0.6, y: 4.55, w: 6, h: 0.4, fontSize: 14, color: '6b7280', fontFace: 'Calibri',
  });
  ['PWA', 'WCAG 2.2 AA', 'Node.js · .NET · Ruby'].forEach((t, i) => {
    badge(slide, t, 8.5 + (i === 2 ? -0.3 : 0), 4.0 + i * 0.55, i === 1 ? BLUE : GREEN);
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// 2. IDEJA IN CILJNA SKUPINA
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = contentSlide('Ideja in ciljna skupina');
  twoCol(slide,
    [
      ['Problem', 0],
      ['Bolniki s kroničnimi boleznimi', 1],
      ['nimajo enostavnega digitalnega orodja', 1],
      ['za sledenje simptomov, zdravil in obiskov', 1],
      ['', 0],
      ['Rešitev', 0],
      ['Osebni zdravstveni dnevnik kot PWA', 1],
      ['deluje offline, na vseh napravah,', 1],
      ['dostopen vsem uporabnikom', 1],
    ],
    [
      ['Ciljna skupina', 0],
      ['Bolniki s kroničnimi boleznimi', 1],
      ['Starejši odrasli', 1],
      ['Skrbniki / negovalci', 1],
      ['Uporabniki z motoričnimi ovirami', 1],
      ['', 0],
      ['Profili', 0],
      ['Pacient / Negovalec', 1],
      ['skupni podatki, ločeni pogledi', 1],
    ],
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. FUNKCIONALNOSTI APLIKACIJE
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = contentSlide('Funkcionalnosti aplikacije');
  twoCol(slide,
    [
      ['Dnevnik simptomov', 0],
      ['Tipkanje ali glasovni vnos (sl-SI)', 1],
      ['Haptični odziv ob shranjevanju', 1],
      ['', 0],
      ['Trendni grafi', 0],
      ['Canvas API — zadnjih 30 dni', 1],
      ['Dostopna tabela pod grafom', 1],
      ['', 0],
      ['Izvoz podatkov', 0],
      ['TXT povzetek + kopija v odložišče', 1],
    ],
    [
      ['Seznam zdravil', 0],
      ['Ime, odmerek, pogostost, datum', 1],
      ['Opomniki prek Push Notifications', 1],
      ['', 0],
      ['Zdravniški obiski', 0],
      ['Vnos z diagnozo in opombami', 1],
      ['Nalaganje PDF dokumentov (File API)', 1],
      ['', 0],
      ['Nastavitve', 0],
      ['Pisava S/M/L, visok kontrast, Push', 1],
    ],
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. PWA — KLJUČNI ELEMENTI
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = contentSlide('PWA — ključni elementi');
  bullets(slide, [
    ['Web App Manifest', 0],
    ['SVG ikone (any + maskable), bližnjice, standalone način', 1],
    ['Service Worker (/public/sw.js)', 0],
    ['Prestreza vse omrežne zahteve — 4 strategije predpomnjenja', 1],
    ['Namestitev (A2HS)', 0],
    ['beforeinstallprompt → namestitveni dialog v brskalniku', 1],
    ['Offline delovanje', 0],
    ['IndexedDB shranjuje vse lokalno; aplikacija deluje brez interneta', 1],
    ['Bližnjice', 0],
    ['Manifest shortcuts → /?page=diary, /?page=medications', 1],
  ], { size: 15 });
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. SERVICE WORKER — STRATEGIJE PREDPOMNJENJA
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = contentSlide('Service Worker — strategije predpomnjenja');
  table(slide,
    ['Vrsta vira', 'Strategija', 'Zakaj'],
    [
      ['CSS, JS, SVG, ikone', 'Cache First', 'Statični viri; takojšen zagon brez omrežja'],
      ['/vnosi, /zdravila', 'Network First', 'Podatki morajo biti sveži; predpomnilnik kot varnostna mreža'],
      ['/grafi', 'Stale-While-Revalidate', 'Hiter prikaz + posodobitev v ozadju'],
      ['/izvoz-pdf', 'Network Only', 'Izvoz mora biti vedno svež'],
    ],
    { y: 1.25, colW: [3.2, 2.8, 6.0] },
  );
  bullets(slide, [
    ['Napredne zmožnosti v ozadju', 0],
    ['Background Sync — simptomi čakajo v vrsti (IndexedDB), se pošljejo ob vrnitvi na splet', 1],
    ['Push Notifications — VAPID ključi, server pošilja, brskalnik prikaže (tudi ko je app zaprta)', 1],
    ['Periodic Background Sync — dnevni opomnik za vnos simptomov', 1],
  ], { y: 3.2, h: 1.5, size: 14 });
}

// ════════════════════════════════════════════════════════════════════════════════
// 6. SODOBNI SPLETNI API-JI
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = contentSlide('Sodobni spletni API-ji');
  table(slide,
    ['API', 'Kje', 'Uporaba'],
    [
      ['Web Speech API', 'SymptomDiary', 'Glasovni vnos simptomov v slovenščini (sl-SI)'],
      ['Canvas API', 'TrendGraphs', 'Črtni graf simptomov za zadnjih 30 dni'],
      ['IndexedDB API', 'DBContext', 'Lokalna baza — offline delovanje'],
      ['Vibration API', 'SymptomDiary', 'Haptični odziv ob uspešnem shranjevanju'],
      ['File API', 'HealthVisits', 'Nalaganje in prenos PDF dokumentov'],
      ['Clipboard API', 'Settings', 'Kopiranje povzetka v odložišče'],
    ],
    { y: 1.25, colW: [2.6, 2.4, 7.0] },
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 7. STREŽNIŠKI DEL — 3 IMPLEMENTACIJE
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = contentSlide('Strežniški del — 3 implementacije');
  table(slide,
    ['Kriterij', 'Node.js (Fastify)', '.NET 8 (ASP.NET Core)', 'Ruby (Sinatra + Puma)'],
    [
      ['Port',           '3000',             '3001',               '3002'],
      ['Hitrost zagona', '~0.5s',            '~3s (JIT)',           '~1s'],
      ['Type safety',    '❌ JavaScript',    '✅ C#',              '❌ dinamičen'],
      ['Namestitev',     'npm install',       'dotnet restore',     'bundle install'],
      ['Testiranje',     'Jest / supertest',  'xUnit / NUnit',      'RSpec / Minitest'],
    ],
    { y: 1.25, colW: [2.5, 2.8, 3.2, 3.5] },
  );
  slide.addText('Vsi delijo iste REST endpointe in SQLite bazo', {
    x: 0.4, y: 4.25, w: 12.2, h: 0.4,
    fontSize: 14, italic: true, color: GRAY, fontFace: 'Calibri',
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// 8. K6 PERFORMANCE — REZULTATI
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = contentSlide('k6 performance — primerjava backendov');
  table(slide,
    ['Backend', 'req/s', 'p95 latenca', 'Napake', 'Opomba'],
    [
      ['Node.js (Fastify)',    '138', '19 ms',  '0% ✅', 'Najboljša latenca'],
      ['.NET (ASP.NET Core)',  '125', '160 ms', '0% ✅', 'Bug SQLite singleton → AddScoped + WAL'],
      ['Ruby (Sinatra+Puma)',  '42',  '277 ms', '0% ✅', 'Single-worker (Windows brez fork)'],
    ],
    { y: 1.25, colW: [2.8, 1.3, 1.8, 1.6, 4.5] },
  );
  bullets(slide, [
    ['Scenariji: smoke (1 VU, 10s) → load (10 VU, 40s) → stress (50 VU, 40s)', 0],
    ['Ključna ugotovitev: Node.js optimalen za SQLite I/O workload; event-driven arhitektura ne blokira pri kratkih poizvedbah', 0],
    ['.NET imel threading bug (SqliteConnection Singleton) — napaka pri 50 VU → popravek: AddScoped + WAL mode', 0],
    ['Ruby stabilen, a omejen z GIL in single-worker modom na Windowsu', 0],
  ], { y: 3.15, h: 1.6, size: 13 });
}

// ════════════════════════════════════════════════════════════════════════════════
// 9. DOSTOPNOST — WCAG 2.2 AA
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = contentSlide('Dostopnost — WCAG 2.2 AA');
  twoCol(slide,
    [
      ['Implementirano', 0],
      ['Skip link (viden ob Tab fokusu)', 1],
      ['Semantični HTML — header, nav, main, time', 1],
      ['ARIA live regioni (navigacija, online status)', 1],
      ['aria-label, aria-pressed, aria-current', 1],
      ['Vidni fokus (outline: 3px solid)', 1],
      ['Kontrast 4.5:1 — popravljeni 3 elementi', 1],
      ['Pisava S/M/L + visok kontrast način', 1],
      ['prefers-reduced-motion', 1],
      ['Canvas → dostopna tabela za screen readerje', 1],
    ],
    [
      ['Avtomatizirani testi — axe-core', 0],
      ['Playwright + @axe-core/playwright', 1],
      ['Oznake: wcag2a, wcag2aa, wcag22aa', 1],
      ['', 0],
      ['Rezultat', 0],
      ['14 / 14 testov ✅', 1],
      ['0 kršitev', 1],
      ['', 0],
      ['Popravljene kontrastne napake', 0],
      ['.btn-voice  #4285f4 → #1a56db (6.2:1)', 1],
      ['.empty-state  #999 → #595959 (6.7:1)', 1],
      ['.nav-label  eksplicitna barva #1a1a1a', 1],
    ],
    { size: 14 },
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 10. TESTIRANJE
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = contentSlide('Testiranje');
  table(slide,
    ['Vrsta testa', 'Orodje', 'Pokritost', 'Rezultat'],
    [
      ['Accessibility', 'Playwright + axe-core', 'Vse strani, tipkovnica, kontrast, mobilni prikaz', '14/14 ✅'],
      ['API (backend)', 'Jest + fetch', 'Health, simptomi, zdravila, obiski, sync, izvoz', 'Vse ✅'],
      ['Performance', 'k6 v2.0', 'Smoke + Load + Stress (50 VU)', '0% napak ✅'],
    ],
    { y: 1.25, colW: [2.0, 2.6, 5.6, 1.8] },
  );
  bullets(slide, [
    ['Zagon testov', 0],
    ['npm run test:a11y        →  Playwright accessibility (frontend/)', 1],
    ['npm test                 →  Jest API testi (backend/nodejs/)', 1],
    ['k6 run tests/k6-performance.js  →  performance za vsak backend', 1],
  ], { y: 3.2, h: 1.55, size: 14 });
}

// ════════════════════════════════════════════════════════════════════════════════
// 11. ARHITEKTURA PROJEKTA
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = contentSlide('Arhitektura projekta');
  twoCol(slide,
    [
      ['Frontend — React 19 + Vite', 0],
      ['src/pages/   — SymptomDiary, MedicationList,', 1],
      ['               HealthVisits, TrendGraphs, Settings', 1],
      ['src/context/ — DBContext (IndexedDB)', 1],
      ['               ProfileContext (Pacient/Skrbnik)', 1],
      ['public/sw.js — Service Worker', 1],
      ['public/manifest.json — PWA manifest', 1],
      ['tests/accessibility.spec.js — 14 testov', 1],
    ],
    [
      ['Backend — 3 implementacije', 0],
      ['nodejs/   Fastify 5 + better-sqlite3', 1],
      ['dotnet/   ASP.NET Core 8 Minimal API', 1],
      ['ruby/     Sinatra 4 + Puma 6', 1],
      ['', 0],
      ['Testiranje & DevOps', 0],
      ['tests/k6-performance.js', 1],
      ['tests/k6-comparison.md', 1],
      ['compose.yaml — Docker Compose', 1],
    ],
    { size: 14 },
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// 12. ZAKLJUČNA SLIDE
// ════════════════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: DARK } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 2.6, w: '100%', h: 0.06, fill: { color: GREEN } });

  slide.addText('Hvala za pozornost', {
    x: 0.6, y: 0.8, w: 11.8, h: 1.4,
    fontSize: 44, bold: true, color: WHITE, fontFace: 'Calibri',
  });
  slide.addText('Vprašanja?', {
    x: 0.6, y: 2.1, w: 6, h: 0.7,
    fontSize: 24, color: ACCENT, fontFace: 'Calibri',
  });

  const badges = [
    ['14/14 a11y testov ✅', GREEN],
    ['3 backendi primerjani', BLUE],
    ['WCAG 2.2 AA', GREEN],
    ['0% napak k6', BLUE],
  ];
  badges.forEach(([txt, col], i) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6 + i * 3.1, y: 3.2, w: 2.85, h: 0.55, fill: { color: col }, rectRadius: 0.1,
    });
    slide.addText(txt, {
      x: 0.6 + i * 3.1, y: 3.2, w: 2.85, h: 0.55,
      fontSize: 14, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri',
    });
  });

  slide.addText('Anja Lečnik  ·  Sodobne tehnologije 2025/26', {
    x: 0.6, y: 4.55, w: 11.8, h: 0.35,
    fontSize: 13, color: '6b7280', fontFace: 'Calibri',
  });
}

// ── Shrani ────────────────────────────────────────────────────────────────────
const outPath = 'MiniProjekt-Predstavitev.pptx';
await pptx.writeFile({ fileName: outPath });
console.log(`✅ Shranjeno: ${outPath}`);
