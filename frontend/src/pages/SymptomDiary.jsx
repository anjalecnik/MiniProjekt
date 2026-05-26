import { useState, useRef, useEffect } from 'react';
import { useDB } from '../context/DBContext';
import './SymptomDiary.css';

export default function SymptomDiary() {
  const [symptoms, setSymptoms] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [entries, setEntries] = useState([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const { addSymptom, getSymptoms, addToSyncQueue, isReady } = useDB();

  useEffect(() => {
    if (isReady) loadEntries();
    initSpeechRecognition();
  }, [isReady]);

  const loadEntries = async () => {
    const data = await getSymptoms();
    setEntries(data);
  };

  const initSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

    setSpeechSupported(true);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'sl-SI';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onresult = event => {
      const transcript = event.results[0][0].transcript;
      setSymptoms(prev => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognitionRef.current.onerror = () => setIsListening(false);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    const entry = {
      date: new Date().toISOString(),
      symptoms: symptoms.trim(),
      timestamp: Date.now(),
    };

    await addSymptom(entry);

    // Register Background Sync so data is also sent to backend when online
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await addToSyncQueue({ type: 'symptom', data: entry });
        await registration.sync.register('sync-health-data');
      } catch {
        // Background Sync not available; IndexedDB copy is the source of truth
      }
    }

    setSymptoms('');
    await loadEntries();

    if ('vibrate' in navigator) navigator.vibrate(100);
  };

  return (
    <main className="page symptom-diary">
      <h2>Dnevnik simptomov</h2>

      <form onSubmit={handleSubmit} className="symptom-form">
        <div className="form-group">
          <label htmlFor="symptom-input" className="form-label">
            Vpišite ali pogovorite se o svojih simptomih
          </label>
          <textarea
            id="symptom-input"
            value={symptoms}
            onChange={e => setSymptoms(e.target.value)}
            className="symptom-textarea"
            aria-describedby="symptom-help"
          />
          <p id="symptom-help" className="help-text">
            Uporabite gumb za glasovni vnos ali tipkajte neposredno
          </p>
        </div>

        <div className="form-controls">
          {speechSupported && (
            <>
              <button
                type="button"
                onClick={startListening}
                disabled={isListening}
                className="btn btn-voice"
                aria-label="Začni glasovni vnos"
                aria-pressed={isListening}
              >
                Glasovni vnos
              </button>
              {isListening && (
                <button
                  type="button"
                  onClick={stopListening}
                  className="btn btn-stop"
                  aria-label="Ustavi glasovni vnos"
                >
                  Ustavi
                </button>
              )}
            </>
          )}
          <button type="submit" className="btn btn-primary">
            Shrani
          </button>
        </div>
      </form>

      <section className="entries-list">
        <h3>Nedavni vnosi</h3>
        {entries.length === 0 ? (
          <p className="empty-state">Ni vnešenih simptomov</p>
        ) : (
          <ul className="entries">
            {entries.map(entry => (
              <li key={entry.id} className="entry-item">
                <time dateTime={entry.date} className="entry-date">
                  {new Date(entry.date).toLocaleDateString('sl-SI', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <p className="entry-content">{entry.symptoms}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
