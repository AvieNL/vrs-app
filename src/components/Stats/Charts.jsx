import { useMemo, useEffect, useRef, useState } from 'react';

const MAANDEN = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

function parseDate(d) {
  if (!d) return null;
  const parts = d.split('-');
  if (parts[0].length === 4) return new Date(+parts[0], +parts[1] - 1, +parts[2]);
  if (parts[2] && parts[2].length === 4) return new Date(+parts[2], +parts[1] - 1, +parts[0]);
  return null;
}

function useContainerWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(ref.current);
    setWidth(ref.current.clientWidth);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function BarChartStacked({ data, title }) {
  const containerRef = useRef(null);
  const containerW = useContainerWidth(containerRef);
  if (!data.length) return <div ref={containerRef} />;

  const maxVal = Math.max(...data.map(d => d.nieuw + d.terugvangst), 1);
  const chartH = 180;
  const padTop = 24;
  const padBottom = 28;
  const padLeft = 32;
  const padRight = 8;
  const barArea = chartH - padTop - padBottom;
  const usableW = containerW - padLeft - padRight;
  const barW = Math.max(12, Math.min(40, (usableW / data.length) - 6));
  const chartW = containerW || 300;

  return (
    <div className="chart-block" ref={containerRef}>
      <h3>{title}</h3>
      {containerW > 0 && (
        <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" preserveAspectRatio="xMinYMin meet" className="chart-svg">
          {[0, 0.25, 0.5, 0.75, 1].map(f => {
            const y = padTop + barArea * (1 - f);
            const val = Math.round(maxVal * f);
            return (
              <g key={f}>
                <line x1={padLeft} y1={y} x2={chartW} y2={y} stroke="var(--bg-tertiary)" strokeWidth="1" />
                <text x={padLeft - 4} y={y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9">{val}</text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const x = padLeft + (usableW / data.length) * i + ((usableW / data.length) - barW) / 2;
            const total = d.nieuw + d.terugvangst;
            const hTotal = (total / maxVal) * barArea;
            const hNieuw = (d.nieuw / maxVal) * barArea;
            const hTerug = (d.terugvangst / maxVal) * barArea;
            const yBase = padTop + barArea - hTotal;
            return (
              <g key={d.jaar}>
                {d.terugvangst > 0 && (
                  <rect x={x} y={yBase} width={barW} height={hTerug} rx="2" fill="var(--success, #22c55e)" />
                )}
                {d.nieuw > 0 && (
                  <rect x={x} y={yBase + hTerug} width={barW} height={hNieuw} rx="2" fill="var(--accent, #38bdf8)" />
                )}
                {total > 0 && (
                  <text x={x + barW / 2} y={yBase - 4} textAnchor="middle" fill="var(--text-secondary)" fontSize="9">{total}</text>
                )}
                <text x={x + barW / 2} y={chartH - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{d.jaar}</text>
              </g>
            );
          })}
        </svg>
      )}
      <div className="chart-legend">
        <span className="chart-legend-item"><span className="chart-dot" style={{ background: 'var(--accent, #38bdf8)' }} /> Nieuw</span>
        <span className="chart-legend-item"><span className="chart-dot" style={{ background: 'var(--success, #22c55e)' }} /> Terugvangst</span>
      </div>
    </div>
  );
}

export function BarChartSimple({ data, title, color }) {
  const containerRef = useRef(null);
  const containerW = useContainerWidth(containerRef);
  if (!data.length) return <div ref={containerRef} />;

  const maxVal = Math.max(...data.map(d => d.count), 1);
  const chartH = 160;
  const padTop = 20;
  const padBottom = 28;
  const padLeft = 32;
  const padRight = 8;
  const barArea = chartH - padTop - padBottom;
  const usableW = containerW - padLeft - padRight;
  const barW = Math.max(12, Math.min(36, (usableW / data.length) - 6));
  const chartW = containerW || 300;

  return (
    <div className="chart-block" ref={containerRef}>
      <h3>{title}</h3>
      {containerW > 0 && (
        <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" preserveAspectRatio="xMinYMin meet" className="chart-svg">
          {[0, 0.5, 1].map(f => {
            const y = padTop + barArea * (1 - f);
            const val = Math.round(maxVal * f);
            return (
              <g key={f}>
                <line x1={padLeft} y1={y} x2={chartW} y2={y} stroke="var(--bg-tertiary)" strokeWidth="1" />
                <text x={padLeft - 4} y={y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9">{val}</text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const x = padLeft + (usableW / data.length) * i + ((usableW / data.length) - barW) / 2;
            const h = (d.count / maxVal) * barArea;
            const y = padTop + barArea - h;
            return (
              <g key={i}>
                {d.count > 0 && (
                  <rect x={x} y={y} width={barW} height={h} rx="2" fill={color || 'var(--accent, #38bdf8)'} />
                )}
                {d.count > 0 && (
                  <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="var(--text-secondary)" fontSize="9">{d.count}</text>
                )}
                <text x={x + barW / 2} y={chartH - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{d.label}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export function LineChart({ data, title, xKey, yKey }) {
  const containerRef = useRef(null);
  const containerW = useContainerWidth(containerRef);
  if (!data.length) return <div ref={containerRef} />;

  const maxVal = Math.max(...data.map(d => d[yKey]), 1);
  const chartW = containerW || 300;
  const chartH = 160;
  const padTop = 20;
  const padBottom = 28;
  const padLeft = 32;
  const padRight = 16;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const points = data.map((d, i) => {
    const x = padLeft + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = padTop + plotH - (d[yKey] / maxVal) * plotH;
    return { x, y, d };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="chart-block" ref={containerRef}>
      <h3>{title}</h3>
      {containerW > 0 && (
        <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" preserveAspectRatio="xMinYMin meet" className="chart-svg">
          {[0, 0.5, 1].map(f => {
            const y = padTop + plotH * (1 - f);
            const val = Math.round(maxVal * f);
            return (
              <g key={f}>
                <line x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="var(--bg-tertiary)" strokeWidth="1" />
                <text x={padLeft - 4} y={y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9">{val}</text>
              </g>
            );
          })}
          <polyline points={polyline} fill="none" stroke="var(--accent, #38bdf8)" strokeWidth="2" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="var(--accent, #38bdf8)" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" fill="var(--text-secondary)" fontSize="9">{p.d[yKey]}</text>
              <text x={p.x} y={chartH - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{p.d[xKey]}</text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export function VangstKaart({ targetRecords, allRecords }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const kaartData = useMemo(() => {
    const eersteVangst = {};
    allRecords.forEach(r => {
      if (!r.ringnummer) return;
      if (r.metalenringinfo === 1 || r.metalenringinfo === '1') {
        const bestaand = eersteVangst[r.ringnummer];
        if (!bestaand || (r.vangstdatum && (!bestaand.vangstdatum || r.vangstdatum < bestaand.vangstdatum))) {
          eersteVangst[r.ringnummer] = r;
        }
      }
    });

    const markers = [];
    const lijnen = [];

    targetRecords.forEach(r => {
      const lat = parseFloat(r.lat);
      const lon = parseFloat(r.lon);
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) return;

      const isNieuw = r.metalenringinfo === 1 || r.metalenringinfo === '1';
      markers.push({
        lat, lon,
        soort: r.vogelnaam || 'Onbekend',
        ring: r.ringnummer || '',
        datum: r.vangstdatum || '',
        isNieuw,
      });

      if (!isNieuw && r.ringnummer) {
        const orig = eersteVangst[r.ringnummer];
        if (orig) {
          const oLat = parseFloat(orig.lat);
          const oLon = parseFloat(orig.lon);
          if (oLat && oLon && !isNaN(oLat) && !isNaN(oLon)) {
            lijnen.push({ from: [oLat, oLon], to: [lat, lon] });
          }
        }
      }
    });

    return { markers, lijnen };
  }, [targetRecords, allRecords]);

  useEffect(() => {
    if (!mapRef.current || !window.L || kaartData.markers.length === 0) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const L = window.L;
    const map = L.map(mapRef.current, { scrollWheelZoom: false });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    const bounds = [];

    kaartData.markers.forEach(m => {
      const color = m.isNieuw ? '#38bdf8' : '#22c55e';
      const marker = L.circleMarker([m.lat, m.lon], {
        radius: 6,
        fillColor: color,
        color: '#fff',
        weight: 1,
        fillOpacity: 0.8,
      }).addTo(map);
      marker.bindPopup(`<b>${m.soort}</b><br>${m.ring}<br>${m.datum}`);
      bounds.push([m.lat, m.lon]);
    });

    kaartData.lijnen.forEach(l => {
      L.polyline([l.from, l.to], {
        color: '#f97316',
        weight: 2,
        opacity: 0.7,
        dashArray: '6 4',
      }).addTo(map);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [kaartData]);

  if (kaartData.markers.length === 0) return null;

  return (
    <div className="chart-block">
      <h3>Vangstlocaties</h3>
      <div ref={mapRef} className="kaart-container" />
      <div className="chart-legend">
        <span className="chart-legend-item"><span className="chart-dot" style={{ background: '#38bdf8' }} /> Nieuw</span>
        <span className="chart-legend-item"><span className="chart-dot" style={{ background: '#22c55e' }} /> Terugvangst</span>
        <span className="chart-legend-item"><span className="chart-dot" style={{ background: '#f97316' }} /> Lijn</span>
      </div>
    </div>
  );
}

export function useChartData(targetRecords) {
  const perJaar = useMemo(() => {
    const map = {};
    targetRecords.forEach(r => {
      const d = parseDate(r.vangstdatum);
      if (!d) return;
      const jaar = d.getFullYear();
      if (!map[jaar]) map[jaar] = { jaar, nieuw: 0, terugvangst: 0 };
      if (r.metalenringinfo === 1 || r.metalenringinfo === '1') {
        map[jaar].nieuw++;
      } else {
        map[jaar].terugvangst++;
      }
    });
    return Object.values(map).sort((a, b) => a.jaar - b.jaar);
  }, [targetRecords]);

  const perMaand = useMemo(() => {
    const counts = Array.from({ length: 12 }, (_, i) => ({ maand: i + 1, count: 0, label: MAANDEN[i] }));
    targetRecords.forEach(r => {
      const d = parseDate(r.vangstdatum);
      if (!d) return;
      counts[d.getMonth()].count++;
    });
    return counts;
  }, [targetRecords]);

  const soortenPerJaar = useMemo(() => {
    const map = {};
    targetRecords.forEach(r => {
      const d = parseDate(r.vangstdatum);
      if (!d) return;
      const jaar = d.getFullYear();
      if (!map[jaar]) map[jaar] = new Set();
      if (r.vogelnaam) map[jaar].add(r.vogelnaam);
    });
    return Object.entries(map)
      .map(([jaar, set]) => ({ jaar: +jaar, soorten: set.size }))
      .sort((a, b) => a.jaar - b.jaar);
  }, [targetRecords]);

  return { perJaar, perMaand, soortenPerJaar };
}
