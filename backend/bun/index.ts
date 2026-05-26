import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import Database from 'bun:sqlite';

const db = new Database('health.db');

db.exec(`
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

const app = new Elysia()
  .use(cors())
  .post('/vnos', ({ body: { symptoms, date } }) => {
    if (!symptoms || !date) {
      return { error: 'Manjkajo potrebni podatki' };
    }

    const stmt = db.prepare('INSERT INTO symptoms (symptoms, date, timestamp) VALUES (?, ?, ?)');
    stmt.run(symptoms, date, Date.now());

    return { success: true, symptoms, date };
  })
  .get('/vnosi', () => {
    const stmt = db.prepare('SELECT * FROM symptoms ORDER BY timestamp DESC LIMIT 30');
    return stmt.all();
  })
  .get('/zdravila', () => {
    const stmt = db.prepare(
      'SELECT * FROM medications WHERE end_date IS NULL OR end_date > date()'
    );
    return stmt.all();
  })
  .post('/zdravila', ({ body: { name, dosage, frequency, start_date, end_date } }) => {
    const stmt = db.prepare(
      'INSERT INTO medications (name, dosage, frequency, start_date, end_date) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(name, dosage, frequency, start_date, end_date || null);

    return { success: true, name, dosage, frequency, start_date };
  })
  .get('/obiski', () => {
    const stmt = db.prepare('SELECT * FROM visits ORDER BY visit_date DESC');
    return stmt.all();
  })
  .post('/obiski', ({ body: { doctor_name, visit_date, diagnosis, notes } }) => {
    const stmt = db.prepare(
      'INSERT INTO visits (doctor_name, visit_date, diagnosis, notes) VALUES (?, ?, ?, ?)'
    );
    stmt.run(doctor_name, visit_date, diagnosis || null, notes || null);

    return { success: true, doctor_name, visit_date };
  })
  .post('/push/subscribe', ({ body: { subscription } }) => {
    try {
      const stmt = db.prepare('INSERT INTO subscriptions (subscription) VALUES (?)');
      stmt.run(JSON.stringify(subscription));
      return { success: true };
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        return { success: true, message: 'Already subscribed' };
      }
      throw error;
    }
  })
  .post('/sync', ({ body: { type, data } }) => {
    if (type === 'symptom') {
      const stmt = db.prepare('INSERT INTO symptoms (symptoms, date, timestamp) VALUES (?, ?, ?)');
      stmt.run(data.symptoms, data.date, data.timestamp);
    }
    return { success: true };
  })
  .get('/izvoz-pdf', () => {
    const symptoms = db.prepare('SELECT * FROM symptoms ORDER BY timestamp DESC').all();
    const medications = db.prepare('SELECT * FROM medications').all();
    const visits = db.prepare('SELECT * FROM visits ORDER BY visit_date DESC').all();

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

    return new Response(summary, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="zdravstveni-dnevnik-${Date.now()}.txt"`
      }
    });
  })
  .get('/health', () => ({ status: 'ok' }))
  .listen(3000);

console.log(`Elysia server running on http://localhost:3000`);
