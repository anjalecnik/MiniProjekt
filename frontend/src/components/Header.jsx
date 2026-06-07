import './Header.css';
import { useProfile } from '../context/ProfileContext';

const PAGES = [
  { id: 'diary',       label: 'Dnevnik',    icon: '📔' },
  { id: 'medications', label: 'Zdravila',   icon: '💊' },
  { id: 'visits',      label: 'Obiski',     icon: '🩺' },
  { id: 'graphs',      label: 'Grafi',      icon: '📊' },
  { id: 'settings',    label: 'Nastavitve', icon: '⚙️' },
];

export default function Header({ isOnline, currentPage, setCurrentPage }) {
  const { profiles, currentProfile, setCurrentProfile } = useProfile();

  return (
    <header className="app-header" role="banner">
      <div className="header-top">
        <h1 className="app-title">Zdravstveni dnevnik</h1>
        <div className="header-controls">
          <div className="online-status" role="status" aria-live="polite">
            {isOnline
              ? <span className="online">🟢 Na spletu</span>
              : <span className="offline">🔴 Brez interneta</span>}
          </div>
          <select
            className="profile-selector"
            value={currentProfile}
            onChange={e => setCurrentProfile(e.target.value)}
            aria-label="Izberi profil"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <nav className="header-nav" role="navigation" aria-label="Glavna navigacija">
        {PAGES.map(page => (
          <button
            key={page.id}
            className={`header-nav-btn ${currentPage === page.id ? 'active' : ''}`}
            onClick={() => setCurrentPage(page.id)}
            aria-current={currentPage === page.id ? 'page' : undefined}
            aria-label={page.label}
          >
            <span className="nav-icon" aria-hidden="true">{page.icon}</span>
            {page.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
