import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { SetupWizard } from './pages/SetupWizard';
import { DeploymentDetail } from './pages/DeploymentDetail';
import { SettingsPage } from './pages/Settings';
import { Layout } from './components/common/Layout';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/deployments/:id" element={<DeploymentDetail />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;