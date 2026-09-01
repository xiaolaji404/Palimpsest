import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ProjectList from './pages/ProjectList';
import Dashboard from './pages/Dashboard';
import ItemEditor from './pages/ItemEditor';
import Archive from './pages/Archive';
import { useProjectStore } from './stores/projectStore';
import './styles/global.css';

function AppInner() {
  const { currentProject, loadConfig } = useProjectStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadConfig().finally(() => setInitialized(true));
  }, []);

  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        currentProject ? <Navigate to="/dashboard" replace /> : <ProjectList />
      } />
      <Route path="/dashboard" element={
        currentProject ? <Dashboard /> : <Navigate to="/" replace />
      } />
      <Route path="/item/:itemId" element={
        currentProject ? <ItemEditor /> : <Navigate to="/" replace />
      } />
      <Route path="/archive" element={
        currentProject ? <Archive /> : <Navigate to="/" replace />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{
      token: {
        colorPrimary: '#1677ff',
        borderRadius: 8,
      },
    }}>
      <HashRouter>
        <AppInner />
      </HashRouter>
    </ConfigProvider>
  );
}
