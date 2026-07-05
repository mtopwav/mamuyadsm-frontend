import React, { useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getTheme, applyTheme } from './utils/theme';
import { getSectionFromPath } from './utils/settingsSection';
import useAutoLogout from './utils/useAutoLogout';
import './App.css';
import Home from './Home';
import Login from './login';
import Dashboard from './pages/admin/dashboard';
import SpareParts from './pages/admin/spareparts';
import Sales from './pages/admin/sales';
import Employees from './pages/admin/employees';
import Finances from './pages/admin/finances';
import AdminReports from './pages/admin/reports';
import AdminTransactions from './pages/admin/transactions';
import Messages from './pages/admin/messages';
import Settings from './pages/admin/setting';
import CategoriesBrands from './pages/admin/categories&brands';
import ManagerDashboard from './pages/manager/dashboard';
import ManagerTransactions from './pages/manager/transactions';
import ManagerLoans from './pages/manager/loans';
import ManagerReports from './pages/manager/reports';
import ManagerSales from './pages/manager/sales';
import ManagerSpareparts from './pages/manager/spareparts';
import ManagerGenerateSales from './pages/manager/generateSales';
import ManagerCustomersInfo from './pages/manager/customersInfo';
import ManagerMessages from './pages/manager/messages';

// Applies the current section's theme when route changes so admin/sales/finance/manager each keep their own theme
function ThemeApplicator() {
  const location = useLocation();
  useEffect(() => {
    const section = getSectionFromPath(location.pathname);
    const theme = getTheme(section);
    applyTheme(theme, section);
  }, [location.pathname]);
  return null;
}

function AutoLogoutWatcher() {
  const location = useLocation();
  const navigate = useNavigate();

  const isOnProtectedSection = () => {
    const path = location.pathname || '';
    const protectedPrefixes = [
      '/sales',
      '/finance/cashier',
      '/finance/accountant',
      '/manager',
      '/admin',
    ];
    return protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  };

  const onLogout = useCallback(() => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  }, [navigate]);

  const enabled = (localStorage.getItem('user') || sessionStorage.getItem('user')) && isOnProtectedSection();

  useAutoLogout({
    enabled: Boolean(enabled),
    inactivityMs: 30 * 60 * 1000,
    warningMs: 30 * 1000,
    onLogout,
  });

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeApplicator />
      <AutoLogoutWatcher />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/spareparts" element={<SpareParts />} />
        <Route path="/admin/sales" element={<Sales />} />
        <Route path="/admin/employees" element={<Employees />} />
        <Route path="/admin/finances" element={<Finances />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/transactions" element={<AdminTransactions />} />
        <Route path="/admin/messages" element={<Messages />} />
        <Route path="/admin/categories-brands" element={<CategoriesBrands />} />
        <Route path="/admin/settings" element={<Settings />} />
        
        {/* Manager Routes */}
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/manager/transactions" element={<ManagerTransactions />} />
        <Route path="/manager/loans" element={<ManagerLoans />} />
        <Route path="/manager/messages" element={<ManagerMessages />} />
        <Route path="/manager/reports" element={<ManagerReports />} />
        <Route path="/manager/sales" element={<ManagerSales />} />
        <Route path="/manager/generate-sales" element={<ManagerGenerateSales />} />
        <Route path="/manager/spareparts" element={<ManagerSpareparts />} />
        <Route path="/manager/customers-info" element={<ManagerCustomersInfo />} />
        
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
