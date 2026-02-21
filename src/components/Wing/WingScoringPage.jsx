import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../../lib/db';
import { generateId } from '../../utils/storage';
import { fetchWingScoring, upsertWingScoring } from '../../lib/supabaseWingScoring';
import { ALL_FEATHER_IDS, ensureFeatherKeys } from './featherIds';
import { applyFeatherStyles } from './applyStyles';
import WingSvg from './WingSvg';
import WingScoringPanel from './WingScoringPanel';
import './WingScoringPage.css';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function WingScoringPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const captureId = searchParams.get('capture_id') || 'demo';
  const [side, setSide] = useState(searchParams.get('side') || 'L');
  const [scores, setScores] = useState(() => ensureFeatherKeys(ALL_FEATHER_IDS, {}));
  const [syncStatus, setSyncStatus] = useState('idle');
  const [recordId, setRecordId] = useState(null);
  const containerRef = useRef(null);

  // Pas SVG-kleuren toe zodra scores of SVG veranderen
  useEffect(() => {
    applyFeatherStyles(containerRef.current, scores);
  }, [scores]);

  // Laad data wanneer captureId of side verandert
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureId, side]);

  async function loadData() {
    let local = null;
    try {
      local = await db.wing_scoring
        .where('[capture_id+side]')
        .equals([captureId, side])
        .first();
    } catch {
      // tabel nog niet beschikbaar (eerste keer)
    }

    const online = navigator.onLine;
    let winner = local;

    if (online) {
      try {
        const remote = await fetchWingScoring(captureId, side);
        if (remote) {
          const localNewer = local && local.updated_at >= remote.updated_at;
          if (!localNewer) {
            winner = remote;
            await db.wing_scoring.put(remote);
          }
        }
      } catch {
        // Supabase niet beschikbaar; ga verder met lokale data
      }
    }

    const loadedScores = ensureFeatherKeys(ALL_FEATHER_IDS, winner?.scores ?? {});
    setRecordId(winner?.id ?? null);
    setScores(loadedScores);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce((newScores) => saveData(newScores), 600),
    [captureId, side, recordId]
  );

  async function saveData(newScores) {
    setSyncStatus('syncing');
    const now = new Date().toISOString();
    const id = recordId ?? generateId();
    const record = {
      id,
      capture_id: captureId,
      side,
      scores: newScores,
      created_at: now,
      updated_at: now,
    };

    try {
      await db.wing_scoring.put(record);
      setRecordId(id);
    } catch {
      setSyncStatus('error');
      return;
    }

    const online = navigator.onLine;
    if (online) {
      try {
        await upsertWingScoring(record);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('offline');
      }
    } else {
      setSyncStatus('offline');
    }
  }

  function handleFeatherClick(e) {
    const el = e.target.closest('.feather');
    if (!el?.id) return;
    const id = el.id;
    setScores(prev => {
      const cur = prev[id]?.score ?? 0;
      const next = e.shiftKey ? Math.max(0, cur - 1) : (cur + 1) % 6;
      const updated = { ...prev, [id]: { score: next } };
      debouncedSave(updated);
      return updated;
    });
  }

  function handleFeatherContextMenu(e) {
    const el = e.target.closest('.feather');
    if (!el?.id) return;
    e.preventDefault();
    const id = el.id;
    setScores(prev => {
      const cur = prev[id]?.score ?? 0;
      const updated = { ...prev, [id]: { score: Math.max(0, cur - 1) } };
      debouncedSave(updated);
      return updated;
    });
  }

  function handleSideChange(newSide) {
    setSide(newSide);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('side', newSide);
      return next;
    });
  }

  function handleReset() {
    const empty = ensureFeatherKeys(ALL_FEATHER_IDS, {});
    setScores(empty);
    debouncedSave(empty);
  }

  function handleExportJson() {
    const data = {
      capture_id: captureId,
      side,
      scores,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vleugelscore-${captureId}-${side}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page wing-page">
      <div className="wing-header">
        <button className="btn-secondary" onClick={() => navigate(-1)}>← Terug</button>
        <h2 className="wing-title">Vleugelscore</h2>
        {captureId !== 'demo' && (
          <span className="wing-capture-id">Vangst: {captureId}</span>
        )}
      </div>

      <div className="wing-layout">
        <div className="wing-svg-wrapper">
          <WingSvg
            containerRef={containerRef}
            onFeatherClick={handleFeatherClick}
            onFeatherContextMenu={handleFeatherContextMenu}
          />
        </div>
        <WingScoringPanel
          scores={scores}
          side={side}
          onSideChange={handleSideChange}
          onReset={handleReset}
          onExportJson={handleExportJson}
          syncStatus={syncStatus}
        />
      </div>
    </div>
  );
}
