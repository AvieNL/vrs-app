import { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/storage';

const STORAGE_KEY = 'vrs-ringstreng';

export function useRingStrengen() {
  const [ringStrengen, setRingStrengen] = useState(() =>
    loadFromStorage(STORAGE_KEY, [])
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEY, ringStrengen);
  }, [ringStrengen]);

  function addRingstreng(data) {
    const id = Date.now().toString();
    const streng = { id, ...data, huidige: data.huidige || data.van };
    setRingStrengen(prev => [...prev, streng]);
  }

  function updateRingstreng(id, updates) {
    setRingStrengen(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  function deleteRingstreng(id) {
    setRingStrengen(prev => prev.filter(r => r.id !== id));
  }

  function advanceHuidige(id) {
    setRingStrengen(prev => prev.map(r => {
      if (r.id !== id) return r;
      // Splits prefix (letters) en numeriek suffix: "BU73001" → prefix="BU", num=73001
      const m = r.huidige.replace(/\./g, '').match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
      if (!m) return r;
      const [, prefix, digits, suffix] = m;
      const next = String(parseInt(digits, 10) + 1).padStart(digits.length, '0');
      const nextFull = prefix + next + suffix;
      if (nextFull > r.tot) return r;
      return { ...r, huidige: nextFull };
    }));
  }

  return { ringStrengen, addRingstreng, updateRingstreng, deleteRingstreng, advanceHuidige };
}
