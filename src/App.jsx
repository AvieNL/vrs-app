import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import NieuwPage from './components/Nieuw/NieuwPage';
import RecordsPage from './components/Records/RecordsPage';
import StatsPage from './components/Stats/StatsPage';
import ProjectenPage from './components/Projecten/ProjectenPage';
import SoortenPage from './components/Soorten/SoortenPage';
import SoortDetail from './components/Soorten/SoortDetail';
import VeldenPage from './components/Velden/VeldenPage';
import { useRecords } from './hooks/useRecords';
import { useProjects } from './hooks/useProjects';
import './styles/theme.css';

export default function App() {
  const { records, addRecord, deleteRecord, markAllAsUploaded } = useRecords();
  const { projects, addProject, updateProject, deleteProject } = useProjects();

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <main className="app-content">
          <Routes>
            <Route path="/" element={
              <NieuwPage onSave={addRecord} projects={projects.filter(p => p.actief)} records={records} />
            } />
            <Route path="/records" element={
              <RecordsPage records={records} onDelete={deleteRecord} />
            } />
            <Route path="/stats" element={
              <StatsPage records={records} markAllAsUploaded={markAllAsUploaded} />
            } />
            <Route path="/projecten" element={
              <ProjectenPage
                projects={projects}
                onAdd={addProject}
                onUpdate={updateProject}
                onDelete={deleteProject}
              />
            } />
            <Route path="/soorten" element={
              <SoortenPage records={records} />
            } />
            <Route path="/soorten/:naam" element={
              <SoortDetail records={records} />
            } />
            <Route path="/velden" element={<VeldenPage />} />
          </Routes>
        </main>
        <Navigation />
      </div>
    </BrowserRouter>
  );
}
