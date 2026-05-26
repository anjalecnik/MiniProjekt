import { Hono } from 'https://deno.land/x/hono@v3.12.0/mod.ts';
import { cors } from 'https://deno.land/x/hono@v3.12.0/middleware.ts';
import { DB } from 'https://deno.land/x/sqlite@v3.8/mod.ts';

const app = new Hono();
app.use('*', cors());

const db = new DB('./health.db');

db.execute(`
  CREATE TABLE IF NOT EXISTS symptoms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symptoms TEXT NOT NULL,
    date TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_name TEXT NOT NULL,
    visit_date TEXT NOT NULL,
    diagnosis TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription TEXT NOT NULL UNIQUE
  );
`);

app.post('/vnos', async c => {
  const { symptoms, date } = await c.req.json();

  if (!symptoms || !date) {
    return c.json({ error: 'Manjkajo potrebni podatki' }, 400);
  }

  try {
    db.query('INSERT INTO symptoms (symptoms, date, timestamp) VALUES (?, ?, ?)', [
      symptoms,
      date,
      Date.now()
    ]);
    return c.json({ success: true, symptoms, date }, 201);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/vnosi', c => {
  try {
    const results = db.query('SELECT * FROM symptoms ORDER BY timestamp DESC LIMIT 30');
    return c.json(results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/zdravila', c => {
  try {
    const results = db.query(
      'SELECT * FROM medications WHERE end_date IS NULL OR end_date > date()'
    );
    return c.json(results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/zdravila', async c => {
  const { name, dosage, frequency, start_date, end_date } = await c.req.json();

  try {
    db.query(
      'INSERT INTO medications (name, dosage, frequency, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [name, dosage, frequency, start_date, end_date || null]
    );
    return c.json({ success: true, name, dosage, frequency, start_date }, 201);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/obiski', c => {
  try {
    const results = db.query('SELECT * FROM visits ORDER BY visit_date DESC');
    return c.json(results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/obiski', async c => {
  const { doctor_name, visit_date, diagnosis, notes } = await c.req.json();

  try {
    db.query('INSERT INTO visits (doctor_name, visit_date, diagnosis, notes) VALUES (?, ?, ?, ?)', [
      doctor_name,
      visit_date,
      diagnosis || null,
      notes || null
    ]);
    return c.json({ success: true, doctor_name, visit_date }, 201);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/push/subscribe', async c => {
  const { subscription } = await c.req.json();

  try {
    db.query('INSERT INTO subscriptions (subscription) VALUES (?)', [JSON.stringify(subscription)]);
    return c.json({ success: true }, 201);
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return c.json({ success: true, message: 'Already subscribed' }, 200);
    }
    return c.json({ error: error.message }, 500);
  }
});

app.post('/sync', async c => {
  const { type, data } = await c.req.json();

  try {
    if (type === 'symptom') {
      db.query('INSERT INTO symptoms (symptoms, date, timestamp) VALUES (?, ?, ?)', [
        data.symptoms,
        data.date,
        data.timestamp
      ]);
    }
    return c.json({ success: true }, 200);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/izvoz-pdf', c => {
  try {
    const symptoms = db.query('SELECT * FROM symptoms ORDER BY timestamp DESC');
    const medications = db.query('SELECT * FROM medications');
    const visits = db.query('SELECT * FROM visits ORDER BY visit_date DESC');

    const summary = `
POVZETEK ZDRAVSTVENEGA DNEVNIKA
Ustvarjen: ${new Date().toLocaleString('sl-SI')}

SIMPTOMI (${symptoms.length})
${symptoms.map(s => `- ${s.date}: ${s.symptoms}`).join('\n')}

ZDRAVILA (${medications.length})
${medications.map(m => `- ${m.name} ${m.dosage} (${m.frequency})`).join('\n')}

ZDRAVNIŠKI OBISKI (${visits.length})
${visits.map(v => `- ${v.doctor_name} (${v.visit_date}): ${v.diagnosis || 'Ni diagnoza'}`).join('\n')}
    `;

    return c.text(summary);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/health', c => {
  return c.json({ status: 'ok' });
});

Deno.serve({ port: 3000 }, app.fetch);
