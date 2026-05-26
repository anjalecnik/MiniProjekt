import { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Navigation from './components/Navigation';
import SymptomDiary from './pages/SymptomDiary';
import MedicationList from './pages/MedicationList';
import HealthVisits from './pages/HealthVisits';
import TrendGraphs from './pages/TrendGraphs';
import Settings from './pages/Settings';
import { DBProvider } from './context/DBContext';
import { ProfileProvider } from './context/ProfileContext';

function App() {
  const [currentPage, setCurrentPage] = useState('diary');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('SW registered'))
        .catch(err => console.log('SW registration failed:', err));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
          <Header isOnline={isOnline} />
          {renderPage()}
          <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
        </div>
      </DBProvider>
    </ProfileProvider>
  );
}

export default App;
