import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

export const COLORS = [
  { id: 'neutraal', label: 'Neutraal', darkDot: '#9ca3af', lightDot: '#374151' },
  { id: 'blauw',   label: 'Blauw',    darkDot: '#38bdf8', lightDot: '#0369a1' },
  { id: 'groen',   label: 'Groen',    darkDot: '#4ade80', lightDot: '#15803d' },
  { id: 'oranje',  label: 'Oranje',   darkDot: '#f97316', lightDot: '#c2410c' },
  { id: 'rood',    label: 'Rood',     darkDot: '#f87171', lightDot: '#b91c1c' },
  { id: 'geel',    label: 'Geel',     darkDot: '#facc15', lightDot: '#a16207' },
];

export function useTheme() {
  const { profile, updateProfile } = useAuth();
  const { addToQueue } = useSync();

  const [color, setColorState] = useState(() => {
    const stored = localStorage.getItem('vrs-color') || 'blauw';
    document.documentElement.setAttribute('data-color', stored);
    return stored;
  });

  const [mode, setModeState] = useState(() => {
    const stored = localStorage.getItem('vrs-mode') || 'donker';
    document.documentElement.setAttribute('data-mode', stored);
    return stored;
  });

  // Synchroniseer vanuit profiel zodra het geladen is
  useEffect(() => {
    if (profile?.kleur) setColorState(profile.kleur);
    if (profile?.modus) setModeState(profile.modus);
  }, [profile?.kleur, profile?.modus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pas DOM en localStorage aan wanneer kleur/modus verandert
  useEffect(() => {
    document.documentElement.setAttribute('data-color', color);
    document.documentElement.setAttribute('data-mode', mode);
    localStorage.setItem('vrs-color', color);
    localStorage.setItem('vrs-mode', mode);
  }, [color, mode]);

  function setColor(newColor) {
    setColorState(newColor);
    updateProfile({ kleur: newColor });
    addToQueue('profiles', 'profile_update', { kleur: newColor, updated_at: new Date().toISOString() });
  }

  function setMode(newMode) {
    setModeState(newMode);
    updateProfile({ modus: newMode });
    addToQueue('profiles', 'profile_update', { modus: newMode, updated_at: new Date().toISOString() });
  }

  return { color, mode, setColor, setMode };
}
