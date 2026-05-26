import Fastify from 'fastify';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });
fastify.register(cors, { origin: '*' });

const db = new Database(process.env.DATABASE_URL || './health.db');

const isPushConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (isPushConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:example@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Initialize database
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

// API Routes
fastify.post('/vnos', async (request, reply) => {
  const { symptoms, date } = request.body;

  if (!symptoms || !date) {
    return reply.status(400).send({ error: 'Manjkajo potrebni podatki' });
  }

  try {
    const stmt = db.prepare('INSERT INTO symptoms (symptoms, date, timestamp) VALUES (?, ?, ?)');
    const result = stmt.run(symptoms, date, Date.now());

    reply.status(201).send({ id: result.lastInsertRowid, symptoms, date });
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/vnosi', async (request, reply) => {
  try {
    const stmt = db.prepare('SELECT * FROM symptoms ORDER BY timestamp DESC LIMIT 30');
    const symptoms = stmt.all();
    reply.send(symptoms);
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/zdravila', async (request, reply) => {
  try {
    const stmt = db.prepare(
      'SELECT * FROM medications WHERE end_date IS NULL OR end_date > date()'
    );
    const medications = stmt.all();
    reply.send(medications);
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/zdravila', async (request, reply) => {
  const { name, dosage, frequency, start_date, end_date } = request.body;

  try {
    const stmt = db.prepare(
      'INSERT INTO medications (name, dosage, frequency, start_date, end_date) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(name, dosage, frequency, start_date, end_date || null);

    reply.status(201).send({ id: result.lastInsertRowid, name, dosage, frequency, start_date });
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/objekti', async (request, reply) => {
  try {
    const stmt = db.prepare('SELECT * FROM visits ORDER BY visit_date DESC');
    const visits = stmt.all();
    reply.send(visits);
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/objekti', async (request, reply) => {
  const { doctor_name, visit_date, diagnosis, notes } = request.body;

  try {
    const stmt = db.prepare(
      'INSERT INTO visits (doctor_name, visit_date, diagnosis, notes) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(doctor_name, visit_date, diagnosis || null, notes || null);

    reply.status(201).send({ id: result.lastInsertRowid, doctor_name, visit_date });
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/push/subscribe', async (request, reply) => {
  const { subscription } = request.body;

  try {
    const stmt = db.prepare('INSERT INTO subscriptions (subscription) VALUES (?)');
    stmt.run(JSON.stringify(subscription));

    reply.status(201).send({ success: true });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return reply.status(200).send({ success: true, message: 'Already subscribed' });
    }
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/push/send', async (request, reply) => {
  if (!isPushConfigured) {
    return reply.status(503).send({ error: 'Push notifications are not configured' });
  }

  const { title, body } = request.body;

  try {
    const stmt = db.prepare('SELECT subscription FROM subscriptions');
    const subscriptions = stmt.all();

    const results = await Promise.all(
      subscriptions.map(({ subscription }) =>
        webpush
          .sendNotification(JSON.parse(subscription), JSON.stringify({ title, body }))
          .catch(error => ({ error: error.message }))
      )
    );

    reply.send({ success: true, sent: results.length });
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/sync', async (request, reply) => {
  const { type, data } = request.body;

  try {
    if (type === 'symptom') {
      const stmt = db.prepare('INSERT INTO symptoms (symptoms, date, timestamp) VALUES (?, ?, ?)');
      stmt.run(data.symptoms, data.date, data.timestamp);
    }
    // Add other sync types as needed

    reply.status(200).send({ success: true });
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/izvoz-pdf', async (request, reply) => {
  try {
    const symptomStmt = db.prepare('SELECT * FROM symptoms ORDER BY timestamp DESC');
    const medStmt = db.prepare('SELECT * FROM medications');
    const visitStmt = db.prepare('SELECT * FROM visits ORDER BY visit_date DESC');

    const symptoms = symptomStmt.all();
    const medications = medStmt.all();
    const visits = visitStmt.all();

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

    reply.header('Content-Type', 'text/plain');
    reply.header(
      'Content-Disposition',
      `attachment; filename="zdravstveni-dnevnik-${Date.now()}.txt"`
    );
    reply.send(summary);
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

// Health check
fastify.get('/health', async (request, reply) => {
  reply.send({ status: 'ok' });
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Fastify server running on http://localhost:3000');
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
