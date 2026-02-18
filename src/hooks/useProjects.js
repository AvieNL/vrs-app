import { useState, useEffect } from 'react';
import { loadFromStorage, saveToStorage, generateId } from '../utils/storage';

const STORAGE_KEY = 'vrs-projects';

const DEFAULT_PROJECTS = [
  { id: 'tuin', naam: 'Tuin - Ter Avest', locatie: 'Breedenbroek', nummer: '1925', actief: true },
  { id: 'overig', naam: 'Overig ringwerk - Ter Avest', locatie: 'Breedenbroek', nummer: '1722', actief: true },
  { id: 'nk027', naam: 'NK027', locatie: 'Breedenbroek', nummer: '1926', actief: true },
];

export function useProjects() {
  const [projects, setProjects] = useState(() =>
    loadFromStorage(STORAGE_KEY, DEFAULT_PROJECTS)
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEY, projects);
  }, [projects]);

  function addProject(project) {
    const newProject = { ...project, id: generateId(), nummer: project.nummer || '', actief: true };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }

  function updateProject(id, updates) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }

  function deleteProject(id) {
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  return { projects, addProject, updateProject, deleteProject };
}
