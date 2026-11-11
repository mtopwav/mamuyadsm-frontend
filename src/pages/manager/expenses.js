import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaFileInvoice,
  FaReceipt,
  FaMoneyBillWave,
  FaWallet,
  FaChartBar,
  FaBox,
  FaUsers,
  FaCalendarAlt
} from 'react-icons/fa';
import './manager-layout.css';
import './expenses.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import { PageLoader } from '../../components/LoadingSpinner';

function ManagerExpenses() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
      } catch (e) {
        navigate('/login');
        return;
      }
    } else {
      navigate('/login');
      return;
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const capitalizeName = (name) => {
    if (!name) return '';
    return String(name)
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return <PageLoader message={t.loading || 'Loading...'} />;
  }

  if (!user) return null;

  return (
    <div className="payments-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/manager/dashboard" className={'nav-item ' + (location.pathname === '/manager/dashboard' ? 'active' : '')}>
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/manager/spareparts" className={'nav-item ' + (location.pathname === '/manager/spareparts' ? 'active' : '')}>
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/manager/customers-info" className={'nav-item ' + (location.pathname === '/manager/customers-info' ? 'active' : '')}>
            <FaUsers className="nav-icon" />
            <span>{t.customerInfo}</span>
          </Link>
          <Link to="/manager/generate-sales" className={'nav-item ' + (location.pathname === '/manager/generate-sales' ? 'active' : '')}>
            <FaFileInvoice className="nav-icon" />
            <span>{t.generateSales}</span>
          </Link>
          <Link to="/manager/transactions" className={'nav-item ' + (location.pathname === '/manager/transactions' ? 'active' : '')}>
            <FaReceipt className="nav-icon" />
            <span>{t.transactions}</span>
          </Link>
          <Link to="/manager/loans" className={'nav-item ' + (location.pathname === '/manager/loans' ? 'active' : '')}>
            <FaMoneyBillWave className="nav-icon" />
            <span>{t.loans}</span>
          </Link>
          <Link to="/manager/expenses" className={'nav-item ' + (location.pathname === '/manager/expenses' ? 'active' : '')}>
            <FaWallet className="nav-icon" />
            <span>{t.expenses}</span>
          </Link>
          <Link to="/manager/reports" className={'nav-item ' + (location.pathname === '/manager/reports' ? 'active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="payments-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">{t.managerExpenses || t.expenses}</h1>
          </div>
          <div className="header-right">
            <div className="manager-date-time">
              <FaCalendarAlt />
              <span>{currentDateTime}</span>
            </div>
            <ThemeToggle />
            <LanguageSelector />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Manager')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        <div className="payments-content">
          <p className="expenses-placeholder">{t.expensesComingSoon || 'Expenses page coming soon.'}</p>
        </div>
      </div>
    </div>
  );
}

export default ManagerExpenses;
