import { createContext, useContext, useEffect, useState } from 'react';

const DBContext = createContext();

export function DBProvider({ children }) {
  const [db, setDb] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const request = indexedDB.open('HealthDiary', 1);

    request.onerror = () => console.error('DB error:', request.error);

    request.onupgradeneeded = e => {
      const database = e.target.result;

      if (!database.objectStoreNames.contains('symptoms')) {
        const store = database.createObjectStore('symptoms', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
      }

      if (!database.objectStoreNames.contains('medications')) {
        database.createObjectStore('medications', { keyPath: 'id', autoIncrement: true });
      }

      if (!database.objectStoreNames.contains('visits')) {
        const store = database.createObjectStore('visits', { keyPath: 'id', autoIncrement: true });
        store.createIndex('visitDate', 'visitDate', { unique: false });
      }

      if (!database.objectStoreNames.contains('syncQueue')) {
        database.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => {
      setDb(request.result);
      setIsReady(true);
    };
  }, []);

  // Symptoms
  const addSymptom = async symptom => {
    if (!db) return;
    const tx = db.transaction('symptoms', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore('symptoms').add(symptom);
      req.onsuccess = () => resolve({ ...symptom, id: req.result });
      tx.onerror = () => reject(tx.error);
    });
  };

  const getSymptoms = async (limit = 30) => {
    if (!db) return [];
    const tx = db.transaction('symptoms', 'readonly');
    return new Promise((resolve, reject) => {
      const index = tx.objectStore('symptoms').index('date');
      const request = index.openCursor(null, 'prev');
      const results = [];
      request.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(tx.error);
    });
  };

  // Medications
  const addMedication = async med => {
    if (!db) return;
    const tx = db.transaction('medications', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore('medications').add(med);
      req.onsuccess = () => resolve({ ...med, id: req.result });
      tx.onerror = () => reject(tx.error);
    });
  };

  const getMedications = async () => {
    if (!db) return [];
    const tx = db.transaction('medications', 'readonly');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore('medications').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(tx.error);
    });
  };

  const removeMedication = async id => {
    if (!db) return;
    const tx = db.transaction('medications', 'readwrite');
    return new Promise((resolve, reject) => {
      tx.objectStore('medications').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  // Visits
  const addVisit = async visit => {
    if (!db) return;
    const tx = db.transaction('visits', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore('visits').add(visit);
      req.onsuccess = () => resolve({ ...visit, id: req.result });
      tx.onerror = () => reject(tx.error);
    });
  };

  const getVisits = async () => {
    if (!db) return [];
    const tx = db.transaction('visits', 'readonly');
    return new Promise((resolve, reject) => {
      const req = tx.objectStore('visits').getAll();
      req.onsuccess = () => resolve([...req.result].reverse());
      req.onerror = () => reject(tx.error);
    });
  };

  // Sync queue
  const addToSyncQueue = async item => {
    if (!db) return;
    const tx = db.transaction('syncQueue', 'readwrite');
    return new Promise((resolve, reject) => {
      tx.objectStore('syncQueue').add(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  const value = {
    db,
    isReady,
    addSymptom,
    getSymptoms,
    addMedication,
    getMedications,
    removeMedication,
    addVisit,
    getVisits,
    addToSyncQueue,
  };

  return <DBContext.Provider value={value}>{children}</DBContext.Provider>;
}

export function useDB() {
  return useContext(DBContext);
}
