import './InstellingenPage.css';

export default function InstellingenPage({ settings, onUpdateSettings }) {
  return (
    <div className="page instellingen-page">
      <h2>Instellingen</h2>

      <div className="section">
        <h3>Standaard ringer</h3>
        <div className="section-content">
          <div className="form-group">
            <label>Volledige naam</label>
            <input
              type="text"
              value={settings.ringerNaam}
              onChange={e => onUpdateSettings({ ringerNaam: e.target.value })}
              placeholder="bijv. Thijs ter Avest"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Initiaal</label>
              <input
                type="text"
                value={settings.ringerInitiaal}
                onChange={e => onUpdateSettings({ ringerInitiaal: e.target.value })}
                placeholder="bijv. TtA"
              />
            </div>
            <div className="form-group">
              <label>Ringernummer</label>
              <input
                type="text"
                value={settings.ringerNummer}
                onChange={e => onUpdateSettings({ ringerNummer: e.target.value })}
                placeholder="bijv. 3254"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
