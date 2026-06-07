require 'sinatra'
require 'sinatra/json'
require 'sqlite3'
require 'json'

configure do
  set :port, 3000
  set :bind, '0.0.0.0'
  set :show_exceptions, false
end

# ── CORS ──────────────────────────────────────────────────────────────────────
before do
  response.headers['Access-Control-Allow-Origin']  = '*'
  response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
  content_type :json
end

options '*' do
  halt 200
end

# ── Baza ──────────────────────────────────────────────────────────────────────
DB_PATH = ENV['DATABASE_URL'] || './health.db'
DB = SQLite3::Database.new(DB_PATH)
DB.results_as_hash = true

DB.execute_batch(<<~SQL)
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
SQL

# ── Pomočnik ──────────────────────────────────────────────────────────────────
def parse_body
  request.body.rewind
  JSON.parse(request.body.read)
rescue JSON::ParserError
  {}
end

# ── Health check ──────────────────────────────────────────────────────────────
get '/health' do
  json status: 'ok'
end

# ── Simptomi ──────────────────────────────────────────────────────────────────
post '/vnos' do
  body = parse_body
  symptoms = body['symptoms']
  date     = body['date']

  if symptoms.to_s.empty? || date.to_s.empty?
    halt 400, json(error: 'Manjkajo potrebni podatki')
  end

  timestamp = (Time.now.to_f * 1000).to_i
  DB.execute(
    'INSERT INTO symptoms (symptoms, date, timestamp) VALUES (?, ?, ?)',
    [symptoms, date, timestamp]
  )
  id = DB.last_insert_row_id

  status 201
  json id: id, symptoms: symptoms, date: date
end

get '/vnosi' do
  rows = DB.execute('SELECT * FROM symptoms ORDER BY timestamp DESC LIMIT 30')
  json rows
end

# ── Zdravila ──────────────────────────────────────────────────────────────────
post '/zdravila' do
  body      = parse_body
  name      = body['name']
  dosage    = body['dosage']
  frequency = body['frequency']
  start_date = body['start_date']
  end_date  = body['end_date']

  DB.execute(
    'INSERT INTO medications (name, dosage, frequency, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
    [name, dosage, frequency, start_date, end_date]
  )
  id = DB.last_insert_row_id

  status 201
  json id: id, name: name, dosage: dosage, frequency: frequency, start_date: start_date
end

get '/zdravila' do
  rows = DB.execute("SELECT * FROM medications WHERE end_date IS NULL OR end_date > date('now')")
  json rows
end

# ── Zdravniški obiski ─────────────────────────────────────────────────────────
post '/objekti' do
  body        = parse_body
  doctor_name = body['doctor_name']
  visit_date  = body['visit_date']
  diagnosis   = body['diagnosis']
  notes       = body['notes']

  DB.execute(
    'INSERT INTO visits (doctor_name, visit_date, diagnosis, notes) VALUES (?, ?, ?, ?)',
    [doctor_name, visit_date, diagnosis, notes]
  )
  id = DB.last_insert_row_id

  status 201
  json id: id, doctor_name: doctor_name, visit_date: visit_date
end

get '/objekti' do
  rows = DB.execute('SELECT * FROM visits ORDER BY visit_date DESC')
  json rows
end

# ── Push naročnine ────────────────────────────────────────────────────────────
post '/push/subscribe' do
  body = parse_body
  subscription = body['subscription']

  halt 400, json(error: 'Manjka subscription') if subscription.nil?

  begin
    DB.execute('INSERT INTO subscriptions (subscription) VALUES (?)', [subscription.to_json])
    status 201
    json success: true
  rescue SQLite3::ConstraintException
    json success: true, message: 'Already subscribed'
  end
end

# ── Background Sync ───────────────────────────────────────────────────────────
post '/sync' do
  body = parse_body
  type = body['type']
  data = body['data']

  if type == 'symptom' && data.is_a?(Hash)
    DB.execute(
      'INSERT INTO symptoms (symptoms, date, timestamp) VALUES (?, ?, ?)',
      [data['symptoms'], data['date'], data['timestamp'].to_i]
    )
  end

  json success: true
end

# ── Izvoz podatkov ────────────────────────────────────────────────────────────
get '/izvoz-pdf' do
  symptoms    = DB.execute('SELECT * FROM symptoms ORDER BY timestamp DESC')
  medications = DB.execute('SELECT * FROM medications')
  visits      = DB.execute('SELECT * FROM visits ORDER BY visit_date DESC')

  symp_lines  = symptoms.map    { |s| "- #{s['date']}: #{s['symptoms']}" }.join("\n")
  med_lines   = medications.map { |m| "- #{m['name']} #{m['dosage']} (#{m['frequency']})" }.join("\n")
  visit_lines = visits.map      { |v| "- #{v['doctor_name']} (#{v['visit_date']}): #{v['diagnosis'] || 'Ni diagnoze'}" }.join("\n")

  summary = <<~TXT
    POVZETEK ZDRAVSTVENEGA DNEVNIKA
    Ustvarjen: #{Time.now.strftime('%d.%m.%Y %H:%M')}

    SIMPTOMI (#{symptoms.length})
    #{symp_lines.empty? ? '  Ni vnosov' : symp_lines}

    ZDRAVILA (#{medications.length})
    #{med_lines.empty? ? '  Ni vnosov' : med_lines}

    ZDRAVNIŠKI OBISKI (#{visits.length})
    #{visit_lines.empty? ? '  Ni vnosov' : visit_lines}
  TXT

  content_type 'text/plain; charset=utf-8'
  headers 'Content-Disposition' => "attachment; filename=\"zdravstveni-dnevnik-#{Time.now.to_i}.txt\""
  summary
end

# ── Napake ────────────────────────────────────────────────────────────────────
error do
  status 500
  json error: env['sinatra.error'].message
end
