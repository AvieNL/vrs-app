import { useState, useEffect, useCallback } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/storage';

const STORAGE_KEY = 'vrs-species-overrides';

export function useSpeciesOverrides() {
  const [overrides, setOverrides] = useState(() =>
    loadFromStorage(STORAGE_KEY, {})
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEY, overrides);
  }, [overrides]);

  const getOverride = useCallback((naam) => {
    return overrides[naam] || {};
  }, [overrides]);

  const saveOverride = useCallback((naam, data) => {
    setOverrides(prev => ({
      ...prev,
      [naam]: { ...(prev[naam] || {}), ...data }
    }));
  }, []);

  const getMerged = useCallback((naam, defaultSoort) => {
    const override = overrides[naam] || {};
    // For boeken, merge at the nested level too
    const mergedBoeken = defaultSoort.boeken || override.boeken
      ? { ...(defaultSoort.boeken || {}), ...(override.boeken || {}) }
      : undefined;
    return {
      ...defaultSoort,
      ...override,
      ...(mergedBoeken ? { boeken: mergedBoeken } : {})
    };
  }, [overrides]);

  return { getOverride, saveOverride, getMerged };
}
