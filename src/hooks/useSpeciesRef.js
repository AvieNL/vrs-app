import { useState, useEffect } from 'react';

// Module-level cache zodat het JSON maar één keer geladen wordt,
// ook als meerdere componenten tegelijk de hook gebruiken.
let _cache = null;
let _promise = null;

function loadSpeciesRef() {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = import('../data/species-reference.json').then(m => {
      _cache = m.default;
      return _cache;
    });
  }
  return _promise;
}

/**
 * Laadt species-reference.json asynchroon (apart chunk, ~384 KB).
 * Geeft een lege array terug zolang het laden niet klaar is.
 */
export function useSpeciesRef() {
  const [data, setData] = useState(_cache || []);

  useEffect(() => {
    if (_cache) {
      setData(_cache);
      return;
    }
    loadSpeciesRef().then(setData);
  }, []);

  return data;
}
