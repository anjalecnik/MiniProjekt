import { useEffect, useRef, useState } from 'react';
import { useDB } from '../context/DBContext';
import './TrendGraphs.css';

const MED_COLORS = ['#0c5394', '#e67e22', '#8e44ad', '#c0392b', '#16a085'];
const MED_EMOJIS = ['💊', '🔵', '🟣', '🔴', '🟢'];

export default function TrendGraphs() {
  const canvasRef = useRef(null);
  const [entries, setEntries]     = useState([]);
  const [visits, setVisits]       = useState([]);
  const [medications, setMeds]    = useState([]);
  const { getSymptoms, getVisits, getMedications } = useDB();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [syms, vis, meds] = await Promise.all([
      getSymptoms(90), getVisits(), getMedications(),
    ]);
    setEntries(syms);
    setVisits(vis);
    setMeds(meds);
    drawGraph(syms, vis, meds);
  };

  const drawGraph = (symptoms, vis, meds) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Layout
    const padL = 46, padR = 16, padT = 24;
    const medRowH  = 22;
    const medRows  = Math.min(meds.length, 5);
    const padB     = 44 + medRows * medRowH;
    const graphH   = H - padT - padB;
    const graphW   = W - padL - padR;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // ── Zadnjih 30 dni ────────────────────────────────────────────────────────
    const today = new Date();
    const localDate = d =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (29 - i));
      return localDate(d);
    });
    const barW = graphW / days.length;

    // ── Simptomi po dnevih ────────────────────────────────────────────────────
    const countsByDay = Object.fromEntries(days.map(d => [d, 0]));
    symptoms.forEach(s => {
      const day = s.date.slice(0, 10);
      if (countsByDay[day] !== undefined) countsByDay[day]++;
    });
    const counts   = days.map(d => countsByDay[d]);
    const maxCount = Math.max(...counts, 1);

    // Mreža
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth   = 1;
    for (let i = 0; i <= maxCount; i++) {
      const y = padT + graphH - (i / maxCount) * graphH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillStyle   = '#595959';
      ctx.font        = '11px sans-serif';
      ctx.textAlign   = 'right';
      ctx.fillText(i, padL - 6, y + 4);
    }

    // Stolpci simptomov
    counts.forEach((count, i) => {
      if (count === 0) return;
      const x    = padL + i * barW + barW * 0.12;
      const bH   = (count / maxCount) * graphH;
      const y    = padT + graphH - bH;
      const grad = ctx.createLinearGradient(0, y, 0, y + bH);
      grad.addColorStop(0, '#1e7e34');
      grad.addColorStop(1, '#2ecc71');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW * 0.76, bH, 3);
      ctx.fill();
      ctx.fillStyle   = '#155625';
      ctx.font        = 'bold 11px sans-serif';
      ctx.textAlign   = 'center';
      ctx.fillText(count, x + barW * 0.38, y - 4);
    });

    // X os
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT + graphH);
    ctx.lineTo(W - padR, padT + graphH);
    ctx.stroke();

    // X oznake (vsak 5. dan)
    ctx.fillStyle = '#595959';
    ctx.font      = '10px sans-serif';
    ctx.textAlign = 'center';
    days.forEach((day, i) => {
      if (i % 5 !== 0 && i !== 29) return;
      ctx.fillText(day.slice(5), padL + i * barW + barW / 2, padT + graphH + 14);
    });

    // ── Zdravniški obiski — navpične črte ─────────────────────────────────────
    vis.forEach(v => {
      const dayIdx = days.indexOf(v.visitDate);
      if (dayIdx === -1) return;
      const x = padL + dayIdx * barW + barW / 2;

      ctx.save();
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth   = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padT + 2);
      ctx.lineTo(x, padT + graphH);
      ctx.stroke();
      ctx.restore();

      // Emoji marker
      ctx.font      = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🩺', x, padT - 4);
    });

    // ── Zdravila — barvni trakovi spodaj ─────────────────────────────────────
    const medStartY = padT + graphH + 28;

    meds.slice(0, 5).forEach((med, mi) => {
      const color = MED_COLORS[mi];
      const emoji = MED_EMOJIS[mi];
      const rowY  = medStartY + mi * medRowH;
      const start = med.startDate || days[0];
      const end   = med.endDate   || days[29];

      const si = days.findIndex(d => d >= start.slice(0, 10));
      const ei = days.findLastIndex(d => d <= end.slice(0, 10));
      if (si === -1 || ei < si) return;

      const x1 = padL + si * barW;
      const x2 = padL + (ei + 1) * barW;

      // Trak
      ctx.fillStyle   = color + '33';
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.roundRect(x1, rowY + 2, x2 - x1, medRowH - 6, 4);
      ctx.fill();
      ctx.stroke();

      // Emoji + ime
      ctx.font      = '11px sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      const label = `${emoji} ${med.name} ${med.dosage}`;
      const labelX = x1 + 4;
      if (x2 - x1 > 50) ctx.fillText(label, labelX, rowY + medRowH - 8);

      // Datum konca (če obstaja)
      if (med.endDate) {
        ctx.fillStyle   = '#e74c3c';
        ctx.font        = '10px sans-serif';
        ctx.textAlign   = 'right';
        ctx.fillText('⬛ konec', x2 - 2, rowY + medRowH - 8);
      }
    });

    // ── Legenda zgoraj desno ──────────────────────────────────────────────────
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'left';
    [['🟩 Simptomi', '#1e7e34'], ['🩺 Obisk', '#e74c3c']].forEach(([lbl, col], i) => {
      ctx.fillStyle = col;
      ctx.fillText(lbl, W - padR - 110 + i * 60, padT + 12);
    });
  };

  const recentEntries = entries.slice(0, 30);

  return (
    <main className="page trend-graphs">
      <h2>Zdravstveni pregled — zadnjih 30 dni</h2>

      <section className="graph-section" aria-label="Kombinirani grafikon simptomov, obiskov in zdravil">
        <canvas
          ref={canvasRef}
          width={700}
          height={460}
          className="trend-canvas"
          role="img"
          aria-label="Stolpičasti graf simptomov po dnevih z označenimi zdravniškimi obiski in zdravili"
          aria-describedby="graph-summary"
        />
      </section>

      <div className="graph-info" id="graph-summary">
        <p>Simptomi (30 dni): <strong>{recentEntries.length}</strong></p>
        <p>Zdravniški obiski: <strong>{visits.filter(v => days30().includes(v.visitDate)).length}</strong></p>
        <p>Aktivna zdravila: <strong>{medications.filter(m => !m.endDate).length}</strong></p>
      </div>

      {recentEntries.length > 0 && (
        <section aria-label="Tabelarični prikaz simptomov">
          <h3>Simptomi v tabeli</h3>
          <div className="table-wrapper" role="region" aria-label="Tabela simptomov" tabIndex={0}>
            <table className="data-table">
              <caption className="sr-only">Vnosi simptomov, razvrščeni od najnovejšega</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Datum</th>
                  <th scope="col">Simptomi</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{index + 1}</td>
                    <td>
                      <time dateTime={entry.date}>
                        {new Date(entry.date).toLocaleDateString('sl-SI', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </time>
                    </td>
                    <td>{entry.symptoms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function days30() {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
}
