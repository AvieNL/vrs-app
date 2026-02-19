import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import NieuwPage from './components/Nieuw/NieuwPage';
import RecordsPage from './components/Records/RecordsPage';
import StatsPage from './components/Stats/StatsPage';
import ProjectDetail from './components/Stats/ProjectDetail';
import SoortenPage from './components/Soorten/SoortenPage';
import SoortDetail from './components/Soorten/SoortDetail';
import VeldenPage from './components/Velden/VeldenPage';
import OverPage from './components/Over/OverPage';
import InstellingenPage from './components/Instellingen/InstellingenPage';
import ProjectenPage from './components/Projecten/ProjectenPage';
import RingstrengenPage from './components/Ringstreng/RingstrengenPage';
import { useRecords } from './hooks/useRecords';
import { useProjects } from './hooks/useProjects';
import { useSpeciesOverrides } from './hooks/useSpeciesOverrides';
import { useSettings } from './hooks/useSettings';
import { useRingStrengen } from './hooks/useRingStrengen';
import './styles/theme.css';

export default function App() {
  const { records, addRecord, deleteRecord, markAllAsUploaded, importRecords, renameProject } = useRecords();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const speciesOverrides = useSpeciesOverrides();
  const { settings, updateSettings } = useSettings();
  const { ringStrengen, addRingstreng, updateRingstreng, deleteRingstreng, advanceHuidige } = useRingStrengen();

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
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
              <RecordsPage records={records} onDelete={deleteRecord} />
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
            <Route path="/velden" element={<VeldenPage />} />
            <Route path="/over" element={<OverPage />} />
            <Route path="/projecten" element={
              <ProjectenPage projects={projects} onAdd={addProject} onUpdate={updateProject} onDelete={deleteProject} onRenameProject={renameProject} />
            } />
            <Route path="/instellingen" element={<InstellingenPage settings={settings} onUpdateSettings={updateSettings} />} />
            <Route path="/ringstrengen" element={
              <RingstrengenPage
                ringStrengen={ringStrengen}
                records={records}
                onAdd={addRingstreng}
                onUpdate={updateRingstreng}
                onDelete={deleteRingstreng}
              />
            } />
          </Routes>
        </main>
        <Navigation />
      </div>
    </BrowserRouter>
  );
}
