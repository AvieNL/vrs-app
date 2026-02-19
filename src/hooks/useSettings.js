import { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

const STORAGE_KEY = 'vrs-settings';

const DEFAULT_SETTINGS = {
  ringerNaam: '',
  ringerInitiaal: '',
  ringerNummer: '',
  hulpModus: 'uitgebreid',
};

function profileToSettings(profile) {
  return {
    ringerNaam: profile.ringer_naam || '',
    ringerInitiaal: profile.ringer_initiaal || '',
    ringerNummer: profile.ringer_nummer || '',
    hulpModus: profile.hulp_modus || 'uitgebreid',
  };
}

export function useSettings() {
  const { profile, updateProfile } = useAuth();
  const { addToQueue } = useSync();
  const [settings, setSettings] = useState(() =>
    loadFromStorage(STORAGE_KEY, DEFAULT_SETTINGS)
  );

  // Wanneer het profiel vanuit Supabase is geladen, synchroniseer de instellingen
  useEffect(() => {
    if (!profile) return;
    const fromProfile = profileToSettings(profile);
    setSettings(fromProfile);
    saveToStorage(STORAGE_KEY, fromProfile);
  }, [profile]);

  function updateSettings(updates) {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveToStorage(STORAGE_KEY, newSettings);
    // Profiel via sync queue (werkt ook offline)
    const profileUpdates = {
      ringer_naam: newSettings.ringerNaam,
      ringer_initiaal: newSettings.ringerInitiaal,
      ringer_nummer: newSettings.ringerNummer,
      hulp_modus: newSettings.hulpModus,
      updated_at: new Date().toISOString(),
    };
    updateProfile(profileUpdates);
    addToQueue('profiles', 'profile_update', profileUpdates);
  }

  return { settings, updateSettings };
}
