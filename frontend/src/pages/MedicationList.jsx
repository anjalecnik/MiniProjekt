import { useState, useEffect } from 'react';
import { useDB } from '../context/DBContext';
import './MedicationList.css';

export default function MedicationList() {
  const { addMedication, getMedications, removeMedication, isReady } = useDB();
  const [medications, setMedications] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (isReady) loadMedications();
  }, [isReady]);

  const loadMedications = async () => {
    const data = await getMedications();
    setMedications(data);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    await addMedication({ ...formData, addedDate: new Date().toISOString() });
    await loadMedications();
    setFormData({ name: '', dosage: '', frequency: 'daily', startDate: '', endDate: '' });
  };

  const handleRemove = async id => {
    await removeMedication(id);
    await loadMedications();
  };

  const frequencyLabel = freq => {
    const map = { daily: 'Dnevno', twice: 'Dvakrat dnevno', thrice: 'Trikrat dnevno', weekly: 'Tedensko' };
    return map[freq] || freq;
  };

  return (
    <main className="page medication-list">
      <h2>Seznam zdravil</h2>

      <form onSubmit={handleSubmit} className="medication-form">
        <div className="form-group">
          <label htmlFor="med-name" className="form-label">
            Ime zdravila
          </label>
          <input
            id="med-name"
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="med-dosage" className="form-label">
            Odmerek
          </label>
          <input
            id="med-dosage"
            type="text"
            value={formData.dosage}
            onChange={e => setFormData({ ...formData, dosage: e.target.value })}
            placeholder="npr. 500mg"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="med-frequency" className="form-label">
            Pogostost
          </label>
          <select
            id="med-frequency"
            value={formData.frequency}
            onChange={e => setFormData({ ...formData, frequency: e.target.value })}
          >
            <option value="daily">Dnevno</option>
            <option value="twice">Dvakrat dnevno</option>
            <option value="thrice">Trikrat dnevno</option>
            <option value="weekly">Tedensko</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="med-start" className="form-label">
            Začetek
          </label>
          <input
            id="med-start"
            type="date"
            value={formData.startDate}
            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Dodaj zdravilo
        </button>
      </form>

      <section className="medications-section">
        <h3>Aktivna zdravila</h3>
        {medications.length === 0 ? (
          <p className="empty-state">Ni dodanih zdravil</p>
        ) : (
          <ul className="medications-list">
            {medications.map(med => (
              <li key={med.id} className="med-item">
                <div className="med-header">
                  <h4 className="med-name">{med.name}</h4>
                  <button
                    onClick={() => handleRemove(med.id)}
                    className="btn-remove"
                    aria-label={`Odstrani ${med.name}`}
                  >
                    ✕
                  </button>
                </div>
                <p className="med-dosage">Odmerek: {med.dosage}</p>
                <p className="med-frequency">Pogostost: {frequencyLabel(med.frequency)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
