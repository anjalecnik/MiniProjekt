/**
 * k6 obremenitveni test za primerjavo backendov
 *
 * Zagon (vsak backend na svojem portu):
 *   Node.js  (port 3000): k6 run tests/k6-performance.js
 *   .NET     (port 3001): k6 run --env API_URL=http://localhost:3001 tests/k6-performance.js
 *   Ruby     (port 3002): k6 run --env API_URL=http://localhost:3002 tests/k6-performance.js
 *
 * Primerjava vseh treh hkrati:
 *   Za vsak backend zaženite v ločenem terminalu in primerjajte p95/p99 vrednosti.
 *
 * Namestitev k6: https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

// Custom metrics
const errorRate = new Rate('error_rate');
const healthDuration = new Trend('health_duration');
const vnosDuration = new Trend('vnos_duration');
const vnosiDuration = new Trend('vnosi_duration');
const zdravilaDuration = new Trend('zdravila_duration');

export const options = {
  scenarios: {
    // 1. Smoke test — preveri, da vse deluje
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      tags: { scenario: 'smoke' },
    },
    // 2. Load test — normalna obremenitev
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '20s', target: 10 },
        { duration: '10s', target: 0 },
      ],
      startTime: '15s',
      tags: { scenario: 'load' },
    },
    // 3. Stress test — visoka obremenitev
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '20s', target: 50 },
        { duration: '10s', target: 0 },
      ],
      startTime: '60s',
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    error_rate: ['rate<0.01'],
  },
};

const headers = { 'Content-Type': 'application/json' };

export default function () {
  group('Health check', () => {
    const res = http.get(`${BASE_URL}/health`);
    healthDuration.add(res.timings.duration);
    const ok = check(res, {
      'health status 200': r => r.status === 200,
      'health vrne ok': r => JSON.parse(r.body).status === 'ok',
      'odziv < 100ms': r => r.timings.duration < 100,
    });
    errorRate.add(!ok);
  });

  group('Simptomi', () => {
    // Dodaj simptom
    const payload = JSON.stringify({
      symptoms: `k6 test simptom ${Date.now()}`,
      date: new Date().toISOString(),
    });
    const postRes = http.post(`${BASE_URL}/vnos`, payload, { headers });
    vnosDuration.add(postRes.timings.duration);
    check(postRes, {
      'POST /vnos status 201': r => r.status === 201,
      'POST /vnos vsebuje id': r => JSON.parse(r.body).id > 0,
      'POST /vnos < 200ms': r => r.timings.duration < 200,
    });
    errorRate.add(postRes.status !== 201);

    // Pridobi seznam
    const getRes = http.get(`${BASE_URL}/vnosi`);
    vnosiDuration.add(getRes.timings.duration);
    check(getRes, {
      'GET /vnosi status 200': r => r.status === 200,
      'GET /vnosi je array': r => Array.isArray(JSON.parse(r.body)),
      'GET /vnosi < 150ms': r => r.timings.duration < 150,
    });
    errorRate.add(getRes.status !== 200);
  });

  group('Zdravila', () => {
    const getRes = http.get(`${BASE_URL}/zdravila`);
    zdravilaDuration.add(getRes.timings.duration);
    check(getRes, {
      'GET /zdravila status 200': r => r.status === 200,
      'GET /zdravila je array': r => Array.isArray(JSON.parse(r.body)),
      'GET /zdravila < 150ms': r => r.timings.duration < 150,
    });
    errorRate.add(getRes.status !== 200);
  });

  sleep(0.5);
}

export function handleSummary(data) {
  // Ime datoteke glede na backend URL
  const backend = BASE_URL.includes('3001') ? 'dotnet'
                : BASE_URL.includes('3002') ? 'ruby'
                : 'nodejs';
  return {
    [`tests/k6-report-${backend}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  const p95 = metrics.http_req_duration?.values?.['p(95)'] ?? 'N/A';
  const p99 = metrics.http_req_duration?.values?.['p(99)'] ?? 'N/A';
  const failed = metrics.http_req_failed?.values?.rate ?? 0;
  const rps = metrics.http_reqs?.values?.rate ?? 0;

  return `
╔══════════════════════════════════════════╗
║        k6 Povzetek zmogljivosti          ║
╠══════════════════════════════════════════╣
║  Zahteve/sek:        ${String(rps.toFixed(1)).padEnd(20)}║
║  p95 odzivni čas:    ${String((p95 + ' ms')).padEnd(20)}║
║  p99 odzivni čas:    ${String((p99 + ' ms')).padEnd(20)}║
║  Napake:             ${String((failed * 100).toFixed(2) + '%').padEnd(20)}║
╚══════════════════════════════════════════╝
`;
}
