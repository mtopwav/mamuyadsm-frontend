import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBox,
  FaHistory,
  FaUsers,
  FaShoppingCart,
  FaBars,
  FaSignOutAlt,
  FaChartBar,
  FaCog,
  FaUser,
  FaTags,
  FaCalendarAlt,
  FaBell,
  FaSearch,
  FaPlus,
  FaEdit
} from 'react-icons/fa';
import './dashboard.css';
import './spareparts.css';
import './stock-history.css';
import logo from '../../images/logo.png';
import { formatDateTime, getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { getStockHistory } from '../../services/api';
import { PageLoader } from '../../components/LoadingSpinner';

function StockHistory() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setLoading(false);

        if (parsedUser.userType === 'employee' && parsedUser.department === 'Sales') {
          navigate('/sales/dashboard');
          return;
        }

        if (parsedUser.userType === 'employee' && parsedUser.department === 'Finance') {
          navigate('/finance/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
      }
    } else {
      setLoading(false);
      setTimeout(() => navigate('/login'), 1000);
    }

    setCurrentDateTime(getCurrentDateTime());
    const dateTimeInterval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 1000);

    const handleDateFormatChange = () => {
      setCurrentDateTime(getCurrentDateTime());
    };
    window.addEventListener('dateFormatChanged', handleDateFormatChange);

    const updateNotificationCount = () => {
      setNotificationCount(getUnviewedOperationsCount());
    };
    updateNotificationCount();
    window.addEventListener('unviewedOperationsChanged', updateNotificationCount);

    return () => {
      clearInterval(dateTimeInterval);
      window.removeEventListener('dateFormatChanged', handleDateFormatChange);
      window.removeEventListener('unviewedOperationsChanged', updateNotificationCount);
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await getStockHistory();
        if (!active) return;
        if (response?.success) {
          setHistory(Array.isArray(response.history) ? response.history : []);
        } else {
          setHistory([]);
        }
      } catch (error) {
        if (!active) return;
        setHistory([]);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load stock history.',
          confirmButtonColor: '#511C00'
        });
      } finally {
        if (active) setHistoryLoading(false);
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [user]);

  const counts = useMemo(() => {
    const added = history.filter((row) => row.action === 'added').length;
    const updated = history.filter((row) => row.action === 'updated').length;
    return { all: history.length, added, updated };
  }, [history]);

  const visibleHistory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return history.filter((row) => {
      if (actionFilter !== 'all' && row.action !== actionFilter) return false;
      if (!query) return true;
      const haystack = [
        row.part_name,
        row.part_number,
        row.category_name,
        row.brand_name,
        row.details,
        row.location,
        row.status
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [history, actionFilter, searchTerm]);

  const formatCurrency = (amount) => {
    if (amount == null || amount === '') return '—';
    const formatted = new Intl.NumberFormat('en-TZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(amount) || 0);
    return `TZS ${formatted}`;
  };

  const quantityChange = (row) => {
    if (row.quantity_before == null || row.quantity_after == null) {
      return row.action === 'added' ? Number(row.quantity_after) || 0 : null;
    }
    return (Number(row.quantity_after) || 0) - (Number(row.quantity_before) || 0);
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: t.logout || 'Logout',
      text: t.areYouSureLogout || 'Are you sure you want to logout?',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t.yesLogout || 'Yes, logout',
      cancelButtonText: t.cancel || 'Cancel'
    });

    if (!result.isConfirmed) return;

    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return <PageLoader message={t.loading || 'Loading...'} />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/admin/dashboard" className="nav-item">
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/admin/categories-brands" className="nav-item">
            <FaTags className="nav-icon" />
            <span>{t.categoriesBrands}</span>
          </Link>
          <Link to="/admin/spareparts" className="nav-item">
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/admin/stock-history" className="nav-item active">
            <FaHistory className="nav-icon" />
            <span>{t.stockHistory}</span>
          </Link>
          <Link to="/admin/sales" className="nav-item">
            <FaShoppingCart className="nav-icon" />
            <span>{t.sales}</span>
          </Link>
          <Link to="/admin/employees" className="nav-item">
            <FaUsers className="nav-icon" />
            <span>{t.employees}</span>
          </Link>
          <Link to="/admin/transactions" className="nav-item">
            <FaCalendarAlt className="nav-icon" />
            <span>Transactions</span>
          </Link>
          <Link to="/admin/reports" className="nav-item">
            <FaChartBar className="nav-icon" />
            <span>{t.reports || 'Reports'}</span>
          </Link>
          <Link to="/admin/settings" className="nav-item">
            <FaCog className="nav-icon" />
            <span>{t.settings}</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.stockHistory}</h1>
          </div>

          <div className="header-right">
            <div style={{ marginRight: '15px' }}>
              <LanguageSelector />
            </div>
            <div className="date-time-display" style={{
              marginRight: '20px',
              fontSize: '14px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <FaCalendarAlt style={{ fontSize: '16px' }} />
              <span>{currentDateTime}</span>
            </div>
            <button
              className="notification-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'default',
                position: 'relative',
                marginRight: '15px',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '18px'
              }}
              disabled
              title="New operations count"
            >
              <FaBell />
              {notificationCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '50%',
                    minWidth: '16px',
                    height: '16px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    padding: notificationCount > 9 ? '0 4px' : '0'
                  }}
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <div style={{ marginRight: '15px' }}>
              <ThemeToggle />
            </div>
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{user?.username || 'Admin'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        <div className="spareparts-content">
          <p className="stock-history-hint">{t.stockHistoryHint}</p>

          <div className="stats-row">
            <button
              type="button"
              className={`stat-card history-stat ${actionFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActionFilter('all')}
            >
              <div className="stat-icon purple"><FaHistory /></div>
              <div className="stat-info">
                <h3>{t.stockAll}</h3>
                <p className="stat-value">{counts.all}</p>
              </div>
            </button>
            <button
              type="button"
              className={`stat-card history-stat ${actionFilter === 'added' ? 'active' : ''}`}
              onClick={() => setActionFilter('added')}
            >
              <div className="stat-icon green"><FaPlus /></div>
              <div className="stat-info">
                <h3>{t.stockAdded}</h3>
                <p className="stat-value">{counts.added}</p>
              </div>
            </button>
            <button
              type="button"
              className={`stat-card history-stat ${actionFilter === 'updated' ? 'active' : ''}`}
              onClick={() => setActionFilter('updated')}
            >
              <div className="stat-icon orange"><FaEdit /></div>
              <div className="stat-info">
                <h3>{t.stockUpdated}</h3>
                <p className="stat-value">{counts.updated}</p>
              </div>
            </button>
          </div>

          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder={`${t.search} ${t.spareParts.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="history-filters">
              {['all', 'added', 'updated'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`history-filter ${actionFilter === filter ? 'active' : ''}`}
                  onClick={() => setActionFilter(filter)}
                >
                  {filter === 'all' ? t.stockAll : filter === 'added' ? t.stockAdded : t.stockUpdated}
                </button>
              ))}
            </div>
          </div>

          {(historyLoading || visibleHistory.length === 0) && (
            <div className="stock-history-empty">
              {historyLoading ? t.loading : t.noStockHistory}
            </div>
          )}

          {!historyLoading && visibleHistory.length > 0 && (
          <div className="table-container">
            <table className="spareparts-table stock-history-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>{t.dateTime || 'Date & Time'}</th>
                  <th>{t.actions}</th>
                  <th>{t.partName}</th>
                  <th>{t.partNumber}</th>
                  <th>{t.category}</th>
                  <th>{t.brand}</th>
                  <th>{t.quantityBefore}</th>
                  <th>{t.quantityAfter}</th>
                  <th>{t.stockChange}</th>
                  <th>{t.wholesalePrice || 'Wholesale price'}</th>
                  <th>{t.retailPrice || 'Retail price'}</th>
                  <th>{t.stockDetails}</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((row, index) => {
                    const change = quantityChange(row);
                    const changeClass = change == null ? '' : change > 0 ? 'up' : change < 0 ? 'down' : '';
                    const changeLabel = change == null
                      ? '—'
                      : `${change > 0 ? '+' : ''}${change}`;
                    return (
                      <tr key={row.id}>
                        <td>{index + 1}</td>
                        <td>{formatDateTime(row.created_at)}</td>
                        <td>
                          <span className={`action-pill ${row.action === 'added' ? 'added' : 'updated'}`}>
                            {row.action === 'added' ? t.stockAdded : t.stockUpdated}
                          </span>
                        </td>
                        <td>{row.part_name}</td>
                        <td>{row.part_number}</td>
                        <td>{row.category_name || '—'}</td>
                        <td>{row.brand_name || '—'}</td>
                        <td>{row.quantity_before == null ? '—' : row.quantity_before}</td>
                        <td>{row.quantity_after == null ? '—' : row.quantity_after}</td>
                        <td className={`qty-change ${changeClass}`}>{changeLabel}</td>
                        <td>{formatCurrency(row.wholesale_price)}</td>
                        <td>{formatCurrency(row.retail_price)}</td>
                        <td className="history-details">{row.details || '—'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StockHistory;
