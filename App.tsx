import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Warehouses } from './pages/Warehouses';
import { Branches } from './pages/Branches';
import { Transfers } from './pages/Transfers';
import { Sales } from './pages/Sales';
import { Users } from './pages/Users';
import { Reports } from './pages/Reports';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  if (isLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">Loading...</div>;

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'warehouses': return <Warehouses />;
      case 'branches': return <Branches />;
      case 'inventory': return <Inventory />;
      case 'transfers': return <Transfers />;
      case 'sales': return <Sales />;
      case 'users': return <Users />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      {renderPage()}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}