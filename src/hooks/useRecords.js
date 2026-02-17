import { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, generateId } from '../utils/storage';
import grielImport from '../data/griel-import.json';

const STORAGE_KEY = 'vrs-records';

function migrateUploaded(records) {
  return records.map(r => {
    if (r.uploaded !== undefined) return r;
    return { ...r, uploaded: r.bron === 'griel_import' };
  });
}

function initRecords() {
  const stored = loadFromStorage(STORAGE_KEY, null);
  if (stored !== null) return migrateUploaded(stored);
  // First run: import griel data
  const imported = grielImport.map(r => ({
    ...r,
    id: r.id || generateId(),
    bron: 'griel_import',
    uploaded: true,
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
      uploaded: false,
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

  function markAsUploaded(ids) {
    setRecords(prev => prev.map(r => ids.includes(r.id) ? { ...r, uploaded: true } : r));
  }

  function markAllAsUploaded() {
    setRecords(prev => prev.map(r => r.uploaded ? r : { ...r, uploaded: true }));
  }

  return { records, addRecord, updateRecord, deleteRecord, markAsUploaded, markAllAsUploaded };
}
