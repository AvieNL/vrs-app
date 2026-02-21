import { scoreToStyle } from './scoreStyles';
import { ALL_FEATHER_IDS } from './featherIds';

const SCORE_LABELS = ['Oud (origineel)', 'Oud (versleten)', 'Gedeeltelijk vernieuwd', 'Nieuw', 'Groeiend', 'Ontbreekt'];

const SYNC_LABELS = {
  idle:    '',
  syncing: 'Opslaan...',
  synced:  'Gesynchroniseerd',
  error:   'Synchronisatiefout',
  offline: 'Offline opgeslagen',
};

const SYNC_COLORS = {
  idle:    '',
  syncing: 'var(--text-muted)',
  synced:  'var(--success)',
  error:   '#ef4444',
  offline: '#f59e0b',
};

export default function WingScoringPanel({ scores, side, onSideChange, onReset, onExportJson, syncStatus }) {
  const scored = ALL_FEATHER_IDS.filter(id => (scores[id]?.score ?? 0) !== 0).length;

  return (
    <div className="wing-panel">
      {/* Zijde toggle */}
      <div className="wing-panel-section">
        <span className="wing-panel-label">Zijde</span>
        <div className="wing-side-toggle">
          <button
            className={`wing-side-btn${side === 'L' ? ' wing-side-btn--active' : ''}`}
            onClick={() => onSideChange('L')}
          >
            L
          </button>
          <button
            className={`wing-side-btn${side === 'R' ? ' wing-side-btn--active' : ''}`}
            onClick={() => onSideChange('R')}
          >
            R
          </button>
        </div>
      </div>

      {/* Teller */}
      <div className="wing-panel-section">
        <span className="wing-panel-label">Gescoord</span>
        <span className="wing-scored-count">{scored} / {ALL_FEATHER_IDS.length}</span>
      </div>

      {/* Legenda */}
      <div className="wing-panel-section wing-legend">
        <span className="wing-panel-label">Legenda</span>
        {[0, 1, 2, 3, 4, 5].map(score => {
          const { fill } = scoreToStyle(score);
          return (
            <div key={score} className="wing-legend-item">
              <span
                className="wing-legend-swatch"
                style={{
                  background: fill === 'none' ? 'transparent' : fill,
                  border: fill === 'none' ? '1px solid var(--text-muted)' : '1px solid #000',
                }}
              />
              <span className="wing-legend-text">
                <strong>{score}</strong> — {SCORE_LABELS[score]}
              </span>
            </div>
          );
        })}
        <p className="wing-legend-hint">Klik: +1 score &nbsp;·&nbsp; Shift+klik: −1 score</p>
      </div>

      {/* Acties */}
      <div className="wing-panel-section wing-actions">
        <button className="btn-secondary wing-action-btn" onClick={onReset}>
          Herstel
        </button>
        <button className="btn-secondary wing-action-btn" onClick={onExportJson}>
          Export JSON
        </button>
      </div>

      {/* Sync status */}
      {syncStatus && syncStatus !== 'idle' && (
        <div className="wing-sync-chip" style={{ color: SYNC_COLORS[syncStatus] }}>
          {syncStatus === 'syncing' && (
            <span className="wing-sync-spinner" />
          )}
          {SYNC_LABELS[syncStatus]}
        </div>
      )}
    </div>
  );
}
