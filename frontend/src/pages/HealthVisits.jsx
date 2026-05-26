import { useState, useEffect } from 'react';
import { useDB } from '../context/DBContext';
import './HealthVisits.css';

export default function HealthVisits() {
  const { addVisit, getVisits, isReady } = useDB();
  const [visits, setVisits] = useState([]);
  const [formData, setFormData] = useState({
    doctorName: '',
    visitDate: '',
    diagnosis: '',
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (isReady) loadVisits();
  }, [isReady]);

  const loadVisits = async () => {
    const data = await getVisits();
    setVisits(data);
  };

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else if (file) {
      alert('Prosim izberite PDF datoteko');
      e.target.value = '';
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    let fileData = null;
    if (selectedFile) {
      fileData = await selectedFile.arrayBuffer();
    }

    await addVisit({
      ...formData,
      fileName: selectedFile?.name || null,
      fileData,
      createdAt: new Date().toISOString(),
    });

    await loadVisits();
    setFormData({ doctorName: '', visitDate: '', diagnosis: '', notes: '' });
    setSelectedFile(null);
  };

  const downloadFile = visit => {
    if (!visit.fileData) return;
    const blob = new Blob([visit.fileData], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = visit.fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <main className="page health-visits">
      <h2>Zdravniški obiski</h2>

      <form onSubmit={handleSubmit} className="visit-form">
        <div className="form-group">
          <label htmlFor="doctor-name" className="form-label">
            Ime zdravnika
          </label>
          <input
            id="doctor-name"
            type="text"
            value={formData.doctorName}
            onChange={e => setFormData({ ...formData, doctorName: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="visit-date" className="form-label">
            Datum obiska
          </label>
          <input
            id="visit-date"
            type="date"
            value={formData.visitDate}
            onChange={e => setFormData({ ...formData, visitDate: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="diagnosis" className="form-label">
            Diagnoza
          </label>
          <input
            id="diagnosis"
            type="text"
            value={formData.diagnosis}
            onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="visit-notes" className="form-label">
            Opombe
          </label>
          <textarea
            id="visit-notes"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="pdf-upload" className="form-label">
            Naloži PDF dokument
          </label>
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            aria-describedby="pdf-help"
          />
          <p id="pdf-help" className="help-text">
            Neobvezno — medicinsko poročilo ali napotnica
          </p>
          {selectedFile && (
            <p className="file-selected" role="status">
              ✓ {selectedFile.name}
            </p>
          )}
        </div>

        <button type="submit" className="btn btn-primary">
          Dodaj obisk
        </button>
      </form>

      <section className="visits-section">
        <h3>Pretekli obiski</h3>
        {visits.length === 0 ? (
          <p className="empty-state">Ni evidentiranih obiskov</p>
        ) : (
          <ul className="visits-list">
            {visits.map(visit => (
              <li key={visit.id} className="visit-item">
                <div className="visit-header">
                  <h4 className="visit-doctor">{visit.doctorName}</h4>
                  <time dateTime={visit.visitDate} className="visit-date">
                    {new Date(visit.visitDate).toLocaleDateString('sl-SI')}
                  </time>
                </div>
                {visit.diagnosis && <p className="visit-diagnosis">Diagnoza: {visit.diagnosis}</p>}
                {visit.notes && <p className="visit-notes">{visit.notes}</p>}
                {visit.fileName && (
                  <button
                    onClick={() => downloadFile(visit)}
                    className="btn btn-secondary"
                    aria-label={`Prenesi ${visit.fileName}`}
                  >
                    {visit.fileName}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
