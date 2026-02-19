import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import NieuwPage from './components/Nieuw/NieuwPage';
import RecordsPage from './components/Records/RecordsPage';
import StatsPage from './components/Stats/StatsPage';
import ProjectDetail from './components/Stats/ProjectDetail';
import SoortenPage from './components/Soorten/SoortenPage';
import SoortDetail from './components/Soorten/SoortDetail';
import DatabasesPage from './components/Databases/DatabasesPage';
import OverPage from './components/Over/OverPage';
import InstellingenPage from './components/Instellingen/InstellingenPage';
import ProjectenPage from './components/Projecten/ProjectenPage';
import RingstrengenPage from './components/Ringstreng/RingstrengenPage';
import LoginPage from './components/Auth/LoginPage';
import MigrationBanner from './components/Sync/MigrationBanner';
import AdminPage from './components/Admin/AdminPage';
import { useRecords } from './hooks/useRecords';
import { useProjects } from './hooks/useProjects';
import { useSpeciesOverrides } from './hooks/useSpeciesOverrides';
import { useSettings } from './hooks/useSettings';
import { useRingStrengen } from './hooks/useRingStrengen';
import './styles/theme.css';

function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 72, left: 0, right: 0, zIndex: 9999,
      display: 'flex', justifyContent: 'center', padding: '0 16px',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'var(--accent)', color: 'var(--bg-primary)',
        borderRadius: 'var(--radius)', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        pointerEvents: 'all', fontSize: '0.9rem', fontWeight: 600,
      }}>
        Nieuwe versie beschikbaar
        <button
          onClick={() => updateServiceWorker(true)}
          style={{
            background: 'var(--bg-primary)', color: 'var(--accent)',
            border: 'none', borderRadius: 'var(--radius-sm)',
            padding: '4px 12px', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.85rem',
            minWidth: 'auto', minHeight: 'auto',
          }}
        >
          Vernieuwen
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <BrowserRouter>
          <UpdateBanner />
          <AppShell />
        </BrowserRouter>
      </SyncProvider>
    </AuthProvider>
  );
}

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        gap: '0.75rem',
      }}>
        <div style={{
          width: 20, height: 20,
          border: '2px solid var(--bg-tertiary)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        Laden...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <MainApp />;
}

function MainApp() {
  const { records, deletedRecords, addRecord, deleteRecord, restoreRecord, permanentDeleteRecord, markAllAsUploaded, importRecords, renameProject } = useRecords();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const speciesOverrides = useSpeciesOverrides();
  const { settings, updateSettings } = useSettings();
  const { ringStrengen, addRingstreng, updateRingstreng, deleteRingstreng, advanceHuidige } = useRingStrengen();

  return (
    <div className="app-shell">
      <Header />
      <MigrationBanner onComplete={() => {}} />
      <main className="app-content">
        <Routes>
          <Route path="/" element={
            <NieuwPage
              onSave={addRecord}
              projects={projects.filter(p => p.actief)}
              records={records}
              speciesOverrides={speciesOverrides}
              settings={settings}
              ringStrengen={ringStrengen}
              onAdvanceRing={advanceHuidige}
            />
          } />
          <Route path="/records" element={
            <RecordsPage
              records={records}
              deletedRecords={deletedRecords}
              onDelete={deleteRecord}
              onRestore={restoreRecord}
              onPermanentDelete={permanentDeleteRecord}
            />
          } />
          <Route path="/stats" element={
            <StatsPage records={records} markAllAsUploaded={markAllAsUploaded} importRecords={importRecords} />
          } />
          <Route path="/stats/project/:naam" element={
            <ProjectDetail records={records} />
          } />
          <Route path="/soorten" element={
            <SoortenPage records={records} />
          } />
          <Route path="/soorten/:naam" element={
            <SoortDetail records={records} speciesOverrides={speciesOverrides} />
          } />
          <Route path="/databases" element={<DatabasesPage />} />
          <Route path="/over" element={<OverPage />} />
          <Route path="/projecten" element={
            <ProjectenPage projects={projects} onAdd={addProject} onUpdate={updateProject} onDelete={deleteProject} onRenameProject={renameProject} />
          } />
          <Route path="/instellingen" element={
            <InstellingenPage settings={settings} onUpdateSettings={updateSettings} />
          } />
          <Route path="/ringstrengen" element={
            <RingstrengenPage
              ringStrengen={ringStrengen}
              records={records}
              onAdd={addRingstreng}
              onUpdate={updateRingstreng}
              onDelete={deleteRingstreng}
            />
          } />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <Navigation />
    </div>
  );
}
