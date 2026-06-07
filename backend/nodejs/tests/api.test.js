import { jest } from '@jest/globals';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}

async function post(path, data) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}

describe('Health check', () => {
  test('GET /health vrne status ok', async () => {
    const { status, body } = await get('/health');
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
  });
});

describe('Simptomi API', () => {
  test('POST /vnos ustvari nov vnos', async () => {
    const payload = {
      symptoms: 'Testni simptom — glavobol',
      date: new Date().toISOString(),
    };
    const { status, body } = await post('/vnos', payload);
    expect(status).toBe(201);
    expect(body.symptoms).toBe(payload.symptoms);
    expect(typeof body.id).toBe('number');
  });

  test('POST /vnos brez podatkov vrne 400', async () => {
    const { status } = await post('/vnos', {});
    expect(status).toBe(400);
  });

  test('GET /vnosi vrne seznam simptomov', async () => {
    const { status, body } = await get('/vnosi');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('Zdravila API', () => {
  test('POST /zdravila doda zdravilo', async () => {
    const payload = {
      name: 'Testno zdravilo',
      dosage: '500mg',
      frequency: 'daily',
      start_date: '2026-01-01',
    };
    const { status, body } = await post('/zdravila', payload);
    expect(status).toBe(201);
    expect(body.name).toBe(payload.name);
  });

  test('GET /zdravila vrne aktivna zdravila', async () => {
    const { status, body } = await get('/zdravila');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('Zdravniški obiski API', () => {
  test('POST /objekti doda obisk', async () => {
    const payload = {
      doctor_name: 'Dr. Testni',
      visit_date: '2026-06-01',
      diagnosis: 'Prehlad',
      notes: 'Testne opombe',
    };
    const { status, body } = await post('/objekti', payload);
    expect(status).toBe(201);
    expect(body.doctor_name).toBe(payload.doctor_name);
  });

  test('GET /objekti vrne seznam obiskov', async () => {
    const { status, body } = await get('/objekti');
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('Sync API', () => {
  test('POST /sync shrani simptom iz ozadja', async () => {
    const payload = {
      type: 'symptom',
      data: {
        symptoms: 'Sinhroniziran simptom',
        date: new Date().toISOString(),
        timestamp: Date.now(),
      },
    };
    const { status, body } = await post('/sync', payload);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

describe('Izvoz podatkov', () => {
  test('GET /izvoz-pdf vrne tekstovni povzetek', async () => {
    const res = await fetch(`${BASE_URL}/izvoz-pdf`);
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('text/plain');
    const text = await res.text();
    expect(text).toContain('POVZETEK ZDRAVSTVENEGA DNEVNIKA');
  });
});
