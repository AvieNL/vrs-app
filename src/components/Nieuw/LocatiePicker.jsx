import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import './LocatiePicker.css';

// Fix Leaflet default marker icons (Vite asset handling)
async function getLeaflet() {
  const L = await import('leaflet');
  delete L.default.Icon.Default.prototype._getIconUrl;
  L.default.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  });
  return L.default;
}

export default function LocatiePicker({ lat, lon, onChange, latError, lonError }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [gpsStatus, setGpsStatus] = useState(null); // null | 'loading' | 'error'

  const hasCoords = lat !== '' && lon !== '' && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon));
  const center = hasCoords
    ? [parseFloat(lat), parseFloat(lon)]
    : [52.05, 6.2]; // Breedenbroek/Gelderland

  // Init map once
  useEffect(() => {
    if (mapInstanceRef.current) return;
    let cancelled = false;

    getLeaflet().then(L => {
      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center,
        zoom: hasCoords ? 13 : 9,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      if (hasCoords) {
        markerRef.current = L.marker(center, { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLatLng();
          onChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
        });
      }

      map.on('click', e => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        onChange(clickLat.toFixed(6), clickLng.toFixed(6));
        if (!markerRef.current) {
          markerRef.current = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
          markerRef.current.on('dragend', () => {
            const pos = markerRef.current.getLatLng();
            onChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
          });
        } else {
          markerRef.current.setLatLng([clickLat, clickLng]);
        }
      });

      mapInstanceRef.current = map;
    });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync marker when lat/lon change externally
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    getLeaflet().then(L => {
      if (!hasCoords) return;
      const pos = [parseFloat(lat), parseFloat(lon)];
      if (!markerRef.current) {
        markerRef.current = L.marker(pos, { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const p = markerRef.current.getLatLng();
          onChange(p.lat.toFixed(6), p.lng.toFixed(6));
        });
      } else {
        markerRef.current.setLatLng(pos);
      }
      map.setView(pos, Math.max(map.getZoom(), 12));
    });
  }, [lat, lon]); // eslint-disable-line react-hooks/exhaustive-deps

  function useGPS() {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsStatus(null);
        onChange(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
      },
      err => {
        if (err.code === 1) setGpsStatus('denied');
        else setGpsStatus('error');
      },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  }

  return (
    <div className="locatie-picker">
      <div ref={mapRef} className="locatie-map" />
      <div className="locatie-coords">
        <div className={`form-group${latError ? ' form-group--error' : ''}`}>
          <label>Breedtegraad (lat) *</label>
          <input
            type="text"
            inputMode="decimal"
            value={lat}
            onChange={e => onChange(e.target.value, lon)}
            placeholder="bijv. 51.9273"
          />
        </div>
        <div className={`form-group${lonError ? ' form-group--error' : ''}`}>
          <label>Lengtegraad (lon) *</label>
          <input
            type="text"
            inputMode="decimal"
            value={lon}
            onChange={e => onChange(lat, e.target.value)}
            placeholder="bijv. 6.2345"
          />
        </div>
      </div>
      <button type="button" className="btn-secondary gps-btn" onClick={useGPS} disabled={gpsStatus === 'loading'}>
        {gpsStatus === 'loading' ? 'Locatie ophalen…' : 'Gebruik GPS'}
      </button>
      {gpsStatus === 'denied' && (
        <span className="field-warning">Locatietoegang geweigerd — sta locatie toe via de app-instellingen van je telefoon</span>
      )}
      {(gpsStatus === 'error' || gpsStatus === 'unavailable') && (
        <span className="field-warning">GPS niet beschikbaar — klik op de kaart om een locatie in te stellen</span>
      )}
      {!hasCoords && gpsStatus !== 'loading' && (
        <span className="field-hint">Klik op de kaart of gebruik GPS om de locatie in te stellen</span>
      )}
    </div>
  );
}
