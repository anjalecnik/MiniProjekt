import './Navigation.css';

export default function Navigation({ currentPage, setCurrentPage }) {
  const pages = [
    { id: 'diary', label: 'Dnevnik', icon: '📔' },
    { id: 'medications', label: 'Zdravila', icon: '💊' },
    { id: 'visits', label: 'Obiski', icon: '👨‍⚕️' },
    { id: 'graphs', label: 'Grafi', icon: '📊' },
    { id: 'settings', label: 'Nastavitve', icon: '⚙️' }
  ];

  const handleKeyDown = (e, pageId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setCurrentPage(pageId);
    }
  };

  return (
    <nav className="app-navigation" role="navigation" aria-label="Glavna navigacija">
      <ul className="nav-list">
        {pages.map(page => (
          <li key={page.id}>
            <button
              className={`nav-button ${currentPage === page.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(page.id)}
              onKeyDown={e => handleKeyDown(e, page.id)}
              aria-current={currentPage === page.id ? 'page' : undefined}
              aria-label={page.label}
            >
              <span className="nav-icon">{page.icon}</span>
              <span className="nav-label">{page.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
