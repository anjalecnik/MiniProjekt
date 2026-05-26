import { useEffect, useRef, useState } from 'react';
import { useDB } from '../context/DBContext';
import './TrendGraphs.css';

export default function TrendGraphs() {
  const canvasRef = useRef(null);
  const [entries, setEntries] = useState([]);
  const { getSymptoms } = useDB();

  useEffect(() => {
    loadAndDrawGraph();
  }, []);

  const loadAndDrawGraph = async () => {
    const data = await getSymptoms(90);
    setEntries(data);
    drawGraph(data);
  };

  const drawGraph = data => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);

    if (data.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Ni podatkov za prikaz', width / 2, height / 2);
      return;
    }

    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
      const y = padding + (graphHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const maxEntries = Math.min(data.length, 30);
    data.slice(-maxEntries).forEach((entry, index) => {
      const x = padding + (graphWidth / (maxEntries - 1)) * index;
      const y = height - padding - 50;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    ctx.fillStyle = '#007bff';
    data.slice(-maxEntries).forEach((entry, index) => {
      const x = padding + (graphWidth / (maxEntries - 1)) * index;
      const y = height - padding - 50;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Vnosi - Zadnjih 30 dni', width / 2, height - 10);
  };

  return (
    <main className="page trend-graphs">
      <h2>Trendni grafi</h2>
      <section className="graph-section">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="trend-canvas"
          role="img"
          aria-label="Graf simptomov v zadnjih 30 dni"
        />
      </section>
      <div className="graph-info">
        <p>
          Skupno vnešenih simptomov: <strong>{entries.length}</strong>
        </p>
        <p>
          Zadnjih 7 dni: <strong>{entries.slice(0, 7).length}</strong>
        </p>
      </div>
    </main>
  );
}
