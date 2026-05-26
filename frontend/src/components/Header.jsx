import './Header.css';
import { useProfile } from '../context/ProfileContext';

export default function Header({ isOnline }) {
  const { profiles, currentProfile, setCurrentProfile } = useProfile();

  return (
    <header className="app-header" role="banner">
      <div className="header-content">
        <h1 className="app-title">Osebni zdravstveni dnevnik</h1>
        <div className="header-controls">
          <div className="online-status" role="status" aria-live="polite">
            {isOnline ? (
              <span className="online">🟢 Na spletu</span>
            ) : (
              <span className="offline">🔴 Brez interneta</span>
            )}
          </div>
          <select
            className="profile-selector"
            value={currentProfile}
            onChange={e => setCurrentProfile(e.target.value)}
            aria-label="Izberi profil"
          >
            {profiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
