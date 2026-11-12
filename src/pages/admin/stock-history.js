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
  FaWallet,
  FaBell,
  FaSearch
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
import { getSpareParts, getStockHistory } from '../../services/api';
import { PageLoader } from '../../components/LoadingSpinner';
import StyledDateInput from '../../components/StyledDateInput';

function StockHistory() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [currentQuantities, setCurrentQuantities] = useState({});
  const [historyLoading, setHistoryLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

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
        const [response, partsResponse] = await Promise.all([
          getStockHistory(),
          getSpareParts().catch(() => null)
        ]);
        if (!active) return;
        if (response?.success) {
          setHistory(Array.isArray(response.history) ? response.history : []);
        } else {
          setHistory([]);
        }
        const quantityByPartId = {};
        if (partsResponse?.success && Array.isArray(partsResponse.spareParts)) {
          partsResponse.spareParts.forEach((part) => {
            quantityByPartId[part.id] = part.quantity;
          });
        }
        setCurrentQuantities(quantityByPartId);
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

  const historyDay = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const changeDates = useMemo(() => {
    const days = new Set();
    history.forEach((row) => {
      const day = historyDay(row.created_at);
      if (day) days.add(day);
    });
    return Array.from(days);
  }, [history]);

  const visibleHistory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return history.filter((row) => {
      if (filterDate) {
        const day = historyDay(row.created_at);
        if (day !== filterDate) return false;
      }
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
  }, [history, filterDate, searchTerm]);

  const quantityBeforeValue = (row) => {
    const value = row.recorded_quantity_before != null ? row.recorded_quantity_before : row.quantity_before;
    if (value == null || value === '') return 0;
    const number = Number(value);
    return Number.isNaN(number) ? 0 : number;
  };

  const quantityChange = (row) => {
    if (row.quantity_after == null || row.quantity_after === '') return null;
    return (Number(row.quantity_after) || 0) - quantityBeforeValue(row);
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
          <Link
            to="/admin/expenses"
            className={'nav-item' + (window.location.pathname === '/admin/expenses' ? ' active' : '')}
          >
            <FaWallet className="nav-icon" />
            <span>{t.expenses || 'Expenses'}</span>
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
            <label className="history-date-field">
              <span>Date</span>
              <StyledDateInput
                value={filterDate}
                markedDates={historyLoading ? undefined : changeDates}
                title="Dates with stock changes"
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </label>
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
                  <th>{t.currentQuantity || 'Current Quantity'}</th>
                  <th>{t.stockDetails}</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((row, index) => {
                    const currentQuantity = currentQuantities[row.sparepart_id] != null
                      ? currentQuantities[row.sparepart_id]
                      : (row.sparepart_quantity != null ? row.sparepart_quantity : row.quantity);
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
                            {row.action === 'added' ? (t.stockNew || 'New') : (t.stockEdited || 'Edited')}
                          </span>
                        </td>
                        <td>{row.part_name}</td>
                        <td>{row.part_number}</td>
                        <td>{row.category_name || '—'}</td>
                        <td>{row.brand_name || '—'}</td>
                        <td>{quantityBeforeValue(row)}</td>
                        <td>{row.quantity_after == null ? '—' : row.quantity_after}</td>
                        <td className={`qty-change ${changeClass}`}>{changeLabel}</td>
                        <td>{currentQuantity == null || currentQuantity === '' ? '—' : currentQuantity}</td>
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
