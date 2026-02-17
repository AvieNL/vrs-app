export function loadFromStorage(key, fallback = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
