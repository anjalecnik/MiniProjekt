import { createContext, useContext, useState } from 'react';

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
  const [currentProfile, setCurrentProfile] = useState('patient');
  const [profiles, setProfiles] = useState([
    { id: 'patient', name: 'Pacient', type: 'patient' },
    { id: 'caregiver', name: 'Negovalec', type: 'caregiver' }
  ]);

  return (
    <ProfileContext.Provider value={{ currentProfile, setCurrentProfile, profiles }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
