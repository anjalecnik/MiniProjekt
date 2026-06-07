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

    request.onsuccess = async () => {
      const database = request.result;
      setDb(database);
      if (!localStorage.getItem('demo-seeded')) {
        await seedDemoData(database);
        localStorage.setItem('demo-seeded', '1');
      }
      setIsReady(true);
    };
  }, []);

  const seedDemoData = async db => {
    const now = Date.now();
    const ms  = n => now - n * 86400000;

    // Vrne ISO string za N dni nazaj z določeno LOKALNO uro
    const at = (n, h = 9, m = 0) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    };

    // Vrne YYYY-MM-DD v lokalnem času (ne UTC, da se ujame z grafom)
    const dateStr = n => {
      const d = new Date(ms(n));
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };

    const symptoms = [
      // Dan 28 — 1 vnos
      { date: at(28, 8, 10), symptoms: 'Zjutraj hud glavobol, občutek težke glave.', timestamp: ms(28) },
      // Dan 25 — 1 vnos
      { date: at(25, 10, 30), symptoms: 'Slabost in vrtoglavica po zajtrku, trajala okrog ene ure.', timestamp: ms(25) },
      // Dan 22 — 1 vnos
      { date: at(22, 9, 0), symptoms: 'Bolečine v sklepih, posebej v kolenih. Vreme se slabša.', timestamp: ms(22) },
      // Dan 20 — 2 vnosa (visok tlak + utrujenost)
      { date: at(20, 8, 0),  symptoms: 'Visok krvni tlak zjutraj (152/97). Vzela sem Amlodipine.', timestamp: ms(20) },
      { date: at(20, 19, 0), symptoms: 'Utrujenost čez cel dan, brez apetita. Zgodaj v posteljo.', timestamp: ms(20) + 39600000 },
      // Dan 18 — 3 vnosi (najslabši dan — prehlad)
      { date: at(18, 7, 0),  symptoms: 'Vročina 38.1°C. Hudo grlo, ni mogoče požirati. Ostala doma.', timestamp: ms(18) },
      { date: at(18, 13, 0), symptoms: 'Mrzlica in tresenje. Vzela Amoksicilin (prva doza).', timestamp: ms(18) + 21600000 },
      { date: at(18, 20, 0), symptoms: 'Zvečer slabše. Glavobol, zamašen nos. Spala 12 ur.', timestamp: ms(18) + 46800000 },
      // Dan 17 — 2 vnosa
      { date: at(17, 9, 0),  symptoms: 'Vročina 37.8°C. Malo boljše kot včeraj.', timestamp: ms(17) },
      { date: at(17, 21, 0), symptoms: 'Zvečer kašelj se stopnjuje. Vzela sirup.', timestamp: ms(17) + 43200000 },
      // Dan 15 — 1 vnos (obisk pri zdravniku)
      { date: at(15, 11, 0), symptoms: 'Po obisku pri zdravniku — potrjen prehlad. Antibiotiki so pomagali.', timestamp: ms(15) },
      // Dan 12 — 1 vnos
      { date: at(12, 10, 0), symptoms: 'Prehlad skoraj mimo. Blaga utrujenost ostaja.', timestamp: ms(12) },
      // Dan 11 — 2 vnosa
      { date: at(11, 8, 0),  symptoms: 'Krvni tlak 148/93 — še vedno povišan.', timestamp: ms(11) },
      { date: at(11, 17, 0), symptoms: 'Popoldne hrbtenica — dolgo sedenje pri delu.', timestamp: ms(11) + 32400000 },
      // Dan 7 — 1 vnos
      { date: at(7, 9, 0),   symptoms: 'Dober dan. Sprehod 30 minut. Krvni tlak 140/89.', timestamp: ms(7) },
      // Dan 5 — 1 vnos
      { date: at(5, 15, 0),  symptoms: 'Rahel glavobol popoldne, verjetno dehidracija.', timestamp: ms(5) },
      // Dan 3 — 2 vnosa
      { date: at(3, 8, 0),   symptoms: 'Pritisk v prsih zjutraj, izginil po 10 minutah.', timestamp: ms(3) },
      { date: at(3, 20, 0),  symptoms: 'Zvečer manjši glavobol. Stres v službi.', timestamp: ms(3) + 43200000 },
      // Dan 1 — 1 vnos
      { date: at(1, 9, 0),   symptoms: 'Krvni tlak 135/88 — boljši! Vitamin D3 jemljemo redno.', timestamp: ms(1) },
    ];

    const medications = [
      // Cel mesec — osnovna terapija za tlak
      { name: 'Amlodipine',  dosage: '5 mg',     frequency: 'daily',  startDate: dateStr(29), endDate: null,         addedDate: at(29) },
      // Kratkoročni antibiotiki — jasno viden začetek IN konec na grafu
      { name: 'Amoksicilin', dosage: '500 mg',    frequency: 'thrice', startDate: dateStr(18), endDate: dateStr(11),  addedDate: at(18) },
      // Začelo 20 dni nazaj — sredina grafa
      { name: 'Aspirin',     dosage: '500 mg',    frequency: 'daily',  startDate: dateStr(20), endDate: null,         addedDate: at(20) },
      // Novo zdravilo — zadnjih 6 dni, vidno samo na desni strani
      { name: 'Vitamin D3',  dosage: '2000 IU',   frequency: 'daily',  startDate: dateStr(6),  endDate: null,         addedDate: at(6) },
    ];

    const visits = [
      {
        doctorName: 'Dr. Marija Novak',
        visitDate: dateStr(21),
        diagnosis: 'Arterijska hipertenzija',
        notes: 'Predpisana terapija z Amlodipinom. Kontrola čez mesec dni. Priporočen redni aerobni šport.',
        fileName: null, fileData: null,
        createdAt: at(21, 10, 30),
      },
      {
        doctorName: 'Dr. Tomaž Kovač',
        visitDate: dateStr(15),
        diagnosis: 'Akutni nazofaringitis (prehlad)',
        notes: 'Simptomatsko zdravljenje. Počitek, zadostna hidracija. Antibiotiki niso potrebni.',
        fileName: null, fileData: null,
        createdAt: at(15, 11, 0),
      },
      {
        doctorName: 'Dr. Marija Novak',
        visitDate: dateStr(2),
        diagnosis: 'Kontrolni pregled — hipertenzija',
        notes: 'Tlak se izboljšuje (135/88). Nadaljujemo z dosedanjo terapijo. Naslednja kontrola čez 2 meseca.',
        fileName: null, fileData: null,
        createdAt: at(2, 10, 0),
      },
    ];

    // Vrni Promise, ki se razreši ko so vse tri transakcije končane
    const addAll = (storeName, items) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      items.forEach(item => tx.objectStore(storeName).add(item));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    await addAll('symptoms', symptoms);
    await addAll('medications', medications);
    await addAll('visits', visits);
  };

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
