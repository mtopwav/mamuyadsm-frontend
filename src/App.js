import React, { Suspense, lazy, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getTheme, applyTheme } from './utils/theme';
import { getSectionFromPath } from './utils/settingsSection';
import useAutoLogout from './utils/useAutoLogout';
import './App.css';
import Home from './Home';
import Login from './login';
import OfflineBanner from './components/OfflineBanner';
import { PageLoader } from './components/LoadingSpinner';

// Lazy-load heavy pages so first paint / login stays fast
const Dashboard = lazy(() => import('./pages/admin/dashboard'));
const SpareParts = lazy(() => import('./pages/admin/spareparts'));
const StockHistory = lazy(() => import('./pages/admin/stock-history'));
const Sales = lazy(() => import('./pages/admin/sales'));
const Employees = lazy(() => import('./pages/admin/employees'));
const Finances = lazy(() => import('./pages/admin/finances'));
const AdminReports = lazy(() => import('./pages/admin/reports'));
const AdminTransactions = lazy(() => import('./pages/admin/transactions'));
const Messages = lazy(() => import('./pages/admin/messages'));
const Settings = lazy(() => import('./pages/admin/setting'));
const CategoriesBrands = lazy(() => import('./pages/admin/categories&brands'));
const ManagerDashboard = lazy(() => import('./pages/manager/dashboard'));
const ManagerTransactions = lazy(() => import('./pages/manager/transactions'));
const ManagerLoans = lazy(() => import('./pages/manager/loans'));
const ManagerExpenses = lazy(() => import('./pages/manager/expenses'));
const ManagerReports = lazy(() => import('./pages/manager/reports'));
const ManagerSales = lazy(() => import('./pages/manager/sales'));
const ManagerSpareparts = lazy(() => import('./pages/manager/spareparts'));
const ManagerGenerateSales = lazy(() => import('./pages/manager/generateSales'));
const ManagerCustomersInfo = lazy(() => import('./pages/manager/customersInfo'));
const ManagerMessages = lazy(() => import('./pages/manager/messages'));

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
      <OfflineBanner />
      <ThemeApplicator />
      <AutoLogoutWatcher />
      <Suspense fallback={<PageLoader message="Loading..." />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/spareparts" element={<SpareParts />} />
          <Route path="/admin/stock-history" element={<StockHistory />} />
          <Route path="/admin/sales" element={<Sales />} />
          <Route path="/admin/employees" element={<Employees />} />
          <Route path="/admin/finances" element={<Finances />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/messages" element={<Messages />} />
          <Route path="/admin/categories-brands" element={<CategoriesBrands />} />
          <Route path="/admin/settings" element={<Settings />} />

          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/transactions" element={<ManagerTransactions />} />
          <Route path="/manager/loans" element={<ManagerLoans />} />
          <Route path="/manager/expenses" element={<ManagerExpenses />} />
          <Route path="/manager/messages" element={<ManagerMessages />} />
          <Route path="/manager/reports" element={<ManagerReports />} />
          <Route path="/manager/sales" element={<ManagerSales />} />
          <Route path="/manager/generate-sales" element={<ManagerGenerateSales />} />
          <Route path="/manager/spareparts" element={<ManagerSpareparts />} />
          <Route path="/manager/customers-info" element={<ManagerCustomersInfo />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
