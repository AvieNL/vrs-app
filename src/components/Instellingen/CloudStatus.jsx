import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function CloudStatus() {
  const { user, profile } = useAuth();
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    loadCounts();
  }, [user]);

  async function loadCounts() {
    setLoading(true);
    setError('');
    try {
      const [vangsten, projecten, ringstrengen] = await Promise.all([
        supabase.from('vangsten').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('projecten').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('ringstrengen').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      if (vangsten.error) throw vangsten.error;
      setCounts({
        vangsten: vangsten.count ?? 0,
        projecten: projecten.count ?? 0,
        ringstrengen: ringstrengen.count ?? 0,
      });
    } catch (err) {
      setError('Kon clouddata niet ophalen: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cloud-status">
      <div className="cloud-status__header">
        <div className="cloud-status__dot cloud-status__dot--online" />
        <span className="cloud-status__label">Verbonden met Supabase</span>
        <button className="cloud-status__refresh" onClick={loadCounts} title="Vernieuwen">
          ↻
        </button>
      </div>

      <div className="cloud-status__account">
        <span className="cloud-status__email">{user?.email}</span>
        {profile?.rol && (
          <span className="cloud-status__rol">{profile.rol}</span>
        )}
      </div>

      {loading && (
        <div className="cloud-status__loading">Tellen...</div>
      )}

      {error && (
        <div className="cloud-status__error">{error}</div>
      )}

      {counts && !loading && (
        <div className="cloud-status__counts">
          <div className="cloud-status__count-item">
            <span className="cloud-status__count-num">{counts.vangsten}</span>
            <span className="cloud-status__count-label">vangsten</span>
          </div>
          <div className="cloud-status__count-item">
            <span className="cloud-status__count-num">{counts.projecten}</span>
            <span className="cloud-status__count-label">projecten</span>
          </div>
          <div className="cloud-status__count-item">
            <span className="cloud-status__count-num">{counts.ringstrengen}</span>
            <span className="cloud-status__count-label">ringstrengen</span>
          </div>
        </div>
      )}
    </div>
  );
}
