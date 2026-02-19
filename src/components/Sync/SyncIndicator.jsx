import { useSync } from '../../context/SyncContext';
import './SyncIndicator.css';

export default function SyncIndicator() {
  const { pendingCount, syncing, isOnline, syncError } = useSync();

  if (!isOnline) {
    return (
      <div className="sync-indicator sync-indicator--offline" title="Geen internetverbinding — wijzigingen worden lokaal opgeslagen">
        <span className="sync-icon">⊘</span>
        <span className="sync-label">Offline</span>
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="sync-indicator sync-indicator--syncing" title="Bezig met synchroniseren...">
        <span className="sync-spinner" />
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="sync-indicator sync-indicator--pending" title={`${pendingCount} wijziging(en) wachten op synchronisatie`}>
        <span className="sync-icon">↑</span>
        <span className="sync-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
      </div>
    );
  }

  if (syncError) {
    return (
      <div className="sync-indicator sync-indicator--error" title={syncError}>
        <span className="sync-icon">!</span>
      </div>
    );
  }

  // Alles gesynchroniseerd — toon niets (geen visuele rommel als alles goed is)
  return null;
}
