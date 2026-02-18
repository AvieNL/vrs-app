import { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/storage';

const STORAGE_KEY = 'vrs-settings';

const DEFAULT_SETTINGS = {
  ringerNaam: 'Thijs ter Avest',
  ringerInitiaal: 'TtA',
  ringerNummer: '3254',
};

export function useSettings() {
  const [settings, setSettings] = useState(() =>
    loadFromStorage(STORAGE_KEY, DEFAULT_SETTINGS)
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEY, settings);
  }, [settings]);

  function updateSettings(updates) {
    setSettings(prev => ({ ...prev, ...updates }));
  }

  return { settings, updateSettings };
}
