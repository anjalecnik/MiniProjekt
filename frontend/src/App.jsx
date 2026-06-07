import { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import SymptomDiary from './pages/SymptomDiary';
import MedicationList from './pages/MedicationList';
import HealthVisits from './pages/HealthVisits';
import TrendGraphs from './pages/TrendGraphs';
import Settings from './pages/Settings';
import { DBProvider } from './context/DBContext';
import { ProfileProvider } from './context/ProfileContext';

const PAGE_LABELS = {
  diary: 'Dnevnik simptomov',
  medications: 'Seznam zdravil',
  visits: 'Zdravniški obiski',
  graphs: 'Trendni grafi',
  settings: 'Nastavitve',
};

function getInitialPage() {
  const param = new URLSearchParams(window.location.search).get('page');
  return PAGE_LABELS[param] ? param : 'diary';
}

function App() {
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [announcement, setAnnouncement] = useState('');

  const navigateTo = page => {
    setCurrentPage(page);
    setAnnouncement(PAGE_LABELS[page] || page);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Fetch-based preverjanje — zanesljiveje kot samo navigator.onLine,
    // ker DevTools Network throttling ne sproži vedno online/offline eventa
    const checkConnectivity = async () => {
      try {
        await fetch('/manifest.json', { method: 'HEAD', cache: 'no-store' });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    const interval = setInterval(checkConnectivity, 3000);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('SW registered'))
        .catch(err => console.log('SW registration failed:', err));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'diary':
        return <SymptomDiary />;
      case 'medications':
        return <MedicationList />;
      case 'visits':
        return <HealthVisits />;
      case 'graphs':
        return <TrendGraphs />;
      case 'settings':
        return <Settings />;
      default:
        return <SymptomDiary />;
    }
  };

  return (
    <ProfileProvider>
      <DBProvider>
        <div className="app">
          {/* screen-reader only live region for page navigation announcements */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {announcement}
          </div>
          <Header isOnline={isOnline} currentPage={currentPage} setCurrentPage={navigateTo} />
          <div id="main-content">
            {renderPage()}
          </div>
        </div>
      </DBProvider>
    </ProfileProvider>
  );
}

export default App;
