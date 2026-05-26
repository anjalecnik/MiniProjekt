import { useState, useEffect } from 'react';
import { useDB } from '../context/DBContext';
import './Settings.css';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Settings() {
  const { getSymptoms, getMedications, getVisits } = useDB();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState('normal');

  useEffect(() => {
    const savedFontSize = localStorage.getItem('fontSize') || 'normal';
    setFontSize(savedFontSize);
    document.documentElement.setAttribute('data-font-size', savedFontSize);

    const savedHighContrast = localStorage.getItem('highContrast') === 'true';
    setHighContrast(savedHighContrast);
    if (savedHighContrast) {
      document.documentElement.setAttribute('data-high-contrast', 'true');
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      checkPushSubscription();
    }
  }, []);

  const checkPushSubscription = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setPushEnabled(!!subscription);
  };

  const handlePushToggle = async () => {
    const registration = await navigator.serviceWorker.ready;

    if (pushEnabled) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        setPushEnabled(false);
      }
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      alert('Push obvestila niso konfigurirana (manjka VAPID ključ)');
      return;
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch(`${API_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      setPushEnabled(true);
    } catch (err) {
      console.error('Push subscription failed:', err);
      alert('Napaka pri naročanju na obvestila');
    }
  };

  const handleHighContrastToggle = () => {
    const next = !highContrast;
    setHighContrast(next);
    localStorage.setItem('highContrast', String(next));
    if (next) {
      document.documentElement.setAttribute('data-high-contrast', 'true');
    } else {
      document.documentElement.removeAttribute('data-high-contrast');
    }
  };

  const handleExportSummary = async () => {
    const symptoms = (await getSymptoms(100)) || [];
    const medications = (await getMedications()) || [];
    const visits = (await getVisits()) || [];

    const summary = `POVZETEK ZDRAVSTVENEGA DNEVNIKA
Ustvarjen: ${new Date().toLocaleString('sl-SI')}

SIMPTOMI (${symptoms.length})
${symptoms.map(s => `- ${new Date(s.date).toLocaleDateString('sl-SI')}: ${s.symptoms}`).join('\n') || '  Ni vnosov'}

ZDRAVILA (${medications.length})
${medications.map(m => `- ${m.name} ${m.dosage} (${m.frequency})`).join('\n') || '  Ni vnosov'}

ZDRAVNIŠKI OBISKI (${visits.length})
${visits.map(v => `- ${v.doctorName} (${new Date(v.visitDate).toLocaleDateString('sl-SI')}): ${v.diagnosis || 'Ni diagnoze'}`).join('\n') || '  Ni vnosov'}
`;

    const blob = new Blob([summary], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zdravstveni-dnevnik-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    if ('clipboard' in navigator) {
      await navigator.clipboard.writeText(summary).catch(() => {});
    }
  };

  const handleFontSizeChange = size => {
    setFontSize(size);
    localStorage.setItem('fontSize', size);
    document.documentElement.setAttribute('data-font-size', size);
  };

  return (
    <main className="page settings">
      <h2>Nastavitve</h2>

      <section className="settings-section">
        <h3>Obvestila in opomniki</h3>
        <div className="setting-item">
          <span className="setting-label" id="push-label">
            Omogoči push obvestila
          </span>
          <button
            onClick={handlePushToggle}
            className={`toggle-button ${pushEnabled ? 'enabled' : ''}`}
            aria-pressed={pushEnabled}
            aria-labelledby="push-label"
          >
            {pushEnabled ? '✓ Omogočeno' : '○ Onemogočeno'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Dostopnost</h3>
        <div className="setting-item">
          <span className="setting-label" id="font-size-label">
            Velikost pisave
          </span>
          <div className="font-size-controls" role="group" aria-labelledby="font-size-label">
            <button
              onClick={() => handleFontSizeChange('small')}
              className={`size-btn ${fontSize === 'small' ? 'active' : ''}`}
              aria-pressed={fontSize === 'small'}
              aria-label="Majhna pisava"
            >
              A
            </button>
            <button
              onClick={() => handleFontSizeChange('normal')}
              className={`size-btn ${fontSize === 'normal' ? 'active' : ''}`}
              aria-pressed={fontSize === 'normal'}
              aria-label="Normalna pisava"
            >
              A+
            </button>
            <button
              onClick={() => handleFontSizeChange('large')}
              className={`size-btn ${fontSize === 'large' ? 'active' : ''}`}
              aria-pressed={fontSize === 'large'}
              aria-label="Velika pisava"
            >
              A++
            </button>
          </div>
        </div>

        <div className="setting-item">
          <span className="setting-label" id="contrast-label">
            Visok kontrast
          </span>
          <button
            onClick={handleHighContrastToggle}
            className={`toggle-button ${highContrast ? 'enabled' : ''}`}
            aria-pressed={highContrast}
            aria-labelledby="contrast-label"
          >
            {highContrast ? '✓ Vključeno' : '○ Izključeno'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3>Podatki</h3>
        <button onClick={handleExportSummary} className="btn btn-primary">
          Prenesi povzetek za zdravnika
        </button>
      </section>
    </main>
  );
}
