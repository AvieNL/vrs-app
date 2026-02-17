import { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, generateId } from '../utils/storage';
import grielImport from '../data/griel-import.json';

const STORAGE_KEY = 'vrs-records';

function initRecords() {
  const stored = loadFromStorage(STORAGE_KEY, null);
  if (stored !== null) return stored;
  // First run: import griel data
  const imported = grielImport.map(r => ({
    ...r,
    id: r.id || generateId(),
    bron: 'griel_import',
  }));
  saveToStorage(STORAGE_KEY, imported);
  return imported;
}

export function useRecords() {
  const [records, setRecords] = useState(initRecords);

  useEffect(() => {
    saveToStorage(STORAGE_KEY, records);
  }, [records]);

  function addRecord(record) {
    const newRecord = {
      ...record,
      id: generateId(),
      timestamp: new Date().toISOString(),
      bron: 'app',
    };
    setRecords(prev => [newRecord, ...prev]);
    return newRecord;
  }

  function updateRecord(id, updates) {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  function deleteRecord(id) {
    setRecords(prev => prev.filter(r => r.id !== id));
  }

  return { records, addRecord, updateRecord, deleteRecord };
}
