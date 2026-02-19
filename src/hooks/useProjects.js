import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateId } from '../utils/storage';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

const DEFAULT_PROJECTS = [
  { id: 'tuin',   naam: 'Tuin - Ter Avest',          locatie: 'Breedenbroek', nummer: '1925', actief: true },
  { id: 'overig', naam: 'Overig ringwerk - Ter Avest', locatie: 'Breedenbroek', nummer: '1722', actief: true },
  { id: 'nk027',  naam: 'NK027',                       locatie: 'Breedenbroek', nummer: '1926', actief: true },
];

function toProjectRow(project, userId) {
  return {
    id: project.id,
    user_id: userId,
    naam: project.naam,
    locatie: project.locatie || '',
    nummer: project.nummer || '',
    actief: project.actief !== false,
    updated_at: new Date().toISOString(),
  };
}

export function useProjects() {
  const { user } = useAuth();
  const { addToQueue } = useSync();
  const pulledRef = useRef(false);
  const [sharedProjects, setSharedProjects] = useState([]);

  const projects = useLiveQuery(
    () => {
      if (!user) return [];
      return db.projecten.where('user_id').equals(user.id).toArray();
    },
    [user?.id],
    []
  ) ?? [];

  // Bij (her)inloggen: pull van Supabase
  useEffect(() => {
    if (!user) {
      pulledRef.current = false;
      setSharedProjects([]);
      return;
    }
    if (pulledRef.current) return;
    pulledRef.current = true;
    pullFromSupabase();
    pullSharedProjects();
  }, [user?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  async function pullFromSupabase() {
    const localCount = await db.projecten.where('user_id').equals(user.id).count();
    const meta = await db.meta.get(`last_pull_projecten_${user.id}`);
    const lastPull = meta?.value;

    let query = supabase.from('projecten').select('*').eq('user_id', user.id);
    if (localCount > 0 && lastPull) {
      query = query.gt('updated_at', lastPull);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return;

    const rows = data.map(r => ({
      id: r.id,
      user_id: user.id,
      naam: r.naam,
      locatie: r.locatie || '',
      nummer: r.nummer || '',
      actief: r.actief !== false,
    }));

    // Eerste run: geen data lokaal → gebruik Supabase data
    if (localCount === 0) {
      await db.projecten.bulkPut(rows);
    } else {
      // Incrementele update
      await db.projecten.bulkPut(rows);
    }
    await db.meta.put({
      key: `last_pull_projecten_${user.id}`,
      value: new Date().toISOString(),
    });
  }

  async function pullSharedProjects() {
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    if (!memberships?.length) {
      setSharedProjects([]);
      return;
    }

    const ids = memberships.map(m => m.project_id);
    const { data: shared } = await supabase
      .from('projecten')
      .select('*')
      .in('id', ids);

    if (shared) {
      setSharedProjects(shared.map(p => ({
        id: p.id,
        user_id: p.user_id,
        naam: p.naam,
        locatie: p.locatie || '',
        nummer: p.nummer || '',
        actief: p.actief !== false,
        shared: true,
      })));
    }
  }

  // Eerste run zonder Supabase-data: laad defaults
  useEffect(() => {
    if (!user || projects.length > 0) return;
    // Geef de pull even tijd — laad defaults pas als Dexie én Supabase leeg zijn
    const timer = setTimeout(async () => {
      const count = await db.projecten.where('user_id').equals(user.id).count();
      if (count === 0) {
        const defaults = DEFAULT_PROJECTS.map(p => ({ ...p, user_id: user.id }));
        await db.projecten.bulkPut(defaults);
        defaults.forEach(p => addToQueue('projecten', 'upsert', toProjectRow(p, user.id)));
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [user?.id, projects.length]);  // eslint-disable-line react-hooks/exhaustive-deps

  function addProject(project) {
    if (!user) return null;
    const newProject = {
      ...project,
      id: generateId(),
      nummer: project.nummer || '',
      actief: true,
      user_id: user.id,
    };
    db.projecten.put(newProject);
    addToQueue('projecten', 'upsert', toProjectRow(newProject, user.id));
    return newProject;
  }

  function updateProject(id, updates) {
    db.projecten.get(id).then(existing => {
      if (!existing) return;
      const updated = { ...existing, ...updates };
      db.projecten.put(updated);
      addToQueue('projecten', 'upsert', toProjectRow(updated, user.id));
    });
  }

  function deleteProject(id) {
    db.projecten.delete(id);
    addToQueue('projecten', 'delete', { id, user_id: user.id });
  }

  const allProjects = [...projects, ...sharedProjects];

  return { projects: allProjects, addProject, updateProject, deleteProject, refreshShared: pullSharedProjects };
}
